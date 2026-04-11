import { useState, useEffect, useRef } from 'react';
import axios from '../api/axiosConfig';
import Modal from '../components/Modal';
import ConfirmModal from '../components/ConfirmModal';
import Select from 'react-select';
import { FaPlus, FaChevronLeft, FaChevronRight, FaCalendarCheck, FaMoneyBillWave, FaWhatsapp, FaEnvelope, FaPaperPlane, FaUserMd, FaPlay, FaClock, FaFileMedicalAlt, FaPrescriptionBottleAlt, FaRobot, FaMicrophone, FaStop } from 'react-icons/fa';
import { transcribeAudio, getCompanyInfo } from '../services/aiService';
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
for (let h = 7; h <= 21; h++) {
    TIME_SLOTS.push(`${String(h).padStart(2, '0')}:00`);
    if (h !== 21) TIME_SLOTS.push(`${String(h).padStart(2, '0')}:30`);
}

const FloatingConsultationPanel = ({ activeConsultations, patients, doctors, records, getElapsedSeconds, formatTime, onFinalize }) => {
    const [expanded, setExpanded] = useState(false);

    if (!expanded) {
        return (
            <button
                onClick={() => setExpanded(true)}
                className="fixed bottom-5 right-5 z-50 w-14 h-14 rounded-full bg-slate-800 text-white shadow-2xl flex flex-col items-center justify-center gap-0.5 transition-all hover:scale-110 group"
                title="Expandir Sala de Atendimento"
            >
                <FaClock className="text-base group-hover:scale-110 transition-transform" />
                <span className="text-[10px] font-bold bg-emerald-400 text-slate-900 rounded-full min-w-[18px] text-center leading-tight px-1">
                    {activeConsultations.length}
                </span>
            </button>
        );
    }

    return (
        <div className="fixed bottom-5 right-5 z-50 w-[340px] rounded-2xl bg-white border border-slate-200 shadow-2xl overflow-hidden" style={{ boxShadow: '0 8px 32px rgba(15,23,42,0.14)' }}>
            {/* Header */}
            <div className="bg-slate-800 px-4 py-2.5 flex items-center justify-between">
                <div className="flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
                    <span className="text-white font-bold text-xs uppercase tracking-widest">Sala de Atendimento</span>
                </div>
                <div className="flex items-center gap-2">
                    <span className="bg-white/10 text-slate-300 text-[11px] font-bold px-2 py-0.5 rounded-full">
                        {activeConsultations.length} {activeConsultations.length === 1 ? 'Paciente' : 'Pacientes'}
                    </span>
                    <button
                        onClick={() => setExpanded(false)}
                        className="ml-1 w-6 h-6 rounded-full bg-white/10 hover:bg-white/20 text-white flex items-center justify-center transition-colors text-xs"
                        title="Minimizar"
                    >
                        &#8211;
                    </button>
                </div>
            </div>
            {/* Rows */}
            <div className="divide-y divide-slate-100 max-h-[350px] overflow-y-auto">
                {activeConsultations.map((c) => {
                    const pat = patients.find(p => String(p.id) === String(c.patientId));
                    const doc = doctors.find(d => String(d.id) === String(c.doctorId));
                    const elapsed = getElapsedSeconds(c.startTime);
                    const hasRecord = records.some(r => String(r.appointmentId || r.appointment_id) === String(c.appointmentId));
                    return (
                        <div key={c.appointmentId} className="flex items-center gap-3 px-4 py-3">
                            <div className="w-8 h-8 rounded-full flex-shrink-0 flex items-center justify-center text-white text-xs font-bold" style={{ backgroundColor: doc?.color || '#6c5be4' }}>
                                {pat?.name?.charAt(0) || '?'}
                            </div>
                            <div className="flex-1 min-w-0">
                                <div className="flex items-center gap-1.5">
                                    <p className="font-bold text-slate-800 text-xs truncate leading-tight">{pat?.name || 'Paciente'}</p>
                                    {c.is_return && (
                                        <span className="text-[9px] bg-indigo-100 text-indigo-700 font-bold px-1 rounded border border-indigo-200 uppercase tracking-tighter">R</span>
                                    )}
                                </div>
                                <p className="text-[10px] text-slate-400 leading-tight">Dr. {doc?.name?.replace('Dr. ', '') || '—'}</p>
                            </div>
                            <span className="font-mono text-xs font-bold text-slate-700 bg-slate-100 rounded-lg px-2 py-1 flex-shrink-0">
                                {formatTime(elapsed)}
                            </span>
                            {hasRecord ? (
                                <span className="text-[10px] font-bold text-emerald-600 px-2 py-1 bg-emerald-50 rounded-lg border border-emerald-100 flex-shrink-0">✓</span>
                            ) : (
                                <button
                                    onClick={() => onFinalize(c)}
                                    className="flex items-center gap-1 px-2.5 py-1.5 bg-slate-800 hover:bg-slate-700 text-white font-bold rounded-lg text-[11px] transition-all hover:scale-105 flex-shrink-0"
                                >
                                    <FaFileMedicalAlt className="text-[9px]" /> Finalizar
                                </button>
                            )}
                        </div>
                    );
                })}
            </div>
        </div>
    );
};

