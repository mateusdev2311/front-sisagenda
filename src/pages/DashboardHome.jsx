import { useEffect, useState } from 'react';
import axios from '../api/axiosConfig';
import { Chart as ChartJS, ArcElement, Tooltip, Legend, CategoryScale, LinearScale, PointElement, LineElement, BarElement, Filler } from 'chart.js';
import { Doughnut, Line, Bar } from 'react-chartjs-2';
import { FaCalendarCheck, FaUserInjured, FaUserMd, FaArrowUp, FaChartLine } from 'react-icons/fa';

ChartJS.register(ArcElement, Tooltip, Legend, CategoryScale, LinearScale, PointElement, LineElement, BarElement, Filler);

const DashboardHome = () => {
    /**
     * Estados de Agregação de Dados da Dashboard
     * @property {Object} stats - Contadores de KPI localizados logo no topo da dashboard.
     * @property {Object} docChartData - Estado mapeado para as configs do Chart.js Rosca sobre o Tráfego de Médicos.
     * @property {Object} timelineData - Estado mapeado para as configs Linha temporal Chart.js de Consultas no Mês.
     * @property {Object} demoData - Estado mapeado para a config de Barras sobre Distribuição de Gênero.
     */
    const [stats, setStats] = useState({ doctors: 0, patients: 0, appointmentsToday: 0 });
    const [docChartData, setDocChartData] = useState(null);
    const [timelineData, setTimelineData] = useState(null);
    const [demoData, setDemoData] = useState(null);

    /**
     * Inicialização de Dados
     * Dispara magicamente no instante em que a exibição da Dashboard for renderizada.
     */
    useEffect(() => {
        fetchDashboardData();
    }, []);

    /**
     * Hook Mestre da Resolução de Dados
     * Dispara assíncronamente solicitações simultâneas para as 3 APIs vitais criando e gerando os gráficos da dashboard.
     */

    const fetchDashboardData = async () => {
        try {
            const [appRes, docRes, patRes] = await Promise.all([
                axios.get('/appointments'),
                axios.get('/doctors'),
                axios.get('/patients')
            ]);

            const appointments = appRes.data;
            const doctors = docRes.data;
            const patients = patRes.data;

            const todayStr = new Date().toISOString().split('T')[0];
            const todayApps = appointments.filter(app => app.date && app.date.startsWith(todayStr));

            setStats({
                doctors: doctors.length,
                patients: patients.length,
                appointmentsToday: todayApps.length
            });

            // Doughnut
            const appByDocCount = {};
            appointments.forEach(app => { appByDocCount[app.doctor_id] = (appByDocCount[app.doctor_id] || 0) + 1; });
            const docLabels = []; const docData = []; const docBackgrounds = [];
            Object.keys(appByDocCount).forEach(docId => {
                const doc = doctors.find(d => String(d.id) === String(docId));
                if (doc) {
                    docLabels.push(`Dr. ${doc.name.split(' ')[0]}`);
                    docData.push(appByDocCount[docId]);
                    docBackgrounds.push(doc.color || `hsl(${Math.random() * 360}, 70%, 60%)`);
                }
            });
            setDocChartData({
                labels: docLabels.length ? docLabels : ['No Data'],
                datasets: [{
                    data: docData.length ? docData : [1],
                    backgroundColor: docBackgrounds.length ? docBackgrounds : ['#e2e8f0'],
                    borderWidth: 0,
                    hoverOffset: 4
                }]
            });

            // Timeline
            const now = new Date();
            const currentMonth = now.getMonth();
            const currentYear = now.getFullYear();
            const daysInMonth = new Date(currentYear, currentMonth + 1, 0).getDate();
            const tlLabels = Array.from({ length: daysInMonth }, (_, i) => i + 1);
            const tlDataArr = new Array(daysInMonth).fill(0);
            appointments.forEach(app => {
                if (app.date) {
                    const appDate = new Date(app.date + 'T12:00:00Z');
                    if (appDate.getUTCMonth() === currentMonth && appDate.getUTCFullYear() === currentYear) {
                        tlDataArr[appDate.getUTCDate() - 1] += 1;
                    }
                }
            });
            setTimelineData({
                labels: tlLabels,
                datasets: [{
                    label: 'Consultas',
                    data: tlDataArr,
                    borderColor: '#6c5be4',
                    backgroundColor: 'rgba(108, 91, 228, 0.15)',
                    borderWidth: 2,
                    tension: 0.4,
                    fill: true,
                    pointBackgroundColor: '#fff',
                    pointBorderColor: '#6c5be4',
                    pointRadius: 4,
                    pointHoverRadius: 6
                }]
            });

            // Demographics
            let cMale = 0, cFemale = 0, cOther = 0;
            patients.forEach(pat => {
                const g = (pat.gender || '').toLowerCase();
                if (g === 'male' || g === 'masculino') cMale++;
                else if (g === 'female' || g === 'feminino') cFemale++;
                else cOther++;
            });
            setDemoData({
                labels: ['Feminino', 'Masculino', 'Outro'],
                datasets: [{
                    label: 'Pacientes',
                    data: [cFemale, cMale, cOther],
                    backgroundColor: ['#d946ef', '#14b8a6', '#94a3b8'],
                    borderRadius: 6,
                    barPercentage: 0.6
                }]
            });

        } catch (error) {
            console.error("Dashboard Init Error", error);
        }
    };

    const chartOptions = {
        maintainAspectRatio: false,
        plugins: {
            legend: { position: 'bottom', labels: { usePointStyle: true, padding: 20, font: { family: 'Inter', size: 12 } } },
            tooltip: { backgroundColor: 'rgba(15, 23, 42, 0.9)', titleFont: { family: 'Inter', size: 13 }, bodyFont: { family: 'Inter', size: 13 }, padding: 12, cornerRadius: 8 }
        },
        scales: {
            x: { grid: { display: false, drawBorder: false }, ticks: { font: { family: 'Inter', size: 11 }, color: '#64748b' } },
            y: { border: { dash: [4, 4], display: false }, grid: { color: '#f1f5f9', drawBorder: false }, ticks: { font: { family: 'Inter', size: 11 }, color: '#64748b', padding: 10 } }
        }
    };

    const doughnutOptions = {
        ...chartOptions,
        cutout: '70%',
        scales: { x: { display: false }, y: { display: false } },
        plugins: { ...chartOptions.plugins, legend: { position: 'right', labels: { usePointStyle: true, padding: 20, font: { family: 'Inter', size: 12 } } } }
    };

    return (
        <div className="space-y-6 animate-in slide-in-from-bottom-4 duration-500 fade-in">

            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-2">
                <div>
                    <h1 className="text-2xl font-bold text-slate-800 tracking-tight">Visão Geral do Painel</h1>
                    <p className="text-sm text-slate-500 mt-1">Monitore o desempenho da clínica e os agendamentos de hoje.</p>
                </div>
                <div className="flex items-center gap-2 bg-white px-4 py-2 border border-slate-200 rounded-lg text-sm font-medium text-slate-600 shadow-sm">
                    <FaChartLine className="text-primary" />
                    <span>Análises em Tempo Real</span>
                </div>
            </div>

            {/* KPI Stats */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">

                <div className="bg-white rounded-2xl p-6 shadow-sm shadow-slate-200/50 border border-slate-100 flex flex-col justify-between hover:shadow-md transition-shadow relative overflow-hidden group">
                    <div className="absolute -right-6 -top-6 bg-primary/5 w-24 h-24 rounded-full group-hover:bg-primary/10 transition-colors"></div>
                    <div className="flex justify-between items-start mb-4">
                        <div>
                            <p className="text-sm font-medium text-slate-500 mb-1">Consultas de Hoje</p>
                            <h3 className="text-3xl font-bold text-slate-800">{stats.appointmentsToday}</h3>
                        </div>
                        <div className="w-12 h-12 rounded-xl bg-primary-light text-primary flex items-center justify-center text-xl shadow-inner">
                            <FaCalendarCheck />
                        </div>
                    </div>
                    <div className="flex items-center text-xs text-emerald-600 font-medium bg-emerald-50 w-fit px-2 py-1 rounded">
                        <FaArrowUp className="mr-1" /> Crescimento hoje
                    </div>
                </div>

                <div className="bg-white rounded-2xl p-6 shadow-sm shadow-slate-200/50 border border-slate-100 flex flex-col justify-between hover:shadow-md transition-shadow relative overflow-hidden group">
                    <div className="absolute -right-6 -top-6 bg-teal-500/5 w-24 h-24 rounded-full group-hover:bg-teal-500/10 transition-colors"></div>
                    <div className="flex justify-between items-start mb-4">
                        <div>
                            <p className="text-sm font-medium text-slate-500 mb-1">Total de Pacientes</p>
                            <h3 className="text-3xl font-bold text-slate-800">{stats.patients}</h3>
                        </div>
                        <div className="w-12 h-12 rounded-xl bg-teal-50 text-teal-600 flex items-center justify-center text-xl shadow-inner">
                            <FaUserInjured />
                        </div>
                    </div>
                    <div className="flex items-center text-xs text-slate-500 font-medium">
                        Bloco de registro ativo
                    </div>
                </div>

                <div className="bg-white rounded-2xl p-6 shadow-sm shadow-slate-200/50 border border-slate-100 flex flex-col justify-between hover:shadow-md transition-shadow relative overflow-hidden group">
                    <div className="absolute -right-6 -top-6 bg-amber-500/5 w-24 h-24 rounded-full group-hover:bg-amber-500/10 transition-colors"></div>
                    <div className="flex justify-between items-start mb-4">
                        <div>
                            <p className="text-sm font-medium text-slate-500 mb-1">Equipe Médica</p>
                            <h3 className="text-3xl font-bold text-slate-800">{stats.doctors}</h3>
                        </div>
                        <div className="w-12 h-12 rounded-xl bg-amber-50 text-amber-500 flex items-center justify-center text-xl shadow-inner">
                            <FaUserMd />
                        </div>
                    </div>
                    <div className="flex items-center text-xs text-slate-500 font-medium">
                        Médicos alocados
                    </div>
                </div>
            </div>

            {/* Charts Array */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">

                <div className="bg-white rounded-2xl shadow-sm shadow-slate-200/50 border border-slate-100 overflow-hidden flex flex-col">
                    <div className="px-6 py-4 border-b border-slate-100 flex justify-between items-center bg-slate-50/50">
                        <h3 className="font-semibold text-slate-800">Carga por Médico</h3>
                    </div>
                    <div className="p-6 flex-1 min-h-[300px] relative">
                        {docChartData && <Doughnut data={docChartData} options={doughnutOptions} />}
                    </div>
                </div>

                <div className="bg-white rounded-2xl shadow-sm shadow-slate-200/50 border border-slate-100 overflow-hidden flex flex-col">
                    <div className="px-6 py-4 border-b border-slate-100 flex justify-between items-center bg-slate-50/50">
                        <h3 className="font-semibold text-slate-800">Linha do Tempo (Mês)</h3>
                    </div>
                    <div className="p-6 flex-1 min-h-[300px] relative">
                        {timelineData && <Line data={timelineData} options={{ ...chartOptions, plugins: { legend: { display: false } } }} />}
                    </div>
                </div>

                <div className="bg-white rounded-2xl shadow-sm shadow-slate-200/50 border border-slate-100 overflow-hidden col-span-1 lg:col-span-2">
                    <div className="px-6 py-4 border-b border-slate-100 flex justify-between items-center bg-slate-50/50">
                        <h3 className="font-semibold text-slate-800">Demografia de Pacientes</h3>
                    </div>
                    <div className="p-6 h-[350px] relative">
                        {demoData && <Bar data={demoData} options={{ ...chartOptions, plugins: { legend: { display: false } } }} />}
                    </div>
                </div>

            </div>
        </div>
    );
};

export default DashboardHome;
