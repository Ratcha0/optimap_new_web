import { useState, useEffect, useRef, useCallback } from 'react';
import { supabase } from '../utils/supabaseClient';
import { speak } from '../utils/voiceUtils';
import { useToast } from '../components/ui/ToastNotification';

export function useTeamManager(user, setViewMode) {
    const [otherTechs, setOtherTechs] = useState([]);
    const [myAssignment, setMyAssignment] = useState({ ticket_id: null, is_primary: false, status: 'none' });
    const [pendingInvite, setPendingInvite] = useState(null);
    const { showToast } = useToast();
    
    const dismissedInvitesRef = useRef(new Set(JSON.parse(localStorage.getItem('dismissed_invites') || '[]')));
    const pendingInviteRef = useRef(null);

    useEffect(() => {
        pendingInviteRef.current = pendingInvite;
    }, [pendingInvite]);

    const fetchOtherTechs = useCallback(async () => {
        if (!user) return;
        const thirtyMinsAgo = new Date(Date.now() - 30 * 60 * 1000).toISOString();

        try {
            const { data: activeJobs } = await supabase
                .from('support_tickets')
                .select('id, technician_id')
                .not('technician_id', 'is', null)
                .not('status', 'in', '("completed","canceled")');

            const activeTicketIds = activeJobs?.map(j => j.id) || [];

            const { data: allAssignments } = await supabase
                .from('ticket_assignments')
                .select('ticket_id, technician_id, role, status')
                .in('status', ['accepted', 'pending'])
                .in('ticket_id', activeTicketIds);

            const assignedTechIds = allAssignments?.map(a => a.technician_id) || [];
            const leadTechIds = activeJobs?.map(j => j.technician_id) || [];
            const relevantTechIds = [...new Set([...assignedTechIds, ...leadTechIds])];

            const { data: profiles } = await supabase
                .from('profiles')
                .select(`
                    id, full_name, last_lat, last_lng, avatar_url, role, last_updated, phone, team_name, car_reg,
                    car_status(engine_temp, battery_volt, water_level, fuel_level, oil_level, vehicle_speed, odometer, engine_status)
                `)
                .eq('role', 'technician')
                .neq('id', user.id)
                .or(`last_updated.gte.${thirtyMinsAgo},id.in.("${relevantTechIds.join('","')}")`);

            if (!profiles) return;

            const processedData = profiles.map(tech => {
                const headJob = activeJobs?.find(j => j.technician_id === tech.id);
                const acceptedAssign = allAssignments?.find(a => a.technician_id === tech.id && a.status === 'accepted');
                const anyAssign = allAssignments?.find(a => a.technician_id === tech.id);
                
                return {
                    ...tech,
                    active_ticket_id: headJob?.id || acceptedAssign?.ticket_id || null,
                    is_primary: !!headJob || acceptedAssign?.role === 'primary' || acceptedAssign?.role === 'technician',
                    assignment_status: headJob ? 'active' : (anyAssign?.status || 'none')
                };
            });

            setOtherTechs(processedData);
        } catch (err) {
            
        }
    }, [user]);

    const fetchMyAssignment = useCallback(async () => {
        if (!user) return;
        
        try {
            const { data: myHeadJob } = await supabase
                .from('support_tickets')
                .select('id')
                .eq('technician_id', user.id)
                .not('status', 'in', '("completed","canceled")')
                .maybeSingle();

            if (myHeadJob) {
                setMyAssignment({ ticket_id: myHeadJob.id, is_primary: true, status: 'active' });
                return;
            }

            const { data: myAssignments } = await supabase
                .from('ticket_assignments')
                .select('ticket_id, role, status')
                .eq('technician_id', user.id);
            
            const active = myAssignments?.find(a => a.status === 'accepted') || myAssignments?.[0];
            
            setMyAssignment({
                ticket_id: active?.ticket_id || null,
                is_primary: active?.role === 'primary' || active?.role === 'technician',
                status: active?.status || 'none'
            });
        } catch (err) {
            
        }
    }, [user]);

    const fetchInviteDetails = useCallback(async (assignment) => {
        if (dismissedInvitesRef.current.has(assignment.id)) return;
        if (pendingInviteRef.current?.id === assignment.id) return;

        try {
            const { data: ticketData } = await supabase
                .from('support_tickets')
                .select(`
                    id, issue_type,
                    sender:technician_id(full_name),
                    customer:user_id(full_name)
                `)
                .eq('id', assignment.ticket_id)
                .single();
            
            const jobName = ticketData ? `${ticketData.issue_type} (ลูกค้า: ${ticketData.customer?.full_name || 'ทั่วไป'})` : 'งานซ่อม';

            const inviteData = {
                id: assignment.id,
                ticket_id: assignment.ticket_id,
                sender_name: ticketData?.sender?.full_name || 'เพื่อนช่าง',
                job_name: jobName
            };

            setPendingInvite(inviteData);
            speak(`คุณ ${inviteData.sender_name} ชวนคุณเข้าร่วมทีมงาน ${ticketData?.issue_type || ''} ค่ะ`);
        } catch (err) {
          
        }
    }, []);

    const checkPendingInvite = useCallback(async () => {
        if (pendingInviteRef.current) return;

        try {
            const { data: activeTickets } = await supabase
                .from('support_tickets')
                .select('id')
                .not('status', 'in', '("completed","canceled")');
            
            if (!activeTickets || activeTickets.length === 0) return;
            const activeIds = activeTickets.map(t => t.id);

            const { data } = await supabase
                .from('ticket_assignments')
                .select('*')
                .eq('technician_id', user.id)
                .eq('status', 'pending')
                .in('ticket_id', activeIds);
            
            if (data && data.length > 0) {
                const latestInvite = data[data.length - 1];
                if (!dismissedInvitesRef.current.has(latestInvite.id)) {
                    fetchInviteDetails(latestInvite);
                }
            }
        } catch (err) {
            
        }
    }, [user?.id, fetchInviteDetails]);

    const handleAcceptInvite = async () => {
        if (!pendingInvite) return;
        const inviteId = pendingInvite.id;
        try {
            const { error: updateError } = await supabase
                .from('ticket_assignments')
                .update({ status: 'accepted' })
                .eq('id', inviteId);

            if (updateError) throw updateError;

            dismissedInvitesRef.current.add(inviteId);
            localStorage.setItem('dismissed_invites', JSON.stringify([...dismissedInvitesRef.current]));
            showToast('เข้าร่วมทีมสำเร็จ!', 'success');
            setPendingInvite(null);
            if (setViewMode) setViewMode('map');
            fetchMyAssignment();
            fetchOtherTechs();
        } catch (err) {
            showToast('เกิดข้อผิดพลาด: ' + err.message, 'error');
        }
    };

    const handleDeclineInvite = async () => {
        if (!pendingInvite) return;
        const inviteId = pendingInvite.id;
        dismissedInvitesRef.current.add(inviteId);
        localStorage.setItem('dismissed_invites', JSON.stringify([...dismissedInvitesRef.current]));
        setPendingInvite(null);
        
        try {
            await supabase
                .from('ticket_assignments')
                .delete()
                .eq('id', inviteId);
        } catch (err) {
            
        }
    };

    useEffect(() => {
        if (!user) return;

        fetchOtherTechs();
        fetchMyAssignment();
        checkPendingInvite();

        const pollInterval = setInterval(checkPendingInvite, 10000);

        const inviteChannel = supabase.channel(`team-invites-${user.id}`)
            .on('postgres_changes', 
                { event: 'INSERT', schema: 'public', table: 'ticket_assignments' }, 
                async (payload) => {
                    if (payload.new.technician_id === user.id && payload.new.status === 'pending') {
                        const { data: ticket } = await supabase
                            .from('support_tickets')
                            .select('status')
                            .eq('id', payload.new.ticket_id)
                            .single();
                        
                        if (ticket && !['completed', 'canceled'].includes(ticket.status)) {
                            fetchInviteDetails(payload.new);
                        }
                    }
                }
            ).subscribe();

        const dataSyncChannel = supabase.channel('team-data-sync')
            .on('postgres_changes', { event: '*', schema: 'public', table: 'profiles' }, () => fetchOtherTechs())
            .on('postgres_changes', { event: '*', schema: 'public', table: 'car_status' }, () => fetchOtherTechs())
            .on('postgres_changes', { event: '*', schema: 'public', table: 'ticket_assignments' }, () => {
                fetchOtherTechs();
                fetchMyAssignment();
            })
            .on('postgres_changes', { event: '*', schema: 'public', table: 'support_tickets' }, () => {
                fetchOtherTechs();
                fetchMyAssignment();
            })
            .subscribe();

        return () => {
            if (inviteChannel) supabase.removeChannel(inviteChannel);
            if (dataSyncChannel) supabase.removeChannel(dataSyncChannel);
            clearInterval(pollInterval);
        };
    }, [user?.id, fetchOtherTechs, fetchMyAssignment, checkPendingInvite, fetchInviteDetails]);

    return {
        otherTechs,
        myAssignment,
        pendingInvite,
        setPendingInvite,
        fetchOtherTechs,
        fetchMyAssignment,
        handleAcceptInvite,
        handleDeclineInvite
    };
}
