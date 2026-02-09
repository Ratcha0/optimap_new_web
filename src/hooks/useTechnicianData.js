import { useState, useEffect, useRef, useCallback } from 'react';
import { supabase } from '../utils/supabaseClient';
import { useToast } from '../components/ui/ToastNotification';

export function useTechnicianData(user) {
    const [pendingJobsCount, setPendingJobsCount] = useState(0);
    const [unreadMessagesCount, setUnreadMessagesCount] = useState(0);
    const { showToast } = useToast();

    useEffect(() => {
        if (!user?.id) return;

        const fetchPendingCount = async () => {
            const { count, error } = await supabase
                .from('support_tickets')
                .select('*', { count: 'exact', head: true })
                .eq('status', 'pending');

            if (!error) setPendingJobsCount(count || 0);
        };

        fetchPendingCount();

        const channel = supabase
            .channel('pending_jobs_count')
            .on('postgres_changes',
                { event: '*', schema: 'public', table: 'support_tickets' },
                () => fetchPendingCount()
            )
            .subscribe();


        const msgChannel = supabase
            .channel('tech_messages_count')
            .on('postgres_changes',
                { event: 'INSERT', schema: 'public', table: 'ticket_messages' },
                (payload) => {

                    if (payload.new.sender_id !== user.id) {
                        setUnreadMessagesCount(prev => prev + 1);
                        showToast('คุณมีข้อความใหม่จากลูกค้า', 'info');
                    }
                }
            )
            .subscribe();

        return () => {
            supabase.removeChannel(channel);
            supabase.removeChannel(msgChannel);
        };
    }, [user?.id, showToast]);

    const syncPosition = useCallback(async (coords) => {
        if (!user?.id || !coords) return;

        await supabase.from('profiles').update({
            last_lat: coords[0],
            last_lng: coords[1],
            last_updated: new Date().toISOString()
        }).eq('id', user.id);
    }, [user?.id]);

    return {
        pendingJobsCount,
        unreadMessagesCount,
        setUnreadMessagesCount,
        syncPosition
    };
}
