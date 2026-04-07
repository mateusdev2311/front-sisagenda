import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from '../api/axiosConfig';

// ─── Helpers de máscara ─────────────────────────────────────────────────────
const maskPhone = (v) => {
    v = v.replace(/\D/g, '').slice(0, 11);
    if (v.length <= 10) return v.replace(/(\d{2})(\d{4})(\d{0,4})/, '($1) $2-$3');
    return v.replace(/(\d{2})(\d{5})(\d{0,4})/, '($1) $2-$3');
};

const maskDoc = (v) => {
    v = v.replace(/\D/g, '');
    if (v.length <= 11) {
        return v
            .replace(/(\d{3})(\d)/, '$1.$2')
            .replace(/(\d{3})\.(\d{3})(\d)/, '$1.$2.$3')
            .replace(/\.(\d{3})(\d)/, '.$1-$2');
    }
    return v
        .slice(0, 14)
        .replace(/(\d{2})(\d)/, '$1.$2')
        .replace(/(\d{2})\.(\d{3})(\d)/, '$1.$2.$3')
        .replace(/\.(\d{3})(\d)/, '.$1/$2')
        .replace(/(\d{4})(\d)/, '$1-$2');
};

// ─── Planos ──────────────────────────────────────────────────────────────────
const PLANS = [
    {
        id: 'start',
        name: 'Start',
        price: 'R$197,00/mês',
        color: '#059669',
        light: '#ecfdf5',
        border: '#6ee7b7',
        features: [
            'Até 5 profissionais',
            'Agendamentos ilimitados',
            'WhatsApp próprio',
            'Lembretes automáticos',
            'Suporte prioritário',
        ],
    },
    {
        id: 'pro',
        name: 'Pro',
        price: 'R$297,00/mês',
        color: '#6c5be4',
        light: '#f5f3ff',
        border: '#a78bfa',
        badge: 'Mais completo',
        features: [
            'Profissionais ilimitados',
            'IA para prontuários',
            'Dashboard avançado',
            'Integração Kentro API',
            'Suporte prioritário',
        ],
    },
];

