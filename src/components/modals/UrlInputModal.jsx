import React, { useState } from 'react';

export default function UrlInputModal({ isOpen, onClose, onSubmit }) {
    const [input, setInput] = useState('');

    const handleSubmit = () => {
        if (input.trim()) {
            onSubmit(input.trim());
            setInput('');
        }
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-xl z-[11000] flex items-center justify-center p-6 animate-in fade-in duration-500" onClick={onClose}>
            <div className="bg-white/95 backdrop-blur-3xl w-full max-w-sm rounded-[3rem] p-8 shadow-2xl relative animate-in zoom-in-95 duration-500 overflow-hidden" onClick={e => e.stopPropagation()}>
                <div className="absolute top-0 left-0 right-0 h-1.5 bg-gradient-to-r from-blue-500 via-indigo-600 to-purple-600"></div>

                <div className="text-center mb-8">
                    <div className="w-16 h-16 bg-blue-50 rounded-[1.5rem] flex items-center justify-center mx-auto mb-6 text-2xl shadow-xl shadow-blue-50">🔗</div>
                    <h3 className="text-2xl font-black text-gray-900 leading-tight uppercase tracking-tighter">Location Bridge</h3>
                    <p className="text-[10px] font-black text-blue-500 uppercase tracking-[0.3em] mt-1 italic">Import via Coordinates or Link</p>
                </div>

                <div className="space-y-6">
                    <div className="space-y-2">
                        <label className="text-[10px] uppercase font-black tracking-widest text-gray-400 ml-4">Data Stream</label>
                        <textarea
                            value={input}
                            onChange={e => setInput(e.target.value)}
                            placeholder="Lat, Lng or Google Maps URL..."
                            className="w-full bg-gray-50/50 border border-gray-100 p-6 rounded-[2rem] text-sm font-bold text-gray-800 outline-none focus:bg-white focus:border-blue-500/50 transition-all min-h-[120px] shadow-sm placeholder:text-gray-300"
                        />
                    </div>

                    <div className="grid grid-cols-1 gap-4">
                        <button
                            onClick={handleSubmit}
                            disabled={!input.trim()}
                            className="w-full bg-black text-white font-black py-5 rounded-[2rem] shadow-2xl shadow-gray-200 text-[11px] uppercase tracking-[0.3em] active:scale-95 transition-all disabled:opacity-50 flex items-center justify-center gap-3 group"
                        >
                            <span>CONFIRM IMPORT</span>
                            <svg className="w-5 h-5 group-hover:translate-x-1 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M13 7l5 5m0 0l-5 5m5-5H6" /></svg>
                        </button>
                        <button
                            onClick={onClose}
                            className="w-full py-4 text-gray-400 font-black text-[10px] uppercase tracking-[0.3em] hover:text-gray-900 transition-colors"
                        >
                            ABORT
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
}
