import { NavLink } from 'react-router-dom';
import { FaHeartbeat, FaTachometerAlt, FaUsers, FaUserMd, FaUserInjured, FaCalendarAlt, FaFileMedicalAlt, FaCog, FaBuilding } from 'react-icons/fa';

const Sidebar = () => {

    const linkClass = ({ isActive }) =>
        `flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-200 mt-1 ${isActive
            ? 'bg-primary text-white shadow-md shadow-primary/20 font-medium'
            : 'text-slate-500 hover:bg-white hover:text-slate-800 hover:shadow-sm'
        }`;

    const titleClass = "text-xs font-bold text-slate-400 uppercase tracking-wider mt-6 mb-2 px-4";

    const userString = localStorage.getItem('user');
    const user = userString ? JSON.parse(userString) : {};
    const isSuperAdmin = user.is_super_admin === true;

    return (
        <aside className="w-72 bg-slate-50 border-r border-slate-200 h-full flex flex-col hidden md:flex transition-colors duration-300">

            <div className="h-20 flex items-center px-6 border-b border-slate-200 transition-colors">
                <div className="flex items-center gap-3 text-2xl font-bold text-primary">
                    <FaHeartbeat className="text-3xl" />
                    <span className="tracking-tight">Sisagenda</span>
                </div>
            </div>

            <nav className="flex-1 overflow-y-auto px-4 py-6 custom-scrollbar">
                <ul className="space-y-1">
                    <li className={titleClass}>Visão Geral</li>
                    <li>
                        <NavLink to="/home" className={linkClass}>
                            <FaTachometerAlt className="text-lg opacity-80" /> <span>Dashboard</span>
                        </NavLink>
                    </li>

                    {isSuperAdmin && (
                        <>
                            <li className={titleClass}>Gestão SaaS</li>
                            <li>
                                <NavLink to="/admin/clinicas" className={linkClass}>
                                    <FaBuilding className="text-lg opacity-80" /> <span>Clínicas Cadastradas</span>
                                </NavLink>
                            </li>
                        </>
                    )}

                    {!isSuperAdmin && (
                        <>
                            <li className={titleClass}>Gerenciamento</li>
                            <li>
                                <NavLink to="/users" className={linkClass}>
                                    <FaUsers className="text-lg opacity-80" /> <span>Usuários do Sistema</span>
                                </NavLink>
                            </li>
                            <li>
                                <NavLink to="/doctors" className={linkClass}>
                                    <FaUserMd className="text-lg opacity-80" /> <span>Equipe Médica</span>
                                </NavLink>
                            </li>

                            <li className={titleClass}>Operações</li>
                            <li>
                                <NavLink to="/patients" className={linkClass}>
                                    <FaUserInjured className="text-lg opacity-80" /> <span>Registro de Pacientes</span>
                                </NavLink>
                            </li>
                            <li>
                                <NavLink to="/schedules" className={linkClass}>
                                    <FaCalendarAlt className="text-lg opacity-80" /> <span>Agendamentos</span>
                                </NavLink>
                            </li>
                            <li>
                                <NavLink to="/records" className={linkClass}>
                                    <FaFileMedicalAlt className="text-lg opacity-80" /> <span>Prontuários Clínicos</span>
                                </NavLink>
                            </li>

                            <li className={titleClass}>Financeiro</li>
                            <li>
                                <NavLink to="/financial" className={linkClass}>
                                    <FaHeartbeat className="text-lg opacity-80" /> <span>Faturamento</span>
                                </NavLink>
                            </li>
                        </>
                    )}

                    <li className={titleClass}>Configurações</li>
                    <li>
                        <NavLink to="/settings" className={linkClass}>
                            <FaCog className="text-lg opacity-80" /> <span>Preferências</span>
                        </NavLink>
                    </li>
                </ul>
            </nav>

            <div className="p-4 border-t border-slate-200 text-center">
                <p className="text-xs text-slate-400 font-medium">Sisagendamento Pro v2.0</p>
            </div>
        </aside>
    );
};

export default Sidebar;
