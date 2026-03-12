import { useState, useEffect } from 'react';
import axios from '../api/axiosConfig';
import Modal from '../components/Modal';
import ConfirmModal from '../components/ConfirmModal';
import { FaPlus, FaEye, FaTrash, FaBuilding, FaUserTie } from 'react-icons/fa';

const AdminCompaniesPage = () => {
    const [companies, setCompanies] = useState([]);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [isViewing, setIsViewing] = useState(false);
    const [currentCompany, setCurrentCompany] = useState(null);
    const [formData, setFormData] = useState({ name: '', admin_name: '', admin_email: '', admin_password: '' });
    const [confirmDialog, setConfirmDialog] = useState({ isOpen: false, title: '', message: '', type: 'primary', onConfirm: null });

    useEffect(() => {
        fetchCompanies();
    }, []);

    const fetchCompanies = async () => {
        try {
            const res = await axios.get('/companies');
            setCompanies(res.data);
        } catch (error) {
            console.error('Failed to fetch companies', error);
            alert('Erro ao carregar clínicas');
        }
    };

    const handleOpenCreate = () => {
        setIsViewing(false);
        setCurrentCompany(null);
        setFormData({ name: '', admin_name: '', admin_email: '', admin_password: '' });
        setIsModalOpen(true);
    };

    const handleOpenView = async (id) => {
        try {
            const res = await axios.get(`/companies/${id}`);
            setCurrentCompany(res.data);
            setIsViewing(true);
            setIsModalOpen(true);
        } catch (error) {
            alert('Erro ao carregar detalhes da clínica');
        }
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
                    alert('Erro ao deletar clínica');
                }
            }
        });
    };

    const handleSubmit = (e) => {
        e.preventDefault();
        setConfirmDialog({
            isOpen: true,
            title: 'Confirmar Cadastro',
            message: 'Gostaria de proceder com o cadastro desta nova clínica (tenant)?',
            type: 'primary',
            onConfirm: async () => {
                try {
                    await axios.post('/companies', formData);
                    setConfirmDialog(prev => ({ ...prev, isOpen: false }));
                    setIsModalOpen(false);
                    fetchCompanies();
                } catch (error) {
                    alert('Erro ao cadastrar clínica');
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
                    alert('Erro ao atualizar o status da clínica.');
                }
            }
        });
    };

    return (
        <div className="space-y-6 animate-in slide-in-from-bottom-4 duration-500 fade-in">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-2">
                <div>
                    <h2 className="text-2xl font-bold text-slate-800 tracking-tight">Gestão de Clínicas (SaaS)</h2>
                    <p className="text-sm text-slate-500 mt-1">Gerencie os tenants, clínicas e assinantes da plataforma.</p>
                </div>
                <button className="btn-primary" onClick={handleOpenCreate}>
                    <FaPlus className="text-sm" /> Nova Clínica
                </button>
            </div>

            <div className="bg-white rounded-2xl shadow-sm shadow-slate-200/50 border border-slate-100 overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse">
                        <thead>
                            <tr className="bg-slate-50/80 border-b border-slate-200 text-slate-500 text-xs uppercase tracking-wider font-semibold">
                                <th className="px-6 py-4">Nome da Clínica</th>
                                <th className="px-6 py-4">Status</th>
                                <th className="px-6 py-4">Criado em</th>
                                <th className="px-6 py-4 text-right">Ações</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                            {companies.map((c) => (
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
                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-600">
                                        {new Date(c.created_at || c.createdAt).toLocaleDateString()}
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                                        <div className="flex justify-end gap-2 transition-opacity">
                                            <button className="p-2 text-slate-400 hover:text-primary hover:bg-primary/5 rounded-lg transition-colors" title="Visualizar Detalhes" onClick={() => handleOpenView(c.id)}>
                                                <FaEye />
                                            </button>
                                            <button className="p-2 text-slate-400 hover:text-danger hover:bg-danger/5 rounded-lg transition-colors" title="Excluir Sistema" onClick={() => handleDelete(c.id)}>
                                                <FaTrash />
                                            </button>
                                        </div>
                                    </td>
                                </tr>
                            ))}
                            {companies.length === 0 && (
                                <tr>
                                    <td colSpan="4" className="px-6 py-12 text-center text-slate-500">
                                        <div className="flex flex-col items-center justify-center">
                                            <FaBuilding className="text-4xl text-slate-300 mb-3" />
                                            <p>Nenhuma clínica cadastrada na plataforma SaaS.</p>
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
                title={isViewing ? "Detalhes da Clínica" : "Nova Clínica SaaS"}
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
                    </div>
                ) : (
                    <form onSubmit={handleSubmit} className="space-y-5">
                        <div className="bg-primary/5 p-4 rounded-xl border border-primary/10 mb-4 flex items-start gap-3">
                             <div className="text-primary mt-1"><FaBuilding /></div>
                             <div>
                                 <h4 className="text-sm font-semibold text-slate-800">Criação de Tenant</h4>
                                 <p className="text-xs text-slate-600">Esta ação irá cadastrar a clínica e provisionar automaticamente o seu usuário Gestor/Administrador.</p>
                             </div>
                        </div>

                        <div>
                            <label>Nome da Clínica</label>
                            <input type="text" value={formData.name} onChange={e => setFormData({ ...formData, name: e.target.value })} required placeholder="Ex: Clínica MedVida" />
                        </div>
                        
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
                        
                        <div className="modal-footer pt-6 mt-6 border-t border-slate-100 flex justify-end gap-3 -mx-6 -mb-6 px-6 bg-slate-50 rounded-b-xl">
                            <button type="button" className="btn-secondary" onClick={() => setIsModalOpen(false)}>Cancelar</button>
                            <button type="submit" className="btn-primary" style={{ margin: 0 }}>Cadastrar Clínica</button>
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
