import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../utils/supabaseClient';
import { doc, setDoc } from 'firebase/firestore';
import { db } from '../utils/firebaseClient';
import { useToast } from '../components/ui/ToastNotification';

export function useCustomerData(user) {
    const [techLocations, setTechLocations] = useState([]);
    const [userProfile, setUserProfile] = useState(null);
    const { showToast } = useToast();

    const fetchTechs = useCallback(async () => {
        if (!user) return;
        const { data: tickets } = await supabase
            .from('support_tickets')
            .select('technician_id')
            .eq('user_id', user.id)
            .eq('status', 'in_progress')
            .not('technician_id', 'is', null);

        if (!tickets || tickets.length === 0) {
            setTechLocations([]);
            return;
        }

        const techIds = tickets.map(t => t.technician_id);
        const { data } = await supabase
            .from('profiles')
            .select('id, full_name, last_lat, last_lng, avatar_url, phone, team_name, car_reg')
            .in('id', techIds)
            .not('last_lat', 'is', null);

        setTechLocations(data || []);
    }, [user]);

    const fetchProfile = useCallback(async () => {
        if (!user) return;
        const { data } = await supabase.from('profiles').select('*').eq('id', user.id).single();
        if (data) setUserProfile(data);
    }, [user]);

    useEffect(() => {
        fetchTechs();
        fetchProfile();
        const interval = setInterval(fetchTechs, 5000);
        return () => clearInterval(interval);
    }, [fetchTechs, fetchProfile]);

    const submitTicket = useCallback(async (ticketData, firebaseData = null) => {
        try {
            const { data: ticket, error } = await supabase
                .from('support_tickets')
                .insert(ticketData)
                .select()
                .single();

            if (error) throw error;

            if (ticket && firebaseData) {
                try {
                    await setDoc(doc(db, "tracking", "สำนักงานใหญ่"), {
                        ...firebaseData,
                        updated_at: new Date().toISOString()
                    });
                } catch (firebaseErr) {
                    console.error('Firebase Firestore Error:', firebaseErr);
                }
            }

            return { success: true, ticket };
        } catch (err) {
            console.error('Error submitting ticket:', err);
            return { success: false, error: err };
        }
    }, []);

    return {
        techLocations,
        userProfile,
        fetchProfile,
        fetchTechs,
        submitTicket
    };
}
