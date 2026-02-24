import React from 'react';
import { FiUsers, FiCheck, FiX } from 'react-icons/fi';

export default function TeamInviteNotification({ invite, onAccept, onDecline }) {
    if (!invite) return null;

    return (
        <div className="fixed inset-0 flex items-center justify-center z-[99999] animate-in fade-in duration-300 pointer-events-none">
           
            <div className="absolute inset-0 bg-black/40 backdrop-blur-sm pointer-events-auto"></div>
            
            <div className="relative w-[90%] max-w-md animate-in zoom-in-95 duration-300 pointer-events-auto">
                <div className="bg-white rounded-[2rem] shadow-[0_32px_64px_-16px_rgba(0,0,0,0.3)] border-2 border-indigo-500 p-6 overflow-hidden">
                    <div className="relative flex flex-col items-center text-center">
                        <div className="w-16 h-16 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-2xl flex items-center justify-center text-white shadow-lg mb-4 ring-4 ring-indigo-50">
                            <FiUsers size={32} className="animate-bounce" />
                        </div>

                        <h3 className="text-xl font-black text-gray-900 leading-tight mb-2">
                            คำเชิญเข้าทีม!
                        </h3>
                        
                    <p className="text-sm text-gray-600 font-medium px-4">
                        <span className="text-indigo-600 font-bold text-lg">คุณ {invite.sender_name}</span> <br/>
                        ชวนคุณเข้าร่วมงานของ <br/>
                        <span className="text-gray-900 font-black text-base mt-2 block">"{invite.job_name}"</span>
                        <span className="text-gray-400 text-[10px] font-bold uppercase tracking-widest mt-2 block">รหัสงาน: #{invite.ticket_id?.slice(0, 8)}</span>
                    </p>

                        <div className="flex gap-3 w-full mt-6">
                            <button
                                onClick={onDecline}
                                className="flex-1 py-4 bg-gray-50 hover:bg-red-50 text-gray-400 hover:text-red-600 rounded-2xl font-black text-sm transition-all active:scale-95 flex items-center justify-center gap-2 border border-gray-100"
                            >
                                <FiX size={18} />
                                ปฏิเสธ
                            </button>
                            <button
                                onClick={onAccept}
                                className="flex-[2] py-4 bg-indigo-600 hover:bg-indigo-500 text-white rounded-2xl font-black text-sm shadow-lg shadow-indigo-500/30 transition-all active:scale-95 flex items-center justify-center gap-2"
                            >
                                <FiCheck size={18} />
                                เข้าร่วมทีม
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
