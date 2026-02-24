import React from 'react';
import { FiUsers } from 'react-icons/fi';
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
    onOpenInvite,
}) {
    return (
        <div key={job.id} className="bg-white rounded-2xl p-3.5 sm:p-5 border border-gray-100 shadow-xl transition-all active:scale-[0.98] group overflow-hidden">
            <div className="flex justify-between items-start mb-3.5 sm:mb-4">
                <div className="flex items-center gap-3">
                    <div className="relative">
                        <img
                            src={job.profiles?.avatar_url || EXTERNAL_LINKS.GOOGLE_AUTH_ICON}
                            alt="Avatar"
                            className="w-9 h-9 sm:w-11 sm:h-11 rounded-lg sm:rounded-xl object-cover border-2 border-gray-100 shadow-md"
                            onError={(e) => {
                                if (e.target.src !== EXTERNAL_LINKS.GOOGLE_AUTH_ICON) {
                                    e.target.src = EXTERNAL_LINKS.GOOGLE_AUTH_ICON;
                                }
                            }}
                        />
                        <div className="absolute -bottom-1 -right-1 w-3 h-3 bg-green-500 border-2 border-white rounded-full"></div>
                    </div>
                    <div>
                        <div className="font-black text-sm sm:text-base text-gray-900 leading-tight tracking-tight truncate max-w-[120px] sm:max-w-none">{job.profiles?.full_name || 'ลูกค้าทั่วไป'}</div>
                        <div className="text-[7.5px] sm:text-[9px] font-bold text-gray-400 uppercase tracking-widest mt-0.5">
                            {job.issue_type} • {new Date(job.created_at).toLocaleTimeString('th-TH', { hour: '2-digit', minute: '2-digit' })}น.
                        </div>
                    </div>
                </div>
                <StatusBadge status={job.status} />
            </div>

            <div className="mb-3 sm:mb-4 p-3 sm:p-4 bg-gray-50/80 rounded-xl border border-gray-100/50 space-y-2 sm:space-y-2.5">
                {job.car_reg_text && (
                    <div className="flex items-center gap-2">
                        <div className="px-1 py-0.5 bg-gradient-to-br from-orange-500/10 to-red-500/10 rounded-md text-orange-500 text-[8px] sm:text-[9.5px] font-black uppercase tracking-wider border border-orange-500/20">
                            ทะเบียน :
                        </div>
                        <div className="text-[11px] sm:text-xs font-black text-gray-700">
                            {job.car_reg_number} {job.car_reg_text} {job.car_reg_province}
                        </div>
                    </div>
                )}

                <div className="text-[10.5px] sm:text-xs text-gray-500 font-bold leading-relaxed italic line-clamp-2">
                    {job.description}
                </div>

                {job.location_name && (
                    <div className="flex items-start gap-1.5 pt-2 border-t border-gray-100 text-[9px] sm:text-[10px] text-blue-500 font-bold">
                        <svg className="w-3 h-3 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                        </svg>
                        <span className="truncate">{job.location_name}</span>
                    </div>
                )}

               
                {job.ticket_assignments?.filter(a => (a.status === 'accepted' || a.role === 'primary' || a.role === 'technician') && a.profiles).length > 0 && (
                    <div className="pt-2 border-t border-gray-100">
                        <div className="flex items-center gap-2 flex-wrap">
                            <span className="text-[9px] font-black text-black">ผู้ดำเนินการ :</span>
                            {job.ticket_assignments
                            .filter(a => (a.status === 'accepted' || a.role === 'primary' || a.role === 'technician') && a.profiles)
                            .map(assign => (
                                <div key={assign.id} className="flex items-center gap-1 bg-white border border-gray-100 py-0.5 px-1.5 rounded-lg shadow-sm">
                                    <img 
                                        src={assign.profiles?.avatar_url || `https://ui-avatars.com/api/?name=${assign.profiles?.full_name}&background=random`} 
                                        className="w-4 h-4 rounded-md object-cover"
                                        alt=""
                                        onError={(e) => {
                                            const fallback = `https://ui-avatars.com/api/?name=${assign.profiles?.full_name || 'T'}&background=random`;
                                            if (e.target.src !== fallback) {
                                                e.target.src = fallback;
                                            }
                                        }}
                                    />
                                    <span className="text-[9px] font-bold text-gray-700">{assign.profiles?.full_name?.split(' ')[0]}</span>
                                </div>
                            ))
                        }
                        </div>
                    </div>
                )}
            </div>

            <div className="flex gap-2 items-center">
                {(!job.status || job.status === 'pending') ? (
                    <button
                        onClick={() => {
                            handleUpdateStatus(job.id, 'accepted');
                            if (onAcceptJob) onAcceptJob(job);
                        }}
                        className="flex-1 bg-green-600 hover:bg-green-500 text-white font-black py-3 rounded-xl shadow-lg transition-all active:scale-95 flex items-center justify-center gap-2"
                    >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M5 13l4 4L19 7" />
                        </svg>
                        <span className="text-xs uppercase tracking-wide">รับงานนี้</span>
                    </button>
                ) : (
                    <>
                        <div className="flex-1 min-w-0">
                            {(job.technician_id === user?.id || job.ticket_assignments?.some(a => a.technician_id === user?.id && (a.status === 'accepted' || a.status === 'pending'))) ? (
                                <div className="relative group/select">
                                    <select
                                        value={job.status}
                                        onChange={(e) => handleUpdateStatus(job.id, e.target.value)}
                                        className={`w-full appearance-none border-none rounded-xl pl-3 pr-8 py-2.5 text-[10px] sm:text-[11px] font-black uppercase tracking-widest focus:ring-2 outline-none cursor-pointer transition-all ${job.status === 'completed' ? 'bg-emerald-50 text-emerald-600' : 'bg-gray-100 text-gray-600'}`}
                                    >
                                        <option value="pending">รอรับงาน</option>
                                        <option value="accepted">รับงานแล้ว</option>
                                        <option value="in_progress">เดินทาง</option>
                                        <option value="completed">เสร็จสิ้น</option>
                                    </select>
                                    <div className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none opacity-40">
                                        <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M19 9l-7 7-7-7" /></svg>
                                    </div>
                                </div>
                            ) : (
                                <div className="py-2.5 px-4 bg-gray-50 text-gray-300 rounded-xl font-black text-[10px] uppercase text-center border border-gray-100">
                                    มีผู้รับงานแล้ว
                                </div>
                            )}
                        </div>

                        {job.technician_id === user?.id && job.status !== 'completed' && (
                            <button
                                onClick={() => onOpenInvite(job)}
                                className="w-9 h-9 sm:w-10 sm:h-10 bg-indigo-50 hover:bg-indigo-600 text-indigo-600 hover:text-white rounded-xl border border-indigo-100 transition-all active:scale-95 flex items-center justify-center shrink-0 shadow-sm"
                            >
                                <FiUsers className="w-3.5 h-3.5 sm:w-4.5 sm:h-4.5" />
                            </button>
                        )}

                        <button
                            onClick={() => {
                                if (onAcceptJob) onAcceptJob(job);
                                setViewMode('map');
                            }}
                            className="w-9 h-9 sm:w-10 sm:h-10 bg-blue-500 hover:bg-blue-600 text-white rounded-xl shadow-lg active:scale-95 flex items-center justify-center shrink-0"
                        >
                            <svg className="w-4 h-4 sm:w-4.5 sm:h-4.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" /></svg>
                        </button>

                        <button
                            onClick={() => {
                                setActiveTicket(job);
                                setIsMessageOpen(true);
                                setUnreadJobs(prev => { const s = new Set(prev); s.delete(job.id); return s; });
                            }}
                            className="relative w-9 h-9 sm:w-10 sm:h-10 bg-gray-50 hover:bg-blue-50 text-gray-400 hover:text-blue-600 rounded-xl border border-gray-100 transition-all active:scale-95 flex items-center justify-center shrink-0"
                        >
                            <svg className="w-3.5 h-3.5 sm:w-4 sm:h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z" /></svg>
                            {unreadJobs.has(job.id) && <span className="absolute -top-1 -right-1 w-4 h-4 bg-red-500 rounded-full text-[8px] font-black flex items-center justify-center border-2 border-white text-white">1</span>}
                        </button>
                    </>
                )}
            </div>
        </div>
    );
}
