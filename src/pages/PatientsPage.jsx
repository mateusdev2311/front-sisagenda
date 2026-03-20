import { useState, useEffect, useRef } from 'react';
import axios from '../api/axiosConfig';
import toast from 'react-hot-toast';
import Modal from '../components/Modal';
import ConfirmModal from '../components/ConfirmModal';
import * as XLSX from 'xlsx';
import { FaPlus, FaEye, FaTrash, FaUserInjured, FaPhone, FaEnvelope, FaEdit, FaFileUpload, FaFilePdf, FaDownload, FaSearch, FaFileImport } from 'react-icons/fa';

const PatientsPage = () => {
    /**
     * Estado Local do Componente
     * @property {Array} patients - Lista central de registros de pacientes vindos da API.
     * @property {boolean} isModalOpen - Controla a caixa de diálogo overlay centralizada (Modal).
     * @property {boolean} isViewing - Diferencia se o modal é 'Visualização de Perfil' ou 'Formulário de Criação'.
     * @property {Object} currentPatient - Pacote de dados do paciente específico sendo visualizado no momento.
     * @property {Object} formData - Vinculado aos inputs do formulário para criar o registro de um novo paciente.
     */
    const [patients, setPatients] = useState([]);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [isViewing, setIsViewing] = useState(false);
    const [currentPatient, setCurrentPatient] = useState(null);
    const [editingId, setEditingId] = useState(null);
    const [formData, setFormData] = useState({ name: '', email: '', cpf: '', number: '', birth_date: '', gender: 'Male', address: '', city: '', state: '', zip_code: '' });
    const [confirmDialog, setConfirmDialog] = useState({ isOpen: false, title: '', message: '', type: 'primary', onConfirm: null });
    const [isLoading, setIsLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const [isImporting, setIsImporting] = useState(false);
    const fileInputRef = useRef(null);

    // Premium Feature: Patient Document Uploads Removed

    /**
     * Ciclo de Vida do Componente
     * Carrega os dados dos pacientes imediatamente ao navegar para esta página.
     */
    useEffect(() => {
        fetchPatients();
    }, []);

    /**
     * API: GET /patients
     * Busca a lista principal listando todos os pacientes.
     * Formato Esperado de Resposta (Array): [{ id, name, gender, birth_date, phone, email, ... }]
     */
    const fetchPatients = async () => {
        try {
            setIsLoading(true);
            const res = await axios.get('/patients');
            setPatients(res.data);
        } catch (error) {
            toast.error('Error fetching patients');
        } finally {
            setIsLoading(false);
        }
    };

    const handleOpenCreate = () => {
        setIsViewing(false);
        setEditingId(null);
        setCurrentPatient(null);
        setFormData({ name: '', email: '', cpf: '', number: '', birth_date: '', gender: 'Male', address: '', city: '', state: '', zip_code: '' });
        setIsModalOpen(true);
    };

    const handleOpenEdit = (patient) => {
        setIsViewing(false);
        setEditingId(patient.id);
        setCurrentPatient(null);
        // Format date strictly for the <input type="date"> (YYYY-MM-DD)
        const dateInput = patient.birth_date ? new Date(patient.birth_date).toISOString().split('T')[0] : '';
        setFormData({ name: patient.name, email: patient.email || '', cpf: patient.cpf || '', number: patient.number || '', birth_date: dateInput, gender: patient.gender, address: patient.address || '', city: patient.city || '', state: patient.state || '', zip_code: patient.zip_code || '' });
        setIsModalOpen(true);
    };

    /**
     * API: GET /patients/:id
     * Busca os detalhes de exatamente um paciente para preencher o Modal de Visualização de Perfil.
     * @param {string|number} id - ID do paciente a ser buscado
     */
    const handleOpenView = async (id) => {
        try {
            const res = await axios.get(`/patients/${id}`);
            setCurrentPatient(res.data);
            setIsViewing(true);
            setIsModalOpen(true);
        } catch (error) {
            toast.error('Error loading profile');
        }
    };

    /**
     * API: DELETE /patients/:id
     * Remove o cadastro de um paciente do banco de dados.
     * @param {string|number} id - ID do paciente a deletar
     */
    const handleDelete = (id) => {
        setConfirmDialog({
            isOpen: true,
            title: 'Confirmar Exclusão',
            message: 'Tem certeza que deseja apagar o registro deste paciente? Seus dados não poderão ser recuperados.',
            type: 'danger',
            onConfirm: async () => {
                try {
                    await axios.delete(`/patients/${id}`);
                    setConfirmDialog(prev => ({ ...prev, isOpen: false }));
                    toast.success('Paciente excluído permanentemente.');
                    fetchPatients();
                } catch (error) {
                    toast.error('Erro ao excluir paciente');
                }
            }
        });
    };

    /**
     * Lógica de Importação de Planilha XLSX
     */
    const handleImportClick = () => {
        fileInputRef.current?.click();
    };

    const handleFileChange = async (e) => {
        const file = e.target.files?.[0];
        if (!file) return;

        setIsImporting(true);
        const reader = new FileReader();

        reader.onload = async (evt) => {
            try {
                const bstr = evt.target.result;
                const wb = XLSX.read(bstr, { type: 'binary' });
                const wsname = wb.SheetNames[0];
                const ws = wb.Sheets[wsname];
                const data = XLSX.utils.sheet_to_json(ws);

                if (data.length === 0) {
                    toast.error('A planilha está vazia.');
                    return;
                }

                // Normalização e Mapeamento para os campos do Backend
                const normalizedPatients = data.map(item => {
                    const newItem = {};
                    const fieldMapping = {
                        'nome': 'name',
                        'paciente': 'name',
                        'telefone': 'number',
                        'celular': 'number',
                        'contato': 'number',
                        'nascimento': 'birth_date',
                        'data_nascimento': 'birth_date',
                        'genero': 'gender',
                        'sexo': 'gender',
                        'endereco': 'address',
                        'cidade': 'city',
                        'estado': 'state',
                        'uf': 'state',
                        'cep': 'zip_code'
                    };

                    Object.keys(item).forEach(key => {
                        const rawKey = key.toLowerCase().trim()
                            .replace(/\s+/g, '_')
                            .normalize("NFD").replace(/[\u0300-\u036f]/g, ""); // Remove acentos
                        
                        const finalKey = fieldMapping[rawKey] || rawKey;
                        newItem[finalKey] = item[key];
                    });
                    return newItem;
                });

                const res = await axios.post('/patients/bulk', { patients: normalizedPatients });
                
                const { imported, skipped, message } = res.data;
                toast.success(`${message}: ${imported} importado(s), ${skipped} pulado(s).`, {
                    duration: 5000,
                    icon: '📊'
                });

                fetchPatients();
            } catch (error) {
                console.error("Import Error:", error);
                toast.error('Erro ao processar planilha. Verifique o formato do arquivo.');
            } finally {
                setIsImporting(false);
                if (fileInputRef.current) fileInputRef.current.value = '';
            }
        };

        reader.readAsBinaryString(file);
    };

    const handleDownloadTemplate = () => {
        const templateData = [
            {
                'Nome': 'Exemplo Silva',
                'CPF': '000.000.000-00',
                'Telefone': '5511999999999',
                'Email': 'exemplo@email.com',
                'Data Nascimento': '01/01/1990',
                'Genero': 'Masculino',
                'Endereco': 'Rua Exemplo, 123',
                'Cidade': 'São Paulo',
                'Estado': 'SP',
                'CEP': '01001-000'
            }
        ];

        const ws = XLSX.utils.json_to_sheet(templateData);
        const wb = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(wb, ws, "Modelo Importação");
        XLSX.writeFile(wb, "modelo_pacientes_sisagenda.xlsx");
        toast.success('Modelo pronto! Siga o formato das colunas.');
    };

    /**
     * API: POST /patients
     * Cria um novo registro de paciente.
     * Payload (Corpo enviado) baseado no `formData`: 
     * {
     *   "name": string,
     *   "email": string,
     *   "cpf": string,
     *   "number": string (Telefone),
     *   "birth_date": string (no formato AAAA-MM-DD),
     *   "gender": ENUM('Male', 'Female', 'Other'),
     *   "address": string,
     *   "city": string,
     *   "state": string,
     *   "zip_code": string
     * }
     */
    const handleSubmit = (e) => {
        e.preventDefault();
        setConfirmDialog({
            isOpen: true,
            title: editingId ? 'Confirmar Edição' : 'Confirmar Cadastro',
            message: editingId ? 'Deseja salvar as alterações nos dados deste paciente?' : 'Deseja registrar este novo paciente no sistema?',
            type: 'primary',
            onConfirm: async () => {
                try {
                    const payload = {
                        id: editingId || 0,
                        ...formData
                    };

                    if (editingId) {
                        await axios.put(`/patients/${editingId}`, payload);
                    } else {
                        await axios.post('/patients', payload);
                    }
                    setConfirmDialog(prev => ({ ...prev, isOpen: false }));
                    setIsModalOpen(false);
                    toast.success(editingId ? 'Dados do paciente atualizados!' : 'Novo paciente registrado com sucesso!');
                    fetchPatients();
                } catch (error) {
                    console.error("Save Error:", error.response?.data || error);
                    const errorMsg = error.response?.data?.message || error.response?.data?.error || 'Verifique os campos obrigatórios vazios.';
                    toast.error(`Erro ao salvar paciente: ${errorMsg}`);
                }
            }
        });
    };

    const getGenderStyle = (gender) => {
        const g = gender?.toLowerCase();
        if (g === 'female' || g === 'feminino') return 'bg-fuchsia-50 text-fuchsia-600 border-fuchsia-200';
        if (g === 'male' || g === 'masculino') return 'bg-teal-50 text-teal-600 border-teal-200';
        return 'bg-slate-100 text-slate-600 border-slate-200';
    };

    const filteredPatients = patients.filter(p =>
        p.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (p.email && p.email.toLowerCase().includes(searchTerm.toLowerCase())) ||
        (p.cpf && p.cpf.includes(searchTerm))
    );

    return (
        <div className="space-y-6 animate-in slide-in-from-bottom-4 duration-500 fade-in">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-2">
                <div>
                    <h2 className="text-2xl font-bold text-slate-800 tracking-tight">Registro de Pacientes</h2>
                    <p className="text-sm text-slate-500 mt-1">Gerencie os dados demográficos e informações de contato.</p>
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
                            placeholder="Buscar por nome, e-mail ou CPF..."
                        />
                    </div>
                    <input
                        type="file"
                        ref={fileInputRef}
                        onChange={handleFileChange}
                        accept=".xlsx, .xls"
                        className="hidden"
                    />
                    <button 
                        className="btn-secondary flex items-center gap-2" 
                        onClick={handleDownloadTemplate}
                        title="Baixar Planilha de Exemplo"
                    >
                        <FaDownload className="text-sm" /> 
                        <span className="hidden lg:inline">Baixar Modelo</span>
                    </button>
                    <button 
                        className="btn-secondary flex items-center gap-2" 
                        onClick={handleImportClick}
                        disabled={isImporting}
                    >
                        {isImporting ? <FaFileUpload className="animate-spin" /> : <FaFileImport />}
                        {isImporting ? 'Importando...' : 'Importar Planilha'}
                    </button>
                    <button className="btn-primary" onClick={handleOpenCreate}>
                        <FaPlus className="text-sm" /> Novo Paciente
                    </button>
                </div>
            </div>

            <div className="bg-white rounded-2xl shadow-sm shadow-slate-200/50 border border-slate-100 overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse">
                        <thead>
                            <tr className="bg-slate-50/80 border-b border-slate-200 text-slate-500 text-xs uppercase tracking-wider font-semibold">
                                <th className="px-6 py-4">Nome do Paciente</th>
                                <th className="px-6 py-4">Demografia</th>
                                <th className="px-6 py-4">Contato</th>
                                <th className="px-6 py-4 text-right">Ações</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                            {isLoading ? (
                                /* Skeleton Loader Premium */
                                Array.from({ length: 5 }).map((_, idx) => (
                                    <tr key={`skeleton-${idx}`} className="animate-pulse">
                                        <td className="px-6 py-4 whitespace-nowrap">
                                            <div className="flex items-center gap-3">
                                                <div className="h-10 w-10 bg-slate-200 rounded-xl"></div>
                                                <div className="space-y-2">
                                                    <div className="h-4 bg-slate-200 rounded w-24"></div>
                                                    <div className="h-3 bg-slate-100 rounded w-16"></div>
                                                </div>
                                            </div>
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap">
                                            <div className="h-5 bg-slate-200 rounded w-20"></div>
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap">
                                            <div className="space-y-2">
                                                <div className="h-4 bg-slate-200 rounded w-28"></div>
                                                <div className="h-3 bg-slate-100 rounded w-32"></div>
                                            </div>
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap text-right">
                                            <div className="flex justify-end gap-2">
                                                <div className="h-8 w-8 bg-slate-100 rounded-lg"></div>
                                                <div className="h-8 w-8 bg-slate-100 rounded-lg"></div>
                                                <div className="h-8 w-8 bg-slate-100 rounded-lg"></div>
                                            </div>
                                        </td>
                                    </tr>
                                ))
                            ) : filteredPatients.map((p) => {
                                const age = p.birth_date ? new Date().getFullYear() - new Date(p.birth_date).getFullYear() : 'N/A';
                                return (
                                    <tr key={p.id} className="hover:bg-slate-50/50 transition-colors group">
                                        <td className="px-6 py-4 whitespace-nowrap">
                                            <div className="flex items-center gap-3">
                                                <img className="h-10 w-10 rounded-xl object-cover border border-slate-200 shadow-sm" src={`https://ui-avatars.com/api/?name=${p.name.replace(/ /g, '+')}&background=f8f9fa&color=475569`} alt="" />
                                                <div>
                                                    <div className="text-sm font-bold text-slate-800">{p.name}</div>
                                                    <div className="text-xs text-slate-500">ID #{p.id.toString().padStart(5, '0')}</div>
                                                </div>
                                            </div>
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap">
                                            <div className="flex items-center gap-2">
                                                <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-semibold border ${getGenderStyle(p.gender)}`}>
                                                    {p.gender === 'Male' ? 'Masculino' : p.gender === 'Female' ? 'Feminino' : 'Outro'}
                                                </span>
                                                <span className="text-sm text-slate-600 font-medium">{age} anos</span>
                                            </div>
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap">
                                            <div className="flex flex-col gap-1">
                                                <div className="flex items-center gap-2 text-sm text-slate-700">
                                                    <FaPhone className="text-slate-400 text-xs" /> {p.number}
                                                </div>
                                                <div className="flex items-center gap-2 text-xs text-slate-500">
                                                    <FaEnvelope className="text-slate-400" /> {p.email}
                                                </div>
                                            </div>
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                                            <div className="flex justify-end gap-2 transition-opacity">
                                                <button className="p-2 text-slate-400 hover:text-primary hover:bg-primary/5 rounded-lg transition-colors" title="Visualizar Perfil" onClick={() => handleOpenView(p.id)}>
                                                    <FaEye />
                                                </button>
                                                <button className="p-2 text-slate-400 hover:text-warning hover:bg-warning/5 rounded-lg transition-colors" title="Editar" onClick={() => handleOpenEdit(p)}>
                                                    <FaEdit />
                                                </button>
                                                <button className="p-2 text-slate-400 hover:text-danger hover:bg-danger/5 rounded-lg transition-colors" title="Excluir" onClick={() => handleDelete(p.id)}>
                                                    <FaTrash />
                                                </button>
                                            </div>
                                        </td>
                                    </tr>
                                )
                            })}
                            {!isLoading && filteredPatients.length === 0 && (
                                <tr>
                                    <td colSpan="4" className="px-6 py-12 text-center text-slate-500">
                                        <div className="flex flex-col items-center justify-center">
                                            <FaUserInjured className="text-4xl text-slate-300 mb-3" />
                                            <p>{searchTerm ? 'Nenhum paciente encontrado para esta busca.' : 'Nenhum paciente encontrado no registro.'}</p>
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
                title={isViewing ? "Perfil do Paciente" : (editingId ? "Editar Paciente" : "Novo Paciente")}
            >
                {isViewing && currentPatient ? (
                    <div className="space-y-4">
                        <div className="flex items-center gap-4 p-4 bg-slate-50 border border-slate-100 rounded-xl relative overflow-hidden">
                            <img src={`https://ui-avatars.com/api/?name=${currentPatient.name.replace(/ /g, '+')}&background=random`} alt="Avatar" className="w-16 h-16 rounded-xl shadow-sm border border-white z-10" />
                            <div className="z-10">
                                <h3 className="text-lg font-bold text-slate-800">{currentPatient.name}</h3>
                                <span className={`inline-flex items-center px-2 py-0.5 mt-1 rounded text-xs font-semibold border ${getGenderStyle(currentPatient.gender)}`}>
                                    {currentPatient.gender}
                                </span>
                            </div>
                        </div>

                        <div className="bg-white border border-slate-100 rounded-xl divide-y divide-slate-100 overflow-hidden mt-6">
                            <div className="grid grid-cols-2">
                                <div className="p-4 border-r border-slate-100">
                                    <span className="block text-xs font-medium text-slate-400 uppercase tracking-wider mb-1">Data de Nascimento</span>
                                    <span className="text-sm font-semibold text-slate-800">{currentPatient.birth_date ? new Date(currentPatient.birth_date).toLocaleDateString() : 'N/A'}</span>
                                </div>
                                <div className="p-4">
                                    <span className="block text-xs font-medium text-slate-400 uppercase tracking-wider mb-1">Número do CPF</span>
                                    <span className="text-sm font-semibold text-slate-800">{currentPatient.cpf || 'N/A'}</span>
                                </div>
                            </div>
                            <div className="grid grid-cols-2">
                                <div className="p-4 border-r border-slate-100">
                                    <span className="block text-xs font-medium text-slate-400 uppercase tracking-wider mb-1">Número de Telefone</span>
                                    <span className="text-sm font-semibold text-slate-800">{currentPatient.number || 'N/A'}</span>
                                </div>
                                <div className="p-4">
                                    <span className="block text-xs font-medium text-slate-400 uppercase tracking-wider mb-1">Endereço de E-mail</span>
                                    <span className="text-sm font-semibold text-slate-800">{currentPatient.email || 'N/A'}</span>
                                </div>
                            </div>
                            <div className="p-4">
                                <span className="block text-xs font-medium text-slate-400 uppercase tracking-wider mb-1">Endereço Residencial</span>
                                <span className="text-sm font-semibold text-slate-800">
                                    {currentPatient.address ? `${currentPatient.address}` : 'Nenhum endereço fornecido'}
                                </span>
                                {(currentPatient.city || currentPatient.state || currentPatient.zip_code) && (
                                    <span className="block text-sm text-slate-500 mt-1">
                                        {[currentPatient.city, currentPatient.state, currentPatient.zip_code].filter(Boolean).join(' - ')}
                                    </span>
                                )}
                            </div>
                        </div>
                    </div>
                ) : (
                    <form onSubmit={handleSubmit} className="space-y-4">
                        {/* Personal Info */}
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                            <div className="sm:col-span-2">
                                <label>Nome Completo</label>
                                <input type="text" value={formData.name} onChange={e => setFormData({ ...formData, name: e.target.value })} required placeholder="Nome do Paciente" />
                            </div>
                            <div>
                                <label>CPF</label>
                                <input type="text" value={formData.cpf} onChange={e => setFormData({ ...formData, cpf: e.target.value })} placeholder="000.000.000-00" />
                            </div>
                            <div>
                                <label>Data de Nascimento</label>
                                <input type="date" value={formData.birth_date} onChange={e => setFormData({ ...formData, birth_date: e.target.value })} />
                            </div>
                            <div>
                                <label>Sexo</label>
                                <select value={formData.gender} onChange={e => setFormData({ ...formData, gender: e.target.value })}>
                                    <option value="Male">Masculino</option>
                                    <option value="Female">Feminino</option>
                                    <option value="Other">Outro</option>
                                </select>
                            </div>
                        </div>

                        {/* Contact Info */}
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2 border-t border-slate-100">
                             <div>
                                <label>Endereço de E-mail</label>
                                <input type="email" value={formData.email} onChange={e => setFormData({ ...formData, email: e.target.value })} placeholder="paciente@mail.com" />
                            </div>
                            <div>
                                <label>Número de Telefone</label>
                                <input type="tel" value={formData.number} onChange={e => setFormData({ ...formData, number: e.target.value })} required placeholder="(XX) XXXXX-XXXX" />
                            </div>
                        </div>

                        {/* Address Info */}
                         <div className="grid grid-cols-1 sm:grid-cols-4 gap-4 pt-2 border-t border-slate-100">
                            <div className="sm:col-span-4">
                                <label>Endereço <span className="text-xs text-slate-400 font-normal">(Rua/Avenida, Número, Complemento)</span></label>
                                <input type="text" value={formData.address} onChange={e => setFormData({ ...formData, address: e.target.value })} placeholder="Ex: Rua das Flores, 123" />
                            </div>
                            <div className="sm:col-span-2">
                                <label>Cidade</label>
                                <input type="text" value={formData.city} onChange={e => setFormData({ ...formData, city: e.target.value })} placeholder="São Paulo" />
                            </div>
                            <div>
                                <label>Estado / UF</label>
                                <input type="text" value={formData.state} onChange={e => setFormData({ ...formData, state: e.target.value })} placeholder="SP" maxLength={2} className="uppercase" />
                            </div>
                            <div>
                                <label>CEP</label>
                                <input type="text" value={formData.zip_code} onChange={e => setFormData({ ...formData, zip_code: e.target.value })} placeholder="00000-000" />
                            </div>
                        </div>

                        <div className="modal-footer pt-6 mt-6 border-t border-slate-100 flex justify-end gap-3 -mx-6 -mb-6 px-6 bg-slate-50 rounded-b-xl sticky bottom-0">
                            <button type="button" className="btn-secondary" onClick={() => setIsModalOpen(false)}>Cancelar</button>
                            <button type="submit" className="btn-primary" style={{ margin: 0 }}>{editingId ? "Salvar Alterações" : "Salvar Paciente"}</button>
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
        </div >
    );
};

export default PatientsPage;
