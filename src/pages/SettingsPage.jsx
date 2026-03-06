import { useState, useEffect } from 'react';
import { FaBuilding, FaGlobe, FaSave, FaUpload, FaWhatsapp, FaPlug, FaLink, FaPaperPlane } from 'react-icons/fa';
import axios from '../api/axiosConfig';
import toast from 'react-hot-toast';
import { useSettings } from '../context/SettingsContext';

const SettingsPage = () => {
    const { refreshSettings } = useSettings();

    // ─── Dados do Sistema ─────────────────────────────────────────────────────
    const [settingsId, setSettingsId] = useState(null);
    const [settings, setSettings] = useState({
        company_name: '',
        company_cnpj: '',
        timezone: 'America/Sao_Paulo',
        currency: 'BRL',
        contactEmail: '',
    });
    const [isSavingSettings, setIsSavingSettings] = useState(false);

    // ─── Integração Kentro ────────────────────────────────────────────────────
    const [integrationId, setIntegrationId] = useState(null); // null = não cadastrado ainda
    const [integration, setIntegration] = useState({
        base_url: '',
        api_key: '',
        queue_id: '',
    });
    const [isSavingIntegration, setIsSavingIntegration] = useState(false);
    const [testPhone, setTestPhone] = useState('');
    const [isTesting, setIsTesting] = useState(false);

    // ─── Carregamento Inicial ────────────────────────────────────────────────
    useEffect(() => {
        // Dados do sistema
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
                        contactEmail: data.contact_email || '',
                    }));
                }
            })
            .catch(err => console.error('Error loading system-settings', err));

        // Dados de integração Kentro
        axios.get('/integrations')
            .then(res => {
                const data = Array.isArray(res.data) ? res.data[0] : res.data;
                if (data) {
                    setIntegrationId(data.id);
                    setIntegration({
                        base_url: data.base_url || '',
                        api_key: data.api_key || '',
                        queue_id: data.queue_id || '',
                    });
                }
            })
            .catch(err => console.warn('Integrations not configured yet:', err));
    }, []);

    // ─── Salvar Dados do Sistema ──────────────────────────────────────────────
    const handleSaveSettings = async (e) => {
        e.preventDefault();
        if (isSavingSettings) return;
        setIsSavingSettings(true);
        try {
            await axios.put(`/system-settings/${settingsId}`, {
                company_name: settings.company_name,
                company_cnpj: settings.company_cnpj,
                timezone: settings.timezone,
                currency: settings.currency,
            });
            refreshSettings();
            toast.success('Dados da clínica salvos com sucesso!');
        } catch (err) {
            console.error(err);
            toast.error('Erro ao salvar dados da clínica.');
        } finally {
            setIsSavingSettings(false);
        }
    };

    // ─── Salvar Integração Kentro (POST se não existe, PUT se já existe) ───────
    const handleSaveIntegration = async () => {
        if (isSavingIntegration) return;
        if (!integration.base_url || !integration.api_key || !integration.queue_id) {
            toast.error('Preencha URL, API Key e Queue ID antes de salvar.');
            return;
        }
        setIsSavingIntegration(true);
        try {
            const payload = {
                base_url: integration.base_url,
                api_key: integration.api_key,
                queue_id: Number(integration.queue_id),
            };
            if (integrationId) {
                await axios.put(`/integrations/${integrationId}`, payload);
            } else {
                const res = await axios.post('/integrations', payload);
                const newData = Array.isArray(res.data) ? res.data[0] : res.data;
                if (newData?.id) setIntegrationId(newData.id);
            }
            toast.success('Integração Kentro salva com sucesso!');
        } catch (err) {
            console.error(err);
            toast.error('Erro ao salvar integração.');
        } finally {
            setIsSavingIntegration(false);
        }
    };

    // ─── Disparo de Teste ───────────────────────────────────────────────────
    const handleTestDispatch = async () => {
        if (!testPhone) { toast.error('Informe um número de telefone para teste.'); return; }
        if (!integration.base_url || !integration.api_key || !integration.queue_id) {
            toast.error('Salve as configurações de integração antes de testar.');
            return;
        }
        setIsTesting(true);
        try {
            await axios.post(`https://${integration.base_url}/int/enqueueMessageToSend`, {
                queueId: Number(integration.queue_id),
                apiKey: integration.api_key,
                number: testPhone,
                text: '✅ Teste de integração Sisagenda - mensagem enviada com sucesso!',
            });
            toast.success('Mensagem de teste enviada!');
        } catch (err) {
            console.error(err);
            toast.error('Falha no disparo. Verifique as credenciais.');
        } finally {
            setIsTesting(false);
        }
    };


    return (
        <div className="space-y-6 animate-in slide-in-from-bottom-4 duration-500 fade-in max-w-5xl mx-auto">
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
                {/* Left Column - Navigation/Sections */}
                <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-2 h-fit">
                    <nav className="space-y-1">
                        <a href="#clinic" className="flex items-center gap-3 px-4 py-3 bg-primary/10 text-primary rounded-xl font-bold text-sm transition-colors">
                            <FaBuilding className="text-lg" /> Dados da Clínica
                        </a>
                        <a href="#integration" className="flex items-center gap-3 px-4 py-3 text-slate-600 hover:bg-slate-50 rounded-xl font-medium text-sm transition-colors">
                            <FaPlug className="text-lg text-slate-400" /> Integrações (APIs)
                        </a>
                        <a href="#localization" className="flex items-center gap-3 px-4 py-3 text-slate-600 hover:bg-slate-50 rounded-xl font-medium text-sm transition-colors">
                            <FaGlobe className="text-lg text-slate-400" /> Localização e Fuso
                        </a>
                    </nav>
                </div>

                {/* Right Column - Forms */}
                <div className="md:col-span-2 space-y-6">

                    {/* Clinic Data Card */}
                    <div id="clinic" className="bg-white rounded-2xl shadow-sm border border-slate-100 p-6">
                        <h3 className="text-lg font-bold text-slate-800 mb-4 border-b border-slate-100 pb-3">Identidade da Clínica</h3>

                        <div className="flex flex-col sm:flex-row gap-6 mb-6">
                            <div className="w-24 h-24 bg-slate-100 rounded-2xl border-2 border-dashed border-slate-300 flex flex-col items-center justify-center text-slate-500 shrink-0 cursor-pointer hover:border-primary transition-colors">
                                <FaUpload className="text-xl mb-1" />
                                <span className="text-[10px] font-bold uppercase">Logo</span>
                            </div>
                            <div className="flex-1 space-y-4">
                                <div>
                                    <label className="block text-sm font-bold text-slate-700 mb-1">Nome Fantasia / Razão Social</label>
                                    <input type="text" className="w-full px-4 py-2 border border-slate-200 rounded-lg bg-white text-slate-900 focus:ring-2 focus:ring-primary/20 outline-none" value={settings.company_name} onChange={e => setSettings({ ...settings, company_name: e.target.value })} />
                                </div>
                                <div className="grid grid-cols-2 gap-4">
                                    <div>
                                        <label className="block text-sm font-bold text-slate-700 mb-1">CNPJ</label>
                                        <input type="text" className="w-full px-4 py-2 border border-slate-200 rounded-lg bg-white text-slate-900 focus:ring-2 focus:ring-primary/20 outline-none" value={settings.company_cnpj} onChange={e => setSettings({ ...settings, company_cnpj: e.target.value })} />
                                    </div>
                                    <div>
                                        <label className="block text-sm font-bold text-slate-700 mb-1">E-mail de Contato</label>
                                        <input type="email" className="w-full px-4 py-2 border border-slate-200 rounded-lg bg-white text-slate-900 focus:ring-2 focus:ring-primary/20 outline-none" value={settings.contactEmail || ''} onChange={e => setSettings({ ...settings, contactEmail: e.target.value })} />
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Localization Card */}
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

                    {/* API Integrations Card */}
                    <div id="integration" className="bg-white rounded-2xl shadow-sm border border-slate-100 p-6">
                        <div className="flex items-center justify-between gap-3 mb-4 border-b border-slate-100 pb-3">
                            <div className="flex items-center gap-3">
                                <div className="w-10 h-10 rounded-lg bg-green-50 flex items-center justify-center">
                                    <FaWhatsapp className="text-green-500 text-2xl" />
                                </div>
                                <div>
                                    <h3 className="text-lg font-bold text-slate-800">Mensageria Kentro (WhatsApp API)</h3>
                                    <p className="text-xs text-slate-500">Configuração de disparo automático para confirmação de pacientes.</p>
                                </div>
                            </div>
                            <span className={`text-xs font-bold px-2 py-1 rounded-full ${integrationId ? 'bg-green-100 text-green-700' : 'bg-slate-100 text-slate-500'
                                }`}>
                                {integrationId ? '● Configurado' : '○ Não configurado'}
                            </span>
                        </div>

                        <div className="space-y-4">
                            {/* Base URL */}
                            <div>
                                <label className="block text-sm font-bold text-slate-700 mb-1">
                                    <FaLink className="inline mr-1 text-slate-400" /> URL Base do Servidor Kentro
                                </label>
                                <div className="flex items-center border border-slate-200 rounded-lg overflow-hidden bg-white focus-within:ring-2 focus-within:ring-green-500/20 focus-within:border-green-500">
                                    <span className="px-3 py-2 bg-slate-50 border-r border-slate-200 text-slate-500 text-sm font-mono">https://</span>
                                    <input
                                        type="text"
                                        className="flex-1 px-3 py-2 outline-none text-slate-900 text-sm"
                                        value={integration.base_url}
                                        onChange={e => setIntegration({ ...integration, base_url: e.target.value })}
                                        placeholder="meuservidor.kentro.com.br"
                                    />
                                </div>
                                <p className="text-[11px] text-slate-500 mt-1">O endpoint de disparo será: <code className="bg-slate-100 px-1 rounded">/int/enqueueMessageToSend</code></p>
                            </div>

                            {/* Queue ID + API Key */}
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-sm font-bold text-slate-700 mb-1">ID da Fila (Queue ID)</label>
                                    <input
                                        type="number"
                                        className="w-full px-4 py-2 border border-slate-200 rounded-lg bg-white text-slate-900 focus:ring-2 focus:ring-green-500/20 focus:border-green-500 outline-none"
                                        value={integration.queue_id}
                                        onChange={e => setIntegration({ ...integration, queue_id: e.target.value })}
                                        placeholder="Ex: 12345"
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-bold text-slate-700 mb-1">API Key (Autenticação)</label>
                                    <input
                                        type="password"
                                        className="w-full px-4 py-2 border border-slate-200 rounded-lg bg-white text-slate-900 focus:ring-2 focus:ring-green-500/20 focus:border-green-500 outline-none"
                                        value={integration.api_key}
                                        onChange={e => setIntegration({ ...integration, api_key: e.target.value })}
                                        placeholder="Sua chave secreta"
                                    />
                                </div>
                            </div>

                            {/* Botão Salvar Integração */}
                            <button
                                type="button"
                                onClick={handleSaveIntegration}
                                disabled={isSavingIntegration}
                                className="w-full flex items-center justify-center gap-2 py-2 bg-green-500 hover:bg-green-600 disabled:opacity-60 text-white font-bold rounded-lg transition-colors"
                            >
                                <FaSave /> {isSavingIntegration ? 'Salvando...' : integrationId ? 'Atualizar Integração' : 'Cadastrar Integração'}
                            </button>

                            {/* Área de Teste */}
                            {integrationId && (
                                <div className="p-4 bg-green-50 rounded-xl border border-green-100">
                                    <h4 className="font-bold text-green-800 text-sm mb-3 flex items-center gap-2">
                                        <FaPaperPlane /> Testar Disparo de Mensagem
                                    </h4>
                                    <div className="flex gap-2">
                                        <input
                                            type="tel"
                                            className="flex-1 px-4 py-2 border border-green-200 rounded-lg bg-white text-slate-900 outline-none focus:ring-2 focus:ring-green-400/20 text-sm"
                                            value={testPhone}
                                            onChange={e => setTestPhone(e.target.value)}
                                            placeholder="55119XXXXXXXX (somente dígitos)"
                                        />
                                        <button
                                            type="button"
                                            onClick={handleTestDispatch}
                                            disabled={isTesting}
                                            className="flex items-center gap-2 px-4 py-2 bg-green-600 hover:bg-green-700 disabled:opacity-60 text-white font-bold rounded-lg text-sm transition-colors whitespace-nowrap"
                                        >
                                            <FaPaperPlane /> {isTesting ? 'Enviando...' : 'Testar'}
                                        </button>
                                    </div>
                                    <p className="text-[11px] text-green-700 mt-2">Enviará uma mensagem de confirmação simples para o número informado.</p>
                                </div>
                            )}
                        </div>
                    </div>

                </div>
            </div>
        </div>
    );
};

export default SettingsPage;
