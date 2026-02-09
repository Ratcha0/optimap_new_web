import React from 'react';
import { EXTERNAL_LINKS } from '../../../constants/api';
import StatusBadge from '../../ui/StatusBadge';

export default function JobCard({
    job,
    unreadJobs,
    user,
    handleUpdateStatus,
    onAcceptJob,
    setViewMode,
    setActiveTicket,
    setIsMessageOpen,
    setUnreadJobs,
}) {
    return (
        <div key={job.id} className="bg-white rounded-2xl sm:rounded-[2rem] p-4 sm:p-6 border border-gray-100 shadow-xl transition-all active:scale-[0.98] group overflow-hidden">
            <div className="flex justify-between items-start mb-5">
                <div className="flex items-center gap-3 sm:gap-4">
                    <div className="relative">
                        <img
                            src={job.profiles?.avatar_url || EXTERNAL_LINKS.GOOGLE_AUTH_ICON}
                            alt="Avatar"
                            className="w-10 h-10 sm:w-14 sm:h-14 rounded-xl sm:rounded-2xl object-cover border-2 border-gray-100 shadow-lg"
                        />
                        <div className="absolute -bottom-1 -right-1 w-3.5 h-3.5 sm:w-4 sm:h-4 bg-green-500 border-2 border-white rounded-full"></div>
                    </div>
                    <div>
                        <div className="font-black text-base sm:text-lg text-gray-900 leading-tight tracking-tight truncate max-w-[120px] sm:max-w-none">{job.profiles?.full_name || 'ลูกค้าทั่วไป'}</div>
                        <div className="text-[8px] sm:text-[10px] font-bold text-gray-400 uppercase tracking-widest mt-0.5 sm:mt-1">
                            {new Date(job.created_at).toLocaleTimeString('th-TH', { hour: '2-digit', minute: '2-digit' })} • {job.issue_type}
                        </div>
                    </div>
                </div>
                <StatusBadge status={job.status} />
            </div>

            <div className="mb-4 sm:mb-6 p-4 sm:p-5 bg-gray-50 rounded-xl sm:rounded-2xl border border-gray-100 space-y-2 sm:space-y-3">
                {job.car_reg_text && (
                    <div className="flex items-center gap-1.5 sm:gap-2">
                        <div className="px-1.5 py-0.5 bg-gradient-to-br from-orange-500/10 to-red-500/10 rounded-md text-orange-500 text-[8px] sm:text-[10px] font-black uppercase tracking-wider border border-orange-500/20">
                            ทะเบียน :
                        </div>
                        <div className="text-xs sm:text-sm font-bold text-gray-700">
                            {job.car_reg_number} {job.car_reg_text} {job.car_reg_province}
                        </div>
                    </div>
                )}

                <div className="text-[11px] sm:text-sm text-gray-600 font-medium leading-relaxed italic line-clamp-2">
                    {job.description}
                </div>

                {job.location_name && (
                    <div className="flex items-start gap-1.5 sm:gap-2 pt-2 sm:pt-3 border-t border-gray-100 text-[9px] sm:text-[11px] text-blue-500 font-bold">
                        <svg className="w-3.5 h-3.5 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                        </svg>
                        <span className="truncate">{job.location_name}</span>
                    </div>
                )}
            </div>

            <div className="flex gap-2 sm:gap-3">
                {(!job.status || job.status === 'pending') ? (
                    <button
                        onClick={() => {
                            handleUpdateStatus(job.id, 'accepted');
                            if (onAcceptJob) onAcceptJob(job);
                        }}
                        className="w-full bg-green-600 hover:bg-green-500 text-white font-black py-3 sm:py-4 px-4 sm:px-6 rounded-xl sm:rounded-2xl shadow-lg transition-all active:scale-95 flex items-center justify-center gap-2"
                    >
                        <svg className="w-4 h-4 sm:w-5 sm:h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M5 13l4 4L19 7" />
                        </svg>
                        <span className="text-sm sm:text-base">รับงานนี้</span>
                    </button>
                ) : (
                    <>
                        <div className="flex-[3] relative group/select min-w-0">
                            <select
                                value={job.status}
                                onChange={(e) => handleUpdateStatus(job.id, e.target.value)}
                                className={`w-full appearance-none border-none rounded-xl sm:rounded-2xl pl-3 sm:pl-4 pr-8 sm:pr-10 py-3 sm:py-4 text-[10px] sm:text-xs font-black uppercase tracking-widest focus:ring-2 outline-none cursor-pointer transition-all ${job.status === 'completed'
                                    ? 'bg-emerald-50 text-emerald-600'
                                    : 'bg-gray-100 text-gray-700'
                                    }`}
                            >
                                <option value="pending">รอรับงาน</option>
                                <option value="accepted">รับงานแล้ว</option>
                                <option value="in_progress">เดินทาง</option>
                                <option value="completed">เสร็จสิ้น</option>
                            </select>
                            <div className="absolute right-3 sm:right-4 top-1/2 -translate-y-1/2 pointer-events-none opacity-40">
                                <svg className="w-3.5 h-3.5 sm:w-4 sm:h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M19 9l-7 7-7-7" />
                                </svg>
                            </div>
                        </div>

                        <button
                            onClick={() => {
                                if (onAcceptJob) onAcceptJob(job);
                                setViewMode('map');
                            }}
                            className="w-11 h-11 sm:w-14 sm:h-14 bg-gradient-to-br from-blue-500 to-blue-600 text-white rounded-xl sm:rounded-2xl shadow-lg active:scale-95 flex items-center justify-center shrink-0"
                        >
                            <svg className="w-6 h-6 sm:w-7 sm:h-7" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                            </svg>
                        </button>

                        <button
                            onClick={() => {
                                setActiveTicket(job);
                                setIsMessageOpen(true);
                                setUnreadJobs(prev => {
                                    const newSet = new Set(prev);
                                    newSet.delete(job.id);
                                    return newSet;
                                });
                            }}
                            className="relative w-11 h-11 sm:w-14 sm:h-14 bg-gray-50 hover:bg-blue-50 text-gray-400 hover:text-blue-600 rounded-xl sm:rounded-2xl border border-gray-100 transition-all active:scale-95 flex items-center justify-center shrink-0"
                        >
                            <svg className="w-5 h-5 sm:w-6 sm:h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z" />
                            </svg>
                            {unreadJobs.has(job.id) && (
                                <span className="absolute -top-1 -right-1 w-4 h-4 sm:w-6 sm:h-6 bg-red-500 rounded-full text-[8px] sm:text-[10px] font-black flex items-center justify-center border-2 border-white text-white">
                                    1
                                </span>
                            )}
                        </button>
                    </>
                )}
            </div>
        </div>
    );
}
