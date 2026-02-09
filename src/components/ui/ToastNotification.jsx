import React, { useState, useEffect, createContext, useContext, useCallback } from 'react';

const ToastContext = createContext(null);

export const ToastProvider = ({ children }) => {
    const [toasts, setToasts] = useState([]);

    const showToast = useCallback((message, type = 'info', duration = 4000) => {
        const id = Date.now();
        setToasts(prev => [...prev, { id, message, type, duration }]);

        if (duration !== Infinity) {
            setTimeout(() => {
                setToasts(prev => prev.filter(t => t.id !== id));
            }, duration);
        }
    }, []);

    const removeToast = (id) => {
        setToasts(prev => prev.filter(t => t.id !== id));
    };

    return (
        <ToastContext.Provider value={{ showToast }}>
            {children}
            <div className="fixed top-24 right-6 left-6 md:left-auto md:w-96 z-[100000] flex flex-col gap-3 pointer-events-none">
                {toasts.map(toast => (
                    <div
                        key={toast.id}
                        className={`
                            pointer-events-auto flex items-center gap-4 p-4 rounded-2xl shadow-[0_8px_30px_rgb(0,0,0,0.12)] border backdrop-blur-3xl overflow-hidden relative group
                            animate-in slide-in-from-top-4 fade-in duration-300
                            ${getBgClass(toast.type)}
                        `}
                        onClick={() => removeToast(toast.id)}
                    >

                        <div className="absolute bottom-0 left-0 h-1 bg-white/20 w-full animate-[progress_linear_forwards]" style={{ animationDuration: `${toast.duration}ms` }}></div>

                        <div className={`p-2.5 rounded-xl ${getIconBgClass(toast.type)} shadow-inner`}>
                            {getIcon(toast.type)}
                        </div>
                        <div className="flex-grow">
                            <p className={`text-[15px] font-black uppercase tracking-widest opacity-60 mb-0.5 ${getTextClass(toast.type)}`}>
                                {toast.type === 'error' ? 'Something went wrong' : toast.type === 'success' ? 'Operation Complete' : 'แจ้งเตือน'}
                            </p>
                            <p className="text-sm font-bold text-gray-800 pr-4 leading-tight">
                                {toast.message}
                            </p>
                        </div>
                        <button className="text-gray-400 hover:text-gray-600 transition-colors p-1 rounded-full hover:bg-black/5 active:scale-90">
                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
                            </svg>
                        </button>
                    </div>
                ))}
            </div>
        </ToastContext.Provider>
    );
};

export const useToast = () => {
    const context = useContext(ToastContext);
    if (!context) throw new Error('useToast must be used within a ToastProvider');
    return context;
};

const getBgClass = (type) => {
    switch (type) {
        case 'success': return 'bg-white/95 border-emerald-100 text-emerald-900';
        case 'error': return 'bg-white/95 border-red-100 text-red-900';
        case 'warning': return 'bg-white/95 border-orange-100 text-orange-900';
        default: return 'bg-white/95 border-blue-100 text-blue-900';
    }
};

const getIconBgClass = (type) => {
    switch (type) {
        case 'success': return 'bg-emerald-50 text-emerald-600';
        case 'error': return 'bg-red-50 text-red-600';
        case 'warning': return 'bg-orange-50 text-orange-600';
        default: return 'bg-blue-50 text-blue-600';
    }
};

const getTextClass = (type) => {
    switch (type) {
        case 'success': return 'text-emerald-700';
        case 'error': return 'text-red-700';
        case 'warning': return 'text-orange-700';
        default: return 'text-blue-700';
    }
};

const getIcon = (type) => {
    switch (type) {
        case 'success':
            return <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M5 13l4 4L19 7" /></svg>;
        case 'error':
            return <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M6 18L18 6M6 6l12 12" /></svg>;
        case 'warning':
            return <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" /></svg>;
        default:
            return <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>;
    }
};
