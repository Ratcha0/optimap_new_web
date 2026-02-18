import React, { useState, useEffect, useRef, useCallback } from 'react';
import { supabase } from '../../../utils/supabaseClient';
import { useToast } from '../../ui/ToastNotification';
import { useAuth } from '../../../contexts/AuthContext';
import UserProfile from '../../modals/UserProfile';
import { TICKET_STATUS } from '../../../constants/visuals';

export default function CustomerControlPanel({
    isImmersive,
    onReportIssue,
    onProfileUpdate,
    setViewMode,
    setActiveSelection,
    onOpenChat
}) {
    const { user, signOut } = useAuth();
    const [showProfile, setShowProfile] = useState(false);
    const [isMinimized, setIsMinimized] = useState(false);
    const isProcessingRef = useRef(false);
    const [tickets, setTickets] = useState([]);
    const [selectedTicketIndex, setSelectedTicketIndex] = useState(0);
    const [unreadTicketIds, setUnreadTicketIds] = useState(new Set());
    const { showToast } = useToast();
    const [dragY, setDragY] = useState(0);
    const [isDragging, setIsDragging] = useState(false);
    const startYRef = useRef(0);
    const currentDragYRef = useRef(0);

    const activeTicket = tickets[selectedTicketIndex] || (tickets.length > 0 ? tickets[0] : null);

    useEffect(() => {
        if (user) {
            fetchTickets();
            const safeId = user.id.replace(/-/g, '_');
            const sub = supabase.channel(`cp_tickets_${safeId}`)
                .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'support_tickets', filter: `user_id=eq.${user.id}` }, (payload) => {
                    if (payload.old.status !== payload.new.status) {
                        const statusLabels = {
                            pending: 'รอรับงาน',
                            accepted: 'ช่างรับงานแล้ว',
                            in_progress: 'ช่างกำลังเดินทาง',
                            completed: 'การแจ้งซ่อมเสร็จสิ้น'
                        };
                        const newStatusLabel = statusLabels[payload.new.status] || payload.new.status;
                        showToast(`ขณะนี้ช่าง : ${newStatusLabel}`, 'success');
                    }
                    if (!isProcessingRef.current) fetchTickets();
                })
                .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'support_tickets', filter: `user_id=eq.${user.id}` }, () => {
                    if (!isProcessingRef.current) fetchTickets();
                })
                .on('postgres_changes', { event: 'DELETE', schema: 'public', table: 'support_tickets', filter: `user_id=eq.${user.id}` }, () => {
                    if (!isProcessingRef.current) fetchTickets();
                })
                .subscribe();

            const msgSub = supabase.channel(`cp_messages_${safeId}`)
                .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'ticket_messages' }, (payload) => {
                    if (payload.new.sender_id !== user.id) {
                        setUnreadTicketIds(prev => new Set(prev).add(payload.new.ticket_id));
                        showToast('คุณมีข้อความใหม่', 'info');
                        fetchTickets();
                    }
                }).subscribe();

            return () => {
                supabase.removeChannel(sub);
                supabase.removeChannel(msgSub);
            };
        }
    }, [user?.id]);

    useEffect(() => {
        const handler = () => fetchTickets();
        window.addEventListener('storage_trigger', handler);
        return () => window.removeEventListener('storage_trigger', handler);
    }, []);

    const fetchTickets = async () => {
        try {
            const { data, error } = await supabase.from('support_tickets')
                .select('*, profiles:technician_id(full_name, avatar_url, phone), ticket_messages(sender_id, created_at)')
                .eq('user_id', user.id)
                .neq('status', 'completed')
                .order('created_at', { ascending: false })
                .limit(5);

            if (error) throw error;

            const unreadIds = new Set();
            data?.forEach(ticket => {
                if (ticket.ticket_messages?.length > 0) {
                    const sortedMsgs = [...ticket.ticket_messages].sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
                    const lastMsg = sortedMsgs[0];
                    if (lastMsg.sender_id !== user.id) {
                        const lastReadStr = localStorage.getItem(`last_read_ticket_${ticket.id}`);
                        if (!lastReadStr || new Date(lastReadStr) < new Date(lastMsg.created_at)) unreadIds.add(ticket.id);
                    }
                }
            });
            setUnreadTicketIds(unreadIds);
            setTickets(data || []);
        } catch (err) {
            
        }
    };

    const handlePointerDown = (e) => {
        e.currentTarget.setPointerCapture(e.pointerId);
        setIsDragging(true);
        startYRef.current = e.clientY;
        currentDragYRef.current = 0;
        setDragY(0);
    };

    const handlePointerMove = (e) => {
        if (!isDragging) return;
        const deltaY = e.clientY - startYRef.current;

        let newDragY = 0;
        if (!isMinimized) {
            newDragY = Math.max(0, deltaY);
        } else {
            newDragY = Math.min(0, deltaY);
        }

        currentDragYRef.current = newDragY;
        setDragY(newDragY);
    };

    const handlePointerUp = (e) => {
        if (!isDragging) return;
        e.currentTarget.releasePointerCapture(e.pointerId);

        const finalDelta = currentDragYRef.current;
        if (!isMinimized && finalDelta > 80) {
            setIsMinimized(true);
        } else if (isMinimized && finalDelta < -80) {
            setIsMinimized(false);
        }

        setIsDragging(false);
        setDragY(0);
    };

    const statusIcons = {
        pending: <svg className="w-full h-full" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01" /></svg>,
        accepted: <svg className="w-full h-full" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 14l2 2 4-4" /></svg>,
        in_progress: <svg className="w-full h-full" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 5h11v11H3V5zM14 8h5l3 3v5h-8V8z" /><circle cx="7" cy="18" r="2" strokeWidth="2" /><circle cx="18" cy="18" r="2" strokeWidth="2" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 9h4M5 12h5m-3 3h3" /></svg>,
        completed: <svg className="w-full h-full" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
    };


    const PEEK_VAR = 'var(--peek-height, 45px)';

    const getTransform = () => {
        if (isDragging) {
            if (!isMinimized) return `translateY(${dragY}px)`;
            return `translateY(calc(100% - ${PEEK_VAR} + ${dragY}px))`;
        }
        return isMinimized ? `translateY(calc(100% - ${PEEK_VAR}))` : 'translateY(0)';
    };

    if (isImmersive) return null;

    return (
        <div
            className={`fixed bottom-0 left-0 right-0 z-[1001] flex justify-center ${!isDragging ? 'transition-all duration-500 ease-out' : ''}`}
            style={{
                transform: getTransform(),
            }}
        >
            <style dangerouslySetInnerHTML={{
                __html: `
                @media (min-width: 640px) {
                    :root { --peek-height: 90px; }
                }
                @media (max-width: 639px) {
                    :root { --peek-height: 45px; }
                }
            `}} />
            <div className="bg-white w-full rounded-t-[1.8rem] shadow-[0_-10px_40px_-15px_rgba(0,0,0,0.3)] p-2 sm:p-4 pb-4 sm:pb-5 flex flex-col gap-1.5 sm:gap-3 animate-in slide-in-from-bottom duration-500 border-t border-white/50 relative">

                <div
                    className="absolute top-0 left-0 right-0 h-7 flex items-start justify-center cursor-grab active:cursor-grabbing z-50 touch-none"
                    onPointerDown={handlePointerDown}
                    onPointerMove={handlePointerMove}
                    onPointerUp={handlePointerUp}
                    onPointerCancel={handlePointerUp}
                    onClick={() => {
                        if (Math.abs(currentDragYRef.current) < 5) {
                            setIsMinimized(!isMinimized);
                        }
                    }}
                >
                    <div className="w-10 h-1 bg-gray-200 rounded-full mt-2.5 hover:bg-gray-300 transition-colors shadow-inner"></div>
                </div>

                <div className="mt-1"></div>

                {tickets.length > 0 && (
                    <>
                        <div className="flex items-center justify-between px-1">
                            <div className="flex items-center gap-2">
                                <div>
                                    <h2 className="text-gray-900 font-black text-[11px] sm:text-[13px] tracking-tight leading-none uppercase">รายละเอียดการแจ้งซ่อม</h2>
                                    <p className="text-[7.5px] sm:text-[9px] font-bold text-gray-400 uppercase tracking-widest mt-0.5">สถานะการแจ้งซ่อม</p>
                                </div>
                            </div>
                        </div>

                        {activeTicket && (
                            <div className="flex flex-col gap-2.5 sm:gap-4">

                                <div className="flex items-center justify-between px-0.5">
                                    {(() => {
                                        const status = activeTicket.status;
                                        const steps = [
                                            { key: 'pending', label: 'รอรับงาน', icon: statusIcons.pending },
                                            { key: 'accepted', label: 'ช่างรับงาน', icon: statusIcons.accepted },
                                            { key: 'in_progress', label: 'กำลังเดินทาง', icon: statusIcons.in_progress },
                                            { key: 'completed', label: 'เสร็จสิ้น', icon: statusIcons.completed }
                                        ];

                                        const getStatusIndex = (s) => {
                                            if (s === 'pending') return 0;
                                            if (s === 'accepted') return 1;
                                            if (s === 'in_progress') return 2;
                                            if (s === 'completed') return 3;
                                            return 0;
                                        };

                                        const currentIndex = getStatusIndex(status);

                                        return steps.map((step, index) => (
                                            <React.Fragment key={step.key}>
                                                <div className="flex flex-col items-center gap-0.5 flex-1 min-w-0">
                                                    <div className={`w-7 h-7 sm:w-8 sm:h-8 rounded-lg flex items-center justify-center transition-all duration-500 ${index <= currentIndex ? 'bg-blue-500 text-white shadow-md' : 'bg-gray-50 text-gray-300'}`}>
                                                        <div className="w-3.5 h-3.5 sm:w-4 sm:h-4">
                                                            {step.icon}
                                                        </div>
                                                    </div>
                                                    <span className={`text-[7px] sm:text-[8px] font-black tracking-tight text-center truncate w-full ${index <= currentIndex ? 'text-blue-500' : 'text-gray-300'}`}>{step.label}</span>
                                                </div>
                                                {index < steps.length - 1 && (
                                                    <div className="w-2 sm:w-8 h-[1px] bg-gray-100 mt-3 relative overflow-hidden shrink-0">
                                                        <div className={`absolute inset-0 bg-blue-500 transition-all duration-1000 ease-in-out ${index < currentIndex ? 'translate-x-0' : '-translate-x-full'}`}></div>
                                                    </div>
                                                )}
                                            </React.Fragment>
                                        ));
                                    })()}
                                </div>


                                <div className="space-y-1.5">
                                    <div className="bg-white border border-blue-50/50 rounded-[1.2rem] p-2 sm:p-3 shadow-lg shadow-blue-500/5 transition-all">
                                        <div className="flex items-center justify-between mb-1.5">
                                            <div className="flex-1 mr-2">
                                                {tickets.length > 1 ? (
                                                    <div className="relative group">
                                                        <div className="absolute inset-y-0 left-2 flex items-center pointer-events-none">
                                                            <div className="w-3.5 h-3.5 bg-blue-500 rounded-full flex items-center justify-center shadow-md">
                                                                <svg className="w-2 h-2 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M5 13l4 4L19 7" /></svg>
                                                            </div>
                                                        </div>
                                                        <select
                                                            value={selectedTicketIndex}
                                                            onChange={(e) => setSelectedTicketIndex(parseInt(e.target.value))}
                                                            className="w-full pl-7 pr-6 py-1 bg-blue-50 border border-blue-100/50 rounded-lg sm:rounded-xl text-[9px] sm:text-[11px] font-black text-blue-900 tracking-tight appearance-none focus:outline-none focus:ring-2 focus:ring-blue-500/20 cursor-pointer"
                                                        >
                                                            {tickets.map((t, idx) => (
                                                                <option key={t.id} value={idx}>งาน {idx + 1}: {t.issue_type}</option>
                                                            ))}
                                                        </select>
                                                        <div className="absolute inset-y-0 right-1.5 flex items-center pointer-events-none text-blue-500">
                                                            <svg className="w-2 h-2 sm:w-2.5 sm:h-2.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M19 9l-7 7-7-7" /></svg>
                                                        </div>
                                                    </div>
                                                ) : (
                                                    <div className="bg-blue-50 px-2 py-1 rounded-lg flex items-center gap-1.5 border border-blue-100/50">
                                                        <div className="w-3 h-3 bg-blue-500 rounded-full flex items-center justify-center shadow-sm">
                                                            <svg className="w-1.5 h-1.5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M5 13l4 4L19 7" /></svg>
                                                        </div>
                                                        <span className="text-[9px] sm:text-[11px] font-black text-blue-900 tracking-tight">งาน 1: {activeTicket.issue_type}</span>
                                                    </div>
                                                )}
                                            </div>
                                        </div>

                                        <div className="bg-gray-50/50 rounded-xl p-1.5 sm:p-2 flex items-center gap-2.5 border border-gray-100/50">
                                            <div className="w-7 h-7 sm:w-8 sm:h-8 bg-white rounded-lg flex items-center justify-center text-blue-600 shadow-sm border border-gray-100 p-1.5 shrink-0">
                                                {statusIcons[activeTicket.status] || statusIcons.pending}
                                            </div>
                                            <div className="min-w-0">
                                                <p className="font-black text-gray-900 text-[10px] sm:text-[12px] tracking-tight truncate leading-tight">ตำแหน่งจาก : {activeTicket.issue_type || 'Profile'}</p>
                                                <p className="text-[8px] sm:text-[9px] text-gray-400 font-bold mt-0.5 truncate leading-none">ทะเบียน : {activeTicket.car_reg_number || ''} {activeTicket.car_reg_text} {activeTicket.car_reg_province}</p>
                                            </div>
                                        </div>

                                        {activeTicket.status !== 'pending' && activeTicket.profiles && (
                                            <div className="mt-2 pt-2 border-t border-gray-100 flex items-center justify-between">
                                                <div className="flex items-center gap-2">
                                                    <div className="relative group">
                                                        <img src={activeTicket.profiles.avatar_url || 'https://via.placeholder.com/150'} className="w-8 h-8 sm:w-10 sm:h-10 rounded-full object-cover border border-white shadow-sm relative" alt="" />
                                                        <div className="absolute bottom-0 right-0 w-2.5 h-2.5 bg-green-500 border-2 border-white rounded-full"></div>
                                                    </div>
                                                    <div>
                                                        <p className="text-[7px] sm:text-[8px] text-gray-400 font-black uppercase tracking-wider leading-none mb-0.5">ช่างเทคนิค</p>
                                                        <p className="text-[10px] sm:text-[12px] font-black text-gray-900 leading-none">{activeTicket.status === 'in_progress' ? 'กำลังเดินทาง...' : activeTicket.profiles.full_name}</p>
                                                    </div>
                                                </div>
                                                <div className="flex items-center gap-1.5">
                                                    <button
                                                        onClick={() => {
                                                            const profile = Array.isArray(activeTicket.profiles) ? activeTicket.profiles[0] : activeTicket.profiles;
                                                            const phoneNumber = profile?.phone;
                                                            if (phoneNumber && phoneNumber.trim() !== '') {
                                                                window.location.href = `tel:${phoneNumber}`;
                                                            } else {
                                                                showToast('ช่างท่านนี้ยังไม่ได้ระบุเบอร์โทรศัพท์ในระบบ', 'info');
                                                            }
                                                        }}
                                                        className="w-7 h-7 sm:w-8 sm:h-8 flex items-center justify-center bg-green-50 text-green-600 rounded-lg hover:bg-green-600 hover:text-white active:scale-95 transition-all border border-green-100/30"
                                                    >
                                                        <svg className="w-3.5 h-3.5 sm:w-4 sm:h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" /></svg>
                                                    </button>
                                                    <button
                                                        onClick={() => onOpenChat(activeTicket)}
                                                        className="w-7 h-7 sm:w-8 sm:h-8 flex items-center justify-center bg-blue-50 text-blue-600 rounded-lg hover:bg-blue-600 hover:text-white active:scale-95 transition-all relative border border-blue-100/30"
                                                    >
                                                        <svg className="w-3.5 h-3.5 sm:w-4 sm:h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z" /></svg>
                                                        {unreadTicketIds.has(activeTicket.id) && (
                                                            <span className="absolute -top-0.5 -right-0.5 flex h-2.5 w-2.5">
                                                                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
                                                                <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-red-500 border border-white"></span>
                                                            </span>
                                                        )}
                                                    </button>
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                </div>
                            </div>
                        )}
                    </>
                )}

                <div className="px-0.5">
                    <button
                        onClick={onReportIssue}
                        className="w-full bg-gradient-to-br from-orange-400 to-orange-400 hover:from-orange-500 hover:to-orange-600 text-white font-black py-2.5 sm:py-3.5 rounded-lg shadow-md active:scale-95 transition-all text-[9px] sm:text-[10px] uppercase tracking-[0.1em] flex items-center justify-center gap-1.5 group"
                    >
                        <div className="bg-white/20 p-1 rounded-md group-hover:rotate-12 transition-transform shadow-inner">
                            <svg className="w-3 h-3 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                            </svg>
                        </div>
                        แจ้งเหตุ / ขอความช่วยเหลือ
                    </button>
                </div>
            </div>

            {showProfile && (
                <UserProfile
                    onClose={() => { setShowProfile(false); setActiveSelection(null); }}
                    setActiveSelection={setActiveSelection}
                    activeSelection={activeSelection}
                    onProfileUpdate={onProfileUpdate}
                />
            )}
        </div>
    );
}
