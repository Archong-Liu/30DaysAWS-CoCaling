import { useState, useCallback } from 'react';

export const useConfirm = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [message, setMessage] = useState('');
  const [onConfirm, setOnConfirm] = useState(() => {});
  const [onCancel, setOnCancel] = useState(() => {});

  const confirm = useCallback((message, onConfirmCallback, onCancelCallback) => {
    setMessage(message);
    setOnConfirm(() => () => {
      setIsOpen(false);
      onConfirmCallback();
    });
    setOnCancel(() => () => {
      setIsOpen(false);
      if (onCancelCallback) onCancelCallback();
    });
    setIsOpen(true);
  }, []);

  const close = useCallback(() => {
    setIsOpen(false);
  }, []);

  return {
    isOpen,
    message,
    onConfirm: onConfirm,
    onCancel: onCancel,
    confirm,
    close
  };
};
