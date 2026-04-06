import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';

// ─── Config ──────────────────────────────────────────────────────────────────

const WA_NUMBER = '5538999748911';
const waLink = (plan) =>
    `https://wa.me/${WA_NUMBER}?text=${encodeURIComponent(plan ? `Oi, vim do site e estou interessado no plano ${plan}` : 'Oi, vim do site e gostaria de saber mais sobre o Sisagenda')}`;

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
    { icon: '📅', title: 'Agenda Centralizada', desc: 'Visualize todos os agendamentos da equipe em um único painel. Filtros por profissional e sem conflitos de horário.', accent: '#6c5be4' },
    { icon: '📋', title: 'Prontuário Eletrônico', desc: 'Histórico clínico completo com evolução, prescrições e exames organizados por consulta.', accent: '#0284c7' },
    { icon: '💬', title: 'Lembretes Automáticos', desc: 'Confirmação de consulta via WhatsApp enviada automaticamente, reduzindo faltas sem ação manual.', accent: '#059669' },
    { icon: '🧠', title: 'IA para Prontuários', desc: 'Grave o áudio da consulta e o sistema transcreve e estrutura o prontuário automaticamente.', accent: '#7c3aed' },
    { icon: '💰', title: 'Controle Financeiro', desc: 'Receitas, recebíveis e inadimplência em tempo real. Relatórios claros para a gestão da clínica.', accent: '#d97706' },
    { icon: '👥', title: 'Gestão de Equipe', desc: 'Profissionais com especialidades, horários individuais e identificação por cor na agenda.', accent: '#dc2626' },
];

const PLANS = [
    {
        name: 'Start', subtitle: 'Mais contratado', color: '#059669', borderColor: '#6ee7b7', bgAccent: '#ecfdf5',
        features: ['Até 5 profissionais', 'Agendamentos ilimitados', 'Prontuário clínico', 'Dashboard com histórico', 'WhatsApp próprio da clínica', 'Lembretes automáticos', 'Suporte prioritário'],
        locked: ['IA para Prontuários', 'Integração Kentro'],
        cta: 'Falar sobre o plano Start', highlight: false,
    },
    {
        name: 'Pro', subtitle: 'Solução completa', color: '#6c5be4', borderColor: '#a78bfa', bgAccent: '#f5f3ff',
        features: ['Profissionais ilimitados', 'Agendamentos ilimitados', 'Prontuário clínico', 'Dashboard avançado e relatórios', 'WhatsApp próprio da clínica', 'Lembretes automáticos', 'IA para prontuários (GPT-4o)', 'Integração Kentro (API Oficial)', 'Suporte via WhatsApp'],
        locked: [],
        cta: 'Falar sobre o plano Pro', highlight: true,
    },
];

// ─── Component ────────────────────────────────────────────────────────────────

