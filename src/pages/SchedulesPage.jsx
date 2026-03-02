import { useState, useEffect } from 'react';
import axios from '../api/axiosConfig';
import Modal from '../components/Modal';
import ConfirmModal from '../components/ConfirmModal';
import Select from 'react-select';
import { FaPlus, FaChevronLeft, FaChevronRight, FaCalendarCheck } from 'react-icons/fa';

const SchedulesPage = () => {
    const [currentDate, setCurrentDate] = useState(new Date());
    const [appointments, setAppointments] = useState([]);
    const [doctors, setDoctors] = useState([]);
    const [patients, setPatients] = useState([]);

    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editingId, setEditingId] = useState(null);
    const [formData, setFormData] = useState({ doctor_id: '', patient_id: '', date: '', notes: '' });
    const [confirmDialog, setConfirmDialog] = useState({ isOpen: false, title: '', message: '', type: 'primary', onConfirm: null });

    useEffect(() => {
        fetchData();
    }, [currentDate]);

    /**
     * API: Múltiplas Requisições GET Simultâneas p/ Estado Inicial do Calendário
     * 1. GET /appointments -> Retorna um array de { id, doctor_id, user_id, date: "AAAA-MM-DDTHH:mm" }
     * 2. GET /doctors -> Necessário pra mapear o doctor_id pro nome visual e a cor dele
     * 3. GET /patients -> Necessário pra mapear o user_id pro nome do paciente
     */
    const fetchData = async () => {
        try {
            const [appRes, docRes, patRes] = await Promise.all([
                axios.get('/appointments'),
                axios.get('/doctors'),
                axios.get('/patients')
            ]);
            setAppointments(appRes.data);
            setDoctors(docRes.data);
            setPatients(patRes.data);
        } catch (error) {
            console.error('Error fetching schedules data', error);
        }
    };

    const handlePrevMonth = () => {
        setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() - 1, 1));
    };

    const handleNextMonth = () => {
        setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 1));
    };

    const handleOpenCreate = () => {
        setEditingId(null);
        setFormData({ doctor_id: '', patient_id: '', date: '', notes: '' });
        setIsModalOpen(true);
    };

    const handleOpenEdit = (app) => {
        setEditingId(app.id);
        // Ensure date is formatted for datetime-local input YYYY-MM-DDTHH:mm
        const formattedDate = app.date ? new Date(app.date).toISOString().slice(0, 16) : '';
        setFormData({ doctor_id: app.doctor_id, patient_id: app.patient_id || app.user_id, date: formattedDate, notes: app.notes || '' });
        setIsModalOpen(true);
    };

    /**
     * API: DELETE /appointments/:id
     * Cancela e apaga um agendamento existente.
     * @param {string|number} id - O ID específico do agendamento a ser cancelado.
     */
    const handleDelete = (id) => {
        setConfirmDialog({
            isOpen: true,
            title: 'Cancelar Agendamento',
            message: 'Tem certeza que deseja cancelar esta consulta? O horário voltará a ficar disponível para o médico.',
            type: 'danger',
            onConfirm: async () => {
                try {
                    await axios.delete(`/appointments/${id}`);
                    setConfirmDialog(prev => ({ ...prev, isOpen: false }));
                    fetchData();
                } catch (error) {
                    alert('Erro ao cancelar agendamento');
                }
            }
        });
    };

    /**
     * API: Validação de Agendamento & Requisição POST
     * Este manipulador realiza checagens de segurança antes de disparar o POST para salvar.
     * 
     * Endpoints de Validação de Segurança (Caso existam na sua API):
     * - GET /doctors/:doctor_id/available -> Checa se o médico atende naqueles horários
     * - GET /doctors/:doctor_id/schedule?date=AAAA-MM-DD -> Checa se o médico já não tem consulta naquela exata hora
     * 
     * API Principal p/ Salvar: POST /appointments
     * Formato do Payload esperado: {
     *   "doctor_id": number,
     *   "user_id": number, // Este se refere ao ID do paciente
     *   "date": string // Formato definido pelo input datetime-local (ex: "2023-10-31T14:30")
     * }
     */
    const handleSubmit = (e) => {
        e.preventDefault();
        setConfirmDialog({
            isOpen: true,
            title: editingId ? 'Confirmar Reagendamento' : 'Confirmar Agendamento',
            message: editingId ? 'Tem certeza que deseja alterar os dados desta consulta?' : 'Deseja confirmar o agendamento desta consulta?',
            type: 'primary',
            onConfirm: async () => {
                try {
                    const appointmentDate = new Date(formData.date);
                    if (isNaN(appointmentDate)) {
                        alert('Data Inválida'); return;
                    }
                    const dayString = appointmentDate.toISOString().split('T')[0];
                    const scheduleRes = await axios.get(`/doctors/${formData.doctor_id}/schedule`).catch(() => ({ data: [] }));
                    const existing = scheduleRes.data || [];
                    const reqTime = appointmentDate.getTime();

                    // Allow skipping conflict check if editing the same record on same time
                    const conflict = existing.find(apt => new Date(apt.date).getTime() === reqTime && String(apt.id) !== String(editingId));
                    if (conflict) {
                        alert('O Médico já possui uma consulta marcada exatamente neste horário.'); return;
                    }

                    if (editingId) {
                        await axios.put(`/appointments/${editingId}`, {
                            doctor_id: Number(formData.doctor_id),
                            patient_id: Number(formData.patient_id),
                            date: formData.date,
                            notes: formData.notes
                        });
                    } else {
                        await axios.post('/appointments', {
                            doctor_id: Number(formData.doctor_id),
                            patient_id: Number(formData.patient_id),
                            date: formData.date,
                            notes: formData.notes
                        });
                    }
                    setConfirmDialog(prev => ({ ...prev, isOpen: false }));
                    setIsModalOpen(false);
                    fetchData();
                } catch (error) {
                    alert(error.response?.data?.error || 'Erro ao processar agendamento');
                }
            }
        });
    };

    /**
     * Algoritmos Matemáticos do Calendário
     * Calcula o espaço vazio antes do primeiro dia do mês para alinhar a grade Tailwind.
     */
    const year = currentDate.getFullYear();
    const month = currentDate.getMonth();
    const monthNames = ["Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho", "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro"];

    // getDay() retorna 0 pra Domingo, 1 pra Seg., etc. Representa as caixas em branco antes do dia 1.
    const firstDay = new Date(year, month, 1).getDay();

    // O dia 0 do PRÓXIMO mês nos dá o último dia (total de dias) do mês ATUAL.
    const daysInMonth = new Date(year, month + 1, 0).getDate();

    // Arrays usados pro mapa de renderização da grade CSS Tailwind
    const emptyCells = Array.from({ length: firstDay });
    const dayCells = Array.from({ length: daysInMonth }, (_, i) => i + 1);

    return (
        <div className="space-y-6 animate-in slide-in-from-bottom-4 duration-500 fade-in h-4/5 flex flex-col">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-2">
                <div>
                    <h2 className="text-2xl font-bold text-slate-800 tracking-tight">Calendário Médico</h2>
                    <p className="text-sm text-slate-500 mt-1">Gerencie a disponibilidade médica e marque consultas.</p>
                </div>

                <div className="flex items-center gap-4 bg-white px-2 py-1.5 rounded-xl border border-slate-200 shadow-sm">
                    <button className="p-2 hover:bg-slate-100 rounded-lg text-slate-600 transition-colors" onClick={handlePrevMonth}><FaChevronLeft className="text-sm" /></button>
                    <h3 className="w-32 text-center font-bold text-slate-800">{monthNames[month]} {year}</h3>
                    <button className="p-2 hover:bg-slate-100 rounded-lg text-slate-600 transition-colors" onClick={handleNextMonth}><FaChevronRight className="text-sm" /></button>

                    <div className="w-px h-6 bg-slate-200 mx-2"></div>

                    <button className="btn-primary py-1.5" onClick={handleOpenCreate}>
                        <FaPlus className="text-sm" /> Consulta
                    </button>
                </div>
            </div>

            <div className="bg-white rounded-2xl shadow-sm shadow-slate-200/50 border border-slate-100 flex-1 flex flex-col overflow-hidden min-h-[600px]">
                {/* Days Header */}
                <div className="grid grid-cols-7 border-b border-slate-200 bg-slate-50">
                    {['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'].map(d => (
                        <div key={d} className="px-2 py-3 text-center text-xs font-bold text-slate-500 uppercase tracking-wider">
                            {d}
                        </div>
                    ))}
                </div>

                {/* Calendar Grid */}
                <div className="flex-1 grid grid-cols-7 grid-rows-5 bg-slate-200 gap-px pb-px pr-px pl-px border-b border-slate-200">
                    {emptyCells.map((_, i) => (
                        <div key={`empty-${i}`} className="bg-slate-50/50 min-h-[120px]"></div>
                    ))}

                    {dayCells.map(day => {
                        const dayApps = appointments.filter(app => {
                            if (!app.date) return false;
                            const d = new Date(app.date);
                            if (isNaN(d)) return false;
                            return d.getFullYear() === year && d.getMonth() === month && d.getDate() === day;
                        });

                        const isToday = day === new Date().getDate() && month === new Date().getMonth() && year === new Date().getFullYear();

                        return (
                            <div key={day} className={`bg-white min-h-[120px] p-2 flex flex-col group transition-colors hover:bg-slate-50/50 overflow-hidden relative ${isToday ? 'bg-primary/5' : ''}`}>
                                <span className={`inline-flex items-center justify-center w-7 h-7 text-sm font-semibold mb-2 rounded-full ${isToday ? 'bg-primary text-white shadow-md' : 'text-slate-500 group-hover:text-primary group-hover:bg-primary/10 transition-colors'}`}>
                                    {day}
                                </span>

                                <div className="flex-1 overflow-y-auto custom-scrollbar space-y-1 pr-1">
                                    {dayApps.map(app => {
                                        const doc = doctors.find(d => d.id === app.doctor_id);
                                        const patId = app.patient_id || app.user_id;
                                        const pat = patients.find(p => p.id === patId) || { name: `Pat ${patId}` };
                                        const docName = doc ? `Dr. ${doc.name.split(' ')[0]}` : `Doc ${app.doctor_id}`;

                                        const t = new Date(app.date);
                                        const timeStr = isNaN(t) ? '' : `${String(t.getHours()).padStart(2, '0')}:${String(t.getMinutes()).padStart(2, '0')}`;

                                        // Slightly darken the hex code for border mapping using opacity overlay approach
                                        return (
                                            <div
                                                key={app.id}
                                                className="text-[11px] leading-tight px-2 py-1.5 rounded border-l-4 border-b border-t border-r cursor-pointer hover:opacity-90 transition-opacity truncate font-medium shadow-sm relative overflow-hidden group/item"
                                                style={{
                                                    borderLeftColor: doc?.color || '#6c5be4',
                                                    borderTopColor: 'transparent', borderRightColor: 'transparent', borderBottomColor: 'transparent',
                                                    backgroundColor: `${doc?.color}15` || '#f1f5f9', // 15% opacity hex native workaround or solid light
                                                    color: '#334155'
                                                }}
                                                onClick={() => handleOpenEdit(app)}
                                                title="Clique para editar ou cancelar a consulta"
                                            >
                                                <span className="font-bold opacity-80" style={{ color: doc?.color }}>{timeStr}</span> {docName} <span className="opacity-70">({pat.name.split(' ')[0]})</span>
                                            </div>
                                        );
                                    })}
                                </div>
                            </div>
                        );
                    })}
                </div>
            </div>

            <Modal
                isOpen={isModalOpen}
                onClose={() => setIsModalOpen(false)}
                title={editingId ? "Editar Consulta" : "Agendar Nova Consulta"}
            >
                <form onSubmit={handleSubmit} className="space-y-5">
                    <div className="bg-primary/5 p-4 rounded-xl border border-primary/20 flex gap-4 items-center mb-6">
                        <div className="bg-white p-3 rounded-lg shadow-sm text-primary">
                            <FaCalendarCheck className="text-2xl" />
                        </div>
                        <div>
                            <h4 className="font-bold text-primary-dark">Motor de Agendamento</h4>
                            <p className="text-xs text-primary/80">Selecione médico, paciente e slot de tempo (horário).</p>
                        </div>
                    </div>

                    <div>
                        <label>Médico Responsável</label>
                        <select className="form-control font-medium" required value={formData.doctor_id} onChange={e => setFormData({ ...formData, doctor_id: e.target.value })}>
                            <option value="">Selecione um médico da lista...</option>
                            {doctors.map(d => <option key={d.id} value={d.id}>Dr. {d.name} ({d.specialty})</option>)}
                        </select>
                    </div>
                    <div>
                        <label>Registro do Paciente</label>
                        <Select
                            options={patients.map(p => ({ value: p.id, label: p.name }))}
                            value={formData.patient_id ? { value: formData.patient_id, label: patients.find(p => p.id === formData.patient_id)?.name } : null}
                            onChange={(selected) => setFormData({ ...formData, patient_id: selected ? selected.value : '' })}
                            placeholder="Pesquise pelo nome do paciente..."
                            className="text-sm font-medium"
                            styles={{
                                control: (base) => ({
                                    ...base,
                                    borderColor: '#e2e8f0',
                                    borderRadius: '0.5rem',
                                    padding: '2px',
                                    boxShadow: 'none',
                                    '&:hover': {
                                        borderColor: '#6366f1'
                                    }
                                })
                            }}
                            isClearable
                            required
                        />
                    </div>
                    <div>
                        <label>Motivo da Consulta / Observações (Opcional)</label>
                        <textarea
                            className="form-control resize-none"
                            rows="2"
                            placeholder="Detalhes sobre a consulta..."
                            value={formData.notes}
                            onChange={e => setFormData({ ...formData, notes: e.target.value })}
                        ></textarea>
                    </div>
                    <div>
                        <label>Data e Horário (Slot)</label>
                        <input type="datetime-local" className="form-control" required value={formData.date} onChange={e => setFormData({ ...formData, date: e.target.value })} />
                    </div>

                    <div className="modal-footer flex items-center pt-6 mt-6 border-t border-slate-100 -mx-6 -mb-6 px-6 bg-slate-50 rounded-b-xl gap-3">
                        {editingId && (
                            <button type="button" className="btn-danger mr-auto" onClick={() => handleDelete(editingId)}>Cancelar Consulta</button>
                        )}
                        <div className="flex gap-3 justify-end flex-1">
                            <button type="button" className="btn-secondary" onClick={() => setIsModalOpen(false)}>Cancelar</button>
                            <button type="submit" className="btn-primary" style={{ margin: 0 }}>{editingId ? "Salvar Alterações" : "Confirmar Agendamento"}</button>
                        </div>
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

export default SchedulesPage;
