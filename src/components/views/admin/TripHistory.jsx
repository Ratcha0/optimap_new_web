import React, { useState, useEffect, useRef } from 'react';
import { supabase } from '../../../utils/supabaseClient';
import { FiCalendar, FiMapPin, FiTruck, FiClock, FiSearch, FiFilter } from 'react-icons/fi';
import LiveTrackModal from '../../modals/LiveTrackModal';
import { useToast } from '../../ui/ToastNotification';

const STATUS_MAP = {
    pending: { label: 'รอรับงาน', style: 'bg-rose-100 text-rose-700' },
    accepted: { label: 'รับงานแล้ว', style: 'bg-orange-100 text-orange-700' },
    in_progress: { label: 'กำลังเดินทาง', style: 'bg-blue-100 text-blue-700' },
    completed: { label: 'เสร็จสิ้น', style: 'bg-emerald-100 text-emerald-700' }
};

const getStatus = (status) => STATUS_MAP[status] || { label: status, style: 'bg-gray-100 text-gray-700' };

const TripHistory = () => {
    const [searchTerm, setSearchTerm] = useState('');
    const [trips, setTrips] = useState([]);
    const [loading, setLoading] = useState(true);
    const [trackingTrip, setTrackingTrip] = useState(null);
    const refreshTimeout = useRef(null);
    const { showToast } = useToast();

    useEffect(() => {
        fetchTrips();


        const tripSub = supabase.channel('trip-history-changes')
            .on('postgres_changes', { event: '*', schema: 'public', table: 'support_tickets' }, () => {
                clearTimeout(refreshTimeout.current);
                refreshTimeout.current = setTimeout(() => fetchTrips(true), 1500);
            })
            .subscribe();

        return () => {
            clearTimeout(refreshTimeout.current);
            supabase.removeChannel(tripSub);
        };
    }, []);

    const fetchTrips = async (silent = false) => {
        if (!silent) setLoading(true);
        try {
            const { data, error } = await supabase
                .from('support_tickets')
                .select(`
                    *,
                    technician:profiles!technician_id(full_name, avatar_url, car_reg),
                    customer:profiles!user_id(full_name)
                `)
                .order('updated_at', { ascending: false });

            if (error) {
                
                showToast("ไม่สามารถโหลดประวัติการเดินทางได้", "error");
                const { data: fallbackData } = await supabase
                    .from('support_tickets')
                    .select('*')
                    .order('updated_at', { ascending: false });
                setTrips(fallbackData || []);
            } else {
                setTrips(data || []);
            }
        } catch (err) {
            
            showToast("เกิดข้อผิดพลาดในการเชื่อมต่อข้อมูล", "error");
        } finally {
            if (!silent) setLoading(false);
        }
    };

    const filteredTrips = trips.filter(trip =>
        trip.id.toLowerCase().includes(searchTerm.toLowerCase()) ||
        trip.technician?.full_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        trip.car_reg_number?.toLowerCase().includes(searchTerm.toLowerCase())
    );

    if (loading) {
        return (
            <div className="flex items-center justify-center h-64">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
            </div>
        );
    }

    return (
        <div className="p-2 sm:p-6">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-6 sm:mb-8">
                <div className="relative flex-1 w-full max-w-md">
                    <FiSearch className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" />
                    <input
                        type="text"
                        placeholder="ค้นหาด้วยไอดี, ชื่อช่าง หรือทะเบียนรถ..."
                        className="w-full pl-12 pr-4 py-3 bg-gray-50 border-none rounded-2xl focus:ring-2 focus:ring-blue-500 transition-all font-medium text-sm"
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                    />
                </div>

                {/* <div className="flex gap-2 w-full md:w-auto">
                    <button
                        onClick={fetchTrips}
                        className="flex items-center gap-2 px-4 py-3 bg-blue-50 text-blue-600 border border-blue-100 rounded-2xl text-sm font-bold hover:bg-blue-100 transition-colors shadow-sm"
                    >
                        รีเฟรชข้อมูล
                    </button>
                </div> */}
            </div>

            <div className="grid grid-cols-1 gap-3 sm:gap-4">
                {filteredTrips.length === 0 ? (
                    <div className="text-center py-20 bg-gray-50 rounded-3xl border-2 border-dashed border-gray-200">
                        <p className="text-gray-400 font-medium font-sans">ไม่พบข้อมูลที่ตรงกับการค้นหาของคุณ</p>
                    </div>
                ) : (
                    filteredTrips.map((trip) => (
                        <div
                            key={trip.id}
                            className="group flex flex-col lg:flex-row lg:items-center gap-4 sm:gap-6 p-4 sm:p-6 bg-white rounded-2xl sm:rounded-3xl border border-gray-100 hover:border-blue-100 hover:shadow-xl hover:shadow-blue-500/5 transition-all duration-300"
                        >
                            <div className="flex items-center gap-4 lg:w-1/4">
                                <div className="w-14 h-14 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-2xl flex items-center justify-center text-white shadow-lg shadow-blue-200 overflow-hidden">
                                    {trip.technician?.avatar_url ? (
                                        <img src={trip.technician.avatar_url} alt="" className="w-full h-full object-cover" />
                                    ) : (
                                        <FiTruck size={24} />
                                    )}
                                </div>
                                <div>
                                    <p className="text-[10px] font-bold text-blue-600 mb-0.5">#{trip.id.slice(0, 8).toUpperCase()}</p>
                                    <h4 className="font-bold text-gray-900 leading-tight">{trip.technician?.full_name || 'ยังไม่ระบุช่าง'}</h4>
                                    <p className="text-xs text-gray-400 font-medium">
                                        ทะเบียนรถ : {trip.technician?.car_reg && trip.technician.car_reg.trim() !== ''
                                            ? trip.technician.car_reg
                                            : 'ไม่ระบุทะเบียนรถ'}
                                    </p>
                                </div>
                            </div>

                            <div className="flex-1 grid grid-cols-1 sm:grid-cols-2 gap-4">
                                <div className="flex items-start gap-3">
                                    <div className="mt-1 w-8 h-8 rounded-lg bg-emerald-50 flex items-center justify-center text-emerald-600">
                                        <FiMapPin size={16} />
                                    </div>
                                    <div>
                                        <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">จุดหมายปลายทาง</p>
                                        <p className="text-sm font-semibold text-gray-700 truncate max-w-[200px]">{trip.location_name || 'ตำแหน่งลูกค้า'}</p>
                                        <p className="text-[10px] text-blue-500 font-bold tabular-nums">
                                            {trip.lat?.toFixed(6)}, {trip.lng?.toFixed(6)}
                                        </p>
                                    </div>
                                </div>
                                <div className="flex items-start gap-3">
                                    <div className="mt-1 w-8 h-8 rounded-lg bg-blue-50 flex items-center justify-center text-blue-600">
                                        <FiClock size={16} />
                                    </div>
                                    <div className="min-w-0 flex-1">
                                        <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider text-left">สถานงาน</p>
                                        <div className="flex items-center gap-2">
                                            <p className="text-sm font-semibold text-gray-700 whitespace-nowrap">{getStatus(trip.status).label}</p>
                                            {trip.status === 'in_progress' && trip.technician_id && (
                                                <button
                                                    onClick={() => setTrackingTrip(trip)}
                                                    className="flex items-center gap-1 px-2 py-0.5 bg-blue-500 text-white rounded-full hover:bg-blue-600 transition-all active:scale-95 shadow-sm shadow-blue-100 group/btn"
                                                >
                                                    <span className="relative flex h-1.5 w-1.5">
                                                        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-white opacity-75"></span>
                                                        <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-white"></span>
                                                    </span>
                                                    <span className="text-[10px] font-black uppercase tracking-wider">LIVE </span>
                                                </button>
                                            )}
                                        </div>
                                    </div>
                                </div>
                            </div>

                            <div className="lg:w-1/5 flex items-center justify-between lg:justify-end gap-8 border-t lg:border-t-0 pt-4 lg:pt-0">
                                <div className="text-right">
                                    <span className={`px-4 py-1.5 rounded-full text-[10px] font-bold uppercase tracking-widest ${getStatus(trip.status).style}`}>
                                        {getStatus(trip.status).label}
                                    </span>
                                    <p className="text-[10px] text-gray-400 font-medium mt-2">
                                        {new Date(trip.updated_at).toLocaleString('th-TH')}
                                    </p>
                                </div>
                            </div>
                        </div>
                    ))
                )}
            </div>

            <LiveTrackModal
                isOpen={!!trackingTrip}
                onClose={() => setTrackingTrip(null)}
                trip={trackingTrip}
            />
        </div>
    );
};

export default TripHistory;
