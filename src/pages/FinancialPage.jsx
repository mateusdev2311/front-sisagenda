import { useState, useEffect } from 'react';
import axios from '../api/axiosConfig';
import Modal from '../components/Modal';
import ConfirmModal from '../components/ConfirmModal';
import { FaMoneyBillWave, FaSearch, FaFilter, FaFileInvoiceDollar, FaCheckCircle, FaRegClock, FaTimesCircle, FaChevronDown, FaEdit, FaTrash, FaPlus, FaChartLine } from 'react-icons/fa';
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
    const [formData, setFormData] = useState({ appointment_id: '', amount: '', status: 'pendente', due_date: '', payment_method: '' });
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
            // Buscando Consultas e Pacientes para criar os vínculos e mostrar nomes reais
            const [appRes, patRes] = await Promise.all([
                axios.get('/appointments'),
                axios.get('/patients')
            ]);
            setAppointments(appRes.data);
            setPatients(patRes.data);

            // TODO: Aqui a API oficial (ex: GET /payments) entraria. 
            // Como estamos criando o front primeiro (Mocking Data), vamos simular os dados:
            const mockPayments = [
                { id: 1, appointment_id: appRes.data[0]?.id || 1, amount: 250.00, status: 'pago', due_date: new Date().toISOString().split('T')[0], payment_method: 'Pix' },
                { id: 2, appointment_id: appRes.data[1]?.id || 2, amount: 400.00, status: 'pendente', due_date: new Date(Date.now() + 86400000).toISOString().split('T')[0], payment_method: 'Cartão de Crédito' },
                { id: 3, appointment_id: appRes.data[2]?.id || 3, amount: 150.00, status: 'cancelado', due_date: new Date(Date.now() - 86400000).toISOString().split('T')[0], payment_method: 'Dinheiro' },
            ];
            setPayments(mockPayments);

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
            if (p.status === 'pago') {
                total += parseFloat(p.amount);
                paid++;
            } else if (p.status === 'pendente') {
                pending += parseFloat(p.amount);
            }

            if (p.payment_method) {
                methodsCount[p.payment_method] = (methodsCount[p.payment_method] || 0) + 1;
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
        setFormData({ appointment_id: '', amount: '', status: 'pendente', due_date: new Date().toISOString().split('T')[0], payment_method: '' });
        setIsModalOpen(true);
    };

    const handleOpenEdit = (payment) => {
        setEditingId(payment.id);
        setFormData({
            appointment_id: payment.appointment_id,
            amount: payment.amount,
            status: payment.status,
            due_date: new Date(payment.due_date).toISOString().split('T')[0],
            payment_method: payment.payment_method
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
                // TODO: Substituir por chamada real da API axios.delete(`/payments/${id}`)
                setPayments(prev => prev.filter(p => p.id !== id));
                setConfirmDialog(prev => ({ ...prev, isOpen: false }));
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
                    // TODO: Substituir por chamadas reais com axios.post e axios.put
                    const newPaymentObj = {
                        id: editingId ? editingId : Math.floor(Math.random() * 1000),
                        appointment_id: Number(formData.appointment_id),
                        amount: parseFloat(formData.amount),
                        status: formData.status,
                        due_date: formData.due_date,
                        payment_method: formData.payment_method
                    };

                    if (editingId) {
                        setPayments(prev => prev.map(p => p.id === editingId ? newPaymentObj : p));
                    } else {
                        setPayments(prev => [...prev, newPaymentObj]);
                    }

                    setConfirmDialog(prev => ({ ...prev, isOpen: false }));
                    setIsModalOpen(false);
                } catch (error) {
                    alert('Erro ao processar o faturamento');
                }
            }
        });
    };

    // ----------------------------------------------------------------------
    // 6. Helpers de UI (Mapeamento Visual para Cores e Badges)
    // ----------------------------------------------------------------------
    const getStatusBadge = (status) => {
        switch (status) {
            case 'pago': return <span className="flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-emerald-100 text-emerald-700 border border-emerald-200"><FaCheckCircle className="text-sm" /> Pago</span>;
            case 'pendente': return <span className="flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-amber-100 text-amber-700 border border-amber-200"><FaRegClock className="text-sm" /> Pendente</span>;
            case 'cancelado': return <span className="flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-red-100 text-red-700 border border-red-200"><FaTimesCircle className="text-sm" /> Cancelado</span>;
            default: return <span className="flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-slate-100 text-slate-700 border border-slate-200">Desconhecido</span>;
        }
    };

    // Lógica de Filtro Cruzado para o Módulo de Tabela
    const filteredPayments = payments.filter(p => {
        const matchesStatus = statusFilter ? p.status === statusFilter : true;
        // Basic search filtering (by appointment ID or status or method for now)
        const matchesSearch = searchTerm ?
            String(p.appointment_id).includes(searchTerm) ||
            p.payment_method.toLowerCase().includes(searchTerm.toLowerCase())
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
                                    const linkedAppt = appointments.find(a => a.id === payment.appointment_id);
                                    let patientName = "Desconhecido";
                                    if (linkedAppt) {
                                        const patId = linkedAppt.patient_id || linkedAppt.user_id;
                                        const pat = patients.find(p => p.id === patId);
                                        if (pat) patientName = pat.name;
                                    }

                                    return (
                                        <tr key={payment.id} className="hover:bg-slate-50/80 transition-colors group">
                                            <td className="p-4 font-medium text-slate-800">#{payment.appointment_id}</td>
                                            <td className="p-4 text-slate-600 font-medium">{patientName}</td>
                                            <td className="p-4 text-slate-800 font-bold border-l-2 border-transparent group-hover:border-primary">
                                                {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(payment.amount)}
                                            </td>
                                            <td className="p-4 text-slate-500">{new Date(payment.due_date).toLocaleDateString()}</td>
                                            <td className="p-4 text-slate-600 font-medium">
                                                {payment.payment_method || '-'}
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
                        <label className="text-sm font-bold text-slate-700 block mb-1">Referência (ID da Consulta)</label>
                        <select className="form-control font-medium" required value={formData.appointment_id} onChange={e => setFormData({ ...formData, appointment_id: e.target.value })}>
                            <option value="">Selecione a consulta...</option>
                            {appointments.map(app => (
                                <option key={app.id} value={app.id}>
                                    Agendamento #{app.id} - {new Date(app.date).toLocaleDateString()}
                                </option>
                            ))}
                        </select>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="text-sm font-bold text-slate-700 block mb-1">Valor (R$)</label>
                            <input type="number" step="0.01" className="form-control text-lg font-bold text-slate-800" required value={formData.amount} onChange={e => setFormData({ ...formData, amount: e.target.value })} placeholder="0.00" />
                        </div>
                        <div>
                            <label className="text-sm font-bold text-slate-700 block mb-1">Data de Vencimento</label>
                            <input type="date" className="form-control" required value={formData.due_date} onChange={e => setFormData({ ...formData, due_date: e.target.value })} />
                        </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="text-sm font-bold text-slate-700 block mb-1">Status do Pagamento</label>
                            <select className="form-control" value={formData.status} onChange={e => setFormData({ ...formData, status: e.target.value })}>
                                <option value="pendente">Pendente</option>
                                <option value="pago">Pago (Liquidado)</option>
                                <option value="cancelado">Cancelado</option>
                            </select>
                        </div>
                        <div>
                            <label className="text-sm font-bold text-slate-700 block mb-1">Método de Pagamento</label>
                            <select className="form-control" value={formData.payment_method} onChange={e => setFormData({ ...formData, payment_method: e.target.value })}>
                                <option value="">Não definido</option>
                                <option value="Pix">Transf. via Pix</option>
                                <option value="Cartão de Crédito">Cartão de Crédito</option>
                                <option value="Dinheiro">Dinheiro (Espécie)</option>
                                <option value="Plano de Saúde">Convênio/Plano de Saúde</option>
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
