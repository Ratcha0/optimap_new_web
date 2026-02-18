import React, { useState, useEffect } from 'react';
import { MapContainer, TileLayer, Marker, Popup, Polyline } from 'react-leaflet';
import L from 'leaflet';
import { supabase } from '../../utils/supabaseClient';
import { FiX, FiTruck, FiThermometer, FiZap, FiActivity, FiNavigation, FiDroplet } from 'react-icons/fi';
import { getEngineStatusDisplay, STATUS_THRESHOLDS } from '../../utils/statusUtils';
import VehicleStatusDashboard from '../ui/VehicleStatusDashboard';
import { MapInstanceCapturer } from '../map/MapHelpers';
import { MAP_TILE_URL } from '../../constants/api';
import { MAP_CONFIG } from '../../constants/visuals';
import technicialcar from '../../assets/technicialcar.png';

export default function LiveTrackModal({ isOpen, onClose, trip }) {
    const [techLocation, setTechLocation] = useState(null);
    const [mapInstance, setMapInstance] = useState(null);
    const [loading, setLoading] = useState(true);
    const [teamMembers, setTeamMembers] = useState([]);

    useEffect(() => {
        if (!isOpen || !trip?.technician_id) return;

        const fetchInitialData = async () => {
        
            const { data: mainTech } = await supabase
                .from('profiles')
                .select(`
                    last_lat, last_lng, full_name, avatar_url, team_name, car_reg, phone,
                    car_status(engine_temp, battery_volt, water_level, fuel_level, oil_level, vehicle_speed, odometer, engine_status, last_updated)
                `)
                .eq('id', trip.technician_id)
                .single();

            if (mainTech) setTechLocation(mainTech);

           
            const { data: assignments } = await supabase
                .from('ticket_assignments')
                .select('technician_id')
                .eq('ticket_id', trip.id)
                .eq('status', 'accepted');

            if (assignments && assignments.length > 0) {
                const teamIds = assignments.map(a => a.technician_id);
                const teamIdsFiltered = teamIds.filter(id => id !== trip.technician_id);
                
                if (teamIdsFiltered.length > 0) {
                    const { data: teamProfiles } = await supabase
                        .from('profiles')
                        .select('id, full_name, avatar_url, phone, car_reg, team_name')
                        .in('id', teamIdsFiltered);
                    
                    if (teamProfiles) setTeamMembers(teamProfiles);
                } else {
                     setTeamMembers([]);
                }
            } else {
                setTeamMembers([]);
            }

            setLoading(false);
        };

        fetchInitialData();

        const profileChannel = supabase.channel(`live-profile-${trip.technician_id}`)
            .on('postgres_changes',
                { event: 'UPDATE', schema: 'public', table: 'profiles', filter: `id=eq.${trip.technician_id}` },
                (payload) => {
                    setTechLocation(prev => {
                        if (!prev) return null;
                        return { ...prev, ...payload.new, car_status: prev.car_status };
                    });
                }
            ).subscribe();

        const statusChannel = supabase.channel(`live-status-${trip.technician_id}`)
            .on('postgres_changes',
                { event: '*', schema: 'public', table: 'car_status', filter: `id=eq.${trip.technician_id}` },
                (payload) => {
                    setTechLocation(prev => {
                        if (!prev) return null;
                        return { ...prev, car_status: payload.new || payload.old };
                    });
                }
            ).subscribe();

        return () => {
            supabase.removeChannel(profileChannel);
            supabase.removeChannel(statusChannel);
        };
    }, [isOpen, trip?.technician_id, trip?.id]);

    if (!isOpen || !trip) return null;

    const techIcon = L.divIcon({
        className: 'tech-marker-live',
        html: `
            <div class="relative flex items-center justify-center" style="width: 80px; height: 80px;">
                <div class="absolute w-12 h-12 rounded-full bg-blue-500 opacity-20 animate-ping"></div>
                <div class="w-16 h-16 relative z-10 flex items-center justify-center">
                    <img src="${technicialcar}" class="w-full h-full object-contain filter drop-shadow-lg" />
                </div>
            </div>
        `,
        iconSize: [80, 80],
        iconAnchor: [40, 70]
    });

    const destinationIcon = L.divIcon({
        className: 'dest-marker',
        html: `
            <div class="w-10 h-10 bg-white rounded-xl flex items-center justify-center shadow-xl border-2 border-rose-500 text-rose-500">
                <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round">
                    <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"></path>
                    <circle cx="12" cy="10" r="3"></circle>
                </svg>
            </div>
        `,
        iconSize: [40, 40],
        iconAnchor: [20, 40]
    });

    const rawCarStatus = techLocation?.car_status;
    const carStatusData = Array.isArray(rawCarStatus) ? rawCarStatus[0] : rawCarStatus;
    const statusDisplay = carStatusData ? getEngineStatusDisplay(carStatusData) : null;

    return (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[11000] flex items-center justify-center p-4">
            <div className="bg-white w-full max-w-4xl h-[80vh] rounded-[2.5rem] shadow-2xl relative overflow-hidden flex flex-col animate-in zoom-in-95 duration-200">
                <div className="p-6 border-b border-gray-100 flex items-center justify-between bg-white relative z-20">
                    <div className="flex items-center gap-4">
                        <div className="w-12 h-12 rounded-2xl bg-blue-50 flex items-center justify-center text-blue-600">
                            <FiTruck size={24} />
                        </div>
                        <div>
                            <h3 className="text-xl font-black text-gray-900 leading-tight">ติดตามตำแหน่งช่างเรียลไทม์</h3>
                            <p className="text-xs text-gray-400 font-bold uppercase tracking-widest">
                                รหัสงาน: #{trip.id.slice(0, 8).toUpperCase()}
                            </p>
                        </div>
                    </div>
                    <button onClick={onClose} className="p-3 bg-gray-50 hover:bg-gray-100 text-gray-400 rounded-2xl transition-all active:scale-95">
                        <FiX size={24} />
                    </button>
                </div>

                <div className="flex-1 relative">
                    {loading ? (
                        <div className="absolute inset-0 flex flex-col items-center justify-center bg-gray-50 z-10">
                            <div className="w-12 h-12 border-4 border-blue-200 border-t-blue-600 rounded-full animate-spin mb-4"></div>
                            <p className="text-sm font-bold text-gray-400">กำลังเชื่อมต่อพิกัดช่าง...</p>
                        </div>
                    ) : (
                        <MapContainer
                            center={[trip.lat, trip.lng]}
                            zoom={13}
                            style={{ height: '100%', width: '100%' }}
                            zoomControl={false}
                            maxBounds={MAP_CONFIG.THAILAND_BOUNDS}
                            minZoom={MAP_CONFIG.MIN_ZOOM}
                            maxBoundsViscosity={1.0}
                        >
                            <MapInstanceCapturer setMapInstance={setMapInstance} />
                            <TileLayer url={MAP_TILE_URL} maxZoom={MAP_CONFIG.MAX_ZOOM} />

                            {techLocation?.last_lat && (
                                <Marker position={[techLocation.last_lat, techLocation.last_lng]} icon={techIcon}>
                                    <Popup className="rounded-3xl overflow-hidden shadow-2xl border-none">
                                        <div className="p-4 flex flex-col gap-4 min-w-[320px] max-h-[60vh] overflow-y-auto thin-scrollbar">
                                            <div className="flex items-center gap-4">
                                                <div className="relative">
                                                    <img 
                                                        src={techLocation.avatar_url || `https://ui-avatars.com/api/?name=${techLocation.full_name}&background=0D8ABC&color=fff`}
                                                        className="w-14 h-14 rounded-2xl object-cover shadow-lg border-2 border-blue-500" 
                                                        onError={(e) => {
                                                            e.target.src = `https://ui-avatars.com/api/?name=${techLocation.full_name || 'T'}&background=0D8ABC&color=fff`;
                                                        }}
                                                    />
                                                </div>
                                                <div>
                                                    <div className="text-[10px] font-black text-blue-500 uppercase tracking-widest leading-none mb-1">
                                                        ตำแหน่งช่าง (Real-time)
                                                    </div>
                                                    <div className="text-base font-black text-gray-900 leading-none truncate max-w-[180px]">{techLocation.full_name}</div>
                                                    <div className="text-[10px] text-gray-400 font-bold mt-1">
                                                        {techLocation.team_name || 'ศูนย์บริการ'} • {techLocation.car_reg || 'ไม่ระบุทะเบียน'}
                                                    </div>
                                                </div>
                                            </div>

                                            {teamMembers.length > 0 ? (
                                                <details className="group/status" open>
                                                    <summary className="list-none cursor-pointer">
                                                        <div className="flex items-center justify-between text-[10px] font-black text-gray-400 uppercase tracking-widest bg-gray-50 p-2 rounded-xl mb-2 hover:bg-gray-100 transition-colors">
                                                            <div className="flex items-center gap-2">
                                                                <span>สถานะรถยนต์</span>
                                                                {statusDisplay && (
                                                                    <div className="flex items-center gap-1.5 px-2 py-0.5 bg-white rounded-md shadow-sm border border-gray-100">
                                                                        <span className={`w-1.5 h-1.5 rounded-full ${statusDisplay.dot} ${!statusDisplay.isCritical ? 'animate-pulse' : ''}`}></span>
                                                                        <span className={`${statusDisplay.color} font-bold`}>{statusDisplay.text}</span>
                                                                    </div>
                                                                )}
                                                            </div>
                                                            <svg className="w-4 h-4 transform group-open/status:rotate-180 transition-transform text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                                                            </svg>
                                                        </div>
                                                    </summary>
                                                    <div className="bg-gray-50/50 rounded-2xl p-1 border border-gray-100 mb-2">
                                                        <VehicleStatusDashboard carStatus={carStatusData} isCollapsible={true} />
                                                    </div>
                                                </details>
                                            ) : (
                                                <div className="bg-gray-50/50 rounded-2xl p-1 border border-gray-100">
                                                    <VehicleStatusDashboard carStatus={carStatusData} />
                                                </div>
                                            )}

                                            {teamMembers.length > 0 && (
                                                <details className="group/team" open>
                                                    <summary className="list-none cursor-pointer mb-2">
                                                        <div className="flex items-center justify-between text-[10px] font-black text-gray-400 uppercase tracking-widest px-1 hover:text-gray-600 transition-colors">
                                                            <span>สมาชิกทีม ({teamMembers.length + 1})</span>
                                                            <svg className="w-4 h-4 transform group-open/team:rotate-180 transition-transform text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                                                            </svg>
                                                        </div>
                                                    </summary>
                                                    <div className="flex flex-col gap-2 max-h-[120px] overflow-y-auto pr-1">
                                                        <div className="flex items-center gap-2 p-1.5 rounded-xl transition-colors bg-blue-50 border border-blue-100">
                                                            <img 
                                                                src={techLocation.avatar_url || `https://ui-avatars.com/api/?name=${techLocation.full_name}&background=0D8ABC&color=fff`} 
                                                                className="w-8 h-8 rounded-lg object-cover shadow-sm shrink-0" 
                                                                onError={(e) => {
                                                                    e.target.src = `https://ui-avatars.com/api/?name=${techLocation.full_name || 'T'}&background=0D8ABC&color=fff`;
                                                                }}
                                                            />
                                                            <div className="flex-1 min-w-0">
                                                                <div className="text-xs font-black text-gray-900 truncate flex items-center gap-1">
                                                                    {techLocation.full_name}
                                                                    <span className="text-[8px] bg-blue-100 text-blue-600 px-1 rounded shrink-0">หลัก</span>
                                                                </div>
                                                                <div className="flex items-center gap-1.5">
                                                                    <div className="text-[9px] text-gray-400 font-bold leading-none">{techLocation.car_reg}</div>
                                                                </div>
                                                            </div>
                                                            {techLocation.phone && (
                                                                <a href={`tel:${techLocation.phone}`} className="p-1.5 bg-green-500 rounded-lg hover:bg-green-600 transition-all shrink-0">
                                                                    <svg className="w-3.5 h-3.5" fill="none" stroke="white" viewBox="0 0 24 24">
                                                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
                                                                    </svg>
                                                                </a>
                                                            )}
                                                        </div>

                                                        {teamMembers.map(member => (
                                                            <div key={member.id} className="flex items-center gap-2 p-1.5 rounded-xl transition-colors bg-white border border-gray-100">
                                                                <img 
                                                                    src={member.avatar_url || `https://ui-avatars.com/api/?name=${member.full_name}&background=64748b&color=fff`} 
                                                                    className="w-8 h-8 rounded-lg object-cover shadow-sm shrink-0" 
                                                                    onError={(e) => {
                                                                        e.target.src = `https://ui-avatars.com/api/?name=${member.full_name || 'T'}&background=64748b&color=fff`;
                                                                    }}
                                                                />
                                                                <div className="flex-1 min-w-0">
                                                                    <div className="text-xs font-black text-gray-900 truncate flex items-center gap-1">
                                                                        {member.full_name}
                                                                    </div>
                                                                    <div className="flex items-center gap-1.5">
                                                                        <div className="text-[9px] text-gray-400 font-bold leading-none">{member.car_reg || 'ผู้ช่วยช่าง'}</div>
                                                                    </div>
                                                                </div>
                                                                {member.phone && (
                                                                    <a href={`tel:${member.phone}`} className="p-1.5 bg-green-500 rounded-lg hover:bg-green-600 transition-all shrink-0">
                                                                        <svg className="w-3.5 h-3.5" fill="none" stroke="white" viewBox="0 0 24 24">
                                                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
                                                                        </svg>
                                                                    </a>
                                                                )}
                                                            </div>
                                                        ))}
                                                    </div>
                                                </details>
                                            )}

                                            <div className="flex flex-col gap-2 pt-2 border-t border-gray-50">
                                                {techLocation.phone && (
                                                    <a href={`tel:${techLocation.phone}`}
                                                        style={{ color: 'white' }}
                                                        className="w-full bg-green-600 hover:bg-green-500 text-white font-black py-3 rounded-2xl text-[14px] flex items-center justify-center gap-2 transition-all active:scale-95 shadow-lg shadow-green-500/20 uppercase tracking-wider no-underline border-none cursor-pointer h-12">
                                                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
                                                        </svg>
                                                        ติดต่อเจ้าหน้าที่
                                                    </a>
                                                )}
                                            </div>
                                        </div>
                                    </Popup>
                                </Marker>
                            )}

                            <Marker position={[trip.lat, trip.lng]} icon={destinationIcon}>
                                <Popup className="rounded-2xl overflow-hidden shadow-xl border-none">
                                    <div className="p-3">
                                        <div className="text-[10px] font-black text-rose-500 uppercase tracking-widest mb-1">จุดหมายปลายทาง</div>
                                        <div className="text-sm font-black text-gray-900">{trip.location_name || 'ลูกค้า'}</div>
                                    </div>
                                </Popup>
                            </Marker>

                            {techLocation?.last_lat && (
                                <Polyline
                                    positions={[[techLocation.last_lat, techLocation.last_lng], [trip.lat, trip.lng]]}
                                    color="#3b82f6" weight={3} dashArray="10, 10" opacity={0.6}
                                />
                            )}
                        </MapContainer>
                    )}

                    {!loading && techLocation?.last_lat && (
                        <button
                            onClick={() => {
                                if (mapInstance && techLocation?.last_lat) {
                                    mapInstance.flyTo([techLocation.last_lat, techLocation.last_lng], 17, {
                                        animate: true,
                                        duration: 1.5
                                    });
                                }
                            }}
                            className="absolute top-6 right-6 z-[1000] w-12 h-12 bg-white rounded-2xl shadow-2xl flex items-center justify-center border-2 border-blue-500 hover:bg-blue-50 transition-all active:scale-95 group"
                        >
                            <div className="relative w-9 h-9">
                                <img src={technicialcar} className="w-full h-full object-contain filter drop-shadow-md group-hover:scale-100 transition-transform" />
                           
                            </div>
                        </button>
                    )}
                </div>
            </div>
        </div>
    );
}
