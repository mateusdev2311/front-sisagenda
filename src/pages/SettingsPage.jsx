import { useState, useEffect, useRef } from 'react';
import {
    FaBuilding, FaGlobe, FaSave, FaWhatsapp, FaPlug, FaLink,
    FaPaperPlane, FaCode, FaExternalLinkAlt, FaInfoCircle,
    FaChevronDown, FaQrcode, FaTrash, FaCheckCircle, FaTimesCircle,
    FaSpinner, FaToggleOn, FaToggleOff, FaBrain, FaKey,
} from 'react-icons/fa';
import axios from '../api/axiosConfig';
import toast from 'react-hot-toast';
import { useSettings } from '../context/SettingsContext';
import ConfirmModal from '../components/ConfirmModal';
import { saveAiToken, getCompanyInfo } from '../services/aiService';
import {
    getWhatsappInstance,
    createWhatsappInstance,
    connectWhatsappInstance,
    getWhatsappStatus,
    toggleWhatsappLembrete,
    sendWhatsappMessage,
    deleteWhatsappInstance,
    updateWhatsappTemplate,
} from '../services/whatsappService';

// ─── Componente Accordion ────────────────────────────────────────────────────
const Accordion = ({ icon, title, subtitle, badge, defaultOpen = false, disabled = false, disabledMessage, children }) => {
    const [open, setOpen] = useState(defaultOpen);

    return (
        <div className={`rounded-2xl border transition-all duration-300 ${
            disabled ? 'border-slate-200 bg-slate-50 opacity-70' :
            open ? 'border-primary/30 shadow-md shadow-primary/5 bg-white' : 'border-slate-100 bg-white'
        } overflow-hidden`}>
            <button
                type="button"
                onClick={() => !disabled && setOpen(o => !o)}
                className={`w-full flex items-center gap-4 px-6 py-4 text-left transition-colors ${
                    disabled ? 'cursor-not-allowed' : 'hover:bg-slate-50/70'
                }`}
            >
                <div className="flex-shrink-0">{icon}</div>
                <div className="flex-1 min-w-0">
                    <span className={`font-bold text-sm block ${disabled ? 'text-slate-400' : 'text-slate-800'}`}>{title}</span>
                    <span className="text-xs text-slate-400 truncate block">{subtitle}</span>
                </div>
                {badge && <div className="flex-shrink-0">{badge}</div>}
                {disabled
                    ? <span className="text-xs text-slate-400 flex items-center gap-1 flex-shrink-0">🔒 Bloqueado</span>
                    : <FaChevronDown className={`flex-shrink-0 text-slate-400 transition-transform duration-300 ${open ? 'rotate-180' : ''}`} />
                }
            </button>

            {/* Aviso quando bloqueado */}
            {disabled && disabledMessage && (
                <div className="px-6 pb-4">
                    <div className="flex items-start gap-2 text-xs text-amber-700 bg-amber-50 border border-amber-200 rounded-xl px-3 py-2.5">
                        <span className="mt-0.5 flex-shrink-0">⚠️</span>
                        <span>{disabledMessage}</span>
                    </div>
                </div>
            )}

            {/* Conteúdo normal (só quando não bloqueado) */}
            {!disabled && (
                <div className={`transition-all duration-300 ease-in-out overflow-hidden ${open ? 'max-h-[9999px] opacity-100' : 'max-h-0 opacity-0'}`}>
                    <div className="px-6 pb-6 pt-2 border-t border-slate-100">
                        {children}
                    </div>
                </div>
            )}
        </div>
    );
};

// ─── Status badge ─────────────────────────────────────────────────────────────
const StatusBadge = ({ configured, label }) => (
    <span className={`text-xs font-bold px-2.5 py-1 rounded-full ${configured ? 'bg-green-100 text-green-700' : 'bg-slate-100 text-slate-500'}`}>
        {configured ? '● ' : '○ '}{label}
    </span>
);

// ─── Lógica de Próximo Vencimento ──────────────────────────────────────────────
const formatDueDate = (dateStr) => {
    if (!dateStr) return '';
    const day = parseInt(dateStr.split('T')[0].split('-')[2], 10);
    const today = new Date();
    let targetMonth = today.getMonth() + 1;
    if (today.getDate() > day) {
        targetMonth++;
        if (targetMonth > 12) targetMonth = 1;
    }
    return `${String(day).padStart(2, '0')}/${String(targetMonth).padStart(2, '0')}`;
};

