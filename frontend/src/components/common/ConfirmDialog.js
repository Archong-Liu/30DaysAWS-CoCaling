import React from 'react';
import './ConfirmDialog.css';

const ConfirmDialog = ({ isOpen, message, onConfirm, onCancel, confirmText = '確認', cancelText = '取消' }) => {
  if (!isOpen) return null;

  return (
    <div className="confirm-dialog-overlay">
      <div className="confirm-dialog">
        <div className="confirm-dialog-content">
          <p className="confirm-message">{message}</p>
          <div className="confirm-actions">
            <button 
              className="btn btn-secondary" 
              onClick={onCancel}
            >
              {cancelText}
            </button>
            <button 
              className="btn btn-danger" 
              onClick={onConfirm}
            >
              {confirmText}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ConfirmDialog;
