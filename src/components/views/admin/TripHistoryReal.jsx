import React, { useState, useEffect, useRef } from 'react';
import { supabase } from '../../../utils/supabaseClient';
import { reverseGeocode } from '../../../utils/mapUtils';
import { FiSearch, FiCalendar, FiMapPin, FiClock, FiChevronRight, FiUser, FiArrowLeft, FiRefreshCw } from 'react-icons/fi';
import maplibregl from 'maplibre-gl';
import 'maplibre-gl/dist/maplibre-gl.css';

const TripHistoryReal = () => {
    const [view, setView] = useState('list'); 
    const [searchTerm, setSearchTerm] = useState('');
    const [techs, setTechs] = useState([]);
    const [selectedTech, setSelectedTech] = useState(null);
    const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);
    const [locationLogs, setLocationLogs] = useState([]);
    const [logAddresses, setLogAddresses] = useState({});
    const [showAllLogs, setShowAllLogs] = useState(false);
    const [loading, setLoading] = useState(false);
    const mapContainer = useRef(null);
    const map = useRef(null);
    const markersRef = useRef([]);

    useEffect(() => {
        fetchTechs();
    }, []);

    const fetchTechs = async () => {
        const { data, error } = await supabase
            .from('profiles')
            .select('*')
            .eq('role', 'technician')
            .order('full_name');
        if (!error && data) setTechs(data);
    };

    const fetchLogs = async (techId, date) => {
        setLoading(true);
        const startOfDay = `${date}T00:00:00Z`;
        const endOfDay = `${date}T23:59:59Z`;

        const { data, error } = await supabase
            .from('location_logs')
            .select('*')
            .eq('technician_id', techId)
            .gte('created_at', startOfDay)
            .lte('created_at', endOfDay)
            .order('created_at', { ascending: true });

        if (!error && data) {
            setLocationLogs(data);
            if (data.length > 0) {
                for (const log of data) {
                    reverseGeocode(log.lat, log.lng).then(addr => {
                        setLogAddresses(prev => ({ ...prev, [log.id]: addr }));
                    });
                }
            }
        }
        setLoading(false);
    };

    const updateMap = (logs) => {
        if (!map.current) return;

        markersRef.current.forEach(m => m.remove());
        markersRef.current = [];

        if (map.current.getLayer('route')) map.current.removeLayer('route');
        if (map.current.getSource('route')) map.current.removeSource('route');

        const coordinates = logs.map(log => [log.lng, log.lat]);

        map.current.addSource('route', {
            type: 'geojson',
            data: {
                type: 'Feature',
                properties: {},
                geometry: {
                    type: 'LineString',
                    coordinates: coordinates
                }
            }
        });

        map.current.addLayer({
            id: 'route',
            type: 'line',
            source: 'route',
            layout: { 'line-join': 'round', 'line-cap': 'round' },
            paint: { 'line-color': '#3b82f6', 'line-width': 4, 'line-opacity': 0.8 }
        });

     
        logs.forEach((log, idx) => {
            const isStart = idx === 0;
            const isEnd = idx === logs.length - 1;
            
            const el = document.createElement('div');
            el.className = `w-6 h-6 ${isStart ? 'bg-emerald-500' : (isEnd ? 'bg-rose-500' : 'bg-blue-500')} rounded-full border-4 border-white shadow-lg flex items-center justify-center text-[10px] text-white font-bold`;
            el.innerText = isStart ? 'S' : (isEnd ? 'E' : (idx + 1));
            
            const marker = new maplibregl.Marker({ element: el })
                .setLngLat([log.lng, log.lat])
                .addTo(map.current);
            markersRef.current.push(marker);
        });

        if (coordinates.length > 0) {
            const bounds = new maplibregl.LngLatBounds();
            coordinates.forEach(c => bounds.extend(c));
            map.current.fitBounds(bounds, { padding: 50, maxZoom: 15 });
        }
    };

    useEffect(() => {
        if (view === 'detail' && mapContainer.current && !map.current) {
            map.current = new maplibregl.Map({
                container: mapContainer.current,
                style: {
                    version: 8,
                    sources: {
                        'carto-voyager': {
                            type: 'raster',
                            tiles: ['https://a.tile.openstreetmap.org/{z}/{x}/{y}.png'],
                            tileSize: 256,
                            attribution: '© OpenStreetMap contributors © CARTO'
                        }
                    },
                    layers: [{ id: 'carto-voyager', type: 'raster', source: 'carto-voyager' }]
                },
                center: [100.5018, 13.7563],
                zoom: 12,
                maxZoom: 19
            });

            const resizeTimeout = setTimeout(() => {
                if (map.current) {
                    map.current.resize();
                }
            }, 300);

            const handleResize = () => {
                if (map.current) map.current.resize();
            };
            
            const resizeObserver = new ResizeObserver(() => {
                handleResize();
            });
            
            resizeObserver.observe(mapContainer.current);
            window.addEventListener('resize', handleResize);
            window.addEventListener('orientationchange', handleResize);

            return () => {
                clearTimeout(resizeTimeout);
                resizeObserver.disconnect();
                window.removeEventListener('resize', handleResize);
                window.removeEventListener('orientationchange', handleResize);
            };
        }
    }, [view]);


    useEffect(() => {
        if (view === 'detail' && map.current) {
            const triggerUpdate = () => {
                if (map.current) {
                    map.current.resize();
                    updateMap(locationLogs);
                }
            };

            if (map.current.isStyleLoaded()) {
                triggerUpdate();
            } else {
                map.current.once('load', triggerUpdate);
            }
        }
    }, [locationLogs, view]);

