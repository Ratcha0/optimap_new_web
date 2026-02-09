import React, { useState, useEffect, useRef } from 'react';
import { supabase } from '../../utils/supabaseClient';
import { useToast } from '../ui/ToastNotification';

export default function MessageModal({ isOpen, onClose, ticketId, currentUser, otherPartyName, otherPartyAvatar }) {
    const [messages, setMessages] = useState([]);
    const [newMessage, setNewMessage] = useState('');
    const [loading, setLoading] = useState(false);
    const messagesEndRef = useRef(null);
    const { showToast } = useToast();

    const scrollToBottom = () => {
        messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    };

    useEffect(() => {
        if (isOpen && ticketId) {
            fetchMessages();
            const channel = supabase
                .channel(`messages_${ticketId}`)
                .on('postgres_changes',
                    { event: 'INSERT', schema: 'public', table: 'ticket_messages', filter: `ticket_id=eq.${ticketId}` },
                    (payload) => {
                        setMessages(prev => [...prev, payload.new]);
                        setTimeout(scrollToBottom, 100);
                    }
                )
                .subscribe();

            return () => {
                supabase.removeChannel(channel);
            };
        }
    }, [isOpen, ticketId]);

    useEffect(scrollToBottom, [messages]);

    const fetchMessages = async () => {
        setLoading(true);
        const { data, error } = await supabase
            .from('ticket_messages')
            .select('*')
            .eq('ticket_id', ticketId)
            .order('created_at', { ascending: true });

        if (error) {
            console.error('Error fetching messages:', error);
        } else {
            setMessages(data || []);
            localStorage.setItem(`last_read_ticket_${ticketId}`, new Date().toISOString());
            window.dispatchEvent(new Event('storage_trigger'));
        }
        setLoading(false);
    };

    const handleSendMessage = async (e) => {
        e.preventDefault();
        if (!newMessage.trim()) return;

        const messageData = {
            ticket_id: ticketId,
            sender_id: currentUser.id,
            content: newMessage.trim()
        };

        const { error } = await supabase.from('ticket_messages').insert(messageData);

        if (error) {
            showToast('ส่งข้อความไม่สำเร็จ', 'error');
        } else {
            setNewMessage('');
        }
    };

    if (!isOpen) return null;

    return (

        <div className="fixed inset-0 bg-gray-50/80 backdrop-blur-sm z-[11000] flex items-center justify-center p-0 sm:p-6 animate-in fade-in duration-500">
            <div className="bg-white/95 backdrop-blur-3xl w-full sm:max-w-lg h-full sm:h-[80vh] rounded-none sm:rounded-[3rem] flex flex-col border border-gray-100 shadow-2xl overflow-hidden animate-in zoom-in-95 duration-500">
                <div className="px-5 sm:px-8 py-4 sm:py-6 bg-white border-b border-gray-100 flex justify-between items-center relative z-10">
                    <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-blue-500 to-indigo-600"></div>
                    <div className="flex items-center gap-3 sm:gap-4">
                        <div className="relative group/avatar">
                            <div className="absolute -inset-1 bg-gradient-to-tr from-blue-500 to-indigo-600 rounded-xl sm:rounded-[1.4rem] opacity-20 blur-sm group-hover/avatar:opacity-40 transition-opacity"></div>
                            {otherPartyAvatar ? (
                                <img
                                    src={otherPartyAvatar}
                                    alt={otherPartyName}
                                    className="w-10 h-10 sm:w-12 sm:h-12 rounded-lg sm:rounded-[1.2rem] object-cover border-2 border-white shadow-xl relative z-10"
                                />
                            ) : (
                                <div className="w-10 h-10 sm:w-12 sm:h-12 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-lg sm:rounded-[1.2rem] flex items-center justify-center text-xl sm:text-2xl shadow-xl shadow-blue-500/20 text-white relative z-10">
                                    💬
                                </div>
                            )}
                            <div className="absolute -bottom-0.5 -right-0.5 w-3 h-3 sm:w-4 sm:h-4 bg-green-500 border-2 border-white rounded-full z-20"></div>
                        </div>
                        <div>
                            <div className="text-base sm:text-lg font-black text-gray-900 leading-tight uppercase tracking-tight">{otherPartyName || 'Operator'}</div>
                            <div className="text-[9px] sm:text-[10px] text-gray-400 font-black uppercase tracking-[0.2em] mt-0.5 sm:mt-1">ID: {ticketId.substring(0, 8)}</div>
                        </div>
                    </div>
                    <button onClick={onClose} className="p-2 sm:p-3 bg-gray-50 hover:bg-gray-100 text-gray-400 hover:text-gray-900 rounded-xl sm:rounded-2xl transition-all active:scale-95 border border-gray-100">
                        <svg className="w-5 h-5 sm:w-6 sm:h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M6 18L18 6M6 6l12 12" />
                        </svg>
                    </button>
                </div>

                <div className="flex-1 overflow-y-auto px-5 sm:px-8 py-5 sm:py-8 space-y-3 sm:space-y-4 thin-scrollbar bg-gray-50/50">
                    {loading ? (
                        <div className="flex flex-col items-center justify-center h-full gap-4">
                            <div className="w-8 h-8 sm:w-10 sm:h-10 border-[3px] border-blue-100 border-t-blue-500 rounded-full animate-spin"></div>
                            <p className="text-gray-400 text-[9px] sm:text-[10px] font-black uppercase tracking-[0.3em]">กำลังโหลดข้อความ...</p>
                        </div>
                    ) : messages.length === 0 ? (
                        <div className="flex flex-col items-center justify-center h-full text-center p-8 sm:p-12 space-y-4 opacity-40">
                            <div className="text-4xl sm:text-6xl animate-float filter grayscale opacity-50">🛰️</div>
                            <div className="space-y-1">
                                <p className="font-black text-gray-400 text-[9px] sm:text-[10px] uppercase tracking-[0.4em]">ไม่มีข้อความ</p>
                                <p className="text-[8px] sm:text-[9px] text-gray-400 font-bold uppercase tracking-widest max-w-[200px] leading-relaxed mx-auto">ไม่มีข้อความในช่องทางนี้</p>
                            </div>
                        </div>
                    ) : (
                        messages.map((msg, index) => {
                            const isMe = msg.sender_id === currentUser.id;
                            return (
                                <div key={msg.id || index} className={`flex ${isMe ? 'justify-end' : 'justify-start'} animate-in slide-in-from-bottom-2 duration-300`}>
                                    <div className={`max-w-[90%] sm:max-w-[85%] px-4 sm:px-5 py-3 sm:py-4 rounded-2xl sm:rounded-[1.8rem] shadow-sm relative group transition-all active:scale-[0.98] ${isMe
                                        ? 'bg-blue-600 text-white rounded-tr-none'
                                        : 'bg-white text-gray-800 border border-gray-100 rounded-tl-none'
                                        }`}>
                                        <div className="text-[13px] sm:text-sm font-bold leading-relaxed tracking-tight">{msg.content}</div>
                                        <div className={`text-[8px] sm:text-[10px] mt-1 sm:mt-2 opacity-60 font-black uppercase tracking-widest ${isMe ? 'text-right' : 'text-left'}`}>
                                            {new Date(msg.created_at).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: false })}
                                        </div>
                                    </div>
                                </div>
                            );
                        })
                    )}
                    <div ref={messagesEndRef} />
                </div>

                <form onSubmit={handleSendMessage} className="p-4 sm:p-6 bg-white border-t border-gray-100 flex gap-2 sm:gap-4 items-center shadow-[0_-10px_40px_-15px_rgba(0,0,0,0.05)]">
                    <div className="flex-1 relative group">
                        <input
                            type="text"
                            value={newMessage}
                            onChange={(e) => setNewMessage(e.target.value)}
                            placeholder="พิมพ์ข้อความ..."
                            className="w-full bg-gray-50 border border-gray-100 rounded-2xl sm:rounded-[1.8rem] pl-4 sm:pl-6 pr-4 sm:pr-6 py-3 sm:py-4 text-gray-900 text-[13px] sm:text-sm outline-none focus:bg-white focus:border-blue-500/50 transition-all font-bold placeholder:text-gray-400 shadow-inner"
                        />
                    </div>
                    <button
                        type="submit"
                        disabled={!newMessage.trim()}
                        className={`bg-blue-600 text-white hover:bg-blue-700 disabled:opacity-90 disabled:shadow-none disabled:cursor-not-allowed font-black py-3 sm:py-4 px-4 sm:px-4 rounded-2xl sm:rounded-[1.8rem] shadow-lg active:scale-95 transition-all text-sm uppercase flex items-center justify-center gap-2 group/send ${newMessage.trim() ? 'bg-blue-700 shadow-blue-500/50' : ''}`}
                    >
                        <svg className={`w-5 h-5 transition-transform duration-300 ${newMessage.trim() ? 'translate-x-0.5 -rotate-12' : ''}`} fill="currentColor" viewBox="0 0 24 24">
                            <path d="M3.4 20.4l17.45-7.48c.81-.35.81-1.49 0-1.84L3.4 3.6c-.66-.29-1.39.2-1.39.91L2 9.12c0 .5.37.93.87.99L17 12 2.87 13.88c-.5.07-.87.5-.87 1l.01 4.61c0 .71.73 1.2 1.39.91z" />
                        </svg>
                    </button>
                </form>
            </div>
        </div>
    );
}
