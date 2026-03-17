import { useState, useEffect } from 'react';
import { FaBuilding, FaGlobe, FaSave, FaUpload, FaWhatsapp, FaPlug, FaLink, FaPaperPlane, FaCode, FaExternalLinkAlt, FaInfoCircle } from 'react-icons/fa';
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
    });
    const [isSavingSettings, setIsSavingSettings] = useState(false);

    // ─── Integração Kentro ────────────────────────────────────────────────────
    const [integrationId, setIntegrationId] = useState(null); // null = não cadastrado ainda
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
            .catch(err => console.warn('Integrations not configured yet:', err));
    }, []);

    // ─── Salvar Dados do Sistema ──────────────────────────────────────────────
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
            // Usando fetch nativo para evitar interceptor do axios que desloga no 401
            const response = await fetch(`https://${integration.base_url}/int/enqueueMessageToSend`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    queueId: Number(integration.queue_id),
                    apiKey: integration.api_key,
                    number: testPhone,
                    text: '✅ Teste de integração Sisagenda - mensagem enviada com sucesso!'
                })
            });

            if (!response.ok) {
                // Se o Kentro retornar erro (ex: 401, 403, 500) cai aqui ao invés do interceptor
                throw new Error(`HTTP error! status: ${response.status}`);
            }

            toast.success('Mensagem de teste enviada!');
        } catch (err) {
            console.error('Kentro test error:', err);
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
                        <a href="#api-docs" className="flex items-center gap-3 px-4 py-3 text-slate-600 hover:bg-slate-50 rounded-xl font-medium text-sm transition-colors">
                            <FaCode className="text-lg text-slate-400" /> Documentação API
                        </a>
                    </nav>
                </div>

                {/* Right Column - Forms */}
                <div className="md:col-span-2 space-y-6">

                    {/* Clinic Data Card */}
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
                            {/* Nome da Integração */}
                            <div>
                                <label className="block text-sm font-bold text-slate-700 mb-1">Nome da Integração</label>
                                <input
                                    type="text"
                                    className="w-full px-4 py-2 border border-slate-200 rounded-lg bg-white text-slate-900 focus:ring-2 focus:ring-green-500/20 focus:border-green-500 outline-none"
                                    value={integration.name}
                                    onChange={e => setIntegration({ ...integration, name: e.target.value })}
                                    placeholder="Ex: Kentro Zap"
                                />
                            </div>

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

                            {/* Tipo de Conexão */}
                            <div className="p-4 bg-slate-50 rounded-xl border border-slate-200">
                                <label className="block text-sm font-bold text-slate-700 mb-3">Tipo de Conexão WhatsApp</label>
                                <div className="flex flex-col sm:flex-row gap-4 mb-4">
                                    <label className="flex items-center gap-2 cursor-pointer">
                                        <input
                                            type="radio"
                                            name="whatsapp_type"
                                            className="w-4 h-4 text-green-600 focus:ring-green-500"
                                            checked={!integration.is_official_api}
                                            onChange={() => setIntegration({ ...integration, is_official_api: false, whatsapp_template_id: '' })}
                                        />
                                        <span className="text-sm text-slate-700 font-medium">WhatsApp Business Padrão</span>
                                    </label>
                                    <label className="flex items-center gap-2 cursor-pointer">
                                        <input
                                            type="radio"
                                            name="whatsapp_type"
                                            className="w-4 h-4 text-green-600 focus:ring-green-500"
                                            checked={integration.is_official_api}
                                            onChange={() => setIntegration({ ...integration, is_official_api: true, whatsapp_message_text: '' })}
                                        />
                                        <span className="text-sm text-slate-700 font-medium">WhatsApp API Oficial</span>
                                    </label>
                                </div>

                                {/* Campos Condicionais */}
                                {!integration.is_official_api ? (
                                    <div className="animate-in fade-in zoom-in duration-300">
                                        <label className="block text-sm font-bold text-slate-700 mb-1">Texto da Mensagem</label>
                                        <textarea
                                            className="w-full px-4 py-3 border border-slate-200 rounded-lg bg-white text-slate-900 focus:ring-2 focus:ring-green-500/20 focus:border-green-500 outline-none resize-none h-24 text-sm"
                                            value={integration.whatsapp_message_text}
                                            onChange={e => setIntegration({ ...integration, whatsapp_message_text: e.target.value })}
                                            placeholder="Ex: Olá {nome_paciente}, sua consulta..."
                                        ></textarea>
                                        <p className="text-[11px] text-slate-500 mt-1 leading-relaxed">
                                            Você pode personalizar a mensagem usando as tags: 
                                            <code className="bg-slate-200 px-1 py-0.5 rounded mx-1">{'{nome_paciente}'}</code> 
                                            <code className="bg-slate-200 px-1 py-0.5 rounded mx-1">{'{nome_medico}'}</code> 
                                            <code className="bg-slate-200 px-1 py-0.5 rounded mx-1">{'{data}'}</code> 
                                            <code className="bg-slate-200 px-1 py-0.5 rounded mx-1">{'{hora}'}</code>.
                                        </p>
                                    </div>
                                ) : (
                                    <div className="animate-in fade-in zoom-in duration-300">
                                        <div className="flex items-center gap-2 mb-1 relative group">
                                            <label className="block text-sm font-bold text-slate-700">ID do Template (Template ID)</label>
                                            <FaInfoCircle className="text-slate-400 hover:text-green-500 cursor-help transition-colors" />
                                            
                                            {/* Tooltip Hover */}
                                            <div className="absolute left-0 bottom-full mb-2 w-72 bg-slate-800 text-white text-xs p-3 rounded-xl shadow-xl opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-200 z-10 pointer-events-none">
                                                <p className="font-bold mb-1 text-green-400">Parâmetros Obrigatórios (Meta):</p>
                                                <p className="mb-2 text-slate-300 leading-relaxed">O template precisa ser aprovado com as 4 variáveis na seguinte ordem exata:</p>
                                                <ul className="space-y-1 font-mono text-[10px] bg-slate-900/50 p-2 rounded-lg border border-slate-700">
                                                    <li><span className="text-green-400">{'{{1}}'}</span> : nome_paciente</li>
                                                    <li><span className="text-green-400">{'{{2}}'}</span> : nome_medico</li>
                                                    <li><span className="text-green-400">{'{{3}}'}</span> : data</li>
                                                    <li><span className="text-green-400">{'{{4}}'}</span> : hora</li>
                                                </ul>
                                                <div className="absolute -bottom-1 left-28 w-2 h-2 bg-slate-800 rotate-45"></div>
                                            </div>
                                        </div>
                                        
                                        <input
                                            type="text"
                                            className="w-full px-4 py-2 border border-slate-200 rounded-lg bg-white text-slate-900 focus:ring-2 focus:ring-green-500/20 focus:border-green-500 outline-none"
                                            value={integration.whatsapp_template_id}
                                            onChange={e => setIntegration({ ...integration, whatsapp_template_id: e.target.value })}
                                            placeholder="Ex: d1a2b3c4-5e6f..."
                                        />
                                        <p className="text-[11px] text-slate-500 mt-1">Insira aqui o ID do template aprovado no Facebook/Meta.</p>
                                    </div>
                                )}
                            </div>

                            {/* Lembretes Automáticos */}
                            <div className="flex items-center justify-between p-4 bg-green-50/50 border border-green-100 rounded-xl">
                                <div>
                                    <h4 className="text-sm font-bold text-slate-800">Lembretes Automáticos de Consulta</h4>
                                    <p className="text-xs text-slate-500 mt-1">Envia mensagem WhatsApp 1 dia antes da consulta (horário definido pelo servidor).</p>
                                </div>
                                <label className="relative inline-flex items-center cursor-pointer ml-4 shrink-0">
                                    <input
                                        type="checkbox"
                                        className="sr-only peer"
                                        checked={integration.lembrete_ativo}
                                        onChange={e => setIntegration({ ...integration, lembrete_ativo: e.target.checked })}
                                    />
                                    <div className="w-11 h-6 bg-slate-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-green-500"></div>
                                </label>
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

                    {/* API Documentation Card */}
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
                                Utilize a nossa documentação <strong>Swagger</strong> interativa para explorar os endpoints disponíveis, 
                                formatos de dados e métodos de autenticação da plataforma.
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
        </div>
    );
};

export default SettingsPage;
