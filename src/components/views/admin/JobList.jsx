import React from 'react';
import { FiSearch, FiBox, FiChevronRight, FiUser, FiTruck, FiMapPin, FiClock } from 'react-icons/fi';

const STATUS_MAP = {
    pending: { label: 'รอรับงาน', style: 'bg-rose-100 text-rose-700' },
    accepted: { label: 'รับงานแล้ว', style: 'bg-orange-100 text-orange-700' },
    in_progress: { label: 'กำลังเดินทาง', style: 'bg-blue-100 text-blue-700' },
    completed: { label: 'เสร็จสิ้น', style: 'bg-emerald-100 text-emerald-700' }
};

const getStatus = (status) => STATUS_MAP[status] || { label: status, style: 'bg-gray-100 text-gray-700' };

const getLocation = (job) => {
    if (job.location_name) return job.location_name;
    if (job.lat && job.lng) return `${Number(job.lat).toFixed(4)}, ${Number(job.lng).toFixed(4)}`;
    return 'ไม่ทราบตำแหน่ง';
};

const getCarReg = (job) => {
    if (job.car_reg_number || job.car_reg_text) {
        return `${job.car_reg_number || ''} ${job.car_reg_text || ''}`.trim();
    }
    return 'ไม่ระบุ';
};

const JobList = ({ jobs, searchTerm, setSearchTerm }) => {
    const filteredJobs = jobs.filter(j => {
        const query = searchTerm.toLowerCase();
        return (
            (j.id?.toLowerCase() || '').includes(query) ||
            (j.customer?.full_name?.toLowerCase() || '').includes(query) ||
            (j.technician?.full_name?.toLowerCase() || '').includes(query) ||
            (j.car_reg_number?.toLowerCase() || '').includes(query)
        );
    });

    return (
        <div className="space-y-4 sm:space-y-6">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 sm:gap-4">
                <div className="relative flex-1 w-full max-w-md">
                    <FiSearch className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" />
                    <input
                        type="text"
                        placeholder="ค้นหาด้วยรหัสงาน, ชื่อ, ทะเบียนรถ..."
                        className="w-full pl-12 pr-4 py-3 bg-gray-50 border-none rounded-2xl focus:ring-2 focus:ring-blue-500 transition-all font-medium text-sm"
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                    />
                </div>
                <div className="text-gray-400 text-sm font-bold uppercase tracking-widest">
                    งานทั้งหมด( {filteredJobs.length} )รายการ
                </div>
            </div>

            <div className="block lg:hidden space-y-3">
                {filteredJobs.length === 0 ? (
                    <div className="py-16 text-center text-gray-400 italic bg-gray-50 rounded-2xl">ไม่พบรายการงาน</div>
                ) : (
                    filteredJobs.map(job => (
                        <div key={job.id} className="bg-white border border-gray-100 rounded-2xl p-4 hover:shadow-md transition-shadow">
                            <div className="flex items-center justify-between mb-3">
                                <div className="flex items-center gap-2">
                                    <div className="w-8 h-8 rounded-lg bg-blue-50 flex items-center justify-center text-blue-600">
                                        <FiBox size={14} />
                                    </div>
                                    <p className="font-bold text-sm text-blue-600">#{job.id.slice(0, 8).toUpperCase()}</p>
                                </div>
                                <span className={`px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-wider ${getStatus(job.status).style}`}>
                                    {getStatus(job.status).label}
                                </span>
                            </div>


                            <div className="grid grid-cols-2 gap-3 text-sm">
                                <div>
                                    <p className="text-[10px] text-gray-400 font-bold uppercase mb-0.5">ลูกค้า</p>
                                    <p className="font-semibold text-gray-900 truncate">{job.customer?.full_name || 'ไม่ระบุ'}</p>
                                </div>
                                <div>
                                    <p className="text-[10px] text-gray-400 font-bold uppercase mb-0.5">ทะเบียนรถ</p>
                                    <p className="font-semibold text-gray-900">{getCarReg(job)}</p>
                                    <p className="text-xs text-gray-500">{job.car_reg_province || ''}</p>
                                </div>
                                <div>
                                    <p className="text-[10px] text-gray-400 font-bold uppercase mb-0.5">ช่างผู้ดูแล</p>
                                    <div className="flex items-center gap-1">
                                        <span className={`w-1.5 h-1.5 rounded-full ${job.technician_id ? 'bg-emerald-500' : 'bg-gray-300'}`}></span>
                                        <p className="font-semibold text-gray-700 truncate">{job.technician?.full_name || 'ยังไม่รับงาน'}</p>
                                    </div>
                                </div>
                                <div>
                                    <p className="text-[10px] text-gray-400 font-bold uppercase mb-0.5">วันที่แจ้ง</p>
                                    <p className="font-semibold text-gray-700">
                                        {new Date(job.created_at).toLocaleDateString('th-TH', { day: '2-digit', month: 'short' })}
                                    </p>
                                    <p className="text-xs text-gray-400">
                                        {new Date(job.created_at).toLocaleTimeString('th-TH', { hour: '2-digit', minute: '2-digit' })}
                                    </p>
                                </div>
                            </div>

                            <div className="mt-3 pt-3 border-t border-gray-50 flex items-center gap-2 text-xs text-gray-500">
                                <FiMapPin size={12} />
                                <span className="truncate">{getLocation(job)}</span>
                            </div>
                        </div>
                    ))
                )}
            </div>

            <div className="hidden lg:block overflow-x-auto">
                <table className="w-full text-left border-collapse">
                    <thead>
                        <tr className="border-b border-gray-100">
                            <th className="pb-4 font-bold text-gray-400 text-[10px] uppercase tracking-wider">ข้อมูลงาน</th>
                            <th className="pb-4 font-bold text-gray-400 text-[10px] uppercase tracking-wider">ลูกค้า/เบอร์โทร</th>
                            <th className="pb-4 font-bold text-gray-400 text-[10px] uppercase tracking-wider">รถ/ทะเบียน</th>
                            <th className="pb-4 font-bold text-gray-400 text-[10px] uppercase tracking-wider">ช่างผู้ดูแล</th>
                            <th className="pb-4 font-bold text-gray-400 text-[10px] uppercase tracking-wider">สถานะ</th>
                            <th className="pb-4 font-bold text-gray-400 text-[10px] uppercase tracking-wider">วันที่แจ้ง</th>

                        </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-50">
                        {filteredJobs.map(job => (
                            <tr key={job.id} className="group hover:bg-gray-50/50 transition-colors">
                                <td className="py-5">
                                    <div className="flex items-center gap-3">
                                        <div className="w-10 h-10 rounded-xl bg-blue-50 flex items-center justify-center text-blue-600">
                                            <FiBox size={18} />
                                        </div>
                                        <div>
                                            <p className="font-bold text-sm text-blue-600">#{job.id.slice(0, 8).toUpperCase()}</p>
                                            <p className="text-[11px] text-gray-800 font-medium line-clamp-1 max-w-[150px]">
                                                {getLocation(job)}
                                            </p>
                                        </div>
                                    </div>
                                </td>
                                <td className="py-5">
                                    <div>
                                        <p className="font-bold text-sm text-gray-900">{job.customer?.full_name || 'ไม่ระบุชื่อ'}</p>
                                        <p className="text-xs text-gray-500 font-medium">{job.customer?.phone || '-'}</p>
                                    </div>
                                </td>
                                <td className="py-5">
                                    <div>
                                        <p className="font-bold text-sm text-gray-900">{getCarReg(job)}</p>
                                        <p className="text-sm text-gray-900 font-medium">{job.car_reg_province || 'ไม่ทราบจังหวัด'}</p>
                                    </div>
                                </td>
                                <td className="py-5">
                                    <div className="flex items-center gap-2">
                                        <span className={`w-2 h-2 rounded-full ${job.technician_id ? 'bg-emerald-500' : 'bg-gray-300'}`}></span>
                                        <p className="text-sm font-semibold text-gray-700">{job.technician?.full_name || 'ยังไม่รับงาน'}</p>
                                    </div>
                                </td>
                                <td className="py-5">
                                    <span className={`px-4 py-1.5 rounded-full text-[10px] font-black uppercase tracking-widest ${getStatus(job.status).style}`}>
                                        {getStatus(job.status).label}
                                    </span>
                                </td>
                                <td className="py-5">
                                    <p className="text-xs font-bold text-gray-500">
                                        {new Date(job.created_at).toLocaleDateString('th-TH', {
                                            day: '2-digit', month: 'short', year: '2-digit'
                                        })}
                                    </p>
                                    <p className="text-[10px] text-gray-400 font-medium">
                                        {new Date(job.created_at).toLocaleTimeString('th-TH', {
                                            hour: '2-digit', minute: '2-digit'
                                        })}
                                    </p>
                                </td>

                            </tr>
                        ))}
                        {filteredJobs.length === 0 && (
                            <tr>
                                <td colSpan="7" className="py-20 text-center text-gray-400 italic">ไม่พบรายการงาน</td>
                            </tr>
                        )}
                    </tbody>
                </table>
            </div>
        </div>
    );
};

export default JobList;
