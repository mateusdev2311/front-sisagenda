import { useState, useEffect } from 'react';
import { NavLink } from 'react-router-dom';
import { FaHeartbeat, FaTachometerAlt, FaUsers, FaUserMd, FaUserInjured, FaCalendarAlt, FaFileMedicalAlt, FaBullhorn, FaCog, FaBuilding, FaStethoscope, FaChevronLeft, FaChevronRight, FaLock } from 'react-icons/fa';
import { getCompanyInfo } from '../services/aiService';

const Sidebar = ({ isOpen, setIsOpen }) => {
    const [isCollapsed, setIsCollapsed] = useState(true);
    const [companyPlan, setCompanyPlan] = useState('pro'); // Default to pro to avoid flickering, will update

    useEffect(() => {
        getCompanyInfo()
            .then(res => setCompanyPlan(res.data?.plan || 'free'))
            .catch(() => setCompanyPlan('free'));
    }, []);

    const linkClass = ({ isActive }) =>
        `flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-200 mt-1 overflow-hidden whitespace-nowrap ${isActive
            ? 'bg-primary text-white shadow-md shadow-primary/20 font-medium'
            : 'text-slate-500 hover:bg-white hover:text-slate-800 hover:shadow-sm'
        } ${isCollapsed ? 'justify-center px-0' : ''}`;

    const titleClass = `text-xs font-bold text-slate-400 uppercase tracking-wider mt-6 mb-2 px-4 whitespace-nowrap transition-opacity duration-200 ${isCollapsed ? 'opacity-0 h-0 mt-0 mb-0 overflow-hidden' : 'opacity-100'}`;

    const userString = localStorage.getItem('user');
    const user = userString ? JSON.parse(userString) : {};
    const isSuperAdmin = user.is_super_admin === true;

    return (
        <aside className={`fixed inset-y-0 left-0 z-50 bg-slate-50 border-r border-slate-200 h-full flex flex-col transition-all duration-300 ${isOpen ? 'translate-x-0' : '-translate-x-full'} md:relative md:translate-x-0 ${isCollapsed ? 'w-20' : 'w-72'}`}>

            <div className="h-20 flex items-center justify-center px-4 border-b border-slate-200 transition-colors overflow-hidden">
                {!isCollapsed ? (
                    <img
                        src="/logo_sisagenda-removebg-preview.png"
                        alt="Sisagenda"
                        className="h-32 w-auto object-contain transition-all duration-300"
                    />
                ) : (
                    <img
                        src="/logosidebar.png"
                        alt="Sisagenda Logo"
                        className="w-10 h-10 object-contain transition-all duration-300"
                    />
                )}
            </div>

            <nav 
              className="flex-1 overflow-y-auto px-4 py-6 custom-scrollbar"
              onClick={() => window.innerWidth < 768 && setIsOpen(false)}
            >
                <ul className="space-y-1">


                    {isSuperAdmin && (
                        <>
                            <li className={titleClass}>Gestão SaaS</li>
                            <li>
                                <NavLink to="/admin/clinicas" className={linkClass} title="Clínicas Cadastradas">
                                    <FaBuilding className={`text-lg opacity-80 ${isCollapsed ? 'mx-auto' : ''}`} /> 
                                    {!isCollapsed && <span>Clínicas Cadastradas</span>}
                                </NavLink>
                            </li>
                        </>
                    )}

                    {!isSuperAdmin && (
                        <>
                            <li className={titleClass}>Visão Geral</li>
                            <li>
                                <NavLink to="/home" className={linkClass} title="Dashboard">
                                    <FaTachometerAlt className={`text-lg opacity-80 ${isCollapsed ? 'mx-auto' : ''}`} /> 
                                    {!isCollapsed && <span>Dashboard</span>}
                                </NavLink>
                            </li>

                            <li className={titleClass}>Gerenciamento</li>
                            <li>
                                <NavLink to="/users" className={linkClass} title="Usuários do Sistema">
                                    <FaUsers className={`text-lg opacity-80 ${isCollapsed ? 'mx-auto' : ''}`} /> 
                                    {!isCollapsed && <span>Usuários do Sistema</span>}
                                </NavLink>
                            </li>
                            <li>
                                <NavLink to="/doctors" className={linkClass} title="Profissionais">
                                    <FaUserMd className={`text-lg opacity-80 ${isCollapsed ? 'mx-auto' : ''}`} /> 
                                    {!isCollapsed && <span>Profissionais</span>}
                                </NavLink>
                            </li>

                            <li className={titleClass}>Operações</li>
                            <li>
                                <NavLink to="/patients" className={linkClass} title="Registro de Pacientes">
                                    <FaUserInjured className={`text-lg opacity-80 ${isCollapsed ? 'mx-auto' : ''}`} /> 
                                    {!isCollapsed && <span>Registro de Pacientes</span>}
                                </NavLink>
                            </li>
                            <li>
                                <NavLink to="/schedules" className={linkClass} title="Agendamentos">
                                    <FaCalendarAlt className={`text-lg opacity-80 ${isCollapsed ? 'mx-auto' : ''}`} /> 
                                    {!isCollapsed && <span>Agendamentos</span>}
                                </NavLink>
                            </li>
                            <li>
                                <NavLink to="/atendimentos" className={linkClass} title="Sala de Atendimento">
                                    <FaStethoscope className={`text-lg opacity-80 ${isCollapsed ? 'mx-auto' : ''}`} />
                                    {!isCollapsed && <span>Sala de Atendimento</span>}
                                </NavLink>
                            </li>
                            <li>
                                <NavLink to="/records" className={linkClass} title="Prontuários Clínicos">
                                    <FaFileMedicalAlt className={`text-lg opacity-80 ${isCollapsed ? 'mx-auto' : ''}`} /> 
                                    {!isCollapsed && <span>Prontuários Clínicos</span>}
                                </NavLink>
                            </li>
                            <li>
                                <NavLink 
                                    to="/follow-ups" 
                                    className={linkClass}
                                    title="Pós-Atendimento"
                                >
                                    <div className="relative">
                                        <FaBullhorn className={`text-lg opacity-80 text-orange-400 ${isCollapsed ? 'mx-auto' : ''}`} /> 
                                        {companyPlan !== 'pro' && (
                                            <FaLock className="absolute -top-1 -right-1 text-[8px] text-slate-400 bg-white rounded-full p-0.5 border border-slate-200" />
                                        )}
                                    </div>
                                    {!isCollapsed && (
                                        <span className="flex items-center justify-between flex-1">
                                            Pós-Atendimento
                                            {companyPlan !== 'pro' && (
                                                <span className="ml-2 px-1.5 py-0.5 bg-indigo-100 text-indigo-600 text-[9px] font-bold rounded uppercase tracking-tighter">PRO</span>
                                            )}
                                        </span>
                                    )}
                                </NavLink>
                            </li>

                            <li className={titleClass}>Financeiro</li>
                            <li>
                                <NavLink 
                                    to="/financial" 
                                    className={linkClass} 
                                    title="Faturamento"
                                >
                                    <div className="relative">
                                        <FaHeartbeat className={`text-lg opacity-80 ${isCollapsed ? 'mx-auto' : ''}`} /> 
                                        {companyPlan === 'free' && (
                                            <FaLock className="absolute -top-1 -right-1 text-[8px] text-slate-400 bg-white rounded-full p-0.5 border border-slate-200" />
                                        )}
                                    </div>
                                    {!isCollapsed && (
                                        <span className="flex items-center justify-between flex-1">
                                            Faturamento
                                            {companyPlan === 'free' && (
                                                <span className="ml-2 px-1.5 py-0.5 bg-emerald-100 text-emerald-600 text-[9px] font-bold rounded uppercase tracking-tighter">START</span>
                                            )}
                                        </span>
                                    )}
                                </NavLink>
                            </li>
                        </>
                    )}

                    <li className={titleClass}>Configurações</li>
                    <li>
                        <NavLink to="/settings" className={linkClass} title="Preferências">
                            <FaCog className={`text-lg opacity-80 ${isCollapsed ? 'mx-auto' : ''}`} /> 
                            {!isCollapsed && <span>Preferências</span>}
                        </NavLink>
                    </li>
                </ul>
            </nav>

            <div className={`p-4 border-t border-slate-200 flex ${isCollapsed ? 'justify-center' : 'justify-between'} items-center transition-all duration-300`}>
                {!isCollapsed && (
                    <div className="flex flex-col">
                        <span className="text-xs font-bold text-slate-700">Sisagenda</span>
                        <span className="text-[10px] text-slate-400 font-medium">v2.5</span>
                    </div>
                )}
                <button 
                    onClick={() => setIsCollapsed(!isCollapsed)}
                    className="w-8 h-8 rounded-lg bg-slate-200 hover:bg-slate-300 text-slate-600 flex items-center justify-center transition-colors"
                    title={isCollapsed ? "Expandir" : "Retrair"}
                >
                    {isCollapsed ? <FaChevronRight className="text-xs" /> : <FaChevronLeft className="text-xs" />}
                </button>
            </div>
        </aside>
    );
};

export default Sidebar;
