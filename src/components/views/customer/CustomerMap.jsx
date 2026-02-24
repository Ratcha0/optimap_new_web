import React, { useEffect, useRef, useState, useCallback } from 'react';
import maplibregl from 'maplibre-gl';
import 'maplibre-gl/dist/maplibre-gl.css';
import { MAP_CONFIG } from '../../../constants/visuals';
import { EXTERNAL_LINKS } from '../../../constants/api';
import technicialcar from '../../../assets/technicialcar.png';
import { createRoot } from 'react-dom/client';
import VehicleStatusDashboard from '../../ui/VehicleStatusDashboard';
import { getEngineStatusDisplay } from '../../../utils/statusUtils';

const TechnicianPopupContent = ({ tech }) => {
    const carStatusData = Array.isArray(tech.car_status) ? tech.car_status[0] : tech.car_status;
    const statusDisplay = carStatusData ? getEngineStatusDisplay(carStatusData) : null;

    return (
        <div className="p-1 flex flex-col gap-3 min-w-[280px] font-kanit">
             <div className="flex items-center gap-3">
                <img 
                    src={tech.avatar_url || EXTERNAL_LINKS.DEFAULT_AVATAR}
                    className="w-12 h-12 rounded-xl object-cover shadow-lg border-2 border-blue-500" 
                    onError={(e) => { e.target.src = EXTERNAL_LINKS.DEFAULT_AVATAR; }}
                />
                <div className="min-w-0 flex-1">
                    <div className="text-[9px] font-black text-blue-500 uppercase tracking-widest leading-none mb-1">
                        ช่างเทคนิคที่กำลังมาหาคุณ
                    </div>
                    <div className="text-sm font-black text-gray-900 leading-none truncate">{tech.full_name}</div>
                    <div className="text-[9px] text-gray-400 font-bold mt-1">
                        {tech.team_name || 'ศูนย์บริการอีซูซุ ประชากิจ'} • {tech.car_reg || 'ไม่ระบุทะเบียน'}
                    </div>
                </div>
            </div>

            {carStatusData && (
                <div className="bg-gray-50/50 rounded-xl p-0.5 border border-gray-100">
                    <VehicleStatusDashboard carStatus={carStatusData} />
                </div>
            )}

            {tech.phone && (
                <div className="pt-1.5 border-t border-gray-100">
                    <a href={`tel:${tech.phone}`}
                        className="flex w-full bg-green-600 hover:bg-green-500 text-white font-black h-9 rounded-xl text-[11px] items-center justify-center gap-2 transition-all active:scale-95 shadow-lg shadow-green-500/10 uppercase tracking-widest no-underline border-none cursor-pointer">
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
                        </svg>
                        โทรหาช่าง
                    </a>
                </div>
            )}
        </div>
    );
};