// ─── Componente ──────────────────────────────────────────────────────────────
export default function RegisterPage() {
    const navigate = useNavigate();

    const [form, setForm] = useState({
        name: '',
        admin_name: '',
        admin_email: '',
        admin_password: '',
        document: '',
        phone: '',
        plan: 'start',
    });
    const [step, setStep] = useState(1); // 1 = dados, 2 = plano
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState('');

    const set = (field) => (e) => {
        let val = e.target.value;
        if (field === 'phone') val = maskPhone(val);
        if (field === 'document') val = maskDoc(val);
        setForm((p) => ({ ...p, [field]: val }));
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError('');
        setIsLoading(true);

        try {
            // 1. Cadastrar empresa
            const regRes = await axios.post('/register', {
                name: form.name,
                admin_name: form.admin_name,
                admin_email: form.admin_email,
                admin_password: form.admin_password,
                document: form.document.replace(/\D/g, ''),
                phone: form.phone.replace(/\D/g, ''),
                plan: form.plan,
            });

            const company_id = regRes.data?.company_id;
            if (!company_id) throw new Error('Cadastro sem company_id na resposta.');

            // 2. Login automático
            const loginRes = await axios.post('/login', {
                email: form.admin_email,
                password: form.admin_password,
            });

            const token = loginRes.data?.token;
            const userReturn = loginRes.data?.userReturn;

            if (!token) throw new Error('Login automático falhou: sem token.');

            localStorage.setItem('token', token);
            if (userReturn) localStorage.setItem('user', JSON.stringify(userReturn));

            // 3. Guardar contexto de pagamento
            localStorage.setItem('pending_company_id', company_id);
            localStorage.setItem('pending_plan', form.plan);
            localStorage.setItem('pending_email', form.admin_email);
            localStorage.setItem('pending_password', form.admin_password);

            navigate('/subscribe');
        } catch (err) {
            const msg =
                err.response?.data?.message ||
                err.response?.data?.error ||
                err.message ||
                'Erro ao realizar cadastro.';
            setError(msg);
        } finally {
            setIsLoading(false);
        }
    };

    const px = '20px';
    const inputStyle = {
        width: '100%',
        padding: '12px 14px',
        border: '1.5px solid #e2e8f0',
        borderRadius: 10,
        fontSize: 14,
        color: '#1e293b',
        background: '#fff',
        outline: 'none',
        transition: 'border-color .2s, box-shadow .2s',
        boxSizing: 'border-box',
    };
    const labelStyle = {
        display: 'block',
        fontSize: 13,
        fontWeight: 600,
        color: '#475569',
        marginBottom: 6,
    };

    return (
        <div
            style={{
                minHeight: '100vh',
                background: 'linear-gradient(160deg, #fafbff 0%, #f0f4ff 100%)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                padding: '40px 20px',
                fontFamily: "'Inter', -apple-system, BlinkMacSystemFont, sans-serif",
            }}
        >
            <div style={{ width: '100%', maxWidth: 520 }}>
                {/* Logo */}
                <div style={{ textAlign: 'center', marginBottom: 28 }}>
                    <img
                        src="/logo_sisagenda-removebg-preview.png"
                        alt="Sisagenda"
                        style={{ height: 90, objectFit: 'contain', margin: '0 auto 8px', display: 'block' }}
                    />
                    <p style={{ fontSize: 14, color: '#64748b', marginTop: 4 }}>
                        Crie sua conta e comece agora
                    </p>
                </div>

                {/* Card */}
                <div
                    style={{
                        background: '#fff',
                        borderRadius: 20,
                        boxShadow: '0 8px 40px rgba(108,91,228,.12)',
                        border: '1px solid #e8eaf0',
                        overflow: 'hidden',
                    }}
                >
                    {/* Header */}
                    <div
                        style={{
                            background: 'linear-gradient(130deg, #6c5be4, #5243b7)',
                            padding: '20px 28px',
                        }}
                    >
                        <h1 style={{ fontSize: 18, fontWeight: 800, color: '#fff', margin: 0 }}>
                            Cadastro da Clínica
                        </h1>
                        <p style={{ fontSize: 13, color: 'rgba(255,255,255,.75)', margin: '4px 0 0' }}>
                            Preencha os dados abaixo para criar sua conta
                        </p>
                    </div>

                    <form onSubmit={handleSubmit} style={{ padding: '28px' }}>
                        {error && (
                            <div
                                style={{
                                    background: '#fef2f2',
                                    border: '1px solid #fecaca',
                                    borderRadius: 10,
                                    padding: '12px 14px',
                                    fontSize: 13,
                                    color: '#dc2626',
                                    marginBottom: 20,
                                }}
                            >
                                ⚠️ {error}
                            </div>
                        )}

                        {/* ── Dados da Clínica ── */}
                        <p
                            style={{
                                fontSize: 11,
                                fontWeight: 700,
                                letterSpacing: '0.08em',
                                textTransform: 'uppercase',
                                color: '#6c5be4',
                                marginBottom: 14,
                            }}
                        >
                            Dados da Clínica
                        </p>

                        <div style={{ display: 'flex', flexDirection: 'column', gap: 14, marginBottom: 24 }}>
                            <div>
                                <label style={labelStyle}>Nome da Clínica *</label>
                                <input
                                    style={inputStyle}
                                    type="text"
                                    required
                                    placeholder="Ex: Clínica MedVida"
                                    value={form.name}
                                    onChange={set('name')}
                                    onFocus={(e) => { e.target.style.borderColor = '#6c5be4'; e.target.style.boxShadow = '0 0 0 3px rgba(108,91,228,.1)'; }}
                                    onBlur={(e) => { e.target.style.borderColor = '#e2e8f0'; e.target.style.boxShadow = 'none'; }}
                                />
                            </div>
                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
                                <div>
                                    <label style={labelStyle}>CPF / CNPJ *</label>
                                    <input
                                        style={inputStyle}
                                        type="text"
                                        required
                                        placeholder="000.000.000-00"
                                        value={form.document}
                                        onChange={set('document')}
                                        onFocus={(e) => { e.target.style.borderColor = '#6c5be4'; e.target.style.boxShadow = '0 0 0 3px rgba(108,91,228,.1)'; }}
                                        onBlur={(e) => { e.target.style.borderColor = '#e2e8f0'; e.target.style.boxShadow = 'none'; }}
                                    />
                                </div>
                                <div>
                                    <label style={labelStyle}>Celular *</label>
                                    <input
                                        style={inputStyle}
                                        type="text"
                                        required
                                        placeholder="(XX) XXXXX-XXXX"
                                        value={form.phone}
                                        onChange={set('phone')}
                                        onFocus={(e) => { e.target.style.borderColor = '#6c5be4'; e.target.style.boxShadow = '0 0 0 3px rgba(108,91,228,.1)'; }}
                                        onBlur={(e) => { e.target.style.borderColor = '#e2e8f0'; e.target.style.boxShadow = 'none'; }}
                                    />
                                </div>
                            </div>
                        </div>

                        {/* ── Dados do Gestor ── */}
                        <p
                            style={{
                                fontSize: 11,
                                fontWeight: 700,
                                letterSpacing: '0.08em',
                                textTransform: 'uppercase',
                                color: '#6c5be4',
                                marginBottom: 14,
                                paddingTop: 20,
                                borderTop: '1px solid #f1f5f9',
                            }}
                        >
                            Dados do Gestor Principal
                        </p>

                        <div style={{ display: 'flex', flexDirection: 'column', gap: 14, marginBottom: 24 }}>
                            <div>
                                <label style={labelStyle}>Seu nome completo *</label>
                                <input
                                    style={inputStyle}
                                    type="text"
                                    required
                                    placeholder="João da Silva"
                                    value={form.admin_name}
                                    onChange={set('admin_name')}
                                    onFocus={(e) => { e.target.style.borderColor = '#6c5be4'; e.target.style.boxShadow = '0 0 0 3px rgba(108,91,228,.1)'; }}
                                    onBlur={(e) => { e.target.style.borderColor = '#e2e8f0'; e.target.style.boxShadow = 'none'; }}
                                />
                            </div>
                            <div>
                                <label style={labelStyle}>E-mail de acesso *</label>
                                <input
                                    style={inputStyle}
                                    type="email"
                                    required
                                    placeholder="gestor@clinica.com"
                                    value={form.admin_email}
                                    onChange={set('admin_email')}
                                    onFocus={(e) => { e.target.style.borderColor = '#6c5be4'; e.target.style.boxShadow = '0 0 0 3px rgba(108,91,228,.1)'; }}
                                    onBlur={(e) => { e.target.style.borderColor = '#e2e8f0'; e.target.style.boxShadow = 'none'; }}
                                />
                            </div>
                            <div>
                                <label style={labelStyle}>Senha *</label>
                                <input
                                    style={inputStyle}
                                    type="password"
                                    required
                                    minLength={6}
                                    placeholder="Mínimo 6 caracteres"
                                    value={form.admin_password}
                                    onChange={set('admin_password')}
                                    onFocus={(e) => { e.target.style.borderColor = '#6c5be4'; e.target.style.boxShadow = '0 0 0 3px rgba(108,91,228,.1)'; }}
                                    onBlur={(e) => { e.target.style.borderColor = '#e2e8f0'; e.target.style.boxShadow = 'none'; }}
                                />
                            </div>
                        </div>

                        {/* ── Escolha do Plano ── */}
                        <p
                            style={{
                                fontSize: 11,
                                fontWeight: 700,
                                letterSpacing: '0.08em',
                                textTransform: 'uppercase',
                                color: '#6c5be4',
                                marginBottom: 14,
                                paddingTop: 20,
                                borderTop: '1px solid #f1f5f9',
                            }}
                        >
                            Escolha seu plano
                        </p>

                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 28 }}>
                            {PLANS.map((plan) => {
                                const selected = form.plan === plan.id;
                                return (
                                    <div
                                        key={plan.id}
                                        onClick={() => setForm((p) => ({ ...p, plan: plan.id }))}
                                        style={{
                                            position: 'relative',
                                            padding: '18px 16px',
                                            borderRadius: 14,
                                            border: `2px solid ${selected ? plan.color : '#e2e8f0'}`,
                                            background: selected ? plan.light : '#fff',
                                            cursor: 'pointer',
                                            transition: 'all .2s',
                                            boxShadow: selected ? `0 4px 20px ${plan.color}25` : 'none',
                                        }}
                                    >
                                        {/* Badge "Mais completo" */}
                                        {plan.badge && (
                                            <div style={{
                                                position: 'absolute',
                                                top: -10,
                                                left: '50%',
                                                transform: 'translateX(-50%)',
                                                background: plan.color,
                                                color: '#fff',
                                                fontSize: 10,
                                                fontWeight: 700,
                                                borderRadius: 99,
                                                padding: '3px 10px',
                                                whiteSpace: 'nowrap',
                                                letterSpacing: '0.05em',
                                                textTransform: 'uppercase',
                                            }}>
                                                {plan.badge}
                                            </div>
                                        )}

                                        {/* Check icon */}
                                        <div style={{
                                            position: 'absolute',
                                            top: 12,
                                            right: 12,
                                            width: 20,
                                            height: 20,
                                            borderRadius: '50%',
                                            background: selected ? plan.color : '#f1f5f9',
                                            border: `2px solid ${selected ? plan.color : '#e2e8f0'}`,
                                            display: 'flex',
                                            alignItems: 'center',
                                            justifyContent: 'center',
                                            transition: 'all .2s',
                                        }}>
                                            {selected && (
                                                <svg width="10" height="8" viewBox="0 0 10 8" fill="none">
                                                    <path d="M1 4L3.5 6.5L9 1" stroke="white" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/>
                                                </svg>
                                            )}
                                        </div>

                                        {/* Nome do plano */}
                                        <p style={{ fontSize: 13, fontWeight: 600, color: '#94a3b8', marginBottom: 2 }}>
                                            Plano
                                        </p>
                                        <p style={{ fontSize: 20, fontWeight: 800, color: plan.color, marginBottom: 4, lineHeight: 1 }}>
                                            {plan.name}
                                        </p>
                                        <p style={{ fontSize: 13, fontWeight: 700, color: '#1e293b', marginBottom: 12 }}>
                                            {plan.price}
                                        </p>

                                        {/* Features */}
                                        <div style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
                                            {plan.features.map((f) => (
                                                <div key={f} style={{ display: 'flex', alignItems: 'flex-start', gap: 6 }}>
                                                    <span style={{ color: plan.color, fontSize: 11, fontWeight: 700, flexShrink: 0, marginTop: 1 }}>✓</span>
                                                    <span style={{ fontSize: 11, color: '#64748b', lineHeight: 1.4 }}>{f}</span>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                );
                            })}
                        </div>

                        {/* Botão */}
                        <button
                            type="submit"
                            disabled={isLoading}
                            style={{
                                width: '100%',
                                padding: '14px',
                                background: isLoading
                                    ? '#a78bfa'
                                    : 'linear-gradient(130deg, #6c5be4, #5243b7)',
                                color: '#fff',
                                border: 'none',
                                borderRadius: 12,
                                fontSize: 15,
                                fontWeight: 700,
                                cursor: isLoading ? 'not-allowed' : 'pointer',
                                boxShadow: '0 4px 20px rgba(108,91,228,.35)',
                                transition: 'all .2s',
                            }}
                        >
                            {isLoading ? 'Aguarde...' : 'Continuar para pagamento →'}
                        </button>

                        <p style={{ textAlign: 'center', fontSize: 12, color: '#94a3b8', marginTop: 16 }}>
                            Já tem uma conta?{' '}
                            <a
                                href="/login"
                                style={{ color: '#6c5be4', fontWeight: 600, textDecoration: 'none' }}
                            >
                                Entrar
                            </a>
                        </p>
                    </form>
                </div>
            </div>
        </div>
    );
}
