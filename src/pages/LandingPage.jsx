import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';

// ─── Config ──────────────────────────────────────────────────────────────────

const WA_NUMBER = '5538999748911';
const waLink = (plan) =>
    `https://wa.me/${WA_NUMBER}?text=${encodeURIComponent(`Oi, vim do site e estou interessado no plano ${plan}`)}`;

const IMAGES = [
    '/imagem1-sisagenda.jpeg',
    '/imagem2-sisagenda.jpeg',
    '/imagem3-sisagenda.jpeg',
];

// ─── Data ────────────────────────────────────────────────────────────────────

const NAV_LINKS = [
    { id: 'funcionalidades', label: 'Funcionalidades' },
    { id: 'demo', label: 'Demonstração' },
    { id: 'planos', label: 'Planos' },
];

const FEATURES = [
    {
        icon: '📅',
        title: 'Agenda Centralizada',
        desc: 'Visualize e gerencie todos os agendamentos da equipe em um único painel. Filtros por profissional e detecção de conflitos de horário.',
        accent: '#6c5be4',
    },
    {
        icon: '📋',
        title: 'Prontuário Eletrônico',
        desc: 'Registro completo do histórico clínico do paciente com evolução, prescrições e exames organizados por consulta.',
        accent: '#0284c7',
    },
    {
        icon: '💬',
        title: 'Lembretes Automáticos',
        desc: 'Envio automático de confirmação de consulta via WhatsApp, reduzindo faltas sem nenhuma ação manual da equipe.',
        accent: '#059669',
    },
    {
        icon: '🧠',
        title: 'IA para Prontuários',
        desc: 'Grave o áudio da consulta e o sistema transcreve e estrutura o prontuário automaticamente usando inteligência artificial.',
        accent: '#7c3aed',
    },
    {
        icon: '💰',
        title: 'Controle Financeiro',
        desc: 'Acompanhe receitas, recebíveis e inadimplência em tempo real. Relatórios claros para tomada de decisão.',
        accent: '#d97706',
    },
    {
        icon: '👥',
        title: 'Gestão de Equipe',
        desc: 'Cadastre profissionais com especialidades, horários de atendimento e identificação por cor na agenda.',
        accent: '#dc2626',
    },
];

const PLANS = [
    {
        name: 'Free',
        subtitle: 'Para começar',
        color: '#64748b',
        borderColor: '#e2e8f0',
        bgAccent: '#f8fafc',
        features: [
            '1 Profissional cadastrado',
            'Agendamentos ilimitados',
            'Prontuário clínico',
            'Visão geral do dia',
            'Suporte via e-mail',
        ],
        locked: ['Lembretes via WhatsApp', 'IA para Prontuários', 'Dashboard avançado'],
        cta: 'Falar sobre o plano Free',
        highlight: false,
    },
    {
        name: 'Start',
        subtitle: 'Mais contratado',
        color: '#059669',
        borderColor: '#6ee7b7',
        bgAccent: '#ecfdf5',
        features: [
            'Até 5 profissionais',
            'Agendamentos ilimitados',
            'Prontuário clínico',
            'Dashboard com histórico',
            'WhatsApp próprio da clínica',
            'Lembretes automáticos',
            'Suporte prioritário',
        ],
        locked: ['IA para Prontuários', 'Integração Kentro'],
        cta: 'Falar sobre o plano Start',
        highlight: false,
    },
    {
        name: 'Pro',
        subtitle: 'Solução completa',
        color: '#6c5be4',
        borderColor: '#a78bfa',
        bgAccent: '#f5f3ff',
        features: [
            'Profissionais ilimitados',
            'Agendamentos ilimitados',
            'Prontuário clínico',
            'Dashboard avançado e relatórios',
            'WhatsApp próprio da clínica',
            'Lembretes automáticos',
            'IA para prontuários (GPT-4o)',
            'Integração Kentro (API Oficial)',
            'Suporte via WhatsApp',
        ],
        locked: [],
        cta: 'Falar sobre o plano Pro',
        highlight: true,
    },
];

