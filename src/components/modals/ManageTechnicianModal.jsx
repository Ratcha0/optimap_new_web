import React, { useState, useEffect } from 'react';
import { FiX, FiShield, FiTrash2, FiAlertCircle, FiChevronDown, FiBox, FiEdit2, FiClock } from 'react-icons/fi';
import { supabase } from '../../utils/supabaseClient';
import { useToast } from '../ui/ToastNotification';

const STATUS_MAP = {
    pending: { label: 'รอรับงาน', style: 'bg-rose-100 text-rose-700' },
    accepted: { label: 'รับงานแล้ว', style: 'bg-orange-100 text-orange-700' },
    in_progress: { label: 'กำลังเดินทาง', style: 'bg-blue-100 text-blue-700' },
    completed: { label: 'เสร็จสิ้น', style: 'bg-emerald-100 text-emerald-700' }
};

const ManageTechnicianModal = ({ isOpen, onClose, technician, onUpdate, jobs = [] }) => {
    const { showToast } = useToast();
    const [loading, setLoading] = useState(false);
    const [role, setRole] = useState('technician');
    const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
    const [activeTab, setActiveTab] = useState('info');
    const [editingJobId, setEditingJobId] = useState(null);
    const [deleteJobId, setDeleteJobId] = useState(null);

    useEffect(() => {
        if (technician) {
            setRole(technician.role || 'technician');
            setShowDeleteConfirm(false);
            setActiveTab('info');
            setEditingJobId(null);
            setDeleteJobId(null);
        }
    }, [technician]);

    if (!isOpen || !technician) return null;

    const isUser = technician.role === 'user';
    const userJobs = jobs.filter(j => j.user_id === technician.id);

    const handleUpdateRole = async () => {
        setLoading(true);
        try {
            const { error } = await supabase
                .from('profiles')
                .update({ role: role })
                .eq('id', technician.id);

            if (error) throw error;
            showToast('อัปเดตสิทธิ์เรียบร้อยแล้ว', 'success');
            onUpdate();
            onClose();
        } catch (err) {
            
            showToast('ไม่สามารถอัปเดตสิทธิ์ได้: ' + err.message, 'error');
        } finally {
            setLoading(false);
        }
    };

    const handleDeleteUser = async () => {
        setLoading(true);
        try {
            const { error } = await supabase
                .from('profiles')
                .delete()
                .eq('id', technician.id);

            if (error) throw error;
            showToast('ลบข้อมูลผู้ใช้งานแล้ว', 'success');
            onUpdate();
            onClose();
        } catch (err) {
            
            showToast('ไม่สามารถลบผู้ใช้งานได้: ' + err.message, 'error');
        } finally {
            setLoading(false);
        }
    };

    const handleUpdateJobStatus = async (jobId, newStatus) => {
        setLoading(true);
        try {
            const { error } = await supabase
                .from('support_tickets')
                .update({ status: newStatus })
                .eq('id', jobId);

            if (error) throw error;
            showToast('อัปเดตสถานะงานแล้ว', 'success');
            setEditingJobId(null);
            onUpdate();
        } catch (err) {
            showToast('ไม่สามารถอัปเดตสถานะได้: ' + err.message, 'error');
        } finally {
            setLoading(false);
        }
    };

    const handleDeleteJob = async (jobId) => {
        setLoading(true);
        try {
            const { error } = await supabase
                .from('support_tickets')
                .delete()
                .eq('id', jobId);

            if (error) throw error;
            showToast('ลบงานเรียบร้อยแล้ว', 'success');
            setDeleteJobId(null);
            onUpdate();
        } catch (err) {
            showToast('ไม่สามารถลบงานได้: ' + err.message, 'error');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[100] flex items-center justify-center p-4">
            <div className="bg-white rounded-3xl w-full max-w-md overflow-hidden animate-in fade-in zoom-in duration-200 shadow-2xl max-h-[90vh] flex flex-col">
                <div className="p-6 border-b border-gray-100 flex items-center justify-between bg-gray-50/50 shrink-0">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl bg-blue-100 text-blue-600 flex items-center justify-center">
                            <FiShield size={20} />
                        </div>
                        <div>
                            <h3 className="font-bold text-gray-900">จัดการสิทธิ์ผู้ใช้</h3>
                            <p className="text-xs text-gray-400">แก้ไขสิทธิ์หรือลบผู้ใช้</p>
                        </div>
                    </div>
                    <button onClick={onClose} className="p-2 hover:bg-white rounded-xl transition-colors text-gray-400">
                        <FiX size={20} />
                    </button>
                </div>

               
                {isUser && (
                    <div className="flex border-b border-gray-100 shrink-0">
                        <button
                            onClick={() => setActiveTab('info')}
                            className={`flex-1 py-3 text-xs font-bold uppercase tracking-wider transition-all ${activeTab === 'info' ? 'text-blue-600 border-b-2 border-blue-600' : 'text-gray-400 hover:text-gray-600'}`}
                        >
                            ข้อมูลผู้ใช้
                        </button>
                        <button
                            onClick={() => setActiveTab('jobs')}
                            className={`flex-1 py-3 text-xs font-bold uppercase tracking-wider transition-all flex items-center justify-center gap-1.5 ${activeTab === 'jobs' ? 'text-blue-600 border-b-2 border-blue-600' : 'text-gray-400 hover:text-gray-600'}`}
                        >
                            <FiBox size={12} />
                            รายการแจ้งซ่อม
                            {userJobs.length > 0 && (
                                <span className="bg-red-100 text-red-600 px-1.5 py-0.5 rounded-full text-[9px] font-black">{userJobs.length}</span>
                            )}
                        </button>
                    </div>
                )}

                <div className="overflow-y-auto flex-1">
                
                    {activeTab === 'info' && (
                        <div className="p-6 space-y-6">
                          
                            <div className="flex items-center gap-4 p-4 bg-blue-50/50 rounded-2xl border border-blue-100/50">
                                <img
                                    src={technician.avatar_url || `https://ui-avatars.com/api/?name=${technician.full_name || 'T'}&background=random`}
                                    className="w-12 h-12 rounded-xl object-cover shadow-sm"
                                    alt=""
                                />
                                <div>
                                    <p className="font-bold text-gray-900 leading-none mb-1">{technician.full_name || 'ไม่ระบุชื่อ'}</p>
                                    <p className="text-xs text-gray-500">{technician.email}</p>
                                    <p className="text-xs text-gray-500">เบอร์: {technician.phone}</p>
                                </div>
                            </div>

                          
                            <div className="space-y-3">
                                <label className="text-xs font-bold text-gray-400 uppercase tracking-widest pl-1">แก้ไขสิทธิ์ผู้ใช้งาน </label>
                                <div className="relative">
                                    <select
                                        value={role}
                                        onChange={(e) => setRole(e.target.value)}
                                        className="w-full p-4 bg-gray-50 border border-gray-100 rounded-2xl font-bold text-sm appearance-none focus:ring-2 focus:ring-blue-500 transition-all outline-none pr-10 cursor-pointer"
                                    >
                                        <option value="user">User (ลูกค้า/บุคคลทั่วไป)</option>
                                        <option value="technician">Technician (ช่างเทคนิค)</option>
                                        {technician.role === 'admin' && <option value="admin">Administrator (ผู้ดูแลระบบ)</option>}
                                    </select>
                                    <div className="absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none text-gray-400">
                                        <FiChevronDown size={20} />
                                    </div>
                                </div>
                            </div>

                          
                            <div className="space-y-3 pt-2">
                                <button
                                    onClick={handleUpdateRole}
                                    disabled={loading || role === technician.role}
                                    className="w-full py-4 bg-blue-600 text-white rounded-2xl font-bold shadow-lg shadow-blue-200 hover:bg-blue-700 disabled:opacity-50 disabled:shadow-none transition-all"
                                >
                                    {loading ? 'กำลังบันทึก...' : 'บันทึก'}
                                </button>

                                {!showDeleteConfirm ? (
                                    <button
                                        onClick={() => setShowDeleteConfirm(true)}
                                        className="w-full py-3 text-rose-600 font-bold text-sm hover:bg-rose-50 rounded-2xl transition-all flex items-center justify-center gap-2"
                                    >
                                        <FiTrash2 size={16} /> ลบผู้ใช้
                                    </button>
                                ) : (
                                    <div className="p-4 bg-rose-50 rounded-2xl border border-rose-100 space-y-3 animate-in fade-in slide-in-from-top-2">
                                        <p className="text-xs text-rose-700 font-bold flex items-center gap-2">
                                            <FiAlertCircle size={14} /> ยืนยันการลบ? ข้อมูลในโปรไฟล์จะหายไปทั้งหมด
                                        </p>
                                        <div className="flex gap-2">
                                            <button
                                                onClick={handleDeleteUser}
                                                disabled={loading}
                                                className="flex-1 py-2 bg-rose-600 text-white rounded-xl text-xs font-bold"
                                            >
                                                ยืนยันลบ
                                            </button>
                                            <button
                                                onClick={() => setShowDeleteConfirm(false)}
                                                className="flex-1 py-2 bg-white border border-rose-200 text-rose-600 rounded-xl text-xs font-bold"
                                            >
                                                ยกเลิก
                                            </button>
                                        </div>
                                    </div>
                                )}
                            </div>
                        </div>
                    )}

                    
                    {activeTab === 'jobs' && (
                        <div className="p-4 space-y-3">
                            {userJobs.length === 0 ? (
                                <div className="py-16 text-center text-gray-400 italic">
                                    <FiBox size={32} className="mx-auto mb-3 opacity-30" />
                                    <p className="text-sm">ยังไม่มีงานที่ส่งเข้ามา</p>
                                </div>
                            ) : (
                                userJobs.map(job => {
                                    const status = STATUS_MAP[job.status] || { label: job.status, style: 'bg-gray-100 text-gray-500' };
                                    const isEditing = editingJobId === job.id;
                                    const isDeleting = deleteJobId === job.id;

                                    return (
                                        <div key={job.id} className="bg-gray-50 rounded-2xl p-4 border border-gray-100 hover:border-gray-200 transition-all">
                                        
                                            <div className="flex items-start justify-between mb-2">
                                                <div className="flex-1 min-w-0">
                                                    <p className="font-bold text-sm text-gray-900 truncate">ตำแหน่งจาก : {job.issue_type || job.description || 'ไม่ระบุตำแหน่ง'}</p>
                                                    <p className="text-[10px] text-gray-400 mt-0.5 flex items-center gap-1">
                                                        <FiClock size={10} />
                                                        {new Date(job.created_at).toLocaleString('th-TH')}
                                                    </p>
                                                </div>
                                                <span className={`px-2 py-0.5 rounded-full text-[9px] font-black uppercase shrink-0 ml-2 ${status.style}`}>
                                                    {status.label}
                                                </span>
                                            </div>

                                            
                                            {job.description && job.issue_type && (
                                                <p className="text-xs text-gray-500 mb-2 line-clamp-2">{job.description}</p>
                                            )}

                                            {job.technician?.full_name && (
                                                <p className="text-[10px] text-gray-400 mb-3">ช่าง: <span className="font-bold text-gray-600">{job.technician.full_name}</span></p>
                                            )}

                                            
                                            {isEditing && (
                                                <div className="mb-3 p-3 bg-white rounded-xl border border-blue-100 space-y-2 animate-in fade-in">
                                                    <p className="text-[10px] font-bold text-gray-400 uppercase">เปลี่ยนสถานะ</p>
                                                    <div className="grid grid-cols-2 gap-1.5">
                                                        {Object.entries(STATUS_MAP).map(([key, val]) => (
                                                            <button
                                                                key={key}
                                                                onClick={() => handleUpdateJobStatus(job.id, key)}
                                                                disabled={loading || key === job.status}
                                                                className={`py-2 rounded-lg text-[10px] font-bold transition-all ${key === job.status ? 'opacity-40 cursor-not-allowed ' + val.style : 'bg-gray-50 hover:bg-gray-100 text-gray-600'}`}
                                                            >
                                                                {val.label}
                                                            </button>
                                                        ))}
                                                    </div>
                                                </div>
                                            )}

                                            
                                            {isDeleting && (
                                                <div className="mb-3 p-3 bg-rose-50 rounded-xl border border-rose-100 space-y-2 animate-in fade-in">
                                                    <p className="text-[10px] font-bold text-rose-700 flex items-center gap-1">
                                                        <FiAlertCircle size={10} /> ยืนยันลบงานนี้?
                                                    </p>
                                                    <div className="flex gap-2">
                                                        <button
                                                            onClick={() => handleDeleteJob(job.id)}
                                                            disabled={loading}
                                                            className="flex-1 py-1.5 bg-rose-600 text-white rounded-lg text-[10px] font-bold"
                                                        >
                                                            ลบ
                                                        </button>
                                                        <button
                                                            onClick={() => setDeleteJobId(null)}
                                                            className="flex-1 py-1.5 bg-white border border-rose-200 text-rose-600 rounded-lg text-[10px] font-bold"
                                                        >
                                                            ยกเลิก
                                                        </button>
                                                    </div>
                                                </div>
                                            )}

                                            
                                            {!isEditing && !isDeleting && (
                                                <div className="flex gap-2 pt-1">
                                                    <button
                                                        onClick={() => { setEditingJobId(job.id); setDeleteJobId(null); }}
                                                        className="flex-1 py-2 bg-white border border-gray-200 rounded-xl text-[10px] font-bold text-gray-600 hover:bg-blue-50 hover:border-blue-200 hover:text-blue-600 transition-all flex items-center justify-center gap-1"
                                                    >
                                                        <FiEdit2 size={10} /> แก้ไขสถานะ
                                                    </button>
                                                    <button
                                                        onClick={() => { setDeleteJobId(job.id); setEditingJobId(null); }}
                                                        className="py-2 px-3 bg-white border border-gray-200 rounded-xl text-[10px] font-bold text-gray-400 hover:bg-rose-50 hover:border-rose-200 hover:text-rose-600 transition-all"
                                                    >
                                                        <FiTrash2 size={10} />
                                                    </button>
                                                </div>
                                            )}
                                        </div>
                                    );
                                })
                            )}
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

export default ManageTechnicianModal;
