const Modal = ({ isOpen, onClose, title, children, footer, size = 'default' }) => {
    if (!isOpen) return null;

    return (
        <div className="modal-overlay active" onClick={(e) => {
            // Close modal if clicking on the overlay background
            if (e.target.className.includes('modal-overlay')) {
                onClose();
            }
        }}>
            <div className={`modal-content ${size === 'large' ? 'modal-lg' : size === 'small' ? 'modal-sm' : ''}`}>
                <div className="modal-header">
                    <h2>{title}</h2>
                    <span className="close-btn" onClick={onClose}>&times;</span>
                </div>
                <div className="modal-body">
                    {children}
                </div>
                {footer && (
                    <div className="modal-footer">
                        {footer}
                    </div>
                )}
            </div>
        </div>
    );
};

export default Modal;
