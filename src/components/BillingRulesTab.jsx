import { useState, useEffect } from 'react';
import {
    FaBell, FaPlus, FaEdit, FaTrash, FaSave, FaTimes,
    FaToggleOn, FaToggleOff, FaWhatsapp, FaSpinner, FaInfoCircle,
    FaCheckCircle, FaExclamationTriangle
} from 'react-icons/fa';
import {
    getBillingRules,
    createBillingRule,
    updateBillingRule,
    deleteBillingRule,
} from '../services/billingRulesService';
import toast from 'react-hot-toast';

// ─── Constantes ───────────────────────────────────────────────────────────────

const PHASES = [
    {
        key: 'before',
        label: 'Antes do Vencimento',
        emoji: '🟡',
        subtitle: 'Mensagens preventivas para evitar inadimplência',
        color: 'amber',
        filter: (r) => r.trigger_days < 0,
    },
    {
        key: 'due',
        label: 'No Dia do Vencimento',
        emoji: '🔴',
        subtitle: 'Alerta imediato na data de vencimento',
        color: 'red',
        filter: (r) => r.trigger_days === 0,
    },
    {
        key: 'after',
        label: 'Após o Vencimento',
        emoji: '🚨',
        subtitle: 'Cobranças progressivas para regularização',
        color: 'rose',
        filter: (r) => r.trigger_days > 0,
    },
];

const TEMPLATE_VARS = [
    { tag: '{nome_paciente}', desc: 'Nome do paciente' },
    { tag: '{valor}',         desc: 'Valor da fatura' },
    { tag: '{vencimento}',    desc: 'Data de vencimento' },
    { tag: '{dias_atraso}',   desc: 'Dias em atraso (pós-venc.)' },
    { tag: '{nome_clinica}',  desc: 'Nome da clínica' },
];

const DEFAULT_TEMPLATES = {
    '-1': 'Olá {nome_paciente}! ⚠️ Sua fatura de {valor} vence amanhã ({vencimento}). Evite atrasos! — {nome_clinica}',
    '0':  '🔴 {nome_paciente}, hoje ({vencimento}) vence sua fatura de {valor}. Realize o pagamento para evitar pendências. — {nome_clinica}',
    '1':  '📋 {nome_paciente}, sua fatura de {valor} (venc. {vencimento}) está em aberto há 1 dia. Entre em contato para regularizar. — {nome_clinica}',
};

const phaseColors = {
    amber: { border: 'border-amber-200', bg: 'bg-amber-50', text: 'text-amber-700', badge: 'bg-amber-100' },
    red:   { border: 'border-red-200',   bg: 'bg-red-50',   text: 'text-red-700',   badge: 'bg-red-100' },
    rose:  { border: 'border-rose-200',  bg: 'bg-rose-50',  text: 'text-rose-700',  badge: 'bg-rose-100' },
};

// ─── Sub-componentes ──────────────────────────────────────────────────────────

const VariablePill = ({ tag, desc, onClick }) => (
    <button
        type="button"
        onClick={() => onClick(tag)}
        title={`Inserir ${desc}`}
        className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-slate-100 hover:bg-primary/10 hover:text-primary border border-slate-200 text-[11px] font-mono text-slate-600 transition-colors cursor-pointer"
    >
        {tag}
    </button>
);

