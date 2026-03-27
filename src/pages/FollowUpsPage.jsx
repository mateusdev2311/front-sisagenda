import { useState, useEffect } from 'react';
import axios from '../api/axiosConfig';
import toast from 'react-hot-toast';
import { FaBullhorn, FaCheck, FaCheckSquare, FaRegSquare, FaPaperPlane, FaUserInjured, FaUserMd, FaCalendarCheck, FaClock, FaSpinner, FaWhatsapp, FaGem } from 'react-icons/fa';
import Pagination from '../components/Pagination';
import { getCompanyInfo } from '../services/aiService';
import { format } from 'date-fns';

const FollowUpsPage = () => {
    const [followUps, setFollowUps] = useState([]);
    const [totalItems, setTotalItems] = useState(0);
    const [totalPages, setTotalPages] = useState(1);
    const [currentPage, setCurrentPage] = useState(1);
    const [isLoading, setIsLoading] = useState(true);
    const [isSending, setIsSending] = useState(false);
    const [companyPlan, setCompanyPlan] = useState(null); // null = loading
    
    // Checkbox selections
    const [selectedRows, setSelectedRows] = useState([]);
    
    const ITEMS_PER_PAGE = 20;

    useEffect(() => {
        getCompanyInfo()
            .then(res => setCompanyPlan(res.data?.plan || 'free'))
            .catch(() => setCompanyPlan('free'));
            
        fetchFollowUps(currentPage);
    }, [currentPage]);

    const fetchFollowUps = async (page = 1) => {
        try {
            setIsLoading(true);
            const res = await axios.get('/follow-ups', {
                params: { page, limit: ITEMS_PER_PAGE }
            });
            if (res.data && res.data.data) {
                setFollowUps(res.data.data);
                setTotalPages(res.data.pages || 1);
                setTotalItems(res.data.total || 0);
            } else if (Array.isArray(res.data)) {
                setFollowUps(res.data);
                setTotalPages(Math.ceil(res.data.length / ITEMS_PER_PAGE));
                setTotalItems(res.data.length);
            } else {
                setFollowUps([]);
            }
            setSelectedRows([]); // Clear selections on page load
        } catch (error) {
            console.error('Error fetching follow-ups:', error);
            toast.error('Erro ao buscar lista de pós-atendimento.');
        } finally {
            setIsLoading(false);
        }
    };

    // Formata a data (DD/MM/YYYY HH:mm)
    const formatDate = (dateString) => {
        if (!dateString) return 'Data não informada';
        
        // Remove o 'Z' para forçar o navegador a tratar como horário local
        // Isso evita o deslocamento de 3 horas (UTC-3)
        const cleanDateString = typeof dateString === 'string' && dateString.endsWith('Z') 
            ? dateString.slice(0, -1) 
            : dateString;
            
        try {
            const date = new Date(cleanDateString);
            return format(date, "dd/MM/yyyy HH:mm");
        } catch (error) {
            console.error('Error formatting date:', error);
            return 'Data inválida';
        }
    };

    // Toggle multi-select
    const toggleRow = (appId) => {
        setSelectedRows(prev => 
            prev.includes(appId) ? prev.filter(id => id !== appId) : [...prev, appId]
        );
    };

    const toggleAll = () => {
        if (selectedRows.length === followUps.length) {
            setSelectedRows([]);
        } else {
            setSelectedRows(followUps.map(f => f.id));
        }
    };

    // Disparo em lote
    const handleBulkSend = async () => {
        if (selectedRows.length === 0) return;
        setIsSending(true);
        try {
            const res = await axios.post('/follow-ups/send-batch', {
                appointmentIds: selectedRows
            });
            
            const sucessos = res.data.successes || 0;
            const falhas = res.data.failures || 0;
            
            if (falhas > 0) {
                toast.success(`${sucessos} mensagens enviadas. ${falhas} falharam.`, { duration: 5000 });
            } else {
                toast.success(`${sucessos} mensagens de pós-atendimento disparadas com sucesso!`);
            }
            
            // Recarrega a página atual para sumir os que já receberam
            fetchFollowUps(currentPage);
        } catch (error) {
            console.error('Error sending batch messages:', error);
            toast.error('Erro ao disparar mensagens de pós-atendimento.');
        } finally {
            setIsSending(false);
        }
    };    
    // ── Paywall para planos que não são PRO ──────────────────────────────────
    if (companyPlan !== null && companyPlan !== 'pro') {
        return (
            <div className="flex flex-col items-center justify-center min-h-[70vh] gap-6 animate-in fade-in duration-500">
                <div className="w-20 h-20 rounded-2xl bg-indigo-50 border border-indigo-200 flex items-center justify-center relative shadow-sm">
                    <FaBullhorn className="text-indigo-400 text-4xl" />
                </div>
                <div className="text-center max-w-md px-4">
                    <h2 className="text-2xl font-bold text-slate-800 mb-2">Pós-Atendimento (CRM)</h2>
                    <p className="text-slate-500 leading-relaxed">
                        O módulo de pós-atendimento, com disparo em lote de pesquisas de satisfação e acompanhamento de retornos, 
                        está disponível no
                        <span className="font-bold text-indigo-600"> plano PRO</span>.
                    </p>
                </div>
                <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm max-w-sm w-full space-y-3">
                    <p className="text-sm font-bold text-slate-700 text-center">O que você terá acesso:</p>
                    <ul className="space-y-2 text-sm text-slate-600">
                        {[
                            'Disparo de mensagens em lote', 
                            'Pesquisas de satisfação automáticas', 
                            'Controle de retorno de pacientes', 
                            'Acompanhamento pós-consulta simplificado'
                        ].map(f => (
                            <li key={f} className="flex items-center gap-2">
                                <span className="w-4 h-4 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center text-[10px] font-bold flex-shrink-0">✓</span>
                                {f}
                            </li>
                        ))}
                    </ul>
                    <a
                        href={`https://wa.me/5538999748911?text=${encodeURIComponent(`Olá! Tenho interesse em fazer upgrade do meu plano no Sisagenda para o plano PRO para liberar o módulo de Pós-Atendimento. Poderia me enviar mais informações?`)}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="w-full flex items-center justify-center gap-2 py-3 mt-2 bg-green-500 hover:bg-green-600 text-white font-bold rounded-xl text-sm transition-all shadow-sm"
                    >
                        <FaWhatsapp className="text-lg" />
                        Fazer Upgrade para o PRO
                    </a>
                </div>
            </div>
        );
    }

    if (companyPlan === null) {
        return (
            <div className="flex flex-col items-center justify-center min-h-[60vh] text-slate-400 gap-3">
                <FaSpinner className="animate-spin text-3xl text-primary/30" />
                <span className="text-sm font-medium">Verificando acesso...</span>
            </div>
        );
    }

    return (
        <div className="space-y-6 animate-in slide-in-from-bottom-4 duration-500 fade-in">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-2">
                <div>
                    <h2 className="text-2xl font-bold text-slate-800 tracking-tight flex items-center gap-3">
                        <FaBullhorn className="text-primary mt-1" />
                        Pós-Atendimento (Follow-ups)
                    </h2>
                    <p className="text-sm text-slate-500 mt-1">
                        Dispare pesquisas de satisfação e acompanhamentos via WhatsApp para pacientes recentes.
                    </p>
                </div>
                <div className="flex items-center gap-3">
                    <button 
                        onClick={handleBulkSend}
                        disabled={selectedRows.length === 0 || isSending}
                        className={`btn-primary flex items-center gap-2 ${selectedRows.length === 0 ? 'opacity-50 cursor-not-allowed' : 'hover:scale-105 transition-transform shadow-lg shadow-primary/30'}`}
                    >
                        {isSending ? <FaSpinner className="animate-spin" /> : <FaPaperPlane />}
                        {isSending ? 'Enviando...' : `Disparar para Selecionados (${selectedRows.length})`}
                    </button>
                </div>
            </div>

            <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
                <div className="p-4 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
                    <div className="flex items-center gap-2">
                        <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Total de pacientes elegíveis:</span>
                        <span className="px-2 py-0.5 bg-primary/10 text-primary font-bold rounded-md text-sm">{totalItems}</span>
                    </div>
                </div>

                <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse">
                        <thead>
                            <tr className="bg-slate-50 border-b border-slate-200">
                                <th className="px-6 py-4">
                                    <button 
                                        onClick={toggleAll}
                                        className="text-slate-400 hover:text-primary transition-colors flex items-center"
                                        title={selectedRows.length === followUps.length && followUps.length > 0 ? "Desmarcar todos" : "Selecionar todos desta página"}
                                    >
                                        {selectedRows.length === followUps.length && followUps.length > 0 ? (
                                            <FaCheckSquare className="text-primary text-lg" />
                                        ) : (
                                            <FaRegSquare className="text-lg" />
                                        )}
                                    </button>
                                </th>
                                <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase">Paciente</th>
                                <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase">Profissional</th>
                                <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase">Data da Consulta</th>
                                <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase">Tempo Decorrido</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100 text-sm">
                            {isLoading ? (
                                <tr>
                                    <td colSpan="5" className="px-6 py-12 text-center text-slate-500">
                                        <FaSpinner className="animate-spin text-primary text-3xl mx-auto mb-3" />
                                        Carregando lista de pós-atendimento...
                                    </td>
                                </tr>
                            ) : followUps.length === 0 ? (
                                <tr>
                                    <td colSpan="5" className="px-6 py-12 text-center text-slate-500">
                                        Nenhum paciente pendente de pós-atendimento.
                                    </td>
                                </tr>
                            ) : (
                                followUps.map((item) => {
                                    const isSelected = selectedRows.includes(item.id);
                                    const patientName = item.patient_info?.name || item.patient?.name || 'Paciente Não Identificado';
                                    const doctorName = item.doctor?.name || 'Não Identificado';
                                    
                                    return (
                                        <tr 
                                            key={item.id} 
                                            className={`hover:bg-slate-50/50 transition-colors group cursor-pointer ${isSelected ? 'bg-primary/5' : ''}`}
                                            onClick={() => toggleRow(item.id)}
                                        >
                                            <td className="px-6 py-4 whitespace-nowrap">
                                                <button 
                                                    className={`transition-colors flex items-center ${isSelected ? 'text-primary' : 'text-slate-300 group-hover:text-primary/50'}`}
                                                    onClick={(e) => { e.stopPropagation(); toggleRow(item.id); }}
                                                >
                                                    {isSelected ? <FaCheckSquare className="text-lg" /> : <FaRegSquare className="text-lg" />}
                                                </button>
                                            </td>
                                            <td className="px-6 py-4 font-bold text-slate-700">
                                                <div className="flex items-center gap-2">
                                                    <FaUserInjured className="text-slate-400" />
                                                    {patientName}
                                                </div>
                                            </td>
                                            <td className="px-6 py-4">
                                                <div className="flex items-center gap-2 text-slate-600">
                                                    <FaUserMd className="text-slate-400 text-xs" />
                                                    Dr(a). {doctorName.split(' ')[0]}
                                                </div>
                                            </td>
                                            <td className="px-6 py-4 text-slate-600">
                                                <div className="flex items-center gap-2">
                                                    <FaCalendarCheck className="text-slate-400 text-xs" />
                                                    {formatDate(item.date || item.created_at)}
                                                </div>
                                            </td>
                                            <td className="px-6 py-4">
                                                <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-semibold bg-amber-50 text-amber-700 border border-amber-200">
                                                    <FaClock />
                                                    Há {item.days_since_appointment || 0} dias
                                                </span>
                                            </td>
                                        </tr>
                                    );
                                })
                            )}
                        </tbody>
                    </table>
                </div>

                {!isLoading && followUps.length > 0 && totalPages > 1 && (
                    <div className="p-4 border-t border-slate-100 flex justify-center bg-slate-50/30">
                        <Pagination 
                            currentPage={currentPage}
                            totalPages={totalPages}
                            onPageChange={(page) => setCurrentPage(page)}
                        />
                    </div>
                )}
            </div>
        </div>
    );
};

export default FollowUpsPage;
