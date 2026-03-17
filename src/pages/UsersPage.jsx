import { useState, useEffect } from 'react';
import axios from '../api/axiosConfig';
import Modal from '../components/Modal';
import ConfirmModal from '../components/ConfirmModal';
import { FaPlus, FaEye, FaTrash, FaUserShield, FaUser, FaEdit, FaSearch } from 'react-icons/fa';

const UsersPage = () => {
    /**
     * Estados de Controle de Acesso (RBAC - Role-Based Access Control)
     * @property {Array} users - Administradores e equipe do sistema global.
     * @property {boolean} isModalOpen - Flag controladora do overlay (Modal).
     * @property {boolean} isViewing - Flag booleana que alterna entre Vizualizar vs Editar.
     * @property {Object} currentUser - Objeto mapeando o perfil ativo na tela no momento.
     * @property {Object} formData - Objeto de credenciais de autenticação capturando email/senha/cargo.
     */
    const [users, setUsers] = useState([]);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [isViewing, setIsViewing] = useState(false);
    const [currentUser, setCurrentUser] = useState(null);
    const [editingId, setEditingId] = useState(null);
    const [formData, setFormData] = useState({ name: '', email: '', password: '' });
    const [confirmDialog, setConfirmDialog] = useState({ isOpen: false, title: '', message: '', type: 'primary', onConfirm: null });
    const [searchTerm, setSearchTerm] = useState('');

    /**
     * Busca as contas de usuário do sistema assim que a tela carrega.
     */
    useEffect(() => {
        fetchUsers();
    }, []);

    /**
     * API: GET /users
     * Recupera todos os Usuários do Sistema para preencher a tabela de gerenciamento.
     * Array de Resposta Esperado: [{ id, name, email, role, created_at, ... }]
     */
    const fetchUsers = async () => {
        try {
            const res = await axios.get('/users');
            setUsers(res.data);
        } catch (error) {
            console.error('Failed to fetch users', error);
            toast.error('Erro ao carregar usuários. Tente recarregar a página.');
        }
    };

    const handleOpenCreate = () => {
        setIsViewing(false);
        setEditingId(null);
        setCurrentUser(null);
        setFormData({ name: '', email: '', password: '' });
        setIsModalOpen(true);
    };

    const handleOpenEdit = (user) => {
        setIsViewing(false);
        setEditingId(user.id);
        setCurrentUser(null);
        // Do not pre-fill password for security reasons (unless implementing a dedicated change-password endpoint)
        setFormData({ name: user.name, email: user.email, password: '' });
        setIsModalOpen(true);
    };

    /**
     * API: GET /users/:id
     * Recupera os dados específicos de um único usuário focado no modal de Perfil (somente leitura).
     */
    const handleOpenView = async (id) => {
        try {
            const res = await axios.get(`/users/${id}`);
            setCurrentUser(res.data);
            setIsViewing(true);
            setIsModalOpen(true);
        } catch (error) {
            toast.error('Não foi possível carregar o perfil do usuário. Tente novamente.');
        }
    };

    /**
     * API: DELETE /users/:id
     * Realiza a exclusão lógica (Soft) ou física (Hard) de um usuário do sistema dependendo do backend.
     */
    const handleDelete = (id) => {
        setConfirmDialog({
            isOpen: true,
            title: 'Confirmar Exclusão',
            message: 'Tem certeza que deseja apagar este usuário definitivamente? Como esta é uma restrição de RBAC, esta ação não pode ser desfeita.',
            type: 'danger',
            onConfirm: async () => {
                try {
                    await axios.delete(`/users/${id}`);
                    setConfirmDialog(prev => ({ ...prev, isOpen: false }));
                    fetchUsers();
                } catch (error) {
                    toast.error('Erro ao excluir usuário. Tente novamente.');
                }
            }
        });
    };

    /**
     * API: POST /users
     * Provisiona (Configura) um novo Usuário Padrão ou Administrador.
     * Variáveis do Payload (Corpo do Envio):
     * {
     *   "name": string,
     *   "email": string,
     *   "password": string (mín. recomendado de 6 caracteres),
     *   "role": ENUM('USER', 'ADMIN')
     * }
     */
    const handleSubmit = (e) => {
        e.preventDefault();
        setConfirmDialog({
            isOpen: true,
            title: editingId ? 'Confirmar Edição' : 'Confirmar Criação',
            message: editingId ? 'Tem certeza que quer salvar este novo perfil?' : 'Gostaria de proceder com o cadastro deste novo usuário?',
            type: 'primary',
            onConfirm: async () => {
                try {
                    const userString = localStorage.getItem('user');
                    const loggedUser = userString ? JSON.parse(userString) : {};
                    const company_id = loggedUser.company_id;

                    const payload = {
                        ...formData,
                        company_id: company_id
                    };

                    if (editingId) {
                        await axios.put(`/users/${editingId}`, payload);
                    } else {
                        await axios.post('/users', payload);
                    }
                    setConfirmDialog(prev => ({ ...prev, isOpen: false }));
                    setIsModalOpen(false);
                    fetchUsers();
                } catch (error) {
                    toast.error('Erro ao salvar usuário. Verifique os dados e tente novamente.');
                }
            }
        });
    };

    const filteredUsers = users.filter(u =>
        u.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        u.email.toLowerCase().includes(searchTerm.toLowerCase())
    );

    return (
        <div className="space-y-6 animate-in slide-in-from-bottom-4 duration-500 fade-in">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-2">
                <div>
                    <h2 className="text-2xl font-bold text-slate-800 tracking-tight">Usuários do Sistema</h2>
                    <p className="text-sm text-slate-500 mt-1">Gerencie administradores, suporte e recepcionistas.</p>
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
                            placeholder="Buscar usuário..."
                        />
                    </div>
                    <button className="btn-primary" onClick={handleOpenCreate}>
                        <FaPlus className="text-sm" /> Novo Usuário
                    </button>
                </div>
            </div>

            <div className="bg-white rounded-2xl shadow-sm shadow-slate-200/50 border border-slate-100 overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse">
                        <thead>
                            <tr className="bg-slate-50/80 border-b border-slate-200 text-slate-500 text-xs uppercase tracking-wider font-semibold">
                                <th className="px-6 py-4">Nome</th>
                                <th className="px-6 py-4">Entrou em</th>
                                <th className="px-6 py-4 text-right">Ações</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                            {filteredUsers.map((u) => (
                                <tr key={u.id} className="hover:bg-slate-50/50 transition-colors group">
                                    <td className="px-6 py-4 whitespace-nowrap">
                                        <div className="flex items-center gap-3">
                                            <img className="h-9 w-9 rounded-full object-cover border border-slate-200" src={`https://ui-avatars.com/api/?name=${u.name.replace(/ /g, '+')}&background=random`} alt="" />
                                            <div>
                                                <div className="text-sm font-semibold text-slate-800">{u.name}</div>
                                                <div className="text-xs text-slate-500">{u.email}</div>
                                            </div>
                                        </div>
                                    </td>
                                     <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-600">
                                        {new Date(u.created_at).toLocaleDateString()}
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                                        <div className="flex justify-end gap-2 transition-opacity">
                                            <button className="p-2 text-slate-400 hover:text-primary hover:bg-primary/5 rounded-lg transition-colors" title="Visualizar Perfil" onClick={() => handleOpenView(u.id)}>
                                                <FaEye />
                                            </button>
                                            <button className="p-2 text-slate-400 hover:text-warning hover:bg-warning/5 rounded-lg transition-colors" title="Editar" onClick={() => handleOpenEdit(u)}>
                                                <FaEdit />
                                            </button>
                                            <button className="p-2 text-slate-400 hover:text-danger hover:bg-danger/5 rounded-lg transition-colors" title="Excluir" onClick={() => handleDelete(u.id)}>
                                                <FaTrash />
                                            </button>
                                        </div>
                                    </td>
                                </tr>
                            ))}
                            {filteredUsers.length === 0 && (
                                <tr>
                                    <td colSpan="4" className="px-6 py-12 text-center text-slate-500">
                                        <div className="flex flex-col items-center justify-center">
                                            <FaUserShield className="text-4xl text-slate-300 mb-3" />
                                            <p>{searchTerm ? 'Nenhum usuário encontrado para esta busca.' : 'Nenhum usuário cadastrado no sistema.'}</p>
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
                title={isViewing ? "Perfil do Usuário" : (editingId ? "Editar Credenciais" : "Novo Usuário")}
            >
                {isViewing && currentUser ? (
                    <div className="space-y-6">
                        <div className="flex flex-col items-center p-6 bg-slate-50 border border-slate-100 rounded-xl relative overflow-hidden">
                            {/* Background decors */}
                            <div className="absolute -right-8 -top-8 bg-primary/10 w-32 h-32 rounded-full"></div>
                            <div className="absolute -left-8 -bottom-8 bg-primary/10 w-24 h-24 rounded-full"></div>

                            <img src={`https://ui-avatars.com/api/?name=${currentUser.name.replace(/ /g, '+')}&background=random&size=128`} className="w-24 h-24 rounded-full shadow-md border-4 border-white z-10" alt="Avatar" />
                            <h3 className="mt-4 text-xl font-bold text-slate-800 z-10">{currentUser.name}</h3>
                            <p className="text-sm text-slate-500 z-10">{currentUser.email}</p>
                        </div>

                        <div className="bg-white border border-slate-100 rounded-xl divide-y divide-slate-100">
                            <div className="flex justify-between p-4">
                                <span className="text-sm font-medium text-slate-500">ID no Sistema</span>
                                <span className="text-sm font-semibold text-slate-800">#{currentUser.id.toString().padStart(4, '0')}</span>
                            </div>
                            <div className="flex justify-between p-4">
                                <span className="text-sm font-medium text-slate-500">Data de Cadastro</span>
                                <span className="text-sm font-semibold text-slate-800">{new Date(currentUser.created_at).toLocaleString()}</span>
                            </div>
                        </div>
                    </div>
                ) : (
                    <form onSubmit={handleSubmit} className="space-y-5">
                        <div>
                            <label>Nome Completo</label>
                            <input type="text" value={formData.name} onChange={e => setFormData({ ...formData, name: e.target.value })} required placeholder="João da Silva" />
                        </div>
                        <div>
                            <label>Endereço de E-mail</label>
                            <input type="email" value={formData.email} onChange={e => setFormData({ ...formData, email: e.target.value })} required placeholder="joao@exemplo.com" />
                        </div>
                        <div>
                            <label>Senha {editingId && <span className="text-xs text-slate-400 font-normal">(Deixe em branco para manter)</span>}</label>
                            <input type="password" value={formData.password} onChange={e => setFormData({ ...formData, password: e.target.value })} required={!editingId} minLength="6" placeholder="••••••••" />
                        </div>
                        <div className="modal-footer pt-6 mt-6 border-t border-slate-100 flex justify-end gap-3 -mx-6 -mb-6 px-6 bg-slate-50 rounded-b-xl">
                            <button type="button" className="btn-secondary" onClick={() => setIsModalOpen(false)}>Cancelar</button>
                            <button type="submit" className="btn-primary" style={{ margin: 0 }}>{editingId ? "Salvar Alterações" : "Salvar Usuário"}</button>
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

export default UsersPage;
