import React from 'react';
import { FiX } from 'react-icons/fi';

export default function BaseModal({ 
    isOpen, 
    onClose, 
    title, 
    subtitle, 
    icon: Icon, 
    children, 
    footer,
    maxWidth = "max-w-md",
    showClose = true
}) {
    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[11000] flex items-center justify-center p-4 animate-in fade-in duration-300">
            <div className={`bg-white w-full ${maxWidth} rounded-[2.5rem] shadow-2xl overflow-hidden flex flex-col animate-in zoom-in-95 duration-300 relative`}>
                
            
                <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-indigo-500 to-purple-600 z-10"></div>

              
                {(title || Icon) && (
                    <div className="p-6 border-b border-gray-100 flex items-center justify-between bg-white relative">
                        <div className="flex items-center gap-4">
                            {Icon && (
                                <div className="w-12 h-12 rounded-2xl bg-indigo-50 flex items-center justify-center text-indigo-600 shadow-inner">
                                    <Icon size={24} />
                                </div>
                            )}
                            <div>
                                {title && <h3 className="text-xl font-black text-gray-900 leading-none">{title}</h3>}
                                {subtitle && <p className="text-[10px] text-gray-400 font-bold uppercase tracking-widest mt-1.5">{subtitle}</p>}
                            </div>
                        </div>
                        {showClose && (
                            <button 
                                onClick={onClose} 
                                className="p-3 bg-gray-50 hover:bg-gray-100 text-gray-400 rounded-2xl transition-all active:scale-95 border border-gray-100"
                            >
                                <FiX size={24} />
                            </button>
                        )}
                    </div>
                )}

               
                <div className="flex-1 overflow-hidden flex flex-col">
                    {children}
                </div>

               
                {footer && (
                    <div className="p-6 bg-gray-50 border-t border-gray-100">
                        {footer}
                    </div>
                )}
            </div>
        </div>
    );
}
