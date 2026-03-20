import { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { supabase } from '../utils/supabaseClient';
import { useToast } from '../components/ui/ToastNotification';
import { useConnectionManager } from './useConnectionManager';


import { retryOperation } from '../utils/retryUtils';
import { speak } from '../utils/voiceUtils';

export function useTechnicianData(user, userProfile = null) {
    const [pendingJobsCount, setPendingJobsCount] = useState(0);
    const [unreadMessagesCount, setUnreadMessagesCount] = useState(0);
    const { showToast } = useToast();
    const { isOnline, queueUpdate } = useConnectionManager(user);
    const isMountedRef = useRef(true);

    const derivedVin = useMemo(() => {
        if (!user?.id) return null;
        return userProfile?.vin || `SIM-${user.id.substring(0, 8).toUpperCase()}`;
    }, [user?.id, userProfile?.vin]);

    useEffect(() => {
        isMountedRef.current = true;
        return () => { isMountedRef.current = false; };
    }, []);

    useEffect(() => {

        if (!user?.id) return;

        const fetchPendingCount = async () => {
             await retryOperation(async () => {
                const { count, error } = await supabase
                    .from('support_tickets')
                    .select('*', { count: 'exact', head: true })
                    .eq('status', 'pending');

                if (error) throw error;
                if (isMountedRef.current) setPendingJobsCount(count || 0);
            });
        };

        const debounceRef = { timer: null };
        const debouncedFetch = () => {
            if (debounceRef.timer) clearTimeout(debounceRef.timer);
            debounceRef.timer = setTimeout(fetchPendingCount, 1500);
        };

        fetchPendingCount();

        let channel = null;
        let msgChannel = null;

        const subTimeout = setTimeout(() => {
            if (!isMountedRef.current || !user?.id) return;

            channel = supabase
                .channel('pending_jobs_count')
                .on('postgres_changes',
                    { event: 'INSERT', schema: 'public', table: 'support_tickets' },
                    (payload) => {
                        debouncedFetch();
                        if (payload.new.status === 'pending') {
                            showToast('มีรายการแจ้งซ่อมใหม่เข้ามา!', 'info');
                            try { speak("มีรายการแจ้งซ่อมใหม่เข้ามาค่ะ"); } catch(e){}
                        }
                    }
                )
                .on('postgres_changes',
                    { event: 'UPDATE', schema: 'public', table: 'support_tickets' },
                    (payload) => {
                        if (payload.new.status !== payload.old.status) debouncedFetch();
                    }
                );
            
            channel.subscribe();

           
            msgChannel = supabase
                .channel(`tech-messages-${user.id}`)
                .on('postgres_changes',
                    { event: 'INSERT', schema: 'public', table: 'ticket_messages' },
                    async (payload) => {
                   
                        if (payload.new.sender_id === user.id || payload.new.is_system) return;

                      
                        const { data: ticket } = await supabase
                            .from('support_tickets')
                            .select('id, technician_id')
                            .eq('id', payload.new.ticket_id)
                            .maybeSingle();

               
                        const isPrimary = ticket?.technician_id === user.id;

                        let isAssigned = false;
                        if (!isPrimary) {
                            const { data: assign } = await supabase
                                .from('ticket_assignments')
                                .select('id')
                                .eq('ticket_id', payload.new.ticket_id)
                                .eq('technician_id', user.id)
                                .eq('status', 'accepted')
                                .maybeSingle();
                            isAssigned = !!assign;
                        }

                        if (isPrimary || isAssigned) {
                            setUnreadMessagesCount(prev => prev + 1);
                            showToast('คุณมีข้อความใหม่ในงานที่ดูแล', 'info');
                            try { speak("มีข้อความใหม่เข้ามาค่ะ"); } catch(e){}
                        }
                    }
                );
            
            msgChannel.subscribe();
        }, 800);

        return () => {
            clearTimeout(subTimeout);
            if (debounceRef.timer) clearTimeout(debounceRef.timer);
            if (channel) supabase.removeChannel(channel);
            if (msgChannel) supabase.removeChannel(msgChannel);
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
        if (!derivedVin) return;

        const fetchCarStatus = async () => {
             await retryOperation(async () => {
                const { data, error } = await supabase
                    .from('car_status')
                    .select('*')
                    .eq('vin', derivedVin)
                    .maybeSingle();
                
                if (error) throw error;
                if (data && isMountedRef.current) setCarStatus(validateCarStatus(data));
            });
        };

        fetchCarStatus();

        let statusChannel = null;

        const subTimeout = setTimeout(() => {
            if (!isMountedRef.current || !derivedVin) return;

            statusChannel = supabase.channel(`my-status-${derivedVin}`)
                .on('postgres_changes',
                    { event: '*', schema: 'public', table: 'car_status', filter: `vin=eq.${derivedVin}` },
                    (payload) => {
                        const newData = payload.new || payload.old;
                        if (newData) {
                            setCarStatus(prev => validateCarStatus({ ...prev, ...newData }));
                        }
                    }
                );
            
            statusChannel.subscribe();
        }, 1000);

        return () => {
            clearTimeout(subTimeout);
            if (statusChannel) supabase.removeChannel(statusChannel);
        };
    }, [derivedVin]);

    const logLocation = useCallback(async (coords) => {
        if (!user?.id) return; 
        
        if (!coords || isNaN(coords[0]) || isNaN(coords[1])) {
            console.error('Invalid coordinates for logging:', coords);
            return;
        }
        
        try {
            const { error } = await supabase.from('location_logs').insert({
                technician_id: user.id,
                lat: parseFloat(coords[0]),
                lng: parseFloat(coords[1]),
                speed: 0,
                heading: 0
            });
            
            if (error) {
                console.error('Supabase error logging location:', error);
                throw error;
            }
            
            showToast('บันทึกตำแหน่ง Check-in เรียบร้อย', 'success');
        } catch (e) {
            console.error('Failed to log location event fully:', e);
            showToast(`บันทึกไม่สำเร็จ: ${e.message || 'ปัญหาด้านสิทธิ์การเข้าถึง'}`, 'error');
        }
    }, [user?.id, showToast]);

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
        } catch {
            queueUpdate('profiles', user.id, updateData);
        }
    }, [user?.id, queueUpdate]);

    return {
        pendingJobsCount,
        unreadMessagesCount,
        setUnreadMessagesCount,
        syncPosition,
        logLocation,
        carStatus,
        isOnline
    };
};
