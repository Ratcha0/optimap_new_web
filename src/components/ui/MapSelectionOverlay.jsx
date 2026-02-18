import React from 'react';

export default function MapSelectionOverlay({ onConfirm, onCancel, message = "กรุณาเลือกตำแหน่งบนแผนที่", coords }) {
    return (
        <div className="absolute top-12 left-1/2 -translate-x-1/2 z-[2000] w-[90%] max-w-xs animate-in slide-in-from-top-4 duration-500">
            <div className="bg-white/95 backdrop-blur-xl p-3.5 rounded-2xl shadow-2xl border border-blue-100 flex flex-col gap-3.5">
                <div className="flex items-center gap-3 px-1">
                    <div className="w-8 h-8 bg-blue-500 rounded-xl flex items-center justify-center text-white shrink-0 shadow-md shadow-blue-500/10">
                        <svg className="w-4.5 h-4.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                        </svg>
                    </div>
                    <div className="min-w-0">
                        <div className="text-[12px] font-black text-gray-900 leading-tight truncate">{message}</div>
                        {coords && (
                            <div className="text-[9px] font-bold text-blue-500 mt-0.5 bg-blue-50 px-1.5 py-0.5 rounded-md inline-block">
                                {coords[0].toFixed(5)}, {coords[1].toFixed(5)}
                            </div>
                        )}
                    </div>
                </div>

                <div className="grid grid-cols-2 gap-2">
                    <button
                        onClick={onConfirm}
                        className="bg-blue-600 hover:bg-blue-700 text-white text-[11px] font-black py-2.5 rounded-xl shadow-md active:scale-95 transition-all"
                    >
                        ยืนยันตำแหน่ง
                    </button>
                    <button
                        onClick={onCancel}
                        className="bg-gray-50 hover:bg-gray-100 text-gray-400 text-[11px] font-bold py-2.5 rounded-xl active:scale-95 transition-all"
                    >
                        ยกเลิก
                    </button>
                </div>
            </div>
        </div>
    );
}
