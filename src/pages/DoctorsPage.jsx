import { useState, useEffect } from 'react';
import axios from '../api/axiosConfig';
import Modal from '../components/Modal';
import ConfirmModal from '../components/ConfirmModal';
import { FaPlus, FaEye, FaTrash, FaUserMd, FaEdit, FaCalendarAlt } from 'react-icons/fa';

const DoctorsPage = () => {
    /**
     * Definições de Estado Local
     * @property {Array} doctors - Armazena a lista de médicos buscada da API.
     * @property {boolean} isModalOpen - Controla a visibilidade do modal genérico de Criar/Visualizar.
     * @property {boolean} isViewing - Flag para determinar se o modal está em modo "Somente Leitura" (perfil) ou "Edição" (novo cadastro).
     * @property {Object} currentDoctor - Armazena os dados detalhados do médico atualmente selecionado para visualização.
     * @property {Object} formData - Gerencia os inputs controlados para o formulário de cadastro de novo médico.
     */
    const [doctors, setDoctors] = useState([]);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [isViewing, setIsViewing] = useState(false);
    const [currentDoctor, setCurrentDoctor] = useState(null);
    const [editingId, setEditingId] = useState(null);
    const [formData, setFormData] = useState({ name: '', email: '', crm: '', specialty: '', color: '#6c5be4', bio: '' });
    const [confirmDialog, setConfirmDialog] = useState({ isOpen: false, title: '', message: '', type: 'primary', onConfirm: null });

    // Schedule Management State
    const [isScheduleModalOpen, setIsScheduleModalOpen] = useState(false);
    const [isEditingSchedule, setIsEditingSchedule] = useState(false);
    const [scheduleDoctorId, setScheduleDoctorId] = useState(null);
    const [schedulesData, setSchedulesData] = useState([]);
    const [successMessage, setSuccessMessage] = useState('');

    /**
     * Hook de Busca de Dados Inicial
     * Dispara fetchDoctors() uma única vez quando o componente é montado na tela.
     */
    useEffect(() => {
        fetchDoctors();
    }, []);

    /**
     * API: GET /doctors
     * Recupera a lista principal de todos os profissionais médicos.
     * Array de Resposta Esperado: [{ id, name, specialty, crm, color, created_at, ... }]
     */
    const fetchDoctors = async () => {
        try {
            const res = await axios.get('/doctors');
            setDoctors(res.data);
        } catch (error) {
            console.error('Fetch doctors error:', error);
            alert('Error fetching doctors: ' + (error.message || 'Unknown error'));
        }
    };

    const handleOpenCreate = () => {
        setIsViewing(false);
        setEditingId(null);
        setCurrentDoctor(null);
        setFormData({ name: '', email: '', crm: '', specialty: '', color: '#6c5be4', bio: '' });
        setIsModalOpen(true);
    };

    const handleOpenEdit = (doc) => {
        setIsViewing(false);
        setEditingId(doc.id);
        setCurrentDoctor(null);
        setFormData({ name: doc.name, email: doc.email || '', crm: doc.crm, specialty: doc.specialty, color: doc.color, bio: doc.bio || '' });
        setIsModalOpen(true);
    };

    /**
     * API: GET /doctors/:id
     * Busca os detalhes de exatamente um médico para preencher o Modal de Visualização de Perfil.
     * @param {string|number} id - ID do médico alvo
     */
    const handleOpenView = async (id) => {
        try {
            const res = await axios.get(`/doctors/${id}`);
            setCurrentDoctor(res.data);
            setIsViewing(true);
            setIsModalOpen(true);
        } catch (error) {
            alert('Error loading profile');
        }
    };

    /**
     * Schedule Management Functions
     */
    const handleOpenSchedule = async (doctorId) => {
        setScheduleDoctorId(doctorId);
        try {
            const res = await axios.get(`/doctors/${doctorId}/schedule`);
            const existingSchedules = res.data || [];

            // Agrupar horários idênticos de dias diferentes numa mesma "linha" visual
            const grouped = [];
            existingSchedules.forEach(sched => {
                const match = grouped.find(g => g.start_time === sched.start_time && g.end_time === sched.end_time);
                if (match) {
                    if (!match.days_of_week.includes(sched.day_of_week)) {
                        match.days_of_week.push(sched.day_of_week);
                    }
                } else {
                    grouped.push({
                        days_of_week: [sched.day_of_week],
                        start_time: sched.start_time,
                        end_time: sched.end_time
                    });
                }
            });

            if (grouped.length === 0) {
                setSchedulesData([{ days_of_week: [1], start_time: '08:00', end_time: '18:00' }]);
                setIsEditingSchedule(true);
            } else {
                // Ordenar por hora e dps dia (opcional, só visual)
                setSchedulesData(grouped);
                setIsEditingSchedule(false);
            }
            setIsScheduleModalOpen(true);
        } catch (error) {
            console.error(error);
            alert('Não foi possível carregar os horários. Iniciando form vazio.');
            setSchedulesData([{ days_of_week: [1], start_time: '08:00', end_time: '18:00' }]);
            setIsEditingSchedule(true);
            setIsScheduleModalOpen(true);
        }
    };

    const handleAddScheduleRow = () => {
        setSchedulesData([...schedulesData, { days_of_week: [], start_time: '', end_time: '' }]);
    };

    const handleRemoveScheduleRow = (index) => {
        const updated = [...schedulesData];
        updated.splice(index, 1);
        setSchedulesData(updated);
    };

    const handleScheduleChange = (index, field, value) => {
        const updated = [...schedulesData];
        updated[index][field] = value;
        setSchedulesData(updated);
    };

    const toggleDaySelection = (index, dayNum) => {
        const updated = [...schedulesData];
        const days = updated[index].days_of_week;
        if (days.includes(dayNum)) {
            updated[index].days_of_week = days.filter(d => d !== dayNum);
        } else {
            updated[index].days_of_week = [...days, dayNum];
        }
        setSchedulesData(updated);
    };

    const handleSaveSchedule = async (e) => {
        e.preventDefault();
        try {
            // Desachatar: Quebrar um { days_of_week: [1,2], start: X, end: Y } em múltiplos { day_of_week: 1, start: X, end: Y }
            const flattenedPayload = [];
            schedulesData.forEach(group => {
                group.days_of_week.forEach(dayNum => {
                    flattenedPayload.push({
                        day_of_week: dayNum,
                        start_time: group.start_time,
                        end_time: group.end_time
                    });
                });
            });

            await axios.post(`/doctors/${scheduleDoctorId}/schedule`, {
                schedules: flattenedPayload
            });
            setSuccessMessage('Horários de atendimento salvos com sucesso!');
            setTimeout(() => setSuccessMessage(''), 3000);
            setIsEditingSchedule(false);

            // Re-fetch automatically to update grouping
            handleOpenSchedule(scheduleDoctorId);

        } catch (error) {
            console.error(error);
            alert(`Erro ao vincular horários: ${error.response?.data?.message || 'Erro desconhecido'}`);
        }
    };

    /**
     * API: DELETE /doctors/:id
     * Remove um médico do sistema.
     * @param {string|number} id - ID do médico alvo a ser deletado
     */
    const handleDelete = (id) => {
        setConfirmDialog({
            isOpen: true,
            title: 'Confirmar Exclusão',
            message: 'Tem certeza que deseja excluir este médico permanentemente? Esta ação não pode ser desfeita.',
            type: 'danger',
            onConfirm: async () => {
                try {
                    await axios.delete(`/doctors/${id}`);
                    setConfirmDialog(prev => ({ ...prev, isOpen: false }));
                    fetchDoctors();
                } catch (error) {
                    alert('Erro ao excluir médico');
                }
            }
        });
    };

    /**
     * API: POST /doctors
     * Cria um novo médico no diretório.
     * Payload (Corpo da Requisição) compatível com `formData`:
     * {
     *   "name": string (ex: 'João Silva'),
     *   "email": string (ex: 'dr.joao@clinica.com'),
     *   "specialty": string (ex: 'Cardiologia'),
     *   "crm": string (ex: '12345-SP'),
     *   "color": string (formato hex ex: '#ff0000'),
     *   "bio": string (opcional)
     * }
     */
    const handleSubmit = (e) => {
        e.preventDefault();
        setConfirmDialog({
            isOpen: true,
            title: editingId ? 'Confirmar Edição' : 'Confirmar Criação',
            message: editingId ? 'Tem certeza que deseja salvar estas alterações?' : 'Tem certeza que deseja registrar este novo médico?',
            type: 'primary',
            onConfirm: async () => {
                try {
                    if (editingId) {
                        await axios.put(`/doctors/${editingId}`, formData);
                    } else {
                        await axios.post('/doctors', formData);
                    }
                    setConfirmDialog(prev => ({ ...prev, isOpen: false }));
                    setIsModalOpen(false);
                    fetchDoctors();
                } catch (error) {
                    alert('Erro ao salvar médico');
                }
            }
        });
    };

    return (
        <div className="space-y-6 animate-in slide-in-from-bottom-4 duration-500 fade-in">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-2">
                <div>
                    <h2 className="text-2xl font-bold text-slate-800 tracking-tight">Equipe Médica</h2>
                    <p className="text-sm text-slate-500 mt-1">Gerencie médicos, especialidades e cores de agendamento.</p>
                </div>
                <button className="btn-primary" onClick={handleOpenCreate}>
                    <FaPlus className="text-sm" /> Novo Médico
                </button>
            </div>

            <div className="bg-white rounded-2xl shadow-sm shadow-slate-200/50 border border-slate-100 overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse">
                        <thead>
                            <tr className="bg-slate-50/80 border-b border-slate-200 text-slate-500 text-xs uppercase tracking-wider font-semibold">
                                <th className="px-6 py-4 w-16 text-center">Cor</th>
                                <th className="px-6 py-4">Profissional</th>
                                <th className="px-6 py-4">Especialidade</th>
                                <th className="px-6 py-4">CRM</th>
                                <th className="px-6 py-4 text-right">Ações</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                            {doctors.map((d) => (
                                <tr key={d.id} className="hover:bg-slate-50/50 transition-colors group">
                                    <td className="px-6 py-4 relative">
                                        <div className="absolute inset-y-0 left-0 w-1 rounded-r-md" style={{ backgroundColor: d.color }}></div>
                                        <div className="flex justify-center">
                                            <div className="w-8 h-8 rounded-lg shadow-sm flex items-center justify-center text-white" style={{ backgroundColor: d.color }}>
                                                <FaUserMd className="opacity-80" />
                                            </div>
                                        </div>
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap">
                                        <div className="text-sm font-semibold text-slate-800">Dr. {d.name.replace('Dr. ', '')}</div>
                                        <div className="text-xs text-slate-500">Cadastrado em {new Date(d.created_at).toLocaleDateString()}</div>
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap">
                                        <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold bg-primary/10 text-primary border border-primary/20">
                                            {d.specialty}
                                        </span>
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap font-mono text-sm text-slate-600">
                                        {d.crm}
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                                        <div className="flex justify-end gap-2 transition-opacity">
                                            <button className="p-2 text-slate-400 hover:text-indigo-500 hover:bg-indigo-50 rounded-lg transition-colors" title="Gerenciar Horários" onClick={() => handleOpenSchedule(d.id)}>
                                                <FaCalendarAlt />
                                            </button>
                                            <button className="p-2 text-slate-400 hover:text-primary hover:bg-primary/5 rounded-lg transition-colors" title="Visualizar Perfil" onClick={() => handleOpenView(d.id)}>
                                                <FaEye />
                                            </button>
                                            <button className="p-2 text-slate-400 hover:text-warning hover:bg-warning/5 rounded-lg transition-colors" title="Editar" onClick={() => handleOpenEdit(d)}>
                                                <FaEdit />
                                            </button>
                                            <button className="p-2 text-slate-400 hover:text-danger hover:bg-danger/5 rounded-lg transition-colors" title="Excluir" onClick={() => handleDelete(d.id)}>
                                                <FaTrash />
                                            </button>
                                        </div>
                                    </td>
                                </tr>
                            ))}
                            {doctors.length === 0 && (
                                <tr>
                                    <td colSpan="5" className="px-6 py-12 text-center text-slate-500">
                                        <div className="flex flex-col items-center justify-center">
                                            <FaUserMd className="text-4xl text-slate-300 mb-3" />
                                            <p>Nenhum médico encontrado no diretório.</p>
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
                title={isViewing ? "Perfil do Médico" : (editingId ? "Editar Médico" : "Registrar Novo Médico")}
            >
                {isViewing && currentDoctor ? (
                    <div className="space-y-6">
                        <div className="flex flex-col items-center p-6 bg-slate-50 border border-slate-100 rounded-xl relative overflow-hidden">
                            <div className="absolute top-0 left-0 w-full h-2" style={{ backgroundColor: currentDoctor.color }}></div>
                            <div className="absolute -right-8 -top-8 w-32 h-32 rounded-full opacity-10" style={{ backgroundColor: currentDoctor.color }}></div>

                            <img src={`https://ui-avatars.com/api/?name=${currentDoctor.name.replace(/ /g, '+')}&background=${currentDoctor.color.replace('#', '')}&color=fff&size=128`} className="w-24 h-24 rounded-full shadow-md border-4 border-white z-10" alt="Avatar" />
                            <h3 className="mt-4 text-xl font-bold text-slate-800 z-10">Dr. {currentDoctor.name.replace('Dr. ', '')}</h3>
                            <p className="text-sm text-slate-500 z-10">CRM: {currentDoctor.crm}</p>
                            <span className="mt-3 inline-flex items-center px-4 py-1.5 rounded-full text-xs font-bold uppercase tracking-wide bg-white border shadow-sm z-10" style={{ color: currentDoctor.color, borderColor: currentDoctor.color }}>
                                {currentDoctor.specialty}
                            </span>
                        </div>

                        <div className="bg-white border border-slate-100 rounded-xl divide-y divide-slate-100">
                            {currentDoctor.email && (
                                <div className="flex justify-between p-4">
                                    <span className="text-sm font-medium text-slate-500">E-mail de Contato</span>
                                    <span className="text-sm font-semibold text-slate-800">{currentDoctor.email}</span>
                                </div>
                            )}
                            {currentDoctor.bio && (
                                <div className="flex flex-col p-4">
                                    <span className="text-sm font-medium text-slate-500 mb-2">Biografia Profissional</span>
                                    <p className="text-sm text-slate-700 leading-relaxed bg-slate-50 p-3 rounded-lg border border-slate-100">{currentDoctor.bio}</p>
                                </div>
                            )}
                            <div className="flex justify-between p-4">
                                <span className="text-sm font-medium text-slate-500">Cor na Agenda</span>
                                <div className="flex items-center gap-2">
                                    <span className="text-sm font-semibold text-slate-800 uppercase">{currentDoctor.color}</span>
                                    <div className="w-4 h-4 rounded-md shadow-inner" style={{ backgroundColor: currentDoctor.color }}></div>
                                </div>
                            </div>
                            <div className="flex justify-between p-4">
                                <span className="text-sm font-medium text-slate-500">Data de Cadastro</span>
                                <span className="text-sm font-semibold text-slate-800">{new Date(currentDoctor.created_at).toLocaleString()}</span>
                            </div>
                        </div>
                    </div>
                ) : (
                    <form onSubmit={handleSubmit} className="space-y-5">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div>
                                <label>Nome Completo</label>
                                <input type="text" value={formData.name} onChange={e => setFormData({ ...formData, name: e.target.value })} required placeholder="João Silva" />
                            </div>
                            <div>
                                <label>E-mail do Profissional</label>
                                <input type="email" value={formData.email} onChange={e => setFormData({ ...formData, email: e.target.value })} required placeholder="medico@clinica.com" />
                            </div>
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <label>Especialidade</label>
                                <input type="text" value={formData.specialty} onChange={e => setFormData({ ...formData, specialty: e.target.value })} required placeholder="Cardiologia" />
                            </div>
                            <div>
                                <label>Registro CRM</label>
                                <input type="text" value={formData.crm} onChange={e => setFormData({ ...formData, crm: e.target.value })} required placeholder="000000-UF" />
                            </div>
                        </div>
                        <div>
                            <label>Cor Identificadora na Agenda</label>
                            <div className="flex gap-3">
                                <input type="color" value={formData.color} onChange={e => setFormData({ ...formData, color: e.target.value })} className="h-10 w-16 rounded cursor-pointer border-0 p-0" />
                                <input type="text" value={formData.color} onChange={e => setFormData({ ...formData, color: e.target.value })} className="flex-1 font-mono uppercase" placeholder="#HEXCODE" />
                            </div>
                        </div>
                        <div>
                            <label>Biografia Profissional <span className="text-xs text-slate-400 font-normal">(Opcional)</span></label>
                            <textarea value={formData.bio} onChange={e => setFormData({ ...formData, bio: e.target.value })} className="form-control resize-none" rows="3" placeholder="Breve descrição profissional..."></textarea>
                        </div>
                        <div className="modal-footer pt-6 mt-6 border-t border-slate-100 flex justify-end gap-3 -mx-6 -mb-6 px-6 bg-slate-50 rounded-b-xl">
                            <button type="button" className="btn-secondary" onClick={() => setIsModalOpen(false)}>Cancelar</button>
                            <button type="submit" className="btn-primary" style={{ margin: 0 }}>{editingId ? "Salvar Alterações" : "Salvar Médico"}</button>
                        </div>
                    </form>
                )}
            </Modal>

            {/* Schedule Management Modal */}
            <Modal
                isOpen={isScheduleModalOpen}
                onClose={() => { setIsScheduleModalOpen(false); setSuccessMessage(''); }}
                title={isEditingSchedule ? "Configurar Horários de Atendimento" : "Horários de Atendimento"}
                size="large"
            >
                {successMessage && (
                    <div className="mb-6 p-4 rounded-xl bg-emerald-50 border border-emerald-100 flex items-center gap-3 animate-in fade-in slide-in-from-top-2">
                        <div className="w-8 h-8 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center shrink-0">
                            <span className="text-sm font-bold">✓</span>
                        </div>
                        <p className="text-emerald-700 text-sm font-medium">{successMessage}</p>
                    </div>
                )}
                {!isEditingSchedule ? (
                    <div className="space-y-4">
                        <div className="flex justify-between items-center mb-4">
                            <p className="text-sm text-slate-500">Horários configurados para este profissional.</p>
                            <button type="button" onClick={() => setIsEditingSchedule(true)} className="btn-secondary text-sm py-1.5 flex items-center gap-2">
                                <FaEdit className="text-xs" /> Editar Horários
                            </button>
                        </div>
                        <div className="space-y-3">
                            {schedulesData.map((sched, index) => (
                                <div key={index} className="flex flex-col sm:flex-row justify-between items-start sm:items-center p-4 bg-white border border-slate-200 rounded-xl shadow-sm">
                                    <div className="flex flex-wrap gap-2 mb-3 sm:mb-0">
                                        {['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'].map((dayName, dIdx) => {
                                            if (!sched.days_of_week.includes(dIdx)) return null;
                                            return (
                                                <span key={dIdx} className="px-2.5 py-1 bg-indigo-50 text-indigo-700 font-semibold text-xs rounded-md border border-indigo-100">
                                                    {dayName}
                                                </span>
                                            );
                                        })}
                                    </div>
                                    <div className="flex items-center gap-3 text-sm font-medium text-slate-700 bg-slate-50 px-4 py-2 rounded-lg border border-slate-100">
                                        <span>{sched.start_time}</span>
                                        <span className="text-slate-400">às</span>
                                        <span>{sched.end_time}</span>
                                    </div>
                                </div>
                            ))}
                        </div>
                        <div className="modal-footer pt-6 mt-6 border-t border-slate-100 flex justify-end gap-3 -mx-6 -mb-6 px-6 bg-slate-50 rounded-b-xl">
                            <button type="button" className="btn-primary" onClick={() => setIsScheduleModalOpen(false)}>Fechar Janela</button>
                        </div>
                    </div>
                ) : (
                    <form onSubmit={handleSaveSchedule} className="space-y-4">
                        <p className="text-sm text-slate-500 mb-4">Adicione os dias e as faixas de horário em que este médico estará disponível na clínica.</p>

                        <div className="space-y-3 max-h-[60vh] overflow-y-auto px-1">
                            {schedulesData.map((sched, index) => (
                                <div key={index} className="flex flex-col items-start gap-4 p-4 bg-slate-50 border border-slate-200 rounded-xl relative group">
                                    <div className="w-full">
                                        <label className="text-xs mb-1 block font-medium">Dias da Semana <span className="text-slate-400 font-normal">(Multipos)</span></label>
                                        <div className="flex flex-wrap gap-2">
                                            {['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'].map((dayName, dIdx) => (
                                                <button
                                                    key={dIdx}
                                                    type="button"
                                                    onClick={() => toggleDaySelection(index, dIdx)}
                                                    className={`px-3 py-1.5 rounded-md text-sm font-medium transition-colors border ${sched.days_of_week.includes(dIdx)
                                                        ? 'bg-primary text-white border-primary shadow-sm'
                                                        : 'bg-white text-slate-500 border-slate-200 hover:bg-slate-100'
                                                        }`}
                                                >
                                                    {dayName}
                                                </button>
                                            ))}
                                        </div>
                                    </div>

                                    <div className="flex w-full gap-4">
                                        <div className="w-1/2 sm:w-1/3">
                                            <label className="text-xs">Horário Início</label>
                                            <input
                                                type="time"
                                                value={sched.start_time}
                                                onChange={(e) => handleScheduleChange(index, 'start_time', e.target.value)}
                                                className="py-1.5"
                                                required
                                            />
                                        </div>
                                        <div className="w-1/2 sm:w-1/3">
                                            <label className="text-xs">Horário Término</label>
                                            <input
                                                type="time"
                                                value={sched.end_time}
                                                onChange={(e) => handleScheduleChange(index, 'end_time', e.target.value)}
                                                className="py-1.5"
                                                required
                                            />
                                        </div>
                                    </div>

                                    {schedulesData.length > 1 && (
                                        <button
                                            type="button"
                                            onClick={() => handleRemoveScheduleRow(index)}
                                            className="absolute right-3 top-3 text-red-400 hover:text-red-600 hover:bg-red-50 p-2 rounded-lg transition-colors"
                                            title="Remover Turno"
                                        >
                                            <FaTrash />
                                        </button>
                                    )}
                                </div>
                            ))}
                        </div>

                        <div className="flex justify-center mt-2">
                            <button type="button" onClick={handleAddScheduleRow} className="btn-secondary text-sm py-1.5">
                                <FaPlus className="text-xs mr-2" /> Adicionar Turno Extra
                            </button>
                        </div>

                        <div className="modal-footer pt-6 mt-6 border-t border-slate-100 flex justify-end gap-3 -mx-6 -mb-6 px-6 bg-slate-50 rounded-b-xl">
                            <button type="button" className="btn-secondary" onClick={() => setIsEditingSchedule(false)}>Cancelar Edição</button>
                            <button type="submit" className="btn-primary" style={{ margin: 0 }}>Vincular Horários</button>
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

export default DoctorsPage;
