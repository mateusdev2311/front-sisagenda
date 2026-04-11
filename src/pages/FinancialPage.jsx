import { useState, useEffect } from 'react';
import axios from '../api/axiosConfig';
import Modal from '../components/Modal';
import ConfirmModal from '../components/ConfirmModal';
import BillingRulesTab from '../components/BillingRulesTab';
import NotificationHistoryModal from '../components/NotificationHistoryModal';
import { FaMoneyBillWave, FaSearch, FaFilter, FaFileInvoiceDollar, FaCheckCircle, FaRegClock, FaTimesCircle, FaChevronDown, FaEdit, FaTrash, FaPlus, FaChartLine, FaRobot, FaExclamationCircle, FaPrint, FaBell } from 'react-icons/fa';
import Pagination from '../components/Pagination';
import toast from 'react-hot-toast';
import Select from 'react-select';
import { useSettings } from '../context/SettingsContext';
import { getCompanyInfo, getFinancialInsights } from '../services/aiService';
import { FaWhatsapp } from 'react-icons/fa';
import { Chart as ChartJS, ArcElement, Tooltip, Legend, CategoryScale, LinearScale, BarElement, Title, LineElement, PointElement, Filler } from 'chart.js';
import { Doughnut, Bar, Line } from 'react-chartjs-2';

ChartJS.register(ArcElement, Tooltip, Legend, CategoryScale, LinearScale, BarElement, Title, LineElement, PointElement, Filler);

