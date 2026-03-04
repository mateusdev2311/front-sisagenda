import { useState, useEffect } from 'react';
import axios from '../api/axiosConfig';
import Modal from '../components/Modal';
import ConfirmModal from '../components/ConfirmModal';
import { FaMoneyBillWave, FaSearch, FaFilter, FaFileInvoiceDollar, FaCheckCircle, FaRegClock, FaTimesCircle, FaChevronDown, FaEdit, FaTrash, FaPlus, FaChartLine } from 'react-icons/fa';
import Select from 'react-select';
import { Chart as ChartJS, ArcElement, Tooltip, Legend, CategoryScale, LinearScale, BarElement, Title } from 'chart.js';
import { Doughnut, Bar } from 'react-chartjs-2';

ChartJS.register(ArcElement, Tooltip, Legend, CategoryScale, LinearScale, BarElement, Title);

const FinancialPage = () => {
    // ----------------------------------------------------------------------
    // 1. Estados da Aplicação (Data State)
    // ----------------------------------------------------------------------
    const [payments, setPayments] = useState([]);
    const [appointments, setAppointments] = useState([]);
    const [patients, setPatients] = useState([]);

    // ----------------------------------------------------------------------
    // 2. Estados da Interface (UI State)
    // ----------------------------------------------------------------------
    const [searchTerm, setSearchTerm] = useState('');
    const [statusFilter, setStatusFilter] = useState('');
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editingId, setEditingId] = useState(null);
    const [formData, setFormData] = useState({ appointmentId: '', patientId: '', value: '', status: 'Pendente', dueDate: '', payment_method: '' });
    const [confirmDialog, setConfirmDialog] = useState({ isOpen: false, title: '', message: '', type: 'primary', onConfirm: null });

    // Key Performance Indicators (KPIs)
    const [stats, setStats] = useState({ totalRevenue: 0, pendingAmount: 0, paidCount: 0 });
    const [revenueChartData, setRevenueChartData] = useState(null);
    const [methodChartData, setMethodChartData] = useState(null);

    // ----------------------------------------------------------------------
    // 3. Efeitos de Montagem e Busca de Dados
    // ----------------------------------------------------------------------
    useEffect(() => {
        fetchData();
    }, []);

    // Atualiza os KPIs sempre que os pagamentos mudam
    useEffect(() => {
        calculateStats(payments);
    }, [payments]);

    const fetchData = async () => {
        try {
            // Buscar pacientes e agendamentos para referência visual
            const [appRes, patRes] = await Promise.all([
                axios.get('/appointments'),
                axios.get('/patients')
            ]);
            setAppointments(appRes.data);
            setPatients(patRes.data);

            // Buscar dados reais da API de faturamento
            const billingRes = await axios.get('/billing');
            setPayments(billingRes.data || []);

        } catch (error) {
            console.error('Error fetching financial data', error);
        }
    };

    const calculateStats = (data) => {
        let total = 0;
        let pending = 0;
        let paid = 0;

        const methodsCount = {};

        data.forEach(p => {
            const val = parseFloat(p.value) || 0;
            if (p.status === 'Pago') {
                total += val;
                paid++;
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
    };

    // ----------------------------------------------------------------------
    // 4. Manipuladores de Ação (Abertura de Modais, Deletes)
    // ----------------------------------------------------------------------
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
                    fetchData();
                } catch (error) {
                    alert('Erro ao excluir registro.');
                }
            }
        });
    };

    // ----------------------------------------------------------------------
    // 5. Envios de Formulário (POST/PUT API)
    // ----------------------------------------------------------------------
    const handleSubmit = (e) => {
        e.preventDefault();
        setConfirmDialog({
            isOpen: true,
            title: editingId ? 'Salvar Alterações' : 'Emitir Nova Fatura',
            message: editingId ? 'Confirma a edição dos dados financeiros deste registro?' : 'Deseja emitir e vincular este faturamento de consulta?',
            type: 'primary',
            onConfirm: async () => {
                try {
                    // Descobrir PatientID baseando-se no Appointment
                    const selectedApp = appointments.find(a => String(a.id) === String(formData.appointmentId));
                    let derivedPatientId = formData.patientId || (selectedApp ? (selectedApp.patient_id || selectedApp.user_id) : null);

                    if (!formData.appointmentId || !derivedPatientId) {
                        alert("Erro de Associação: Toda fatura precisa estar vinculada a uma Consulta e a um Paciente cadastrado (IDs não podem ser nulos).");
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
                    fetchData();
                } catch (error) {
                    alert('Erro ao processar o faturamento: ' + (error.response?.data?.message || 'Erro Interno'));
                }
            }
        });
    };

    // ----------------------------------------------------------------------
    // 6. Helpers de UI (Mapeamento Visual para Cores e Badges)
    // ----------------------------------------------------------------------
    const getStatusBadge = (status) => {
        const s = (status || '').toLowerCase();
        if (s === 'pago') return <span className="flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-emerald-100 text-emerald-700 border border-emerald-200"><FaCheckCircle className="text-sm" /> Pago</span>;
        if (s === 'pendente') return <span className="flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-amber-100 text-amber-700 border border-amber-200"><FaRegClock className="text-sm" /> Pendente</span>;
        if (s === 'cancelado') return <span className="flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-red-100 text-red-700 border border-red-200"><FaTimesCircle className="text-sm" /> Cancelado</span>;
        return <span className="flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-slate-100 text-slate-700 border border-slate-200">Desconhecido</span>;
    };

    const filteredPayments = payments.filter(p => {
        const matchesStatus = statusFilter ? (p.status || '').toLowerCase() === statusFilter.toLowerCase() : true;

        // Basic search filtering (by ID, appointment ID or method)
        const sQuery = searchTerm.toLowerCase();
        const matchesSearch = sQuery ?
            String(p.appointmentId || p.appointment_id).includes(sQuery) ||
            String(p.id).includes(sQuery) ||
            (p.paymentMethod && p.paymentMethod.toLowerCase().includes(sQuery))
            : true;

        return matchesStatus && matchesSearch;
    });

    return (
        <div className="space-y-6 animate-in slide-in-from-bottom-4 duration-500 fade-in h-4/5 flex flex-col">
            {/* Header Area */}
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-2">
                <div>
                    <h2 className="text-2xl font-bold text-slate-800 tracking-tight">Gestão Financeira</h2>
                    <p className="text-sm text-slate-500 mt-1">Acompanhe receitas, pagamentos pendentes e emissão de recibos.</p>
                </div>
                <button className="btn-primary" onClick={handleOpenCreate}>
                    <FaPlus /> Nova Fatura
                </button>
            </div>

            {/* KPI Cards Area */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="bg-white rounded-2xl p-6 shadow-sm shadow-slate-200/50 border border-slate-100 flex flex-col justify-between hover:shadow-md transition-shadow relative overflow-hidden group">
                    <div className="absolute -right-6 -top-6 bg-emerald-500/5 w-24 h-24 rounded-full group-hover:bg-emerald-500/10 transition-colors"></div>
                    <div className="flex justify-between items-start mb-4">
                        <div>
                            <p className="text-sm font-medium text-slate-500 mb-1">Receita Liquidada (Mês)</p>
                            <h3 className="text-3xl font-bold text-slate-800">
                                {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(stats.totalRevenue)}
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
                                {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(stats.pendingAmount)}
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
                            <p className="text-sm font-medium text-slate-500 mb-1">Consultas Pagas (Vol.)</p>
                            <h3 className="text-3xl font-bold text-slate-800">{stats.paidCount}</h3>
                        </div>
                        <div className="w-12 h-12 rounded-xl bg-primary-light text-primary flex items-center justify-center text-xl shadow-inner">
                            <FaFileInvoiceDollar />
                        </div>
                    </div>
                </div>
            </div>

            {/* Financial Charts Area */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 pb-2">
                <div className="bg-white rounded-2xl p-6 shadow-sm shadow-slate-200/50 border border-slate-100 flex flex-col h-[350px]">
                    <h3 className="font-semibold text-slate-800 mb-4">Proporção de Faturamento</h3>
                    <div className="flex-1 relative flex justify-center">
                        {revenueChartData && <Doughnut data={revenueChartData} options={{ maintainAspectRatio: false, cutout: '70%', plugins: { legend: { position: 'bottom', labels: { usePointStyle: true, padding: 20 } } } }} />}
                    </div>
                </div>
                <div className="bg-white rounded-2xl p-6 shadow-sm shadow-slate-200/50 border border-slate-100 flex flex-col h-[350px]">
                    <h3 className="font-semibold text-slate-800 mb-4">Métodos de Pagamento</h3>
                    <div className="flex-1 relative">
                        {methodChartData && <Bar data={methodChartData} options={{ maintainAspectRatio: false, plugins: { legend: { display: false } }, scales: { y: { beginAtZero: true, ticks: { stepSize: 1 } }, x: { grid: { display: false } } } }} />}
                    </div>
                </div>
            </div>

            {/* List & Filtering Array */}
            <div className="bg-white rounded-2xl shadow-sm shadow-slate-200/50 border border-slate-100 flex-1 flex flex-col overflow-hidden min-h-[500px]">
                <div className="p-4 border-b border-slate-100 flex flex-col sm:flex-row gap-4 justify-between bg-slate-50/50">
                    <div className="relative w-full sm:max-w-xs">
                        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                            <FaSearch className="text-sm" />
                        </div>
                        <input
                            type="text"
                            className="block w-full pl-9 pr-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 appearance-none font-medium text-slate-600 bg-white"
                            placeholder="Buscar forma de pagamento..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                        />
                    </div>
                    <div className="relative">
                        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                            <FaFilter className="text-sm" />
                        </div>
                        <select
                            className="block w-full sm:w-48 pl-9 pr-8 py-2 border border-slate-200 rounded-lg text-sm bg-white focus:outline-none focus:ring-2 focus:ring-primary/20 appearance-none font-medium text-slate-600 cursor-pointer"
                            value={statusFilter}
                            onChange={(e) => setStatusFilter(e.target.value)}
                        >
                            <option value="">Filtro: Todos os Status</option>
                            <option value="pago">Pago</option>
                            <option value="pendente">Pendente</option>
                            <option value="cancelado">Cancelado</option>
                        </select>
                        <div className="absolute inset-y-0 right-0 pr-3 flex items-center pointer-events-none text-slate-400">
                            <FaChevronDown className="text-xs" />
                        </div>
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
                                <th className="p-4 text-center font-bold">Ações</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100 text-sm">
                            {filteredPayments.length === 0 ? (
                                <tr>
                                    <td colSpan="7" className="p-8 text-center text-slate-500">
                                        <div className="flex flex-col items-center justify-center">
                                            <FaMoneyBillWave className="text-4xl text-slate-300 mb-3" />
                                            <p className="font-medium">Nenhum registro financeiro encontrado.</p>
                                        </div>
                                    </td>
                                </tr>
                            ) : (
                                filteredPayments.map((payment) => {
                                    // Linking patient names resolving from Appts > Users.
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
                                                {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(payment.value || 0)}
                                            </td>
                                            <td className="p-4 text-slate-500">
                                                {(payment.dueDate || payment.due_date) && !isNaN(new Date(payment.dueDate || payment.due_date).getTime()) ? new Date(payment.dueDate || payment.due_date).toLocaleDateString() : 'N/D'}
                                            </td>
                                            <td className="p-4 text-slate-600 font-medium">
                                                {payment.paymentMethod || payment.payment_method || '-'}
                                            </td>
                                            <td className="p-4">
                                                {getStatusBadge(payment.status)}
                                            </td>
                                            <td className="p-4">
                                                <div className="flex justify-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                                    <button className="p-2 text-slate-400 hover:text-primary hover:bg-primary-light rounded transition-colors" title="Editar / Baixar Recibo" onClick={() => handleOpenEdit(payment)}>
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
            </div>

            {/* Modal Forms Emissão Financeida */}
            <Modal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} title={editingId ? "Editar Faturamento" : "Emitir Fatura de Consulta"}>
                <form onSubmit={handleSubmit} className="space-y-4">
                    <div className="bg-primary/5 p-4 rounded-xl border border-primary/20 mb-4">
                        <p className="text-sm font-medium text-primary-dark">Vincule o pagamento diretamente a uma consulta realizada na clínica.</p>
                    </div>

                    <div>
                        <label className="text-sm font-bold text-slate-700 block mb-1">Referência (Consulta e Paciente)</label>
                        <Select
                            options={appointments.map(app => {
                                const patId = app.patient_id || app.user_id;
                                const pat = patients.find(p => String(p.id) === String(patId));
                                const patName = pat ? pat.name : 'Desconhecido';
                                const dateStr = new Date(app.date).toLocaleDateString();
                                return {
                                    value: app.id,
                                    label: `Consulta #${app.id} - ${patName} (${dateStr})`,
                                    patientId: patId // Keep patientId for quick access
                                };
                            })}
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
