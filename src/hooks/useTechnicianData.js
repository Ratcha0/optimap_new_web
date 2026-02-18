import { useState, useEffect, useRef, useCallback } from 'react';
import { supabase } from '../utils/supabaseClient';
import { useToast } from '../components/ui/ToastNotification';
import { useConnectionManager } from './useConnectionManager';


import { retryOperation } from '../utils/retryUtils';

export function useTechnicianData(user) {
    const [pendingJobsCount, setPendingJobsCount] = useState(0);
    const [unreadMessagesCount, setUnreadMessagesCount] = useState(0);
    const { showToast } = useToast();
    const { isOnline, queueUpdate } = useConnectionManager(user);

    useEffect(() => {

        if (!user?.id) return;

        const fetchPendingCount = async () => {
             await retryOperation(async () => {
                const { count, error } = await supabase
                    .from('support_tickets')
                    .select('*', { count: 'exact', head: true })
                    .eq('status', 'pending');

                if (error) throw error;
                setPendingJobsCount(count || 0);
            });
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

                    if (payload.new.sender_id !== user.id && !payload.new.is_system) {
                        setUnreadMessagesCount(prev => prev + 1);
                        showToast('คุณมีข้อความใหม่', 'info');
                    }
                }
            )
            .subscribe();

        return () => {
            supabase.removeChannel(channel);
            supabase.removeChannel(msgChannel);
        };
    }, [user?.id, showToast]);

    const [carStatus, setCarStatus] = useState(null);

    const validateCarStatus = (data) => {
        if (!data) return null;
        return {
            ...data,
            temp: typeof data.temp === 'number' ? data.temp : 0,
            battery: typeof data.battery === 'number' ? data.battery : 0,
            fuel_level: typeof data.fuel_level === 'number' ? data.fuel_level : 0,
            oil_level: typeof data.oil_level === 'number' ? data.oil_level : 0,
            lat: typeof data.lat === 'number' ? data.lat : null,
            lng: typeof data.lng === 'number' ? data.lng : null
        };
    };

    useEffect(() => {
        if (!user?.id) return;

        const fetchCarStatus = async () => {
             await retryOperation(async () => {
                const { data, error } = await supabase
                    .from('car_status')
                    .select('*')
                    .eq('id', user.id)
                    .maybeSingle();
                
                if (error) throw error;
                if (data) setCarStatus(validateCarStatus(data));
            });
        };

        fetchCarStatus();

        const statusChannel = supabase.channel(`my-status-${user.id}`)
            .on('postgres_changes',
                { event: '*', schema: 'public', table: 'car_status', filter: `id=eq.${user.id}` },
                (payload) => {
                    const newData = payload.new || payload.old;
                    if (newData) {
                        setCarStatus(prev => validateCarStatus({ ...prev, ...newData }));
                    }
                }
            ).subscribe();

        return () => supabase.removeChannel(statusChannel);
    }, [user?.id]);

    const syncPosition = useCallback(async (coords) => {
        if (!user?.id || !coords) return;

        const updateData = {
            last_lat: coords[0],
            last_lng: coords[1],
            last_updated: new Date().toISOString()
        };

        if (!navigator.onLine) {
            queueUpdate('profiles', user.id, updateData);
            return;
        }

        try {
            const { error } = await supabase.from('profiles').update(updateData).eq('id', user.id);
            if (error) throw error;
        } catch (err) {
            queueUpdate('profiles', user.id, updateData);
        }
    }, [user?.id, queueUpdate]);

    return {
        pendingJobsCount,
        unreadMessagesCount,
        setUnreadMessagesCount,
        syncPosition,
        carStatus,
        isOnline
    };
}