const CustomerMap = ({
    defaultCenter,
    myPosition,
    setMyPosition,
    activeSelection,
    handleLocationSelect,
    techLocations = [],
    setActiveSelection,
    setMapInstance,
    userProfile,
    routePath = [],
    waypoints = [],
    setWaypoints,
    locationNames = {},
    visitOrder = {},
    autoSnapPaused,
    onMapInteract
}) => {
    const mapContainer = useRef(null);
    const map = useRef(null);
    const markersRef = useRef({
        user: null,
        techs: {},
        branches: [],
        waypoints: [],
        home: null,
        picking: null
    });
    const routeSourceRef = useRef(false);

    // Helper: Convert [Lat, Lng] to [Lng, Lat]
    const toLngLat = (coords) => {
        if (!coords) return null;
        if (Array.isArray(coords)) return [coords[1], coords[0]];
        if (coords.lng && coords.lat) return [coords.lng, coords.lat];
        return null;
    };

    // Helper: Create custom marker element
    const createMarkerElement = (html, className) => {
        const el = document.createElement('div');
        el.className = className;
        el.innerHTML = html;
        return el;
    };

    // Initialize Map
    useEffect(() => {
        if (!mapContainer.current) return;

        map.current = new maplibregl.Map({
            container: mapContainer.current,
            style: {
                version: 8,
                sources: {
                    'osm': {
                        type: 'raster',
                        tiles: ['https://tile.openstreetmap.org/{z}/{x}/{y}.png'],
                        tileSize: 256,
                        attribution: '&copy; OpenStreetMap contributors'
                    }
                },
                layers: [{ id: 'osm-layer', type: 'raster', source: 'osm' }]
            },
            center: toLngLat(myPosition || defaultCenter),
            zoom: 13,
            pitch: 0,
            antialias: true
        });

        map.current.on('load', () => {
            // Provide a shim for Leaflet-style methods in mapInstance
            const shimmap = map.current;
            shimmap.setView = (center, zoom) => {
                shimmap.flyTo({ center: toLngLat(center), zoom: zoom });
            };
            // Leaflet flyTo(center, zoom, options) -> MapLibre flyTo({center, zoom, ...})
            const originalFlyTo = shimmap.flyTo.bind(shimmap);
            shimmap.flyTo = (center, zoom, options) => {
                if (Array.isArray(center)) {
                    originalFlyTo({ center: toLngLat(center), zoom: zoom, ...options });
                } else {
                    originalFlyTo(center);
                }
            };

            setMapInstance(shimmap);
            
            map.current.addSource('route', {
                type: 'geojson',
                data: {
                    type: 'Feature',
                    properties: {},
                    geometry: { type: 'LineString', coordinates: [] }
                }
            });

            map.current.addLayer({
                id: 'route-line',
                type: 'line',
                source: 'route',
                layout: { 'line-join': 'round', 'line-cap': 'round' },
                paint: {
                    'line-color': '#2563EB',
                    'line-width': 6,
                    'line-opacity': 0.8
                }
            });

            routeSourceRef.current = true;
        });

        map.current.on('click', (e) => {
            if (e.originalEvent.target.closest('button') || e.originalEvent.target.closest('.maplibregl-popup')) return;
            if (!e.lngLat) return;

            const latlng = { lat: e.lngLat.lat, lng: e.lngLat.lng };
            
            if (activeSelection) {
                const type = typeof activeSelection === 'object' ? activeSelection.type : activeSelection;
                handleLocationSelect(type, [latlng.lat, latlng.lng]);
            }
        });

        const onInteraction = () => onMapInteract?.();
        map.current.on('dragstart', onInteraction);
        map.current.on('zoomstart', onInteraction);
        map.current.on('rotatestart', onInteraction);

        return () => {
            if (map.current) {
                map.current.remove();
                map.current = null;
            }
        };
    }, [activeSelection]);

    // Customer Position (User Marker)
    useEffect(() => {
        if (!map.current || !myPosition) return;

        const pos = toLngLat(myPosition);
        
        if (!markersRef.current.user) {
            const el = document.createElement('div');
            el.className = 'customer-marker';
            el.innerHTML = `
                <div class="relative w-[50px] h-[50px] flex items-center justify-center">
                    <div class="absolute w-full h-full rounded-full bg-blue-500 opacity-20 animate-ping"></div>
                    <div class="w-4 h-4 rounded-full border-2 border-white shadow-lg bg-blue-500 z-10"></div>
                </div>
            `;
            markersRef.current.user = new maplibregl.Marker({ element: el })
                .setLngLat(pos)
                .addTo(map.current);
        } else {
            markersRef.current.user.setLngLat(pos);
        }

        if (!autoSnapPaused) {
            map.current.easeTo({
                center: pos,
                duration: 1000
            });
        }
    }, [myPosition, autoSnapPaused]);

    // Technician Locations
    useEffect(() => {
        if (!map.current) return;
        
        const currentIds = techLocations.filter(t => t.is_primary).map(t => t.id);
        Object.keys(markersRef.current.techs).forEach(id => {
            if (!currentIds.includes(id)) {
                const { marker, root } = markersRef.current.techs[id];
                marker.remove();
                if (root) setTimeout(() => root.unmount(), 0);
                delete markersRef.current.techs[id];
            }
        });

        techLocations.filter(t => t.is_primary).forEach(tech => {
            if (!tech.last_lat || !tech.last_lng) return;
            const pos = [tech.last_lng, tech.last_lat];
            
            if (!markersRef.current.techs[tech.id]) {
                const el = document.createElement('div');
                el.className = 'tech-marker cursor-pointer';
                
                let labelHtml = '';
                const firstName = tech.full_name?.split(' ')[0] || 'ช่าง';
                labelHtml = `<div style="position:absolute;bottom:-18px;left:50%;transform:translateX(-50%);white-space:nowrap;background:linear-gradient(135deg,#3b82f6,#6366f1);color:white;font-size:9px;font-weight:900;padding:2px 8px;border-radius:10px;box-shadow:0 2px 8px rgba(59,130,246,0.4);border:1.5px solid white;letter-spacing:0.3px;">ทีม: ${firstName}</div>`;

                el.innerHTML = `
                    <div class="relative w-[60px] h-[60px] flex items-center justify-center group pointer-events-auto">
                        <div class="absolute w-12 h-12 rounded-full bg-blue-500 opacity-20 animate-ping"></div>
                        <img src="${technicialcar}" class="w-14 h-14 object-contain filter drop-shadow-xl transition-transform group-hover:scale-110" />
                        ${labelHtml}
                    </div>
                `;

                const popupNode = document.createElement('div');
                popupNode.className = 'custom-popup-premium';
                const root = createRoot(popupNode);
                const popup = new maplibregl.Popup({ offset: 25, maxWidth: '300px', className: 'rounded-2xl', closeButton: true }).setDOMContent(popupNode);

                const marker = new maplibregl.Marker({ element: el })
                    .setLngLat(pos)
                    .setPopup(popup)
                    .addTo(map.current);

                popup.on('open', () => {
                    root.render(<TechnicianPopupContent tech={tech} />);
                });

                markersRef.current.techs[tech.id] = { marker, root, techData: JSON.stringify(tech) };
            } else {
                const e = markersRef.current.techs[tech.id];
                e.marker.setLngLat(pos);
                
                // Update popup if open
                if (e.marker.getPopup().isOpen() && e.techData !== JSON.stringify(tech)) {
                    e.root.render(<TechnicianPopupContent tech={tech} />);
                    e.techData = JSON.stringify(tech);
                }
            }
        });
    }, [techLocations]);

    // Branch Markers
    useEffect(() => {
        if (!map.current) return;
        
        markersRef.current.branches.forEach(m => m.remove());
        markersRef.current.branches = [];

        MAP_CONFIG.BRANCHES.forEach(branch => {
            const el = document.createElement('div');
            el.className = 'branch-marker-bubble cursor-pointer';
            el.innerHTML = `
                <div class="relative flex flex-col items-center pb-2 group pointer-events-auto">
                    <div class="bg-[#1e293b] px-3 py-1 rounded-3xl shadow-xl border border-white/10 flex flex-col items-center min-w-[70px] relative z-20 transition-all duration-300 group-hover:scale-110 group-hover:-translate-y-1">
                        <div class="flex flex-col items-center -space-y-0.5">
                            <span style="color: #fa7000; font-family: 'Impact', 'Arial Black', sans-serif; font-weight: 900; font-size: 13px; letter-spacing: -0.2px; line-height: 1; transform: scaleY(0.9);">ISUZU</span>
                            <span class="text-white font-bold text-[10px]" style="font-family: 'Kanit', sans-serif; letter-spacing: 0.5px;">ประชากิจ</span>
                        </div>
                        <div class="absolute -bottom-1.5 left-1/2 -translate-x-1/2 w-3 h-3 bg-[#1e293b] rotate-45 border-r border-b border-white/10 z-10"></div>
                    </div>
                    <div class="w-1.5 h-1.5 bg-blue-500 rounded-full border border-white shadow-sm mt-0.5 relative z-30 transition-transform duration-300 group-hover:scale-125"></div>
                </div>
            `;

            const marker = new maplibregl.Marker({ element: el, anchor: 'bottom' })
                .setLngLat(toLngLat(branch.position))
                .setPopup(new maplibregl.Popup({ offset: 35, closeButton: true }).setHTML(`
                    <div class="p-4 text-center font-kanit min-w-[200px]">
                        <div class="text-[10px] font-black text-blue-500 uppercase tracking-widest mb-1">สาขา</div>
                        <div class="text-sm font-black text-gray-900 leading-tight mb-2">${branch.name}</div>
                        <div class="text-[10px] text-gray-400 font-bold mb-4 flex items-center justify-center gap-1">
                            <svg class="w-3 h-3" fill="none" stroke="#22c55e" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"></path></svg>
                            08:00 - 17:00 น.
                        </div>
                        <div class="flex flex-col gap-2">
                            <button class="w-full bg-green-500 text-white font-bold py-3 rounded-xl text-xs border-none cursor-pointer shadow-lg shadow-green-500/10" onclick="window.location.href='tel:${branch.phone}'">ติดต่อสาขา</button>
                            <button class="w-full bg-blue-500 text-white font-bold py-3 rounded-xl text-xs border-none cursor-pointer shadow-lg shadow-blue-500/10" onclick="window.handleBranchNavigate('${branch.id}')">นำทางมาที่นี่</button>
                        </div>
                    </div>
                `))
                .addTo(map.current);
            markersRef.current.branches.push(marker);
        });

        window.handleBranchNavigate = (id) => {
            const branch = MAP_CONFIG.BRANCHES.find(b => b.id === id);
            if (branch) setWaypoints([branch.position]);
        };
    }, []);

    // Home Marker
    useEffect(() => {
        if (!map.current || !userProfile?.home_lat || !userProfile?.home_lng || activeSelection?.type === 'home-picking') {
            if (markersRef.current.home) {
                markersRef.current.home.remove();
                markersRef.current.home = null;
            }
            return;
        }

        const pos = [userProfile.home_lng, userProfile.home_lat];
        
        if (!markersRef.current.home) {
            const el = document.createElement('div');
            el.className = 'home-marker-premium cursor-pointer group';
            el.innerHTML = `
                <div class="relative flex items-center justify-center">
                    <div class="w-10 h-10 bg-white rounded-xl flex items-center justify-center shadow-xl border-2 border-orange-500 text-orange-500 scale-100 hover:scale-110 transition-transform">
                        <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
                            <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"></path>
                            <polyline points="9 22 9 12 15 12 15 22"></polyline>
                        </svg>
                    </div>
                    <div class="absolute -bottom-1 w-2 h-2 bg-orange-500 rotate-45 z-[-1]"></div>
                </div>
            `;

            markersRef.current.home = new maplibregl.Marker({ element: el, anchor: 'bottom' })
                .setLngLat(pos)
                .setPopup(new maplibregl.Popup({ offset: 25 }).setHTML(`
                    <div class="p-4 min-w-[200px] max-w-[300px] font-kanit">
                        <div class="flex items-center justify-between mb-2 border-b border-orange-100 pb-1">
                            <div class="text-[12px] font-black text-orange-500 uppercase tracking-widest">ตำแหน่งบ้านของคุณ</div>
                            <button class="flex items-center gap-1 text-[10px] font-black text-green-500 hover:text-green-600 transition-colors bg-green-50 px-2 py-0.5 rounded-md border-none cursor-pointer" onclick="window.handleShareHome()">
                                <svg class="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.368 2.684 3 3 0 00-5.368-2.684z" />
                                </svg>
                                แชร์
                            </button>
                        </div>
                        <div class="text-[11px] text-gray-400 font-bold mb-2">พิกัด: ${userProfile.home_lat.toFixed(6)}, ${userProfile.home_lng.toFixed(6)}</div>
                        <div class="text-sm font-bold text-gray-900 leading-relaxed whitespace-pre-line bg-gray-50/50 p-3 rounded-xl border border-gray-100 italic">
                            ${userProfile.address || 'ยังไม่ได้ระบุรายละเอียดที่อยู่'}
                        </div>
                    </div>
                `))
                .addTo(map.current);
        } else {
            markersRef.current.home.setLngLat(pos);
        }

        window.handleShareHome = async () => {
            const shareUrl = EXTERNAL_LINKS.getAppShareUrl(userProfile.home_lat, userProfile.home_lng);
            if (navigator.share) {
                try {
                    await navigator.share({
                        title: 'ตำแหน่งบ้านของฉัน',
                        text: `ดูตำแหน่งบนแอป: ${userProfile.address || ''}`,
                        url: shareUrl,
                    });
                } catch (err) {}
            } else {
                try {
                    await navigator.clipboard.writeText(shareUrl);
                    alert('คัดลอกลิงก์แอปเรียบร้อยแล้ว');
                } catch (err) {
                    window.open(EXTERNAL_LINKS.getGoogleMapsUrl(userProfile.home_lat, userProfile.home_lng), '_blank');
                }
            }
        };
    }, [userProfile, activeSelection]);

    // Home Picking Marker
    useEffect(() => {
        if (!map.current) return;
        
        if (activeSelection?.type === 'home-picking' && activeSelection?.coords) {
            const pos = toLngLat(activeSelection.coords);
            if (!markersRef.current.picking) {
                const el = document.createElement('div');
                el.className = 'picking-marker';
                el.innerHTML = `<img src="${EXTERNAL_LINKS.VIOLET_MARKER}" class="w-6 h-10" />`;
                markersRef.current.picking = new maplibregl.Marker({ element: el, anchor: 'bottom' })
                    .setLngLat(pos)
                    .addTo(map.current);
            } else {
                markersRef.current.picking.setLngLat(pos);
            }
        } else if (markersRef.current.picking) {
            markersRef.current.picking.remove();
            markersRef.current.picking = null;
        }
    }, [activeSelection]);

    // Route Drawing
    useEffect(() => {
        if (!map.current || !routeSourceRef.current) return;
        
        const geojson = {
            type: 'Feature',
            properties: {},
            geometry: {
                type: 'LineString',
                coordinates: routePath.map(p => [p[1], p[0]])
            }
        };

        map.current.getSource('route').setData(geojson);
    }, [routePath]);

    // Waypoints
    useEffect(() => {
        if (!map.current) return;
        
        markersRef.current.waypoints?.forEach(m => m.remove());
        markersRef.current.waypoints = [];

        waypoints.forEach((wp, idx) => {
            if (!wp) return;
            const pos = toLngLat(wp);
            const color = '#EF4444';
            const iconSize = 40;

            const el = document.createElement('div');
            el.className = 'dest-marker-premium cursor-pointer';
            el.innerHTML = `
                <div class="relative flex items-center justify-center" style="width: ${iconSize}px; height: ${iconSize}px;">
                    <div class="w-8 h-8 rounded-full shadow-lg border-2 border-white flex items-center justify-center text-white text-[10px] font-black z-10" style="background: ${color};">
                        ${idx + 1}
                    </div>
                    <div class="absolute bottom-1 left-1/2 -translate-x-1/2 w-3 h-3 rotate-45 z-0" style="background: ${color};"></div>
                </div>
            `;

            const marker = new maplibregl.Marker({ element: el, anchor: 'bottom' })
                .setLngLat(pos)
                .setPopup(new maplibregl.Popup({ offset: 25 }).setHTML(`
                    <div class="p-2 font-kanit">
                        <div class="text-xs font-bold text-gray-500 mb-1 uppercase tracking-tight">ที่หมายที่ ${idx + 1}</div>
                        <div class="text-sm font-bold mb-3 text-gray-900 leading-tight">${locationNames[`waypoint-${idx}`] || 'พิกัดที่เลือก'}</div>
                        <div class="flex gap-2">
                            <button class="flex-1 bg-blue-50 text-blue-600 rounded-xl p-2 text-[10px] font-bold border-none cursor-pointer" onclick="window.handleWaypointEdit(${idx})">แก้ไข</button>
                            <button class="flex-1 bg-red-50 text-red-600 rounded-xl p-2 text-[10px] font-bold border-none cursor-pointer" onclick="window.handleWaypointRemove(${idx})">ลบ</button>
                        </div>
                    </div>
                `))
                .addTo(map.current);
            markersRef.current.waypoints.push(marker);
        });

        window.handleWaypointEdit = (idx) => setActiveSelection(`waypoint-${idx}`);
        window.handleWaypointRemove = (idx) => setWaypoints(prev => prev.filter((_, i) => i !== idx));
    }, [waypoints, locationNames]);

    // Route Fitter logic
    useEffect(() => {
        if (!map.current || routePath.length === 0 || autoSnapPaused) return;
        
        const bounds = new maplibregl.LngLatBounds();
        routePath.forEach(p => bounds.extend([p[1], p[0]]));
        
        map.current.fitBounds(bounds, {
            padding: 100,
            duration: 1500
        });
    }, [routePath, autoSnapPaused]);

    return (
        <div className="w-full h-full relative">
            <div ref={mapContainer} className="w-full h-full" />
            <style>{`
                .maplibregl-popup {
                    z-index: 5000 !important;
                }
                .maplibregl-popup-content {
                    padding: 0 !important;
                    border-radius: 20px !important;
                    overflow: hidden;
                    box-shadow: 0 10px 25px rgba(0,0,0,0.1) !important;
                }
                .maplibregl-popup-close-button {
                    width: 24px;
                    height: 24px;
                    background: white !important;
                    border-radius: 50%;
                    top: 8px;
                    right: 8px;
                    box-shadow: 0 2px 5px rgba(0,0,0,0.1);
                    color: #9ca3af;
                }
            `}</style>
        </div>
    );
};

export default CustomerMap;
