import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../utils/supabaseClient';
import { doc, setDoc } from 'firebase/firestore';
import { db } from '../utils/firebaseClient';

import { useToast } from '../components/ui/ToastNotification';
import { retryOperation } from '../utils/retryUtils';

export function useCustomerData(user) {
    const [techLocations, setTechLocations] = useState([]);
    const [userProfile, setUserProfile] = useState(null);
    const { showToast } = useToast();


    const fetchTechs = useCallback(async () => {
        if (!user) return;
        
        await retryOperation(async () => {
          
            const { data: tickets, error: ticketError } = await supabase
                .from('support_tickets')
                .select('id, technician_id')
                .eq('user_id', user.id)
                .in('status', ['accepted', 'in_progress']);
            
            if (ticketError) throw ticketError;

            if (!tickets || tickets.length === 0) {
                setTechLocations([]);
                return;
            }

            const ticketIds = tickets.map(t => t.id);
            const primaryTechIds = tickets.map(t => t.technician_id).filter(id => id !== null);

         
            const { data: assignments, error: assignError } = await supabase
                .from('ticket_assignments')
                .select('technician_id, ticket_id')
                .in('ticket_id', ticketIds)
                .eq('status', 'accepted');
            
            if (assignError) throw assignError;

            const assignedTechIds = assignments ? assignments.map(a => a.technician_id) : [];
            
        
            const allTechIds = [...new Set([...primaryTechIds, ...assignedTechIds])];

            if (allTechIds.length === 0) {
                setTechLocations([]);
                return;
            }

            
            const [{ data, error: profileError }, { data: allCarStatus }] = await Promise.all([
                supabase.from('profiles')
                    .select('id, full_name, last_lat, last_lng, avatar_url, phone, team_name, car_reg, vin')
                    .in('id', allTechIds)
                    .not('last_lat', 'is', null),
                supabase.from('car_status').select('*')
            ]);
            
            if (profileError) throw profileError;

            if (data) {
                const enrichedData = data.map(profile => {
                    let ticketId = null;
                    const primaryTicket = tickets.find(t => t.technician_id === profile.id);
                    if (primaryTicket) {
                        ticketId = primaryTicket.id;
                    } else {
                        const assignment = assignments?.find(a => a.technician_id === profile.id);
                        if (assignment) ticketId = assignment.ticket_id;
                    }

                    // Manual join by VIN (with fallback for simulation and legacy ID matching)
                    const derivedVin = profile.vin || `SIM-${profile.id.substring(0, 8).toUpperCase()}`;
                    let carStatus = allCarStatus?.find(cs => cs.vin === derivedVin);
                    if (!carStatus) {
                        carStatus = allCarStatus?.find(cs => cs.id === profile.id);
                    }

                    return {
                        ...profile,
                        car_status: carStatus ? [carStatus] : [],
                        is_primary: primaryTechIds.includes(profile.id),
                        active_ticket_id: ticketId
                    };
                });
                setTechLocations(enrichedData);
            } else {
                setTechLocations([]);
            }
        });
    }, [user]);

    const fetchProfile = useCallback(async () => {
        if (!user) return;
        const { data } = await supabase.from('profiles').select('*').eq('id', user.id).single();
        if (data) setUserProfile(data);
    }, [user]);

    useEffect(() => {
        fetchTechs();
        fetchProfile();

        let profileChannel = null;
        let statusChannel = null;

      
        const debounceFetch = () => {
            const timeoutId = setTimeout(fetchTechs, 1000);
            return () => clearTimeout(timeoutId);
        };

        const subTimeout = setTimeout(() => {
            if (!user) return;
            profileChannel = supabase.channel('customer-tech-tracking')
                .on('postgres_changes', 
                    { event: 'UPDATE', schema: 'public', table: 'profiles' },
                    (payload) => {
                        
                        fetchTechs();
                    }
                )
                .subscribe();

            
            statusChannel = supabase.channel('customer-tech-car-status')
                .on('postgres_changes',
                    { event: 'UPDATE', schema: 'public', table: 'car_status' },
                    () => fetchTechs()
                )
                .subscribe();
        }, 1000);

        return () => {
            clearTimeout(subTimeout);
            if (profileChannel) supabase.removeChannel(profileChannel);
            if (statusChannel) supabase.removeChannel(statusChannel);
        };
    }, [fetchTechs, fetchProfile, user?.id]);

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
                   
                }
            }

            return { success: true, ticket };
        } catch (err) {
           
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