const RuleCard = ({ rule, onToggle, onEdit, onDelete }) => {
    const daysLabel = rule.trigger_days < 0
        ? `${Math.abs(rule.trigger_days)} dia${Math.abs(rule.trigger_days) > 1 ? 's' : ''} antes`
        : rule.trigger_days === 0
            ? 'No dia'
            : `+${rule.trigger_days} dia${rule.trigger_days > 1 ? 's' : ''} após`;

    return (
        <div className={`flex gap-3 p-4 rounded-xl border transition-all duration-200 group ${rule.is_active
            ? 'bg-white border-slate-200 hover:border-primary/30 hover:shadow-sm'
            : 'bg-slate-50 border-slate-100 opacity-60'
        }`}>
            {/* Toggle */}
            <div className="pt-0.5 flex-shrink-0">
                <button
                    id={`toggle-rule-${rule.id}`}
                    onClick={() => onToggle(rule)}
                    className="transition-colors"
                >
                    {rule.is_active
                        ? <FaToggleOn className="text-2xl text-primary" />
                        : <FaToggleOff className="text-2xl text-slate-300" />}
                </button>
            </div>

            {/* Content */}
            <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1.5 flex-wrap">
                    <span className="text-xs font-bold px-2.5 py-0.5 rounded-full bg-primary/10 text-primary border border-primary/20">
                        {daysLabel}
                    </span>
                    <span className="flex items-center gap-1 text-xs text-slate-400">
                        <FaWhatsapp className="text-green-500" /> WhatsApp
                    </span>
                    {!rule.is_active && (
                        <span className="text-[10px] font-bold px-2 py-0.5 bg-slate-200 text-slate-500 rounded-full">
                            Pausado
                        </span>
                    )}
                </div>
                <p className="text-sm text-slate-600 leading-relaxed line-clamp-2 font-medium">
                    {rule.message_template}
                </p>
            </div>

            {/* Actions */}
            <div className="flex flex-col gap-1 opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0">
                <button
                    id={`edit-rule-${rule.id}`}
                    onClick={() => onEdit(rule)}
                    className="p-1.5 text-slate-400 hover:text-primary hover:bg-primary/10 rounded-lg transition-colors"
                    title="Editar template"
                >
                    <FaEdit className="text-sm" />
                </button>
                <button
                    id={`delete-rule-${rule.id}`}
                    onClick={() => onDelete(rule)}
                    className="p-1.5 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                    title="Remover regra"
                >
                    <FaTrash className="text-sm" />
                </button>
            </div>
        </div>
    );
};

// ─── Modal de Edição / Criação ────────────────────────────────────────────────

