import { useState, useRef, useEffect } from 'react';
import { FaSearch, FaBell, FaChevronDown, FaKey, FaSignOutAlt, FaInfoCircle, FaCalendarCheck, FaExclamationTriangle, FaBars, FaMoon, FaSun } from 'react-icons/fa';
import { jwtDecode } from 'jwt-decode';
import { useNavigate } from 'react-router-dom';

const Topbar = ({ toggleSidebar }) => {
    const [notifOpen, setNotifOpen] = useState(false);
    const [profileOpen, setProfileOpen] = useState(false);
    const [userData, setUserData] = useState({ name: 'Usuário', email: '', role: 'Membro' });
    const navigate = useNavigate();

    const [isDarkMode, setIsDarkMode] = useState(() => {
        return localStorage.getItem('theme') === 'dark';
    });

    const notifRef = useRef(null);
    const profileRef = useRef(null);

    useEffect(() => {
        if (isDarkMode) {
            document.documentElement.classList.add('dark');
            localStorage.setItem('theme', 'dark');
        } else {
            document.documentElement.classList.remove('dark');
            localStorage.setItem('theme', 'light');
        }
    }, [isDarkMode]);

    useEffect(() => {
        // Obter dados do usuário logado via JWT Token
        const token = localStorage.getItem('token');
        if (token) {
            try {
                const decoded = jwtDecode(token);
                setUserData({
                    name: decoded.name || 'Usuário do Sistema',
                    email: decoded.email || '',
                    role: decoded.role === 'admin' ? 'Superadmin' : 'Acesso Padrão'
                });
            } catch (error) {
                console.error("Erro ao decodificar token", error);
            }
        }

        const handleClickOutside = (event) => {
            if (notifRef.current && !notifRef.current.contains(event.target)) setNotifOpen(false);
            if (profileRef.current && !profileRef.current.contains(event.target)) setProfileOpen(false);
        };
        document.addEventListener("mousedown", handleClickOutside);
        return () => document.removeEventListener("mousedown", handleClickOutside);
    }, []);

    const handleLogout = () => {
        localStorage.removeItem('token');
        window.location.href = '/login';
    };

    return (
        <header className="h-20 bg-white dark:bg-slate-800 border-b border-slate-200 dark:border-slate-700 px-6 flex items-center justify-between shadow-sm z-10 sticky top-0 transition-colors duration-200">

            {/* Mobile Toggle & Logo Space */}
            <div className="flex items-center gap-4 flex-1">
                <button 
                  onClick={toggleSidebar}
                  className="md:hidden text-slate-500 hover:text-primary dark:text-slate-400 dark:hover:text-primary-light p-2"
                >
                    <FaBars className="text-xl" />
                </button>
                <div className="hidden sm:block text-slate-800 dark:text-slate-200 font-semibold text-lg">
                    {/* Pode adicionar um breadcrumb ou título aqui futuramente */}
                </div>
            </div>

            {/* Actions Right */}
            <div className="flex items-center gap-4">

                {/* Dark Mode Toggle */}
                <button
                    onClick={() => setIsDarkMode(!isDarkMode)}
                    className="p-2 text-slate-500 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-full transition-colors"
                    title={isDarkMode ? "Modo Claro" : "Modo Escuro"}
                >
                    {isDarkMode ? <FaSun className="text-lg text-yellow-500" /> : <FaMoon className="text-lg" />}
                </button>

                {/* User Profile */}
                <div className="relative" ref={profileRef}>
                    <button
                        onClick={() => setProfileOpen(!profileOpen)}
                        className="flex items-center gap-2 hover:bg-slate-50 p-1.5 rounded-lg transition-colors border border-transparent hover:border-slate-200"
                    >
                        <img className="h-8 w-8 rounded-full border border-slate-200 object-cover" src={`https://ui-avatars.com/api/?name=${encodeURIComponent(userData.name)}&background=6c5be4&color=fff`} alt={userData.name} />
                        <div className="hidden md:flex flex-col items-start mr-1">
                            <span className="text-sm font-semibold text-slate-700 leading-tight">{userData.name}</span>
                            <span className="text-xs text-slate-500">{userData.role}</span>
                        </div>
                        <FaChevronDown className={`text-xs text-slate-400 hidden md:block transition-transform ${profileOpen ? 'rotate-180' : ''}`} />
                    </button>

                    {profileOpen && (
                        <div className="absolute right-0 mt-2 w-48 bg-white rounded-xl shadow-lg border border-slate-100 py-1 z-50 animate-in fade-in slide-in-from-top-2 duration-200">
                            <div className="px-4 py-2 border-b border-slate-100 mb-1">
                                <p className="text-sm text-slate-800 font-medium">Logado como</p>
                                <p className="text-xs text-slate-500 truncate">{userData.email}</p>
                            </div>
                            <button onClick={() => navigate('/settings')} className="w-full text-left px-4 py-2 text-sm text-slate-700 hover:bg-slate-50 flex items-center gap-2"><FaKey className="text-slate-400" /> Minha Conta</button>
                            <div className="h-px bg-slate-100 my-1"></div>
                            <button onClick={handleLogout} className="w-full text-left px-4 py-2 text-sm text-red-600 hover:bg-red-50 flex items-center gap-2 font-medium"><FaSignOutAlt /> Sair do Sistema</button>
                        </div>
                    )}
                </div>

            </div>
        </header>
    );
};

export default Topbar;
