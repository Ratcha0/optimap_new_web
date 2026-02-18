import React, { useState, useEffect } from 'react';
import { supabase } from '../../../utils/supabaseClient';
import { reverseGeocode } from '../../../utils/mapUtils';
import { useToast } from '../../ui/ToastNotification';
import MessageModal from '../../modals/MessageModal';
import TeamInviteModal from '../../modals/TeamInviteModal';
import JobCard from './JobCard';
import { TICKET_STATUS } from '../../../constants/visuals';

export default function JobListView({ user, onAcceptJob, setViewMode }) {
    const [jobs, setJobs] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [isMessageOpen, setIsMessageOpen] = useState(false);
    const [activeTicket, setActiveTicket] = useState(null);
    const [unreadJobs, setUnreadJobs] = useState(new Set());
    const [isInviteOpen, setIsInviteOpen] = useState(false);
    const [activeInviteTicket, setActiveInviteTicket] = useState(null);
    const { showToast } = useToast();

    useEffect(() => {
        fetchJobs();
        const subscription = supabase
            .channel('public:support_tickets')
            .on('postgres_changes', { event: '*', schema: 'public', table: 'support_tickets' }, () => {
                fetchJobs();
            })
            .subscribe();

        const msgSubscription = supabase
            .channel('job_list_messages')
            .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'ticket_messages' }, (payload) => {
                if (payload.new.sender_id !== user.id) {
                    setUnreadJobs(prev => new Set(prev).add(payload.new.ticket_id));
                }
            })
            .subscribe();

        const assignSubscription = supabase
            .channel('job_assignments_sync')
            .on('postgres_changes', { event: '*', schema: 'public', table: 'ticket_assignments' }, () => {
                fetchJobs();
            })
            .subscribe();

        return () => {
            supabase.removeChannel(subscription);
            supabase.removeChannel(msgSubscription);
            supabase.removeChannel(assignSubscription);
        };
    }, [user?.id]);

    const fetchJobs = async () => {
        try {
            setLoading(true);
            setError(null);

            let { data, error } = await supabase
                .from('support_tickets')
                .select(`
                    *, 
                    profiles:user_id(full_name, avatar_url, email),
                    ticket_messages(sender_id, created_at),
                    ticket_assignments(
                        id, technician_id, status,
                        profiles:technician_id(full_name, avatar_url)
                    )
                `)
                .order('created_at', { ascending: false });

            if (error) {
                const fallback = await supabase
                    .from('support_tickets')
                    .select('*')
                    .order('created_at', { ascending: false });
                if (fallback.error) throw fallback.error;
                data = fallback.data;
            }

            const enrichedJobs = [];
            for (const job of (data || [])) {
                if (!job.location_name && job.lat && job.lng) {
                    const addr = await reverseGeocode(job.lat, job.lng);
                    enrichedJobs.push({ ...job, location_name: addr });
                } else {
                    enrichedJobs.push(job);
                }
            }

            const unreadIds = new Set();
            enrichedJobs.forEach(job => {
                if (job.ticket_messages?.length > 0) {
                    const sortedMsgs = [...job.ticket_messages].sort((a, b) =>
                        new Date(b.created_at) - new Date(a.created_at)
                    );
                    const lastMsg = sortedMsgs[0];
                    if (lastMsg.sender_id !== user?.id) {
                        const lastReadStr = localStorage.getItem(`last_read_ticket_${job.id}`);
                        if (!lastReadStr || new Date(lastReadStr) < new Date(lastMsg.created_at)) {
                            unreadIds.add(job.id);
                        }
                    }
                }
            });
            setUnreadJobs(unreadIds);
            setJobs(enrichedJobs);
        } catch (err) {
            setError(err.message);
        } finally {
            setLoading(false);
        }
    };

    const handleUpdateStatus = async (jobId, newStatus) => {
        try {
            const currentJob = jobs.find(j => j.id === jobId);
            const updatePayload = { status: newStatus };
            
            if (newStatus === 'pending') {
                updatePayload.technician_id = null;
            } else if (!currentJob?.technician_id && (newStatus === 'accepted' || newStatus === 'in_progress')) {
                updatePayload.technician_id = user?.id;
            }

            const { error: updateError } = await supabase
                .from('support_tickets')
                .update(updatePayload)
                .eq('id', jobId);

            if (updateError) throw updateError;

            if (newStatus === 'accepted' || newStatus === 'in_progress') {
                const { data: existing } = await supabase
                    .from('ticket_assignments')
                    .select('id')
                    .eq('ticket_id', jobId)
                    .eq('technician_id', user?.id)
                    .maybeSingle();

                if (!existing) {
                    await supabase
                        .from('ticket_assignments')
                        .insert({
                            ticket_id: jobId,
                            technician_id: user?.id,
                            role: 'primary',
                            status: 'accepted'
                        });
                }
            }

            fetchJobs();
            showToast('อัปเดตสถานะงานเรียบร้อยแล้ว', 'success');
        } catch (err) {
            showToast('ไม่สามารถเปลี่ยนสถานะได้: ' + err.message, 'error');
        }
    };

    const getStatusColor = (status) => {
        const config = TICKET_STATUS[status.toUpperCase()] || { hex: '#6B7280' };
        return config.hex;
    };

    const getStatusText = (status) => {
        const config = TICKET_STATUS[status.toUpperCase()] || { label: status };
        return config.label;
    };

    const handleOpenInvite = (ticket) => {
        setActiveInviteTicket(ticket);
        setIsInviteOpen(true);
    };

    return (
        <div className="min-h-screen bg-gray-50 flex flex-col font-sans text-gray-900">
            <header className="p-3 sm:p-6 border-b border-gray-200 sticky top-0 bg-white/90 backdrop-blur-lg z-10 flex flex-col gap-2 sm:gap-4 shadow-sm">
                <div className="flex items-center gap-4">
                    <button
                        onClick={() => setViewMode('map')}
                        className="p-2 bg-gray-100 hover:bg-gray-200 rounded-full transition-colors text-gray-700 hover:text-blue-600"
                    >
                        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10 19l-7-7m0 0l7-7m-7 7h18" />
                        </svg>
                    </button>
                    <div>
                        <h1 className="text-xl font-bold text-gray-900">รายการแจ้งซ่อม</h1>
                    </div>
                </div>

                <div className="flex justify-between items-center text-[10px] sm:text-sm px-1 text-gray-400 font-bold uppercase tracking-wider">
                    <span>ทั้งหมด {jobs.length} รายการ</span>
                    {error && <span className="text-red-500 font-bold">⚠️ {error}</span>}
                </div>
            </header>

            <main className="flex-grow p-4 space-y-4">
                {loading && jobs.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-20 space-y-4">
                        <div className="w-10 h-10 border-4 border-white/10 border-t-blue-500 rounded-full animate-spin"></div>
                        <p className="text-gray-500 animate-pulse">กำลังโหลดรายการงาน...</p>
                    </div>
                ) : jobs.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-40 text-gray-600 grayscale">
                        <svg className="w-20 h-20 mb-4 opacity-20" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01" />
                        </svg>
                        <p className="font-medium text-lg">ไม่มีรายการแจ้งซ่อมในขณะนี้</p>
                    </div>
                ) : (
                    jobs.map(job => (
                        <JobCard
                            key={job.id}
                            job={job}
                            unreadJobs={unreadJobs}
                            user={user}
                            handleUpdateStatus={handleUpdateStatus}
                            onAcceptJob={onAcceptJob}
                            setViewMode={setViewMode}
                            setActiveTicket={setActiveTicket}
                            setIsMessageOpen={setIsMessageOpen}
                            setUnreadJobs={setUnreadJobs}
                            getStatusColor={getStatusColor}
                            getStatusText={getStatusText}
                            onOpenInvite={handleOpenInvite}
                        />
                    ))
                )}
            </main>

            {/* Modals at Root Level */}
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

            {activeInviteTicket && (
                <TeamInviteModal
                    isOpen={isInviteOpen}
                    onClose={() => setIsInviteOpen(false)}
                    ticketId={activeInviteTicket.id}
                    currentUser={user}
                />
            )}
        </div>
    );
}
