import { useState, useEffect, useRef } from 'react';
import axios from '../api/axiosConfig';
import Modal from '../components/Modal';
import ConfirmModal from '../components/ConfirmModal';
import Select from 'react-select';
import toast from 'react-hot-toast';
import { FaUserMd, FaClock, FaFileMedicalAlt, FaPlay, FaRobot, FaMicrophone, FaStop, FaPrescriptionBottleAlt, FaBed, FaCheckCircle, FaBan, FaTimesCircle } from 'react-icons/fa';
import { transcribeAudio, getCompanyInfo } from '../services/aiService';

const STORAGE_KEY = 'activeConsultations';

const formatTime = (seconds) => {
    const hrs = Math.floor(seconds / 3600);
    const mins = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;
    if (hrs > 0) return `${String(hrs).padStart(2, '0')}:${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
    return `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
};

const AtendimentosPage = () => {
    const [appointments, setAppointments] = useState([]);
    const [doctors, setDoctors] = useState([]);
    const [patients, setPatients] = useState([]);
    const [records, setRecords] = useState([]);

    const [activeConsultations, setActiveConsultations] = useState([]);
    const [, setTick] = useState(0); // force re-render for timers

    const [selectedDoctor, setSelectedDoctor] = useState('all');

    // Record modal
    const [isRecordModalOpen, setIsRecordModalOpen] = useState(false);
    const [recordingConsultation, setRecordingConsultation] = useState(null);
    const [recordData, setRecordData] = useState({ description: '', prescription: '' });
    const [isSavingRecord, setIsSavingRecord] = useState(false);

    // AI
    const [aiConfigured, setAiConfigured] = useState(false);
    const [isRecording, setIsRecording] = useState(false);
    const [isTranscribing, setIsTranscribing] = useState(false);
    const [transcriptionResult, setTranscriptionResult] = useState(null);
    const [activeRecordingId, setActiveRecordingId] = useState(null); // appointmentId da consulta sendo gravada
    const mediaRecorderRef = useRef(null);
    const audioChunksRef = useRef([]);

    // Encerrar sem prontuário
    const [isConfirmConcludeOpen, setIsConfirmConcludeOpen] = useState(false);
    const [concludingConsultation, setConcludingConsultation] = useState(null);

    // ---- Data load ----
    const fetchData = async () => {
        try {
            const t = Date.now();
            const [appRes, docRes, patRes, recRes] = await Promise.all([
                axios.get(`/appointments?t=${t}&limit=5000`),
                axios.get(`/doctors?t=${t}`),
                axios.get(`/patients?t=${t}&limit=5000`),
                axios.get(`/records?t=${t}`),
            ]);
            setAppointments(appRes.data.data || appRes.data || []);
            setDoctors(docRes.data);
            setPatients(patRes.data.data || patRes.data || []);
            setRecords(Array.isArray(recRes.data) ? recRes.data : []);
        } catch (e) {
            console.error('Erro ao buscar dados', e);
        }
    };

    useEffect(() => {
        fetchData();
        getCompanyInfo().then(r => setAiConfigured(r.data?.ai_configured || false)).catch(() => {});
    }, []);

    // Load persisted active consultations
    useEffect(() => {
        try {
            const saved = localStorage.getItem(STORAGE_KEY);
            if (saved) setActiveConsultations(JSON.parse(saved));
        } catch { /* ignore */ }
    }, []);

    // Tick every second while there are active consultations
    useEffect(() => {
        if (activeConsultations.length === 0) return;
        const id = setInterval(() => setTick(t => t + 1), 1000);
        return () => clearInterval(id);
    }, [activeConsultations.length]);

    const persistConsultations = (list) => {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(list));
        setActiveConsultations(list);
    };

    // ---- Start consultation ----
    const handleStart = (app) => {
        const exists = activeConsultations.some(c => String(c.appointmentId) === String(app.id));
        if (exists) { toast.error('Esta consulta já está em andamento.'); return; }
        const entry = {
            appointmentId: app.id,
            patientId: app.patient_id || app.user_id,
            doctorId: app.doctor_id,
            startTime: Date.now(),
            is_return: !!app.is_return
        };
        persistConsultations([...activeConsultations, entry]);
        toast.success('Atendimento iniciado!', { icon: '⏱️' });
    };

    // ---- Finalize (open modal) — para acionar pelo card ----
    const handleFinalizeClick = (activeConsultation) => {
        // Se estiver gravando ESTA consulta, para antes de abrir o modal
        if (isRecording && activeRecordingId === activeConsultation.appointmentId) {
            if (mediaRecorderRef.current) mediaRecorderRef.current.stop();
            setIsRecording(false);
            setActiveRecordingId(null);
            // onstop vai disparar de forma assíncrona e preencher o prontuário
        }
        setRecordingConsultation(activeConsultation);
        setRecordData({ description: '', prescription: '' });
        // Só limpa a transcrição se não era esta consulta que estava gravando
        if (activeRecordingId !== activeConsultation.appointmentId) {
            setTranscriptionResult(null);
        }
        setIsRecordModalOpen(true);
    };

    // ---- Save record ----
    const handleSaveRecord = async (e) => {
        e.preventDefault();
        if (!recordingConsultation || isSavingRecord) return;
        setIsSavingRecord(true);
        const elapsed = Math.floor((Date.now() - recordingConsultation.startTime) / 1000);
        try {
            await axios.post('/appointments/records', {
                appointmentId: recordingConsultation.appointmentId,
                description: recordData.description,
                prescription: recordData.prescription,
                duration_seconds: elapsed,
            });
            toast.success('Prontuário salvo e consulta finalizada!');
            const updated = activeConsultations.filter(c => String(c.appointmentId) !== String(recordingConsultation.appointmentId));
            persistConsultations(updated);
            setIsRecordModalOpen(false);
            setRecordingConsultation(null);
            setTranscriptionResult(null);
            fetchData();
        } catch {
            toast.error('Erro ao salvar prontuário.');
        } finally {
            setIsSavingRecord(false);
        }
    };

    // ---- AI recording ----
    // consultation: objeto da activeConsultation (card) ou recordingConsultation (modal)
    const handleStartRecording = async (consultation) => {
        const cons = consultation || recordingConsultation;
        if (!cons) return;
        try {
            const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
            const mr = new MediaRecorder(stream, { mimeType: 'audio/webm' });
            audioChunksRef.current = [];
            mr.ondataavailable = (ev) => { if (ev.data.size > 0) audioChunksRef.current.push(ev.data); };
            mr.onstop = async () => {
                stream.getTracks().forEach(t => t.stop());
                const blob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
                setIsTranscribing(true);
                setTranscriptionResult(null);
                try {
                    const patientName = patients.find(p => String(p.id) === String(cons.patientId))?.name || 'Paciente';
                    const res = await transcribeAudio(blob, patientName);
                    const { transcription, medical_record } = res.data;
                    setTranscriptionResult(transcription);
                    setRecordData(prev => ({
                        description: medical_record?.description || prev.description,
                        prescription: medical_record?.prescription || prev.prescription,
                    }));
                    toast.success('Prontuário gerado pela IA! Abra o modal para finalizar.', { duration: 4000, icon: '🤖' });
                } catch (err) {
                    toast.error(err.response?.data?.error || 'Erro ao transcrever o áudio.');
                } finally { setIsTranscribing(false); }
            };
            mediaRecorderRef.current = mr;
            mr.start();
            setIsRecording(true);
            setActiveRecordingId(cons.appointmentId);
            setRecordingConsultation(cons);
        } catch { toast.error('Não foi possível acessar o microfone.'); }
    };

    const handleStopRecording = () => {
        if (mediaRecorderRef.current && isRecording) {
            mediaRecorderRef.current.stop();
            setIsRecording(false);
            setActiveRecordingId(null);
        }
    };

    // ---- Gravação a partir do card ----
    const handleStartRecordingForCard = (activeConsultation) => {
        handleStartRecording(activeConsultation);
    };

    // ---- Encerrar sem prontuário ----
    const handleOpenConcludeConfirm = (consultation) => {
        setConcludingConsultation(consultation);
        setIsConfirmConcludeOpen(true);
    };

    const handleConfirmConclude = async () => {
        if (!concludingConsultation) return;
        try {
            await axios.patch(`/appointments/${concludingConsultation.appointmentId}/conclude`);
            toast.success('Atendimento encerrado sem prontuário.', { icon: '⚠️' });
            const updated = activeConsultations.filter(
                c => String(c.appointmentId) !== String(concludingConsultation.appointmentId)
            );
            persistConsultations(updated);
            setIsConfirmConcludeOpen(false);
            setIsRecordModalOpen(false);
            setConcludingConsultation(null);
            fetchData();
        } catch (err) {
            const msg = err.response?.data?.error || 'Erro ao encerrar atendimento.';
            toast.error(msg);
            throw err; // para o ConfirmModal tratar o loading
        }
    };

    // ---- Derived data ----
    const getActive = (app) => activeConsultations.find(c => String(c.appointmentId) === String(app.id));
    const hasRecord = (app) => records.some(r => String(r.appointmentId || r.appointment_id) === String(app.id));
    const isConcluded = (app) => app.concluded_at != null;

    // Today's appointments (past or present, not too far in the future)
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today); tomorrow.setDate(today.getDate() + 1);

    const todayApps = appointments.filter(app => {
        const d = new Date(String(app.date).split('Z')[0]);
        return d >= today && d < tomorrow;
    });

    const doctorOptions = [
        { value: 'all', label: 'Todos os Médicos' },
        ...doctors
            .filter(doc => todayApps.some(a => String(a.doctor_id) === String(doc.id)))
            .map(doc => ({ value: String(doc.id), label: `Dr. ${doc.name}` }))
    ];

    const filtered = selectedDoctor === 'all'
        ? todayApps
        : todayApps.filter(a => String(a.doctor_id) === String(selectedDoctor));

    const waiting = filtered.filter(a => !getActive(a) && !hasRecord(a) && !isConcluded(a));
    const ongoing = filtered.filter(a => !!getActive(a));
    const done    = filtered.filter(a => hasRecord(a) || isConcluded(a));

    const resolvePatient = (app) => patients.find(p => String(p.id) === String(app.patient_id || app.user_id));
    const resolveDoctor  = (app) => doctors.find(d => String(d.id) === String(app.doctor_id));

    const AppointmentCard = ({ app, status }) => {
        const pat = resolvePatient(app);
        const doc = resolveDoctor(app);
        const active = getActive(app);
        const elapsed = active ? Math.floor((Date.now() - active.startTime) / 1000) : 0;
        const appTime = new Date(String(app.date).split('Z')[0]);

        return (
            <div className={`bg-white rounded-2xl border shadow-sm transition-all duration-300 overflow-hidden ${
                status === 'ongoing'  ? 'border-emerald-200 shadow-emerald-100' :
                status === 'done'     ? 'border-slate-100 opacity-70' :
                                        'border-slate-200 hover:border-primary/30 hover:shadow-md'
            }`}>
                {/* Left accent bar */}
                <div className="flex">
                    <div className="w-1.5 flex-shrink-0 rounded-l-none" style={{ backgroundColor: status === 'ongoing' ? '#10b981' : status === 'done' ? '#94a3b8' : (doc?.color || '#6c5be4') }}></div>
                    <div className="flex-1 p-4">
                        <div className="flex items-center justify-between gap-3 flex-wrap">
                            {/* Patient + Doc */}
                            <div className="flex items-center gap-3">
                                <div className="w-10 h-10 rounded-full flex items-center justify-center text-white font-bold text-sm shadow-sm flex-shrink-0"
                                    style={{ backgroundColor: doc?.color || '#6c5be4' }}>
                                    {pat?.name?.charAt(0) || '?'}
                                </div>
                                <div>
                                    <p className="font-bold text-slate-800 text-sm leading-tight">{pat?.name || 'Paciente desconhecido'}</p>
                                    <div className="flex items-center gap-2 mt-0.5">
                                        <p className="text-xs text-slate-400">c/ Dr. {doc?.name?.replace('Dr. ', '') || '—'}</p>
                                        {app.is_return && (
                                            <span className="text-[10px] bg-indigo-100 text-indigo-700 font-bold px-1.5 py-0.5 rounded border border-indigo-200 uppercase tracking-tighter">Retorno</span>
                                        )}
                                    </div>
                                    <p className="text-[11px] text-slate-400 font-mono mt-0.5">
                                        {String(appTime.getHours()).padStart(2,'0')}:{String(appTime.getMinutes()).padStart(2,'0')}
                                    </p>
                                </div>
                            </div>

                            {/* Right side: timer or action */}
                            <div className="flex items-center gap-3 ml-auto flex-wrap justify-end">
                                {status === 'ongoing' && (
                                    <>
                                        {/* Timer */}
                                        <div className="flex items-center gap-1.5 bg-emerald-50 border border-emerald-200 rounded-xl px-3 py-1.5">
                                            <FaClock className="text-emerald-500 text-xs animate-pulse" />
                                            <span className="font-mono font-bold text-emerald-700 text-sm">{formatTime(elapsed)}</span>
                                        </div>

                                        {/* Botão de gravação (apenas se IA configurada) */}
                                        {aiConfigured && (
                                            activeRecordingId === active.appointmentId ? (
                                                isTranscribing ? (
                                                    <button disabled
                                                        className="flex items-center gap-2 px-3 py-2 bg-violet-100 text-violet-500 font-bold rounded-xl text-sm opacity-80 cursor-not-allowed border border-violet-200"
                                                    >
                                                        <svg className="animate-spin h-3.5 w-3.5" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z"/></svg>
                                                        IA processando…
                                                    </button>
                                                ) : (
                                                    <button onClick={handleStopRecording}
                                                        className="flex items-center gap-2 px-3 py-2 bg-red-500 hover:bg-red-600 text-white font-bold rounded-xl text-sm transition-all shadow-sm shadow-red-200"
                                                        title="Parar gravação e transcrever"
                                                    >
                                                        <FaStop className="text-xs" /> Parar Gravação
                                                    </button>
                                                )
                                            ) : (
                                                <button
                                                    onClick={() => handleStartRecordingForCard(active)}
                                                    disabled={isRecording || isTranscribing}
                                                    className="flex items-center gap-2 px-3 py-2 bg-violet-600 hover:bg-violet-700 disabled:opacity-40 disabled:cursor-not-allowed text-white font-bold rounded-xl text-sm transition-all hover:scale-105 shadow-sm shadow-violet-300"
                                                    title={isRecording ? 'Já existe uma gravação em andamento' : 'Gravar consulta para transcrição por IA'}
                                                >
                                                    <FaMicrophone className="text-xs" /> Gravar
                                                </button>
                                            )
                                        )}

                                        {/* Botão Finalizar */}
                                        <button
                                            onClick={() => handleFinalizeClick(active)}
                                            className="flex items-center gap-2 px-4 py-2 bg-emerald-500 hover:bg-emerald-600 text-white font-bold rounded-xl text-sm transition-all hover:scale-105 shadow-sm shadow-emerald-200"
                                        >
                                            <FaFileMedicalAlt /> Finalizar
                                        </button>
                                    </>
                                )}
                                {status === 'waiting' && (
                                    <button
                                        onClick={() => handleStart(app)}
                                        className="flex items-center gap-2 px-4 py-2 bg-primary hover:bg-primary/90 text-white font-bold rounded-xl text-sm transition-all hover:scale-105 shadow-sm shadow-primary/20"
                                    >
                                        <FaPlay className="text-[10px]" /> Iniciar Consulta
                                    </button>
                                )}
                                {status === 'done' && (
                                    hasRecord(app) ? (
                                        <span className="flex items-center gap-1.5 text-xs font-bold text-slate-400 bg-slate-50 border border-slate-200 rounded-xl px-3 py-2">
                                            <FaCheckCircle className="text-emerald-400" /> Prontuário Salvo
                                        </span>
                                    ) : (
                                        <span className="flex items-center gap-1.5 text-xs font-bold text-amber-500 bg-amber-50 border border-amber-200 rounded-xl px-3 py-2">
                                            <FaTimesCircle className="text-amber-400" /> Encerrado s/ Prontuário
                                        </span>
                                    )
                                )}
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        );
    };

    const Section = ({ title, color, icon: Icon, items, status, emptyMsg }) => (
        <div>
            <div className={`flex items-center gap-2 mb-3`}>
                <div className={`w-2 h-2 rounded-full ${color}`}></div>
                <h3 className="font-bold text-sm text-slate-600 uppercase tracking-wider">{title}</h3>
                <span className="ml-1 text-xs font-bold text-slate-400 bg-slate-100 px-2 py-0.5 rounded-full">{items.length}</span>
            </div>
            {items.length === 0 ? (
                <div className="text-center py-8 text-slate-400 text-sm bg-slate-50 rounded-2xl border border-dashed border-slate-200">
                    {emptyMsg}
                </div>
            ) : (
                <div className="space-y-3">
                    {items.map(app => <AppointmentCard key={app.id} app={app} status={status} />)}
                </div>
            )}
        </div>
    );

    return (
        <div className="space-y-6 animate-in slide-in-from-bottom-4 duration-500 fade-in">
            {/* Header */}
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                <div>
                    <h2 className="text-2xl font-bold text-slate-800 tracking-tight">Sala de Atendimento</h2>
                    <p className="text-sm text-slate-500 mt-1">Gerencie as consultas de hoje em tempo real. Inicie e finalize atendimentos com um clique.</p>
                </div>
                {/* Doctor filter */}
                <div className="flex items-center gap-3 bg-white border border-slate-200 rounded-xl px-3 py-2 shadow-sm">
                    <FaUserMd className="text-primary opacity-60" />
                    <div className="min-w-[200px]">
                        <Select
                            options={doctorOptions}
                            value={doctorOptions.find(o => o.value === selectedDoctor) || doctorOptions[0]}
                            onChange={sel => setSelectedDoctor(sel ? sel.value : 'all')}
                            className="text-sm font-bold"
                            classNamePrefix="react-select"
                            isSearchable={false}
                            styles={{
                                control: (base) => ({ ...base, border: 'none', boxShadow: 'none', minHeight: '30px' }),
                                valueContainer: (base) => ({ ...base, padding: '0' }),
                            }}
                        />
                    </div>
                </div>
            </div>

            {/* Stats row */}
            <div className="grid grid-cols-3 gap-4">
                {[
                    { label: 'Aguardando', count: waiting.length, color: 'text-primary', bg: 'bg-primary/10', dot: 'bg-primary' },
                    { label: 'Em Atendimento', count: ongoing.length, color: 'text-emerald-600', bg: 'bg-emerald-50', dot: 'bg-emerald-500 animate-pulse' },
                    { label: 'Finalizados', count: done.length, color: 'text-slate-500', bg: 'bg-slate-50', dot: 'bg-slate-400' },
                ].map(s => (
                    <div key={s.label} className={`${s.bg} rounded-2xl p-4 flex items-center gap-3 border border-white shadow-sm`}>
                        <div className={`w-3 h-3 rounded-full ${s.dot}`}></div>
                        <div>
                            <p className={`text-2xl font-bold ${s.color}`}>{s.count}</p>
                            <p className="text-xs text-slate-500 font-medium">{s.label}</p>
                        </div>
                    </div>
                ))}
            </div>

            {/* No appointments today */}
            {filtered.length === 0 && (
                <div className="flex flex-col items-center justify-center py-20 text-slate-400 gap-4">
                    <FaBed className="text-5xl opacity-30" />
                    <p className="font-semibold text-lg">Nenhuma consulta agendada para hoje</p>
                    <p className="text-sm">Os agendamentos de hoje aparecerão aqui automaticamente.</p>
                </div>
            )}

            {/* Sections */}
            {filtered.length > 0 && (
                <div className="space-y-8">
                    <Section title="Em Atendimento" color="bg-emerald-500" items={ongoing} status="ongoing" emptyMsg="Nenhuma consulta em andamento." />
                    <Section title="Aguardando" color="bg-primary" items={waiting} status="waiting" emptyMsg="Todos os pacientes já foram atendidos!" />
                    <Section title="Finalizados" color="bg-slate-400" items={done} status="done" emptyMsg="Nenhuma consulta finalizada ainda." />
                </div>
            )}

            {/* ---- Record Modal ---- */}
            <Modal isOpen={isRecordModalOpen} onClose={() => setIsRecordModalOpen(false)} title="Finalização de Atendimento" size="large">
                <form onSubmit={handleSaveRecord} className="space-y-5">
                    {/* Timer info */}
                    {recordingConsultation && (
                        <div className="flex items-center gap-3 bg-emerald-50 border border-emerald-200 rounded-xl px-4 py-3">
                            <FaClock className="text-emerald-500" />
                            <div>
                                <p className="text-xs text-emerald-600 font-bold uppercase tracking-wide">Tempo de Consulta</p>
                                <p className="font-mono font-bold text-emerald-800 text-lg">
                                    {formatTime(Math.floor((Date.now() - recordingConsultation.startTime) / 1000))}
                                </p>
                            </div>
                            <div className="ml-auto text-right">
                                <p className="text-xs text-slate-500">Paciente</p>
                                <p className="font-bold text-sm text-slate-700">
                                    {patients.find(p => String(p.id) === String(recordingConsultation.patientId))?.name || '—'}
                                </p>
                            </div>
                        </div>
                    )}

                    {/* AI Block */}
                    {aiConfigured && (
                        <div className="bg-violet-50 border border-violet-200 rounded-xl p-4 space-y-3">
                            <div className="flex items-center justify-between">
                                <div className="flex items-center gap-2">
                                    <FaRobot className="text-violet-600 text-lg" />
                                    <div>
                                        <h4 className="font-bold text-sm text-violet-800">Transcrição por IA</h4>
                                        <p className="text-[11px] text-violet-600">Grave a consulta e o prontuário é preenchido automaticamente.</p>
                                    </div>
                                </div>
                                {!isRecording ? (
                                    <button type="button" onClick={handleStartRecording} disabled={isTranscribing}
                                        className="flex items-center gap-2 px-4 py-2 bg-violet-600 hover:bg-violet-700 disabled:opacity-50 text-white font-bold rounded-lg text-sm transition-colors shadow-md shadow-violet-500/20">
                                        <FaMicrophone /> Gravar
                                    </button>
                                ) : (
                                    <button type="button" onClick={handleStopRecording}
                                        className="flex items-center gap-2 px-4 py-2 bg-red-500 hover:bg-red-600 text-white font-bold rounded-lg text-sm transition-colors animate-pulse">
                                        <FaStop /> Parar
                                    </button>
                                )}
                            </div>
                            {isTranscribing && (
                                <div className="flex items-center gap-2 text-sm text-violet-700 font-medium p-3 bg-white rounded-lg border border-violet-100">
                                    <svg className="animate-spin h-4 w-4 text-violet-600" fill="none" viewBox="0 0 24 24">
                                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z"></path>
                                    </svg>
                                    Transcrevendo via IA…
                                </div>
                            )}
                            {transcriptionResult && !isTranscribing && (
                                <div>
                                    <p className="text-[11px] font-bold text-violet-700 uppercase tracking-wider mb-1">Transcrição bruta:</p>
                                    <div className="text-xs text-slate-600 bg-white border border-violet-100 rounded-lg p-3 max-h-20 overflow-y-auto whitespace-pre-wrap">
                                        {transcriptionResult}
                                    </div>
                                </div>
                            )}
                        </div>
                    )}

                    {/* Fields */}
                    <div className="space-y-4">
                        <div>
                            <label className="font-bold text-sm text-slate-700 block mb-2">
                                <FaFileMedicalAlt className="inline mr-2 text-primary" />
                                Descrição Médica (Evolução / Anamnese)
                            </label>
                            <textarea className="form-control resize-none" rows="6" required
                                placeholder="Paciente com quadro de… descreva a evolução ou diagnóstico."
                                value={recordData.description}
                                onChange={e => setRecordData({ ...recordData, description: e.target.value })}
                            />
                        </div>
                        <div className="bg-blue-50 p-4 rounded-xl border border-blue-100">
                            <label className="font-bold text-sm text-blue-700 block mb-2">
                                <FaPrescriptionBottleAlt className="inline mr-2" />
                                Prescrição Médica <span className="font-normal text-blue-400">(Opcional)</span>
                            </label>
                            <textarea className="form-control resize-y" rows="4"
                                placeholder="Medicamentos, dosagens e condutas prescritas..."
                                value={recordData.prescription}
                                onChange={e => setRecordData({ ...recordData, prescription: e.target.value })}
                            />
                        </div>
                    </div>

                    <div className="modal-footer flex items-center pt-5 mt-5 border-t border-slate-100 -mx-6 -mb-6 px-6 bg-slate-50 rounded-b-xl gap-3 flex-wrap">
                        <button type="button" className="btn-secondary" onClick={() => setIsRecordModalOpen(false)}>Continuar Depois</button>
                        {/* Encerrar sem prontuário */}
                        <button
                            type="button"
                            className="flex items-center gap-2 px-4 py-2 text-sm font-bold text-red-600 border border-red-200 bg-white hover:bg-red-50 rounded-xl transition-all ml-auto"
                            onClick={() => handleOpenConcludeConfirm(recordingConsultation)}
                            title="Encerra o atendimento sem criar prontuário clínico"
                        >
                            <FaBan className="text-xs" /> Encerrar Sem Prontuário
                        </button>
                        <button type="submit" disabled={isSavingRecord} className="btn-primary" style={{ margin: 0 }}>
                            {isSavingRecord ? 'Salvando...' : 'Finalizar e Assinar Prontuário'}
                        </button>
                    </div>
                </form>
            </Modal>

            {/* ---- Confirmar encerramento sem prontuário ---- */}
            <ConfirmModal
                isOpen={isConfirmConcludeOpen}
                onClose={() => setIsConfirmConcludeOpen(false)}
                onConfirm={handleConfirmConclude}
                title="Encerrar Sem Prontuário"
                message={`Deseja encerrar o atendimento de ${patients.find(p => String(p.id) === String(concludingConsultation?.patientId))?.name || 'este paciente'} sem criar um prontuário clínico? Esta ação não poderá ser desfeita.`}
                confirmText="Sim, Encerrar"
                cancelText="Voltar"
                type="danger"
            />
        </div>
    );
};

export default AtendimentosPage;
