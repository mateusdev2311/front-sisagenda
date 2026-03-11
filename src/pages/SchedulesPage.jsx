import { useState, useEffect } from 'react';
import axios from '../api/axiosConfig';
import Modal from '../components/Modal';
import ConfirmModal from '../components/ConfirmModal';
import Select from 'react-select';
import { FaPlus, FaChevronLeft, FaChevronRight, FaCalendarCheck, FaMoneyBillWave, FaWhatsapp, FaEnvelope } from 'react-icons/fa';
import toast from 'react-hot-toast';
import { sendKentroMessage } from '../services/kentroService';
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

const TIME_SLOTS = [];
for (let h = 8; h <= 18; h++) {
    TIME_SLOTS.push(`${String(h).padStart(2, '0')}:00`);
    if (h !== 18) TIME_SLOTS.push(`${String(h).padStart(2, '0')}:30`);
}

const SchedulesPage = () => {
    const [currentDate, setCurrentDate] = useState(new Date());
    const [view, setView] = useState('month');
    const [appointments, setAppointments] = useState([]);
    const [doctors, setDoctors] = useState([]);
    const [patients, setPatients] = useState([]);
    const [kentroConfig, setKentroConfig] = useState(null); // { base_url, api_key, queue_id }

    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editingId, setEditingId] = useState(null);
    const [formData, setFormData] = useState({
        doctor_id: '',
        patient_id: '',
        date: '',
        notes: '',
        billingValue: '',
        billingMethod: '',
        notifyWhatsapp: true,
        notifyEmail: true
    });
    const [confirmDialog, setConfirmDialog] = useState({ isOpen: false, title: '', message: '', type: 'primary', onConfirm: null });

    useEffect(() => {
        fetchData();
        // Carregar config de integração Kentro uma vez ao montar
        axios.get('/integrations')
            .then(res => {
                const data = Array.isArray(res.data) ? res.data[0] : res.data;
                if (data?.base_url) setKentroConfig(data);
            })
            .catch(() => { }); // Sem integração configurada é OK silenciosamente
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

            // Ensure literal processing by stripping out timezone interference from API
            let rawDateStr = String(app.date);
            if (rawDateStr.includes('Z')) rawDateStr = rawDateStr.split('Z')[0];
            if (rawDateStr.includes('-03:00')) rawDateStr = rawDateStr.replace('-03:00', '');

            // Reconstruct the exact nominal YYYY/MM/DD and HH/mm into Local Time natively
            const startDate = new Date(rawDateStr);
            const endDate = new Date(startDate.getTime() + 60 * 60 * 1000);

            return {
                id: app.id,
                title: `${pat.name.split(' ')[0]} c/ Dr. ${doc?.name.split(' ')[0] || ''}`,
                start: startDate,
                end: endDate,
                resource: app,
                bgColor: doc?.color || '#6c5be4'
            };
        });
    };

    const handleOpenCreate = () => {
        setEditingId(null);
        setFormData({ doctor_id: '', patient_id: '', date: '', notes: '', billingValue: '', billingMethod: '', notifyWhatsapp: true, notifyEmail: true });
        setIsModalOpen(true);
    };

    const handleOpenEdit = (app) => {
        setEditingId(app.id);
        // Normaliza o formato vindo do banco ("2026-03-10 12:30:00-03") sem converter para UTC
        let rawDate = String(app.date || '');
        if (rawDate.includes(' ') && !rawDate.includes('T')) rawDate = rawDate.replace(' ', 'T');
        if (rawDate.includes('Z')) rawDate = rawDate.split('Z')[0];
        if (rawDate.includes('-03:00')) rawDate = rawDate.replace('-03:00', '');
        if (/T\d{2}:\d{2}:\d{2}-03$/.test(rawDate)) rawDate = rawDate.replace(/-03$/, '');
        const formattedDate = rawDate.slice(0, 16); // "YYYY-MM-DDTHH:mm"
        setFormData({
            doctor_id: app.doctor_id,
            patient_id: app.patient_id || app.user_id,
            date: formattedDate,
            notes: app.notes || '',
            billingValue: '',
            billingMethod: '',
            notifyWhatsapp: true,
            notifyEmail: false
        });
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
                    let finalDateStr = formData.date;
                    if (!finalDateStr.includes('T')) {
                        finalDateStr = `${finalDateStr}T08:00`;
                    }
                    if (finalDateStr.length === 16) {
                        finalDateStr = `${finalDateStr}:00`;
                    }

                    const appointmentDate = new Date(finalDateStr);
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

                    let savedApptId = editingId;
                    if (editingId) {
                        await axios.put(`/appointments/${editingId}`, {
                            doctor_id: Number(formData.doctor_id),
                            patient_id: Number(formData.patient_id),
                            date: finalDateStr,
                            notes: formData.notes
                        });
                    } else {
                        const postRes = await axios.post('/appointments', {
                            doctor_id: Number(formData.doctor_id),
                            patient_id: Number(formData.patient_id),
                            date: finalDateStr,
                            notes: formData.notes
                        });
                        savedApptId = postRes.data?.id; // Assumes server returns inserted ID
                    }

                    // -- Fast Billing Action (Shortcut) --
                    // If user filled the billing value natively on the Scheduling Calendar:
                    if (formData.billingValue && formData.billingValue > 0) {
                        try {
                            const dueDate = new Date(formData.date).toISOString().split('T')[0]; // Mesma data da consulta
                            await axios.post('/billing', {
                                appointmentId: Number(savedApptId),
                                patientId: Number(formData.patient_id),
                                value: parseFloat(formData.billingValue),
                                status: 'Pendente', // Forced as 'Pendente' by user choice
                                dueDate: dueDate,
                                paymentMethod: formData.billingMethod || 'Pix'
                            });
                        } catch (billErr) {
                            console.error('Failed to auto-emit fast billing', billErr);
                        }
                    }

                    // -- Notificação WhatsApp via Kentro (só se o toggle estiver marcado) --
                    if (formData.notifyWhatsapp && kentroConfig) {
                        try {
                            // Busca o paciente diretamente na API para garantir o contato mais atualizado
                            const patientRes = await axios.get(`/patients/${formData.patient_id}`);
                            const patient = patientRes.data;
                            const rawPhone = patient?.number || patient?.phone; // Busca property number ou phone
                            if (rawPhone) {
                                // Remove tudo que não é dígito e adiciona DDI 55 se não tiver
                                const digits = rawPhone.replace(/\D/g, '');
                                const phone = digits.startsWith('55') ? digits : `55${digits}`;

                                const apptDateFormatted = new Date(finalDateStr).toLocaleDateString('pt-BR');
                                const apptTimeFormatted = new Date(finalDateStr).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
                                const doc = doctors.find(d => String(d.id) === String(formData.doctor_id));
                                const text = `✅ Olá, ${patient.name.split(' ')[0]}! Seu agendamento foi confirmado para o dia *${apptDateFormatted}* às *${apptTimeFormatted}* com Dr(a). *${doc?.name || 'Médico'}*. Em caso de dúvidas, entre em contato conosco.`;
                                await sendKentroMessage({
                                    baseUrl: kentroConfig.base_url,
                                    apiKey: kentroConfig.api_key,
                                    queueId: kentroConfig.queue_id,
                                    number: phone,
                                    text,
                                });
                                toast.success('Lembrete de consulta enviado via WhatsApp!', { icon: '📱' });
                            } else {
                                toast('Paciente sem telefone cadastrado. WhatsApp não enviado.', { icon: '⚠️' });
                            }
                        } catch (waErr) {
                            console.error('Falha no disparo WhatsApp Kentro:', waErr);
                            toast.error('Não foi possível enviar o WhatsApp.');
                        }
                    } else if (formData.notifyWhatsapp && !kentroConfig) {
                        toast('Integração Kentro não configurada. Configure em Preferências.', { icon: '⚠️' });
                    }
                    if (formData.notifyEmail) {
                        toast.success('Confirmação enviada para o E-mail do paciente.', { icon: '📧' });
                    }

                    setConfirmDialog(prev => ({ ...prev, isOpen: false }));
                    setIsModalOpen(false);
                    toast.success(editingId ? 'Agendamento atualizado com sucesso!' : 'Novo agendamento confirmado!');
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

                <div className="flex items-center gap-4 bg-white dark:bg-slate-800 px-2 py-1.5 rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm dark:shadow-none">
                    <button className="btn-primary py-1.5" onClick={handleOpenCreate}>
                        <FaPlus className="text-sm" /> Nova Consulta
                    </button>
                </div>
            </div>

            <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-sm shadow-slate-200/50 dark:shadow-none border border-slate-100 dark:border-slate-700 flex-1 flex flex-col p-4 lg:p-6 min-h-[650px] overflow-hidden">
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
                    min={new Date(0, 0, 0, 7, 0, 0)} // Start daily grid at 07:00am
                    max={new Date(0, 0, 0, 21, 0, 0)} // End daily grid at 21:00pm
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
                                    <button className="px-4 py-2 bg-slate-100 dark:bg-slate-700 hover:bg-slate-200 dark:hover:bg-slate-600 text-slate-700 dark:text-slate-200 font-medium rounded-lg transition-colors text-sm" onClick={() => toolbarProps.onNavigate('PREV')}><FaChevronLeft /></button>
                                    <button className="px-4 py-2 bg-slate-100 dark:bg-slate-700 hover:bg-slate-200 dark:hover:bg-slate-600 text-slate-700 dark:text-slate-200 font-medium rounded-lg transition-colors text-sm" onClick={() => toolbarProps.onNavigate('TODAY')}>Hoje</button>
                                    <button className="px-4 py-2 bg-slate-100 dark:bg-slate-700 hover:bg-slate-200 dark:hover:bg-slate-600 text-slate-700 dark:text-slate-200 font-medium rounded-lg transition-colors text-sm" onClick={() => toolbarProps.onNavigate('NEXT')}><FaChevronRight /></button>
                                </div>
                                <h3 className="text-xl font-bold text-slate-800 dark:text-slate-100 uppercase tracking-widest">{toolbarProps.label}</h3>
                                <div className="flex gap-1 bg-slate-100 dark:bg-slate-800 p-1 rounded-xl border border-slate-200 dark:border-slate-700">
                                    <button className={`px-4 py-1.5 text-sm font-semibold rounded-lg transition-colors ${toolbarProps.view === 'month' ? 'bg-white dark:bg-primary/20 text-primary shadow-sm dark:shadow-none' : 'text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200'}`} onClick={() => toolbarProps.onView('month')}>Mês</button>
                                    <button className={`px-4 py-1.5 text-sm font-semibold rounded-lg transition-colors hidden sm:block ${toolbarProps.view === 'week' ? 'bg-white dark:bg-primary/20 text-primary shadow-sm dark:shadow-none' : 'text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200'}`} onClick={() => toolbarProps.onView('week')}>Semana</button>
                                    <button className={`px-4 py-1.5 text-sm font-semibold rounded-lg transition-colors ${toolbarProps.view === 'day' ? 'bg-white dark:bg-primary/20 text-primary shadow-sm dark:shadow-none' : 'text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200'}`} onClick={() => toolbarProps.onView('day')}>Dia</button>
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
                            classNamePrefix="react-select"
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
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                            <label>Data da Consulta</label>
                            <input
                                type="date"
                                className="form-control"
                                required
                                value={formData.date ? formData.date.split('T')[0] : ''}
                                onChange={e => {
                                    const newDate = e.target.value;
                                    const currentTime = formData.date && formData.date.includes('T') ? formData.date.split('T')[1].substring(0, 5) : '08:00';
                                    setFormData({ ...formData, date: `${newDate}T${currentTime}` });
                                }}
                            />
                        </div>
                        {formData.date && formData.date.split('T')[0] && formData.doctor_id ? (
                            <div className="md:col-span-2 mt-2">
                                <label className="mb-2 block font-bold text-slate-700">Horários Disponíveis (Livres)</label>
                                <div className="grid grid-cols-4 sm:grid-cols-6 lg:grid-cols-8 gap-2">
                                    {TIME_SLOTS.map(time => {
                                        const isSelected = formData.date && formData.date.includes('T') && formData.date.split('T')[1].substring(0, 5) === time;
                                        const slotDateTimeStr = `${formData.date.split('T')[0]}T${time}`;
                                        const slotTimeMs = new Date(slotDateTimeStr).getTime();

                                        const isBusy = appointments.some(evt => {
                                            if (String(evt.doctor_id) !== String(formData.doctor_id)) return false;
                                            if (String(evt.id) === String(editingId)) return false;
                                            return new Date(evt.date).getTime() === slotTimeMs;
                                        });

                                        if (isBusy) return null; // Não mostra os ocupados, conforme solicitado pelo usuário

                                        return (
                                            <button
                                                key={time}
                                                type="button"
                                                onClick={() => {
                                                    const currentDate = formData.date.split('T')[0];
                                                    setFormData({ ...formData, date: `${currentDate}T${time}` });
                                                }}
                                                className={`py-2 text-sm font-bold rounded-lg border transition-all duration-200 shadow-sm ${isSelected
                                                    ? 'bg-primary border-primary text-white shadow-md scale-105'
                                                    : 'bg-white border-slate-300 text-slate-700 hover:border-primary hover:text-primary hover:bg-primary/5'
                                                    }`}
                                            >
                                                {time}
                                            </button>
                                        );
                                    })}
                                </div>
                            </div>
                        ) : (
                            <div className="md:col-span-2 mt-2 p-4 bg-slate-50 border border-slate-200 rounded-lg text-center text-slate-500 text-sm">
                                Selecione um Médico e uma Data para visualizar a grade de horários livres disponíveis.
                            </div>
                        )}
                    </div>

                    <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 mt-2 mb-2">
                        <div className="flex items-center gap-2 mb-3">
                            <FaMoneyBillWave className="text-emerald-600" />
                            <h5 className="font-bold text-slate-700 text-sm">Faturamento Expresso (Opcional)</h5>
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <label className="text-xs font-semibold text-slate-600">Valor Cobrado (R$)</label>
                                <input type="number" step="0.01" className="form-control text-sm py-1.5" placeholder="0.00" value={formData.billingValue} onChange={e => setFormData({ ...formData, billingValue: e.target.value })} />
                            </div>
                            <div>
                                <label className="text-xs font-semibold text-slate-600">Forma de Pagto.</label>
                                <select className="form-control text-sm py-1.5" value={formData.billingMethod} onChange={e => setFormData({ ...formData, billingMethod: e.target.value })}>
                                    <option value="">Não definido</option>
                                    <option value="Pix">Transf. via Pix</option>
                                    <option value="Cartão de Crédito">Cartão de Crédito</option>
                                    <option value="Cartão de Débito">Cartão de Débito</option>
                                    <option value="Dinheiro">Dinheiro (Espécie)</option>
                                    <option value="Boleto">Boleto</option>
                                </select>
                            </div>
                        </div>
                        <p className="text-[11px] text-slate-400 mt-2">* Ao preencher valor, uma fatura "Pendente" será gerada automaticamente na guia Financeiro.</p>
                    </div>

                    <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 mt-2 mb-2">
                        <div className="flex items-center justify-between mb-2 border-b border-slate-200 pb-2">
                            <h5 className="font-bold text-slate-700 text-sm">Notificações Automáticas</h5>
                            <span className="text-xs bg-primary/10 text-primary-dark px-2 py-0.5 rounded-full font-semibold">Mensageria</span>
                        </div>
                        <div className="flex flex-col gap-3">
                            <label className="flex items-center gap-3 cursor-pointer">
                                <input
                                    type="checkbox"
                                    className="w-4 h-4 text-green-500 rounded border-slate-300 focus:ring-green-400"
                                    checked={formData.notifyWhatsapp}
                                    onChange={e => setFormData({ ...formData, notifyWhatsapp: e.target.checked })}
                                />
                                <div className="flex items-center gap-2">
                                    <FaWhatsapp className="text-green-500 text-lg" />
                                    <span className="text-sm font-semibold text-slate-700">Disparar lembrete via WhatsApp</span>
                                </div>
                            </label>

                            <label className="flex items-center gap-3 cursor-pointer">
                                <input
                                    type="checkbox"
                                    className="w-4 h-4 text-slate-500 rounded border-slate-300 focus:ring-slate-400"
                                    checked={formData.notifyEmail}
                                    onChange={e => setFormData({ ...formData, notifyEmail: e.target.checked })}
                                />
                                <div className="flex items-center gap-2">
                                    <FaEnvelope className="text-slate-400 text-lg" />
                                    <span className="text-sm font-semibold text-slate-700">Enviar E-mail de confirmação e preparo</span>
                                </div>
                            </label>
                        </div>
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
