import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import axios from '../api/axiosConfig';
import { Chart as ChartJS, ArcElement, Tooltip, Legend, CategoryScale, LinearScale, PointElement, LineElement, BarElement, Filler } from 'chart.js';
import { Doughnut, Line } from 'react-chartjs-2';
import { FaCalendarCheck, FaUserMd, FaMoneyBillWave, FaClock, FaCheckCircle, FaUserInjured, FaChevronLeft, FaChevronRight, FaFileMedicalAlt } from 'react-icons/fa';
import { useSettings } from '../context/SettingsContext';

ChartJS.register(ArcElement, Tooltip, Legend, CategoryScale, LinearScale, PointElement, LineElement, BarElement, Filler);

const fmt = (val, currency = 'BRL') =>
    new Intl.NumberFormat('pt-BR', { style: 'currency', currency }).format(val || 0);

const toLocalYYYYMMDD = (date) => {
    const y = date.getFullYear();
    const m = String(date.getMonth() + 1).padStart(2, '0');
    const d = String(date.getDate()).padStart(2, '0');
    return `${y}-${m}-${d}`;
};

// ─── Fetchers (separados para o React Query cachear individualmente) ──────────

const fetchAll = () => Promise.all([
    axios.get('/appointments?limit=5000').then(r => r.data.data || r.data || []),
    axios.get('/doctors').then(r => r.data || []),
    axios.get('/patients?limit=5000').then(r => r.data.data || r.data || []),
    axios.get('/billing').then(r => r.data || []),
    axios.get('/records').then(r => Array.isArray(r.data) ? r.data : []),
    axios.get('/company/me').then(r => r.data?.plan || 'free').catch(() => 'free'),
]);

// ─── Component ────────────────────────────────────────────────────────────────

