import React from 'react';
import { FiMail, FiPhone, FiClock, FiSearch } from 'react-icons/fi';

const isOnline = (tech) => tech.last_updated && new Date(tech.last_updated) > new Date(Date.now() - 5 * 60 * 1000);

const TechnicianList = ({ techs, onManage, searchTerm, setSearchTerm, type = 'technician' }) => {
    const filteredTechs = techs.filter(t => {
        const query = (searchTerm || '').toLowerCase();
        return (
            (t.full_name?.toLowerCase() || '').includes(query) ||
            (t.email?.toLowerCase() || '').includes(query) ||
            (t.phone?.toLowerCase() || '').includes(query)
        );
    });

    return (
        <div className="space-y-4 sm:space-y-6">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 sm:gap-4">
                <div className="relative flex-1 w-full max-w-md">
                    <FiSearch className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" />
                    <input
                        type="text"
                        placeholder={type === 'technician' ? "ค้นหาชื่อช่าง, อีเมล, เบอร์โทร..." : "ค้นหาชื่อผู้ใช้, อีเมล, เบอร์โทร..."}
                        className="w-full pl-12 pr-4 py-3 bg-gray-50 border-none rounded-2xl focus:ring-2 focus:ring-blue-500 transition-all font-medium text-sm"
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                    />
                </div>
                <div className="text-gray-400 text-sm font-bold uppercase tracking-widest whitespace-nowrap">
                    {type === 'technician' ? 'ช่างทั้งหมด' : 'ผู้ใช้ทั้งหมด'}( {filteredTechs.length} ) ราย
                </div>
            </div>

            <div className="block lg:hidden space-y-3">
                {filteredTechs.length === 0 ? (
                    <div className="py-16 text-center text-gray-400 italic bg-gray-50 rounded-2xl">ไม่พบรายการที่ค้นหา</div>
                ) : (
                    filteredTechs.map(tech => (
                        <div key={tech.id} className="bg-white border border-gray-100 rounded-2xl p-4 hover:shadow-md transition-shadow">
                            <div className="flex items-center gap-3 mb-3">
                                <div className="relative">
                                    <img
                                        src={tech.avatar_url || `https://ui-avatars.com/api/?name=${tech.full_name || 'T'}&background=random`}
                                        className="w-12 h-12 rounded-xl object-cover"
                                        alt=""
                                    />
                                    {type === 'technician' && <span className={`absolute -bottom-0.5 -right-0.5 w-3 h-3 border-2 border-white rounded-full ${isOnline(tech) ? 'bg-emerald-500' : 'bg-gray-300'}`}></span>}
                                </div>
                                <div className="flex-1 min-w-0">
                                    <p className="font-bold text-sm truncate">{tech.full_name || 'ไม่ระบุชื่อ'}</p>
                                    <p className="text-xs text-gray-400">ID : {tech.id.slice(0, 8)}</p>
                                </div>
                                <div className="flex flex-col items-end gap-2">
                                    {type === 'technician' && (
                                        <span className={`px-3 py-1 rounded-full text-[10px] font-bold uppercase ${isOnline(tech) ? 'bg-emerald-100 text-emerald-700' : 'bg-gray-100 text-gray-500'}`}>
                                            {isOnline(tech) ? 'ออนไลน์' : 'ออฟไลน์'}
                                        </span>
                                    )}
                                    <button
                                        onClick={() => onManage(tech)}
                                        className="text-[10px] font-bold text-blue-600 hover:underline"
                                    >
                                        จัดการ
                                    </button>
                                </div>
                            </div>

                            <div className="grid grid-cols-1 gap-2 text-xs text-gray-600">
                                <div className="flex items-center gap-2 bg-gray-50 rounded-xl px-3 py-2">
                                    <FiMail size={12} className="text-gray-400 shrink-0" />
                                    <span className="truncate">{tech.email}</span>
                                </div>
                                <div className="flex items-center gap-2 bg-gray-50 rounded-xl px-3 py-2">
                                    <FiPhone size={12} className="text-gray-400 shrink-0" />
                                    <span>{tech.phone || 'ไม่ระบุเบอร์โทร'}</span>
                                </div>
                                <div className="flex items-center gap-2 bg-gray-50 rounded-xl px-3 py-2">
                                    <FiClock size={12} className="text-gray-400 shrink-0" />
                                    <span>{type === 'technician' ? `เชื่อมต่อล่าสุด: ${tech.last_updated ? new Date(tech.last_updated).toLocaleString('th-TH') : 'ไม่ระบุ'}` : `งานที่ส่งเข้ามา: ${tech.jobCount || 0} รายการ`}</span>
                                </div>
                            </div>
                        </div>
                    ))
                )}
            </div>

            <div className="hidden lg:block overflow-x-auto">
                <table className="w-full text-left">
                    <thead>
                        <tr className="border-b border-gray-100">
                            <th className="pb-4 font-bold text-gray-400 text-xs uppercase tracking-wider">{type === 'technician' ? 'ชื่อช่าง' : 'ชื่อผู้ใช้'}</th>
                            {type === 'technician' && <th className="pb-4 font-bold text-gray-400 text-xs uppercase tracking-wider">สถานะ</th>}
                            <th className="pb-4 font-bold text-gray-400 text-xs uppercase tracking-wider">ข้อมูลติดต่อ</th>
                            <th className="pb-4 font-bold text-gray-400 text-xs uppercase tracking-wider">{type === 'technician' ? 'เชื่อมต่อล่าสุด' : 'งานทั้งหมด'}</th>
                            <th className="pb-4"></th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-50">
                        {filteredTechs.map(tech => (
                            <tr key={tech.id} className="hover:bg-gray-50 transition-colors">
                                <td className="py-4">
                                    <div className="flex items-center gap-3">
                                        <img src={tech.avatar_url || `https://ui-avatars.com/api/?name=${tech.full_name || 'T'}&background=random`} className="w-10 h-10 rounded-xl object-cover" alt="" />
                                        <div>
                                            <p className="font-bold text-sm">{tech.full_name || 'ไม่ระบุชื่อ'}</p>
                                            <p className="text-xs text-gray-400">{tech.id.slice(0, 8)}</p>
                                        </div>
                                    </div>
                                </td>
                                {type === 'technician' && (
                                    <td className="py-4">
                                        <span className={`px-3 py-1 rounded-full text-[10px] font-bold uppercase ${isOnline(tech) ? 'bg-emerald-100 text-emerald-700' : 'bg-gray-100 text-gray-500'}`}>
                                            {isOnline(tech) ? 'ออนไลน์' : 'ออฟไลน์'}
                                        </span>
                                    </td>
                                )}
                                <td className="py-4">
                                    <div className="space-y-1">
                                        <p className="text-xs flex items-center gap-1"><FiMail size={10} /> {tech.email}</p>
                                        <p className="text-xs flex items-center gap-1"><FiPhone size={10} /> {tech.phone || '-'}</p>
                                    </div>
                                </td>
                                <td className="py-4 text-xs text-gray-500">
                                    {type === 'technician' ? (tech.last_updated ? new Date(tech.last_updated).toLocaleString('th-TH') : 'ไม่ระบุ') : `${tech.jobCount || 0} รายการ`}
                                </td>
                                <td className="py-4 text-right">
                                    <button
                                        onClick={() => onManage(tech)}
                                        className="text-blue-600 font-bold text-xs hover:underline"
                                    >
                                        จัดการ
                                    </button>
                                </td>
                            </tr>
                        ))}
                        {filteredTechs.length === 0 && (
                            <tr>
                                <td colSpan="5" className="py-20 text-center text-gray-400 italic">ไม่พบรายการที่ค้นหา</td>
                            </tr>
                        )}
                    </tbody>
                </table>
            </div>
        </div>
    );
};

export default TechnicianList;
