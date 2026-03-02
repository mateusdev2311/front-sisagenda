import Modal from './Modal';

const ConfirmModal = ({ isOpen, onClose, onConfirm, title, message, confirmText = 'Confirmar', cancelText = 'Cancelar', type = 'primary' }) => {
    return (
        <Modal isOpen={isOpen} onClose={onClose} title={title} size="small">
            <div className="p-2">
                <p className="text-slate-600 mb-6">{message}</p>
                <div className="flex justify-end gap-3 pt-4 border-t border-slate-100">
                    <button type="button" className="btn-secondary" onClick={onClose}>{cancelText}</button>
                    <button type="button" className={`btn-${type}`} onClick={onConfirm} style={{ margin: 0 }}>{confirmText}</button>
                </div>
            </div>
        </Modal>
    );
};

export default ConfirmModal;
