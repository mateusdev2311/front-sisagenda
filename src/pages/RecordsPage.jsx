import { useState, useEffect, useRef } from 'react';
import axios from '../api/axiosConfig';
import toast from 'react-hot-toast';
import Modal from '../components/Modal';
import ConfirmModal from '../components/ConfirmModal';
import { FaHeartbeat, FaSearch, FaFilter, FaFileMedicalAlt, FaPrescriptionBottleAlt, FaStethoscope, FaNotesMedical, FaChevronDown, FaEdit, FaTrash, FaFilePdf, FaPlus, FaFileUpload, FaMicrophone, FaStop, FaRobot } from 'react-icons/fa';
import Select from 'react-select';
import html2canvas from 'html2canvas';
import { jsPDF } from 'jspdf';
import { useSettings } from '../context/SettingsContext';
import { transcribeAudio, getCompanyInfo } from '../services/aiService';

const CLINICAL_TEMPLATES = [
    { label: "Checkup Padrão", text: "Paciente comparece para checkup de rotina. Nega queixas agudas.\n\nPA: 120/80 mmHg\nFC: 75 bpm\n\nConduta: Solicitados exames laboratoriais de rotina." },
    { label: "Sintomas Gripais", text: "Paciente relata coriza, tosse produtiva e febre não aferida há 3 dias. Nega dispneia.\n\nOroscopia: hiperemia leve\nAusculta Pulmonar: murmúrio vesicular universalmente audível, sem ruídos adventícios.\n\nConduta: Sintomáticos e hidratação oral." },
    { label: "Retorno (Exames)", text: "Retorno para avaliação de exames. Resultados dentro dos limites de normalidade.\n\nConduta: Orientações gerais de saúde mantidas. Alta ambulatorial." }
];

const PRESCRIPTION_TEMPLATES = [
    { label: "Analgésico Simples", text: "1. Dipirona 500mg\nTomar 01 comprimido, via oral, de 6/6 horas, em caso de dor ou febre." },
    { label: "Kit Gripe", text: "1. Ibuprofeno 400mg\nTomar 01 comprimido de 8/8h por 5 dias.\n\n2. Xarope Expectorante (Guaifenesina)\nTomar 10ml de 8/8h por 5 dias." },
    { label: "Antibiótico Único", text: "1. Amoxicilina 500mg\nTomar 01 comprimido, via oral, de 8/8h, por 7 dias." }
];



