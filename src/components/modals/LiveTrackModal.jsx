import React, { useState, useEffect, useRef } from 'react';
import maplibregl from 'maplibre-gl';
import 'maplibre-gl/dist/maplibre-gl.css';
import { supabase } from '../../utils/supabaseClient';
import { FiX, FiTruck } from 'react-icons/fi';
import { getEngineStatusDisplay } from '../../utils/statusUtils';
import VehicleStatusDashboard from '../ui/VehicleStatusDashboard';
import { MAP_CONFIG } from '../../constants/visuals';
import technicialcar from '../../assets/technicialcar.png';

export default function LiveTrackModal({ isOpen, onClose, trip }) {
    const mapContainer = useRef(null);
    const map = useRef(null);
    const markersRef = useRef({ tech: null, dest: null });
    const [techLocation, setTechLocation] = useState(null);
    const [loading, setLoading] = useState(true);
    const [teamMembers, setTeamMembers] = useState([]);

    const toLngLat = (coords) => {
        if (!coords) return null;
        if (Array.isArray(coords)) return [coords[1], coords[0]];
        return null;
    };

    useEffect(() => {
        if (!isOpen || !trip?.technician_id) return;

        const fetchData = async () => {
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

            if (assignments?.length > 0) {
                const teamIds = assignments.map(a => a.technician_id).filter(id => id !== trip.technician_id);
                if (teamIds.length > 0) {
                    const { data: profiles } = await supabase.from('profiles').select('*').in('id', teamIds);
                    if (profiles) setTeamMembers(profiles);
                }
            }
            setLoading(false);
        };

        fetchData();

        const profileSub = supabase.channel(`live-profile-${trip.technician_id}`)
            .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'profiles', filter: `id=eq.${trip.technician_id}` },
                (p) => setTechLocation(prev => prev ? ({ ...prev, ...p.new }) : null)
            ).subscribe();

        const statusSub = supabase.channel(`live-status-${trip.technician_id}`)
            .on('postgres_changes', { event: '*', schema: 'public', table: 'car_status', filter: `id=eq.${trip.technician_id}` },
                (p) => setTechLocation(prev => prev ? ({ ...prev, car_status: p.new || p.old }) : null)
            ).subscribe();

        return () => {
            supabase.removeChannel(profileSub);
            supabase.removeChannel(statusSub);
        };
    }, [isOpen, trip?.technician_id, trip?.id]);

    useEffect(() => {
        if (!isOpen || !mapContainer.current || map.current) return;

        map.current = new maplibregl.Map({
            container: mapContainer.current,
            style: {
                version: 8,
                sources: {
                    'osm': {
                        type: 'raster',
                        tiles: ['https://tile.openstreetmap.org/{z}/{x}/{y}.png'],
                        tileSize: 256
                    }
                },
                layers: [{ id: 'osm', type: 'raster', source: 'osm' }]
            },
            center: [trip.lng, trip.lat],
            zoom: 13
        });

        map.current.on('load', () => {
            map.current.addSource('line', {
                type: 'geojson',
                data: { type: 'Feature', geometry: { type: 'LineString', coordinates: [] } }
            });
            map.current.addLayer({
                id: 'line-layer',
                type: 'line',
                source: 'line',
                paint: { 'line-color': '#3b82f6', 'line-width': 3, 'line-dasharray': [2, 2] }
            });
        });

        return () => {
            if (map.current) {
                map.current.remove();
                map.current = null;
            }
        };
    }, [isOpen]);

    useEffect(() => {
        if (!map.current || !trip) return;

        if (!markersRef.current.dest) {
            const el = document.createElement('div');
            el.innerHTML = `
                <div class="w-10 h-10 bg-white rounded-xl flex items-center justify-center shadow-xl border-2 border-rose-500 text-rose-500">
                    <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round">
                        <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"></path>
                        <circle cx="12" cy="10" r="3"></circle>
                    </svg>
                </div>
            `;
            markersRef.current.dest = new maplibregl.Marker({ element: el })
                .setLngLat([trip.lng, trip.lat])
                .addTo(map.current);
        }
    }, [trip]);

    useEffect(() => {
        if (!map.current || !techLocation?.last_lat) return;

        const pos = [techLocation.last_lng, techLocation.last_lat];
        
        if (!markersRef.current.tech) {
            const el = document.createElement('div');
            el.innerHTML = `
                <div class="relative flex items-center justify-center" style="width: 80px; height: 80px;">
                    <div class="absolute w-12 h-12 rounded-full bg-blue-500 opacity-20 animate-ping"></div>
                    <img src="${technicialcar}" class="w-16 h-16 object-contain filter drop-shadow-lg" />
                </div>
            `;
            markersRef.current.tech = new maplibregl.Marker({ element: el })
                .setLngLat(pos)
                .addTo(map.current);
        } else {
            markersRef.current.tech.setLngLat(pos);
        }

        if (map.current.getSource('line')) {
            map.current.getSource('line').setData({
                type: 'Feature',
                geometry: { type: 'LineString', coordinates: [pos, [trip.lng, trip.lat]] }
            });
        }
    }, [techLocation, trip]);

    if (!isOpen || !trip) return null;

    const carStatusData = Array.isArray(techLocation?.car_status) ? techLocation?.car_status[0] : techLocation?.car_status;
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
                    <div ref={mapContainer} className="w-full h-full" />
                    {loading && (
                        <div className="absolute inset-0 flex flex-col items-center justify-center bg-gray-50 z-10">
                            <div className="w-12 h-12 border-4 border-blue-200 border-t-blue-600 rounded-full animate-spin mb-4"></div>
                            <p className="text-sm font-bold text-gray-400">กำลังเชื่อมต่อพิกัดช่าง...</p>
                        </div>
                    )}
                    
                    {!loading && techLocation?.last_lat && (
                        <button
                            onClick={() => map.current?.flyTo({ center: [techLocation.last_lng, techLocation.last_lat], zoom: 17, duration: 1500 })}
                            className="absolute top-6 right-6 z-[1000] w-12 h-12 bg-white rounded-2xl shadow-2xl flex items-center justify-center border-2 border-blue-500 hover:bg-blue-50 transition-all active:scale-95 group"
                        >
                            <img src={technicialcar} className="w-9 h-9 object-contain filter drop-shadow-md" />
                        </button>
                    )}
                </div>

                {techLocation && (
                    <div className="p-6 bg-white border-t border-gray-100 grid grid-cols-1 md:grid-cols-2 gap-6 relative z-20 overflow-y-auto max-h-[30vh]">
                        <div className="flex items-center gap-4">
                            <img 
                                src={techLocation.avatar_url || `https://ui-avatars.com/api/?name=${techLocation.full_name}&background=0D8ABC&color=fff`}
                                className="w-16 h-16 rounded-2xl object-cover shadow-lg border-2 border-blue-500" 
                            />
                            <div>
                                <div className="text-xs font-black text-blue-500 uppercase tracking-widest mb-1">ช่างเทคนิคยันต์อาสา</div>
                                <div className="text-lg font-black text-gray-900 leading-none">{techLocation.full_name}</div>
                                <div className="text-xs text-gray-400 font-bold mt-1">{techLocation.car_reg} • {techLocation.team_name}</div>
                                {techLocation.phone && (
                                    <a href={`tel:${techLocation.phone}`} className="mt-2 inline-flex items-center gap-2 bg-green-500 text-white px-4 py-1.5 rounded-xl text-xs font-black hover:bg-green-600 transition-all no-underline">
                                        <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" /></svg>
                                        โทรหาช่าง
                                    </a>
                                )}
                            </div>
                        </div>
                        <div className="bg-gray-50 rounded-2xl p-4 border border-gray-100">
                             <VehicleStatusDashboard carStatus={carStatusData} isCollapsible={true} />
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}
