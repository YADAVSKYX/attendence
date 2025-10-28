import React, { useEffect, useState } from 'react';
import CheckIcon from './icons/CheckIcon';
import XIcon from './icons/XIcon';

interface NotificationToastProps {
  message: string;
  type: 'success' | 'error';
  onClose: () => void;
}

const NotificationToast: React.FC<NotificationToastProps> = ({ message, type, onClose }) => {
  const [isExiting, setIsExiting] = useState(false);
  const [isEntering, setIsEntering] = useState(false);

  useEffect(() => {
    // Animate in
    requestAnimationFrame(() => {
        setIsEntering(true);
    });

    const timer = setTimeout(() => {
      setIsExiting(true);
    }, 4000); // Start exit animation after 4 seconds

    return () => clearTimeout(timer);
  }, []);

  useEffect(() => {
    if (isExiting) {
      const timer = setTimeout(onClose, 300); // Unmount after animation
      return () => clearTimeout(timer);
    }
  }, [isExiting, onClose]);
  
  const handleClose = () => {
    setIsExiting(true);
  };

  const baseClasses = "flex items-center gap-3 w-full max-w-md p-4 text-white rounded-xl shadow-2xl transition-all duration-300 ease-in-out transform pointer-events-auto";
  const typeClasses = type === 'success'
    ? "bg-green-500 dark:bg-green-600"
    : "bg-red-500 dark:bg-red-600";
  
  const animationClasses = isEntering && !isExiting
    ? 'opacity-100 translate-y-0 sm:translate-x-0'
    : 'opacity-0 translate-y-2 sm:translate-y-0 sm:translate-x-4';

  const Icon = type === 'success' ? CheckIcon : XIcon;

  return (
    <div className={`${baseClasses} ${typeClasses} ${animationClasses}`}>
      <Icon className="h-6 w-6 flex-shrink-0" />
      <p className="font-semibold text-sm flex-grow">{message}</p>
      <button 
        onClick={handleClose} 
        className="p-1 rounded-full hover:bg-black/20 flex-shrink-0"
        aria-label="Close notification"
      >
        <XIcon className="h-4 w-4" />
      </button>
    </div>
  );
};

export default NotificationToast;