// ─── Component ────────────────────────────────────────────────────────────────

export default function LandingPage() {
    const navigate = useNavigate();
    const videoRef = useRef(null);
    const [isVideoPlaying, setIsVideoPlaying] = useState(false);
    const [scrolled, setScrolled] = useState(false);
    const [activeSlide, setActiveSlide] = useState(0);

    useEffect(() => {
        const onScroll = () => setScrolled(window.scrollY > 24);
        window.addEventListener('scroll', onScroll);
        return () => window.removeEventListener('scroll', onScroll);
    }, []);

    useEffect(() => {
        const t = setInterval(() => setActiveSlide(p => (p + 1) % IMAGES.length), 4000);
        return () => clearInterval(t);
    }, []);

    const scrollTo = (id) => document.getElementById(id)?.scrollIntoView({ behavior: 'smooth' });

    const toggleVideo = () => {
        if (!videoRef.current) return;
        isVideoPlaying ? videoRef.current.pause() : videoRef.current.play();
        setIsVideoPlaying(v => !v);
    };

    return (
        <div style={{ fontFamily: "'Inter', -apple-system, BlinkMacSystemFont, sans-serif", background: '#ffffff', color: '#1e293b' }}>

            {/* ── Navbar ─────────────────────────────────────────── */}
            <header style={{
                position: 'fixed', top: 0, left: 0, right: 0, zIndex: 100,
                background: scrolled ? 'rgba(255,255,255,0.97)' : 'rgba(255,255,255,0.9)',
                backdropFilter: 'blur(12px)',
                borderBottom: scrolled ? '1px solid #e2e8f0' : '1px solid transparent',
                boxShadow: scrolled ? '0 1px 12px rgba(0,0,0,0.06)' : 'none',
                transition: 'all 0.25s ease',
            }}>
                <div style={{ maxWidth: 1200, margin: '0 auto', padding: '0 32px', height: 72, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <img src="/logo_sisagenda-removebg-preview.png" alt="Sisagenda" style={{ height: 130, width: 'auto'}} />

                    <nav style={{ display: 'flex', alignItems: 'center', gap: 36 }}>
                        {NAV_LINKS.map(l => (
                            <button key={l.id} onClick={() => scrollTo(l.id)}
                                style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: 14, fontWeight: 500, color: '#475569', padding: 0, transition: 'color .2s' }}
                                onMouseOver={e => e.target.style.color = '#6c5be4'}
                                onMouseOut={e => e.target.style.color = '#475569'}
                            >{l.label}</button>
                        ))}
                    </nav>

                    <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                        <button onClick={() => navigate('/login')}
                            style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: 14, fontWeight: 500, color: '#475569', padding: '8px 16px' }}
                            onMouseOver={e => e.target.style.color = '#6c5be4'}
                            onMouseOut={e => e.target.style.color = '#475569'}
                        >Entrar</button>
                        <a href={waLink('Free')} target="_blank" rel="noopener noreferrer"
                            style={{ background: '#6c5be4', color: '#fff', borderRadius: 10, padding: '10px 22px', fontSize: 14, fontWeight: 600, textDecoration: 'none', transition: 'all .2s', boxShadow: '0 2px 8px rgba(108,91,228,.3)' }}
                            onMouseOver={e => { e.currentTarget.style.background = '#5243b7'; e.currentTarget.style.transform = 'translateY(-1px)'; }}
                            onMouseOut={e => { e.currentTarget.style.background = '#6c5be4'; e.currentTarget.style.transform = 'none'; }}
                        >Agendar demonstração</a>
                    </div>
                </div>
            </header>

            {/* ── Hero ───────────────────────────────────────────── */}
            <section style={{
                paddingTop: 140, paddingBottom: 80, paddingLeft: 32, paddingRight: 32,
                background: 'linear-gradient(175deg, #fafbff 0%, #ffffff 60%)',
            }}>
                <div style={{ maxWidth: 1100, margin: '0 auto' }}>

                    {/* Top label */}
                    <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 28 }}>
                        <span style={{ background: '#f5f3ff', border: '1px solid #ddd6fe', color: '#6c5be4', borderRadius: 999, padding: '5px 18px', fontSize: 12, fontWeight: 600, letterSpacing: '0.06em', textTransform: 'uppercase' }}>
                            Sistema de Gestão Clínica
                        </span>
                    </div>

                    {/* Headline */}
                    <h1 style={{ textAlign: 'center', fontSize: 56, fontWeight: 800, lineHeight: 1.15, letterSpacing: '-0.03em', marginBottom: 24, color: '#0f172a' }}>
                        Mais organização.
                        <br />
                        <span style={{ background: 'linear-gradient(130deg, #6c5be4, #059669)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
                            Menos trabalho manual.
                        </span>
                    </h1>

                    <p style={{ textAlign: 'center', fontSize: 18, color: '#64748b', maxWidth: 600, margin: '0 auto 40px', lineHeight: 1.7 }}>
                        Agenda online, prontuário eletrônico, lembretes via WhatsApp e controle financeiro — em uma única plataforma para clínicas.
                    </p>

                    {/* CTAs */}
                    <div style={{ display: 'flex', gap: 16, justifyContent: 'center', marginBottom: 72, flexWrap: 'wrap' }}>
                        <a href={waLink('Free')} target="_blank" rel="noopener noreferrer"
                            style={{ background: '#6c5be4', color: '#fff', borderRadius: 12, padding: '14px 32px', fontSize: 15, fontWeight: 700, textDecoration: 'none', boxShadow: '0 4px 20px rgba(108,91,228,.35)', transition: 'all .2s' }}
                            onMouseOver={e => { e.currentTarget.style.background = '#5243b7'; e.currentTarget.style.transform = 'translateY(-2px)'; }}
                            onMouseOut={e => { e.currentTarget.style.background = '#6c5be4'; e.currentTarget.style.transform = 'none'; }}
                        >Começar agora, gratuitamente</a>
                        <button onClick={() => scrollTo('demo')}
                            style={{ background: 'white', color: '#475569', border: '1.5px solid #e2e8f0', borderRadius: 12, padding: '14px 28px', fontSize: 15, fontWeight: 600, cursor: 'pointer', transition: 'all .2s' }}
                            onMouseOver={e => { e.currentTarget.style.borderColor = '#6c5be4'; e.currentTarget.style.color = '#6c5be4'; }}
                            onMouseOut={e => { e.currentTarget.style.borderColor = '#e2e8f0'; e.currentTarget.style.color = '#475569'; }}
                        >Ver demonstração</button>
                    </div>

                    {/* Carousel */}
                    <div style={{ position: 'relative', maxWidth: 900, margin: '0 auto', userSelect: 'none' }}>
                        <div style={{ borderRadius: 20, overflow: 'hidden', position: 'relative', border: '1px solid #e2e8f0', boxShadow: '0 24px 60px rgba(108,91,228,.1)' }}>
                            {IMAGES.map((src, i) => (
                                <div key={i} style={{ position: i === 0 ? 'relative' : 'absolute', inset: 0, opacity: i === activeSlide ? 1 : 0, transition: 'opacity .7s ease', zIndex: i === activeSlide ? 1 : 0 }}>
                                    <img src={src} alt={`Sisagenda ${i + 1}`} style={{ width: '100%', height: 420, objectFit: 'cover', display: 'block' }} />
                                </div>
                            ))}

                            {/* Arrow buttons */}
                            {[{ side: 'left', delta: -1 }, { side: 'right', delta: 1 }].map(({ side, delta }) => (
                                <button key={side} onClick={() => setActiveSlide(p => (p + delta + IMAGES.length) % IMAGES.length)}
                                    style={{ position: 'absolute', top: '50%', [side]: 16, transform: 'translateY(-50%)', zIndex: 10, background: 'rgba(255,255,255,0.88)', border: 'none', borderRadius: '50%', width: 40, height: 40, cursor: 'pointer', fontSize: 20, fontWeight: 700, color: '#334155', backdropFilter: 'blur(4px)', boxShadow: '0 2px 12px rgba(0,0,0,.12)', transition: 'all .2s' }}
                                    onMouseOver={e => e.currentTarget.style.background = 'white'}
                                    onMouseOut={e => e.currentTarget.style.background = 'rgba(255,255,255,0.88)'}
                                >{delta === -1 ? '‹' : '›'}</button>
                            ))}
                        </div>

                        {/* Dots */}
                        <div style={{ display: 'flex', justifyContent: 'center', gap: 8, marginTop: 16 }}>
                            {IMAGES.map((_, i) => (
                                <button key={i} onClick={() => setActiveSlide(i)}
                                    style={{ border: 'none', cursor: 'pointer', padding: 0, borderRadius: 99, height: 6, width: i === activeSlide ? 28 : 6, background: i === activeSlide ? '#6c5be4' : '#cbd5e1', transition: 'all .35s ease' }}
                                />
                            ))}
                        </div>
                    </div>
                </div>
            </section>

            {/* ── Divider Strip ─────────────────────────────────── */}
            <div style={{ background: '#fafbff', borderTop: '1px solid #f1f5f9', borderBottom: '1px solid #f1f5f9', padding: '36px 32px' }}>
                <div style={{ maxWidth: 900, margin: '0 auto', display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 24, textAlign: 'center' }}>
                    {[
                        { label: 'Agendamentos ilimitados', desc: 'sem custo adicional por volume' },
                        { label: 'Setup em minutos', desc: 'sem necessidade de treinamento técnico' },
                        { label: 'Suporte incluído', desc: 'em todos os planos da plataforma' },
                    ].map(item => (
                        <div key={item.label}>
                            <p style={{ fontWeight: 700, fontSize: 15, color: '#1e293b', marginBottom: 4 }}>{item.label}</p>
                            <p style={{ fontSize: 13, color: '#94a3b8' }}>{item.desc}</p>
                        </div>
                    ))}
                </div>
            </div>

            {/* ── Features ──────────────────────────────────────── */}
            <section id="funcionalidades" style={{ padding: '96px 32px', background: '#ffffff' }}>
                <div style={{ maxWidth: 1100, margin: '0 auto' }}>
                    <div style={{ maxWidth: 560, marginBottom: 56 }}>
                        <p style={{ fontSize: 12, fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', color: '#6c5be4', marginBottom: 12 }}>Funcionalidades</p>
                        <h2 style={{ fontSize: 38, fontWeight: 800, lineHeight: 1.2, letterSpacing: '-0.02em', color: '#0f172a', marginBottom: 16 }}>
                            Uma plataforma para toda a gestão da clínica
                        </h2>
                        <p style={{ fontSize: 16, color: '#64748b', lineHeight: 1.7 }}>
                            Do primeiro agendamento ao prontuário gerado por IA — o Sisagenda centraliza tudo que a sua equipe precisa no dia a dia.
                        </p>
                    </div>

                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 20 }}>
                        {FEATURES.map(f => (
                            <div key={f.title}
                                style={{ padding: '28px 24px', borderRadius: 16, border: '1px solid #f1f5f9', background: '#fafbff', transition: 'all .25s' }}
                                onMouseOver={e => { e.currentTarget.style.borderColor = '#e0e7ff'; e.currentTarget.style.boxShadow = '0 8px 28px rgba(108,91,228,.1)'; e.currentTarget.style.transform = 'translateY(-3px)'; }}
                                onMouseOut={e => { e.currentTarget.style.borderColor = '#f1f5f9'; e.currentTarget.style.boxShadow = 'none'; e.currentTarget.style.transform = 'none'; }}
                            >
                                <div style={{ width: 44, height: 44, borderRadius: 12, background: `${f.accent}12`, border: `1px solid ${f.accent}22`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 22, marginBottom: 16 }}>
                                    {f.icon}
                                </div>
                                <h3 style={{ fontSize: 16, fontWeight: 700, color: '#0f172a', marginBottom: 8 }}>{f.title}</h3>
                                <p style={{ fontSize: 14, color: '#64748b', lineHeight: 1.65 }}>{f.desc}</p>
                            </div>
                        ))}
                    </div>
                </div>
            </section>

            {/* ── Demo Video ────────────────────────────────────── */}
            <section id="demo" style={{ padding: '80px 32px', background: '#fafbff', borderTop: '1px solid #f1f5f9' }}>
                <div style={{ maxWidth: 900, margin: '0 auto' }}>
                    <p style={{ fontSize: 12, fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', color: '#059669', marginBottom: 12 }}>Demonstração</p>
                    <h2 style={{ fontSize: 36, fontWeight: 800, letterSpacing: '-0.02em', color: '#0f172a', marginBottom: 8 }}>
                        Veja como funciona na prática
                    </h2>
                    <p style={{ fontSize: 16, color: '#64748b', marginBottom: 40 }}>Um vídeo rápido mostrando os principais fluxos do sistema.</p>

                    <div style={{ borderRadius: 20, overflow: 'hidden', cursor: 'pointer', position: 'relative', border: '1px solid #e2e8f0', boxShadow: '0 20px 60px rgba(0,0,0,.08)' }} onClick={toggleVideo}>
                        <video ref={videoRef} src="/sisagenda.mp4" style={{ width: '100%', display: 'block' }} playsInline
                            onEnded={() => setIsVideoPlaying(false)}
                            onPlay={() => setIsVideoPlaying(true)}
                            onPause={() => setIsVideoPlaying(false)}
                        />
                        {!isVideoPlaying && (
                            <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(15,23,42,0.2)' }}>
                                <div style={{ width: 72, height: 72, borderRadius: '50%', background: '#6c5be4', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white', fontSize: 28, boxShadow: '0 8px 32px rgba(108,91,228,.5)' }}>▶</div>
                            </div>
                        )}
                    </div>
                </div>
            </section>

            {/* ── Plans ─────────────────────────────────────────── */}
            <section id="planos" style={{ padding: '96px 32px', background: '#ffffff' }}>
                <div style={{ maxWidth: 1100, margin: '0 auto' }}>
                    <div style={{ textAlign: 'center', marginBottom: 56 }}>
                        <p style={{ fontSize: 12, fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', color: '#6c5be4', marginBottom: 12 }}>Planos</p>
                        <h2 style={{ fontSize: 38, fontWeight: 800, letterSpacing: '-0.02em', color: '#0f172a', marginBottom: 12 }}>
                            Simples e sem surpresas
                        </h2>
                        <p style={{ fontSize: 16, color: '#64748b' }}>Fale com nossa equipe e escolha o plano ideal para o tamanho da sua clínica.</p>
                    </div>

                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 20, alignItems: 'start' }}>
                        {PLANS.map(plan => (
                            <div key={plan.name}
                                style={{
                                    borderRadius: 20, overflow: 'hidden', border: plan.highlight ? `2px solid ${plan.color}` : '1.5px solid #e2e8f0',
                                    boxShadow: plan.highlight ? '0 16px 48px rgba(108,91,228,.18)' : '0 2px 12px rgba(0,0,0,.05)',
                                    transition: 'transform .25s, box-shadow .25s', background: 'white', position: 'relative',
                                }}
                                onMouseOver={e => { e.currentTarget.style.transform = 'translateY(-6px)'; e.currentTarget.style.boxShadow = plan.highlight ? '0 24px 60px rgba(108,91,228,.24)' : '0 12px 32px rgba(0,0,0,.1)'; }}
                                onMouseOut={e => { e.currentTarget.style.transform = 'none'; e.currentTarget.style.boxShadow = plan.highlight ? '0 16px 48px rgba(108,91,228,.18)' : '0 2px 12px rgba(0,0,0,.05)'; }}
                            >
                                {/* Color top stripe */}
                                <div style={{ height: 4, background: plan.color }} />

                                {plan.highlight && (
                                    <div style={{ position: 'absolute', top: 20, right: 20, background: plan.color, color: 'white', borderRadius: 99, padding: '3px 12px', fontSize: 11, fontWeight: 700, letterSpacing: '0.04em' }}>COMPLETO</div>
                                )}

                                <div style={{ padding: '28px 28px 32px' }}>
                                    <p style={{ fontSize: 12, fontWeight: 600, color: plan.color, textTransform: 'uppercase', letterSpacing: '0.07em', marginBottom: 4 }}>{plan.subtitle}</p>
                                    <h3 style={{ fontSize: 26, fontWeight: 800, color: '#0f172a', marginBottom: 28, letterSpacing: '-0.02em' }}>Plano {plan.name}</h3>

                                    <div style={{ marginBottom: 28 }}>
                                        {plan.features.map(f => (
                                            <div key={f} style={{ display: 'flex', alignItems: 'flex-start', gap: 10, marginBottom: 10 }}>
                                                <span style={{ color: plan.color, fontWeight: 700, fontSize: 14, flexShrink: 0, marginTop: 1 }}>✓</span>
                                                <span style={{ fontSize: 14, color: '#374151', lineHeight: 1.5 }}>{f}</span>
                                            </div>
                                        ))}
                                        {plan.locked.map(f => (
                                            <div key={f} style={{ display: 'flex', alignItems: 'flex-start', gap: 10, marginBottom: 10, opacity: 0.38 }}>
                                                <span style={{ color: '#94a3b8', fontSize: 14, flexShrink: 0, marginTop: 1 }}>✕</span>
                                                <span style={{ fontSize: 14, color: '#94a3b8', textDecoration: 'line-through', lineHeight: 1.5 }}>{f}</span>
                                            </div>
                                        ))}
                                    </div>

                                    <a href={waLink(plan.name)} target="_blank" rel="noopener noreferrer"
                                        style={{
                                            display: 'block', textAlign: 'center', fontSize: 14, fontWeight: 700, borderRadius: 12, padding: '13px 0', textDecoration: 'none', transition: 'all .2s',
                                            ...(plan.highlight
                                                ? { background: plan.color, color: 'white', boxShadow: `0 4px 16px ${plan.color}40` }
                                                : { background: '#f8fafc', color: plan.color, border: `1.5px solid ${plan.borderColor}` })
                                        }}
                                        onMouseOver={e => { e.currentTarget.style.transform = 'translateY(-1px)'; e.currentTarget.style.opacity = '0.9'; }}
                                        onMouseOut={e => { e.currentTarget.style.transform = 'none'; e.currentTarget.style.opacity = '1'; }}
                                    >{plan.cta} →</a>
                                </div>
                            </div>
                        ))}
                    </div>

                    <p style={{ textAlign: 'center', fontSize: 13, color: '#94a3b8', marginTop: 24 }}>
                        Ao clicar você será redirecionado para o nosso WhatsApp para falar com nossa equipe.
                    </p>
                </div>
            </section>

            {/* ── Final CTA ─────────────────────────────────────── */}
            <section style={{ padding: '80px 32px', background: '#fafbff', borderTop: '1px solid #f1f5f9' }}>
                <div style={{
                    maxWidth: 720, margin: '0 auto', padding: '64px 48px', borderRadius: 24, textAlign: 'center',
                    background: 'linear-gradient(145deg, #6c5be4, #5243b7)',
                    boxShadow: '0 24px 64px rgba(108,91,228,.35)',
                }}>
                    <img src="/logo_sisagenda-removebg-preview.png" alt="Sisagenda" style={{ height: 130, margin: '0 auto 28px', display: 'block', filter: 'brightness(0) invert(1)', opacity: 0.95 }} />
                    <h2 style={{ fontSize: 32, fontWeight: 800, color: 'white', marginBottom: 12, letterSpacing: '-0.02em' }}>
                        Pronto para organizar sua clínica?
                    </h2>
                    <p style={{ fontSize: 16, color: 'rgba(255,255,255,0.75)', marginBottom: 36, lineHeight: 1.6 }}>
                        Entre em contato com nossa equipe agora mesmo e configure tudo em minutos.
                    </p>
                    <a href={waLink('Free')} target="_blank" rel="noopener noreferrer"
                        style={{ display: 'inline-flex', alignItems: 'center', gap: 10, background: 'white', color: '#6c5be4', borderRadius: 12, padding: '14px 32px', fontSize: 15, fontWeight: 700, textDecoration: 'none', boxShadow: '0 4px 20px rgba(0,0,0,.15)', transition: 'all .2s' }}
                        onMouseOver={e => { e.currentTarget.style.transform = 'translateY(-2px)'; e.currentTarget.style.boxShadow = '0 8px 28px rgba(0,0,0,.2)'; }}
                        onMouseOut={e => { e.currentTarget.style.transform = 'none'; e.currentTarget.style.boxShadow = '0 4px 20px rgba(0,0,0,.15)'; }}
                    >
                        <span>💬</span> Falar pelo WhatsApp
                    </a>
                </div>
            </section>

            {/* ── Footer ────────────────────────────────────────── */}
            <footer style={{ borderTop: '1px solid #e2e8f0', background: '#ffffff', padding: '40px 32px' }}>
                <div style={{ maxWidth: 1100, margin: '0 auto' }}>
                    {/* Top row */}
                    <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', flexWrap: 'wrap', gap: 32, marginBottom: 32 }}>
                        <div>
                            <img src="/logo_sisagenda-removebg-preview.png" alt="Sisagenda" style={{ height: 130, marginBottom: 12 }} />
                            <p style={{ fontSize: 13, color: '#94a3b8', maxWidth: 260, lineHeight: 1.6 }}>
                                Plataforma de gestão para clínicas médicas. Agenda, prontuário e muito mais.
                            </p>
                        </div>
                        <div>
                            <p style={{ fontSize: 12, fontWeight: 700, color: '#334155', letterSpacing: '0.06em', textTransform: 'uppercase', marginBottom: 12 }}>Navegação</p>
                            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                                {NAV_LINKS.map(l => (
                                    <button key={l.id} onClick={() => scrollTo(l.id)}
                                        style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: 13, color: '#64748b', textAlign: 'left', padding: 0 }}
                                        onMouseOver={e => e.target.style.color = '#6c5be4'}
                                        onMouseOut={e => e.target.style.color = '#64748b'}
                                    >{l.label}</button>
                                ))}
                            </div>
                        </div>
                        <div>
                            <p style={{ fontSize: 12, fontWeight: 700, color: '#334155', letterSpacing: '0.06em', textTransform: 'uppercase', marginBottom: 12 }}>Sistema</p>
                            <button onClick={() => navigate('/login')}
                                style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: 13, color: '#64748b', padding: 0 }}
                                onMouseOver={e => e.target.style.color = '#6c5be4'}
                                onMouseOut={e => e.target.style.color = '#64748b'}
                            >Acessar o sistema</button>
                        </div>
                        <div>
                            <p style={{ fontSize: 12, fontWeight: 700, color: '#334155', letterSpacing: '0.06em', textTransform: 'uppercase', marginBottom: 12 }}>Contato</p>
                            <a href={waLink('Free')} target="_blank" rel="noopener noreferrer"
                                style={{ fontSize: 13, color: '#64748b', textDecoration: 'none' }}
                                onMouseOver={e => e.target.style.color = '#6c5be4'}
                                onMouseOut={e => e.target.style.color = '#64748b'}
                            >WhatsApp (38) 99974-8911</a>
                        </div>
                    </div>

                    {/* Bottom bar */}
                    <div style={{ borderTop: '1px solid #f1f5f9', paddingTop: 20, display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 8 }}>
                        <p style={{ fontSize: 12, color: '#94a3b8' }}>
                            © {new Date().getFullYear()} Sisagenda. Todos os direitos reservados.
                        </p>
                        <p style={{ fontSize: 12, color: '#94a3b8' }}>
                            CNPJ 60.441.311/0001-18
                        </p>
                    </div>
                </div>
            </footer>
        </div>
    );
}