// ─── Main Page ────────────────────────────────────────────────────────────────
const SettingsPage = () => {
    const { refreshSettings } = useSettings();

    // ─── Dados do Sistema ─────────────────────────────────────────────────────
    const [settingsId, setSettingsId] = useState(null);
    const [settings, setSettings] = useState({
        company_name: '',
        company_cnpj: '',
        timezone: 'America/Sao_Paulo',
        currency: 'BRL',
    });
    const [isSavingSettings, setIsSavingSettings] = useState(false);

    // ─── Integração Kentro ────────────────────────────────────────────────────
    const [integrationId, setIntegrationId] = useState(null);
    const [integration, setIntegration] = useState({
        name: 'Kentro',
        base_url: '',
        api_key: '',
        queue_id: '',
        lembrete_ativo: false,
        is_official_api: false,
        whatsapp_message_text: '',
        whatsapp_template_id: '',
    });
    const [isSavingIntegration, setIsSavingIntegration] = useState(false);
    const [testPhone, setTestPhone] = useState('');
    const [isTesting, setIsTesting] = useState(false);

    // ─── Integração WhatsApp (Evolution API) ──────────────────────────────────
    const [waInstance, setWaInstance] = useState(null);       // dados do banco
    const [waStatus, setWaStatus] = useState('close');         // open|connecting|close
    const [waQrCode, setWaQrCode] = useState(null);            // base64 do QR
    const [waLoading, setWaLoading] = useState('idle');        // idle|creating|connecting|polling|deleting|toggling|sending
    const [waTestPhone, setWaTestPhone] = useState('');
    const [waTestText, setWaTestText] = useState('Olá! Mensagem de teste enviada pelo Sisagenda. ✅');
    const [waMessageTemplate, setWaMessageTemplate] = useState('');
    const [isSavingWaTemplate, setIsSavingWaTemplate] = useState(false);
    const [confirmDialog, setConfirmDialog] = useState({ isOpen: false, title: '', message: '', type: 'primary', onConfirm: null });
    const pollingRef = useRef(null);

    // ─── Integração IA (OpenAI) ───────────────────────────────────────────────
    const [aiToken, setAiToken] = useState('');
    const [aiConfigured, setAiConfigured] = useState(false);
    const [isSavingAiToken, setIsSavingAiToken] = useState(false);

    // ─── Dados Extras da Clínica ──────────────────────────────────────────────
    const [companyInfo, setCompanyInfo] = useState({ plan: 'free', due_date: null });

    // ─── Carregamento Inicial ─────────────────────────────────────────────────
    useEffect(() => {
        axios.get('/system-settings')
            .then(res => {
                const data = Array.isArray(res.data) ? res.data[0] : res.data;
                if (data) {
                    setSettingsId(data.id);
                    setSettings(prev => ({
                        ...prev,
                        company_name: data.company_name || '',
                        company_cnpj: data.company_cnpj || '',
                        timezone: data.timezone || 'America/Sao_Paulo',
                        currency: data.currency || 'BRL',
                    }));
                }
            })
            .catch(err => console.error('Error loading system-settings', err));

        axios.get('/integrations')
            .then(res => {
                const data = Array.isArray(res.data) ? res.data[0] : res.data;
                if (data) {
                    setIntegrationId(data.id);
                    setIntegration({
                        name: data.name || 'Kentro',
                        base_url: data.base_url || '',
                        api_key: data.api_key || '',
                        queue_id: data.queue_id || '',
                        lembrete_ativo: data.lembrete_ativo || false,
                        is_official_api: data.is_official_api || false,
                        whatsapp_message_text: data.whatsapp_message_text || '',
                        whatsapp_template_id: data.whatsapp_template_id || '',
                    });
                }
            })
            .catch(() => {});

        // WhatsApp — carregar instância
        getWhatsappInstance()
            .then(res => {
                setWaInstance(res.data);
                setWaStatus(res.data.status || 'close');
                setWaMessageTemplate(res.data.message_template || '');
            })
            .catch(() => setWaInstance(null));

        // IA — checar configuração e pegar infos básicas (plano/vencimento)
        getCompanyInfo()
            .then(res => {
                setAiConfigured(res.data?.ai_configured || false);
                setCompanyInfo({
                    plan: res.data?.plan || 'free',
                    due_date: res.data?.due_date || null
                });
            })
            .catch(() => {});

        return () => stopPolling();
    }, []);

    // ─── Polling helpers ─────────────────────────────────────────────────────
    const startPolling = () => {
        stopPolling();
        pollingRef.current = setInterval(async () => {
            try {
                const res = await getWhatsappStatus();
                const { status, raw_response } = res.data || {};
                console.log('[Polling Frontend] Status recebido do backend:', status, raw_response);

                if (status) {
                    setWaStatus(status);
                }

                // Se conectou, ou se desconectou definitivamente após tentar
                if (status === 'open' || status === 'connected') {
                    stopPolling();
                    setWaQrCode(null);
                    setWaLoading('idle');
                    toast.success('WhatsApp conectado com sucesso! 🎉');
                    // refresh instance data
                    getWhatsappInstance().then(r => setWaInstance(r.data)).catch(() => {});
                } else if (status === 'close') {
                    // Parar o polling se por algum motivo a instância foi deletada ou deu erro fatal
                    console.warn('[Polling Frontend] Instância retornou status fechado (close).');
                    stopPolling();
                    setWaLoading('idle');
                }
            } catch (err) {
                console.error('[Polling Frontend] Erro na requisição de status:', err.response?.data || err.message);
                // Pode parar o polling se der 404 (instância não existe no banco)
                if (err.response?.status === 404) {
                    stopPolling();
                    setWaLoading('idle');
                }
            }
        }, 4000);
    };

    const stopPolling = () => {
        if (pollingRef.current) {
            clearInterval(pollingRef.current);
            pollingRef.current = null;
        }
    };

    // ─── WhatsApp: criar instância ────────────────────────────────────────────
    const handleCreateInstance = async () => {
        setWaLoading('creating');
        try {
            const res = await createWhatsappInstance();
            setWaInstance(res.data.instance);
            setWaStatus('close');
            setWaMessageTemplate(res.data.instance.message_template || '');
            toast.success('Instância criada! Aguardando conexão...');
            // já vai para o connect
            await handleConnect(res.data.instance);
        } catch (err) {
            const msg = err.response?.data?.error || 'Erro ao criar instância.';
            if (err.response?.status === 409) toast.error('Já existe uma instância para esta clínica.');
            else toast.error(msg);
            setWaLoading('idle');
        }
    };

    // ─── WhatsApp: gerar / exibir QR ─────────────────────────────────────────
    const handleConnect = async (instanceOverride = null) => {
        const inst = instanceOverride || waInstance;
        if (!inst) return;
        setWaLoading('connecting');
        setWaQrCode(null);
        try {
            const res = await connectWhatsappInstance();
            const base64 = res.data.base64 || res.data.qrcode?.base64;
            if (base64) {
                setWaQrCode(base64.startsWith('data:') ? base64 : `data:image/png;base64,${base64}`);
            }
            setWaStatus('connecting');
            setWaLoading('polling');
            startPolling();
        } catch (err) {
            toast.error(err.response?.data?.error || 'Erro ao gerar QR Code.');
            setWaLoading('idle');
        }
    };

    // ─── WhatsApp: toggle lembrete ────────────────────────────────────────────
    const handleToggleLembrete = async (value) => {
        setWaLoading('toggling');
        try {
            await toggleWhatsappLembrete(value);
            setWaInstance(prev => ({ ...prev, lembrete_ativo: value }));
            toast.success(value ? 'Lembretes ativados!' : 'Lembretes desativados.');
        } catch {
            toast.error('Erro ao alterar configuração de lembretes.');
        } finally {
            setWaLoading('idle');
        }
    };

    // ─── WhatsApp: enviar mensagem teste ─────────────────────────────────────
    const handleWaSendTest = async () => {
        if (!waTestPhone) { toast.error('Informe o número de destino.'); return; }
        setWaLoading('sending');
        try {
            await sendWhatsappMessage(waTestPhone, waTestText || '✅ Mensagem de teste Sisagenda.');
            toast.success('Mensagem de teste enviada!');
        } catch (err) {
            toast.error(err.response?.data?.error || 'Erro ao enviar mensagem.');
        } finally {
            setWaLoading('idle');
        }
    };

    // ─── WhatsApp: salvar template de mensagem ───────────────────────────────
    const handleSaveWaTemplate = async () => {
        setIsSavingWaTemplate(true);
        try {
            await updateWhatsappTemplate(waMessageTemplate);
            setWaInstance(prev => ({ ...prev, message_template: waMessageTemplate }));
            toast.success('Template de mensagem salvo com sucesso!');
        } catch (err) {
            toast.error(err.response?.data?.error || 'Erro ao salvar template.');
        } finally {
            setIsSavingWaTemplate(false);
        }
    };

    // ─── WhatsApp: remover instância ──────────────────────────────────────────
    const handleDeleteInstance = async () => {
        setConfirmDialog({
            isOpen: true,
            title: 'Desconectar WhatsApp',
            message: 'Tem certeza? Isso desconectará o WhatsApp da clínica e removerá a instância.',
            type: 'danger',
            onConfirm: async () => {
                setWaLoading('deleting');
                try {
                    await deleteWhatsappInstance();
                    stopPolling();
                    setWaInstance(null);
                    setWaStatus('close');
                    setWaQrCode(null);
                    toast.success('Instância removida com sucesso.');
                } catch (err) {
                    toast.error(err.response?.data?.error || 'Erro ao remover instância.');
                } finally {
                    setWaLoading('idle');
                    setConfirmDialog(prev => ({ ...prev, isOpen: false }));
                }
            }
        });
    };

    // ─── Kentro: desabilitar (DELETE + reset) ───────────────────────────────
    const [isDisblingKentro, setIsDisablingKentro] = useState(false);

    const handleDisableKentro = async () => {
        if (!integrationId) return;
        setConfirmDialog({
            isOpen: true,
            title: 'Remover Kentro',
            message: 'Deseja remover as configurações do Kentro? As credenciais serão apagadas permanentemente.',
            type: 'danger',
            onConfirm: async () => {
                setIsDisablingKentro(true);
                try {
                    await axios.delete(`/integrations/${integrationId}`);
                    setIntegrationId(null);
                    setIntegration({
                        name: 'Kentro',
                        base_url: '',
                        api_key: '',
                        queue_id: '',
                        lembrete_ativo: false,
                        is_official_api: false,
                        whatsapp_message_text: '',
                        whatsapp_template_id: '',
                    });
                    setTestPhone('');
                    toast.success('Integração Kentro removida com sucesso.');
                } catch {
                    toast.error('Erro ao remover integração Kentro.');
                } finally {
                    setIsDisablingKentro(false);
                    setConfirmDialog(prev => ({ ...prev, isOpen: false }));
                }
            }
        });
    };

    // ─── Kentro: salvar ───────────────────────────────────────────────────────
    const handleSaveSettings = async (e) => {
        e.preventDefault();
        if (isSavingSettings) return;
        setIsSavingSettings(true);
        try {
            const payload = {
                company_name: settings.company_name,
                company_cnpj: settings.company_cnpj,
                timezone: settings.timezone,
                currency: settings.currency,
            };
            if (settingsId) {
                await axios.put(`/system-settings/${settingsId}`, payload);
            } else {
                const res = await axios.post('/system-settings', payload);
                const newData = Array.isArray(res.data) ? res.data[0] : res.data;
                if (newData?.id) setSettingsId(newData.id);
            }
            refreshSettings();
            toast.success('Dados da clínica salvos com sucesso!');
        } catch {
            toast.error('Erro ao salvar dados da clínica.');
        } finally {
            setIsSavingSettings(false);
        }
    };

    const handleSaveIntegration = async () => {
        if (isSavingIntegration) return;
        if (!integration.base_url || !integration.api_key || !integration.queue_id) {
            toast.error('Preencha URL, API Key e Queue ID antes de salvar.');
            return;
        }
        setIsSavingIntegration(true);
        try {
            const payload = {
                name: integration.name,
                base_url: integration.base_url,
                api_key: integration.api_key,
                queue_id: Number(integration.queue_id),
                lembrete_ativo: integration.lembrete_ativo,
                is_official_api: integration.is_official_api,
                whatsapp_message_text: integration.is_official_api ? '' : integration.whatsapp_message_text,
                whatsapp_template_id: integration.is_official_api ? integration.whatsapp_template_id : '',
            };
            if (integrationId) {
                await axios.put(`/integrations/${integrationId}`, payload);
            } else {
                const res = await axios.post('/integrations', payload);
                const newData = Array.isArray(res.data) ? res.data[0] : res.data;
                if (newData?.id) setIntegrationId(newData.id);
            }
            toast.success('Integração Kentro salva com sucesso!');
        } catch {
            toast.error('Erro ao salvar integração.');
        } finally {
            setIsSavingIntegration(false);
        }
    };

    const handleTestDispatch = async () => {
        if (!testPhone) { toast.error('Informe um número de telefone para teste.'); return; }
        if (!integration.base_url || !integration.api_key || !integration.queue_id) {
            toast.error('Salve as configurações de integração antes de testar.');
            return;
        }
        setIsTesting(true);
        try {
            const response = await fetch(`https://${integration.base_url}/int/enqueueMessageToSend`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    queueId: Number(integration.queue_id),
                    apiKey: integration.api_key,
                    number: testPhone,
                    text: '✅ Teste de integração Sisagenda - mensagem enviada com sucesso!'
                })
            });
            if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
            toast.success('Mensagem de teste enviada!');
        } catch {
            toast.error('Falha no disparo. Verifique as credenciais.');
        } finally {
            setIsTesting(false);
        }
    };

    // ─── Helpers de UI ────────────────────────────────────────────────────────
    const waStatusInfo = {
        open:       { label: 'Conectado',   color: 'text-green-600',  bg: 'bg-green-100',  icon: <FaCheckCircle className="text-green-500" /> },
        connecting: { label: 'Aguardando',  color: 'text-amber-600',  bg: 'bg-amber-100',  icon: <FaSpinner className="text-amber-500 animate-spin" /> },
        close:      { label: 'Desconectado',color: 'text-slate-500',  bg: 'bg-slate-100',  icon: <FaTimesCircle className="text-slate-400" /> },
    };
    const currentWaStatus = waStatusInfo[waStatus] || waStatusInfo.close;
    const waConnected = waStatus === 'open';
    const waIsLoading = waLoading !== 'idle';

    return (
        <div className="space-y-6 animate-in slide-in-from-bottom-4 duration-500 fade-in max-w-5xl mx-auto">
            {/* Header */}
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-2">
                <div>
                    <h2 className="text-2xl font-bold text-slate-800 tracking-tight">Configurações do Sistema</h2>
                    <p className="text-sm text-slate-500 mt-1">Gerencie as preferências da clínica, aparência e padrões regionais.</p>
                </div>
                <button
                    onClick={handleSaveSettings}
                    disabled={isSavingSettings}
                    className="btn-primary flex items-center gap-2"
                >
                    <FaSave /> {isSavingSettings ? 'Salvando...' : 'Salvar Alterações'}
                </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {/* Navegação lateral */}
                <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-2 h-fit">
                    <nav className="space-y-1">
                        <a href="#clinic" className="flex items-center gap-3 px-4 py-3 bg-primary/10 text-primary rounded-xl font-bold text-sm transition-colors">
                            <FaBuilding className="text-lg" /> Dados da Clínica
                        </a>
                        <a href="#integrations" className="flex items-center gap-3 px-4 py-3 text-slate-600 hover:bg-slate-50 rounded-xl font-medium text-sm transition-colors">
                            <FaPlug className="text-lg text-slate-400" /> Integrações (APIs)
                        </a>
                        <a href="#ai-integrations" className="flex items-center gap-3 px-4 py-3 text-slate-600 hover:bg-slate-50 rounded-xl font-medium text-sm transition-colors">
                            <FaBrain className="text-lg text-violet-400" /> IA Clínica
                        </a>
                        <a href="#localization" className="flex items-center gap-3 px-4 py-3 text-slate-600 hover:bg-slate-50 rounded-xl font-medium text-sm transition-colors">
                            <FaGlobe className="text-lg text-slate-400" /> Localização e Fuso
                        </a>
                        <a href="#api-docs" className="flex items-center gap-3 px-4 py-3 text-slate-600 hover:bg-slate-50 rounded-xl font-medium text-sm transition-colors">
                            <FaCode className="text-lg text-slate-400" /> Documentação API
                        </a>
                    </nav>
                </div>

                {/* Conteúdo principal */}
                <div className="md:col-span-2 space-y-6">

                    {/* Dados da Clínica */}
                    <div id="clinic" className="bg-white rounded-2xl shadow-sm border border-slate-100 p-6">
                        <h3 className="text-lg font-bold text-slate-800 mb-4 border-b border-slate-100 pb-3">Identidade da Clínica</h3>
                        <div className="flex flex-col sm:flex-row gap-6 mb-6">
                            <div className="flex-1 space-y-4">
                                <div>
                                    <label className="block text-sm font-bold text-slate-700 mb-1">Nome Fantasia / Razão Social</label>
                                    <input type="text" className="w-full px-4 py-2 border border-slate-200 rounded-lg bg-white text-slate-900 focus:ring-2 focus:ring-primary/20 outline-none" value={settings.company_name} onChange={e => setSettings({ ...settings, company_name: e.target.value })} />
                                </div>
                                <div>
                                    <label className="block text-sm font-bold text-slate-700 mb-1">CNPJ</label>
                                    <input type="text" className="w-full px-4 py-2 border border-slate-200 rounded-lg bg-white text-slate-900 focus:ring-2 focus:ring-primary/20 outline-none" value={settings.company_cnpj} onChange={e => setSettings({ ...settings, company_cnpj: e.target.value })} />
                                </div>
                                
                                <div className="mt-6 pt-6 border-t border-slate-100 flex items-center justify-between bg-slate-50/50 p-4 rounded-xl border border-slate-200">
                                    <div>
                                        <p className="text-xs text-slate-500 font-bold uppercase tracking-wider mb-1">Plano Atual</p>
                                        <div className="flex items-center gap-2">
                                            <span className={`px-3 py-1 text-xs font-bold uppercase rounded-lg shadow-sm border ${
                                                companyInfo.plan === 'pro' ? 'bg-indigo-50 border-indigo-200 text-indigo-700' :
                                                companyInfo.plan === 'start' ? 'bg-emerald-50 border-emerald-200 text-emerald-700' :
                                                'bg-white border-slate-200 text-slate-600'
                                            }`}>
                                                {companyInfo.plan || 'Free'}
                                            </span>
                                        </div>
                                    </div>
                                    <div className="text-right">
                                        <p className="text-xs text-slate-500 font-bold uppercase tracking-wider mb-1">Data de Vencimento</p>
                                        <p className="text-sm font-bold text-slate-800">
                                            {companyInfo.due_date ? formatDueDate(companyInfo.due_date) : '—'}
                                        </p>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* ─── Integrações ─────────────────────────────────────────── */}
                    <div id="integrations" className="space-y-3">
                        <div className="flex items-center gap-2 px-1">
                            <FaPlug className="text-slate-400" />
                            <h3 className="text-base font-bold text-slate-700">Integrações (APIs)</h3>
                        </div>

                        {/* ══════════════════ PAINEL KENTRO ══════════════════ */}
                        <Accordion
                            icon={
                                <div className="w-10 h-10 rounded-xl bg-green-50 flex items-center justify-center flex-shrink-0">
                                    <FaWhatsapp className="text-green-500 text-xl" />
                                </div>
                            }
                            title="Mensageria Kentro"
                            subtitle="Disparo automático via servidor Kentro (WhatsApp API terceirizado)"
                            badge={<StatusBadge configured={!!integrationId} label={integrationId ? 'Configurado' : 'Não configurado'} />}
                            defaultOpen={false}
                            disabled={!!waInstance}
                            disabledMessage="A integração via WhatsApp Próprio já está ativa. Desconecte-a primeiro para usar o Kentro e evitar disparos duplicados."
                        >
                            <div className="space-y-4 pt-2">
                                {/* Nome */}
                                <div>
                                    <label className="block text-sm font-bold text-slate-700 mb-1">Nome da Integração</label>
                                    <input type="text" className="w-full px-4 py-2 border border-slate-200 rounded-lg bg-white text-slate-900 focus:ring-2 focus:ring-green-500/20 focus:border-green-500 outline-none" value={integration.name} onChange={e => setIntegration({ ...integration, name: e.target.value })} placeholder="Ex: Kentro Zap" />
                                </div>

                                {/* URL */}
                                <div>
                                    <label className="block text-sm font-bold text-slate-700 mb-1">
                                        <FaLink className="inline mr-1 text-slate-400" /> URL Base do Servidor Kentro
                                    </label>
                                    <div className="flex items-center border border-slate-200 rounded-lg overflow-hidden bg-white focus-within:ring-2 focus-within:ring-green-500/20 focus-within:border-green-500">
                                        <span className="px-3 py-2 bg-slate-50 border-r border-slate-200 text-slate-500 text-sm font-mono">https://</span>
                                        <input type="text" className="flex-1 px-3 py-2 outline-none text-slate-900 text-sm" value={integration.base_url} onChange={e => setIntegration({ ...integration, base_url: e.target.value })} placeholder="meuservidor.kentro.com.br" />
                                    </div>
                                    <p className="text-[11px] text-slate-500 mt-1">O endpoint de disparo será: <code className="bg-slate-100 px-1 rounded">/int/enqueueMessageToSend</code></p>
                                </div>

                                {/* Queue + API Key */}
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                    <div>
                                        <label className="block text-sm font-bold text-slate-700 mb-1">ID da Fila (Queue ID)</label>
                                        <input type="number" className="w-full px-4 py-2 border border-slate-200 rounded-lg bg-white text-slate-900 focus:ring-2 focus:ring-green-500/20 focus:border-green-500 outline-none" value={integration.queue_id} onChange={e => setIntegration({ ...integration, queue_id: e.target.value })} placeholder="Ex: 12345" />
                                    </div>
                                    <div>
                                        <label className="block text-sm font-bold text-slate-700 mb-1">API Key (Autenticação)</label>
                                        <input type="password" className="w-full px-4 py-2 border border-slate-200 rounded-lg bg-white text-slate-900 focus:ring-2 focus:ring-green-500/20 focus:border-green-500 outline-none" value={integration.api_key} onChange={e => setIntegration({ ...integration, api_key: e.target.value })} placeholder="Sua chave secreta" />
                                    </div>
                                </div>

                                {/* Tipo de Conexão */}
                                <div className="p-4 bg-slate-50 rounded-xl border border-slate-200">
                                    <label className="block text-sm font-bold text-slate-700 mb-3">Tipo de Conexão WhatsApp</label>
                                    <div className="flex flex-col sm:flex-row gap-4 mb-4">
                                        <label className="flex items-center gap-2 cursor-pointer">
                                            <input type="radio" name="whatsapp_type" className="w-4 h-4 text-green-600 focus:ring-green-500" checked={!integration.is_official_api} onChange={() => setIntegration({ ...integration, is_official_api: false, whatsapp_template_id: '' })} />
                                            <span className="text-sm text-slate-700 font-medium">WhatsApp Business Padrão</span>
                                        </label>
                                        <label className="flex items-center gap-2 cursor-pointer">
                                            <input type="radio" name="whatsapp_type" className="w-4 h-4 text-green-600 focus:ring-green-500" checked={integration.is_official_api} onChange={() => setIntegration({ ...integration, is_official_api: true, whatsapp_message_text: '' })} />
                                            <span className="text-sm text-slate-700 font-medium">WhatsApp API Oficial</span>
                                        </label>
                                    </div>
                                    {!integration.is_official_api ? (
                                        <div className="animate-in fade-in zoom-in duration-300">
                                            <label className="block text-sm font-bold text-slate-700 mb-1">Texto da Mensagem</label>
                                            <textarea className="w-full px-4 py-3 border border-slate-200 rounded-lg bg-white text-slate-900 focus:ring-2 focus:ring-green-500/20 focus:border-green-500 outline-none resize-none h-24 text-sm" value={integration.whatsapp_message_text} onChange={e => setIntegration({ ...integration, whatsapp_message_text: e.target.value })} placeholder="Ex: Olá {nome_paciente}, sua consulta..." />
                                            <p className="text-[11px] text-slate-500 mt-1 leading-relaxed">
                                                Tags: <code className="bg-slate-200 px-1 py-0.5 rounded mx-1">{'{nome_paciente}'}</code>
                                                <code className="bg-slate-200 px-1 py-0.5 rounded mx-1">{'{nome_medico}'}</code>
                                                <code className="bg-slate-200 px-1 py-0.5 rounded mx-1">{'{data}'}</code>
                                                <code className="bg-slate-200 px-1 py-0.5 rounded mx-1">{'{hora}'}</code>
                                            </p>
                                        </div>
                                    ) : (
                                        <div className="animate-in fade-in zoom-in duration-300">
                                            <div className="flex items-center gap-2 mb-1 relative group">
                                                <label className="block text-sm font-bold text-slate-700">ID do Template (Template ID)</label>
                                                <FaInfoCircle className="text-slate-400 hover:text-green-500 cursor-help transition-colors" />
                                                <div className="absolute left-0 bottom-full mb-2 w-72 bg-slate-800 text-white text-xs p-3 rounded-xl shadow-xl opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-200 z-10 pointer-events-none">
                                                    <p className="font-bold mb-1 text-green-400">Parâmetros Obrigatórios (Meta):</p>
                                                    <ul className="space-y-1 font-mono text-[10px] bg-slate-900/50 p-2 rounded-lg border border-slate-700">
                                                        <li><span className="text-green-400">{'{{1}}'}</span> : nome_paciente</li>
                                                        <li><span className="text-green-400">{'{{2}}'}</span> : nome_medico</li>
                                                        <li><span className="text-green-400">{'{{3}}'}</span> : data</li>
                                                        <li><span className="text-green-400">{'{{4}}'}</span> : hora</li>
                                                    </ul>
                                                    <div className="absolute -bottom-1 left-28 w-2 h-2 bg-slate-800 rotate-45"></div>
                                                </div>
                                            </div>
                                            <input type="text" className="w-full px-4 py-2 border border-slate-200 rounded-lg bg-white text-slate-900 focus:ring-2 focus:ring-green-500/20 focus:border-green-500 outline-none" value={integration.whatsapp_template_id} onChange={e => setIntegration({ ...integration, whatsapp_template_id: e.target.value })} placeholder="Ex: d1a2b3c4-5e6f..." />
                                        </div>
                                    )}
                                </div>

                                {/* Toggle lembrete Kentro */}
                                <div className="flex items-center justify-between p-4 bg-green-50/50 border border-green-100 rounded-xl">
                                    <div>
                                        <h4 className="text-sm font-bold text-slate-800">Lembretes Automáticos de Consulta</h4>
                                        <p className="text-xs text-slate-500 mt-1">Envia mensagem WhatsApp 1 dia antes da consulta.</p>
                                    </div>
                                    <label className="relative inline-flex items-center cursor-pointer ml-4 shrink-0">
                                        <input type="checkbox" className="sr-only peer" checked={integration.lembrete_ativo} onChange={e => setIntegration({ ...integration, lembrete_ativo: e.target.checked })} />
                                        <div className="w-11 h-6 bg-slate-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-green-500"></div>
                                    </label>
                                </div>

                                <button type="button" onClick={handleSaveIntegration} disabled={isSavingIntegration} className="w-full flex items-center justify-center gap-2 py-2 bg-green-500 hover:bg-green-600 disabled:opacity-60 text-white font-bold rounded-lg transition-colors">
                                    <FaSave /> {isSavingIntegration ? 'Salvando...' : integrationId ? 'Atualizar Integração' : 'Cadastrar Integração'}
                                </button>

                                {integrationId && (
                                    <div className="p-4 bg-green-50 rounded-xl border border-green-100">
                                        <h4 className="font-bold text-green-800 text-sm mb-3 flex items-center gap-2"><FaPaperPlane /> Testar Disparo de Mensagem</h4>
                                        <div className="flex gap-2">
                                            <input type="tel" className="flex-1 px-4 py-2 border border-green-200 rounded-lg bg-white text-slate-900 outline-none focus:ring-2 focus:ring-green-400/20 text-sm" value={testPhone} onChange={e => setTestPhone(e.target.value)} placeholder="55119XXXXXXXX (somente dígitos)" />
                                            <button type="button" onClick={handleTestDispatch} disabled={isTesting} className="flex items-center gap-2 px-4 py-2 bg-green-600 hover:bg-green-700 disabled:opacity-60 text-white font-bold rounded-lg text-sm transition-colors whitespace-nowrap">
                                                <FaPaperPlane /> {isTesting ? 'Enviando...' : 'Testar'}
                                            </button>
                                        </div>
                                        <p className="text-[11px] text-green-700 mt-2">Enviará uma mensagem de confirmação simples para o número informado.</p>
                                    </div>
                                )}

                                {/* Botão Desabilitar Kentro */}
                                {integrationId && (
                                    <div className="pt-2 border-t border-slate-100">
                                        <button
                                            type="button"
                                            onClick={handleDisableKentro}
                                            disabled={isDisblingKentro}
                                            className="flex items-center gap-2 px-4 py-2 text-red-500 hover:bg-red-50 disabled:opacity-50 rounded-lg text-sm font-medium transition-colors border border-red-200"
                                        >
                                            {isDisblingKentro ? <FaSpinner className="animate-spin" /> : <FaTrash />}
                                            {isDisblingKentro ? 'Removendo...' : 'Desabilitar integração Kentro'}
                                        </button>
                                    </div>
                                )}
                            </div>
                        </Accordion>

                        {/* ══════════════════ PAINEL EVOLUTION API ══════════════════ */}
                        <Accordion
                            icon={
                                <div className="w-10 h-10 rounded-xl bg-emerald-50 flex items-center justify-center flex-shrink-0">
                                    <FaWhatsapp className="text-emerald-600 text-xl" />
                                </div>
                            }
                            title="WhatsApp Próprio"
                            subtitle="Conecte o número da clínica diretamente — sem intermediários"
                            badge={
                                waInstance
                                    ? <span className={`text-xs font-bold px-2.5 py-1 rounded-full flex items-center gap-1.5 ${currentWaStatus.bg} ${currentWaStatus.color}`}>
                                        {currentWaStatus.icon} {currentWaStatus.label}
                                      </span>
                                    : <StatusBadge configured={false} label="Não conectado" />
                            }
                            defaultOpen={!!waInstance}
                            disabled={!!integrationId}
                            disabledMessage="A integração Kentro já está configurada. Desabilite-a primeiro para usar o WhatsApp Próprio e evitar disparos duplicados."
                        >
                            <div className="space-y-4 pt-2">

                                {/* ── Sem instância: botão inicial ── */}
                                {!waInstance && (
                                    <div className="flex flex-col items-center justify-center py-8 gap-4">
                                        <div className="w-16 h-16 rounded-2xl bg-emerald-50 flex items-center justify-center">
                                            <FaWhatsapp className="text-emerald-500 text-3xl" />
                                        </div>
                                        <div className="text-center">
                                            <p className="font-bold text-slate-800">Conecte seu WhatsApp</p>
                                            <p className="text-sm text-slate-500 mt-1 max-w-xs">Use o número da própria clínica — sem precisar de plataformas de terceiros.</p>
                                        </div>
                                        <button
                                            type="button"
                                            onClick={handleCreateInstance}
                                            disabled={waIsLoading}
                                            className="flex items-center gap-2 px-6 py-3 bg-emerald-500 hover:bg-emerald-600 disabled:opacity-60 text-white font-bold rounded-xl transition-colors shadow-lg shadow-emerald-500/20"
                                        >
                                            {waLoading === 'creating' || waLoading === 'connecting'
                                                ? <FaSpinner className="animate-spin" />
                                                : <FaWhatsapp />
                                            }
                                            {waLoading === 'creating' ? 'Criando...' : waLoading === 'connecting' ? 'Gerando QR...' : 'Conectar WhatsApp'}
                                        </button>
                                    </div>
                                )}

                                {/* ── Com instância ── */}
                                {waInstance && (
                                    <>
                                        {/* Status card */}
                                        <div className={`flex items-center gap-3 p-4 rounded-xl border ${waConnected ? 'bg-emerald-50 border-emerald-200' : 'bg-slate-50 border-slate-200'}`}>
                                            <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${waConnected ? 'bg-emerald-100' : 'bg-slate-100'}`}>
                                                {currentWaStatus.icon}
                                            </div>
                                            <div className="flex-1">
                                                <p className={`font-bold text-sm ${currentWaStatus.color}`}>{currentWaStatus.label}</p>
                                            </div>
                                            {!waConnected && (
                                                <button
                                                    type="button"
                                                    onClick={() => handleConnect()}
                                                    disabled={waIsLoading}
                                                    className="flex items-center gap-2 px-4 py-2 bg-emerald-500 hover:bg-emerald-600 disabled:opacity-60 text-white font-bold rounded-lg text-sm transition-colors"
                                                >
                                                    {waLoading === 'connecting' || waLoading === 'polling'
                                                        ? <FaSpinner className="animate-spin" />
                                                        : <FaQrcode />
                                                    }
                                                    {waLoading === 'polling' ? 'Aguardando...' : 'Gerar QR Code'}
                                                </button>
                                            )}
                                        </div>

                                        {/* QR Code */}
                                        {waQrCode && !waConnected && (
                                            <div className="flex flex-col items-center gap-3 p-5 bg-white border-2 border-emerald-200 rounded-2xl animate-in fade-in zoom-in duration-300">
                                                <p className="text-sm font-bold text-slate-700 flex items-center gap-2">
                                                    <FaQrcode className="text-emerald-500" />
                                                    Escaneie com o WhatsApp do seu celular
                                                </p>
                                                <img
                                                    src={waQrCode}
                                                    alt="QR Code WhatsApp"
                                                    className="w-52 h-52 rounded-xl border border-slate-100 shadow-sm"
                                                />
                                                <div className="flex items-center gap-2 text-xs text-amber-600 bg-amber-50 px-3 py-2 rounded-lg">
                                                    <FaSpinner className="animate-spin flex-shrink-0" />
                                                    Aguardando conexão... verificando a cada 4 segundos
                                                </div>
                                            </div>
                                        )}

                                        {/* Toggle lembrete Evolution */}
                                        <div className="flex items-center justify-between p-4 bg-emerald-50/50 border border-emerald-100 rounded-xl">
                                            <div>
                                                <h4 className="text-sm font-bold text-slate-800 flex items-center gap-2">
                                                    {waInstance.lembrete_ativo
                                                        ? <FaToggleOn className="text-emerald-500 text-lg" />
                                                        : <FaToggleOff className="text-slate-400 text-lg" />
                                                    }
                                                    Lembretes Automáticos de Consulta
                                                </h4>
                                                <p className="text-xs text-slate-500 mt-1">Envia mensagem 1 dia antes da consulta diretamente pelo seu WhatsApp.</p>
                                            </div>
                                            <label className="relative inline-flex items-center cursor-pointer ml-4 shrink-0">
                                                <input
                                                    type="checkbox"
                                                    className="sr-only peer"
                                                    checked={waInstance.lembrete_ativo || false}
                                                    disabled={!waConnected || waLoading === 'toggling'}
                                                    onChange={e => handleToggleLembrete(e.target.checked)}
                                                />
                                                <div className="w-11 h-6 bg-slate-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-emerald-500 peer-disabled:opacity-50"></div>
                                            </label>
                                        </div>

                                        {/* Template de Mensagem Evolution */}
                                        <div className="p-4 bg-slate-50 rounded-xl border border-slate-200 animate-in fade-in duration-300">
                                            <div className="flex justify-between items-center mb-3">
                                                <div>
                                                    <h4 className="text-sm font-bold text-slate-800">Texto da Mensagem (Lembretes)</h4>
                                                    <p className="text-xs text-slate-500 mt-0.5">Personalize como os seus pacientes receberão o lembrete.</p>
                                                </div>
                                                <button 
                                                    type="button"
                                                    onClick={handleSaveWaTemplate} 
                                                    disabled={isSavingWaTemplate} 
                                                    className="flex items-center gap-2 px-3 py-1.5 bg-emerald-500 hover:bg-emerald-600 disabled:opacity-60 text-white font-bold rounded shadow-sm text-xs transition-colors"
                                                >
                                                    {isSavingWaTemplate ? <FaSpinner className="animate-spin" /> : <FaSave />}
                                                    {isSavingWaTemplate ? 'Salvando...' : 'Salvar Texto'}
                                                </button>
                                            </div>
                                            <textarea 
                                                className="w-full px-4 py-3 border border-slate-200 rounded-lg bg-white text-slate-900 focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 outline-none resize-none h-24 text-sm" 
                                                value={waMessageTemplate} 
                                                onChange={e => setWaMessageTemplate(e.target.value)} 
                                                placeholder="Ex: Olá {nome_paciente}! Lembramos da sua consulta com {nome_medico} marcada para o dia {data} às {hora}. Por favor, confirme sua presença." 
                                            />
                                            <p className="text-[11px] text-slate-500 mt-2 leading-relaxed">
                                                Deixe em branco para usar a mensagem padrão do sistema. Tags disponíveis: <code className="bg-slate-200 px-1 py-0.5 rounded mx-1">{'{nome_paciente}'}</code>
                                                <code className="bg-slate-200 px-1 py-0.5 rounded mx-1">{'{nome_medico}'}</code>
                                                <code className="bg-slate-200 px-1 py-0.5 rounded mx-1">{'{data}'}</code>
                                                <code className="bg-slate-200 px-1 py-0.5 rounded mx-1">{'{hora}'}</code>
                                            </p>
                                        </div>

                                        {/* Teste de mensagem */}
                                        {waConnected && (
                                            <div className="p-4 bg-emerald-50 rounded-xl border border-emerald-100 animate-in fade-in duration-300">
                                                <h4 className="font-bold text-emerald-800 text-sm mb-3 flex items-center gap-2">
                                                    <FaPaperPlane /> Testar Envio de Mensagem
                                                </h4>
                                                <div className="space-y-2">
                                                    <input
                                                        type="tel"
                                                        className="w-full px-4 py-2 border border-emerald-200 rounded-lg bg-white text-slate-900 outline-none focus:ring-2 focus:ring-emerald-400/20 text-sm"
                                                        value={waTestPhone}
                                                        onChange={e => setWaTestPhone(e.target.value)}
                                                        placeholder="55119XXXXXXXX (somente dígitos)"
                                                    />
                                                    <div className="flex gap-2">
                                                        <input
                                                            type="text"
                                                            className="flex-1 px-4 py-2 border border-emerald-200 rounded-lg bg-white text-slate-900 outline-none focus:ring-2 focus:ring-emerald-400/20 text-sm"
                                                            value={waTestText}
                                                            onChange={e => setWaTestText(e.target.value)}
                                                            placeholder="Texto da mensagem"
                                                        />
                                                        <button
                                                            type="button"
                                                            onClick={handleWaSendTest}
                                                            disabled={waLoading === 'sending'}
                                                            className="flex items-center gap-2 px-4 py-2 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-60 text-white font-bold rounded-lg text-sm transition-colors whitespace-nowrap"
                                                        >
                                                            {waLoading === 'sending' ? <FaSpinner className="animate-spin" /> : <FaPaperPlane />}
                                                            {waLoading === 'sending' ? 'Enviando...' : 'Enviar'}
                                                        </button>
                                                    </div>
                                                </div>
                                            </div>
                                        )}

                                        {/* Remover instância */}
                                        <div className="pt-2 border-t border-slate-100">
                                            <button
                                                type="button"
                                                onClick={handleDeleteInstance}
                                                disabled={waIsLoading}
                                                className="flex items-center gap-2 px-4 py-2 text-red-500 hover:bg-red-50 disabled:opacity-50 rounded-lg text-sm font-medium transition-colors border border-red-200"
                                            >
                                                {waLoading === 'deleting' ? <FaSpinner className="animate-spin" /> : <FaTrash />}
                                                {waLoading === 'deleting' ? 'Removendo...' : 'Desconectar e remover instância'}
                                            </button>
                                        </div>
                                    </>
                                )}
                            </div>
                        </Accordion>

                        {/* ══════════════════ PAINEL IA (OpenAI) ══════════════════ */}
                        <Accordion
                            icon={
                                <div className="w-10 h-10 rounded-xl bg-violet-50 flex items-center justify-center flex-shrink-0">
                                    <FaBrain className="text-violet-600 text-xl" />
                                </div>
                            }
                            title="IA Clínica (OpenAI)"
                            subtitle="Transcrição de consultas e geração automática de prontuários via Whisper + GPT-4o"
                            badge={<StatusBadge configured={aiConfigured} label={aiConfigured ? 'Configurado' : 'Não configurado'} />}
                            defaultOpen={false}
                        >
                            <div className="space-y-4 pt-2">
                                <div className="p-4 bg-violet-50 border border-violet-100 rounded-xl">
                                    <p className="text-sm text-violet-800 leading-relaxed">
                                        🎙️ Com a IA ativada, médicos poderão <strong>gravar a consulta</strong> e o sistema irá gerar automaticamente a <strong>descrição clínica e a prescrição</strong> do prontuário.
                                    </p>
                                </div>

                                <div>
                                    <label className="block text-sm font-bold text-slate-700 mb-1 flex items-center gap-2">
                                        <FaKey className="text-slate-400" /> Chave da API OpenAI (sk-proj-...)
                                    </label>
                                    <input
                                        type="password"
                                        className="w-full px-4 py-2.5 border border-slate-200 rounded-lg bg-white text-slate-900 focus:ring-2 focus:ring-violet-500/20 focus:border-violet-500 outline-none font-mono text-sm"
                                        value={aiToken}
                                        onChange={e => setAiToken(e.target.value)}
                                        placeholder="sk-proj-xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx"
                                        autoComplete="off"
                                    />
                                    <p className="text-[11px] text-slate-500 mt-1.5 leading-relaxed">
                                        Obtenha sua chave em{' '}
                                        <a href="https://platform.openai.com/api-keys" target="_blank" rel="noopener noreferrer" className="text-violet-600 hover:underline font-medium">
                                            platform.openai.com/api-keys
                                        </a>.
                                        O token é salvo de forma segura no banco de dados da clínica.
                                    </p>
                                </div>

                                <button
                                    type="button"
                                    disabled={isSavingAiToken || !aiToken}
                                    onClick={async () => {
                                        setIsSavingAiToken(true);
                                        try {
                                            await saveAiToken(aiToken);
                                            setAiConfigured(true);
                                            setAiToken('');
                                            toast.success('Token da OpenAI salvo com sucesso! A IA está ativa. 🤖');
                                        } catch (err) {
                                            toast.error(err.response?.data?.error || 'Erro ao salvar token da OpenAI.');
                                        } finally {
                                            setIsSavingAiToken(false);
                                        }
                                    }}
                                    className="w-full flex items-center justify-center gap-2 py-2.5 bg-violet-600 hover:bg-violet-700 disabled:opacity-50 text-white font-bold rounded-lg transition-colors"
                                >
                                    {isSavingAiToken ? <FaSpinner className="animate-spin" /> : <FaSave />}
                                    {isSavingAiToken ? 'Salvando...' : aiConfigured ? 'Atualizar Token da IA' : 'Ativar IA Clínica'}
                                </button>

                                {aiConfigured && (
                                    <div className="flex items-center gap-3 p-3 bg-green-50 border border-green-200 rounded-xl">
                                        <FaCheckCircle className="text-green-500 flex-shrink-0" />
                                        <div>
                                            <p className="text-sm font-bold text-green-800">IA ativa e configurada</p>
                                            <p className="text-xs text-green-600 mt-0.5">O botão "Gravar Consulta" será exibido nos prontuários médicos.</p>
                                        </div>
                                    </div>
                                )}
                            </div>
                        </Accordion>

                    </div>

                    {/* Localização */}
                    <div id="localization" className="bg-white rounded-2xl shadow-sm border border-slate-100 p-6">
                        <h3 className="text-lg font-bold text-slate-800 mb-4 border-b border-slate-100 pb-3">Localização</h3>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                            <div>
                                <label className="block text-sm font-bold text-slate-700 mb-1">Fuso Horário (Timezone)</label>
                                <select className="w-full px-4 py-2 border border-slate-200 rounded-lg bg-white text-slate-900 focus:ring-2 focus:ring-primary/20 outline-none" value={settings.timezone} onChange={e => setSettings({ ...settings, timezone: e.target.value })}>
                                    <option value="America/Sao_Paulo">(GMT-03:00) Horário de Brasília</option>
                                    <option value="America/Manaus">(GMT-04:00) Manaus</option>
                                    <option value="UTC">UTC (Universal)</option>
                                </select>
                            </div>
                            <div>
                                <label className="block text-sm font-bold text-slate-700 mb-1">Moeda Padrão</label>
                                <select className="w-full px-4 py-2 border border-slate-200 rounded-lg bg-white text-slate-900 focus:ring-2 focus:ring-primary/20 outline-none" value={settings.currency} onChange={e => setSettings({ ...settings, currency: e.target.value })}>
                                    <option value="BRL">Real Brasileiro (BRL - R$)</option>
                                    <option value="USD">Dólar Americano (USD - $)</option>
                                    <option value="EUR">Euro (EUR - €)</option>
                                </select>
                            </div>
                        </div>
                    </div>

                    {/* API Docs */}
                    <div id="api-docs" className="bg-white rounded-2xl shadow-sm border border-slate-100 p-6">
                        <div className="flex items-center gap-3 mb-4 border-b border-slate-100 pb-3">
                            <div className="w-10 h-10 rounded-lg bg-blue-50 flex items-center justify-center">
                                <FaCode className="text-blue-500 text-2xl" />
                            </div>
                            <div>
                                <h3 className="text-lg font-bold text-slate-800">Documentação Provedor (API Docs)</h3>
                                <p className="text-xs text-slate-500">Acesso técnico para integração com sistemas de terceiros.</p>
                            </div>
                        </div>
                        <div className="bg-slate-50 rounded-xl p-4 border border-slate-100 mb-4">
                            <p className="text-sm text-slate-600 leading-relaxed">
                                Utilize a nossa documentação <strong>Swagger</strong> interativa para explorar os endpoints disponíveis, formatos de dados e métodos de autenticação da plataforma.
                            </p>
                        </div>
                        <a
                            href={`${axios.defaults.baseURL}/api-docs`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="w-full flex items-center justify-center gap-2 py-3 bg-slate-800 hover:bg-slate-900 text-white font-bold rounded-xl transition-all shadow-lg hover:shadow-slate-200"
                        >
                            <FaExternalLinkAlt /> Abrir Documentação Swagger
                        </a>
                    </div>

                </div>
            </div>
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

export default SettingsPage;
