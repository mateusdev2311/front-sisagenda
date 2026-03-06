import { useState, useEffect } from 'react';
import Modal from './Modal';

const ConfirmModal = ({ isOpen, onClose, onConfirm, title, message, confirmText = 'Confirmar', cancelText = 'Cancelar', type = 'primary' }) => {
    const [isSubmitting, setIsSubmitting] = useState(false);

    // Reseta o estado de carregamento toda vez que o modal abre
    useEffect(() => {
        if (isOpen) setIsSubmitting(false);
    }, [isOpen]);

    const handleConfirm = async () => {
        if (isSubmitting) return;
        setIsSubmitting(true);
        try {
            await onConfirm();
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <Modal isOpen={isOpen} onClose={isSubmitting ? undefined : onClose} title={title} size="small">
            <div className="p-2">
                <p className="text-slate-600 mb-6">{message}</p>
                <div className="flex justify-end gap-3 pt-4 border-t border-slate-100">
                    <button
                        type="button"
                        className="btn-secondary"
                        onClick={onClose}
                        disabled={isSubmitting}
                    >
                        {cancelText}
                    </button>
                    <button
                        type="button"
                        className={`btn-${type} flex items-center gap-2`}
                        onClick={handleConfirm}
                        disabled={isSubmitting}
                        style={{ margin: 0, opacity: isSubmitting ? 0.7 : 1, cursor: isSubmitting ? 'not-allowed' : 'pointer' }}
                    >
                        {isSubmitting && (
                            <svg className="animate-spin h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"></path>
                            </svg>
                        )}
                        {isSubmitting ? 'Processando...' : confirmText}
                    </button>
                </div>
            </div>
        </Modal>
    );
};

export default ConfirmModal;
