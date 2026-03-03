import { useState, useEffect } from 'react';
import axios from '../api/axiosConfig';
import Modal from '../components/Modal';
import ConfirmModal from '../components/ConfirmModal';
import { FaHeartbeat, FaSearch, FaFilter, FaFileMedicalAlt, FaPrescriptionBottleAlt, FaStethoscope, FaNotesMedical, FaChevronDown, FaEdit, FaTrash, FaFilePdf } from 'react-icons/fa';
import html2canvas from 'html2canvas';
import { jsPDF } from 'jspdf';

const RecordsPage = () => {
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

    /**
     * Constelação de Dados (Filtro Cruzado)
     * @property {Array} patientAppointments - Agendamentos vinculados EXCLUSIVAMENTE ao paciente selecionado na barra de pesquisa. Essencial para linkar um Prontuário Médico novo à sua "Consulta Mãe".
     */
    const [formData, setFormData] = useState({ appointment_id: '', symptoms: '', diagnosis: '', prescription: '' });
    const [patientAppointments, setPatientAppointments] = useState([]);
    const [editingId, setEditingId] = useState(null);
    const [confirmDialog, setConfirmDialog] = useState({ isOpen: false, title: '', message: '', type: 'primary', onConfirm: null });

    /**
     * Hook de Inicialização
     * Busca os dicionários de dados principais (Todos os Pacientes e Todos os Médicos) para montar a renderização inicial na tela.
     */
    useEffect(() => {
        fetchInitialData();
    }, []);

    /**
     * Hook Reativo ao Paciente Selecionado
     * Sempre que o atendente escolhe um Paciente na barra de filtros da Home de Prontuários, esse efeito dispara:
     * 1. Busca todo o histórico de prontuários médicos daquele paciente (Timeline Médica).
     * 2. Busca todas as consultas de agenda daquele paciente para preencher o formulário onde referenciamos a consulta nova (Agendamentos Préveis).
     */
    useEffect(() => {
        if (selectedPatientId) {
            // Fetch records history
            fetchRecords(selectedPatientId);

            // Buscar consultas antigas na agenda para contexto
            axios.get('/appointments').then(appRes => {
                const matchingApps = appRes.data.filter(app => String(app.user_id) === String(selectedPatientId));
                setPatientAppointments(matchingApps);
            });
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
     * API: GET /patients/:patientId/records
     * Requisição dedicada especificamente para recuperar todo o histórico clínico (Prontuários) com base no ID do Cliente.
     * Array de Resposta Esperado: [{ id, appointment_id, doctor_id, symptoms, diagnosis, prescription, created_at }]
     * @param {string} patientId - A referência numéricado Paciente Alvo. 
     */
    const fetchRecords = async (patientId) => {
        try {
            const res = await axios.get(`/patients/${patientId}/records`);
            setRecords(res.data);
        } catch (error) {
            // O Código 404 significa que NENHUM historico existe ainda, não que a API ou Sistema Quebrou.
            if (error.response?.status !== 404) {
                alert('Error fetching records');
            } else {
                setRecords([]);
            }
        }
    };

    const handleOpenCreate = () => {
        setEditingId(null);
        setFormData({ appointment_id: '', symptoms: '', diagnosis: '', prescription: '' });
        setIsModalOpen(true);
    };

    const handleOpenEdit = (record) => {
        setEditingId(record.id);
        setFormData({ appointment_id: record.appointment_id, symptoms: record.symptoms, diagnosis: record.diagnosis, prescription: record.prescription });
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
                } catch (error) {
                    alert('Erro ao excluir prontuário');
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
            alert('Arquivo anexado com sucesso ao prontuário!');
        });
    };

    /**
     * API: POST /appointments/:appointment_id/records-records
     * Anexa um novo Prontuário Médico ao histórico cronológico, vinculando-o diretamente com Base na Consulta agendada da qual decorreu.
     * Payload (Corpo Json Esperado) correspondente ao formato do `formData`:
     * {
     *   "symptoms": string,
     *   "diagnosis": string,
     *   "prescription": string
     * }
     */
    const handleSubmit = (e) => {
        e.preventDefault();
        setConfirmDialog({
            isOpen: true,
            title: editingId ? 'Salvar Alterações' : 'Assinar Prontuário',
            message: editingId ? 'Confirma a edição dos dados clínicos deste registro?' : 'Deseja anexar este prontuário permanentemente ao histórico do paciente?',
            type: 'primary',
            onConfirm: async () => {
                try {
                    if (!formData.appointment_id && !editingId) return alert('Selecione uma consulta correspondente primeiro.');

                    if (editingId) {
                        await axios.put(`/medical-records/${editingId}`, {
                            symptoms: formData.symptoms,
                            diagnosis: formData.diagnosis,
                            prescription: formData.prescription
                        });
                    } else {
                        await axios.post(`/appointments/${formData.appointment_id}/records-records`, {
                            symptoms: formData.symptoms,
                            diagnosis: formData.diagnosis,
                            prescription: formData.prescription
                        });
                    }
                    setConfirmDialog(prev => ({ ...prev, isOpen: false }));
                    setIsModalOpen(false);
                    fetchRecords(selectedPatientId);
                } catch (error) {
                    alert('Erro ao salvar prontuário ou histórico clínico');
                }
            }
        });
    };

    /**
     * Módulo Premium: Geração e Exportação de PDF
     * Utiliza html2canvas para tirar um "print" estruturado da div oculta (Template),
     * e o jsPDF para converter e baixar o arquivo final.
     */
    const handleExportPDF = async (record) => {
        const input = document.getElementById(`pdf-template-${record.id}`);
        if (!input) return alert('Template de PDF indisponível');

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
            alert("Erro ao exportar arquivo PDF do prontuário.");
            input.style.display = 'none';
        }
    };

    const getFilterDoctors = () => {
        const docIdsInRecords = [...new Set(records.map(r => r.doctor_id).filter(Boolean))];
        return doctors.filter(d => docIdsInRecords.includes(d.id));
    };

    const filteredRecords = selectedDoctorFilter
        ? records.filter(r => String(r.doctor_id) === String(selectedDoctorFilter))
        : records;

    return (
        <div className="space-y-6 animate-in slide-in-from-bottom-4 duration-500 fade-in">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-2">
                <div>
                    <h2 className="text-2xl font-bold text-slate-800 tracking-tight">Histórico Clínico e Prontuários</h2>
                    <p className="text-sm text-slate-500 mt-1">Gere diagnósticos, analise evolução de sintomas e forneça prescrições atreladas às consultas.</p>
                </div>
            </div>

            <div className="bg-white rounded-2xl shadow-sm shadow-slate-200/50 border border-slate-100 p-6 flex flex-col items-center justify-center min-h-[150px] bg-gradient-to-r from-slate-50 to-white">
                <label className="text-sm font-bold text-slate-700 uppercase tracking-widest mb-3">Pesquisar Arquivo do Paciente</label>
                <div className="relative max-w-2xl w-full">
                    <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none text-slate-400">
                        <FaSearch className="text-lg" />
                    </div>
                    <select
                        className="block w-full pl-12 pr-4 py-4 border-2 border-slate-200 rounded-xl leading-5 bg-white text-slate-900 focus:outline-none focus:ring-4 focus:ring-primary/10 focus:border-primary transition-all font-medium text-lg shadow-sm appearance-none cursor-pointer"
                        value={selectedPatientId}
                        onChange={(e) => {
                            setSelectedPatientId(e.target.value);
                            setSelectedDoctorFilter('');
                        }}
                    >
                        <option value="">-- Toque para selecionar um paciente --</option>
                        {patients.map(p => <option key={p.id} value={p.id}>{p.name} - {p.crm ? `CRM: ${p.crm}` : p.email}</option>)}
                    </select>
                    <div className="absolute inset-y-0 right-0 pr-4 flex items-center pointer-events-none text-slate-400">
                        <FaChevronDown />
                    </div>
                </div>
            </div>

            {selectedPatientId && (
                <div className="bg-white rounded-2xl shadow-sm shadow-slate-200/50 border border-slate-100 overflow-hidden">
                    <div className="px-6 py-4 border-b border-slate-100 bg-slate-50/50 flex flex-col md:flex-row justify-between items-start md:items-center gap-4">

                        <div className="flex items-center gap-4 w-full md:w-auto">
                            <div className="flex items-center gap-2">
                                <FaNotesMedical className="text-primary text-xl" />
                                <h3 className="font-bold text-lg text-slate-800 tracking-tight">Evolução Clínica</h3>
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

                    <div className="p-6 bg-slate-50/30">
                        {filteredRecords.length === 0 ? (
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
                                {filteredRecords.sort((a, b) => new Date(b.created_at) - new Date(a.created_at)).map((r) => {
                                    const doc = doctors.find(d => String(d.id) === String(r.doctor_id));
                                    return (
                                        <div key={r.id} className="relative pl-8">
                                            {/* Timeline Dot */}
                                            <span className="absolute -left-[9px] top-1.5 w-4 h-4 rounded-full border-4 border-slate-50" style={{ backgroundColor: doc?.color || '#6c5be4' }}></span>

                                            <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm hover:shadow-md transition-shadow relative overflow-hidden group">

                                                <div className="absolute top-0 right-0 w-32 h-32 bg-gradient-to-bl from-slate-100/50 to-transparent rounded-bl-full -z-10 pointer-events-none transition-transform group-hover:scale-110"></div>

                                                <div className="flex justify-between items-center mb-4 border-b border-slate-100 pb-3">
                                                    <div className="flex items-center gap-3 text-slate-800 font-bold">
                                                        <img className="w-8 h-8 rounded-full shadow-sm" src={`https://ui-avatars.com/api/?name=${doc?.name.replace(/ /g, '+')}&background=${doc?.color?.replace('#', '') || '6c5be4'}&color=fff`} />
                                                        Dr. {doc?.name.replace('Dr. ', '') || r.doctor_name || 'Unknown'}
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
                                                            <div className="flex items-center gap-2 text-slate-400 font-bold text-xs uppercase tracking-wider mb-2">
                                                                <FaStethoscope /> Sintomas / Queixas
                                                            </div>
                                                            <div className="text-slate-700 bg-slate-50 p-3 rounded-lg border border-slate-100 text-sm leading-relaxed">{r.symptoms || 'Nenhum sintoma detalhado'}</div>
                                                        </div>
                                                        <div>
                                                            <div className="flex items-center gap-2 text-slate-400 font-bold text-xs uppercase tracking-wider mb-2">
                                                                <FaHeartbeat /> Hipóteses e Diagnóstico
                                                            </div>
                                                            <div className="text-slate-800 font-medium px-3 text-sm">{r.diagnosis || 'Não especificado ou em investigação'}</div>
                                                        </div>
                                                    </div>

                                                    <div className="bg-blue-50/50 p-4 rounded-xl border border-blue-100/50">
                                                        <div className="flex items-center gap-2 text-blue-600 font-bold text-xs uppercase tracking-wider mb-2 border-b border-blue-100 pb-2">
                                                            <FaPrescriptionBottleAlt /> Prescrição Médica
                                                        </div>
                                                        <div className="text-slate-700 font-mono text-sm leading-relaxed whitespace-pre-wrap mt-2">
                                                            {r.prescription || 'Nenhum medicamento prescrito nesta consulta.'}
                                                        </div>
                                                    </div>
                                                </div>

                                                {/* File Upload / Attachments Area */}
                                                <div className="mt-6 pt-4 border-t border-slate-100">
                                                    <div className="flex flex-wrap gap-4 items-center">
                                                        <label className="cursor-pointer bg-slate-50 hover:bg-primary/5 text-slate-600 hover:text-primary px-4 py-2 rounded-lg border border-slate-200 transition-colors text-sm font-semibold flex items-center gap-2">
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
                                                            <div style={{ color: '#6c5be4', fontSize: '28px', fontWeight: 'bold' }}>Sisagenda</div>
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
                                                        <h3 style={{ fontSize: '14px', textTransform: 'uppercase', color: '#475569', marginBottom: '10px' }}>Sintomas / Anamnese</h3>
                                                        <div style={{ fontSize: '14px', lineHeight: '1.5' }}>{r.symptoms || 'Nenhum sintoma detalhado na consulta.'}</div>
                                                    </div>

                                                    <div style={{ marginBottom: '20px', backgroundColor: '#f8fafc', padding: '15px', borderRadius: '8px', border: '1px solid #e2e8f0' }}>
                                                        <h3 style={{ fontSize: '14px', textTransform: 'uppercase', color: '#475569', marginBottom: '10px' }}>Diagnóstico Clínico Clínico</h3>
                                                        <div style={{ fontSize: '16px', fontWeight: 'bold', color: '#1e293b' }}>{r.diagnosis || 'Em investigação / Não Informado'}</div>
                                                    </div>

                                                    <div style={{ marginBottom: '40px', backgroundColor: '#eff6ff', padding: '20px', borderRadius: '8px', border: '1px solid #bfdbfe' }}>
                                                        <h3 style={{ fontSize: '14px', textTransform: 'uppercase', color: '#2563eb', marginBottom: '10px' }}>Receituário Médio e Prescrições</h3>
                                                        <div style={{ fontSize: '14px', fontFamily: 'monospace', whiteSpace: 'pre-wrap', lineHeight: '1.6' }}>
                                                            {r.prescription || 'Nenhum medicamento ou tratamento adicional prescrito.'}
                                                        </div>
                                                    </div>

                                                    <div style={{ marginTop: '80px', paddingTop: '20px', borderTop: '1px dashed #cbd5e1', textAlign: 'center' }}>
                                                        <div style={{ width: '250px', borderBottom: '1px solid #000', margin: '0 auto 10px' }}></div>
                                                        <div style={{ fontSize: '14px', fontWeight: 'bold' }}>Dr. {doc?.name.replace('Dr. ', '') || 'Médico Signatário'}</div>
                                                        <div style={{ fontSize: '12px', color: '#64748b' }}>{doc?.crm ? `CRM: ${doc.crm}` : 'Assinatura Médica Autorizada'}</div>
                                                    </div>
                                                </div>
                                                {/* =======================================================
                                                    FIM DO TEMPLATE DO PDF
                                                ======================================================== */}

                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        )}
                    </div>
                </div>
            )}

            <Modal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} title={editingId ? "Editar Anotações" : "Anexar ao Prontuário"} size="large">
                <form onSubmit={handleSubmit} className="space-y-5">
                    <div className="bg-slate-50 p-4 rounded-xl border border-slate-200">
                        <label className="text-slate-700 font-bold block mb-2"><FaFileMedicalAlt className="inline mr-2 text-primary" /> Referência da Consulta {editingId && <span className="text-xs text-slate-400 font-normal">(Vinculada)</span>}</label>
                        <select className="form-control font-medium" required={!editingId} disabled={editingId} value={formData.appointment_id} onChange={e => setFormData({ ...formData, appointment_id: e.target.value })}>
                            <option value="">Selecione a consulta referenciada...</option>
                            {patientAppointments.map(app => {
                                const doc = doctors.find(d => d.id === app.doctor_id);
                                return (
                                    <option key={app.id} value={app.id}>
                                        {new Date(app.date).toLocaleDateString()} ({String(new Date(app.date).getHours()).padStart(2, '0')}:{String(new Date(app.date).getMinutes()).padStart(2, '0')}) - Dr. {doc?.name}
                                    </option>
                                )
                            })}
                        </select>
                        <p className="text-xs text-slate-500 mt-2">Prontuários só podem ser originados através da conexão direta com um agendamento prévio (Consulta).</p>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                        <div>
                            <label className="font-bold text-sm text-slate-700 block mb-1">Sintomas (Anamnese)</label>
                            <textarea className="form-control resize-none" rows="5" required value={formData.symptoms} onChange={e => setFormData({ ...formData, symptoms: e.target.value })} placeholder="Paciente apresentou sinais clínicos de..."></textarea>
                        </div>

                        <div className="space-y-5">
                            <div>
                                <label className="font-bold text-sm text-slate-700 block mb-1">Diagnóstico Final</label>
                                <input type="text" className="form-control" required value={formData.diagnosis} onChange={e => setFormData({ ...formData, diagnosis: e.target.value })} placeholder="Ex: Rinite Alérgica Crônica" />
                            </div>
                            <div>
                                <label className="font-bold text-sm text-blue-600 block mb-1">Anotações da Prescrição</label>
                                <textarea className="form-control bg-blue-50/30 border-blue-200 focus:ring-blue-500 resize-none font-mono text-sm" rows="3" value={formData.prescription} onChange={e => setFormData({ ...formData, prescription: e.target.value })} placeholder="1. Amoxicilina 500mg - 8h/8h / 7 dias..."></textarea>
                            </div>
                        </div>
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