const RecordsPage = () => {
    const { settings } = useSettings();
    /**
     * Listas de Componentes Globais (Cross-Component Data)
     * Numa aplicação Enterprise (maior), essas listas normalmente iriam pra um estado Global (Redux/Zustand) ou cache (React Query).
     */
    const [records, setRecords] = useState([]);
    const [patients, setPatients] = useState([]);
    const [doctors, setDoctors] = useState([]);

    /**
     * Estados de Seleção de Interface
     * Controlam os filtros e drop-downs ativos na tela de relatórios.
     */
    const [selectedPatientId, setSelectedPatientId] = useState('');
    const [selectedDoctorFilter, setSelectedDoctorFilter] = useState('');
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [attachments, setAttachments] = useState({});
    const [isLoadingRecords, setIsLoadingRecords] = useState(false);
    const [currentPage, setCurrentPage] = useState(1);
    const recordsPerPage = 3;

    // Financial Integration State
    const [billingRecords, setBillingRecords] = useState([]);

    // ─── IA: Estado de Gravação de Áudio ────────────────────────────────────────────
    const [aiConfigured, setAiConfigured] = useState(false);
    const [isRecording, setIsRecording] = useState(false);
    const [isTranscribing, setIsTranscribing] = useState(false);
    const [transcriptionResult, setTranscriptionResult] = useState(null);
    const mediaRecorderRef = useRef(null);
    const audioChunksRef = useRef([]);



    /**
     * Constelação de Dados (Filtro Cruzado)
     * @property {Array} patientAppointments - Agendamentos vinculados EXCLUSIVAMENTE ao paciente selecionado na barra de pesquisa. Essencial para linkar um Prontuário Médico novo à sua "Consulta Mãe".
     */
    const [formData, setFormData] = useState({
        appointmentId: '',
        description: '',
        prescription: '',
        integrateBilling: false,
        billingAmount: '',
        paymentMethod: 'Cartão de Crédito'
    });
    const [patientAppointments, setPatientAppointments] = useState([]);
    const [editingId, setEditingId] = useState(null);
    const [confirmDialog, setConfirmDialog] = useState({ isOpen: false, title: '', message: '', type: 'primary', onConfirm: null });

    /**
     * Hook de Inicialização
     * Busca os dicionários de dados principais (Todos os Pacientes e Todos os Médicos) para montar a renderização inicial na tela.
     */
    useEffect(() => {
        fetchInitialData();
        // Checar se a IA está configurada
        getCompanyInfo()
            .then(res => setAiConfigured(res.data?.ai_configured || false))
            .catch(() => {});
    }, []);

    /**
     * Hook Reativo ao Paciente Selecionado
     * Sempre que o atendente escolhe um Paciente na barra de filtros da Home de Prontuários, esse efeito dispara:
     * 1. Busca todo o histórico de prontuários médicos daquele paciente (Timeline Médica).
     * 2. Busca todas as consultas de agenda daquele paciente para preencher o formulário onde referenciamos a consulta nova (Agendamentos Préveis).
     */
    useEffect(() => {
        if (selectedPatientId) {
            setCurrentPage(1); // Reseta a paginação ao trocar de paciente
            // Buscar histórico de consultas e cruzar com todos os registros de prontuário do back
            fetchRecords(selectedPatientId);

            // Financial Integration: Buscar Faturamento do paciente (opcional, pegamos tudo por agora para simplificar)
            axios.get('/billing').then(billRes => {
                setBillingRecords(billRes.data);
            }).catch(err => console.error("Billing fetch error:", err));
        } else {
            // Limpar/Zerar a memória caso a pesquisa do paciente seja cancelada estrelinha X
            setRecords([]);
            setPatientAppointments([]);
        }
    }, [selectedPatientId]);

    /**
     * API: Busca Inicial dos Dicionários
     * Requisições GET Paralelas (Promise.all) buscando em:
     * 1. GET /patients -> Preencher a pesquisa Select do Filtro
     * 2. GET /doctors -> Necessário pra referenciar e dar a Badge e a Cor com o nome do Médico no histórico do cartão.
     */
    const fetchInitialData = async () => {
        try {
            const [patRes, docRes] = await Promise.all([
                axios.get('/patients'),
                axios.get('/doctors')
            ]);
            setPatients(patRes.data);
            setDoctors(docRes.data);
        } catch (error) {
            console.error('Initial records data error', error);
        }
    };

    /**
     * API: Busca Unificada Global /records e Cruzamento de Agendamentos /appointments
     */
    const fetchRecords = async (patientId) => {
        try {
            setIsLoadingRecords(true);
            const [recRes, appRes] = await Promise.all([
                axios.get('/records'),
                axios.get('/appointments')
            ]);

            const allAppointments = appRes.data || [];
            const matchingApps = allAppointments.filter(app => String(app.patient_id || app.user_id) === String(patientId));
            setPatientAppointments(matchingApps);

            const matchingAppIds = matchingApps.map(a => String(a.id));
            const allRecords = Array.isArray(recRes.data) ? recRes.data : [];
            const patientRecords = allRecords.filter(r => matchingAppIds.includes(String(r.appointmentId || r.appointment_id)));

            setRecords(patientRecords);
        } catch (error) {
            console.error('Fetch global records error:', error);
            toast.error('Erro ao buscar prontuários no servidor.');
            setRecords([]);
            setPatientAppointments([]);
        } finally {
            setIsLoadingRecords(false);
        }
    };

    const handleOpenCreate = () => {
        setEditingId(null);
        setFormData({
            appointmentId: '',
            description: '',
            prescription: '',
            integrateBilling: false,
            billingAmount: '',
            paymentMethod: 'Cartão de Crédito'
        });
        setIsModalOpen(true);
    };

    const handleOpenEdit = (record) => {
        setEditingId(record.id);
        setFormData({
            appointmentId: record.appointmentId || record.appointment_id,
            description: record.description,
            prescription: record.prescription
        });
        setIsModalOpen(true);
    };

    const handleDelete = (id) => {
        setConfirmDialog({
            isOpen: true,
            title: 'Excluir Prontuário',
            message: 'Tem certeza que deseja apagar permanentemente este registro clínico do histórico do paciente?',
            type: 'danger',
            onConfirm: async () => {
                try {
                    await axios.delete(`/medical-records/${id}`);
                    setConfirmDialog(prev => ({ ...prev, isOpen: false }));
                    fetchRecords(selectedPatientId);
                    toast.success('Prontuário excluído com sucesso.');
                } catch (error) {
                    toast.error('Erro ao excluir prontuário');
                }
            }
        });
    };

    const handleFileUpload = (e, recordId) => {
        const files = Array.from(e.target.files);
        if (files.length === 0) return;

        const maxSizeBytes = 5 * 1024 * 1024;
        const validFiles = files.filter(f => f.size <= maxSizeBytes);

        const newAttachments = validFiles.map(file => {
            return new Promise((resolve) => {
                const reader = new FileReader();
                reader.readAsDataURL(file);
                reader.onload = () => resolve({
                    id: Date.now() + Math.random(),
                    name: file.name,
                    size: (file.size / 1024 / 1024).toFixed(2) + ' MB',
                    dataUrl: reader.result
                });
            });
        });

        Promise.all(newAttachments).then(results => {
            setAttachments(prev => ({
                ...prev,
                [recordId]: [...(prev[recordId] || []), ...results]
            }));
            toast.success('Arquivo anexado com sucesso ao prontuário!');
        });
    };

    const handleSubmit = (e) => {
        e.preventDefault();

        if (!editingId) {
            const appIdForValidation = Number(formData.appointmentId);
            if (!appIdForValidation) return toast.error('Selecione uma consulta correspondente primeiro.');

            const existingRecord = records.find(r => String(r.appointmentId || r.appointment_id) === String(appIdForValidation));
            if (existingRecord) {
                return toast.error('Já existe um prontuário inserido para este agendamento. Você deve editar o registro existente.');
            }
        }

        setConfirmDialog({
            isOpen: true,
            title: editingId ? 'Salvar Alterações' : 'Assinar Prontuário',
            message: editingId ? 'Confirma a edição dos dados clínicos deste registro?' : 'Deseja anexar este prontuário permanentemente ao histórico do paciente?',
            type: 'primary',
            onConfirm: async () => {
                try {
                    const appId = Number(formData.appointmentId);
                    if (!appId && !editingId) return toast.error('Selecione uma consulta correspondente primeiro.');
                    const activeApp = patientAppointments.find(a => String(a.id) === String(appId));

                    const payload = {
                        appointmentId: appId,
                        description: formData.description,
                        prescription: formData.prescription
                    };

                    if (editingId) {
                        await axios.put(`/medical-records/${editingId}`, payload);
                    } else {
                        await axios.post(`/appointments/records`, payload);

                        // Handle Financial Integration (Only on creation)
                        if (formData.integrateBilling && formData.billingAmount) {
                            try {
                                await axios.post('/billing', {
                                    appointmentId: appId,
                                    patientId: Number(selectedPatientId),
                                    value: parseFloat(formData.billingAmount),
                                    status: 'Pendente',
                                    paymentMethod: formData.paymentMethod,
                                    dueDate: new Date().toISOString().split('T')[0]
                                });
                                toast.success('Faturamento registrado com sucesso!');
                                // Refresh billing records
                                axios.get('/billing').then(billRes => setBillingRecords(billRes.data));
                            } catch (billError) {
                                console.error('Error integrating billing:', billError);
                                toast.error('Prontuário salvo, mas erro ao registrar faturamento.');
                            }
                        }
                    }
                    setConfirmDialog(prev => ({ ...prev, isOpen: false }));
                    setIsModalOpen(false);
                    toast.success(editingId ? 'Prontuário atualizado!' : 'Prontuário assinado!');
                    fetchRecords(selectedPatientId);
                } catch (error) {
                    toast.error('Erro ao salvar prontuário ou histórico clínico');
                }
            }
        });
    };

    // ─── IA: Iniciar/Parar Gravação de Áudio ───────────────────────────────────────────
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
                    const patient = patients.find(p => String(p.id) === String(selectedPatientId));
                    const res = await transcribeAudio(audioBlob, patient?.name || '');
                    const { transcription, medical_record } = res.data;
                    setTranscriptionResult(transcription);
                    // Preencher os campos do formulário automaticamente
                    setFormData(prev => ({
                        ...prev,
                        description: medical_record?.description || '',
                        prescription: medical_record?.prescription || ''
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

    /**
     * Módulo Premium: Geração e Exportação de PDF
     * Utiliza html2canvas para tirar um "print" estruturado da div oculta (Template),
     * e o jsPDF para converter e baixar o arquivo final.
     */
    const handleExportPDF = async (record) => {
        const input = document.getElementById(`pdf-template-${record.id}`);
        if (!input) return toast.error('Template de PDF indisponível');

        try {
            // Tornamo o contêiner temporariamente visível pro Canvas "tirar a foto"
            input.style.display = 'block';

            const canvas = await html2canvas(input, { scale: 2 });
            const imgData = canvas.toDataURL('image/png');

            const pdf = new jsPDF('p', 'mm', 'a4');
            const pdfWidth = pdf.internal.pageSize.getWidth();
            const pdfHeight = (canvas.height * pdfWidth) / canvas.width;

            pdf.addImage(imgData, 'PNG', 0, 0, pdfWidth, pdfHeight);
            pdf.save(`Prontuario_Clinico_${record.id}.pdf`);

            // Ocultamos novamente após o Canvas finalizar.
            input.style.display = 'none';
        } catch (error) {
            console.error("Failed to export PDF", error);
            toast.error("Erro ao exportar arquivo PDF do prontuário.");
            input.style.display = 'none';
        }
    };

    const getFilterDoctors = () => {
        if (!Array.isArray(records)) return [];
        const docIdsInRecords = [...new Set(records.map(r => r.doctor_id).filter(Boolean))];
        return doctors.filter(d => docIdsInRecords.includes(d.id));
    };

    const filteredRecords = selectedDoctorFilter && Array.isArray(records)
        ? records.filter(r => String(r.doctor_id) === String(selectedDoctorFilter))
        : (Array.isArray(records) ? records : []);

    const totalPages = Math.ceil(filteredRecords.length / recordsPerPage);

    const paginatedRecords = filteredRecords
        .sort((a, b) => new Date(b.created_at || b.createdAt) - new Date(a.created_at || a.createdAt))
        .slice((currentPage - 1) * recordsPerPage, currentPage * recordsPerPage);

    return (
        <div className="space-y-6 animate-in slide-in-from-bottom-4 duration-500 fade-in">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-2">
                <div>
                    <h2 className="text-2xl font-bold text-slate-800 tracking-tight">Histórico Clínico e Prontuários</h2>
                    <p className="text-sm text-slate-500 mt-1">Gere diagnósticos, analise evolução de sintomas e forneça prescrições atreladas às consultas.</p>
                </div>
            </div>

            <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-sm shadow-slate-200/50 dark:shadow-none border border-slate-100 dark:border-slate-700 p-6 flex flex-col items-center justify-center min-h-[150px] bg-gradient-to-r from-slate-50 to-white dark:from-slate-800 dark:to-slate-800">
                <label className="text-sm font-bold text-slate-700 dark:text-slate-300 uppercase tracking-widest mb-3">Pesquisar Arquivo do Paciente</label>
                <div className="relative max-w-2xl w-full">
                    <Select
                        options={patients.map(p => ({ value: p.id, label: `${p.name} - ${p.crm ? `CRM: ${p.crm}` : p.email}` }))}
                        value={selectedPatientId ? { value: selectedPatientId, label: patients.find(p => String(p.id) === String(selectedPatientId))?.name } : null}
                        onChange={(selected) => {
                            setSelectedPatientId(selected ? selected.value : '');
                            setSelectedDoctorFilter('');
                        }}
                        placeholder="Pesquise pelo nome, e-mail ou CRM do paciente..."
                        className="text-base font-medium"
                        classNamePrefix="react-select"
                        isClearable
                        styles={{
                            control: (base, state) => ({
                                ...base,
                                borderColor: state.isFocused ? '#6c5be4' : '#e2e8f0',
                                borderRadius: '0.75rem',
                                padding: '8px 4px',
                                boxShadow: state.isFocused ? '0 0 0 4px rgba(108, 91, 228, 0.1)' : 'none',
                                '&:hover': {
                                    borderColor: '#6c5be4'
                                }
                            }),
                            menu: (base) => ({
                                ...base,
                                borderRadius: '0.75rem',
                                overflow: 'hidden',
                                zIndex: 50
                            })
                        }}
                    />
                </div>
            </div>

            {selectedPatientId && (
                <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-sm shadow-slate-200/50 dark:shadow-none border border-slate-100 dark:border-slate-700 overflow-hidden">
                    <div className="px-6 py-4 border-b border-slate-100 dark:border-slate-700 bg-slate-50/50 dark:bg-slate-800/50 flex flex-col md:flex-row justify-between items-start md:items-center gap-4">

                        <div className="flex items-center gap-4 w-full md:w-auto">
                            <div className="flex items-center gap-2">
                                <FaNotesMedical className="text-primary text-xl" />
                                <h3 className="font-bold text-lg text-slate-800 dark:text-slate-100 tracking-tight">Evolução Clínica</h3>
                            </div>

                            {records.length > 0 && (
                                <div className="relative ml-4">
                                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                                        <FaFilter className="text-sm" />
                                    </div>
                                    <select
                                        className="block w-48 pl-9 pr-8 py-2 border border-slate-200 rounded-lg text-sm bg-white focus:outline-none focus:ring-2 focus:ring-primary/20 appearance-none font-medium text-slate-600"
                                        value={selectedDoctorFilter}
                                        onChange={e => setSelectedDoctorFilter(e.target.value)}
                                    >
                                        <option value="">Todos os Médicos</option>
                                        {getFilterDoctors().map(d => (
                                            <option key={d.id} value={d.id}>Dr. {d.name.replace('Dr. ', '')}</option>
                                        ))}
                                    </select>
                                </div>
                            )}
                        </div>

                        <button className="btn-primary whitespace-nowrap" onClick={handleOpenCreate}>
                            <FaPlus /> Novo Prontuário
                        </button>
                    </div>

                    <div className="p-6 bg-slate-50/30 dark:bg-slate-800/30">
                        {isLoadingRecords ? (
                            <div className="relative border-l-2 border-slate-200 ml-3 space-y-8 pb-4">
                                {Array.from({ length: 3 }).map((_, idx) => (
                                    <div key={`skeleton-record-${idx}`} className="relative pl-8 animate-pulse">
                                        <span className="absolute -left-[9px] top-1.5 w-4 h-4 rounded-full border-4 border-slate-50 bg-slate-300"></span>
                                        <div className="bg-white p-5 rounded-xl border border-slate-200">
                                            <div className="flex justify-between items-center mb-4 border-b border-slate-100 pb-3">
                                                <div className="flex items-center gap-3">
                                                    <div className="w-8 h-8 rounded-full bg-slate-200"></div>
                                                    <div className="h-4 bg-slate-200 rounded w-32"></div>
                                                </div>
                                                <div className="h-6 bg-slate-100 rounded w-24"></div>
                                            </div>
                                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                                <div className="space-y-2">
                                                    <div className="h-3 bg-slate-200 rounded w-1/3 mb-4"></div>
                                                    <div className="h-2 bg-slate-100 rounded w-full"></div>
                                                    <div className="h-2 bg-slate-100 rounded w-full"></div>
                                                    <div className="h-2 bg-slate-100 rounded w-3/4"></div>
                                                </div>
                                                <div className="bg-slate-50 p-4 rounded-xl border border-slate-100 space-y-2">
                                                    <div className="h-3 bg-slate-200 rounded w-1/2 mb-4"></div>
                                                    <div className="h-2 bg-slate-100 rounded w-full"></div>
                                                    <div className="h-2 bg-slate-100 rounded w-2/3"></div>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        ) : filteredRecords.length === 0 ? (
                            <div className="flex flex-col items-center justify-center py-16 text-slate-400">
                                <div className="w-24 h-24 bg-slate-100 rounded-full flex items-center justify-center mb-4 border-8 border-white shadow-sm">
                                    <FaHeartbeat className="text-4xl text-slate-300" />
                                </div>
                                <h4 className="text-lg font-bold text-slate-600">Nenhum prontuário</h4>
                                <p className="text-sm">O histórico clínico desse paciente está vazio.</p>
                                <button className="mt-4 text-primary font-semibold hover:underline" onClick={handleOpenCreate}>Criar primeiro prontuário</button>
                            </div>
                        ) : (
                            <div className="relative border-l-2 border-slate-200 ml-3 space-y-8 pb-4">
                                {paginatedRecords.map((r) => {
                                    const linkedApp = patientAppointments.find(a => String(a.id) === String(r.appointmentId || r.appointment_id));
                                    const docId = linkedApp ? linkedApp.doctor_id : r.doctor_id;
                                    const doc = doctors.find(d => String(d.id) === String(docId));
                                    return (
                                        <div key={r.id} className="relative pl-8">
                                            {/* Timeline Dot */}
                                            <span className="absolute -left-[9px] top-1.5 w-4 h-4 rounded-full border-4 border-slate-50" style={{ backgroundColor: doc?.color || '#6c5be4' }}></span>

                                            <div className="bg-white dark:bg-slate-700 p-5 rounded-xl border border-slate-200 dark:border-slate-600 shadow-sm hover:shadow-md transition-shadow relative overflow-hidden group">

                                                <div className="absolute top-0 right-0 w-32 h-32 bg-gradient-to-bl from-slate-100/50 to-transparent rounded-bl-full -z-10 pointer-events-none transition-transform group-hover:scale-110"></div>

                                                <div className="flex justify-between items-center mb-4 border-b border-slate-100 pb-3">
                                                    <div className="flex items-center gap-3 text-slate-800 font-bold">
                                                        <img className="w-8 h-8 rounded-full shadow-sm" src={`https://ui-avatars.com/api/?name=${doc?.name.replace(/ /g, '+')}&background=${doc?.color?.replace('#', '') || '6c5be4'}&color=fff`} />
                                                        <div className="flex flex-col">
                                                            <span>Dr. {doc?.name.replace('Dr. ', '') || r.doctor_name || 'Unknown'}</span>
                                                            {linkedApp && (
                                                                <span className="text-[11px] text-slate-400 font-semibold mb-1">
                                                                    Consulta do dia: {new Date(linkedApp.date).toLocaleDateString('pt-BR')} às {String(new Date(linkedApp.date).getHours()).padStart(2, '0')}:{String(new Date(linkedApp.date).getMinutes()).padStart(2, '0')}
                                                                </span>
                                                            )}
                                                            {linkedApp && (() => {
                                                                const bill = billingRecords.find(b => String(b.appointment_id) === String(linkedApp.id));
                                                                if (bill) {
                                                                    return (
                                                                        <span className={`text-[10px] mt-0.5 w-fit px-1.5 py-0.5 rounded-md border font-semibold ${(bill.status === 'paid' || bill.status === 'Pago') ? 'bg-emerald-50 text-emerald-600 border-emerald-200' : 'bg-warning/10 text-amber-600 border-amber-200'}`}>
                                                                            {(bill.status === 'paid' || bill.status === 'Pago') ? '💰 Faturado' : '⏳ Pgto. Pendente'}
                                                                        </span>
                                                                    );
                                                                }
                                                                return (
                                                                    <span className="text-[10px] mt-0.5 w-fit px-1.5 py-0.5 rounded-md border bg-slate-50 text-slate-500 border-slate-200 font-semibold" title="Nenhuma fatura lançada">
                                                                        Faturamento não lançado
                                                                    </span>
                                                                );
                                                            })()}
                                                        </div>
                                                    </div>
                                                    <span className="px-3 py-1 bg-slate-100 text-slate-600 rounded-lg text-xs font-bold tracking-wide flex items-center gap-2">
                                                        {new Date(r.created_at).toLocaleDateString()}
                                                        <button className="ml-2 px-2 py-1 bg-white hover:bg-emerald-50 text-emerald-600 rounded transition-colors" title="Exportar para PDF" onClick={() => handleExportPDF(r)}><FaFilePdf /></button>
                                                        <button className="px-2 py-1 bg-white hover:bg-slate-200 text-slate-500 rounded transition-colors" title="Editar" onClick={() => handleOpenEdit(r)}><FaEdit /></button>
                                                        <button className="px-2 py-1 bg-white hover:bg-danger/10 text-danger rounded transition-colors" title="Excluir" onClick={() => handleDelete(r.id)}><FaTrash /></button>
                                                    </span>
                                                </div>

                                                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                                    <div className="space-y-4">
                                                        <div>
                                                            <div className="flex items-center gap-2 text-slate-400 dark:text-slate-300 font-bold text-xs uppercase tracking-wider mb-2">
                                                                <FaStethoscope /> Descrição Clínica (Evolução)
                                                            </div>
                                                            <div className="text-slate-700 dark:text-slate-300 bg-slate-50 dark:bg-slate-800 p-3 rounded-lg border border-slate-100 dark:border-slate-600 text-sm leading-relaxed whitespace-pre-wrap">{r.description || 'Nenhuma descrição detalhada.'}</div>
                                                        </div>
                                                    </div>

                                                    <div className="bg-blue-50/50 dark:bg-blue-900/20 p-4 rounded-xl border border-blue-100/50 dark:border-blue-900/50">
                                                        <div className="flex items-center gap-2 text-blue-600 dark:text-blue-400 font-bold text-xs uppercase tracking-wider mb-2 border-b border-blue-100 dark:border-blue-900 pb-2">
                                                            <FaPrescriptionBottleAlt /> Prescrição Médica
                                                        </div>
                                                        <div className="text-slate-700 dark:text-slate-300 font-mono text-sm leading-relaxed whitespace-pre-wrap mt-2">
                                                            {r.prescription || 'Nenhum medicamento prescrito nesta consulta.'}
                                                        </div>
                                                    </div>
                                                </div>

                                                {/* File Upload / Attachments Area */}
                                                <div className="mt-6 pt-4 border-t border-slate-100">
                                                    <div className="flex flex-wrap gap-4 items-center">
                                                        <label className="cursor-pointer bg-slate-50 dark:bg-slate-800 hover:bg-primary/5 dark:hover:bg-primary/20 text-slate-600 dark:text-slate-300 hover:text-primary px-4 py-2 rounded-lg border border-slate-200 dark:border-slate-600 transition-colors text-sm font-semibold flex items-center gap-2">
                                                            <input type="file" className="hidden" multiple onChange={(e) => handleFileUpload(e, r.id)} accept=".pdf, image/*" />
                                                            <FaFileUpload /> Anexar Exame / Documento
                                                        </label>

                                                        <div className="flex flex-wrap gap-2">
                                                            {(attachments[r.id] || []).map(file => (
                                                                <a key={file.id} href={file.dataUrl} download={file.name} className="flex items-center gap-2 bg-slate-100 text-slate-700 px-3 py-1.5 rounded-lg text-xs font-medium hover:bg-slate-200 transition-colors border border-slate-200">
                                                                    <FaFilePdf className="text-danger" />
                                                                    <span className="max-w-[120px] truncate" title={file.name}>{file.name}</span>
                                                                </a>
                                                            ))}
                                                        </div>
                                                    </div>
                                                </div>

                                                {/* =======================================================
                                                    TEMPLATE DO ATESTADO. ESCONDIDO (Display NONE).
                                                    APENAS USADO PELO HTML2CANVAS DURANTE O HANDLE_EXPORT_PDF
                                                ======================================================== */}
                                                <div id={`pdf-template-${r.id}`} style={{ display: 'none', width: '800px', padding: '40px', backgroundColor: 'white', fontFamily: 'sans-serif', color: '#333' }}>
                                                    <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '2px solid #6c5be4', paddingBottom: '20px', marginBottom: '20px' }}>
                                                        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                                                            <div style={{ color: '#6c5be4', fontSize: '28px', fontWeight: 'bold' }}>{settings.company_name || 'Sisagenda'}</div>
                                                            <div style={{ fontSize: '14px', color: '#666', borderLeft: '1px solid #ddd', paddingLeft: '10px', marginLeft: '10px' }}>Centro Clínico<br />Avançado</div>
                                                        </div>
                                                        <div style={{ textAlign: 'right', fontSize: '12px', color: '#666' }}>
                                                            Data: {new Date().toLocaleDateString()}<br />
                                                            Ref. Consulta: #{r.appointment_id}<br />
                                                            Cod. Documento: #{r.id}
                                                        </div>
                                                    </div>

                                                    <div style={{ marginBottom: '30px' }}>
                                                        <h2 style={{ fontSize: '18px', color: '#111', marginBottom: '8px' }}>Evolução e Prontuário Médico</h2>
                                                        <p style={{ margin: 0, fontSize: '14px' }}><strong>Paciente:</strong> {patients.find(p => p.id === selectedPatientId)?.name || 'Paciente'}</p>
                                                        <p style={{ margin: 0, fontSize: '14px' }}><strong>Médico Responsável:</strong> Dr. {doc?.name.replace('Dr. ', '') || 'Não especificado'} ({doc?.specialty || 'Generalista'})</p>
                                                    </div>

                                                    <div style={{ marginBottom: '20px', backgroundColor: '#f8fafc', padding: '15px', borderRadius: '8px', border: '1px solid #e2e8f0' }}>
                                                        <h3 style={{ fontSize: '14px', textTransform: 'uppercase', color: '#475569', marginBottom: '10px' }}>Descrição Clínica</h3>
                                                        <div style={{ fontSize: '14px', lineHeight: '1.5', whiteSpace: 'pre-wrap' }}>{r.description || 'Nenhuma descrição detalhada na consulta.'}</div>
                                                    </div>

                                                    <div style={{ marginBottom: '40px', backgroundColor: '#eff6ff', padding: '20px', borderRadius: '8px', border: '1px solid #bfdbfe' }}>
                                                        <h3 style={{ fontSize: '14px', textTransform: 'uppercase', color: '#2563eb', marginBottom: '10px' }}>Receituário Médio e Prescrições</h3>
                                                        <div style={{ fontSize: '14px', fontFamily: 'monospace', whiteSpace: 'pre-wrap', lineHeight: '1.6' }}>
                                                            {r.prescription || 'Nenhum medicamento ou tratamento adicional prescrito.'}
                                                        </div>
                                                    </div>

                                                    <div style={{ marginTop: '50px', paddingTop: '20px', borderTop: '1px dashed #cbd5e1', display: 'flex', justifyContent: 'end', alignItems: 'flex-start' }}>

                                                        {/* Doctor's Signature Line */}
                                                        <div style={{ textAlign: 'center', width: '250px' }}>
                                                            <div style={{ borderBottom: '1px solid #334155', marginBottom: '8px', height: '30px', backgroundImage: 'url("https://upload.wikimedia.org/wikipedia/commons/f/f6/John_Hancock_Signature.svg")', backgroundSize: 'contain', backgroundRepeat: 'no-repeat', backgroundPosition: 'center', opacity: 0.6 }}></div>
                                                            <div style={{ fontSize: '14px', fontWeight: 'bold', color: '#334155' }}>Dr. {doc?.name.replace('Dr. ', '') || 'Médico Signatário'}</div>
                                                            <div style={{ fontSize: '12px', color: '#64748b' }}>{doc?.crm ? `CRM: ${doc.crm}` : 'Médico Responsável'}</div>
                                                        </div>

                                                    </div>
                                                </div>
                                                {/* =======================================================
                                                    FIM DO TEMPLATE DO PDF
                                                ======================================================== */}

                                            </div>
                                        </div>
                                    );
                                })}

                                {totalPages > 1 && (
                                    <div className="flex justify-between items-center mt-8 pl-8 pt-4 border-t border-slate-100 dark:border-slate-800">
                                        <button
                                            className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-600 disabled:opacity-50 disabled:cursor-not-allowed rounded-lg font-semibold text-sm transition-colors"
                                            onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                                            disabled={currentPage === 1}
                                        >
                                            Página Anterior
                                        </button>
                                        <span className="text-sm font-bold text-slate-500">
                                            Página {currentPage} de {totalPages}
                                        </span>
                                        <button
                                            className="px-4 py-2 bg-primary/10 hover:bg-primary/20 text-primary disabled:opacity-50 disabled:cursor-not-allowed rounded-lg font-semibold text-sm transition-colors"
                                            onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                                            disabled={currentPage === totalPages}
                                        >
                                            Próxima Página
                                        </button>
                                    </div>
                                )}
                            </div>
                        )}
                    </div>
                </div>
            )}

            <Modal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} title={editingId ? "Editar Anotações" : "Anexar ao Prontuário"} size="large">
                <form onSubmit={handleSubmit} className="space-y-5">
                    <div className="bg-slate-50 p-4 rounded-xl border border-slate-200">
                        <label className="text-slate-700 font-bold block mb-2"><FaFileMedicalAlt className="inline mr-2 text-primary" /> Referência da Consulta {editingId && <span className="text-xs text-slate-400 font-normal">(Vinculada)</span>}</label>
                        <Select
                            options={patientAppointments
                                .filter(app => {
                                    if (editingId && String(formData.appointmentId) === String(app.id)) return true;
                                    return !records.some(r => String(r.appointmentId || r.appointment_id) === String(app.id));
                                })
                                .map(app => {
                                    const doc = doctors.find(d => String(d.id) === String(app.doctor_id));
                                    const bill = billingRecords.find(b => String(b.appointment_id) === String(app.id));
                                    let billStatusText = "Não Faturado";
                                    if (bill) {
                                        billStatusText = bill.status === 'paid' || bill.status === 'Pago' ? 'Pago' : 'Pendente';
                                    }

                                    return {
                                        value: app.id,
                                        label: `${new Date(app.date).toLocaleDateString('pt-BR')} às ${String(new Date(app.date).getHours()).padStart(2, '0')}:${String(new Date(app.date).getMinutes()).padStart(2, '0')} - Dr. ${doc?.name?.replace('Dr. ', '') || 'Médico'} - Fin: ${billStatusText}`
                                    };
                                })}
                            value={formData.appointmentId ? {
                                value: formData.appointmentId,
                                label: (() => {
                                    const app = patientAppointments.find(a => String(a.id) === String(formData.appointmentId));
                                    if (!app) return 'Selecione a consulta...';
                                    const doc = doctors.find(d => String(d.id) === String(app.doctor_id));
                                    const bill = billingRecords.find(b => String(b.appointment_id) === String(app.id));
                                    let billStatusText = "Não Faturado";
                                    if (bill) {
                                        billStatusText = bill.status === 'paid' || bill.status === 'Pago' ? 'Pago' : 'Pendente';
                                    }
                                    return `${new Date(app.date).toLocaleDateString('pt-BR')} às ${String(new Date(app.date).getHours()).padStart(2, '0')}:${String(new Date(app.date).getMinutes()).padStart(2, '0')} - Dr. ${doc?.name?.replace('Dr. ', '') || 'Médico'} - Fin: ${billStatusText}`;
                                })()
                            } : null}
                            onChange={(selected) => setFormData({ ...formData, appointmentId: selected ? selected.value : '' })}
                            placeholder="Pesquise (Ex: nome, data, médico) ou selecione a consulta..."
                            className="text-sm font-medium"
                            classNamePrefix="react-select"
                            isDisabled={!!editingId}
                            isClearable
                            styles={{
                                control: (base, state) => ({
                                    ...base,
                                    borderColor: state.isFocused ? '#6c5be4' : '#e2e8f0',
                                    borderRadius: '0.5rem',
                                    padding: '2px',
                                    boxShadow: state.isFocused ? '0 0 0 2px rgba(108, 91, 228, 0.1)' : 'none',
                                    '&:hover': {
                                        borderColor: '#6c5be4'
                                    }
                                })
                            }}
                        />
                        <p className="text-xs text-slate-500 mt-2">Prontuários só podem ser originados através da conexão direta com um agendamento prévio (Consulta).</p>
                    </div>

                    {/* ── Bloco de IA: Gravação de Consulta ── */}
                    {aiConfigured && !editingId && (
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

                            {isRecording && (
                                <div className="flex items-center gap-2 text-red-600 text-xs font-semibold p-2 bg-red-50 rounded-lg border border-red-200">
                                    <span className="w-2 h-2 bg-red-500 rounded-full animate-ping inline-block"></span>
                                    Gravando... Fale normalmente. Clique em "Parar" quando terminar.
                                </div>
                            )}

                            {isTranscribing && (
                                <div className="flex items-center gap-3 text-violet-700 text-xs font-semibold p-3 bg-violet-100 rounded-lg">
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
                                    <p className="text-[10px] text-violet-500 italic">Os campos abaixo foram preenchidos. Revise antes de salvar.</p>
                                </div>
                            )}
                        </div>
                    )}

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                        <div className="md:col-span-2 space-y-5">
                            <div>
                                <div className="flex items-center justify-between mb-2">
                                    <label className="font-bold text-sm text-slate-700 block">Descrição Clínica (Evolução / Diagnóstico)</label>
                                    <div className="flex gap-2 relative">

                                        {CLINICAL_TEMPLATES.map((tmpl, idx) => (
                                            <button
                                                key={`clin-tmpl-${idx}`}
                                                type="button"
                                                onClick={() => setFormData(prev => ({ ...prev, description: tmpl.text }))}
                                                className="text-[10px] bg-slate-100 hover:bg-primary hover:text-white text-slate-600 px-2 py-1 rounded transition-colors font-semibold"
                                            >
                                                + {tmpl.label}
                                            </button>
                                        ))}
                                    </div>
                                </div>
                                <textarea className="form-control resize-none" rows="6" required value={formData.description} onChange={e => setFormData({ ...formData, description: e.target.value })} placeholder="Paciente com quadro de... (Descreva aqui a evolução ou diagnóstico)"></textarea>
                            </div>
                        </div>

                        <div className="md:col-span-2 space-y-5">
                            <div>
                                <div className="flex items-center justify-between mb-2">
                                    <label className="font-bold text-sm text-blue-600 block">Anotações da Prescrição</label>
                                    <div className="flex gap-2">
                                        {PRESCRIPTION_TEMPLATES.map((tmpl, idx) => (
                                            <button
                                                key={`presc-tmpl-${idx}`}
                                                type="button"
                                                onClick={() => setFormData(prev => ({ ...prev, prescription: tmpl.text }))}
                                                className="text-[10px] bg-blue-50 hover:bg-blue-600 hover:text-white text-blue-600 px-2 py-1 rounded transition-colors font-semibold border border-blue-100"
                                            >
                                                + {tmpl.label}
                                            </button>
                                        ))}
                                    </div>
                                </div>
                                <textarea className="form-control bg-blue-50/30 border-blue-200 focus:ring-blue-500 resize-none font-mono text-sm" rows="4" value={formData.prescription} onChange={e => setFormData({ ...formData, prescription: e.target.value })} placeholder="1. Amoxicilina 500mg - 8h/8h / 7 dias..."></textarea>
                            </div>
                        </div>

                        {!editingId && (
                            <div className="md:col-span-2 bg-emerald-50/50 p-4 rounded-xl border border-emerald-100">
                                <div className="flex items-center justify-between">
                                    <div className="flex items-center gap-2">
                                        <input
                                            type="checkbox"
                                            id="integrateBilling"
                                            className="w-4 h-4 text-emerald-600 rounded border-slate-300 focus:ring-emerald-500"
                                            checked={formData.integrateBilling}
                                            onChange={e => setFormData({ ...formData, integrateBilling: e.target.checked })}
                                        />
                                        <label htmlFor="integrateBilling" className="font-bold text-sm text-emerald-800 cursor-pointer">
                                            Gerar Faturamento / Cobrança
                                        </label>
                                    </div>
                                    <span className="text-xs text-emerald-600/70 font-medium bg-emerald-100 px-2 py-0.5 rounded-full">Integração Financeira</span>
                                </div>

                                {formData.integrateBilling && (
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4 animate-in slide-in-from-top-2">
                                        <div>
                                            <label className="text-xs font-bold text-slate-600 block mb-1">Valor da Consulta (R$)</label>
                                            <input
                                                type="number"
                                                step="0.01"
                                                className="form-control bg-white"
                                                required
                                                value={formData.billingAmount}
                                                onChange={e => setFormData({ ...formData, billingAmount: e.target.value })}
                                                placeholder="Ex: 250.00"
                                            />
                                        </div>
                                        <div>
                                            <label className="text-xs font-bold text-slate-600 block mb-1">Método Sugerido</label>
                                            <select
                                                className="form-control bg-white"
                                                value={formData.paymentMethod}
                                                onChange={e => setFormData({ ...formData, paymentMethod: e.target.value })}
                                            >
                                                <option value="Cartão de Crédito">Cartão de Crédito</option>
                                                <option value="Pix">PIX</option>
                                                <option value="Dinheiro (Espécie)">Dinheiro</option>
                                                <option value="Plano de Saúde (Guia)">Plano de Saúde (Guia)</option>
                                            </select>
                                        </div>
                                    </div>
                                )}
                            </div>
                        )}
                    </div>

                    <div className="modal-footer pt-6 mt-6 border-t border-slate-100 flex justify-end gap-3 -mx-6 -mb-6 px-6 bg-slate-50 rounded-b-xl">
                        <button type="button" className="btn-secondary" onClick={() => setIsModalOpen(false)}>Cancelar</button>
                        <button type="submit" className="btn-primary" style={{ margin: 0 }}>{editingId ? "Salvar Alterações" : "Salvar no Prontuário"}</button>
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

export default RecordsPage;
