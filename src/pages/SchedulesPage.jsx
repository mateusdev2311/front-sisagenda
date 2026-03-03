import { useState, useEffect } from 'react';
import axios from '../api/axiosConfig';
import Modal from '../components/Modal';
import ConfirmModal from '../components/ConfirmModal';
import Select from 'react-select';
import { FaPlus, FaChevronLeft, FaChevronRight, FaCalendarCheck } from 'react-icons/fa';
import { Calendar, dateFnsLocalizer } from 'react-big-calendar';
import format from 'date-fns/format';
import parse from 'date-fns/parse';
import startOfWeek from 'date-fns/startOfWeek';
import getDay from 'date-fns/getDay';
import ptBR from 'date-fns/locale/pt-BR';
import 'react-big-calendar/lib/css/react-big-calendar.css';
import '../assets/css/calendar-overrides.css'; // Optional: Custom styling for BigCalendar

const locales = {
    'pt-BR': ptBR,
};

const localizer = dateFnsLocalizer({
    format,
    parse,
    startOfWeek,
    getDay,
    locales,
});

const SchedulesPage = () => {
    const [currentDate, setCurrentDate] = useState(new Date());
    const [view, setView] = useState('month');
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
        // Now handled natively by BigCalendar's Toolbar, but kept if we need external control.
        setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() - 1, 1));
    };

    const handleNextMonth = () => {
        setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 1));
    };

    /**
     * Helper para Mapear Agendamentos em "Eventos" da Biblioteca
     */
    const getCalendarEvents = () => {
        return appointments.map(app => {
            const doc = doctors.find(d => d.id === app.doctor_id);
            const pat = patients.find(p => p.id === (app.patient_id || app.user_id)) || { name: 'Paciente' };

            const startDate = new Date(app.date);
            // Defaulting appointment duration to 1 hora (since we don't have end_time yet in API)
            const endDate = new Date(startDate.getTime() + 60 * 60 * 1000);

            return {
                id: app.id,
                title: `${pat.name.split(' ')[0]} c/ Dr. ${doc?.name.split(' ')[0] || ''}`,
                start: startDate,
                end: endDate,
                resource: app, // Cópia completa para usar no OnClick/Editar
                bgColor: doc?.color || '#6c5be4'
            };
        });
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
     * Mapeamento de Cores Nativas do Médico no BigCalendar
     */
    const eventPropGetter = (event) => {
        return {
            style: {
                backgroundColor: event.bgColor,
                border: `1px solid ${event.bgColor}`,
                borderRadius: '6px',
                opacity: 0.9,
                color: 'white',
                borderLeft: '4px solid rgba(0,0,0,0.2)',
                display: 'block',
                fontWeight: '600',
                fontSize: '12px'
            }
        };
    };

    return (
        <div className="space-y-6 animate-in slide-in-from-bottom-4 duration-500 fade-in h-full flex flex-col">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-2">
                <div>
                    <h2 className="text-2xl font-bold text-slate-800 tracking-tight">Calendário Médico</h2>
                    <p className="text-sm text-slate-500 mt-1">Gerencie a disponibilidade médica e marque consultas com arrastar e soltar (Drag-and-Drop).</p>
                </div>

                <div className="flex items-center gap-4 bg-white px-2 py-1.5 rounded-xl border border-slate-200 shadow-sm">
                    <button className="btn-primary py-1.5" onClick={handleOpenCreate}>
                        <FaPlus className="text-sm" /> Nova Consulta
                    </button>
                </div>
            </div>

            <div className="bg-white rounded-2xl shadow-sm shadow-slate-200/50 border border-slate-100 flex-1 flex flex-col p-4 lg:p-6 min-h-[650px] overflow-hidden">
                <Calendar
                    localizer={localizer}
                    events={getCalendarEvents()}
                    date={currentDate}
                    onNavigate={(newDate) => setCurrentDate(newDate)}
                    view={view}
                    onView={(newView) => setView(newView)}
                    startAccessor="start"
                    endAccessor="end"
                    style={{ height: '100%' }}
                    culture="pt-BR"
                    messages={{
                        next: "Próximo",
                        previous: "Anterior",
                        today: "Hoje",
                        month: "Mês",
                        week: "Semana",
                        day: "Dia",
                        agenda: "Lista"
                    }}
                    onSelectEvent={(event) => handleOpenEdit(event.resource)}
                    eventPropGetter={eventPropGetter}
                    components={{
                        toolbar: (toolbarProps) => (
                            <div className="flex justify-between items-center mb-6">
                                <div className="flex gap-2">
                                    <button className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-medium rounded-lg transition-colors text-sm" onClick={() => toolbarProps.onNavigate('PREV')}><FaChevronLeft /></button>
                                    <button className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-medium rounded-lg transition-colors text-sm" onClick={() => toolbarProps.onNavigate('TODAY')}>Hoje</button>
                                    <button className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-medium rounded-lg transition-colors text-sm" onClick={() => toolbarProps.onNavigate('NEXT')}><FaChevronRight /></button>
                                </div>
                                <h3 className="text-xl font-bold text-slate-800 uppercase tracking-widest">{toolbarProps.label}</h3>
                                <div className="flex gap-1 bg-slate-100 p-1 rounded-xl">
                                    <button className={`px-4 py-1.5 text-sm font-semibold rounded-lg transition-colors ${toolbarProps.view === 'month' ? 'bg-white text-primary shadow-sm' : 'text-slate-500 hover:text-slate-700'}`} onClick={() => toolbarProps.onView('month')}>Mês</button>
                                    <button className={`px-4 py-1.5 text-sm font-semibold rounded-lg transition-colors hidden sm:block ${toolbarProps.view === 'week' ? 'bg-white text-primary shadow-sm' : 'text-slate-500 hover:text-slate-700'}`} onClick={() => toolbarProps.onView('week')}>Semana</button>
                                    <button className={`px-4 py-1.5 text-sm font-semibold rounded-lg transition-colors ${toolbarProps.view === 'day' ? 'bg-white text-primary shadow-sm' : 'text-slate-500 hover:text-slate-700'}`} onClick={() => toolbarProps.onView('day')}>Dia</button>
                                </div>
                            </div>
                        )
                    }}
                />
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
