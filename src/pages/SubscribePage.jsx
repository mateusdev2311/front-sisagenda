import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from '../api/axiosConfig';

// ─── Helpers de máscara ─────────────────────────────────────────────────────
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

const maskCard = (v) =>
    v.replace(/\D/g, '').slice(0, 16).replace(/(\d{4})(?=\d)/g, '$1 ');

const maskPostal = (v) =>
    v.replace(/\D/g, '').slice(0, 8).replace(/(\d{5})(\d)/, '$1-$2');

const maskPhone = (v) => {
    v = v.replace(/\D/g, '').slice(0, 11);
    if (v.length <= 10) return v.replace(/(\d{2})(\d{4})(\d{0,4})/, '($1) $2-$3');
    return v.replace(/(\d{2})(\d{5})(\d{0,4})/, '($1) $2-$3');
};

const PLAN_LABELS = { start: { name: 'Start', price: 'R$ 150,00/mês', color: '#059669' }, pro: { name: 'Pro', price: 'R$ 200,00/mês', color: '#6c5be4' } };

// ─── Componente ──────────────────────────────────────────────────────────────
export default function SubscribePage() {
    const navigate = useNavigate();

    const companyId = localStorage.getItem('pending_company_id');
    const plan = localStorage.getItem('pending_plan') || 'start';
    const planInfo = PLAN_LABELS[plan] || PLAN_LABELS.start;

    useEffect(() => {
        if (!companyId) navigate('/register');
    }, []);

    const [card, setCard] = useState({
        holderName: '',
        number: '',
        expiryMonth: '01',
        expiryYear: '2025',
        ccv: '',
    });

    const [holder, setHolder] = useState({
        name: '',
        email: '',
        cpfCnpj: '',
        postalCode: '',
        addressNumber: '',
        phone: '',
    });

    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState('');

    const setC = (field, transform) => (e) =>
        setCard((p) => ({ ...p, [field]: transform ? transform(e.target.value) : e.target.value }));
    const setH = (field, transform) => (e) =>
        setHolder((p) => ({ ...p, [field]: transform ? transform(e.target.value) : e.target.value }));

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError('');
        setIsLoading(true);

        try {
            const body = {
                plan,
                creditCard: {
                    holderName: card.holderName,
                    number: card.number.replace(/\s/g, ''),
                    expiryMonth: card.expiryMonth,
                    expiryYear: card.expiryYear,
                    ccv: card.ccv,
                },
                creditCardHolderInfo: {
                    name: holder.name,
                    email: holder.email,
                    cpfCnpj: holder.cpfCnpj.replace(/\D/g, ''),
                    postalCode: holder.postalCode.replace(/\D/g, ''),
                    addressNumber: holder.addressNumber,
                    phone: holder.phone.replace(/\D/g, ''),
                },
            };

            await axios.post(`/companies/${companyId}/subscribe`, body);

            // Limpa contexto de onboarding
            localStorage.removeItem('pending_company_id');
            localStorage.removeItem('pending_plan');
            localStorage.removeItem('pending_email');
            localStorage.removeItem('pending_password');

            navigate('/home');
        } catch (err) {
            const msg =
                err.response?.data?.message ||
                err.response?.data?.error ||
                'Erro ao processar assinatura. Verifique os dados do cartão.';
            setError(msg);
        } finally {
            setIsLoading(false);
        }
    };

    const inputStyle = {
        width: '100%',
        padding: '12px 14px',
        border: '1.5px solid #e2e8f0',
        borderRadius: 10,
        fontSize: 14,
        color: '#1e293b',
        background: '#fff',
        outline: 'none',
        boxSizing: 'border-box',
        transition: 'border-color .2s, box-shadow .2s',
    };
    const labelStyle = { display: 'block', fontSize: 13, fontWeight: 600, color: '#475569', marginBottom: 6 };
    const focus = (e) => { e.target.style.borderColor = '#6c5be4'; e.target.style.boxShadow = '0 0 0 3px rgba(108,91,228,.1)'; };
    const blur = (e) => { e.target.style.borderColor = '#e2e8f0'; e.target.style.boxShadow = 'none'; };

    const SectionTitle = ({ children }) => (
        <p style={{ fontSize: 11, fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase', color: '#6c5be4', marginBottom: 14 }}>
            {children}
        </p>
    );

    const years = Array.from({ length: 12 }, (_, i) => String(new Date().getFullYear() + i));
    const months = Array.from({ length: 12 }, (_, i) => String(i + 1).padStart(2, '0'));

    return (
        <div style={{
            minHeight: '100vh',
            background: 'linear-gradient(160deg, #fafbff 0%, #f0f4ff 100%)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '40px 20px',
            fontFamily: "'Inter', -apple-system, BlinkMacSystemFont, sans-serif",
        }}>
            <div style={{ width: '100%', maxWidth: 560 }}>
                {/* Logo */}
                <div style={{ textAlign: 'center', marginBottom: 28 }}>
                    <img src="/logo_sisagenda-removebg-preview.png" alt="Sisagenda"
                        style={{ height: 90, objectFit: 'contain', margin: '0 auto 8px', display: 'block' }} />
                    <p style={{ fontSize: 14, color: '#64748b', marginTop: 4 }}>
                        Finalize sua assinatura com segurança
                    </p>
                </div>

                {/* Banner do plano */}
                <div style={{
                    display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                    background: '#fff', border: `1.5px solid ${planInfo.color}40`,
                    borderRadius: 14, padding: '14px 20px', marginBottom: 20,
                    boxShadow: `0 4px 16px ${planInfo.color}15`,
                }}>
                    <div>
                        <p style={{ fontSize: 12, color: '#64748b', marginBottom: 2 }}>Plano selecionado</p>
                        <p style={{ fontSize: 17, fontWeight: 800, color: planInfo.color }}>
                            {planInfo.name} — {planInfo.price}
                        </p>
                    </div>
                    <div style={{ fontSize: 28 }}>🎯</div>
                </div>

                {/* Card principal */}
                <div style={{ background: '#fff', borderRadius: 20, boxShadow: '0 8px 40px rgba(108,91,228,.12)', border: '1px solid #e8eaf0', overflow: 'hidden' }}>
                    {/* Header */}
                    <div style={{ background: 'linear-gradient(130deg, #6c5be4, #5243b7)', padding: '20px 28px' }}>
                        <h1 style={{ fontSize: 17, fontWeight: 800, color: '#fff', margin: 0 }}>Dados de Pagamento</h1>
                        <p style={{ fontSize: 13, color: 'rgba(255,255,255,.75)', margin: '4px 0 0' }}>
                            🔒 Pagamento seguro via Asaas
                        </p>
                    </div>

                    <form onSubmit={handleSubmit} style={{ padding: '28px' }}>
                        {error && (
                            <div style={{
                                background: '#fef2f2', border: '1px solid #fecaca',
                                borderRadius: 10, padding: '12px 14px', fontSize: 13,
                                color: '#dc2626', marginBottom: 20,
                            }}>
                                ⚠️ {error}
                            </div>
                        )}

                        {/* ── Dados do Cartão ── */}
                        <SectionTitle>Dados do Cartão</SectionTitle>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 14, marginBottom: 28 }}>
                            <div>
                                <label style={labelStyle}>Nome impresso no cartão *</label>
                                <input style={inputStyle} type="text" required placeholder="JOAO DA SILVA"
                                    value={card.holderName} onChange={setC('holderName')}
                                    onFocus={focus} onBlur={blur} />
                            </div>
                            <div>
                                <label style={labelStyle}>Número do cartão *</label>
                                <input style={inputStyle} type="text" required placeholder="0000 0000 0000 0000"
                                    value={card.number} onChange={setC('number', maskCard)}
                                    onFocus={focus} onBlur={blur} />
                            </div>
                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 12 }}>
                                <div>
                                    <label style={labelStyle}>Mês *</label>
                                    <select style={inputStyle} value={card.expiryMonth}
                                        onChange={setC('expiryMonth')} onFocus={focus} onBlur={blur}>
                                        {months.map(m => <option key={m} value={m}>{m}</option>)}
                                    </select>
                                </div>
                                <div>
                                    <label style={labelStyle}>Ano *</label>
                                    <select style={inputStyle} value={card.expiryYear}
                                        onChange={setC('expiryYear')} onFocus={focus} onBlur={blur}>
                                        {years.map(y => <option key={y} value={y}>{y}</option>)}
                                    </select>
                                </div>
                                <div>
                                    <label style={labelStyle}>CVV *</label>
                                    <input style={inputStyle} type="text" required placeholder="123" maxLength={4}
                                        value={card.ccv} onChange={setC('ccv', v => v.replace(/\D/g, '').slice(0, 4))}
                                        onFocus={focus} onBlur={blur} />
                                </div>
                            </div>
                        </div>

                        {/* ── Dados do Titular ── */}
                        <SectionTitle>Dados do Titular do Cartão</SectionTitle>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 14, marginBottom: 28, paddingTop: 4 }}>
                            <div>
                                <label style={labelStyle}>Nome completo *</label>
                                <input style={inputStyle} type="text" required placeholder="João da Silva"
                                    value={holder.name} onChange={setH('name')} onFocus={focus} onBlur={blur} />
                            </div>
                            <div>
                                <label style={labelStyle}>E-mail *</label>
                                <input style={inputStyle} type="email" required placeholder="joao@email.com"
                                    value={holder.email} onChange={setH('email')} onFocus={focus} onBlur={blur} />
                            </div>
                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                                <div>
                                    <label style={labelStyle}>CPF / CNPJ *</label>
                                    <input style={inputStyle} type="text" required placeholder="000.000.000-00"
                                        value={holder.cpfCnpj} onChange={setH('cpfCnpj', maskDoc)}
                                        onFocus={focus} onBlur={blur} />
                                </div>
                                <div>
                                    <label style={labelStyle}>Telefone *</label>
                                    <input style={inputStyle} type="text" required placeholder="(XX) XXXXX-XXXX"
                                        value={holder.phone} onChange={setH('phone', maskPhone)}
                                        onFocus={focus} onBlur={blur} />
                                </div>
                            </div>
                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                                <div>
                                    <label style={labelStyle}>CEP *</label>
                                    <input style={inputStyle} type="text" required placeholder="00000-000"
                                        value={holder.postalCode} onChange={setH('postalCode', maskPostal)}
                                        onFocus={focus} onBlur={blur} />
                                </div>
                                <div>
                                    <label style={labelStyle}>Número do endereço *</label>
                                    <input style={inputStyle} type="text" required placeholder="123"
                                        value={holder.addressNumber} onChange={setH('addressNumber')}
                                        onFocus={focus} onBlur={blur} />
                                </div>
                            </div>
                        </div>

                        {/* Segurança */}
                        <div style={{
                            display: 'flex', alignItems: 'center', gap: 10,
                            background: '#f0fdf4', border: '1px solid #bbf7d0',
                            borderRadius: 10, padding: '10px 14px', marginBottom: 20,
                        }}>
                            <span style={{ fontSize: 18 }}>🔒</span>
                            <p style={{ fontSize: 12, color: '#166534' }}>
                                Seus dados são protegidos. A cobrança será processada via Asaas com criptografia ponta a ponta.
                            </p>
                        </div>

                        {/* Botão */}
                        <button
                            type="submit"
                            disabled={isLoading}
                            style={{
                                width: '100%', padding: '14px',
                                background: isLoading ? '#a78bfa' : 'linear-gradient(130deg, #6c5be4, #5243b7)',
                                color: '#fff', border: 'none', borderRadius: 12,
                                fontSize: 15, fontWeight: 700,
                                cursor: isLoading ? 'not-allowed' : 'pointer',
                                boxShadow: '0 4px 20px rgba(108,91,228,.35)',
                                transition: 'all .2s',
                            }}
                        >
                            {isLoading ? 'Processando pagamento...' : `Confirmar Assinatura ${planInfo.name} →`}
                        </button>

                        <p style={{ textAlign: 'center', fontSize: 12, color: '#94a3b8', marginTop: 14 }}>
                            Ao confirmar, você aceita a cobrança recorrente mensal. Cancele quando quiser.
                        </p>
                    </form>
                </div>
            </div>
        </div>
    );
}