const SchedulesPage = () => {
    const [currentDate, setCurrentDate] = useState(new Date());
    const [view, setView] = useState('month');
    const [appointments, setAppointments] = useState([]);
    const [doctors, setDoctors] = useState([]);
    const [patients, setPatients] = useState([]);
    const [records, setRecords] = useState([]);
    const [selectedDoctorFilter, setSelectedDoctorFilter] = useState('all');
    const [kentroConfig, setKentroConfig] = useState(null); // { base_url, api_key, queue_id }

    const [activeConsultations, setActiveConsultations] = useState([]); // Array of { appointmentId, patientId, doctorId, startTime }
    const [currentTick, setCurrentTick] = useState(0); // Forces re-render every second for live timers
    const [isRecordModalOpen, setIsRecordModalOpen] = useState(false);
    const [recordingConsultation, setRecordingConsultation] = useState(null); // which consultation we’re filling the record for
    const [recordData, setRecordData] = useState({ description: '', prescription: '' });
    const [isSavingRecord, setIsSavingRecord] = useState(false);
    const [companyPlan, setCompanyPlan] = useState('start'); // default allows access while loading

    // AI Variables
    const [aiConfigured, setAiConfigured] = useState(false);
    const [isRecording, setIsRecording] = useState(false);
    const [isTranscribing, setIsTranscribing] = useState(false);
    const [transcriptionResult, setTranscriptionResult] = useState(null);
    const mediaRecorderRef = useRef(null);
    const audioChunksRef = useRef([]);

    const formatTime = (seconds) => {
        const hrs = Math.floor(seconds / 3600);
        const mins = Math.floor((seconds % 3600) / 60);
        const secs = seconds % 60;
        if (hrs > 0) return `${String(hrs).padStart(2, '0')}:${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
        return `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
    };

    useEffect(() => {
        const saved = localStorage.getItem('activeConsultations');
        if (saved) {
            try {
                setActiveConsultations(JSON.parse(saved));
            } catch (e) {
                console.error("Error parsing active consultations", e);
            }
        }
    }, []);

    // Ticks every second to keep timers live
    useEffect(() => {
        if (activeConsultations.length === 0) return;
        const interval = setInterval(() => setCurrentTick(t => t + 1), 1000);
        return () => clearInterval(interval);
    }, [activeConsultations.length]);

    const getElapsedSeconds = (startTime) => Math.floor((Date.now() - startTime) / 1000);

    const handleStartRecording = async () => {
        try {
            const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
            const mediaRecorder = new MediaRecorder(stream, { mimeType: 'audio/webm' });
            audioChunksRef.current = [];
            mediaRecorder.ondataavailable = (event) => {
                if (event.data.size > 0) audioChunksRef.current.push(event.data);
            };
            mediaRecorder.onstop = async () => {
                stream.getTracks().forEach(track => track.stop());
                const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
                setIsTranscribing(true);
                setTranscriptionResult(null);
                try {
                    const patientName = patients.find(p => String(p.id) === String(recordingConsultation?.patientId))?.name || 'Paciente';
                    const res = await transcribeAudio(audioBlob, patientName);
                    const { transcription, medical_record } = res.data;
                    setTranscriptionResult(transcription);
                    setRecordData(prev => ({
                        ...prev,
                        description: medical_record?.description || prev.description,
                        prescription: medical_record?.prescription || prev.prescription
                    }));
                    toast.success('Prontuário gerado pela IA! Revise e salve.');
                } catch (err) {
                    toast.error(err.response?.data?.error || 'Erro ao transcrever o áudio. Verifique o token da OpenAI.');
                } finally {
                    setIsTranscribing(false);
                }
            };
            mediaRecorderRef.current = mediaRecorder;
            mediaRecorder.start();
            setIsRecording(true);
        } catch {
            toast.error('Não foi possível acessar o microfone. Verifique as permissões do navegador.');
        }
    };

    const handleStopRecording = () => {
        if (mediaRecorderRef.current && isRecording) {
            mediaRecorderRef.current.stop();
            setIsRecording(false);
        }
    };

    const handleSaveRecord = async (e) => {
        e.preventDefault();
        if (!recordingConsultation || isSavingRecord) return;
        setIsSavingRecord(true);
        const elapsed = getElapsedSeconds(recordingConsultation.startTime);
        try {
            await axios.post('/appointments/records', {
                appointmentId: recordingConsultation.appointmentId,
                description: recordData.description,
                prescription: recordData.prescription,
                duration_seconds: elapsed
            });
            toast.success('Prontuário salvo e consulta finalizada!');
            setIsRecordModalOpen(false);
            setRecordingConsultation(null);
            setRecordData({ description: '', prescription: '' });
            setTranscriptionResult(null);
            const updated = activeConsultations.filter(c => String(c.appointmentId) !== String(recordingConsultation.appointmentId));
            localStorage.setItem('activeConsultations', JSON.stringify(updated));
            setActiveConsultations(updated);
            fetchData();
        } catch (err) {
            toast.error('Erro ao salvar prontuário.');
        } finally {
            setIsSavingRecord(false);
        }
    };

    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editingId, setEditingId] = useState(null);
    const [formData, setFormData] = useState({
        doctor_id: '',
        patient_id: '',
        date: '',
        notes: '',
        billingValue: '',
        billingMethod: '',
        is_return: false,
    });
    const [confirmDialog, setConfirmDialog] = useState({ isOpen: false, title: '', message: '', type: 'primary', onConfirm: null });
    const [isResending, setIsResending] = useState(false);
    const [doctorSchedule, setDoctorSchedule] = useState([]); // Horários de trabalho do médico
    const [isLoadingSchedule, setIsLoadingSchedule] = useState(false);

    useEffect(() => {
        fetchData();
        // Carregar config de integração Kentro uma vez ao montar
        axios.get('/integrations')
            .then(res => {
                const data = Array.isArray(res.data) ? res.data[0] : res.data;
                if (data?.base_url) setKentroConfig(data);
            })
            .catch(() => { }); // Sem integração configurada é OK silenciosamente
            
        getCompanyInfo()
            .then(res => {
                setAiConfigured(res.data?.ai_configured || false);
                setCompanyPlan(res.data?.plan || 'free');
            })
            .catch(() => {});
    }, [currentDate]);

    // Buscar agenda de horários do médico quando selecionado
    useEffect(() => {
        if (formData.doctor_id) {
            setIsLoadingSchedule(true);
            axios.get(`/doctors/${formData.doctor_id}/schedule`)
                .then(res => {
                    setDoctorSchedule(res.data || []);
                })
                .catch(err => {
                    console.error('Erro ao buscar agenda do médico:', err);
                    setDoctorSchedule([]);
                })
                .finally(() => setIsLoadingSchedule(false));
        } else {
            setDoctorSchedule([]);
        }
    }, [formData.doctor_id]);

    /**
     * API: Múltiplas Requisições GET Simultâneas p/ Estado Inicial do Calendário
     * 1. GET /appointments -> Retorna um array de { id, doctor_id, user_id, date: "AAAA-MM-DDTHH:mm" }
     * 2. GET /doctors -> Necessário pra mapear o doctor_id pro nome visual e a cor dele
     * 3. GET /patients -> Necessário pra mapear o user_id pro nome do paciente
     */
    const fetchData = async () => {
        try {
            const t = new Date().getTime();
            const [appRes, docRes, patRes, recRes] = await Promise.all([
                axios.get(`/appointments?t=${t}&limit=5000`),
                axios.get(`/doctors?t=${t}`),
                axios.get(`/patients?t=${t}&limit=5000`),
                axios.get(`/records?t=${t}`)
            ]);
            setAppointments(appRes.data.data || appRes.data || []);
            setDoctors(docRes.data);
            setPatients(patRes.data.data || patRes.data || []);
            setRecords(Array.isArray(recRes.data) ? recRes.data : []);
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
        let filteredApps = appointments;
        
        if (selectedDoctorFilter !== 'all') {
            filteredApps = appointments.filter(app => String(app.doctor_id) === String(selectedDoctorFilter));
        }

        return filteredApps.map(app => {
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
        setFormData({ doctor_id: '', patient_id: '', date: '', notes: '', billingValue: '', billingMethod: '', is_return: false });
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
            lembrete_enviado: app.lembrete_enviado || false,
            lembrete_enviado_em: app.lembrete_enviado_em || null,
            is_return: !!app.is_return,
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
                    setIsModalOpen(false);
                    setAppointments(prev => prev.filter(app => app.id !== id));
                    toast.success('Consulta cancelada com sucesso!');
                    fetchData();
                } catch (error) {
                    toast.error(error.response?.data?.error || 'Erro ao cancelar agendamento.');
                }
            }
        });
    };

    /**
     * POST /appointments/:id/reenviar-lembrete
     * Reenvia o lembrete de consulta via WhatsApp manualmente.
     */
    const handleResendReminder = async (e) => {
        e.preventDefault();
        if (!editingId || isResending) return;
        setIsResending(true);
        try {
            await axios.post(`/appointments/${editingId}/reenviar-lembrete`);
            toast.success('Lembrete reenviado com sucesso!', { icon: '📱' });
            setFormData(prev => ({ ...prev, lembrete_enviado: true, lembrete_enviado_em: new Date().toISOString() }));
            fetchData();
        } catch (error) {
            const status = error.response?.status;
            if (status === 400) toast.error('Integração Kentro não configurada ou inativa.');
            else if (status === 404) toast.error('Agendamento não encontrado.');
            else if (status === 500) toast.error('Falha na API do Kentro. Tente novamente.');
            else toast.error('Erro ao reenviar lembrete.');
        } finally {
            setIsResending(false);
        }
    };

    /**
     * Inicia a consulta redirecionando para a tela de prontuários
     * e salvando o estado no localStorage para o timer
     */
    const handleStartConsultation = () => {
        if (!editingId || !formData.patient_id) {
            toast.error('É necessário ter um paciente agendado para iniciar o atendimento.');
            return;
        }
        const already = activeConsultations.some(c => String(c.appointmentId) === String(editingId));
        if (already) {
            toast.error('Esta consulta já está em andamento.');
            return;
        }
        const consultationData = {
            appointmentId: editingId,
            patientId: formData.patient_id,
            doctorId: formData.doctor_id,
            startTime: Date.now(),
            is_return: !!formData.is_return
        };
        const updated = [...activeConsultations, consultationData];
        localStorage.setItem('activeConsultations', JSON.stringify(updated));
        setActiveConsultations(updated);
        setIsModalOpen(false);
        toast.success('Atendimento iniciado! Acompanhe no painel Sala de Atendimento.', { icon: '⏱️', duration: 3000 });
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
    const [isCreatingPatient, setIsCreatingPatient] = useState(false);
    const [newPatientData, setNewPatientData] = useState({ name: '', number: '', cpf: '' });

    // Modificando handleOpenCreate para limpar também o novo estado
    const handleOpenCreateLocal = () => {
        setIsCreatingPatient(false);
        setNewPatientData({ name: '', number: '', cpf: '' });
        handleOpenCreate();
    };

    const handleOpenEditLocal = (app) => {
        setIsCreatingPatient(false);
        handleOpenEdit(app);
    };

// Ajuste rápido dentro da renderização:
// PULAR PARA A SUBMISSÃO:

    const handleSubmit = (e) => {
        e.preventDefault();
        
        if (isCreatingPatient && (!newPatientData.name || !newPatientData.number)) {
            toast.error('Preencha ao menos Nome e Celular do novo paciente.');
            return;
        }

        if (!isCreatingPatient && !formData.patient_id) {
            toast.error('Selecione ou cadastre um paciente.');
            return;
        }

        setConfirmDialog({
            isOpen: true,
            title: editingId ? 'Confirmar Reagendamento' : 'Confirmar Agendamento',
            message: editingId ? 'Tem certeza que deseja alterar os dados desta consulta?' : 'Deseja confirmar o agendamento desta consulta?',
            type: 'primary',
            onConfirm: async () => {
                try {
                    // SE ESTIVER CRIANDO O PACIENTE, FAZ ISSO PRIMEIRO:
                    let activePatientId = formData.patient_id;
                    if (isCreatingPatient) {
                        try {
                            const newPatRes = await axios.post('/patients', {
                                name: newPatientData.name,
                                number: newPatientData.number,
                                cpf: newPatientData.cpf ? newPatientData.cpf : null
                            });
                            activePatientId = newPatRes.data?.id;
                            
                            // Adiciona na lista local para não ter que recarregar a tela inteira pra aparecer o nome
                            setPatients(prev => [...prev, newPatRes.data]);
                            toast.success('Paciente cadastrado rapidamente!');
                        } catch (err) {
                            toast.error(err.response?.data?.error || err.response?.data?.message || 'Erro ao cadastrar paciente.');
                            setConfirmDialog(prev => ({ ...prev, isOpen: false }));
                            return; // Para a execução do agendamento se o paciente falhar
                        }
                    }

                    // CONTINUA O FLUXO NORMAL DE AGENDAMENTO
                    let finalDateStr = formData.date;
                    if (!finalDateStr.includes('T')) {
                        finalDateStr = `${finalDateStr}T08:00`;
                    }
                    if (finalDateStr.length === 16) {
                        finalDateStr = `${finalDateStr}:00`;
                    }

                    const appointmentDate = new Date(finalDateStr);
                    if (isNaN(appointmentDate)) {
                        toast.error('Data inválida. Verifique o campo de data e tente novamente.');
                        return;
                    }

                    // 1. Validar se está dentro do horário de atendimento do médico
                    const dayOfWeek = appointmentDate.getDay();
                    const apptTime = finalDateStr.split('T')[1].substring(0, 5);
                    
                    const canAttend = doctorSchedule.some(sched => {
                        if (sched.day_of_week !== dayOfWeek) return false;
                        return apptTime >= sched.start_time && apptTime < sched.end_time;
                    });

                    if (!canAttend && doctorSchedule.length > 0) {
                        toast.error('Este médico não atende neste horário/dia.');
                        setConfirmDialog(prev => ({ ...prev, isOpen: false }));
                        return;
                    }

                    // 2. Validar conflito com outras consultas do mesmo médico
                    const reqTime = appointmentDate.getTime();
                    const conflict = appointments.find(apt => {
                        if (String(apt.doctor_id) !== String(formData.doctor_id)) return false;
                        if (String(apt.id) === String(editingId)) return false;
                        return new Date(apt.date).getTime() === reqTime;
                    });

                    if (conflict) {
                        toast.error('O médico já possui uma consulta exatamente neste horário.');
                        setConfirmDialog(prev => ({ ...prev, isOpen: false }));
                        return;
                    }

                    let savedApptId = editingId;
                    if (editingId) {
                        const putRes = await axios.put(`/appointments/${editingId}`, {
                            doctor_id: Number(formData.doctor_id),
                            patient_id: Number(activePatientId),
                            date: finalDateStr,
                            notes: formData.notes,
                            is_return: !!formData.is_return
                        });
                        if (putRes.data && typeof putRes.data === 'object') {
                            setAppointments(prev => prev.map(a => String(a.id) === String(editingId) ? { ...a, ...putRes.data } : a));
                        }
                    } else {
                        const postRes = await axios.post('/appointments', {
                            doctor_id: Number(formData.doctor_id),
                            patient_id: Number(activePatientId),
                            date: finalDateStr,
                            notes: formData.notes,
                            is_return: !!formData.is_return
                        });
                        savedApptId = postRes.data?.id; // Assumes server returns inserted ID
                        if (postRes.data) {
                            setAppointments(prev => [...prev, postRes.data]);
                        }
                    }

                    // -- Fast Billing Action (Shortcut) --
                    // If user filled the billing value natively on the Scheduling Calendar:
                    if (formData.billingValue && formData.billingValue > 0) {
                        try {
                            const dueDate = new Date(formData.date).toISOString().split('T')[0]; // Mesma data da consulta
                            await axios.post('/billing', {
                                appointmentId: Number(savedApptId),
                                patientId: Number(activePatientId),
                                value: parseFloat(formData.billingValue),
                                status: 'Pendente', // Forced as 'Pendente' by user choice
                                dueDate: dueDate,
                                paymentMethod: formData.billingMethod || 'Pix'
                            });
                        } catch (billErr) {
                            console.error('Failed to auto-emit fast billing', billErr);
                        }
                    }

                    setConfirmDialog(prev => ({ ...prev, isOpen: false }));
                    setIsModalOpen(false);
                    toast.success(editingId ? 'Agendamento atualizado com sucesso!' : 'Novo agendamento confirmado!');
                    fetchData();
                } catch (error) {
                    toast.error(error.response?.data?.error || 'Erro ao processar agendamento. Tente novamente.');
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

            {/* ===== SALA DE ATENDIMENTO — Painel Flutuante Fixo (canto inferior direito) ===== */}
            {activeConsultations.length > 0 && (
                <FloatingConsultationPanel
                    activeConsultations={activeConsultations}
                    patients={patients}
                    doctors={doctors}
                    records={records}
                    getElapsedSeconds={getElapsedSeconds}
                    formatTime={formatTime}
                    onFinalize={(c) => {
                        setRecordingConsultation(c);
                        setRecordData({ description: '', prescription: '' });
                        setTranscriptionResult(null);
                        setIsRecordModalOpen(true);
                    }}
                />
            )}



            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-2">
                <div>
                    <h2 className="text-2xl font-bold text-slate-800 tracking-tight">Calendário Médico</h2>
                    <p className="text-sm text-slate-500 mt-1">Gerencie a disponibilidade médica e marque consultas com arrastar e soltar (Drag-and-Drop).</p>
                </div>

                <div className="flex items-center gap-4 bg-white dark:bg-slate-800 px-2 py-1.5 rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm dark:shadow-none">
                    <div className="flex items-center gap-3 border-r border-slate-200 dark:border-slate-700 pr-4 mr-2 hidden md:flex">
                        <div className="bg-primary/10 p-2 rounded-lg text-primary">
                            <FaUserMd className="text-lg" />
                        </div>
                        <div className="flex flex-col">
                            <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-0 leading-none">Filtrar por Médico</label>
                            <div className="min-w-[200px]">
                                <Select
                                    options={[
                                        { value: 'all', label: 'Todos os Médicos' },
                                        ...doctors.map(doc => ({ value: doc.id, label: `Dr. ${doc.name}` }))
                                    ]}
                                    value={selectedDoctorFilter === 'all' 
                                        ? { value: 'all', label: 'Todos os Médicos' }
                                        : { value: selectedDoctorFilter, label: `Dr. ${doctors.find(d => String(d.id) === String(selectedDoctorFilter))?.name}` }
                                    }
                                    onChange={(selected) => setSelectedDoctorFilter(selected ? selected.value : 'all')}
                                    placeholder="Selecione..."
                                    className="text-sm font-bold"
                                    classNamePrefix="react-select"
                                    maxMenuHeight={200}
                                    menuPlacement="auto"
                                    menuPortalTarget={document.body}
                                    styles={{
                                        menuPortal: (base) => ({ ...base, zIndex: 9999 }),
                                        control: (base) => ({
                                            ...base,
                                            border: 'none',
                                            backgroundColor: 'transparent',
                                            boxShadow: 'none',
                                            minHeight: 'auto',
                                            cursor: 'pointer'
                                        }),
                                        valueContainer: (base) => ({
                                            ...base,
                                            padding: '0'
                                        }),
                                        dropdownIndicator: (base) => ({
                                            ...base,
                                            padding: '0 4px'
                                        }),
                                        indicatorSeparator: () => ({
                                            display: 'none'
                                        }),
                                        singleValue: (base) => ({
                                            ...base,
                                            color: '#334155'
                                        })
                                    }}
                                />
                            </div>
                        </div>
                    </div>
                    <button className="btn-primary py-1.5" onClick={handleOpenCreateLocal}>
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
                    onSelectEvent={(event) => handleOpenEditLocal(event.resource)}
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
                            <div className="flex items-center gap-2 flex-wrap">
                                <p className="text-xs text-primary/80">Selecione médico, paciente e slot de tempo (horário).</p>
                                
                                <label className="inline-flex items-center gap-2 bg-indigo-50 px-3 py-1 rounded-full cursor-pointer hover:bg-indigo-100 transition-colors border border-indigo-100 shadow-sm">
                                    <input 
                                        type="checkbox" 
                                        className="w-4 h-4 text-indigo-600 border-indigo-300 rounded focus:ring-indigo-500"
                                        checked={formData.is_return}
                                        onChange={e => setFormData({ ...formData, is_return: e.target.checked })}
                                    />
                                    <span className="text-[11px] font-bold text-indigo-700 uppercase tracking-tight">Consulta de Retorno</span>
                                </label>

                                {editingId && formData.lembrete_enviado && (
                                    <span
                                        className="inline-flex items-center gap-1 bg-green-500 text-white text-[10px] font-bold px-2 py-0.5 rounded-full"
                                        title={formData.lembrete_enviado_em ? `Enviado em: ${new Date(formData.lembrete_enviado_em).toLocaleString('pt-BR')}` : ''}
                                    >
                                        <FaWhatsapp /> Lembrete Enviado
                                    </span>
                                )}
                            </div>
                        </div>
                    </div>

                    <div>
                        <label>Médico Responsável</label>
                        <select className="form-control font-medium" required value={formData.doctor_id} onChange={e => setFormData({ ...formData, doctor_id: e.target.value })}>
                            <option value="">Selecione um médico da lista...</option>
                            {doctors.map(d => <option key={d.id} value={d.id}>Dr. {d.name} ({d.specialty})</option>)}
                        </select>
                    </div>

                    <div className="p-4 border border-slate-200 bg-slate-50 rounded-xl relative">
                        <div className="flex items-center justify-between mb-3">
                            <label className="text-slate-700 font-bold mb-0">Registro do Paciente</label>
                            
                            {!editingId && (
                                <button
                                    type="button"
                                    onClick={() => {
                                        setIsCreatingPatient(!isCreatingPatient);
                                        setFormData({ ...formData, patient_id: '' });
                                        setNewPatientData({ name: '', number: '', cpf: '' });
                                    }}
                                    className="text-xs font-bold text-primary hover:text-primary-dark transition-colors flex items-center gap-1 bg-primary/10 px-2 py-1 rounded"
                                >
                                    <FaPlus className="text-[10px]" /> {isCreatingPatient ? 'Usar paciente existente' : 'Cadastrar novo na hora'}
                                </button>
                            )}
                        </div>

                        {isCreatingPatient ? (
                            <div className="space-y-3 animate-in fade-in slide-in-from-top-2">
                                <p className="text-xs text-slate-500 italic mb-2">Preencha os dados básicos. O paciente será salvo no banco de dados antes da consulta.</p>
                                <div>
                                    <input type="text" className="form-control py-2 text-sm" placeholder="Nome Completo do Paciente" required={isCreatingPatient} value={newPatientData.name} onChange={e => setNewPatientData({ ...newPatientData, name: e.target.value })} />
                                </div>
                                <div className="grid grid-cols-2 gap-3">
                                    <input type="tel" className="form-control py-2 text-sm" placeholder="Celular/WhatsApp (Ex: 11988888888)" required={isCreatingPatient} value={newPatientData.number} onChange={e => setNewPatientData({ ...newPatientData, number: e.target.value })} />
                                    <input type="text" className="form-control py-2 text-sm" placeholder="CPF (Opcional)" value={newPatientData.cpf} onChange={e => setNewPatientData({ ...newPatientData, cpf: e.target.value })} />
                                </div>
                            </div>
                        ) : (
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
                                required={!isCreatingPatient}
                            />
                        )}
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
                                <label className="mb-2 block font-bold text-slate-700 flex items-center gap-2">
                                    Horários Disponíveis (Livres)
                                    {isLoadingSchedule && <span className="text-xs font-normal text-slate-400 animate-pulse">(Buscando agenda...)</span>}
                                </label>
                                
                                {isLoadingSchedule ? (
                                    <div className="flex justify-center py-8">
                                        <div className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin"></div>
                                    </div>
                                ) : (
                                    <>
                                        <div className="grid grid-cols-4 sm:grid-cols-6 lg:grid-cols-8 gap-2">
                                            {TIME_SLOTS.filter(time => {
                                                const slotDateTimeStr = `${formData.date.split('T')[0]}T${time}`;
                                                const slotTimeMs = new Date(slotDateTimeStr).getTime();
                                                const dayOfWeek = new Date(slotDateTimeStr).getDay();

                                                // 1. Verificar se o médico atende nesse dia/horário
                                                const isAtending = doctorSchedule.length === 0 || doctorSchedule.some(sched => {
                                                    if (sched.day_of_week !== dayOfWeek) return false;
                                                    return time >= sched.start_time && time < sched.end_time;
                                                });
                                                if (!isAtending) return false;

                                                // 2. Verificar se já há consulta marcada (Busy)
                                                const isBusy = appointments.some(evt => {
                                                    if (String(evt.doctor_id) !== String(formData.doctor_id)) return false;
                                                    if (String(evt.id) === String(editingId)) return false;
                                                    return new Date(evt.date).getTime() === slotTimeMs;
                                                });
                                                return !isBusy;
                                            }).map(time => {
                                                const isSelected = formData.date && formData.date.includes('T') && formData.date.split('T')[1].substring(0, 5) === time;
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

                                        {/* Mensagem se não sobrar nenhum slot */}
                                        {TIME_SLOTS.filter(t => {
                                            const d = new Date(`${formData.date.split('T')[0]}T${t}`).getDay();
                                            const isAtending = doctorSchedule.length === 0 || doctorSchedule.some(s => s.day_of_week === d && t >= s.start_time && t < s.end_time);
                                            if (!isAtending) return false;
                                            const slotTimeMs = new Date(`${formData.date.split('T')[0]}T${t}`).getTime();
                                            const isBusy = appointments.some(evt => String(evt.doctor_id) === String(formData.doctor_id) && String(evt.id) !== String(editingId) && new Date(evt.date).getTime() === slotTimeMs);
                                            return !isBusy;
                                        }).length === 0 && (
                                            <div className="mt-2 p-3 bg-red-50 border border-red-100 rounded-lg text-red-600 text-xs text-center font-medium">
                                                Infelizmente, o médico não possui horários disponíveis para a data selecionada.
                                            </div>
                                        )}
                                    </>
                                )}
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
                        {companyPlan === 'free' ? (
                            <div className="flex flex-col gap-2 py-2">
                                <p className="text-xs text-amber-700 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2 font-medium">
                                    🔒 O faturamento expresso não está disponível no plano Free.
                                    Faça upgrade para o plano <strong>Start</strong> ou superior.
                                </p>
                                <a
                                    href={`https://wa.me/5538999748911?text=${encodeURIComponent('Olá! Tenho interesse em fazer upgrade do meu plano no Sisagenda. Poderia me enviar mais informações?')}`}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="flex items-center justify-center gap-2 py-2 bg-green-500 hover:bg-green-600 text-white font-bold rounded-lg text-xs transition-all"
                                >
                                    Fazer Upgrade pelo WhatsApp
                                </a>
                            </div>
                        ) : (
                            <>
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
                                <p className="text-[11px] text-slate-400 mt-2">* Ao preencher valor, uma fatura "Pendente" será gerada automaticamente na guía Financeiro.</p>
                            </>
                        )}
                    </div>

                    <div className="modal-footer flex items-center pt-6 mt-6 border-t border-slate-100 -mx-6 -mb-6 px-6 bg-slate-50 rounded-b-xl gap-3">
                        {editingId && (
                            <button type="button" className="btn-danger mr-auto" onClick={() => handleDelete(editingId)}>Cancelar Consulta</button>
                        )}
                        <div className="flex gap-3 justify-end flex-1">
                            {editingId && (
                                <button
                                    type="button"
                                    onClick={handleResendReminder}
                                    disabled={isResending}
                                    className="flex items-center gap-2 px-4 py-2 bg-green-50 hover:bg-green-100 text-green-700 font-bold rounded-lg transition-colors border border-green-200 text-sm disabled:opacity-50"
                                >
                                    <FaPaperPlane className={isResending ? 'animate-pulse' : ''} />
                                    {isResending ? 'Enviando...' : 'Reenviar Lembrete'}
                                </button>
                            )}
                            {editingId && (() => {
                                const hasRecord = records.some(r => String(r.appointmentId || r.appointment_id) === String(editingId));
                                const isActiveNow = activeConsultations.some(c => String(c.appointmentId) === String(editingId));
                                
                                if (hasRecord) {
                                    return (
                                        <div className="flex items-center gap-2 px-4 py-2 bg-slate-100 text-slate-500 font-bold rounded-lg border border-slate-200 text-xs sm:text-sm cursor-default" title="Prontuário já assinado">
                                            <FaFileMedicalAlt className="text-slate-400" /> Prontuário Salvo
                                        </div>
                                    );
                                }
                                if (isActiveNow) {
                                    return (
                                        <div className="flex items-center gap-1.5 px-4 py-2 bg-emerald-50 text-emerald-700 font-bold rounded-lg border border-emerald-200 text-xs sm:text-sm">
                                            <span className="w-2 h-2 bg-emerald-500 rounded-full animate-pulse"></span>
                                            Em andamento
                                        </div>
                                    );
                                }
                                return (
                                    <button
                                        type="button"
                                        onClick={handleStartConsultation}
                                        className="flex items-center gap-2 px-4 py-2 bg-primary/10 hover:bg-primary/20 text-primary font-bold rounded-lg transition-all hover:scale-105 border border-primary/20 text-xs sm:text-sm"
                                    >
                                        <FaPlay className="text-[10px]" /> Iniciar Consulta
                                    </button>
                                );
                            })()}
                            <button type="button" className="btn-secondary" onClick={() => setIsModalOpen(false)}>Cancelar</button>
                            <button type="submit" className="btn-primary" style={{ margin: 0 }}>{editingId ? "Salvar Alterações" : "Confirmar Agendamento"}</button>
                        </div>
                    </div>
                </form>
            </Modal>

            <Modal isOpen={isRecordModalOpen} onClose={() => setIsRecordModalOpen(false)} title="Finalização de Atendimento" size="large">
                <form onSubmit={handleSaveRecord} className="space-y-5">
                    
                    {/* IA Block */}
                    {aiConfigured && (
                        <div className="bg-violet-50 border border-violet-200 rounded-xl p-4 space-y-3 animate-in fade-in duration-300">
                            <div className="flex items-center justify-between">
                                <div className="flex items-center gap-2">
                                    <FaRobot className="text-violet-600 text-lg" />
                                    <div>
                                        <h4 className="font-bold text-sm text-violet-800">Transcrição IA</h4>
                                        <p className="text-[11px] text-violet-600">Grave a consulta e o prontuário será preenchido automaticamente.</p>
                                    </div>
                                </div>
                                {!isRecording ? (
                                    <button
                                        type="button"
                                        onClick={handleStartRecording}
                                        disabled={isTranscribing}
                                        className="flex items-center gap-2 px-4 py-2 bg-violet-600 hover:bg-violet-700 disabled:opacity-50 text-white font-bold rounded-lg text-sm transition-colors shadow-md shadow-violet-500/20"
                                    >
                                        <FaMicrophone />
                                        Gravar Consulta
                                    </button>
                                ) : (
                                    <button
                                        type="button"
                                        onClick={handleStopRecording}
                                        className="flex items-center gap-2 px-4 py-2 bg-red-600 hover:bg-red-700 text-white font-bold rounded-lg text-sm transition-colors animate-pulse shadow-md shadow-red-500/20"
                                    >
                                        <FaStop />
                                        Parar Gravação
                                    </button>
                                )}
                            </div>

                            {isTranscribing && (
                                <div className="flex items-center gap-2 text-sm text-violet-700 font-medium p-3 bg-white rounded-lg border border-violet-100">
                                    <svg className="animate-spin h-4 w-4 text-violet-600" fill="none" viewBox="0 0 24 24">
                                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z"></path>
                                    </svg>
                                    Transcrevendo e gerando prontuário via IA... Aguarde (pode levar alguns segundos).
                                </div>
                            )}

                            {transcriptionResult && !isTranscribing && (
                                <div className="space-y-1">
                                    <p className="text-[11px] font-bold text-violet-700 uppercase tracking-wider">Transcrição bruta:</p>
                                    <div className="text-xs text-slate-600 bg-white border border-violet-100 rounded-lg p-3 max-h-24 overflow-y-auto whitespace-pre-wrap leading-relaxed">
                                        {transcriptionResult}
                                    </div>
                                    <p className="text-[10px] text-violet-500 italic">Revise os campos gerados abaixo antes de salvar.</p>
                                </div>
                            )}
                        </div>
                    )}

                    <div className="bg-slate-50 p-4 rounded-xl border border-slate-200">
                        <p className="text-sm text-slate-600 mb-4">
                            Insira os dados clínicos da consulta médica. O tempo decorrido no cronômetro 
                            já foi inserido no campo Evolução.
                        </p>
                        <div className="space-y-4">
                            <div>
                                <label className="text-slate-700 font-bold block mb-2"><FaFileMedicalAlt className="inline mr-2 text-primary" /> Descrição M&eacute;dica (Evolução / Anamnese)</label>
                                <textarea
                                    className="form-control resize-none"
                                    rows="6"
                                    placeholder="Descreva todo o histórico da consulta..."
                                    value={recordData.description}
                                    onChange={(e) => setRecordData({ ...recordData, description: e.target.value })}
                                    required
                                ></textarea>
                            </div>
                            <div className="bg-blue-50/50 p-4 rounded-xl border border-blue-100">
                                <label className="text-blue-700 font-bold block mb-2"><FaPrescriptionBottleAlt className="inline mr-2" /> Prescrição Médica</label>
                                <textarea
                                    className="form-control resize-y"
                                    rows="4"
                                    placeholder="(Opcional) Quais medicamentos prescreveu para usar onde?"
                                    value={recordData.prescription}
                                    onChange={(e) => setRecordData({ ...recordData, prescription: e.target.value })}
                                ></textarea>
                            </div>
                        </div>
                    </div>
                    <div className="modal-footer flex items-center pt-6 mt-6 border-t border-slate-100 -mx-6 -mb-6 px-6 bg-slate-50 rounded-b-xl gap-3">
                        <button type="button" className="btn-secondary ml-auto" onClick={() => setIsRecordModalOpen(false)}>Continuar Atendimento</button>
                        <button type="submit" disabled={isSavingRecord} className="btn-primary" style={{ margin: 0 }}>
                            {isSavingRecord ? 'Salvando...' : 'Finalizar e Assinar Prontuário'}
                        </button>
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