const DashboardHome = () => {
    const { settings } = useSettings();
    const currency = settings?.currency || 'BRL';
    const [selectedDate, setSelectedDate] = useState(toLocalYYYYMMDD(new Date()));

    // useQuery faz o cache automático por 5 minutos (configurado no QueryClient global)
    const { data, isLoading } = useQuery({
        queryKey: ['dashboard'],
        queryFn: fetchAll,
    });

    const [allAppointments, allDoctors, allPatients, allBillings, allRecords, companyPlan] =
        data ?? [[], [], [], [], [], 'free'];

    // ---- Derived: selected date stats ----
    const dayApps = allAppointments.filter(app => {
        if (!app.date) return false;
        const raw = String(app.date).split('Z')[0].split('+')[0].replace(' ', 'T');
        return raw.startsWith(selectedDate);
    });

    const dayRecords = allRecords.filter(rec => {
        if (!rec.created_at) return false;
        return String(rec.created_at).startsWith(selectedDate);
    });

    const dayBillings = allBillings.filter(b => {
        if (!b.created_at) return false;
        return String(b.created_at).startsWith(selectedDate);
    });

    let dayRevenue = 0, dayPending = 0;
    dayBillings.forEach(b => {
        const val = parseFloat(b.value) || 0;
        if ((b.status || '').toLowerCase() === 'pago') dayRevenue += val;
        else if ((b.status || '').toLowerCase() === 'pendente') dayPending += val;
    });

    let totalRevenue = 0, totalPending = 0;
    allBillings.forEach(b => {
        const val = parseFloat(b.value) || 0;
        if ((b.status || '').toLowerCase() === 'pago') totalRevenue += val;
        else if ((b.status || '').toLowerCase() === 'pendente') totalPending += val;
    });

    const isToday = selectedDate === toLocalYYYYMMDD(new Date());

    // ---- Charts ----
    const appByDoc = {};
    dayApps.forEach(app => { appByDoc[app.doctor_id] = (appByDoc[app.doctor_id] || 0) + 1; });
    const doughnutDoc = {
        labels: Object.keys(appByDoc).map(id => {
            const doc = allDoctors.find(d => String(d.id) === String(id));
            return doc ? `Dr. ${doc.name.split(' ')[0]}` : 'Outro';
        }),
        datasets: [{
            data: Object.values(appByDoc),
            backgroundColor: Object.keys(appByDoc).map(id => {
                const doc = allDoctors.find(d => String(d.id) === String(id));
                return doc?.color || '#6c5be4';
            }),
            borderWidth: 0,
            hoverOffset: 6
        }]
    };

    const selD  = new Date(selectedDate + 'T00:00:00');
    const yr    = selD.getFullYear();
    const mo    = selD.getMonth();
    const days  = new Date(yr, mo + 1, 0).getDate();
    const tlData = new Array(days).fill(0);
    allAppointments.forEach(app => {
        if (!app.date) return;
        const raw = String(app.date).split('Z')[0].split('+')[0].replace(' ', 'T');
        const d   = new Date(raw);
        if (d.getFullYear() === yr && d.getMonth() === mo) tlData[d.getDate() - 1] += 1;
    });
    const timelineChart = {
        labels: Array.from({ length: days }, (_, i) => i + 1),
        datasets: [{ label: 'Consultas', data: tlData, borderColor: '#6c5be4', backgroundColor: 'rgba(108,91,228,0.12)', borderWidth: 2.5, tension: 0.4, fill: true, pointBackgroundColor: '#fff', pointBorderColor: '#6c5be4', pointRadius: 3, pointHoverRadius: 6 }]
    };

    const financialChart = {
        labels: ['Recebido', 'Pendente'],
        datasets: [{ data: [totalRevenue, totalPending], backgroundColor: ['#10b981', '#f59e0b'], borderWidth: 0, hoverOffset: 6 }]
    };

    const baseOpts = {
        maintainAspectRatio: false,
        plugins: {
            legend: { position: 'bottom', labels: { usePointStyle: true, padding: 18, font: { size: 12 } } },
            tooltip: { backgroundColor: 'rgba(15,23,42,0.9)', padding: 12, cornerRadius: 8 }
        },
        scales: {
            x: { grid: { display: false }, ticks: { font: { size: 11 }, color: '#94a3b8' } },
            y: { border: { dash: [4, 4], display: false }, grid: { color: '#f1f5f9' }, ticks: { font: { size: 11 }, color: '#94a3b8', padding: 8 } }
        }
    };
    const doughnutOpts = { ...baseOpts, cutout: '72%', scales: { x: { display: false }, y: { display: false } }, plugins: { ...baseOpts.plugins, legend: { position: 'right', labels: { usePointStyle: true, padding: 16, font: { size: 12 } } } } };
    const lineOpts     = { ...baseOpts, plugins: { ...baseOpts.plugins, legend: { display: false } } };

    // ---- Date nav ----
    const shiftDate = (delta) => {
        const d = new Date(selectedDate + 'T00:00:00');
        d.setDate(d.getDate() + delta);
        setSelectedDate(toLocalYYYYMMDD(d));
    };

    const dateLabel = isToday
        ? 'Hoje'
        : new Date(selectedDate + 'T00:00:00').toLocaleDateString('pt-BR', { weekday: 'long', day: '2-digit', month: 'long' });

    const dayAppsSorted = [...dayApps].sort((a, b) => new Date(a.date) - new Date(b.date));

    const KpiCard = ({ label, value, sub, icon: Icon, iconBg, iconColor, badge, badgeColor }) => (
        <div className="bg-white rounded-2xl p-5 border border-slate-100 shadow-sm hover:shadow-md transition-all duration-200 relative overflow-hidden group flex flex-col gap-3">
            <div className="absolute -right-5 -top-5 w-20 h-20 rounded-full opacity-60 transition-transform group-hover:scale-110" style={{ background: iconBg }}></div>
            <div className="flex items-start justify-between">
                <div>
                    <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1">{label}</p>
                    <h3 className="text-3xl font-extrabold text-slate-800 leading-tight">{value}</h3>
                </div>
                <div className="w-11 h-11 rounded-xl flex items-center justify-center text-xl shadow-inner flex-shrink-0" style={{ background: iconBg, color: iconColor }}>
                    <Icon />
                </div>
            </div>
            {badge && (
                <div className="text-[11px] font-bold w-fit px-2.5 py-1 rounded-lg" style={{ background: badgeColor + '18', color: badgeColor }}>{badge}</div>
            )}
            {sub && <p className="text-xs text-slate-400">{sub}</p>}
        </div>
    );

    // ── Loading skeleton ──────────────────────────────────────────────────────
    if (isLoading) {
        return (
            <div className="space-y-7 animate-pulse">
                <div className="flex justify-between items-center">
                    <div className="h-8 w-48 bg-slate-100 rounded-xl" />
                    <div className="h-10 w-56 bg-slate-100 rounded-xl" />
                </div>
                <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                    {Array.from({ length: 8 }).map((_, i) => (
                        <div key={i} className="h-28 bg-slate-100 rounded-2xl" />
                    ))}
                </div>
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                    <div className="lg:col-span-2 h-80 bg-slate-100 rounded-2xl" />
                    <div className="h-80 bg-slate-100 rounded-2xl" />
                </div>
            </div>
        );
    }

    return (
        <div className="space-y-7 animate-in slide-in-from-bottom-4 duration-500 fade-in">

            {/* ---- Header ---- */}
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                <div>
                    <h1 className="text-2xl font-bold text-slate-800 tracking-tight">Visão Geral</h1>
                </div>

                {/* Date selector */}
                <div className={`flex items-center gap-2 bg-white border border-slate-200 rounded-xl px-1 py-1 shadow-sm relative group ${companyPlan === 'free' ? 'opacity-70 cursor-not-allowed' : ''}`}>
                    {companyPlan === 'free' && (
                        <div className="absolute left-1/2 -top-10 -translate-x-1/2 w-48 bg-slate-800 text-white text-xs p-2 rounded-lg shadow-xl opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-200 z-10 text-center pointer-events-none">
                            Filtro de datas exclusivo a partir do plano Start.
                            <div className="absolute -bottom-1 left-1/2 -translate-x-1/2 w-2 h-2 bg-slate-800 rotate-45"></div>
                        </div>
                    )}
                    <button onClick={() => shiftDate(-1)} disabled={companyPlan === 'free'} className="w-8 h-8 rounded-lg hover:bg-slate-100 flex items-center justify-center text-slate-500 transition-colors disabled:opacity-30 disabled:cursor-not-allowed">
                        <FaChevronLeft className="text-xs" />
                    </button>
                    <div className="flex items-center gap-2 px-1">
                        <input
                            type="date"
                            value={selectedDate}
                            disabled={companyPlan === 'free'}
                            onChange={e => setSelectedDate(e.target.value)}
                            className="border-none outline-none bg-transparent text-sm font-bold text-slate-700 cursor-pointer disabled:cursor-not-allowed"
                            max={toLocalYYYYMMDD(new Date())}
                        />
                        {isToday && (
                            <span className="text-[10px] font-bold bg-primary text-white px-2 py-0.5 rounded-full">Hoje</span>
                        )}
                    </div>
                    <button onClick={() => shiftDate(1)} disabled={isToday || companyPlan === 'free'} className="w-8 h-8 rounded-lg hover:bg-slate-100 flex items-center justify-center text-slate-500 transition-colors disabled:opacity-30 disabled:cursor-not-allowed">
                        <FaChevronRight className="text-xs" />
                    </button>
                </div>
            </div>

            {/* ---- KPI Row: day-specific ---- */}
            <div>
                <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-3 flex items-center gap-2">
                    <span className="w-1.5 h-1.5 rounded-full bg-primary inline-block"></span>
                    {dateLabel}
                </p>
                <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                    <KpiCard label="Consultas" value={dayApps.length} icon={FaCalendarCheck} iconBg="#ede9fe" iconColor="#6c5be4" badge={dayApps.length === 0 ? 'Nenhuma consulta' : `${dayApps.length} agendada${dayApps.length > 1 ? 's' : ''}`} badgeColor="#6c5be4" />
                    <KpiCard label="Prontuários" value={dayRecords.length} icon={FaFileMedicalAlt} iconBg="#dcfce7" iconColor="#16a34a" badge={dayApps.length > 0 ? `${Math.round((dayRecords.length / dayApps.length) * 100)}% concluídos` : '—'} badgeColor="#16a34a" />
                    <KpiCard label="Receita do Dia" value={fmt(dayRevenue, currency)} icon={FaCheckCircle} iconBg="#d1fae5" iconColor="#059669" badge="Faturas pagas" badgeColor="#059669" />
                    <KpiCard label="Pendente do Dia" value={fmt(dayPending, currency)} icon={FaClock} iconBg="#fef3c7" iconColor="#d97706" badge="A receber" badgeColor="#d97706" />
                </div>
            </div>

            {/* ---- KPI Row: global totals ---- */}
            <div>
                <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-3 flex items-center gap-2">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 inline-block"></span>
                    Totais Gerais
                </p>
                <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                    <KpiCard label="Médicos" value={allDoctors.length} icon={FaUserMd} iconBg="#e0e7ff" iconColor="#4f46e5" badge="Equipe ativa" badgeColor="#4f46e5" />
                    <KpiCard label="Pacientes" value={allPatients.length} icon={FaUserInjured} iconBg="#fce7f3" iconColor="#db2777" badge="Cadastrados" badgeColor="#db2777" />
                    <KpiCard label="Receita Total" value={fmt(totalRevenue, currency)} icon={FaMoneyBillWave} iconBg="#d1fae5" iconColor="#059669" badge="Recebido" badgeColor="#059669" />
                    <KpiCard label="A Receber" value={fmt(totalPending, currency)} icon={FaClock} iconBg="#fef3c7" iconColor="#d97706" badge="Total pendente" badgeColor="#d97706" />
                </div>
            </div>

            {/* ---- Charts + Activity ---- */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

                <div className="lg:col-span-2 bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
                    <div className="px-6 py-4 border-b border-slate-50 flex items-center justify-between">
                        <h3 className="font-bold text-slate-800 text-sm">Consultas no Mês — {new Date(selectedDate + 'T00:00:00').toLocaleString('pt-BR', { month: 'long', year: 'numeric' })}</h3>
                    </div>
                    <div className="p-6 min-h-[260px]">
                        <Line data={timelineChart} options={lineOpts} />
                    </div>
                </div>

                <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
                    <div className="px-6 py-4 border-b border-slate-50">
                        <h3 className="font-bold text-slate-800 text-sm">Carga por Médico</h3>
                        <p className="text-[11px] text-slate-400">{dateLabel}</p>
                    </div>
                    <div className="p-6 min-h-[260px] flex items-center justify-center">
                        {Object.keys(appByDoc).length > 0
                            ? <Doughnut data={doughnutDoc} options={doughnutOpts} />
                            : <p className="text-sm text-slate-400 text-center">Nenhuma consulta neste dia</p>
                        }
                    </div>
                </div>

                <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
                    <div className="px-6 py-4 border-b border-slate-50">
                        <h3 className="font-bold text-slate-800 text-sm">Faturamento Geral</h3>
                        <p className="text-[11px] text-slate-400">Recebido vs Pendente (acumulado)</p>
                    </div>
                    <div className="p-6 min-h-[260px] flex items-center justify-center">
                        {(totalRevenue + totalPending) > 0
                            ? <Doughnut data={financialChart} options={doughnutOpts} />
                            : <p className="text-sm text-slate-400 text-center">Sem faturas registradas</p>
                        }
                    </div>
                </div>

                <div className="lg:col-span-2 bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
                    <div className="px-6 py-4 border-b border-slate-50 flex items-center justify-between">
                        <h3 className="font-bold text-slate-800 text-sm">Agenda do Dia</h3>
                        <span className="text-xs font-bold text-primary bg-primary/10 px-2.5 py-1 rounded-full">{dayApps.length} consultas</span>
                    </div>
                    <div className="divide-y divide-slate-50 max-h-[300px] overflow-y-auto">
                        {dayAppsSorted.length === 0 && (
                            <div className="py-12 text-center text-slate-400 text-sm">Nenhuma consulta neste dia.</div>
                        )}
                        {dayAppsSorted.map(app => {
                            const pat = allPatients.find(p => String(p.id) === String(app.patient_id || app.user_id));
                            const doc = allDoctors.find(d => String(d.id) === String(app.doctor_id));
                            const raw = String(app.date).split('Z')[0].split('+')[0].replace(' ', 'T');
                            const t   = new Date(raw);
                            const hasRec = allRecords.some(r => String(r.appointmentId || r.appointment_id) === String(app.id));
                            return (
                                <div key={app.id} className="flex items-center gap-4 px-6 py-3 hover:bg-slate-50 transition-colors">
                                    <div className="w-10 h-10 rounded-full flex items-center justify-center text-white text-sm font-bold flex-shrink-0" style={{ backgroundColor: doc?.color || '#6c5be4' }}>
                                        {pat?.name?.charAt(0) || '?'}
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <p className="font-bold text-slate-800 text-sm truncate">{pat?.name || 'Paciente'}</p>
                                        <p className="text-xs text-slate-400">Dr. {doc?.name?.replace('Dr. ', '') || '—'}</p>
                                    </div>
                                    <div className="text-right flex-shrink-0">
                                        <p className="font-mono text-sm font-bold text-slate-700">{String(t.getHours()).padStart(2,'0')}:{String(t.getMinutes()).padStart(2,'0')}</p>
                                        <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded ${hasRec ? 'bg-emerald-50 text-emerald-600' : 'bg-slate-100 text-slate-500'}`}>
                                            {hasRec ? '✓ Finalizado' : 'Aguardando'}
                                        </span>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                </div>

            </div>
        </div>
    );
};

export default DashboardHome;
