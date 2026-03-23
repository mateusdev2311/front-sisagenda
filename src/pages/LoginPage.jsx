import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from '../api/axiosConfig';
import { FaHeartbeat, FaEnvelope, FaLock, FaSignInAlt } from 'react-icons/fa';

const LoginPage = () => {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [error, setError] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const navigate = useNavigate();

    const handleLogin = async (e) => {
        e.preventDefault();
        setIsLoading(true);
        setError('');

        try {
            const response = await axios.post('/login', { email, password });

            if (response.data && response.data.token) {
                localStorage.setItem('token', response.data.token);
                const userReturn = response.data.userReturn;
                if (userReturn) {
                    localStorage.setItem('user', JSON.stringify(userReturn));
                }
                // Redirect based on role — '/' now shows the landing page
                navigate(userReturn?.is_super_admin ? '/admin/clinicas' : '/home');
            } else {
                setError('Login failed: No token received.');
            }
        } catch (err) {
            if (err.response && err.response.status === 401) {
                setError('Credenciais inválidas');
            } else if (err.response && err.response.status === 403) {
                setError('Sistema bloqueado. Por favor, entre em contato com o suporte para verificar sua assinatura.');
            } else {
                setError('Erro no servidor. Tente novamente mais tarde.');
            }
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
            <div className="bg-white rounded-2xl shadow-xl shadow-slate-200/50 w-full max-w-md p-6 relative overflow-hidden">
                {/* Decorative background element */}
                <div className="absolute top-0 left-0 w-full h-2 bg-gradient-to-r from-primary via-fuchsia-500 to-primary"></div>

                <div className="text-center mb-5 mt-2">
                    <img
                        src="/logo_sisagenda-removebg-preview.png"
                        alt="Sisagenda"
                        className="h-36 w-auto object-contain mx-auto mb-2"
                    />
                    <p className="text-slate-500 text-sm">Acesse sua conta do Sisagenda</p>
                </div>

                {error && (
                    <div className="bg-red-50 text-red-600 p-4 rounded-lg mb-6 text-sm flex items-center gap-2 border border-red-100">
                        <div className="w-2 h-2 rounded-full bg-red-500"></div>
                        {error}
                    </div>
                )}

                <form onSubmit={handleLogin} className="space-y-4">
                    <div className="space-y-1">
                        <label className="text-sm font-semibold text-slate-700" htmlFor="email">Endereço de E-mail</label>
                        <div className="relative">
                            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                                <FaEnvelope />
                            </div>
                            <input
                                type="email"
                                id="email"
                                className="pl-10 block w-full border-slate-200 rounded-xl bg-slate-50 focus:bg-white focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all py-3"
                                placeholder="admin@example.com"
                                required
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
                            />
                        </div>
                    </div>

                    <div className="space-y-1">
                        <div className="flex justify-between items-center">
                            <label className="text-sm font-semibold text-slate-700" htmlFor="password">Senha</label>
                            <a href="#" className="text-xs text-primary font-medium hover:underline">Esqueceu a senha?</a>
                        </div>
                        <div className="relative">
                            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                                <FaLock />
                            </div>
                            <input
                                type="password"
                                id="password"
                                className="pl-10 block w-full border-slate-200 rounded-xl bg-slate-50 focus:bg-white focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all py-3"
                                placeholder="••••••••"
                                required
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                            />
                        </div>
                    </div>

                    <div className="flex items-center">
                        <input
                            id="rememberMe"
                            type="checkbox"
                            className="h-4 w-4 bg-slate-50 border-slate-300 rounded text-primary focus:ring-primary/20"
                        />
                        <label htmlFor="rememberMe" className="ml-2 block text-sm text-slate-600 mb-0">
                            Lembrar de mim
                        </label>
                    </div>

                    <button
                        type="submit"
                        disabled={isLoading}
                        className="w-full flex justify-center items-center gap-2 py-3 px-4 border border-transparent rounded-xl shadow-md shadow-primary/30 text-sm font-semibold text-white bg-primary hover:bg-primary-dark focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary transition-all duration-200"
                    >
                        {isLoading ? 'Autenticando...' : (
                            <>
                                <FaSignInAlt /> Entrar
                            </>
                        )}
                    </button>
                </form>

                <div className="mt-5 text-center text-sm text-slate-500">
                    <p>Não possui uma conta? <a href="https://wa.me/5538988178623" className="font-medium text-primary hover:text-primary-dark hover:underline">Contate o Administrador</a></p>
                </div>
            </div>
        </div>
    );
};

export default LoginPage;