export default function LandingPage() {
    const navigate = useNavigate();
    const videoRef = useRef(null);
    const [isVideoPlaying, setIsVideoPlaying] = useState(false);
    const [scrolled, setScrolled] = useState(false);
    const [activeSlide, setActiveSlide] = useState(0);
    const [menuOpen, setMenuOpen] = useState(false);
    const [isMobile, setIsMobile] = useState(window.innerWidth < 768);

    useEffect(() => {
        const onResize = () => setIsMobile(window.innerWidth < 768);
        const onScroll = () => setScrolled(window.scrollY > 24);
        window.addEventListener('resize', onResize);
        window.addEventListener('scroll', onScroll);
        return () => { window.removeEventListener('resize', onResize); window.removeEventListener('scroll', onScroll); };
    }, []);

    useEffect(() => {
        const t = setInterval(() => setActiveSlide(p => (p + 1) % IMAGES.length), 4000);
        return () => clearInterval(t);
    }, []);

    const scrollTo = (id) => { document.getElementById(id)?.scrollIntoView({ behavior: 'smooth' }); setMenuOpen(false); };

    const toggleVideo = () => {
        if (!videoRef.current) return;
        isVideoPlaying ? videoRef.current.pause() : videoRef.current.play();
        setIsVideoPlaying(v => !v);
    };

    const px = isMobile ? '20px' : '32px';

    return (
        <div style={{ fontFamily: "'Inter', -apple-system, BlinkMacSystemFont, sans-serif", background: '#ffffff', color: '#1e293b', overflowX: 'hidden' }}>

            {/* ── Navbar ─────────────────────────────────────────── */}
            <header style={{
                position: 'fixed', top: 0, left: 0, right: 0, zIndex: 100,
                background: scrolled ? 'rgba(255,255,255,0.97)' : 'rgba(255,255,255,0.9)',
                backdropFilter: 'blur(12px)',
                borderBottom: '1px solid ' + (scrolled ? '#e2e8f0' : 'transparent'),
                boxShadow: scrolled ? '0 1px 12px rgba(0,0,0,0.06)' : 'none',
                transition: 'all 0.25s ease',
            }}>
                <div style={{ maxWidth: 1200, margin: '0 auto', padding: `0 ${px}`, height: isMobile ? 64 : 72, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <img src="/logo_sisagenda-removebg-preview.png" alt="Sisagenda" style={{ height: isMobile ? 100 : 130, width: 'auto' }} />

                    {/* Desktop nav */}
                    {!isMobile && (
                        <nav style={{ display: 'flex', alignItems: 'center', gap: 36 }}>
                            {NAV_LINKS.map(l => (
                                <button key={l.id} onClick={() => scrollTo(l.id)}
                                    style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: 14, fontWeight: 500, color: '#475569', padding: 0, transition: 'color .2s' }}
                                    onMouseOver={e => e.target.style.color = '#6c5be4'}
                                    onMouseOut={e => e.target.style.color = '#475569'}
                                >{l.label}</button>
                            ))}
                        </nav>
                    )}

                    <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                        {!isMobile && (
                            <button onClick={() => navigate('/login')}
                                style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: 14, fontWeight: 500, color: '#475569', padding: '8px 16px' }}
                                onMouseOver={e => e.target.style.color = '#6c5be4'}
                                onMouseOut={e => e.target.style.color = '#475569'}
                            >Entrar</button>
                        )}
                        <a href="/register"
                            style={{ background: '#6c5be4', color: '#fff', borderRadius: 10, padding: isMobile ? '8px 14px' : '10px 22px', fontSize: isMobile ? 13 : 14, fontWeight: 600, textDecoration: 'none', whiteSpace: 'nowrap' }}
                        >{isMobile ? 'Criar conta' : 'Escolher meu plano'}</a>

                        {/* Mobile hamburger */}
                        {isMobile && (
                            <button onClick={() => setMenuOpen(o => !o)}
                                style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 4, display: 'flex', flexDirection: 'column', gap: 5 }}
                            >
                                {[0, 1, 2].map(i => (
                                    <span key={i} style={{ display: 'block', width: 24, height: 2, background: '#475569', borderRadius: 2,
                                        transform: menuOpen ? (i === 0 ? 'rotate(45deg) translateY(7px)' : i === 2 ? 'rotate(-45deg) translateY(-7px)' : 'scaleX(0)') : 'none',
                                        transition: 'all .25s',
                                        opacity: menuOpen && i === 1 ? 0 : 1,
                                    }} />
                                ))}
                            </button>
                        )}
                    </div>
                </div>

                {/* Mobile drawer */}
                {isMobile && menuOpen && (
                    <div style={{ background: 'white', borderTop: '1px solid #f1f5f9', padding: '16px 20px 20px' }}>
                        {NAV_LINKS.map(l => (
                            <button key={l.id} onClick={() => scrollTo(l.id)}
                                style={{ display: 'block', width: '100%', textAlign: 'left', background: 'none', border: 'none', cursor: 'pointer', fontSize: 15, fontWeight: 500, color: '#334155', padding: '12px 0', borderBottom: '1px solid #f1f5f9' }}
                            >{l.label}</button>
                        ))}
                        <button onClick={() => { navigate('/login'); setMenuOpen(false); }}
                            style={{ display: 'block', width: '100%', textAlign: 'left', background: 'none', border: 'none', cursor: 'pointer', fontSize: 15, fontWeight: 500, color: '#6c5be4', padding: '12px 0', marginTop: 4 }}
                        >Entrar no sistema →</button>
                    </div>
                )}
            </header>

            {/* ── Hero ───────────────────────────────────────────── */}
            <section style={{
                paddingTop: isMobile ? 120 : 140, paddingBottom: isMobile ? 56 : 80,
                paddingLeft: px, paddingRight: px,
                background: 'linear-gradient(175deg, #fafbff 0%, #ffffff 60%)',
            }}>
                <div style={{ maxWidth: 1100, margin: '0 auto' }}>
                    <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 24 }}>
                        <span style={{ background: '#f5f3ff', border: '1px solid #ddd6fe', color: '#6c5be4', borderRadius: 999, padding: '5px 16px', fontSize: 12, fontWeight: 600, letterSpacing: '0.06em', textTransform: 'uppercase' }}>
                            Sistema de Gestão Clínica
                        </span>
                    </div>

                    <h1 style={{ textAlign: 'center', fontSize: isMobile ? 36 : 56, fontWeight: 800, lineHeight: 1.15, letterSpacing: '-0.03em', marginBottom: 20, color: '#0f172a' }}>
                        Mais organização.{isMobile ? ' ' : <br />}
                        <span style={{ background: 'linear-gradient(130deg, #6c5be4, #059669)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
                            Menos trabalho manual.
                        </span>
                    </h1>

                    <p style={{ textAlign: 'center', fontSize: isMobile ? 15 : 18, color: '#64748b', maxWidth: 580, margin: '0 auto 36px', lineHeight: 1.7 }}>
                        Agenda online, prontuário eletrônico, lembretes via WhatsApp e controle financeiro — em uma única plataforma para clínicas.
                    </p>

                    <div style={{ display: 'flex', gap: 12, justifyContent: 'center', marginBottom: isMobile ? 48 : 64, flexWrap: 'wrap' }}>
                        <a href="/register"
                            style={{ background: '#6c5be4', color: '#fff', borderRadius: 12, padding: isMobile ? '13px 24px' : '14px 32px', fontSize: isMobile ? 14 : 15, fontWeight: 700, textDecoration: 'none', boxShadow: '0 4px 20px rgba(108,91,228,.35)', textAlign: 'center' }}
                        >🚀 Criar conta e escolher plano</a>
                        <button onClick={() => scrollTo('demo')}
                            style={{ background: 'white', color: '#475569', border: '1.5px solid #e2e8f0', borderRadius: 12, padding: isMobile ? '13px 20px' : '14px 28px', fontSize: isMobile ? 14 : 15, fontWeight: 600, cursor: 'pointer' }}
                        >Ver demonstração</button>
                    </div>

                    {/* Carousel */}
                    <div style={{ position: 'relative', maxWidth: 900, margin: '0 auto', userSelect: 'none' }}>
                        <div style={{ borderRadius: isMobile ? 14 : 20, overflow: 'hidden', position: 'relative', border: '1px solid #e2e8f0', boxShadow: '0 20px 60px rgba(108,91,228,.1)' }}>
                            {IMAGES.map((src, i) => (
                                <div key={i} style={{ position: i === 0 ? 'relative' : 'absolute', inset: 0, opacity: i === activeSlide ? 1 : 0, transition: 'opacity .7s ease', zIndex: i === activeSlide ? 1 : 0 }}>
                                    <img src={src} alt={`Sisagenda ${i + 1}`} style={{ width: '100%', height: isMobile ? 220 : 420, objectFit: 'cover', display: 'block' }} />
                                </div>
                            ))}
                            {[{ side: 'left', delta: -1 }, { side: 'right', delta: 1 }].map(({ side, delta }) => (
                                <button key={side} onClick={() => setActiveSlide(p => (p + delta + IMAGES.length) % IMAGES.length)}
                                    style={{ position: 'absolute', top: '50%', [side]: 12, transform: 'translateY(-50%)', zIndex: 10, background: 'rgba(255,255,255,0.88)', border: 'none', borderRadius: '50%', width: isMobile ? 32 : 40, height: isMobile ? 32 : 40, cursor: 'pointer', fontSize: isMobile ? 16 : 20, fontWeight: 700, color: '#334155', backdropFilter: 'blur(4px)', boxShadow: '0 2px 12px rgba(0,0,0,.12)' }}
                                >{delta === -1 ? '‹' : '›'}</button>
                            ))}
                        </div>
                        <div style={{ display: 'flex', justifyContent: 'center', gap: 8, marginTop: 14 }}>
                            {IMAGES.map((_, i) => (
                                <button key={i} onClick={() => setActiveSlide(i)}
                                    style={{ border: 'none', cursor: 'pointer', padding: 0, borderRadius: 99, height: 6, width: i === activeSlide ? 28 : 6, background: i === activeSlide ? '#6c5be4' : '#cbd5e1', transition: 'all .35s ease' }}
                                />
                            ))}
                        </div>
                    </div>
                </div>
            </section>

            {/* ── Strip ─────────────────────────────────────────── */}
            <div style={{ background: '#fafbff', borderTop: '1px solid #f1f5f9', borderBottom: '1px solid #f1f5f9', padding: `32px ${px}` }}>
                <div style={{ maxWidth: 900, margin: '0 auto', display: 'grid', gridTemplateColumns: isMobile ? '1fr' : 'repeat(3, 1fr)', gap: isMobile ? 20 : 24, textAlign: isMobile ? 'left' : 'center' }}>
                    {[
                        { label: 'Agendamentos ilimitados', desc: 'sem custo adicional por volume' },
                        { label: 'Setup em minutos', desc: 'sem necessidade de treinamento técnico' },
                        { label: 'Suporte incluído', desc: 'em todos os planos da plataforma' },
                    ].map(item => (
                        <div key={item.label} style={{ display: 'flex', alignItems: 'flex-start', gap: isMobile ? 12 : 0, flexDirection: isMobile ? 'row' : 'column' }}>
                            <span style={{ color: '#6c5be4', fontSize: 18, flexShrink: 0, marginTop: isMobile ? 2 : 0 }}>✓</span>
                            <div>
                                <p style={{ fontWeight: 700, fontSize: 15, color: '#1e293b', marginBottom: 3 }}>{item.label}</p>
                                <p style={{ fontSize: 13, color: '#94a3b8' }}>{item.desc}</p>
                            </div>
                        </div>
                    ))}
                </div>
            </div>

            {/* ── Features ──────────────────────────────────────── */}
            <section id="funcionalidades" style={{ padding: `${isMobile ? 60 : 96}px ${px}`, background: '#ffffff' }}>
                <div style={{ maxWidth: 1100, margin: '0 auto' }}>
                    <div style={{ maxWidth: 560, marginBottom: isMobile ? 36 : 56 }}>
                        <p style={{ fontSize: 12, fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', color: '#6c5be4', marginBottom: 10 }}>Funcionalidades</p>
                        <h2 style={{ fontSize: isMobile ? 28 : 38, fontWeight: 800, lineHeight: 1.2, letterSpacing: '-0.02em', color: '#0f172a', marginBottom: 14 }}>
                            Uma plataforma para toda a gestão da clínica
                        </h2>
                        <p style={{ fontSize: isMobile ? 14 : 16, color: '#64748b', lineHeight: 1.7 }}>
                            Do primeiro agendamento ao prontuário — o Sisagenda centraliza tudo que a sua equipe precisa no dia a dia.
                        </p>
                    </div>

                    <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : 'repeat(3, 1fr)', gap: 16 }}>
                        {FEATURES.map(f => (
                            <div key={f.title}
                                style={{ padding: '24px 20px', borderRadius: 16, border: '1px solid #f1f5f9', background: '#fafbff', display: 'flex', gap: 16, alignItems: 'flex-start' }}
                                onMouseOver={e => { e.currentTarget.style.borderColor = '#e0e7ff'; e.currentTarget.style.boxShadow = '0 6px 24px rgba(108,91,228,.1)'; }}
                                onMouseOut={e => { e.currentTarget.style.borderColor = '#f1f5f9'; e.currentTarget.style.boxShadow = 'none'; }}
                            >
                                <div style={{ width: 40, height: 40, borderRadius: 10, background: `${f.accent}12`, border: `1px solid ${f.accent}22`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 20, flexShrink: 0 }}>
                                    {f.icon}
                                </div>
                                <div>
                                    <h3 style={{ fontSize: 15, fontWeight: 700, color: '#0f172a', marginBottom: 6 }}>{f.title}</h3>
                                    <p style={{ fontSize: 13, color: '#64748b', lineHeight: 1.6 }}>{f.desc}</p>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            </section>

            {/* ── Demo ──────────────────────────────────────────── */}
            <section id="demo" style={{ padding: `${isMobile ? 56 : 80}px ${px}`, background: '#fafbff', borderTop: '1px solid #f1f5f9' }}>
                <div style={{ maxWidth: 900, margin: '0 auto' }}>
                    <p style={{ fontSize: 12, fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', color: '#059669', marginBottom: 10 }}>Demonstração</p>
                    <h2 style={{ fontSize: isMobile ? 26 : 36, fontWeight: 800, letterSpacing: '-0.02em', color: '#0f172a', marginBottom: 8 }}>
                        Veja como funciona na prática
                    </h2>
                    <p style={{ fontSize: isMobile ? 14 : 16, color: '#64748b', marginBottom: 32 }}>Um vídeo rápido mostrando os principais fluxos do sistema.</p>

                    <div style={{ borderRadius: isMobile ? 14 : 20, overflow: 'hidden', cursor: 'pointer', position: 'relative', border: '1px solid #e2e8f0', boxShadow: '0 16px 48px rgba(0,0,0,.08)' }} onClick={toggleVideo}>
                        <video ref={videoRef} src="/sisagenda.mp4" style={{ width: '100%', display: 'block' }} playsInline
                            onEnded={() => setIsVideoPlaying(false)}
                            onPlay={() => setIsVideoPlaying(true)}
                            onPause={() => setIsVideoPlaying(false)}
                        />
                        {!isVideoPlaying && (
                            <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(15,23,42,0.2)' }}>
                                <div style={{ width: isMobile ? 56 : 72, height: isMobile ? 56 : 72, borderRadius: '50%', background: '#6c5be4', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white', fontSize: isMobile ? 20 : 28, boxShadow: '0 8px 32px rgba(108,91,228,.5)' }}>▶</div>
                            </div>
                        )}
                    </div>
                </div>
            </section>

            {/* ── Plans ─────────────────────────────────────────── */}
            <section id="planos" style={{ padding: `${isMobile ? 60 : 96}px ${px}`, background: '#ffffff' }}>
                <div style={{ maxWidth: 1100, margin: '0 auto' }}>
                    <div style={{ textAlign: 'center', marginBottom: isMobile ? 36 : 56 }}>
                        <p style={{ fontSize: 12, fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', color: '#6c5be4', marginBottom: 10 }}>Planos</p>
                        <h2 style={{ fontSize: isMobile ? 28 : 38, fontWeight: 800, letterSpacing: '-0.02em', color: '#0f172a', marginBottom: 10 }}>Simples e sem surpresas</h2>
                        <p style={{ fontSize: isMobile ? 14 : 16, color: '#64748b' }}>Fale com nossa equipe e escolha o plano ideal para o tamanho da sua clínica.</p>
                    </div>

                    <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : 'repeat(2, 1fr)', gap: isMobile ? 16 : 20, maxWidth: isMobile ? '100%' : 760, margin: '0 auto' }}>
                        {PLANS.map(plan => (
                            <div key={plan.name}
                                style={{ borderRadius: 20, overflow: 'hidden', border: plan.highlight ? `2px solid ${plan.color}` : '1.5px solid #e2e8f0', boxShadow: plan.highlight ? '0 16px 48px rgba(108,91,228,.18)' : '0 2px 12px rgba(0,0,0,.05)', background: 'white', position: 'relative' }}
                            >
                                <div style={{ height: 4, background: plan.color }} />
                                {plan.highlight && (
                                    <div style={{ position: 'absolute', top: 20, right: 16, background: plan.color, color: 'white', borderRadius: 99, padding: '3px 12px', fontSize: 11, fontWeight: 700 }}>COMPLETO</div>
                                )}
                                <div style={{ padding: '24px 24px 28px' }}>
                                    <p style={{ fontSize: 11, fontWeight: 600, color: plan.color, textTransform: 'uppercase', letterSpacing: '0.07em', marginBottom: 4 }}>{plan.subtitle}</p>
                                    <h3 style={{ fontSize: 22, fontWeight: 800, color: '#0f172a', marginBottom: 24, letterSpacing: '-0.02em' }}>Plano {plan.name}</h3>
                                    <div style={{ marginBottom: 24 }}>
                                        {plan.features.map(f => (
                                            <div key={f} style={{ display: 'flex', gap: 10, marginBottom: 9, alignItems: 'flex-start' }}>
                                                <span style={{ color: plan.color, fontWeight: 700, fontSize: 13, flexShrink: 0, marginTop: 1 }}>✓</span>
                                                <span style={{ fontSize: 13, color: '#374151', lineHeight: 1.5 }}>{f}</span>
                                            </div>
                                        ))}
                                        {plan.locked.map(f => (
                                            <div key={f} style={{ display: 'flex', gap: 10, marginBottom: 9, opacity: 0.35, alignItems: 'flex-start' }}>
                                                <span style={{ color: '#94a3b8', fontSize: 13, flexShrink: 0, marginTop: 1 }}>✕</span>
                                                <span style={{ fontSize: 13, color: '#94a3b8', textDecoration: 'line-through', lineHeight: 1.5 }}>{f}</span>
                                            </div>
                                        ))}
                                    </div>
                                    <a href={waLink(plan.name)} target="_blank" rel="noopener noreferrer"
                                        style={{ display: 'block', textAlign: 'center', fontSize: 14, fontWeight: 700, borderRadius: 12, padding: '13px 0', textDecoration: 'none',
                                            ...(plan.highlight
                                                ? { background: plan.color, color: 'white', boxShadow: `0 4px 16px ${plan.color}40` }
                                                : { background: '#f8fafc', color: plan.color, border: `1.5px solid ${plan.borderColor}` })
                                        }}
                                    >{plan.cta} →</a>
                                </div>
                            </div>
                        ))}
                    </div>
                    <p style={{ textAlign: 'center', fontSize: 12, color: '#94a3b8', marginTop: 20 }}>
                        Ao clicar você será redirecionado para o nosso WhatsApp para falar com nossa equipe.
                    </p>
                </div>
            </section>

            {/* ── Final CTA ─────────────────────────────────────── */}
            <section style={{ padding: `${isMobile ? 48 : 80}px ${px}`, background: '#fafbff', borderTop: '1px solid #f1f5f9' }}>
                <div style={{ maxWidth: 720, margin: '0 auto', padding: isMobile ? '48px 28px' : '64px 48px', borderRadius: isMobile ? 20 : 24, textAlign: 'center', background: 'linear-gradient(145deg, #6c5be4, #5243b7)', boxShadow: '0 24px 64px rgba(108,91,228,.35)' }}>
                    <img src="/logo_sisagenda-removebg-preview.png" alt="Sisagenda" style={{ height: isMobile ? 90 : 130, margin: '0 auto 24px', display: 'block', filter: 'brightness(0) invert(1)', opacity: 0.95 }} />
                    <h2 style={{ fontSize: isMobile ? 24 : 32, fontWeight: 800, color: 'white', marginBottom: 12, letterSpacing: '-0.02em' }}>
                        Pronto para organizar sua clínica?
                    </h2>
                    <p style={{ fontSize: isMobile ? 14 : 16, color: 'rgba(255,255,255,0.75)', marginBottom: 32, lineHeight: 1.6 }}>
                        Escolha seu plano e comece a usar agora mesmo. Configure em minutos, sem treinamento.
                    </p>
                    <a href="/register"
                        style={{ display: 'inline-flex', alignItems: 'center', gap: 10, background: 'white', color: '#6c5be4', borderRadius: 12, padding: isMobile ? '13px 24px' : '14px 32px', fontSize: isMobile ? 14 : 15, fontWeight: 700, textDecoration: 'none', boxShadow: '0 4px 20px rgba(0,0,0,.15)' }}
                    >
                        <span>🚀</span> Criar minha conta agora
                    </a>
                </div>
            </section>

            {/* ── Footer ────────────────────────────────────────── */}
            <footer style={{ borderTop: '1px solid #e2e8f0', background: '#ffffff', padding: `${isMobile ? 36 : 40}px ${px}` }}>
                <div style={{ maxWidth: 1100, margin: '0 auto' }}>
                    <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr 1fr' : 'repeat(4, 1fr)', gap: isMobile ? 28 : 32, marginBottom: 32 }}>
                        {/* Brand */}
                        <div style={{ gridColumn: isMobile ? '1 / -1' : 'auto' }}>
                            <img src="/logo_sisagenda-removebg-preview.png" alt="Sisagenda" style={{ height: isMobile ? 90 : 130, marginBottom: 12 }} />
                            <p style={{ fontSize: 13, color: '#94a3b8', maxWidth: 220, lineHeight: 1.6 }}>
                                Plataforma de gestão para clínicas médicas.
                            </p>
                        </div>
                        {/* Nav links */}
                        <div>
                            <p style={{ fontSize: 11, fontWeight: 700, color: '#334155', letterSpacing: '0.07em', textTransform: 'uppercase', marginBottom: 14 }}>Navegação</p>
                            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                                {NAV_LINKS.map(l => (
                                    <button key={l.id} onClick={() => scrollTo(l.id)}
                                        style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: 13, color: '#64748b', textAlign: 'left', padding: 0 }}
                                    >{l.label}</button>
                                ))}
                            </div>
                        </div>
                        {/* System */}
                        <div>
                            <p style={{ fontSize: 11, fontWeight: 700, color: '#334155', letterSpacing: '0.07em', textTransform: 'uppercase', marginBottom: 14 }}>Sistema</p>
                            <button onClick={() => navigate('/login')}
                                style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: 13, color: '#64748b', padding: 0 }}
                            >Acessar o sistema</button>
                        </div>
                        {/* Contact */}
                        <div>
                            <p style={{ fontSize: 11, fontWeight: 700, color: '#334155', letterSpacing: '0.07em', textTransform: 'uppercase', marginBottom: 14 }}>Contato</p>
                            <a href={waLink(null)} target="_blank" rel="noopener noreferrer"
                                style={{ fontSize: 13, color: '#64748b', textDecoration: 'none' }}
                            >(38) 99974-8911</a>
                        </div>
                    </div>

                    {/* Bottom bar */}
                    <div style={{ borderTop: '1px solid #f1f5f9', paddingTop: 18, display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 8 }}>
                        <p style={{ fontSize: 12, color: '#94a3b8' }}>© {new Date().getFullYear()} Sisagenda. Todos os direitos reservados.</p>
                        <p style={{ fontSize: 12, color: '#94a3b8' }}>CNPJ 60.441.311/0001-18</p>
                    </div>
                </div>
            </footer>
        </div>
    );
}