const FinancialPage = () => {
    const { settings } = useSettings();
    // ----------------------------------------------------------------------
    // 1. Estados da Aplicação (Data State)
    // ----------------------------------------------------------------------
    const [payments, setPayments] = useState([]);
    const [appointments, setAppointments] = useState([]);
    const [patients, setPatients] = useState([]);
    const [billedAppointmentIds, setBilledAppointmentIds] = useState(new Set());

    // ----------------------------------------------------------------------
    // 2. Estados da Interface (UI State)
    // ----------------------------------------------------------------------
    const [searchTerm, setSearchTerm] = useState('');
    const [statusFilter, setStatusFilter] = useState('');

    // Filtros de Data
    const [dateStart, setDateStart] = useState(() => {
        const d = new Date();
        return new Date(d.getFullYear(), d.getMonth(), 1).toISOString().split('T')[0];
    });
    const [dateEnd, setDateEnd] = useState('');

    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editingId, setEditingId] = useState(null);
    const [formData, setFormData] = useState({ appointmentId: '', patientId: '', value: '', status: 'Pendente', dueDate: '', paymentMethod: '' });
    const [confirmDialog, setConfirmDialog] = useState({ isOpen: false, title: '', message: '', type: 'primary', onConfirm: null });
    const [currentPage, setCurrentPage] = useState(1);
    const ITEMS_PER_PAGE = 6;

    // AI Financial Assistant State
    const [isAnalyzing, setIsAnalyzing] = useState(false);
    const [aiInsights, setAiInsights] = useState(null);

    // Aba ativa: 'invoices' | 'rules'
    const [activeTab, setActiveTab] = useState('invoices');

    // Modal de Histórico de Notificações
    const [notifModal, setNotifModal] = useState({ isOpen: false, billing: null, patientName: '' });

    // Key Performance Indicators (KPIs)
    const [stats, setStats] = useState({ totalRevenue: 0, pendingAmount: 0, paidCount: 0 });
    const [revenueChartData, setRevenueChartData] = useState(null);
    const [methodChartData, setMethodChartData] = useState(null);
    const [monthlyEvolData, setMonthlyEvolData] = useState(null);
    const [companyPlan, setCompanyPlan] = useState(null); // null = loading

    // ----------------------------------------------------------------------
    // 3. Efeitos de Montagem e Busca de Dados
    // ----------------------------------------------------------------------
    useEffect(() => {
        fetchDependencies();
        getCompanyInfo()
            .then(res => setCompanyPlan(res.data?.plan || 'free'))
            .catch(() => setCompanyPlan('free'));
    }, []);

    const fetchDependencies = async () => {
        try {
            const [appRes, patRes, billRes] = await Promise.all([
                axios.get('/appointments?limit=5000'),
                axios.get('/patients?limit=5000'),
                axios.get('/billing?limit=10000')
            ]);
            setAppointments(appRes.data.data || appRes.data || []);
            setPatients(patRes.data.data || patRes.data || []);
            
            const allBillings = billRes.data?.data || billRes.data || [];
            const billedSet = new Set(allBillings.map(b => String(b.appointmentId || b.appointment_id)).filter(id => id && id !== 'undefined' && id !== 'null'));
            setBilledAppointmentIds(billedSet);
        } catch (error) {
            console.error('Error fetching financial dependencies', error);
        }
    };

    const fetchBilling = async (search = searchTerm) => {
        try {
            const billingRes = await axios.get('/billing', {
                params: { search: search || undefined }
            });
            // Opcionalmente podemos tratar res.data.data tb, mas o retorno original era apenas res.data
            setPayments(billingRes.data?.data || billingRes.data || []);
        } catch (error) {
            console.error('Error fetching billing', error);
        }
    };

    useEffect(() => {
        const timer = setTimeout(() => {
            fetchBilling(searchTerm);
        }, 500);
        return () => clearTimeout(timer);
    }, [searchTerm]);

    // ----------------------------------------------------------------------
    // Lógica de Filtros Unificadas (incluindo Status, Busca e Datas)
    // ----------------------------------------------------------------------
    const getFilteredPayments = () => {
        return payments.filter(p => {
            // Filtro por Status
            const matchesStatus = statusFilter ? (p.status || '').toLowerCase() === statusFilter.toLowerCase() : true;

            // Filtro por Text/Search (Desativado localmente, a mágica do JOIN no Backend já nos entrega resultados enxutos)
            const matchesSearch = true;

            // Filtro por Datas
            let matchesDate = true;
            const pDateStr = p.dueDate || p.due_date;
            if (pDateStr && !isNaN(new Date(pDateStr).getTime())) {
                // Remove timezones for accurate date comparison
                const pDate = new Date(pDateStr).setHours(0,0,0,0);
                if (dateStart && pDate < new Date(dateStart).setHours(0,0,0,0)) matchesDate = false;
                if (dateEnd && pDate > new Date(dateEnd).setHours(0,0,0,0)) matchesDate = false;
            }

            return matchesStatus && matchesSearch && matchesDate;
        });
    };

    const filteredPayments = getFilteredPayments();

    // Atualiza KPIs com base APENAS nos dados filtrados na tela
    useEffect(() => {
        calculateStats(filteredPayments);
    }, [payments, statusFilter, searchTerm, dateStart, dateEnd, appointments, patients]);

    const calculateStats = (data) => {
        let total = 0;
        let pending = 0;
        let paid = 0;

        const methodsCount = {};
        const monthlyRev = {};

        data.forEach(p => {
            const val = parseFloat(p.value) || 0;
            const pDateStr = p.dueDate || p.due_date;
            
            if (p.status === 'Pago') {
                total += val;
                paid++;
                
                // Agrupamento para gráfico de Evolução Mensal
                if (pDateStr) {
                    const dDate = new Date(pDateStr);
                    if (!isNaN(dDate.getTime())) {
                        const yyyy = dDate.getFullYear();
                        const mm = String(dDate.getMonth() + 1).padStart(2, '0');
                        const monthKey = `${yyyy}-${mm}`;
                        monthlyRev[monthKey] = (monthlyRev[monthKey] || 0) + val;
                    }
                }
            } else if (p.status === 'Pendente') {
                pending += val;
            }

            if (p.paymentMethod) {
                methodsCount[p.paymentMethod] = (methodsCount[p.paymentMethod] || 0) + 1;
            }
        });

        setStats({ totalRevenue: total, pendingAmount: pending, paidCount: paid });

        setRevenueChartData({
            labels: ['Receita Liquidada', 'Valores Pendentes'],
            datasets: [{
                data: [total, pending],
                backgroundColor: ['#10b981', '#f59e0b'],
                borderWidth: 0,
                hoverOffset: 4
            }]
        });

        const methodLabels = Object.keys(methodsCount);
        const methodData = Object.values(methodsCount);
        setMethodChartData({
            labels: methodLabels.length ? methodLabels : ['Nenhum'],
            datasets: [{
                label: 'Transações',
                data: methodData.length ? methodData : [0],
                backgroundColor: '#6c5be4',
                borderRadius: 6,
                barPercentage: 0.6
            }]
        });

        const sortedMonths = Object.keys(monthlyRev).sort();
        setMonthlyEvolData({
            labels: sortedMonths.length ? sortedMonths.map(m => {
                const [y, mm] = m.split('-');
                return `${mm}/${y}`;
            }) : ['Mês Atual'],
            datasets: [{
                label: 'Receita Registrada (R$)',
                data: sortedMonths.length ? sortedMonths.map(m => monthlyRev[m]) : [0],
                borderColor: '#10b981',
                backgroundColor: 'rgba(16, 185, 129, 0.1)',
                fill: true,
                tension: 0.4
            }]
        });
    };

    // ----------------------------------------------------------------------
    // 4. Manipuladores de IA e IA Assistant
    // ----------------------------------------------------------------------
    const handleAnalyzeFinance = async () => {
        setIsAnalyzing(true);
        try {
            // Aggregate methods for AI
            const methods = methodChartData?.labels?.reduce((acc, label, idx) => {
                acc[label] = methodChartData.datasets[0].data[idx];
                return acc;
            }, {});

            // Filter Overdue (Vencidos)
            const overdue = filteredPayments.filter(p => p.status === 'Pendente' && p.dueDate && new Date(p.dueDate).setHours(0,0,0,0) < new Date().setHours(0,0,0,0));
            const overdueSum = overdue.reduce((acc, p) => acc + (parseFloat(p.value) || 0), 0);

            const summaryData = {
                totalRevenue: stats.totalRevenue,
                pendingAmount: stats.pendingAmount,
                overdueAmount: overdueSum,
                paidCount: stats.paidCount,
                overdueCount: overdue.length,
                methods: methods,
                periodFrom: dateStart,
                periodTo: dateEnd
            };

            const response = await getFinancialInsights(summaryData);
            
            let result = response.data?.insights || response.data?.insight || response.data?.message;
            if (!result) {
                result = typeof response.data === 'object' ? JSON.stringify(response.data, null, 2) : String(response.data);
            }
            
            setAiInsights(result || "Nenhuma resposta gerada pelo backend.");
        } catch (error) {
            console.error("Erro do CFO:", error);
            const errStr = error.response?.data?.error || error.response?.data?.message || error.message || "Erro desconhecido";
            toast.error("Falha no Consultor: " + errStr);
            setAiInsights(`⚠️ FALHA DE COMUNICAÇÃO:\n${errStr}\n\nDica de Solução:\n- O backend está rodando?\n- Olhe o console (terminal) do servidor Node.js. Certamente ele imprimiu o motivo de ter falhado.\n- O controller pode não estar registrado nas rotas.`);
        } finally {
            setIsAnalyzing(false);
        }
    };

    // ----------------------------------------------------------------------
    // 5. Manipuladores de Ação (Abertura de Modais, Deletes)
    // ----------------------------------------------------------------------
    const handlePrintReceipt = (payment, patientName) => {
        const formattedValue = new Intl.NumberFormat('pt-BR', { style: 'currency', currency: settings.currency || 'BRL' }).format(payment.value || 0);
        const currentDate = new Date().toLocaleDateString('pt-BR');
        let doctorName = settings.clinicName || 'Nossa Clínica';
        
        const printWindow = window.open('', '_blank');
        if (!printWindow) {
            toast.error("Seu navegador bloqueou a abertura do recibo. Permita os pop-ups para este site.");
            return;
        }

        printWindow.document.write(`
            <html>
            <head>
                <title>Recibo de Pagamento - ${patientName}</title>
                <style>
                    @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;600;700&display=swap');
                    body { font-family: 'Inter', sans-serif; padding: 40px; color: #1e293b; max-width: 800px; margin: 0 auto; }
                    .header { text-align: center; border-bottom: 2px solid #f1f5f9; padding-bottom: 20px; margin-bottom: 40px; }
                    .title { font-size: 28px; font-weight: 700; text-transform: uppercase; letter-spacing: 2px; color: #0f172a; }
                    .clinic-name { font-size: 18px; margin-top: 10px; font-weight: 600; color: #6366f1; text-transform: uppercase; }
                    .content { font-size: 16px; line-height: 1.8; text-align: justify; }
                    .value-box { background: #f8fafc; border: 2px dashed #cbd5e1; padding: 25px; border-radius: 12px; font-size: 28px; font-weight: bold; text-align: center; margin: 40px 0; color: #10b981; }
                    .footer { margin-top: 100px; text-align: center; }
                    .signature-line { width: 400px; border-top: 1px solid #1e293b; margin: 0 auto; margin-bottom: 10px; }
                    .info-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 20px; margin-bottom: 30px; padding: 25px; background: #f8fafc; border-radius: 12px; font-size: 14px; border: 1px solid #e2e8f0; }
                    .info-item span { display: block; color: #64748b; font-size: 12px; text-transform: uppercase; font-weight: 600; margin-bottom: 4px; }
                    .info-item strong { color: #0f172a; font-size: 15px; }
                    @media print {
                        body { padding: 0; }
                        .value-box { -webkit-print-color-adjust: exact; background: #f8fafc !important; color: #10b981 !important; }
                        .info-grid { -webkit-print-color-adjust: exact; background: #f8fafc !important; }
                    }
                </style>
            </head>
            <body onload="setTimeout(function(){ window.print(); }, 500);">
                <div class="header">
                    <div class="title">RECIBO</div>
                    <div class="clinic-name">${doctorName}</div>
                </div>
                
                <div class="info-grid">
                    <div class="info-item"><span>Recebido de:</span><strong>${patientName}</strong></div>
                    <div class="info-item"><span>Data de Emissão:</span><strong>${currentDate}</strong></div>
                    <div class="info-item"><span>Referência:</span><strong>Fatura #${payment.appointmentId || payment.appointment_id || payment.id}</strong></div>
                    <div class="info-item"><span>Método Pagamento:</span><strong>${payment.paymentMethod || payment.payment_method || 'A combinar'}</strong></div>
                </div>

                <div class="content">
                    Recebemos de <strong>${patientName}</strong> a importância líquida de <strong>${formattedValue}</strong>, 
                    referente à quitação de honorários e serviços prestados no registro integrado à nossa clínica. 
                </div>

                <div class="value-box">
                    ${formattedValue}
                </div>

                <div class="content" style="text-align: center; font-size: 14px; color: #64748b;">
                    Para maior clareza, firmamos o presente documento com a certeza de prestação de contas.
                </div>

                <div class="footer">
                    <div class="signature-line"></div>
                    <div style="font-weight: 600; font-size: 16px; color: #0f172a;">Assinatura do Profissional / Responsável</div>
                    <div style="font-size: 14px; color: #64748b; margin-top: 5px;">${doctorName}</div>
                </div>
            </body>
            </html>
        `);
        printWindow.document.close();
    };

    const handleOpenCreate = () => {
        setEditingId(null);
        setFormData({ appointmentId: '', patientId: '', value: '', status: 'Pendente', dueDate: new Date().toISOString().split('T')[0], paymentMethod: '' });
        setIsModalOpen(true);
    };

    const handleOpenEdit = (payment) => {
        setEditingId(payment.id);
        const rawDate = payment.dueDate || payment.due_date;
        const formatDue = rawDate && !isNaN(new Date(rawDate).getTime()) ? new Date(rawDate).toISOString().split('T')[0] : '';
        setFormData({
            appointmentId: payment.appointmentId || payment.appointment_id || '',
            patientId: payment.patientId || payment.patient_id || '',
            value: payment.value,
            status: payment.status || 'Pendente',
            dueDate: formatDue,
            paymentMethod: payment.paymentMethod || payment.payment_method || ''
        });
        setIsModalOpen(true);
    };

    const handleDelete = (id) => {
        setConfirmDialog({
            isOpen: true,
            title: 'Excluir Fatura',
            message: 'Tem certeza que deseja apagar permanentemente este registro financeiro?',
            type: 'danger',
            onConfirm: async () => {
                try {
                    await axios.delete(`/billing/${id}`);
                    setConfirmDialog(prev => ({ ...prev, isOpen: false }));
                    fetchDependencies();
                    fetchBilling(searchTerm);
                } catch (error) {
                    toast.error(error.response?.data?.message || error.response?.data?.error || 'Erro ao excluir registro. Tente novamente.');
                }
            }
        });
    };

    const handleSubmit = (e) => {
        e.preventDefault();
        setConfirmDialog({
            isOpen: true,
            title: editingId ? 'Salvar Alterações' : 'Emitir Nova Fatura',
            message: editingId ? 'Confirma a edição dos dados financeiros deste registro?' : 'Deseja emitir e vincular este faturamento de consulta?',
            type: 'primary',
            onConfirm: async () => {
                try {
                    const selectedApp = appointments.find(a => String(a.id) === String(formData.appointmentId));
                    let derivedPatientId = formData.patientId || (selectedApp ? (selectedApp.patient_id || selectedApp.user_id) : null);

                    if (!formData.appointmentId || !derivedPatientId) {
                        toast.error('Associação inválida: a fatura precisa estar vinculada a uma Consulta e a um Paciente cadastrado.');
                        return;
                    }

                    const payload = {
                        appointmentId: Number(formData.appointmentId),
                        patientId: Number(derivedPatientId),
                        value: parseFloat(formData.value),
                        status: formData.status,
                        dueDate: formData.dueDate,
                        paymentMethod: formData.paymentMethod
                    };

                    if (editingId) {
                        await axios.put(`/billing/${editingId}`, payload);
                    } else {
                        await axios.post('/billing', payload);
                    }

                    setConfirmDialog(prev => ({ ...prev, isOpen: false }));
                    setIsModalOpen(false);
                    fetchDependencies();
                    fetchBilling(searchTerm);
                } catch (error) {
                    toast.error('Erro ao processar faturamento: ' + (error.response?.data?.message || 'Erro Interno'));
                }
            }
        });
    };

    // ----------------------------------------------------------------------
    // 6. Helpers de UI (Mapeamento Visual para Cores e Badges)
    // ----------------------------------------------------------------------
    const getStatusBadge = (status, dueDate) => {
        const s = (status || '').toLowerCase();
        if (s === 'pago') return <span className="flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-emerald-100 text-emerald-700 border border-emerald-200"><FaCheckCircle className="text-sm" /> Pago</span>;
        if (s === 'pendente') {
            const isOverdue = dueDate && new Date(dueDate).setHours(0,0,0,0) < new Date().setHours(0,0,0,0);
            if (isOverdue) return <span className="flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-red-100 text-red-700 border border-red-200"><FaExclamationCircle className="text-sm" /> Vencida</span>;
            return <span className="flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-amber-100 text-amber-700 border border-amber-200"><FaRegClock className="text-sm" /> Pendente</span>;
        }
        if (s === 'cancelado') return <span className="flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-slate-100 text-slate-700 border border-slate-200"><FaTimesCircle className="text-sm" /> Cancelado</span>;
        return <span className="flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-slate-100 text-slate-700 border border-slate-200">Desconhecido</span>;
    };

    // Pagination Logic
    const totalPages = Math.ceil(filteredPayments.length / ITEMS_PER_PAGE) || 1;
    const paginatedPayments = filteredPayments.slice(
        (currentPage - 1) * ITEMS_PER_PAGE,
        currentPage * ITEMS_PER_PAGE
    );

    // Reset to page 1 when filters change
    useEffect(() => {
        setCurrentPage(1);
    }, [searchTerm, statusFilter, dateStart, dateEnd]);

    // ── Paywall para plano Free ──────────────────────────────────────────────
    if (companyPlan === 'free') {
        return (
            <div className="flex flex-col items-center justify-center min-h-[60vh] gap-6 animate-in fade-in duration-500">
                <div className="w-20 h-20 rounded-2xl bg-amber-50 border border-amber-200 flex items-center justify-center">
                    <FaMoneyBillWave className="text-amber-400 text-4xl" />
                </div>
                <div className="text-center max-w-md">
                    <h2 className="text-2xl font-bold text-slate-800 mb-2">Gestão Financeira com IA</h2>
                    <p className="text-slate-500 leading-relaxed">
                        O módulo financeiro completo, com CFO Virtual, gráficos evolutivos e controle de inadimplência,
                        está disponível a partir do
                        <span className="font-bold text-emerald-600"> plano Start</span>.
                    </p>
                </div>
                <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm max-w-sm w-full space-y-3">
                    <p className="text-sm font-bold text-slate-700 text-center">O que você terá acesso:</p>
                    <ul className="space-y-2 text-sm text-slate-600">
                        {['Consultor IA automático', 'Emissão de faturas por consulta', 'Gráficos de evolução mensal', 'Painel de Inadimplência inteligente'].map(f => (
                            <li key={f} className="flex items-center gap-2">
                                <span className="w-4 h-4 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center text-[10px] font-bold flex-shrink-0">✓</span>
                                {f}
                            </li>
                        ))}
                    </ul>
                    <a
                        href={`https://wa.me/5538999748911?text=${encodeURIComponent('Olá! Tenho interesse em fazer upgrade do meu plano no Sisagenda para liberar o módulo financeiro. Poderia me enviar mais informações?')}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="w-full flex items-center justify-center gap-2 py-3 mt-2 bg-green-500 hover:bg-green-600 text-white font-bold rounded-xl text-sm transition-all shadow-sm"
                    >
                        <FaWhatsapp className="text-lg" />
                        Fazer Upgrade de Plano
                    </a>
                </div>
            </div>
        );
    }

    if (companyPlan === null) {
        return <div className="flex items-center justify-center min-h-[60vh] text-slate-400">Carregando...</div>;
    }

    return (
        <div className="space-y-6 animate-in slide-in-from-bottom-4 duration-500 fade-in h-4/5 flex flex-col">
            {/* Header Area */}
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-2">
                <div>
                    <h2 className="text-2xl font-bold text-slate-800 tracking-tight">Gestão Financeira</h2>
                    <p className="text-sm text-slate-500 mt-1">Acompanhe receitas do período, pagamentos vencidos e receba dicas do Consultor IA.</p>
                </div>
                <div className="flex flex-wrap items-center gap-3">
                    <button 
                        className="btn-secondary flex items-center gap-2 bg-gradient-to-r from-purple-50 to-indigo-50 border-purple-200 text-purple-700 hover:bg-purple-100 transition-colors shadow-sm" 
                        onClick={handleAnalyzeFinance} 
                        disabled={isAnalyzing}
                    >
                        <FaRobot className={isAnalyzing ? "animate-spin" : ""} />
                        {isAnalyzing ? "Analisando..." : "Consultor IA"}
                    </button>
                    <button className="btn-primary flex items-center gap-2" onClick={handleOpenCreate}>
                        <FaPlus /> Nova Fatura
                    </button>
                </div>
            </div>

            {/* ── Navegação por Abas ──────────────────────────────────────── */}
            <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-xl w-fit">
                <button
                    id="tab-invoices"
                    onClick={() => setActiveTab('invoices')}
                    className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-bold transition-all duration-200 ${
                        activeTab === 'invoices'
                            ? 'bg-white text-primary shadow-sm'
                            : 'text-slate-500 hover:text-slate-700'
                    }`}
                >
                    <FaFileInvoiceDollar /> Faturas
                </button>
                <button
                    id="tab-billing-rules"
                    onClick={() => setActiveTab('rules')}
                    className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-bold transition-all duration-200 ${
                        activeTab === 'rules'
                            ? 'bg-white text-primary shadow-sm'
                            : 'text-slate-500 hover:text-slate-700'
                    }`}
                >
                    <FaBell /> Régua de Cobrança
                </button>
            </div>

            {/* ── Aba: Régua de Cobrança ────────────────────────────────── */}
            {activeTab === 'rules' && (
                <BillingRulesTab />
            )}

            {/* ── Aba: Faturas (conteúdo original) ────────────────────────── */}
            {activeTab === 'invoices' && (<>

            {/* AI Insights Card */}
            {aiInsights && (
                <div className="bg-white border border-slate-200 border-l-4 border-l-primary rounded-2xl p-6 shadow-sm mb-4 relative overflow-hidden animate-in slide-in-from-top-4 duration-300 flex-shrink-0">
                    <div className="absolute -right-8 -top-8 opacity-[0.03]">
                        <FaRobot className="text-9xl text-primary" />
                    </div>
                    <div className="relative z-10">
                        <div className="flex justify-between items-start mb-4 border-b border-slate-100 pb-4">
                            <h3 className="text-lg font-bold flex items-center gap-3 text-slate-800">
                                <div className="p-2 bg-primary/10 rounded-lg text-primary">
                                    <FaRobot />
                                </div>
                                Análise do Consultor IA
                            </h3>
                            <button onClick={() => setAiInsights(null)} className="text-slate-400 hover:text-red-500 p-2 hover:bg-red-50 rounded-lg transition-colors">✕</button>
                        </div>
                        <div className="prose prose-sm max-w-none text-slate-600 leading-relaxed font-medium">
                            {typeof aiInsights === 'string' 
                                ? aiInsights.split('\n').filter(l => l.trim() !== '').map((line, i) => {
                                    // Transforma elementos em negrito Markdown em strong tags do React
                                    const parts = line.split(/(\*\*.*?\*\*)/g);
                                    return (
                                        <p key={i} className="mb-3 last:mb-0">
                                            {parts.map((p, idx) => 
                                                p.startsWith('**') && p.endsWith('**') 
                                                    ? <strong key={idx} className="text-slate-800 font-bold">{p.slice(2, -2)}</strong> 
                                                    : p
                                            )}
                                        </p>
                                    );
                                })
                                : <pre className="bg-slate-50 p-4 border border-slate-100 rounded-lg overflow-auto text-sm text-slate-700">{JSON.stringify(aiInsights, null, 2)}</pre>
                            }
                        </div>
                    </div>
                </div>
            )}

            {/* KPI Cards Area */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="bg-white rounded-2xl p-6 shadow-sm shadow-slate-200/50 border border-slate-100 flex flex-col justify-between hover:shadow-md transition-shadow relative overflow-hidden group">
                    <div className="absolute -right-6 -top-6 bg-emerald-500/5 w-24 h-24 rounded-full group-hover:bg-emerald-500/10 transition-colors"></div>
                    <div className="flex justify-between items-start mb-4">
                        <div>
                            <p className="text-sm font-medium text-slate-500 mb-1">Receita Liquidada (No Período)</p>
                            <h3 className="text-3xl font-bold text-slate-800">
                                {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: settings.currency || 'BRL' }).format(stats.totalRevenue)}
                            </h3>
                        </div>
                        <div className="w-12 h-12 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center text-xl shadow-inner">
                            <FaChartLine />
                        </div>
                    </div>
                </div>

                <div className="bg-white rounded-2xl p-6 shadow-sm shadow-slate-200/50 border border-slate-100 flex flex-col justify-between hover:shadow-md transition-shadow relative overflow-hidden group">
                    <div className="absolute -right-6 -top-6 bg-amber-500/5 w-24 h-24 rounded-full group-hover:bg-amber-500/10 transition-colors"></div>
                    <div className="flex justify-between items-start mb-4">
                        <div>
                            <p className="text-sm font-medium text-slate-500 mb-1">Valores Pendentes</p>
                            <h3 className="text-3xl font-bold text-slate-800">
                                {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: settings.currency || 'BRL' }).format(stats.pendingAmount)}
                            </h3>
                        </div>
                        <div className="w-12 h-12 rounded-xl bg-amber-50 text-amber-500 flex items-center justify-center text-xl shadow-inner">
                            <FaRegClock />
                        </div>
                    </div>
                </div>

                <div className="bg-white rounded-2xl p-6 shadow-sm shadow-slate-200/50 border border-slate-100 flex flex-col justify-between hover:shadow-md transition-shadow relative overflow-hidden group">
                    <div className="absolute -right-6 -top-6 bg-primary/5 w-24 h-24 rounded-full group-hover:bg-primary/10 transition-colors"></div>
                    <div className="flex justify-between items-start mb-4">
                        <div>
                            <p className="text-sm font-medium text-slate-500 mb-1">Faturas Pagas (Vol)</p>
                            <h3 className="text-3xl font-bold text-slate-800">{stats.paidCount}</h3>
                        </div>
                        <div className="w-12 h-12 rounded-xl bg-primary-light text-primary flex items-center justify-center text-xl shadow-inner">
                            <FaFileInvoiceDollar />
                        </div>
                    </div>
                </div>
            </div>

            {/* Financial Charts Area */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 pb-2">
                <div className="bg-white rounded-2xl p-6 shadow-sm shadow-slate-200/50 border border-slate-100 flex flex-col h-[280px]">
                    <h3 className="font-semibold text-slate-800 mb-4 text-center">Evolução Mensal (Receita Ativa)</h3>
                    <div className="flex-1 relative">
                        {monthlyEvolData && <Line data={monthlyEvolData} options={{ maintainAspectRatio: false, plugins: { legend: { display: false } }, scales: { x: { grid: { display: false } } } }} />}
                    </div>
                </div>
                <div className="bg-white rounded-2xl p-6 shadow-sm shadow-slate-200/50 border border-slate-100 flex flex-col h-[280px]">
                    <h3 className="font-semibold text-slate-800 mb-4 text-center">Proporção Fluxo de Caixa</h3>
                    <div className="flex-1 relative flex justify-center">
                        {revenueChartData && <Doughnut data={revenueChartData} options={{ maintainAspectRatio: false, cutout: '70%', plugins: { legend: { position: 'bottom', labels: { usePointStyle: true, padding: 15 } } } }} />}
                    </div>
                </div>
                <div className="bg-white rounded-2xl p-6 shadow-sm shadow-slate-200/50 border border-slate-100 flex flex-col h-[280px]">
                    <h3 className="font-semibold text-slate-800 mb-4 text-center">Métodos de Pagamento</h3>
                    <div className="flex-1 relative">
                        {methodChartData && <Bar data={methodChartData} options={{ maintainAspectRatio: false, plugins: { legend: { display: false } }, scales: { y: { beginAtZero: true, ticks: { stepSize: 1 } }, x: { grid: { display: false } } } }} />}
                    </div>
                </div>
            </div>

            {/* List & Filtering Array */}
            <div className="bg-white rounded-2xl shadow-sm shadow-slate-200/50 border border-slate-100 flex-1 flex flex-col overflow-hidden min-h-[500px]">
                <div className="p-4 border-b border-slate-100 flex flex-col lg:flex-row gap-4 justify-between bg-slate-50/50">
                    <div className="flex flex-col sm:flex-row gap-3 w-full lg:w-auto">
                        <div className="relative w-full sm:max-w-xs">
                            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                                <FaSearch className="text-sm" />
                            </div>
                            <input
                                type="text"
                                className="block w-full pl-9 pr-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 appearance-none font-medium text-slate-600 bg-white"
                                placeholder="Id consulta, paciente ou método..."
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                            />
                        </div>
                        <div className="relative">
                            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                                <FaFilter className="text-sm" />
                            </div>
                            <select
                                className="block w-full sm:w-44 pl-9 pr-8 py-2 border border-slate-200 rounded-lg text-sm bg-white focus:outline-none focus:ring-2 focus:ring-primary/20 appearance-none font-medium text-slate-600 cursor-pointer"
                                value={statusFilter}
                                onChange={(e) => setStatusFilter(e.target.value)}
                            >
                                <option value="">Todos os Status</option>
                                <option value="pago">Apenas Pagos</option>
                                <option value="pendente">Apenas Pendentes</option>
                                <option value="cancelado">Cancelados</option>
                            </select>
                            <div className="absolute inset-y-0 right-0 pr-3 flex items-center pointer-events-none text-slate-400">
                                <FaChevronDown className="text-xs" />
                            </div>
                        </div>
                    </div>
                    {/* Filtro de Datas adicionado */}
                    <div className="flex items-center gap-2 bg-white border border-slate-200 p-1 rounded-lg">
                        <input 
                            type="date" 
                            title="A partir desta data de vencimento"
                            className="bg-transparent border-none text-sm text-slate-600 font-medium focus:ring-0 cursor-pointer p-1 outline-none"
                            value={dateStart} 
                            onChange={(e) => setDateStart(e.target.value)} 
                        />
                        <span className="text-slate-400 text-xs font-bold uppercase">Até</span>
                        <input 
                            type="date" 
                            title="Até esta data de vencimento"
                            className="bg-transparent border-none text-sm text-slate-600 font-medium focus:ring-0 cursor-pointer p-1 outline-none"
                            value={dateEnd} 
                            onChange={(e) => setDateEnd(e.target.value)} 
                        />
                    </div>
                </div>

                <div className="overflow-x-auto flex-1 custom-scrollbar">
                    <table className="w-full text-left border-collapse">
                        <thead>
                            <tr className="bg-slate-50 text-slate-500 text-xs uppercase tracking-wider border-b border-slate-200">
                                <th className="p-4 font-bold">Ref. Consulta</th>
                                <th className="p-4 font-bold">Paciente</th>
                                <th className="p-4 font-bold">Valor</th>
                                <th className="p-4 font-bold">Vencimento</th>
                                <th className="p-4 font-bold">Forma de Pag.</th>
                                <th className="p-4 font-bold">Status</th>
                                <th className="p-4 text-center font-bold" title="Notificações">🔔</th>
                                <th className="p-4 text-center font-bold">Ações</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100 text-sm">
                            {filteredPayments.length === 0 ? (
                                <tr>
                                    <td colSpan="8" className="p-8 text-center text-slate-500">
                                        <div className="flex flex-col items-center justify-center">
                                            <FaMoneyBillWave className="text-4xl text-slate-300 mb-3" />
                                            <p className="font-medium">Nenhum registro financeiro encontrado no período e filtro atual.</p>
                                        </div>
                                    </td>
                                </tr>
                            ) : (
                                paginatedPayments.map((payment) => {
                                    const apptId = payment.appointmentId || payment.appointment_id;
                                    const patIdFallback = payment.patientId || payment.patient_id;

                                    const linkedAppt = appointments.find(a => String(a.id) === String(apptId));
                                    let patientName = "Desconhecido";

                                    if (linkedAppt) {
                                        const patId = linkedAppt.patient_id || linkedAppt.user_id;
                                        const pat = patients.find(p => String(p.id) === String(patId));
                                        if (pat) patientName = pat.name;
                                    } else if (patIdFallback) {
                                        const pat = patients.find(p => String(p.id) === String(patIdFallback));
                                        if (pat) patientName = pat.name;
                                    }

                                    return (
                                        <tr key={payment.id} className="hover:bg-slate-50/80 transition-colors group">
                                            <td className="p-4 font-medium text-slate-800">#{apptId || '-'}</td>
                                            <td className="p-4 text-slate-600 font-medium">{patientName}</td>
                                            <td className="p-4 text-slate-800 font-bold border-l-2 border-transparent group-hover:border-primary">
                                                {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: settings.currency || 'BRL' }).format(payment.value || 0)}
                                            </td>
                                            <td className="p-4 text-slate-500 font-medium">
                                                {(payment.dueDate || payment.due_date) && !isNaN(new Date(payment.dueDate || payment.due_date).getTime()) ? new Date(payment.dueDate || payment.due_date).toLocaleDateString() : 'N/D'}
                                            </td>
                                            <td className="p-4 text-slate-600 font-medium">
                                                {payment.paymentMethod || payment.payment_method || '-'}
                                            </td>
                                            <td className="p-4">
                                                {getStatusBadge(payment.status, payment.dueDate || payment.due_date)}
                                            </td>
                                            {/* Coluna de Notificações */}
                                            <td className="p-4 text-center">
                                                <button
                                                    id={`btn-notif-${payment.id}`}
                                                    onClick={() => setNotifModal({ isOpen: true, billing: payment, patientName })}
                                                    className="p-2 text-slate-300 hover:text-primary hover:bg-primary/10 rounded-lg transition-colors opacity-0 group-hover:opacity-100"
                                                    title="Ver histórico de cobranças"
                                                >
                                                    <FaBell className="text-sm" />
                                                </button>
                                            </td>
                                            <td className="p-4">
                                                <div className="flex justify-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                                    <button className="p-2 text-slate-400 hover:text-emerald-600 hover:bg-emerald-50 rounded transition-colors" title="Imprimir Recibo PDF" onClick={() => handlePrintReceipt(payment, patientName)}>
                                                        <FaPrint />
                                                    </button>
                                                    <button className="p-2 text-slate-400 hover:text-primary hover:bg-primary-light rounded transition-colors" title="Editar Fatura" onClick={() => handleOpenEdit(payment)}>
                                                        <FaEdit />
                                                    </button>
                                                    <button className="p-2 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded transition-colors" title="Excluir Fatura" onClick={() => handleDelete(payment.id)}>
                                                        <FaTrash />
                                                    </button>
                                                </div>
                                            </td>
                                        </tr>
                                    );
                                })
                            )}
                        </tbody>
                    </table>
                </div>
                <Pagination 
                    currentPage={currentPage} 
                    totalPages={totalPages} 
                    onPageChange={(page) => setCurrentPage(page)} 
                />
            </div>

            {/* Modal de Histórico de Notificações */}
            <NotificationHistoryModal
                isOpen={notifModal.isOpen}
                onClose={() => setNotifModal({ isOpen: false, billing: null, patientName: '' })}
                billing={notifModal.billing}
                patientName={notifModal.patientName}
            />

            </> /* fim aba invoices */
            )}

            {/* Modal Forms Emissão Financeira */}
            <Modal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} title={editingId ? "Editar Faturamento" : "Emitir Fatura de Consulta"}>
                <form onSubmit={handleSubmit} className="space-y-4">
                    <div className="bg-primary/5 p-4 rounded-xl border border-primary/20 mb-4">
                        <p className="text-sm font-medium text-primary-dark">Vincule o pagamento diretamente a uma consulta realizada na clínica.</p>
                    </div>

                    <div>
                        <label className="text-sm font-bold text-slate-700 block mb-1">Referência (Consulta e Paciente)</label>
                        <Select
                            options={appointments
                                .filter(app => !billedAppointmentIds.has(String(app.id)) || String(app.id) === String(formData.appointmentId))
                                .map(app => {
                                    const patId = app.patient_id || app.user_id;
                                    const pat = patients.find(p => String(p.id) === String(patId));
                                    const patName = pat ? pat.name : 'Desconhecido';
                                    const dateStr = new Date(app.date).toLocaleDateString();
                                    return {
                                        value: app.id,
                                        label: `Consulta #${app.id} - ${patName} (${dateStr})`,
                                        patientId: patId // Keep patientId for quick access
                                    };
                                })
                            }
                            value={
                                formData.appointmentId
                                    ? {
                                        value: formData.appointmentId,
                                        label: (() => {
                                            const currentApp = appointments.find(a => String(a.id) === String(formData.appointmentId));
                                            if (!currentApp) return `Consulta #${formData.appointmentId}`;
                                            const pId = currentApp.patient_id || currentApp.user_id;
                                            const p = patients.find(p => String(p.id) === String(pId));
                                            const pName = p ? p.name : 'Desconhecido';
                                            const dStr = new Date(currentApp.date).toLocaleDateString();
                                            return `Consulta #${currentApp.id} - ${pName} (${dStr})`;
                                        })()
                                    }
                                    : null
                            }
                            onChange={(selected) => setFormData({
                                ...formData,
                                appointmentId: selected ? selected.value : '',
                                patientId: selected ? selected.patientId : formData.patientId
                            })}
                            placeholder="Pesquise por nome do paciente ou ID..."
                            className="text-sm font-medium"
                            styles={{
                                control: (base) => ({
                                    ...base,
                                    borderColor: '#e2e8f0',
                                    borderRadius: '0.5rem',
                                    padding: '2px',
                                    boxShadow: 'none',
                                    '&:hover': {
                                        borderColor: '#6366f1' // primary color approx
                                    }
                                })
                            }}
                            isClearable
                            required
                        />
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="text-sm font-bold text-slate-700 block mb-1">Valor (R$)</label>
                            <input type="number" step="0.01" className="form-control text-lg font-bold text-slate-800" required value={formData.value} onChange={e => setFormData({ ...formData, value: e.target.value })} placeholder="0.00" />
                        </div>
                        <div>
                            <label className="text-sm font-bold text-slate-700 block mb-1">Data de Vencimento</label>
                            <input type="date" className="form-control" required value={formData.dueDate} onChange={e => setFormData({ ...formData, dueDate: e.target.value })} />
                        </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="text-sm font-bold text-slate-700 block mb-1">Status do Pagamento</label>
                            <select className="form-control" value={formData.status} onChange={e => setFormData({ ...formData, status: e.target.value })}>
                                <option value="Pendente">Pendente</option>
                                <option value="Pago">Pago (Liquidado)</option>
                                <option value="Cancelado">Cancelado</option>
                            </select>
                        </div>
                        <div>
                            <label className="text-sm font-bold text-slate-700 block mb-1">Método de Pagamento</label>
                            <select className="form-control" required value={formData.paymentMethod} onChange={e => setFormData({ ...formData, paymentMethod: e.target.value })}>
                                <option value="">Selecione o Método...</option>
                                <option value="Pix">Transf. via Pix</option>
                                <option value="Cartão de Crédito">Cartão de Crédito</option>
                                <option value="Cartão de Débito">Cartão de Débito</option>
                                <option value="Dinheiro">Dinheiro (Espécie)</option>
                                <option value="Boleto">Boleto</option>
                            </select>
                        </div>
                    </div>

                    <div className="modal-footer pt-6 mt-6 border-t border-slate-100 flex justify-end gap-3 -mx-6 -mb-6 px-6 bg-slate-50 rounded-b-xl">
                        <button type="button" className="btn-secondary" onClick={() => setIsModalOpen(false)}>Cancelar</button>
                        <button type="submit" className="btn-primary" style={{ margin: 0 }}>{editingId ? "Salvar Fatura" : "Confirmar Emissão"}</button>
                    </div>
                </form>
            </Modal>

            <ConfirmModal
                isOpen={confirmDialog.isOpen}
                onClose={() => setConfirmDialog(prev => ({ ...prev, isOpen: false }))}
                onConfirm={confirmDialog.onConfirm}
                title={confirmDialog.title}
                message={confirmDialog.message}
                type={confirmDialog.type}
            />
        </div>
    );
};

export default FinancialPage;
