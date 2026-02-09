import React from 'react';

export default function FavoritesList({ favorites, onSelect, onDelete, onEdit, onView, onClose }) {
    return (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-xl z-[11000] flex items-center justify-center p-6 animate-in fade-in duration-500">
            <div className="bg-white/95 backdrop-blur-3xl w-full max-w-md rounded-[3rem] shadow-2xl relative animate-in slide-in-from-bottom duration-500 flex flex-col max-h-[85vh] overflow-hidden">
                <div className="px-8 py-8 border-b border-gray-100 flex justify-between items-center relative">
                    <div className="absolute top-0 left-0 right-0 h-1.5 bg-gradient-to-r from-yellow-400 to-orange-500"></div>
                    <div>
                        <h2 className="text-2xl font-black text-gray-900 leading-tight uppercase tracking-tighter">Collection</h2>
                        <p className="text-[10px] font-black text-yellow-500 uppercase tracking-[0.3em] mt-1 italic">{favorites.length} Saved Destinations</p>
                    </div>
                    <button
                        onClick={onClose}
                        className="w-12 h-12 bg-gray-50 text-gray-400 hover:text-gray-900 rounded-[1.2rem] flex items-center justify-center transition-all active:scale-90 border border-gray-100"
                    >
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M6 18L18 6M6 6l12 12" />
                        </svg>
                    </button>
                </div>

                <div className="overflow-y-auto flex-1 p-6 thin-scrollbar space-y-4">
                    {favorites.length === 0 ? (
                        <div className="py-24 text-center space-y-6">
                            <div className="text-6xl opacity-10 animate-float">🏝️</div>
                            <div className="space-y-2">
                                <p className="font-black text-gray-300 text-xs uppercase tracking-[0.4em]">Empty Vault</p>
                                <p className="text-[10px] text-gray-400 font-bold uppercase tracking-widest max-w-[200px] mx-auto leading-relaxed">Tap the heart icon on any location to save it here</p>
                            </div>
                        </div>
                    ) : (
                        favorites.map(fav => (
                            <div key={fav.id}
                                className="group bg-gray-50/50 border border-gray-100/50 hover:bg-white hover:shadow-2xl hover:shadow-indigo-900/5 p-5 rounded-[2rem] transition-all duration-500 cursor-pointer flex justify-between items-center active:scale-[0.98]"
                                onClick={() => { onSelect(fav); onClose(); }}
                            >
                                <div className="flex-1 min-w-0 pr-4">
                                    <div className="font-black text-gray-900 truncate tracking-tight text-base mb-1 group-hover:text-indigo-600 transition-colors uppercase">{fav.name}</div>
                                    <div className="flex items-center gap-2">
                                        <div className="w-1.5 h-1.5 bg-indigo-200 rounded-full"></div>
                                        <div className="text-[10px] font-black text-gray-400 tabular-nums tracking-widest uppercase">
                                            {fav.lat.toFixed(4)}, {fav.lng.toFixed(4)}
                                        </div>
                                    </div>
                                </div>
                                <div className="flex gap-2">
                                    <button
                                        onClick={(e) => { e.stopPropagation(); onView([fav.lat, fav.lng]); onClose(); }}
                                        className="w-11 h-11 bg-white border border-gray-100 rounded-2xl flex items-center justify-center text-indigo-500 hover:bg-indigo-600 hover:text-white transition-all shadow-sm active:scale-90"
                                    >
                                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" /></svg>
                                    </button>
                                    <button
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            const newName = window.prompt("แก้ไขชื่อสถานที่:", fav.name);
                                            if (newName && newName.trim() !== "") onEdit(fav.id, newName);
                                        }}
                                        className="w-11 h-11 bg-white border border-gray-100 rounded-2xl flex items-center justify-center text-amber-500 hover:bg-amber-500 hover:text-white transition-all shadow-sm active:scale-90"
                                    >
                                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" /></svg>
                                    </button>
                                    <button
                                        onClick={(e) => { e.stopPropagation(); if (window.confirm('ยืนยันระบบ: ต้องการทำลายพิกัดนี้ใช่หรือไม่?')) onDelete(fav.id); }}
                                        className="w-11 h-11 bg-white border border-gray-100 rounded-2xl flex items-center justify-center text-red-400 hover:bg-red-500 hover:text-white transition-all shadow-sm active:scale-90"
                                    >
                                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                                    </button>
                                </div>
                            </div>
                        ))
                    )}
                </div>
            </div>
        </div>
    );
}
