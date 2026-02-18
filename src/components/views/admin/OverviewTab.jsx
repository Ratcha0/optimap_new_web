import React from 'react';
import { FiBox, FiChevronRight } from 'react-icons/fi';

const STATUS_MAP = {
    pending: { label: 'รอรับงาน', style: 'bg-rose-100 text-rose-700' },
    accepted: { label: 'รับงานแล้ว', style: 'bg-orange-100 text-orange-700' },
    in_progress: { label: 'กำลังเดินทาง', style: 'bg-blue-100 text-blue-700' },
    completed: { label: 'เสร็จสิ้น', style: 'bg-emerald-100 text-emerald-700' }
};

const getStatus = (status) => STATUS_MAP[status] || { label: status, style: 'bg-gray-100 text-gray-700' };

const OverviewTab = ({ techs, jobs }) => (
    <div className="space-y-8">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            <div>
                <h3 className="text-lg font-bold mb-4">กิจกรรมล่าสุด</h3>
                <div className="space-y-4">
                    {jobs.length === 0 ? (
                        <p className="text-gray-400 text-sm italic">ไม่มีประวัติกิจกรรม</p>
                    ) : (
                        jobs.slice(0, 5).map(job => (
                            <div key={job.id} className="flex items-center gap-3 p-3 sm:p-4 rounded-2xl bg-gray-50">
                                <div className={`w-9 h-9 sm:w-10 sm:h-10 rounded-full flex items-center justify-center shrink-0 ${job.status === 'completed' ? 'bg-emerald-100 text-emerald-600' : 'bg-blue-100 text-blue-600'}`}>
                                    <FiBox size={16} />
                                </div>
                                <div className="flex-1 min-w-0">
                                    <p className="text-sm font-bold truncate">{job.customer?.full_name || 'ไม่ระบุชื่อลูกค้า'}</p>
                                    <p className="text-xs text-gray-500 truncate">{job.description || 'ไม่มีคำอธิบาย'}</p>
                                </div>
                                <span className={`text-[10px] font-bold uppercase py-1 px-2 rounded-full whitespace-nowrap shrink-0 ${getStatus(job.status).style}`}>
                                    {getStatus(job.status).label}
                                </span>
                            </div>
                        ))
                    )}
                </div>
            </div>
            <div>
                <h3 className="text-lg font-bold mb-4">รายชื่อช่าง</h3>
                <div className="space-y-4">
                    {techs.length === 0 ? (
                        <p className="text-gray-400 text-sm italic">ไม่มีรายชื่อช่าง</p>
                    ) : (
                        techs.slice(0, 5).map(tech => (
                            <div key={tech.id} className="flex items-center gap-4 p-4 rounded-2xl bg-gray-50 overflow-hidden">
                                <img 
                                    src={tech.avatar_url || `https://ui-avatars.com/api/?name=${tech.full_name || 'T'}&background=0D8ABC&color=fff`} 
                                    className="w-10 h-10 rounded-full border-2 border-white object-cover shrink-0" 
                                    alt="" 
                                    onError={(e) => {
                                        e.target.src = `https://ui-avatars.com/api/?name=${tech.full_name || 'T'}&background=0D8ABC&color=fff`;
                                    }}
                                />
                                <div className="flex-1 min-w-0">
                                    <p className="text-sm font-bold">{tech.full_name || tech.email}</p>
                                    <p className="text-xs text-gray-500 truncate">{tech.phone || 'ไม่ระบุเบอร์โทร'}</p>
                                </div>
                                <div className="text-right">
                                    <FiChevronRight className="text-gray-300" />
                                </div>
                            </div>
                        ))
                    )}
                </div>
            </div>
        </div>
    </div>
);

export default OverviewTab;
