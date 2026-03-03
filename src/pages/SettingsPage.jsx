import { useState } from 'react';
import { FaBuilding, FaGlobe, FaSave, FaUpload, FaWhatsapp, FaPlug } from 'react-icons/fa';

const SettingsPage = () => {
    const [settings, setSettings] = useState({
        clinicName: 'Centro Clínico Avançado',
        cnpj: '12.345.678/0001-90',
        contactEmail: 'contato@centroclinico.com.br',
        timeZone: 'America/Sao_Paulo',
        currency: 'BRL',
        language: 'pt-BR',
        kentroQueueId: '',
        kentroApiKey: '',
        kentroTemplateId: '',
        kentroText: 'Olá! Seu agendamento foi confirmado para o dia {data} às {hora}.'
    });

    const [isSaving, setIsSaving] = useState(false);

    const handleSave = (e) => {
        e.preventDefault();
        setIsSaving(true);
        // Mock save to API
        setTimeout(() => {
            setIsSaving(false);
            alert('Configurações salvas com sucesso!');
        }, 1000);
    };

    return (
        <div className="space-y-6 animate-in slide-in-from-bottom-4 duration-500 fade-in max-w-5xl mx-auto">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-2">
                <div>
                    <h2 className="text-2xl font-bold text-slate-800 tracking-tight">Configurações do Sistema</h2>
                    <p className="text-sm text-slate-500 mt-1">Gerencie as preferências da clínica, aparência e padrões regionais.</p>
                </div>
                <button
                    onClick={handleSave}
                    disabled={isSaving}
                    className="btn-primary flex items-center gap-2"
                >
                    <FaSave /> {isSaving ? 'Salvando...' : 'Salvar Alterações'}
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
                                    <input type="text" className="w-full px-4 py-2 border border-slate-200 rounded-lg bg-white text-slate-900 focus:ring-2 focus:ring-primary/20 outline-none" value={settings.clinicName} onChange={e => setSettings({ ...settings, clinicName: e.target.value })} />
                                </div>
                                <div className="grid grid-cols-2 gap-4">
                                    <div>
                                        <label className="block text-sm font-bold text-slate-700 mb-1">CNPJ</label>
                                        <input type="text" className="w-full px-4 py-2 border border-slate-200 rounded-lg bg-white text-slate-900 focus:ring-2 focus:ring-primary/20 outline-none" value={settings.cnpj} onChange={e => setSettings({ ...settings, cnpj: e.target.value })} />
                                    </div>
                                    <div>
                                        <label className="block text-sm font-bold text-slate-700 mb-1">E-mail de Contato</label>
                                        <input type="email" className="w-full px-4 py-2 border border-slate-200 rounded-lg bg-white text-slate-900 focus:ring-2 focus:ring-primary/20 outline-none" value={settings.contactEmail} onChange={e => setSettings({ ...settings, contactEmail: e.target.value })} />
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
                                <select className="w-full px-4 py-2 border border-slate-200 rounded-lg bg-white text-slate-900 focus:ring-2 focus:ring-primary/20 outline-none" value={settings.timeZone} onChange={e => setSettings({ ...settings, timeZone: e.target.value })}>
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
                        <div className="flex items-center gap-3 mb-4 border-b border-slate-100 pb-3">
                            <div className="w-10 h-10 rounded-lg bg-green-50 flex items-center justify-center">
                                <FaWhatsapp className="text-green-500 text-2xl" />
                            </div>
                            <div>
                                <h3 className="text-lg font-bold text-slate-800">Mensageria Kentro (WhatsApp API)</h3>
                                <p className="text-xs text-slate-500">Configuração de disparo automático para confirmação de pacientes.</p>
                            </div>
                        </div>

                        <div className="space-y-4">
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-sm font-bold text-slate-700 mb-1">ID da Fila (Queue ID)</label>
                                    <input type="number" className="w-full px-4 py-2 border border-slate-200 rounded-lg bg-white text-slate-900 focus:ring-2 focus:ring-green-500/20 focus:border-green-500 outline-none" value={settings.kentroQueueId} onChange={e => setSettings({ ...settings, kentroQueueId: e.target.value })} placeholder="Ex: 12345" />
                                </div>
                                <div>
                                    <label className="block text-sm font-bold text-slate-700 mb-1">API Key (Autenticação)</label>
                                    <input type="password" className="w-full px-4 py-2 border border-slate-200 rounded-lg bg-white text-slate-900 focus:ring-2 focus:ring-green-500/20 focus:border-green-500 outline-none" value={settings.kentroApiKey} onChange={e => setSettings({ ...settings, kentroApiKey: e.target.value })} placeholder="Sua chave secreta" />
                                </div>
                            </div>

                            <div className="p-4 bg-slate-50 rounded-xl border border-slate-200">
                                <h4 className="font-bold text-slate-700 text-sm mb-3">Payload de Disparo</h4>

                                <div className="space-y-4">
                                    <div>
                                        <label className="block text-sm font-bold text-slate-700 mb-1">ID do Template Oficial (Opcional)</label>
                                        <input type="number" className="w-full px-4 py-2 border border-slate-200 rounded-lg bg-white text-slate-900 focus:ring-2 focus:ring-green-500/20 focus:border-green-500 outline-none text-sm" value={settings.kentroTemplateId} onChange={e => setSettings({ ...settings, kentroTemplateId: e.target.value })} placeholder="Se usar API Oficial com Template, informe o ID" />
                                        <p className="text-[11px] text-slate-500 mt-1">Se não informado, o disparo usará a API padrão com envio via variável <code className="bg-slate-200 px-1 rounded">text</code>.</p>
                                    </div>

                                    <div>
                                        <label className="block text-sm font-bold text-slate-700 mb-1">Texto de Confirmação Padrão</label>
                                        <textarea
                                            className="w-full px-4 py-2 border border-slate-200 rounded-lg bg-white text-slate-900 focus:ring-2 focus:ring-green-500/20 focus:border-green-500 outline-none text-sm resize-y"
                                            rows="3"
                                            value={settings.kentroText}
                                            onChange={e => setSettings({ ...settings, kentroText: e.target.value })}
                                            placeholder="Olá! Seu agendamento foi confirmado para..."
                                        ></textarea>
                                        <p className="text-[11px] text-slate-500 mt-1">Para disparo com <strong>Template API Oficial</strong>, o bloco <code className="bg-slate-200 px-1 rounded">varsdata</code> será extraído a partir das variáveis cadastradas.</p>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>

                </div>
            </div>
        </div>
    );
};

export default SettingsPage;
