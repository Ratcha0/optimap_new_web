import React from 'react';
import { EXTERNAL_LINKS } from '../../../constants/api';
import StatusBadge from '../../ui/StatusBadge';

export default function TicketCard({
    ticket,
    unreadTickets,
    onEdit,
    onDelete,
    onOpenChat,
    onTrackMap,
}) {
    const hasUnread = unreadTickets.has(ticket.id);

    return (
        <div className="bg-white rounded-2xl p-3.5 sm:p-5 border border-gray-100 shadow-xl transition-all active:scale-[0.98] group relative overflow-hidden">
            <div className="flex justify-between items-center mb-3 sm:mb-4">
                <StatusBadge status={ticket.status} />
                <div className="text-[8px] sm:text-[9px] text-gray-400 font-bold uppercase tracking-wider">
                    {new Date(ticket.created_at).toLocaleDateString('th-TH', { day: 'numeric', month: 'short' })}
                </div>
            </div>

            <div className="mb-3 sm:mb-5 p-3 sm:p-4 bg-gray-50/80 rounded-xl border border-gray-100/50 space-y-2.5 sm:space-y-3.5">
                <div className="flex flex-col sm:flex-row sm:items-center gap-2">
                    <div className="inline-block p-1 px-1.5 bg-indigo-50 rounded-lg text-indigo-600 text-[8px] font-black uppercase tracking-widest border border-indigo-100 w-fit">
                        {ticket.issue_type}
                    </div>
                    {ticket.car_reg_text && (
                        <div className="text-[10px] sm:text-xs font-black text-gray-700 truncate leading-tight">
                            ทะเบียน : {ticket.car_reg_number} {ticket.car_reg_text} {ticket.car_reg_province}
                        </div>
                    )}
                </div>

                <div className="text-[10px] sm:text-xs text-gray-500 font-bold leading-relaxed italic opacity-80 line-clamp-2">
                    {ticket.description}
                </div>

                {(ticket.status === 'in_progress' || ticket.status === 'accepted') && ticket.profiles && (
                    <div className="mt-1.5 sm:mt-3 pt-2.5 sm:pt-3 border-t border-gray-200/50 flex items-center gap-2.5 sm:gap-3.5">
                        <div className="relative">
                            <img
                                src={ticket.profiles.avatar_url || EXTERNAL_LINKS.GOOGLE_AUTH_ICON}
                                className="w-9 h-9 sm:w-11 sm:h-11 rounded-lg sm:rounded-xl border-2 border-white shadow-md object-cover"
                                alt="Technician"
                            />
                            <div className="absolute -bottom-1 -right-1 w-2.5 h-2.5 sm:w-3 sm:h-3 bg-blue-500 border-2 border-white rounded-full"></div>
                        </div>
                        <div>
                            <p className="text-[6.5px] sm:text-[8px] text-gray-400 uppercase font-black tracking-widest">ช่างผู้ดูแล</p>
                            <p className="text-[11px] sm:text-sm text-gray-900 font-black tracking-tight leading-none mt-0.5">{ticket.profiles.full_name}</p>
                        </div>
                    </div>
                )}
            </div>

            <div className="space-y-1.5 sm:space-y-2.5">
                {ticket.status === 'pending' && (
                    <div className="flex gap-2">
                        <button
                            onClick={() => onOpenChat(ticket)}
                            className="relative flex-[2.5] bg-indigo-600 hover:bg-indigo-700 text-white font-black py-2.5 sm:py-3.5 rounded-xl transition-all active:scale-95 flex items-center justify-center gap-2"
                        >
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z" />
                            </svg>
                            <span className="text-xs sm:text-sm">แชท</span>
                            {hasUnread && (
                                <span className="absolute -top-1 -right-1 w-4.5 h-4.5 bg-red-500 rounded-full text-[9px] font-black flex items-center justify-center border-2 border-white text-white">
                                    1
                                </span>
                            )}
                        </button>
                        <div className="flex flex-1 gap-1.5">
                            <button
                                onClick={() => onEdit(ticket)}
                                className="flex-1 bg-orange-50 text-orange-500 hover:bg-orange-500 hover:text-white p-2 sm:p-2.5 rounded-xl border border-orange-100 transition-all active:scale-95"
                            >
                                <svg className="w-3.5 h-3.5 sm:w-4.5 sm:h-4.5 mx-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                                </svg>
                            </button>
                            <button
                                onClick={() => onDelete(ticket.id)}
                                className="flex-1 bg-red-50 text-red-400 hover:bg-red-500 hover:text-white p-2 sm:p-2.5 rounded-xl border border-red-100/50 transition-all active:scale-95"
                            >
                                <svg className="w-3.5 h-3.5 sm:w-4.5 sm:h-4.5 mx-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                                </svg>
                            </button>
                        </div>
                    </div>
                )}

                {(ticket.status === 'accepted' || ticket.status === 'in_progress') && (
                    <div className="flex flex-col gap-1.5 sm:gap-2.5">
                        <button
                            onClick={onTrackMap}
                            className="w-full bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white font-black py-3 sm:py-4 rounded-xl shadow-lg transition-all active:scale-95 flex items-center justify-center gap-2"
                        >
                            <svg className="w-4 h-4 sm:w-5 sm:h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                            </svg>
                            <span className="text-xs sm:text-sm uppercase tracking-wide">ติดตามช่างบนแผนที่</span>
                        </button>
                        <button
                            onClick={() => onOpenChat(ticket)}
                            className="relative w-full bg-gray-50 hover:bg-white text-gray-500 font-bold py-2.5 sm:py-3 rounded-xl border border-gray-100 transition-all active:scale-95 flex items-center justify-center gap-2"
                        >
                            <span className="text-[11px] sm:text-xs">แชทติดต่อช่าง</span>
                            {hasUnread && (
                                <span className="absolute -top-1 -right-1 w-4.5 h-4.5 bg-red-500 rounded-full text-[9px] font-black flex items-center justify-center border-2 border-white text-white">
                                    1
                                </span>
                            )}
                        </button>
                    </div>
                )}

                {ticket.status === 'completed' && (
                    <button
                        onClick={() => onOpenChat(ticket)}
                        className="relative w-full bg-gray-50/50 hover:bg-white text-gray-400 font-bold py-2.5 sm:py-3.5 rounded-xl border border-gray-100/50 transition-all active:scale-95 flex items-center justify-center gap-2"
                    >
                        <span className="text-xs sm:text-sm">ดูประวัติการแชท</span>
                        {hasUnread && (
                            <span className="absolute -top-1 -right-1 w-4.5 h-4.5 bg-red-500 rounded-full text-[9px] font-black flex items-center justify-center border-2 border-white text-white">
                                1
                            </span>
                        )}
                    </button>
                )}
            </div>
        </div>
    );
}
