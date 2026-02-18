import React from 'react';
import { FiAlertTriangle, FiTrash2, FiX } from 'react-icons/fi';

export default function ConfirmModal({ isOpen, onClose, onConfirm, title, message, confirmText = "ยืนยัน", cancelText = "ยกเลิก", type = "danger" }) {
    if (!isOpen) return null;

    const colors = {
        danger: "from-red-500 to-rose-600",
        warning: "from-amber-500 to-orange-600",
        indigo: "from-indigo-500 to-purple-600"
    };

    return (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[20000] flex items-center justify-center p-4 animate-in fade-in duration-300">
            <div className="bg-white w-full max-w-sm rounded-[2.5rem] shadow-2xl overflow-hidden animate-in zoom-in-95 duration-300">
                <div className="p-8 text-center">
                    <div className={`w-20 h-20 bg-gradient-to-br ${colors[type] || colors.danger} rounded-3xl flex items-center justify-center text-white shadow-xl mx-auto mb-6 rotate-3 group-hover:rotate-0 transition-transform`}>
                        {type === 'danger' ? <FiTrash2 size={36} /> : <FiAlertTriangle size={36} />}
                    </div>
                    
                    <h3 className="text-2xl font-black text-gray-900 mb-3">{title}</h3>
                    <p className="text-gray-500 font-medium leading-relaxed mb-8 px-2">
                        {message}
                    </p>

                    <div className="flex gap-3">
                        <button 
                            onClick={onClose}
                            className="flex-1 py-4 bg-gray-50 hover:bg-gray-100 text-gray-400 font-black rounded-2xl transition-all active:scale-95 border border-gray-100 uppercase tracking-widest text-[10px]"
                        >
                            {cancelText}
                        </button>
                        <button 
                            onClick={() => {
                                onConfirm();
                                onClose();
                            }}
                            className={`flex-[1.5] py-4 bg-gradient-to-r ${colors[type] || colors.danger} text-white font-black rounded-2xl shadow-lg transition-all active:scale-95 uppercase tracking-widest text-[10px]`}
                        >
                            {confirmText}
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
}
