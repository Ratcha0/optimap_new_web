import React, { useState, useEffect } from 'react';
import { supabase } from '../../utils/supabaseClient';
import { FiX, FiUsers, FiSearch, FiPlus, FiRefreshCw } from 'react-icons/fi';
import { useToast } from '../ui/ToastNotification';
import ConfirmModal from '../ui/ConfirmModal';
import BaseModal from '../ui/BaseModal';

export default function TeamInviteModal({ isOpen, onClose, ticketId, currentUser }) {
    const [techs, setTechs] = useState([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const [assignments, setAssignments] = useState([]);
    const [teammateProfiles, setTeammateProfiles] = useState([]);
    const [ticket, setTicket] = useState(null);
    const { showToast } = useToast();
    const [confirmConfig, setConfirmConfig] = useState({ isOpen: false, techId: null, assignmentId: null, isSelf: false });

    useEffect(() => {
        if (isOpen) {
            fetchInitialData();
        }
    }, [isOpen]);

    const fetchInitialData = async () => {
        setLoading(true);
        await Promise.all([
            fetchTicketDetails(),
            fetchOtherTechs(),
            fetchCurrentAssignments()
        ]);
        setLoading(false);
    };

    const fetchTicketDetails = async () => {
        const { data } = await supabase
            .from('support_tickets')
            .select('*')
            .eq('id', ticketId)
            .single();
        if (data) setTicket(data);
    };

    const fetchCurrentAssignments = async () => {
        const { data: assignmentsData } = await supabase
            .from('ticket_assignments')
            .select('id, technician_id, status, role')
            .eq('ticket_id', ticketId);
        
        if (assignmentsData) {
            setAssignments(assignmentsData);
            const userIds = assignmentsData.map(a => a.technician_id);
            if (userIds.length > 0) {
                const { data: profiles } = await supabase
                    .from('profiles')
                    .select('id, full_name, avatar_url, team_name, car_reg')
                    .in('id', userIds);
                setTeammateProfiles(profiles || []);
            } else {
                setTeammateProfiles([]);
            }
        }
    };

    const fetchOtherTechs = async () => {
        const thirtyMinutesAgo = new Date(Date.now() - 30 * 60 * 1000).toISOString();
        const { data, error } = await supabase
            .from('profiles')
            .select('id, full_name, avatar_url, team_name, car_reg')
            .eq('role', 'technician')
            .gte('last_updated', thirtyMinutesAgo);

        if (error) {
           
        } else {
            setTechs(data || []);
        }
    };

    const handleInvite = async (tech) => {
        if (tech.id === currentUser.id || tech.id === ticket?.technician_id) {
            showToast('ไม่สามารถเชิญตัวเองหรือหัวหน้างานได้', 'error');
            return;
        }

        try {
            const { error: assignError } = await supabase
                .from('ticket_assignments')
                .insert({
                    ticket_id: ticketId,
                    technician_id: tech.id,
                    role: 'member',
                    status: 'pending'
                });

            if (assignError && !assignError.message.includes('unique constraint')) throw assignError;

            showToast(`ส่งคำเชิญให้คุณ ${tech.full_name} เรียบร้อยแล้ว`, 'success');
            fetchCurrentAssignments();
        } catch (err) {
            showToast('ส่งคำเชิญไม่สำเร็จ: ' + err.message, 'error');
        }
    };

    const handleRemoveMember = (techId, assignmentId) => {
        const isSelf = techId === currentUser.id;
        setConfirmConfig({
            isOpen: true,
            techId,
            assignmentId,
            isSelf,
            title: isSelf ? 'ออกจากทีม?' : 'ลบสมาชิก?',
            message: isSelf ? 'คุณแน่ใจหรือไม่ที่จะออกจากทีมงานนี้?' : 'คุณแน่ใจหรือไม่ที่จะเชิญช่างคนนี้ออกจากทีม?'
        });
    };

    const executeRemoveMember = async () => {
        const { techId, assignmentId, isSelf } = confirmConfig;
        try {
           
            if (assignmentId) {
                const { data, error, status } = await supabase
                    .from('ticket_assignments')
                    .delete()
                    .eq('id', assignmentId)
                    .select();
                
              
                
                if (error) {
                    
                    throw new Error(`Supabase Error ${status}: ${error.message}`);
                }

                if (!data || data.length === 0) {
                    throw new Error('ไม่สามารถลบสมาชิกได้ (คุณอาจไม่มีสิทธิ์ หรือข้อมูลถูกลบไปแล้ว)');
                }
            }

            showToast(isSelf ? 'คุณออกจากทีมเรียบร้อยแล้ว' : 'คุณได้ลบสมาชิกออกจากทีมแล้ว', 'success');
            if (isSelf) onClose();
            else fetchCurrentAssignments();
        } catch (err) {
            
            showToast('ดำเนินการไม่สำเร็จ: ' + err.message, 'error');
        }
    };

    const teammateMap = assignments.reduce((acc, curr) => {
        acc[curr.technician_id] = curr;
        return acc;
    }, {});

    const displayTechs = React.useMemo(() => {
        const combined = [...techs];
        teammateProfiles.forEach(tp => {
            if (!combined.some(c => c.id === tp.id)) combined.push(tp);
        });
        return combined.filter(t => 
            t.full_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
            t.team_name?.toLowerCase().includes(searchTerm.toLowerCase())
        );
    }, [techs, teammateProfiles, searchTerm]);

    return (
        <BaseModal
            isOpen={isOpen}
            onClose={onClose}
            title="ชวนทีมเข้าร่วมงาน"
            subtitle="จัดการสมาชิกผู้รับผิดชอบงาน"
            icon={FiUsers}
            footer={
                <button onClick={onClose} className="w-full bg-white border border-gray-200 text-gray-600 font-black py-4 rounded-2xl hover:bg-gray-100 transition-all active:scale-[0.98] text-xs uppercase tracking-widest shadow-sm">
                    กลับไปลุยงานต่อ
                </button>
            }
        >
            <div className="p-4 bg-gray-50/50 border-b border-gray-100 flex gap-2">
                <div className="relative group flex-1">
                    <FiSearch className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 group-focus-within:text-indigo-500 transition-colors" />
                    <input
                        type="text"
                        placeholder="ค้นหาชื่อช่าง..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="w-full pl-11 pr-4 py-3 bg-white border border-gray-200 rounded-2xl text-xs font-bold text-gray-700 focus:outline-none focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-500 transition-all placeholder:text-gray-400"
                    />
                </div>
                <button onClick={fetchInitialData} disabled={loading} className={`w-11 h-11 bg-white border border-gray-200 rounded-2xl flex items-center justify-center text-gray-400 hover:text-indigo-600 transition-all active:scale-90 ${loading ? 'opacity-50' : ''}`}>
                    <FiRefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
                </button>
            </div>

            <div className="flex-1 overflow-y-auto p-4 space-y-3 min-h-[300px] max-h-[450px] thin-scrollbar">
                {loading ? (
                    <div className="flex flex-col items-center justify-center py-20 gap-4">
                        <div className="w-10 h-10 border-4 border-indigo-100 border-t-indigo-600 rounded-full animate-spin"></div>
                        <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">กำลังโหลดรายชื่อ...</p>
                    </div>
                ) : displayTechs.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-20 text-center opacity-40">
                        <div className="text-5xl mb-4">🛰️</div>
                        <p className="text-sm font-black text-gray-400 uppercase tracking-widest">ไม่พบช่างในขณะนี้</p>
                    </div>
                ) : (
                    displayTechs.map(tech => {
                        const isPrimary = tech.id === ticket?.technician_id;
                        const assignment = teammateMap[tech.id];
                        const isInTeam = isPrimary || assignment;

                        return (
                            <div key={tech.id} className="flex items-center gap-4 p-4 bg-white rounded-3xl border border-gray-100 shadow-sm hover:shadow-md transition-all group">
                                <div className="relative">
                                    <img
                                        src={tech.avatar_url || `https://ui-avatars.com/api/?name=${tech.full_name}&background=6366f1&color=fff`}
                                        className="w-12 h-12 rounded-2xl object-cover shadow-lg border-2 border-white"
                                        alt=""
                                    />
                                    <div className="absolute -bottom-1 -right-1 w-3.5 h-3.5 bg-green-500 border-2 border-white rounded-full shadow-sm"></div>
                                </div>
                                <div className="flex-1 min-w-0">
                                    <div className="flex items-center gap-2">
                                        <h4 className="font-black text-gray-900 text-sm truncate">
                                            {tech.full_name}
                                            {tech.id === currentUser.id && <span className="ml-2 text-[8px] bg-green-100 text-green-600 px-1 rounded">คุณ</span>}
                                        </h4>
                                        {isPrimary && <span className="text-[8px] bg-blue-100 text-blue-600 px-1 rounded font-bold uppercase">หัวหน้าทีม</span>}
                                    </div>
                                    <div className="flex items-center gap-2 mt-0.5">
                                        {tech.team_name && <span className="text-[9px] font-black text-indigo-500 uppercase tracking-tight bg-indigo-50 px-1.5 py-0.5 rounded-md border border-indigo-100 truncate">{tech.team_name}</span>}
                                        <span className="text-[9px] font-bold text-gray-400 truncate">{tech.car_reg || 'ไม่ระบุทะเบียน'}</span>
                                    </div>
                                </div>
                                {isInTeam ? (
                                    !isPrimary ? (
                                        <button
                                            onClick={() => handleRemoveMember(tech.id, assignment?.id)}
                                            className="w-10 h-10 rounded-2xl flex items-center justify-center transition-all active:scale-90 shadow-lg bg-red-50 text-red-500 hover:bg-red-500 hover:text-white border border-red-100"
                                            title={tech.id === currentUser.id ? "ออกจากทีม" : "ลบออกจากทีม"}
                                        >
                                            <FiX size={18} />
                                        </button>
                                    ) : (
                                        <div className="w-10 h-10 flex items-center justify-center text-blue-500 opacity-20">
                                            <FiUsers size={18} />
                                        </div>
                                    )
                                ) : (
                                    <button
                                        onClick={() => handleInvite(tech)}
                                        className="w-10 h-10 rounded-2xl flex items-center justify-center transition-all active:scale-90 shadow-lg bg-indigo-600 hover:bg-black text-white hover:rotate-12 shadow-indigo-500/20"
                                        title="ชวนเข้าทีม"
                                    >
                                        <FiPlus size={20} />
                                    </button>
                                )}
                            </div>
                        );
                    })
                )}
            </div>

            <ConfirmModal 
                isOpen={confirmConfig.isOpen}
                onClose={() => setConfirmConfig({ ...confirmConfig, isOpen: false })}
                onConfirm={executeRemoveMember}
                title={confirmConfig.title}
                message={confirmConfig.message}
                confirmText={confirmConfig.isSelf ? "ยืนยันการออก" : "ยืนยันการลบ"}
                type="danger"
            />
        </BaseModal>
    );
}
