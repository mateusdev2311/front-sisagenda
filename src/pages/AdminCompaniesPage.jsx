import { useState, useEffect } from 'react';
import axios from '../api/axiosConfig';
import toast from 'react-hot-toast';
import Modal from '../components/Modal';
import ConfirmModal from '../components/ConfirmModal';
import { FaPlus, FaEye, FaTrash, FaBuilding, FaUserTie, FaSearch, FaEdit, FaBan } from 'react-icons/fa';

const formatDueDate = (dateStr) => {
    if (!dateStr) return '';
    const day = parseInt(dateStr.split('T')[0].split('-')[2], 10);
    const today = new Date();
    let targetMonth = today.getMonth() + 1;
    if (today.getDate() > day) {
        targetMonth++;
        if (targetMonth > 12) targetMonth = 1;
    }
    return `${String(day).padStart(2, '0')}/${String(targetMonth).padStart(2, '0')}`;
};

const AdminCompaniesPage = () => {
    const [companies, setCompanies] = useState([]);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [isViewing, setIsViewing] = useState(false);
    const [currentCompany, setCurrentCompany] = useState(null);
    const [formData, setFormData] = useState({ name: '', admin_name: '', admin_email: '', admin_password: '', due_date: '', document: '', phone: '', plan: 'free' });
    const [confirmDialog, setConfirmDialog] = useState({ isOpen: false, title: '', message: '', type: 'primary', onConfirm: null });
    const [searchTerm, setSearchTerm] = useState('');

    useEffect(() => {
        fetchCompanies();
    }, []);

    const fetchCompanies = async () => {
        try {
            const res = await axios.get('/companies');
            setCompanies(res.data);
        } catch (error) {
            console.error('Failed to fetch companies', error);
            toast.error('Erro ao carregar clínicas. Tente recarregar a página.');
        }
    };

    const handleOpenCreate = () => {
        setIsViewing(false);
        setCurrentCompany(null);
        setFormData({ name: '', admin_name: '', admin_email: '', admin_password: '', due_date: '', document: '', phone: '', plan: 'free' });
        setIsModalOpen(true);
    };

    const handleOpenView = async (id) => {
        try {
            const res = await axios.get(`/companies/${id}`);
            setCurrentCompany(res.data);
            setIsViewing(true);
            setIsModalOpen(true);
        } catch (error) {
            toast.error('Erro ao carregar detalhes da clínica. Tente novamente.');
        }
    };

    const handleOpenEdit = (company) => {
        setIsViewing(false);
        setCurrentCompany(company);
        setFormData({ 
            name: company.name || '', 
            admin_name: '', // Gestor info might not be updatable from here, or we keep it blank
            admin_email: '', 
            admin_password: '', 
            due_date: company.due_date ? String(company.due_date).split('T')[0] : '', 
            document: company.document || '', 
            phone: company.phone || '', 
            plan: company.plan || 'free' 
        });
        setIsModalOpen(true);
    };

    const handleDelete = (id) => {
        setConfirmDialog({
            isOpen: true,
            title: 'Confirmar Exclusão',
            message: 'Tem certeza que deseja apagar esta clínica? Todos os dados vinculados a ela poderão ser perdidos.',
            type: 'danger',
            onConfirm: async () => {
                try {
                    await axios.delete(`/companies/${id}`);
                    setConfirmDialog(prev => ({ ...prev, isOpen: false }));
                    fetchCompanies();
                } catch (error) {
                    toast.error('Erro ao excluir clínica. Tente novamente.');
                }
            }
        });
    };

    const handleSubmit = (e) => {
        e.preventDefault();
        const isEditing = !!currentCompany;
        
        setConfirmDialog({
            isOpen: true,
            title: isEditing ? 'Confirmar Atualização' : 'Confirmar Cadastro',
            message: isEditing ? 'Gostaria de salvar as alterações desta clínica?' : 'Gostaria de proceder com o cadastro desta nova clínica (tenant)?',
            type: 'primary',
            onConfirm: async () => {
                try {
                    const payload = { ...formData };
                    if (isEditing && !payload.admin_password) delete payload.admin_password;

                    if (isEditing) {
                        await axios.put(`/companies/${currentCompany.id}`, payload);
                    } else {
                        await axios.post('/companies', payload);
                    }
                    setConfirmDialog(prev => ({ ...prev, isOpen: false }));
                    setIsModalOpen(false);
                    fetchCompanies();
                } catch (error) {
                    toast.error(isEditing ? 'Erro ao atualizar clínica.' : 'Erro ao cadastrar clínica. Verifique os dados.');
                }
            }
        });
    };

    const handleToggleStatus = (company) => {
        setConfirmDialog({
            isOpen: true,
            title: company.status ? 'Suspender Clínica' : 'Ativar Clínica',
            message: `Tem certeza que deseja ${company.status ? 'suspender' : 'ativar'} o acesso desta clínica? ${company.status ? 'Os usuários vinculados não conseguirão mais fazer login.' : 'Os usuários voltarão a ter acesso normal ao sistema.'}`,
            type: company.status ? 'warning' : 'success',
            onConfirm: async () => {
                try {
                    await axios.put(`/companies/${company.id}`, { name: company.name, status: !company.status });
                    setConfirmDialog(prev => ({ ...prev, isOpen: false }));
                    fetchCompanies();
                } catch (error) {
                    console.error('Erro ao atualizar status', error);
                    toast.error('Erro ao atualizar o status da clínica. Tente novamente.');
                }
            }
        });
    };

    const handleCancelSubscription = (company) => {
        if (!company.asaas_subscription_id) return;
        setConfirmDialog({
            isOpen: true,
            title: 'Cancelar Assinatura Asaas',
            message: `Tem certeza que deseja cancelar a assinatura de "${company.name}"? A clínica será suspensa automaticamente.`,
            type: 'danger',
            onConfirm: async () => {
                try {
                    await axios.delete(`/companies/${company.id}/subscription`);
                    setConfirmDialog(prev => ({ ...prev, isOpen: false }));
                    toast.success(`Assinatura de "${company.name}" cancelada.`);
                    fetchCompanies();
                } catch (error) {
                    toast.error('Erro ao cancelar assinatura. Tente novamente.');
                }
            }
        });
    };

    const filteredCompanies = companies.filter(c =>
        c.name.toLowerCase().includes(searchTerm.toLowerCase())
    );

    return (
        <div className="space-y-6 animate-in slide-in-from-bottom-4 duration-500 fade-in">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-2">
                <div>
                    <h2 className="text-2xl font-bold text-slate-800 tracking-tight">Gestão de Clínicas (SaaS)</h2>
                    <p className="text-sm text-slate-500 mt-1">Gerencie os tenants, clínicas e assinantes da plataforma.</p>
                </div>
                <div className="flex items-center gap-3">
                    <div className="relative">
                        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                            <FaSearch className="text-slate-400 text-sm" />
                        </div>
                        <input
                            type="text"
                            value={searchTerm}
                            onChange={e => setSearchTerm(e.target.value)}
                            className="block w-full pl-9 pr-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 bg-white"
                            placeholder="Buscar clínica..."
                        />
                    </div>
                    <button className="btn-primary" onClick={handleOpenCreate}>
                        <FaPlus className="text-sm" /> Nova Clínica
                    </button>
                </div>
            </div>

            <div className="bg-white rounded-2xl shadow-sm shadow-slate-200/50 border border-slate-100 overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse">
                        <thead>
                            <tr className="bg-slate-50/80 border-b border-slate-200 text-slate-500 text-xs uppercase tracking-wider font-semibold">
                                <th className="px-6 py-4">Nome da Clínica</th>
                                <th className="px-6 py-4">Status</th>
                                <th className="px-6 py-4">Plano</th>
                                <th className="px-6 py-4">Assinatura</th>
                                <th className="px-6 py-4">Vencimento</th>
                                <th className="px-6 py-4">Criado em</th>
                                <th className="px-6 py-4 text-right">Ações</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                            {filteredCompanies.map((c) => (
                                <tr key={c.id} className="hover:bg-slate-50/50 transition-colors group">
                                    <td className="px-6 py-4 whitespace-nowrap">
                                        <div className="flex items-center gap-3">
                                            <div className="h-9 w-9 rounded-full bg-primary/10 flex items-center justify-center text-primary">
                                                <FaBuilding />
                                            </div>
                                            <div>
                                                <div className="text-sm font-semibold text-slate-800">{c.name}</div>
                                                <div className="text-xs text-slate-500">ID: {c.id}</div>
                                            </div>
                                        </div>
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap">
                                        <button 
                                            onClick={() => handleToggleStatus(c)}
                                            className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-semibold cursor-pointer transition-colors ${
                                                c.status 
                                                ? 'bg-success/10 text-success hover:bg-success/20' 
                                                : 'bg-slate-100 text-slate-500 hover:bg-slate-200'
                                            }`}
                                            title={c.status ? "Clique para Suspender" : "Clique para Ativar"}
                                        >
                                            {c.status ? 'Ativo' : 'Suspenso'}
                                        </button>
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap">
                                        <span className={`px-2 py-1 text-[10px] font-bold uppercase rounded-md ${
                                            c.plan === 'pro' ? 'bg-indigo-100 text-indigo-700' :
                                            c.plan === 'start' ? 'bg-emerald-100 text-emerald-700' :
                                            'bg-slate-100 text-slate-600'
                                        }`}>
                                            {c.plan || 'Free'}
                                        </span>
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap">
                                        {c.asaas_subscription_id ? (
                                            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-semibold bg-green-50 text-green-700">
                                                ✓ Ativa
                                            </span>
                                        ) : (
                                            <span className="text-slate-400 text-xs">—</span>
                                        )}
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-600 font-medium">
                                        {c.due_date ? formatDueDate(c.due_date) : '—'}
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-600">
                                        {new Date(c.created_at || c.createdAt).toLocaleDateString()}
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                                        <div className="flex justify-end gap-2 transition-opacity">
                                            <button className="p-2 text-slate-400 hover:text-primary hover:bg-primary/5 rounded-lg transition-colors" title="Visualizar Detalhes" onClick={() => handleOpenView(c.id)}>
                                                <FaEye />
                                            </button>
                                            <button className="p-2 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors" title="Editar Clínica" onClick={() => handleOpenEdit(c)}>
                                                <FaEdit />
                                            </button>
                                            {c.asaas_subscription_id && (
                                                <button
                                                    className="p-2 text-slate-400 hover:text-orange-600 hover:bg-orange-50 rounded-lg transition-colors"
                                                    title="Cancelar Assinatura Asaas"
                                                    onClick={() => handleCancelSubscription(c)}
                                                >
                                                    <FaBan />
                                                </button>
                                            )}
                                            <button className="p-2 text-slate-400 hover:text-danger hover:bg-danger/5 rounded-lg transition-colors" title="Excluir Sistema" onClick={() => handleDelete(c.id)}>
                                                <FaTrash />
                                            </button>
                                        </div>
                                    </td>
                                </tr>
                            ))}
                            {filteredCompanies.length === 0 && (
                                <tr>
                                    <td colSpan="4" className="px-6 py-12 text-center text-slate-500">
                                        <div className="flex flex-col items-center justify-center">
                                            <FaBuilding className="text-4xl text-slate-300 mb-3" />
                                            <p>{searchTerm ? 'Nenhuma clínica encontrada para esta busca.' : 'Nenhuma clínica cadastrada na plataforma SaaS.'}</p>
                                        </div>
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>
            </div>

            <Modal
                isOpen={isModalOpen}
                onClose={() => setIsModalOpen(false)}
                title={isViewing ? "Detalhes da Clínica" : (currentCompany ? "Editar Clínica SaaS" : "Nova Clínica SaaS")}
            >
                {isViewing && currentCompany ? (
                    <div className="space-y-6">
                        <div className="flex flex-col items-center p-6 bg-slate-50 border border-slate-100 rounded-xl relative overflow-hidden">
                            <div className="absolute -right-8 -top-8 bg-primary/10 w-32 h-32 rounded-full"></div>
                            <div className="absolute -left-8 -bottom-8 bg-primary/10 w-24 h-24 rounded-full"></div>
                            <div className="w-24 h-24 rounded-full shadow-md border-4 border-white bg-primary text-white flex items-center justify-center text-4xl z-10">
                                <FaBuilding />
                            </div>
                            <h3 className="mt-4 text-xl font-bold text-slate-800 z-10">{currentCompany.name}</h3>
                            <span className={`mt-3 inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wide ${currentCompany.status ? 'bg-success text-white' : 'bg-slate-300 text-slate-700'}`}>
                                {currentCompany.status ? 'Ativo' : 'Suspenso'}
                            </span>
                        </div>
                        <div className="bg-white border border-slate-100 rounded-xl divide-y divide-slate-100">
                            <div className="flex justify-between p-4">
                                <span className="text-sm font-medium text-slate-500">ID da Clínica</span>
                                <span className="text-sm font-semibold text-slate-800">#{currentCompany.id}</span>
                            </div>
                            <div className="flex justify-between p-4">
                                <span className="text-sm font-medium text-slate-500">Data de Cadastro</span>
                                <span className="text-sm font-semibold text-slate-800">{new Date(currentCompany.created_at || currentCompany.createdAt).toLocaleString()}</span>
                            </div>
                        </div>
                        <div className="bg-white border border-slate-100 rounded-xl divide-y divide-slate-100 mt-4">
                            <div className="flex justify-between p-4">
                                <span className="text-sm font-medium text-slate-500">Documento</span>
                                <span className="text-sm font-semibold text-slate-800">{currentCompany.document || 'Não informado'}</span>
                            </div>
                            <div className="flex justify-between p-4">
                                <span className="text-sm font-medium text-slate-500">Telefone</span>
                                <span className="text-sm font-semibold text-slate-800">{currentCompany.phone || 'Não informado'}</span>
                            </div>
                            <div className="flex justify-between p-4">
                                <span className="text-sm font-medium text-slate-500">Data de Vencimento</span>
                                <span className="text-sm font-semibold text-slate-800">
                                    {currentCompany.due_date ? formatDueDate(currentCompany.due_date) : 'Não informado'}
                                </span>
                            </div>
                            <div className="flex justify-between p-4">
                                <span className="text-sm font-medium text-slate-500">Plano</span>
                                <span className="text-sm font-semibold text-slate-800 uppercase">{currentCompany.plan || 'Free'}</span>
                            </div>
                        </div>
                    </div>
                ) : (
                    <form onSubmit={handleSubmit} className="space-y-5">
                        <div className="bg-primary/5 p-4 rounded-xl border border-primary/10 mb-4 flex items-start gap-3">
                             <div className="text-primary mt-1"><FaBuilding /></div>
                             <div>
                                 <h4 className="text-sm font-semibold text-slate-800">{currentCompany ? 'Atualização de Tenant' : 'Criação de Tenant'}</h4>
                                 <p className="text-xs text-slate-600">{currentCompany ? 'Atualize as informações principais e o plano desta clínica.' : 'Esta ação irá cadastrar a clínica e provisionar automaticamente o seu usuário Gestor/Administrador.'}</p>
                             </div>
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                            <div className="col-span-2">
                                <label>Nome da Clínica</label>
                                <input type="text" value={formData.name} onChange={e => setFormData({ ...formData, name: e.target.value })} required placeholder="Ex: Clínica MedVida" />
                            </div>
                            <div>
                                <label>Documento (CNPJ/CPF)</label>
                                <input type="text" value={formData.document} onChange={e => setFormData({ ...formData, document: e.target.value })} placeholder="00.000.000/0001-00" />
                            </div>
                            <div>
                                <label>Telefone</label>
                                <input type="text" value={formData.phone} onChange={e => setFormData({ ...formData, phone: e.target.value })} placeholder="(00) 00000-0000" />
                            </div>
                            <div>
                                <label>Data de Venc. (Fatura)</label>
                                <input type="date" value={formData.due_date} onChange={e => setFormData({ ...formData, due_date: e.target.value })} />
                            </div>
                            <div className="col-span-2">
                                <label>Plano</label>
                                <select 
                                    value={formData.plan} 
                                    onChange={e => setFormData({ ...formData, plan: e.target.value })}
                                    className="w-full form-input"
                                >
                                    <option value="free">Free</option>
                                    <option value="start">Start</option>
                                    <option value="pro">Pro</option>
                                </select>
                            </div>
                        </div>
                        
                        {!currentCompany && (
                            <>
                                <div className="pt-4 border-t border-slate-100">
                                     <h4 className="text-sm font-bold text-slate-700 mb-3 flex items-center gap-2"><FaUserTie className="text-primary"/> Dados do Gestor (Admin da Clínica)</h4>
                                </div>

                                <div>
                                    <label>Nome do Gestor</label>
                                    <input type="text" value={formData.admin_name} onChange={e => setFormData({ ...formData, admin_name: e.target.value })} required placeholder="João da Silva" />
                                </div>
                                <div className="grid grid-cols-2 gap-4">
                                    <div>
                                        <label>E-mail do Gestor</label>
                                        <input type="email" value={formData.admin_email} onChange={e => setFormData({ ...formData, admin_email: e.target.value })} required placeholder="admin@clinica.com" />
                                    </div>
                                    <div>
                                        <label>Senha do Gestor</label>
                                        <input type="password" value={formData.admin_password} onChange={e => setFormData({ ...formData, admin_password: e.target.value })} required minLength="6" placeholder="••••••••" />
                                    </div>
                                </div>
                            </>
                        )}
                        
                        <div className="modal-footer pt-6 mt-6 border-t border-slate-100 flex justify-end gap-3 -mx-6 -mb-6 px-6 bg-slate-50 rounded-b-xl">
                            <button type="button" className="btn-secondary" onClick={() => setIsModalOpen(false)}>Cancelar</button>
                            <button type="submit" className="btn-primary" style={{ margin: 0 }}>{currentCompany ? 'Salvar Alterações' : 'Cadastrar Clínica'}</button>
                        </div>
                    </form>
                )}
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

export default AdminCompaniesPage;
