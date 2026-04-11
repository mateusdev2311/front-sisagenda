import React from 'react';
import { FaExclamationTriangle, FaRedo } from 'react-icons/fa';

class GlobalErrorBoundary extends React.Component {
    constructor(props) {
        super(props);
        this.state = { hasError: false, error: null, errorInfo: null };
    }

    static getDerivedStateFromError(error) {
        // Atualiza o state para que a próxima renderização mostre a UI alternativa.
        return { hasError: true };
    }

    componentDidCatch(error, errorInfo) {
        // Você também pode registrar o erro em um serviço de relatórios de erros aqui, como o Sentry
        console.error("Global Error Boundary caught an error:", error, errorInfo);
        this.setState({ error, errorInfo });
    }

    render() {
        if (this.state.hasError) {
            // Você pode renderizar qualquer interface alternativa
            return (
                <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', background: '#f8fafc', padding: '20px', textAlign: 'center' }}>
                    <div style={{ background: 'white', padding: '40px', borderRadius: '16px', boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)', maxWidth: '500px', width: '100%' }}>
                        <FaExclamationTriangle style={{ fontSize: '48px', color: '#ef4444', margin: '0 auto 20px' }} />
                        <h1 style={{ fontSize: '24px', fontWeight: 'bold', color: '#1e293b', marginBottom: '10px' }}>Ops! Algo deu errado</h1>
                        <p style={{ color: '#64748b', marginBottom: '24px', fontSize: '15px', lineHeight: '1.5' }}>
                            Ocorreu um erro inesperado na interface do sistema. Nossos servidores já registraram o ocorrido.
                        </p>
                        
                        {process.env.NODE_ENV === 'development' && this.state.error && (
                            <div style={{ background: '#fef2f2', border: '1px solid #fecaca', padding: '12px', borderRadius: '8px', marginBottom: '24px', textAlign: 'left', overflow: 'auto', maxHeight: '150px' }}>
                                <p style={{ color: '#b91c1c', fontSize: '13px', fontFamily: 'monospace', margin: 0 }}>
                                    {this.state.error.toString()}
                                </p>
                            </div>
                        )}

                        <button 
                            onClick={() => window.location.href = '/'}
                            style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', background: '#6c5be4', color: 'white', border: 'none', padding: '10px 24px', borderRadius: '8px', cursor: 'pointer', fontSize: '14px', fontWeight: '600', transition: 'background 0.2s', boxShadow: '0 2px 4px rgba(108, 91, 228, 0.3)' }}
                            onMouseOver={(e) => e.target.style.background = '#5a4bd0'}
                            onMouseOut={(e) => e.target.style.background = '#6c5be4'}
                        >
                            <FaRedo /> Tentar novamente
                        </button>
                    </div>
                </div>
            );
        }

        return this.props.children; 
    }
}

export default GlobalErrorBoundary;
