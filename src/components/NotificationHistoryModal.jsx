import { useState, useEffect } from 'react';
import { FaBell, FaCheckCircle, FaTimesCircle, FaWhatsapp, FaPaperPlane, FaSpinner, FaInbox } from 'react-icons/fa';
import { getNotificationHistory, triggerManualDispatch } from '../services/billingRulesService';
import toast from 'react-hot-toast';

// ─── Helpers ──────────────────────────────────────────────────────────────────

const phaseLabel = (days) => {
    if (days < 0) return { text: `${Math.abs(days)}d antes do venc.`, color: 'text-amber-600', bg: 'bg-amber-50 border-amber-200' };
    if (days === 0) return { text: 'No dia do vencimento', color: 'text-red-600', bg: 'bg-red-50 border-red-200' };
    return { text: `${days}d após o venc.`, color: 'text-rose-700', bg: 'bg-rose-50 border-rose-200' };
};

const statusConfig = {
    sent:    { icon: <FaCheckCircle className="text-emerald-500" />, label: 'Enviado',    bg: 'bg-emerald-50 border-emerald-200', text: 'text-emerald-700' },
    failed:  { icon: <FaTimesCircle className="text-red-400" />,     label: 'Falhou',     bg: 'bg-red-50 border-red-200',         text: 'text-red-700' },
    skipped: { icon: <FaTimesCircle className="text-slate-400" />,   label: 'Ignorado',   bg: 'bg-slate-50 border-slate-200',     text: 'text-slate-500' },
};

// ─── Componente Principal ─────────────────────────────────────────────────────

const NotificationHistoryModal = ({ isOpen, onClose, billing, patientName }) => {
    const [history, setHistory] = useState([]);
    const [isLoading, setIsLoading] = useState(false);
    const [isDispatching, setIsDispatching] = useState(false);

    useEffect(() => {
        if (isOpen && billing?.id) {
            fetchHistory();
        }
    }, [isOpen, billing?.id]);

    const fetchHistory = async () => {
        setIsLoading(true);
        try {
            const res = await getNotificationHistory(billing.id);
            setHistory(res.data || []);
        } catch {
            setHistory([]);
        } finally {
            setIsLoading(false);
        }
    };

    const handleManualDispatch = async () => {
        setIsDispatching(true);
        try {
            await triggerManualDispatch(billing.id);
            toast.success('Notificação enviada com sucesso! ✅');
            await fetchHistory(); // atualiza o histórico
        } catch (err) {
            const msg = err.response?.data?.message || err.response?.data?.error || 'Erro ao enviar notificação.';
            toast.error(msg);
        } finally {
            setIsDispatching(false);
        }
    };

    if (!isOpen) return null;

    const formattedValue = billing?.value
        ? new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(billing.value)
        : '—';

    const formattedDue = (billing?.dueDate || billing?.due_date)
        ? new Date(billing.dueDate || billing.due_date).toLocaleDateString('pt-BR')
        : '—';

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            {/* Overlay */}
            <div
                className="absolute inset-0 bg-black/40 backdrop-blur-sm"
                onClick={onClose}
            />

            {/* Modal */}
            <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-lg animate-in zoom-in-95 duration-200 overflow-hidden">

                {/* Header */}
                <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 bg-gradient-to-r from-slate-50 to-white">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center text-primary">
                            <FaBell />
                        </div>
                        <div>
                            <h3 className="font-bold text-slate-800 text-base leading-tight">Histórico de Cobranças</h3>
                            <p className="text-xs text-slate-500">{patientName} · {formattedValue} · Venc. {formattedDue}</p>
                        </div>
                    </div>
                    <button
                        onClick={onClose}
                        className="text-slate-400 hover:text-red-500 hover:bg-red-50 w-8 h-8 rounded-lg flex items-center justify-center transition-colors"
                    >
                        ✕
                    </button>
                </div>

                {/* Body */}
                <div className="px-6 py-5 space-y-4 max-h-[420px] overflow-y-auto custom-scrollbar">

                    {/* Disparo Manual */}
                    <div className="flex items-center justify-between p-4 bg-green-50 border border-green-200 rounded-xl">
                        <div className="flex items-center gap-2">
                            <FaWhatsapp className="text-green-500 text-lg" />
                            <div>
                                <p className="text-sm font-bold text-slate-800">Disparar Agora</p>
                                <p className="text-xs text-slate-500">Envia cobrança imediata via WhatsApp</p>
                            </div>
                        </div>
                        <button
                            id="btn-dispatch-now"
                            onClick={handleManualDispatch}
                            disabled={isDispatching}
                            className="flex items-center gap-2 px-4 py-2 bg-green-500 hover:bg-green-600 text-white text-sm font-bold rounded-lg transition-colors shadow-sm shadow-green-200 disabled:opacity-60"
                        >
                            {isDispatching
                                ? <FaSpinner className="animate-spin" />
                                : <FaPaperPlane />
                            }
                            {isDispatching ? 'Enviando...' : 'Enviar'}
                        </button>
                    </div>

                    {/* Timeline */}
                    <div>
                        <p className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-3">Histórico de Disparos</p>

                        {isLoading ? (
                            <div className="flex items-center justify-center py-8 text-slate-400">
                                <FaSpinner className="animate-spin mr-2" /> Carregando...
                            </div>
                        ) : history.length === 0 ? (
                            <div className="flex flex-col items-center justify-center py-8 text-slate-400 gap-2">
                                <FaInbox className="text-3xl text-slate-300" />
                                <p className="text-sm font-medium">Nenhum disparo registrado ainda.</p>
                                <p className="text-xs">O cron job processa automaticamente todo dia às 08h.</p>
                            </div>
                        ) : (
                            <div className="space-y-2">
                                {history.map((item) => {
                                    const phase = phaseLabel(item.trigger_days);
                                    const status = statusConfig[item.status] || statusConfig.skipped;
                                    const sentAt = item.sent_at
                                        ? new Date(item.sent_at).toLocaleString('pt-BR', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' })
                                        : '—';

                                    return (
                                        <div key={item.id} className="flex items-center gap-3 p-3 rounded-xl border border-slate-100 bg-slate-50/50 hover:bg-slate-50 transition-colors">
                                            {/* Status icon */}
                                            <div className="text-lg flex-shrink-0">{status.icon}</div>

                                            {/* Info */}
                                            <div className="flex-1 min-w-0">
                                                <div className="flex items-center gap-2 flex-wrap">
                                                    <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${phase.bg} ${phase.color}`}>
                                                        {phase.text}
                                                    </span>
                                                    <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${status.bg} ${status.text}`}>
                                                        {status.label}
                                                    </span>
                                                </div>
                                                {item.error_msg && (
                                                    <p className="text-[11px] text-red-500 mt-1 truncate">{item.error_msg}</p>
                                                )}
                                            </div>

                                            {/* Date */}
                                            <span className="text-xs text-slate-400 flex-shrink-0">{sentAt}</span>
                                        </div>
                                    );
                                })}
                            </div>
                        )}
                    </div>
                </div>

                {/* Footer */}
                <div className="px-6 py-3 border-t border-slate-100 bg-slate-50/50 flex justify-end">
                    <button
                        onClick={onClose}
                        className="px-4 py-2 text-sm font-medium text-slate-600 hover:bg-slate-100 rounded-lg transition-colors"
                    >
                        Fechar
                    </button>
                </div>
            </div>
        </div>
    );
};

export default NotificationHistoryModal;