const RuleModal = ({ isOpen, rule, onClose, onSave }) => {
    const [template, setTemplate] = useState('');
    const [triggerDays, setTriggerDays] = useState('');
    const [isSaving, setIsSaving] = useState(false);
    const isEditing = !!rule?.id;

    useEffect(() => {
        if (isOpen) {
            setTemplate(rule?.message_template || '');
            setTriggerDays(rule?.trigger_days ?? '');
        }
    }, [isOpen, rule]);

    if (!isOpen) return null;

    const insertVariable = (tag) => {
        setTemplate((prev) => prev + tag);
    };

    const handleSave = async () => {
        if (!template.trim()) { toast.error('O template não pode estar vazio.'); return; }
        if (!isEditing && triggerDays === '') { toast.error('Informe o número de dias.'); return; }

        setIsSaving(true);
        try {
            await onSave({
                id: rule?.id,
                trigger_days: isEditing ? rule.trigger_days : Number(triggerDays),
                message_template: template.trim(),
            });
            onClose();
        } catch (err) {
            toast.error(err.response?.data?.message || 'Erro ao salvar regra.');
        } finally {
            setIsSaving(false);
        }
    };

    const daysLabel = isEditing
        ? (rule.trigger_days < 0 ? `${Math.abs(rule.trigger_days)}d antes` : rule.trigger_days === 0 ? 'No dia' : `+${rule.trigger_days}d após`)
        : null;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={onClose} />
            <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-lg animate-in zoom-in-95 duration-200">

                {/* Header */}
                <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100">
                    <div className="flex items-center gap-3">
                        <div className="w-9 h-9 rounded-xl bg-primary/10 flex items-center justify-center text-primary">
                            {isEditing ? <FaEdit /> : <FaPlus />}
                        </div>
                        <div>
                            <h3 className="font-bold text-slate-800 text-sm">
                                {isEditing ? `Editar Regra · ${daysLabel}` : 'Nova Regra de Cobrança'}
                            </h3>
                            <p className="text-xs text-slate-400">Configure o template da mensagem WhatsApp</p>
                        </div>
                    </div>
                    <button onClick={onClose} className="text-slate-400 hover:text-red-500 hover:bg-red-50 w-8 h-8 rounded-lg flex items-center justify-center transition-colors">
                        ✕
                    </button>
                </div>

                {/* Body */}
                <div className="px-6 py-5 space-y-4">
                    {/* Seletor de dias (apenas criação) */}
                    {!isEditing && (
                        <div>
                            <label className="block text-sm font-bold text-slate-700 mb-1">
                                Quando disparar?
                            </label>
                            <div className="flex items-center gap-3">
                                <input
                                    type="number"
                                    id="rule-trigger-days"
                                    className="w-24 px-3 py-2 border border-slate-200 rounded-lg text-sm font-bold text-slate-800 focus:ring-2 focus:ring-primary/20 outline-none text-center"
                                    value={triggerDays}
                                    onChange={(e) => setTriggerDays(e.target.value)}
                                    placeholder="0"
                                />
                                <p className="text-sm text-slate-500">
                                    dias em relação ao vencimento
                                    <span className="block text-xs text-slate-400 mt-0.5">
                                        Negativo = antes, 0 = no dia, positivo = após
                                    </span>
                                </p>
                            </div>
                        </div>
                    )}

                    {/* Template */}
                    <div>
                        <div className="flex items-center justify-between mb-1">
                            <label className="text-sm font-bold text-slate-700">Template da Mensagem</label>
                            <span className="text-xs text-slate-400">{template.length} caracteres</span>
                        </div>
                        <textarea
                            id="rule-template-textarea"
                            className="w-full px-4 py-3 border border-slate-200 rounded-xl bg-white text-slate-800 text-sm font-medium focus:ring-2 focus:ring-primary/20 outline-none resize-none leading-relaxed"
                            rows={4}
                            value={template}
                            onChange={(e) => setTemplate(e.target.value)}
                            placeholder="Ex: Olá {nome_paciente}, sua fatura de {valor} vence em breve..."
                        />
                    </div>

                    {/* Variáveis disponíveis */}
                    <div className="p-3 bg-slate-50 rounded-xl border border-slate-200">
                        <p className="text-xs text-slate-500 mb-2 flex items-center gap-1 font-semibold">
                            <FaInfoCircle className="text-slate-400" />
                            Clique para inserir uma variável no template:
                        </p>
                        <div className="flex flex-wrap gap-1.5">
                            {TEMPLATE_VARS.map((v) => (
                                <VariablePill key={v.tag} tag={v.tag} desc={v.desc} onClick={insertVariable} />
                            ))}
                        </div>
                    </div>
                </div>

                {/* Footer */}
                <div className="px-6 py-4 border-t border-slate-100 bg-slate-50/50 flex justify-end gap-2">
                    <button
                        onClick={onClose}
                        className="px-4 py-2 text-sm font-medium text-slate-600 hover:bg-slate-100 rounded-lg transition-colors"
                    >
                        Cancelar
                    </button>
                    <button
                        id="btn-save-rule"
                        onClick={handleSave}
                        disabled={isSaving}
                        className="flex items-center gap-2 px-5 py-2 bg-primary text-white text-sm font-bold rounded-lg hover:bg-primary/90 transition-colors shadow-sm disabled:opacity-60"
                    >
                        {isSaving ? <FaSpinner className="animate-spin" /> : <FaSave />}
                        {isSaving ? 'Salvando...' : 'Salvar Regra'}
                    </button>
                </div>
            </div>
        </div>
    );
};

// ─── Componente Principal ─────────────────────────────────────────────────────

