import React, { useState, useEffect } from 'react';
import { supabase } from '../../../utils/supabaseClient';
import { useToast } from '../../ui/ToastNotification';
import MessageModal from '../../modals/MessageModal';
import TicketCard from './TicketCard';
import { TICKET_STATUS } from '../../../constants/visuals';
import { PROVINCES } from '../../../constants/provinces';

export default function MyTicketsView({ user, setViewMode }) {
    const [tickets, setTickets] = useState([]);
    const [loading, setLoading] = useState(true);
    const [editingTicket, setEditingTicket] = useState(null);
    const [editDescription, setEditDescription] = useState('');
    const [editCarNumber, setEditCarNumber] = useState('');
    const [editCarReg, setEditCarReg] = useState('');
    const [editProvince, setEditProvince] = useState('');
    const [isMessageOpen, setIsMessageOpen] = useState(false);
    const [activeTicket, setActiveTicket] = useState(null);
    const [unreadTickets, setUnreadTickets] = useState(new Set());
    const [deleteTargetId, setDeleteTargetId] = useState(null);
    const { showToast } = useToast();
    const isProcessingRef = React.useRef(false);

    useEffect(() => {
        if (!user?.id) return;
        fetchMyTickets();

        const safeId = user.id.replace(/-/g, '_');
        const subscription = supabase
            .channel(`tickets_${safeId}`)
            .on('postgres_changes', { event: '*', schema: 'public', table: 'support_tickets', filter: `user_id=eq.${user.id}` }, () => {
                if (!isProcessingRef.current) fetchMyTickets();
            }).subscribe();

        const msgSubscription = supabase
            .channel(`ticket_messages_${safeId}`)
            .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'ticket_messages' }, (payload) => {
                if (payload.new.sender_id !== user.id) {
                    setUnreadTickets(prev => new Set(prev).add(payload.new.ticket_id));
                }
            }).subscribe();

        return () => {
            supabase.removeChannel(subscription);
            supabase.removeChannel(msgSubscription);
        };
    }, [user?.id]);

    useEffect(() => {
        const handler = () => fetchMyTickets();
        window.addEventListener('storage_trigger', handler);
        return () => window.removeEventListener('storage_trigger', handler);
    }, []);

    const fetchMyTickets = async () => {
        try {
            setLoading(true);
            const { data, error } = await supabase
                .from('support_tickets')
                .select('*, profiles:technician_id(full_name, avatar_url), ticket_messages(sender_id, created_at)')
                .eq('user_id', user.id)
                .order('created_at', { ascending: false });

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
            setUnreadTickets(unreadIds);
            setTickets(data || []);
        } catch (err) {
            showToast('ดึงข้อมูลไม่สำเร็จ', 'error');
        } finally {
            setLoading(false);
        }
    };

    const confirmDelete = async () => {
        if (!deleteTargetId) return;
        const id = deleteTargetId;
        setDeleteTargetId(null);

        isProcessingRef.current = true;
        const prev = [...tickets];
        setTickets(tickets.filter(t => t.id !== id));
        try {
            const { error } = await supabase.from('support_tickets').delete().eq('id', id).eq('user_id', user.id);
            if (error) throw error;
            showToast('ลบรายการเรียบร้อยแล้ว', 'success');
        } catch (err) {
            setTickets(prev);
            showToast('ลบไม่สำเร็จ: ' + err.message, 'error');
        } finally {
            setTimeout(() => { isProcessingRef.current = false; }, 2000);
        }
    };

    const handleUpdate = async () => {
        if (!editingTicket) return;
        isProcessingRef.current = true;
        const targetId = editingTicket.id;
        const prev = [...tickets];
        setTickets(tickets.map(t => t.id === targetId ? { ...t, description: editDescription, car_reg_number: editCarNumber, car_reg_text: editCarReg, car_reg_province: editProvince } : t));
        setEditingTicket(null);
        try {
            const { error } = await supabase.from('support_tickets').update({ description: editDescription, car_reg_number: editCarNumber, car_reg_text: editCarReg, car_reg_province: editProvince }).eq('id', targetId).eq('user_id', user.id);
            if (error) throw error;
            showToast('แก้ไขข้อมูลเรียบร้อยแล้ว', 'success');
        } catch (err) {
            setTickets(prev);
            showToast('แก้ไขไม่สำเร็จ: ' + err.message, 'error');
        } finally {
            setTimeout(() => { isProcessingRef.current = false; }, 2000);
        }
    };



    const openChat = (ticket) => {
        setActiveTicket(ticket);
        setIsMessageOpen(true);
        setUnreadTickets(prev => {
            const newSet = new Set(prev);
            newSet.delete(ticket.id);
            return newSet;
        });
    };

    return (
        <div className="min-h-screen bg-gray-50 flex flex-col font-sans text-gray-900">

            <header className="p-3 sm:p-6 border-b border-gray-100 sticky top-0 bg-white/90 backdrop-blur-lg z-10 flex flex-col gap-2 sm:gap-4 shadow-sm">
                <div className="flex items-center gap-3 sm:gap-4">
                    <button onClick={() => setViewMode('map')} className="p-1.5 sm:p-2 bg-gray-50 hover:bg-gray-100 rounded-full transition-colors text-gray-700 active:scale-95">
                        <svg className="w-5 h-5 sm:w-6 sm:h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M10 19l-7-7m0 0l7-7m-7 7h18" />
                        </svg>
                    </button>
                    <div>
                        <h1 className="text-lg sm:text-xl font-black text-gray-900 tracking-tight">รายการแจ้งซ่อมของฉัน</h1>
                    </div>
                </div>
                <div className="text-[10px] sm:text-sm px-1 text-gray-400 font-bold uppercase tracking-wider">คุณมีทั้งหมด {tickets.length} รายการ</div>
            </header>


            <main className="flex-grow p-4 space-y-4">
                {loading && tickets.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-20 space-y-4">
                        <div className="w-10 h-10 border-4 border-white/10 border-t-blue-500 rounded-full animate-spin"></div>
                        <p className="text-gray-500 animate-pulse">กำลังโหลดข้อมูล...</p>
                    </div>
                ) : tickets.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-40 text-gray-600 grayscale">
                        <svg className="w-20 h-20 mb-4 opacity-20" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1" d="M19.428 15.428a2 2 0 00-1.022-.547l-2.387-.477a6 6 0 00-3.86.517l-.318.158a6 6 0 01-3.86.517L6.05 15.21a2 2 0 00-1.806.547M8 4h8l-1 1v5.172a2 2 0 00.586 1.414l5 5c1.26 1.26.367 3.414-1.415 3.414H4.828c-1.782 0-2.674-2.154-1.414-3.414l5-5A2 2 0 009 10.172V5L8 4z" />
                        </svg>
                        <p className="font-medium text-lg">คุณยังไม่มีรายการแจ้งซ่อมในขณะนี้</p>
                    </div>
                ) : (
                    tickets.map(ticket => (
                        <TicketCard
                            key={ticket.id}
                            ticket={ticket}
                            unreadTickets={unreadTickets}
                            onEdit={(t) => {
                                setEditingTicket(t);
                                setEditDescription(t.description || '');
                                setEditCarNumber(t.car_reg_number || '');
                                setEditCarReg(t.car_reg_text || '');
                                setEditProvince(t.car_reg_province || '');
                            }}
                            onDelete={(id) => setDeleteTargetId(id)}
                            onOpenChat={openChat}
                            onTrackMap={() => setViewMode('map')}
                            onViewHistory={openChat}
                        />
                    ))
                )}
            </main>


            {editingTicket && (
                <div className="fixed inset-0 bg-gray-50/80 backdrop-blur-sm z-[10000] flex items-center justify-center p-6">
                    <div className="bg-white w-full max-w-md p-8 rounded-[2rem] border border-gray-100 shadow-2xl animate-in fade-in zoom-in duration-300">
                        <h3 className="text-xl font-bold text-gray-900 mb-6 flex items-center gap-2">✏️ แก้ไขรายละเอียด</h3>

                        <div className="space-y-4">
                            <div>
                                <label className="text-[10px] uppercase font-bold text-gray-500 mb-2 block">ข้อมูลรถ</label>
                                <div className="grid grid-cols-2 gap-3 mb-3">
                                    <input type="text" placeholder="ตัวเลข" value={editCarNumber} onChange={e => setEditCarNumber(e.target.value)} className="bg-gray-50 border border-gray-200 text-gray-900 p-3 rounded-xl outline-none focus:border-blue-500 transition-all font-bold placeholder:text-gray-400" />
                                    <input type="text" placeholder="ตัวอักษร" value={editCarReg} onChange={e => setEditCarReg(e.target.value)} className="bg-gray-50 border border-gray-200 text-gray-900 p-3 rounded-xl outline-none focus:border-blue-500 transition-all font-bold placeholder:text-gray-400" />
                                </div>
                                <select value={editProvince} onChange={e => setEditProvince(e.target.value)} className="w-full bg-gray-50 border border-gray-200 text-gray-900 p-3 rounded-xl outline-none focus:border-blue-500 transition-all font-bold appearance-none">
                                    <option value="">เลือกจังหวัด</option>
                                    {PROVINCES.map(p => <option key={p} value={p}>{p}</option>)}
                                </select>
                            </div>
                            <div>
                                <label className="text-[10px] uppercase font-bold text-gray-500 mb-2 block">ปัญหาที่พบ</label>
                                <textarea rows="3" value={editDescription} onChange={e => setEditDescription(e.target.value)} className="w-full bg-gray-50 border border-gray-200 text-gray-900 p-3 rounded-xl outline-none focus:border-blue-500 transition-all font-bold resize-none placeholder:text-gray-400" placeholder="อธิบายปัญหาพื้นผิว..." />
                            </div>
                        </div>

                        <div className="flex gap-3 mt-8">
                            <button onClick={handleUpdate} className="flex-1 bg-blue-600 hover:bg-blue-700 text-white font-bold py-3 rounded-xl transition-all active:scale-95 shadow-lg shadow-blue-500/20">บันทึก</button>
                            <button onClick={() => setEditingTicket(null)} className="flex-1 bg-gray-100 hover:bg-gray-200 text-gray-500 font-bold py-3 rounded-xl transition-all active:scale-95 border border-gray-100">ยกเลิก</button>
                        </div>
                    </div>
                </div>
            )}


            {deleteTargetId && (
                <div className="fixed inset-0 bg-gray-900/60 backdrop-blur-md z-[10001] flex items-center justify-center p-6 animate-in fade-in duration-300">
                    <div className="bg-white w-full max-w-sm p-8 rounded-[2.5rem] shadow-2xl animate-in zoom-in-95 duration-300 text-center">
                        <div className="w-20 h-20 bg-red-50 text-red-500 rounded-3xl flex items-center justify-center mx-auto mb-6 shadow-inner ring-4 ring-red-50">
                            <svg className="w-10 h-10" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                            </svg>
                        </div>
                        <h3 className="text-2xl font-black text-gray-900 mb-2">ยืนยันการลบ?</h3>
                        <p className="text-gray-500 text-sm leading-relaxed mb-8">คุณแน่ใจหรือไม่ที่จะลบรายการนี้? <br />ข้อมูลจะหายไปและไม่สามารถกู้คืนได้</p>

                        <div className="flex flex-col gap-3">
                            <button
                                onClick={confirmDelete}
                                className="w-full bg-red-500 hover:bg-red-600 text-white font-black py-4 rounded-2xl transition-all active:scale-95 shadow-lg shadow-red-200"
                            >
                                ยืนยันการลบรายการ
                            </button>
                            <button
                                onClick={() => setDeleteTargetId(null)}
                                className="w-full bg-gray-50 hover:bg-gray-100 text-gray-400 font-bold py-4 rounded-2xl transition-all active:scale-95"
                            >
                                ยกเลิก
                            </button>
                        </div>
                    </div>
                </div>
            )}


            {activeTicket && (
                <MessageModal
                    isOpen={isMessageOpen}
                    onClose={() => setIsMessageOpen(false)}
                    ticketId={activeTicket.id}
                    currentUser={user}
                    otherPartyName={activeTicket.profiles?.full_name}
                    otherPartyAvatar={activeTicket.profiles?.avatar_url}
                />
            )}
        </div>
    );
}