useEffect(() => {
    let channel;
    if (view === 'detail' && selectedTech) {
            fetchLogs(selectedTech.id, selectedDate);

            
            const localToday = new Date().toLocaleDateString('en-CA');
            const isToday = selectedDate === localToday;
            if (isToday) {
                channel = supabase
                    .channel(`live-logs-${selectedTech.id}`)
                    .on('postgres_changes', 
                        { 
                            event: 'INSERT', 
                            schema: 'public', 
                            table: 'location_logs',
                            filter: `technician_id=eq.${selectedTech.id}`
                        }, 
                        (payload) => {
                            const newLog = payload.new;
                            setLocationLogs(prev => {
                                const updated = [...prev, newLog];
                                updateMap(updated);
                                
                                reverseGeocode(newLog.lat, newLog.lng).then(addr => {
                                    setLogAddresses(p => ({ ...p, [newLog.id]: addr }));
                                });
                                return updated;
                            });
                        }
                    )
                    .subscribe();
            }
        }

        return () => {
            if (channel) supabase.removeChannel(channel);
        };
    }, [view, selectedTech, selectedDate]);

    useEffect(() => {
        return () => {
            if (map.current) {
                map.current.remove();
                map.current = null;
            }
        };
    }, []);

    useEffect(() => {
        if (view === 'list' && map.current) {
            map.current.remove();
            map.current = null;
        }
    }, [view]);

    const handleTechSelect = (tech) => {
        setSelectedTech(tech);
        setView('detail');
    };

    const handleDateChange = (e) => {
        const newDate = e.target.value;
        setSelectedDate(newDate);
        if (selectedTech) fetchLogs(selectedTech.id, newDate);
    };

    const filteredTechs = techs.filter(t => 
        t.full_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        t.car_reg?.toLowerCase().includes(searchTerm.toLowerCase())
    );

    return (
        <div className="h-full flex flex-col font-sans">
            {view === 'list' ? (
                <div className="p-6">
                    <div className="mb-8">
                        <h3 className="text-xl font-black text-gray-900 mb-2">บันทึกการเดินทาง</h3>
                        <p className="text-sm text-gray-500">เลือกช่างที่ต้องการตรวจสอบประวัติการเคลื่อนที่</p>
                    </div>

                    <div className="relative max-w-md mb-8">
                        <FiSearch className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" />
                        <input
                            type="text"
                            placeholder="ค้นหาชื่อช่าง หรือทะเบียนรถ..."
                            className="w-full pl-12 pr-4 py-3 bg-gray-50 border-none rounded-2xl focus:ring-2 focus:ring-blue-500 transition-all font-bold text-sm"
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                        />
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                        {filteredTechs.map(tech => (
                            <div 
                                key={tech.id}
                                onClick={() => handleTechSelect(tech)}
                                className="bg-white border border-gray-100 p-4 rounded-3xl hover:border-blue-400 hover:shadow-xl hover:shadow-blue-500/5 transition-all cursor-pointer group"
                            >
                                <div className="flex items-center gap-4">
                                    <img 
                                        src={tech.avatar_url || `https://ui-avatars.com/api/?name=${tech.full_name}&background=random`} 
                                        className="w-14 h-14 rounded-2xl object-cover shadow-md"
                                        alt=""
                                    />
                                    <div className="flex-1 min-w-0">
                                        <h4 className="font-black text-gray-900 truncate">{tech.full_name}</h4>
                                        <p className="text-xs text-gray-400 font-bold mb-2">{tech.car_reg || 'ไม่ระบุทะเบียน'}</p>
                                        <div className="flex items-center gap-1 text-[10px] text-blue-500 font-black uppercase tracking-widest">
                                            <span>ดูประวัติการวิ่ง</span>
                                            <FiChevronRight />
                                        </div>
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            ) : (
                <div className="flex-1 flex flex-col min-h-0">
                    <div className="p-4 border-b border-gray-100 bg-white flex flex-wrap items-center justify-between gap-4">
                        <div className="flex items-center gap-4">
                            <button 
                                onClick={() => setView('list')}
                                className="p-2 hover:bg-gray-100 rounded-xl transition-all"
                            >
                                <FiArrowLeft size={20} />
                            </button>
                            <div className="flex items-center gap-3">
                                <img src={selectedTech.avatar_url || `https://ui-avatars.com/api/?name=${selectedTech.full_name}&background=random`} className="w-10 h-10 rounded-xl object-cover" alt="" />
                                <div>
                                    <h4 className="font-black text-sm text-gray-900 leading-none">{selectedTech.full_name}</h4>
                                    <p className="text-[10px] text-gray-400 font-bold mt-1 uppercase tracking-widest">{selectedTech.car_reg}</p>
                                </div>
                            </div>
                        </div>

                        <div className="flex items-center gap-3 bg-gray-50 p-2 rounded-2xl border border-gray-100">
                            <FiCalendar className="text-blue-500" />
                            <input 
                                type="date" 
                                value={selectedDate}
                                onChange={handleDateChange}
                                className="bg-transparent border-none p-0 text-sm font-black focus:ring-0"
                            />
                            <div className="w-[1px] h-4 bg-gray-200 mx-1"></div>
                            <button 
                                onClick={() => fetchLogs(selectedTech.id, selectedDate)}
                                className={`p-1 hover:text-blue-600 transition-all ${loading ? "animate-spin text-blue-500" : "text-gray-400"}`}
                                title="รีเฟรชข้อมูล"
                            >
                                <FiRefreshCw size={14} />
                            </button>
                        </div>
                    </div>

                    <div className="flex-1 relative flex flex-col lg:flex-row min-h-0 bg-white">
                        <div className="relative w-full h-[500px] lg:min-h-[600px] lg:flex-1 bg-gray-50 border-b lg:border-b-0 lg:border-r border-gray-100 overflow-hidden">
                            <div ref={mapContainer} className="absolute inset-0 w-full h-full" />
                            {loading && (
                                <div className="absolute inset-0 bg-white/60 backdrop-blur-sm z-10 flex flex-col items-center justify-center">
                                    <div className="w-10 h-10 border-4 border-blue-100 border-t-blue-500 rounded-full animate-spin mb-3"></div>
                                    <p className="text-xs font-black text-gray-500 uppercase tracking-widest">กำลังโหลดข้อมูลเส้นทาง...</p>
                                </div>
                            )}
                            {!loading && locationLogs.length === 0 && (
                                <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 bg-white/90 backdrop-blur shadow-2xl p-6 rounded-3xl border border-gray-100 text-center z-10">
                                    <FiMapPin className="mx-auto text-gray-300 mb-3" size={32} />
                                    <p className="text-sm font-black text-gray-900">ไม่พบประวัติการเดินทาง</p>
                                    <p className="text-[10px] text-gray-400 font-bold uppercase mt-1">ในวันที่ {new Date(selectedDate).toLocaleDateString('th-TH')}</p>
                                </div>
                            )}
                        </div>

                        <div className="w-full lg:w-80 bg-white border-l border-gray-100 flex flex-col min-h-0">
                            <div className="p-6 border-b border-gray-50 bg-gray-50/50">
                                <h5 className="text-[10px] font-black text-gray-400 uppercase tracking-widest flex items-center justify-between">
                                    Timeline การเดินทาง
                                    <span className="bg-blue-100 text-blue-600 px-2 py-0.5 rounded-full text-[9px]">{locationLogs.length} จุด</span>
                                </h5>
                            </div>
                            <div className="flex-1 overflow-y-auto p-6 scrollbar-thin scrollbar-thumb-gray-200" style={{ maxHeight: 'calc(100vh - 250px)' }}>
                                <div className="space-y-6">
                                    {locationLogs.length === 0 ? (
                                        <div className="text-center py-20">
                                            <FiClock className="mx-auto text-gray-200 mb-3" size={24} />
                                            <p className="text-xs text-gray-400 italic">ไม่มีข้อมูลการ Check-in</p>
                                        </div>
                                    ) : (
                                        <>
                                            {[...locationLogs]
                                                .reverse()
                                                .slice(0, showAllLogs ? undefined : 8)
                                                .map((log, idx, arr) => (
                                                    <div key={log.id} className="relative pl-6 group">
                                                        <div className="absolute left-0 top-1.5 w-2.5 h-2.5 rounded-full bg-blue-500 border-2 border-white shadow-md z-10 transition-transform group-hover:scale-125"></div>
                                                        {(idx !== arr.length - 1 || (!showAllLogs && locationLogs.length > 10)) && (
                                                            <div className="absolute left-[4px] top-4 w-[2px] h-full bg-blue-100/50"></div>
                                                        )}
                                                        <div>
                                                            <p className="text-[10px] font-black text-blue-600 mb-0.5">
                                                                {new Date(log.created_at).toLocaleTimeString('th-TH', { hour: '2-digit', minute: '2-digit' })} น.
                                                            </p>
                                                            <p className="text-[10px] text-gray-700 font-bold tracking-tight line-clamp-2 leading-snug">
                                                                {logAddresses[log.id] || 'กำลังตรวจสอบจุดนี้...'}
                                                            </p>
                                                            <p className="text-[8px] text-gray-400 font-medium uppercase mt-0.5">Check-in #{locationLogs.length - idx}</p>
                                                        </div>
                                                    </div>
                                                ))}
                                            
                                            {!showAllLogs && locationLogs.length > 10 && (
                                                <button 
                                                    onClick={() => setShowAllLogs(true)}
                                                    className="w-full py-3 mt-2 border-2 border-dashed border-gray-100 rounded-2xl text-[10px] font-black text-blue-500 hover:bg-blue-50 hover:border-blue-100 transition-all uppercase tracking-widest"
                                                >
                                                    ดูประวัติเพิ่มเติมอีก {locationLogs.length - 10} จุด
                                                </button>
                                            )}
                                        </>
                                    )}
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default TripHistoryReal;