const BillingRulesTab = () => {
    const [rules, setRules] = useState([]);
    const [isLoading, setIsLoading] = useState(true);
    const [modalState, setModalState] = useState({ isOpen: false, rule: null });
    const [isTogglingId, setIsTogglingId] = useState(null);

    useEffect(() => {
        fetchRules();
    }, []);

    const fetchRules = async () => {
        setIsLoading(true);
        try {
            const res = await getBillingRules();
            setRules(res.data || []);
        } catch {
            toast.error('Erro ao carregar régua de cobrança.');
        } finally {
            setIsLoading(false);
        }
    };

    const handleToggle = async (rule) => {
        setIsTogglingId(rule.id);
        try {
            await updateBillingRule(rule.id, { is_active: !rule.is_active });
            setRules((prev) =>
                prev.map((r) => r.id === rule.id ? { ...r, is_active: !r.is_active } : r)
            );
            toast.success(rule.is_active ? 'Regra pausada.' : 'Regra ativada! ✅');
        } catch {
            toast.error('Erro ao alterar status da regra.');
        } finally {
            setIsTogglingId(null);
        }
    };

    const handleEdit = (rule) => {
        setModalState({ isOpen: true, rule });
    };

    const handleDelete = async (rule) => {
        const daysLabel = rule.trigger_days < 0
            ? `${Math.abs(rule.trigger_days)}d antes`
            : rule.trigger_days === 0 ? 'No dia' : `+${rule.trigger_days}d após`;

        if (!window.confirm(`Remover regra "${daysLabel}"? Esta ação não pode ser desfeita.`)) return;

        try {
            await deleteBillingRule(rule.id);
            setRules((prev) => prev.filter((r) => r.id !== rule.id));
            toast.success('Regra removida com sucesso.');
        } catch {
            toast.error('Erro ao remover regra.');
        }
    };

    const handleSave = async ({ id, trigger_days, message_template }) => {
        if (id) {
            await updateBillingRule(id, { message_template });
            setRules((prev) =>
                prev.map((r) => r.id === id ? { ...r, message_template } : r)
            );
            toast.success('Template atualizado! ✅');
        } else {
            await createBillingRule({ trigger_days, message_template, channel: 'whatsapp' });
            // Re-fetch completo: o backend pode ter criado regras padrão adicionais (seed automático)
            await fetchRules();
            toast.success('Regra(s) criada(s) com sucesso! ✅');
        }
    };

    const handleAddDefault = () => {
        const existingDays = new Set(rules.map((r) => String(r.trigger_days)));
        const defaultDays = ['-1', '0', '1'].filter((d) => !existingDays.has(d));

        if (defaultDays.length === 0) {
            setModalState({ isOpen: true, rule: null });
            return;
        }

        const firstMissing = defaultDays[0];
        setModalState({
            isOpen: true,
            rule: {
                trigger_days: null,
                message_template: DEFAULT_TEMPLATES[firstMissing] || '',
            }
        });
    };

    const activeCount = rules.filter((r) => r.is_active).length;
    const totalCount = rules.length;

    if (isLoading) {
        return (
            <div className="flex items-center justify-center py-16 text-slate-400">
                <FaSpinner className="animate-spin mr-2 text-xl" />
                Carregando régua de cobrança...
            </div>
        );
    }

    return (
        <div className="space-y-6 animate-in fade-in duration-300">

            {/* Header da Aba */}
            <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
                <div>
                    <h3 className="text-lg font-bold text-slate-800 flex items-center gap-2">
                        <FaBell className="text-primary" />
                        Régua de Cobrança Automática
                    </h3>
                    <p className="text-sm text-slate-500 mt-1">
                        Configure quando e como os pacientes serão notificados sobre faturas via WhatsApp.
                    </p>
                </div>
                <button
                    id="btn-add-billing-rule"
                    onClick={handleAddDefault}
                    className="btn-primary flex items-center gap-2 flex-shrink-0"
                >
                    <FaPlus /> Nova Regra
                </button>
            </div>

            {/* Status Bar */}
            <div className="flex items-center gap-4 p-4 bg-white rounded-xl border border-slate-100 shadow-sm">
                <div className="flex items-center gap-2">
                    <FaWhatsapp className="text-green-500 text-lg" />
                    <span className="text-sm font-medium text-slate-600">Canal ativo: WhatsApp</span>
                </div>
                <div className="h-4 w-px bg-slate-200" />
                <div className="flex items-center gap-1.5">
                    <span className={`w-2 h-2 rounded-full ${activeCount > 0 ? 'bg-emerald-400 animate-pulse' : 'bg-slate-300'}`} />
                    <span className="text-sm text-slate-600 font-medium">
                        {activeCount}/{totalCount} regra{totalCount !== 1 ? 's' : ''} ativa{activeCount !== 1 ? 's' : ''}
                    </span>
                </div>
                {activeCount === 0 && totalCount > 0 && (
                    <div className="flex items-center gap-1.5 text-amber-600 text-xs font-semibold animate-in fade-in">
                        <FaExclamationTriangle />
                        Nenhuma regra ativa — nenhuma cobrança será enviada
                    </div>
                )}
                {activeCount > 0 && (
                    <div className="flex items-center gap-1.5 text-emerald-600 text-xs font-semibold animate-in fade-in">
                        <FaCheckCircle />
                        Cron roda todo dia às 08:00
                    </div>
                )}
            </div>

            {/* Fases */}
            {totalCount === 0 ? (
                <div className="flex flex-col items-center justify-center py-12 text-center gap-3 bg-white rounded-xl border border-dashed border-slate-200">
                    <FaBell className="text-4xl text-slate-200" />
                    <p className="font-semibold text-slate-500">Nenhuma regra configurada</p>
                    <p className="text-sm text-slate-400 max-w-xs">
                        Adicione regras para que o sistema dispare automaticamente mensagens de cobrança via WhatsApp.
                    </p>
                    <button
                        onClick={handleAddDefault}
                        className="btn-primary mt-2 flex items-center gap-2"
                    >
                        <FaPlus /> Criar Primeira Regra
                    </button>
                </div>
            ) : (
                PHASES.map((phase) => {
                    const phaseRules = rules
                        .filter(phase.filter)
                        .sort((a, b) => a.trigger_days - b.trigger_days);

                    if (phaseRules.length === 0) return null;

                    const c = phaseColors[phase.color];

                    return (
                        <div key={phase.key} className="bg-white rounded-xl border border-slate-100 shadow-sm overflow-hidden">
                            {/* Phase Header */}
                            <div className={`flex items-center gap-3 px-5 py-3 border-b ${c.border} ${c.bg}`}>
                                <span className="text-base">{phase.emoji}</span>
                                <div>
                                    <p className={`text-sm font-bold ${c.text}`}>{phase.label}</p>
                                    <p className="text-xs text-slate-500">{phase.subtitle}</p>
                                </div>
                                <span className={`ml-auto text-xs font-bold px-2 py-0.5 rounded-full ${c.badge} ${c.text}`}>
                                    {phaseRules.length} regra{phaseRules.length !== 1 ? 's' : ''}
                                </span>
                            </div>

                            {/* Phase Rules */}
                            <div className="p-3 space-y-2">
                                {phaseRules.map((rule) => (
                                    <div key={rule.id} className={isTogglingId === rule.id ? 'opacity-50 pointer-events-none' : ''}>
                                        <RuleCard
                                            rule={rule}
                                            onToggle={handleToggle}
                                            onEdit={handleEdit}
                                            onDelete={handleDelete}
                                        />
                                    </div>
                                ))}
                            </div>
                        </div>
                    );
                })
            )}

            {/* Modal */}
            <RuleModal
                isOpen={modalState.isOpen}
                rule={modalState.rule}
                onClose={() => setModalState({ isOpen: false, rule: null })}
                onSave={handleSave}
            />
        </div>
    );
};

export default BillingRulesTab;
