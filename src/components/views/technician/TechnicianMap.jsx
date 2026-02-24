import React, { useEffect, useRef, useState, useMemo } from 'react';
import maplibregl from 'maplibre-gl';
import 'maplibre-gl/dist/maplibre-gl.css';
import { MAP_CONFIG } from '../../../constants/visuals';
import { EXTERNAL_LINKS } from '../../../constants/api';
import { useToast } from '../../ui/ToastNotification';
import technicialcar from '../../../assets/technicialcar.png';
import { createRoot } from 'react-dom/client';
import VehicleStatusDashboard from '../../ui/VehicleStatusDashboard';
import { getEngineStatusDisplay } from '../../../utils/statusUtils';
import { calculateDistance } from '../../../utils/geoUtils';

const TechnicianPopupContent = ({ tech, allTechs, onMapInteract }) => {
    const teammates = allTechs.filter(t => 
        t.active_ticket_id && 
        t.active_ticket_id === tech.active_ticket_id &&
        t.id !== tech.id
    );
    const displayList = teammates.length > 0 ? [tech, ...teammates] : [tech];
    const carStatusData = Array.isArray(tech.car_status) ? tech.car_status[0] : tech.car_status;
    const statusDisplay = carStatusData ? getEngineStatusDisplay(carStatusData) : null;

    return (
        <div className="p-1 flex flex-col gap-3 min-w-[280px] max-h-[60vh] overflow-y-auto thin-scrollbar font-kanit">
             <div className="flex items-center gap-3">
                <div className="relative">
                    <img 
                        src={tech.avatar_url || EXTERNAL_LINKS.DEFAULT_AVATAR}
                        className={`w-12 h-12 rounded-xl object-cover shadow-lg border-2 ${tech.is_primary ? 'border-blue-500' : 'border-indigo-400'}`} 
                        onError={(e) => { 
                            if (e.target.src !== EXTERNAL_LINKS.DEFAULT_AVATAR) {
                                e.target.src = EXTERNAL_LINKS.DEFAULT_AVATAR; 
                            }
                        }}
                    />
                </div>
                <div className="min-w-0 flex-1">
                    <div className="text-[9px] font-black text-blue-500 uppercase tracking-widest leading-none mb-1">
                        {tech.is_primary && tech.active_ticket_id ? 'ช่างรับงานหลัก' :
                         tech.team_leader_name ? 'ช่างร่วมทีม' : 
                         tech.active_ticket_id ? 'ช่างรับงานหลัก' : 'ช่างเทคนิค'}
                    </div>
                    <div className="text-sm font-black text-gray-900 leading-none truncate">{tech.full_name}</div>
                    <div className="text-[9px] text-gray-400 font-bold mt-1">
                        {tech.team_name || 'ศูนย์บริการ'} • {tech.car_reg || 'ไม่ระบุทะเบียน'}
                    </div>
                </div>
            </div>

            {teammates.length > 0 ? (
                <details className="group/status">
                    <summary className="list-none cursor-pointer">
                        <div className="flex items-center justify-between text-[9px] font-black text-gray-400 uppercase tracking-widest bg-gray-50 p-2 rounded-lg mb-1.5 hover:bg-gray-100 transition-colors">
                            <div className="flex items-center gap-2">
                                <span>สถานะรถยนต์</span>
                                {statusDisplay && (
                                    <div className="flex items-center gap-1 px-1.5 py-0.5 bg-white rounded shadow-sm border border-gray-100">
                                        <span className={`w-1 h-1 rounded-full ${statusDisplay.dot} ${!statusDisplay.isCritical ? 'animate-pulse' : ''}`}></span>
                                        <span className={`${statusDisplay.color} font-bold text-[8px]`}>{statusDisplay.text}</span>
                                    </div>
                                )}
                            </div>
                            <svg className="w-3 h-3 transform group-open/status:rotate-180 transition-transform text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M19 9l-7 7-7-7" />
                            </svg>
                        </div>
                    </summary>
                    <div className="bg-gray-50/50 rounded-xl p-0.5 border border-gray-100 mb-1.5">
                        <VehicleStatusDashboard carStatus={carStatusData} isCollapsible={true} />
                    </div>
                </details>
            ) : (
                <div className="bg-gray-50/50 rounded-xl p-0.5 border border-gray-100">
                    <VehicleStatusDashboard carStatus={carStatusData} />
                </div>
            )}

            {teammates.length > 0 && tech.active_ticket_id && (
                <details className="group/team" open>
                    <summary className="list-none cursor-pointer mb-1.5">
                        <div className="flex items-center justify-between text-[9px] font-black text-gray-400 uppercase tracking-widest px-1 hover:text-gray-600 transition-colors">
                            <span>สมาชิกทีม ({displayList.length})</span>
                            <svg className="w-3 h-3 transform group-open/team:rotate-180 transition-transform text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M19 9l-7 7-7-7" />
                            </svg>
                        </div>
                    </summary>
                    <div className="flex flex-col gap-1.5 max-h-[100px] overflow-y-auto pr-1">
                        {displayList.map(member => (
                            <div key={member.id} className={`flex items-center gap-2 p-1 rounded-lg transition-colors ${member.id === tech.id ? 'bg-blue-50 border border-blue-100' : 'bg-white border border-gray-100'}`}>
                                <img 
                                    src={member.avatar_url || EXTERNAL_LINKS.DEFAULT_AVATAR} 
                                    className="w-7 h-7 rounded object-cover shadow-sm shrink-0"
                                    onError={(e) => { 
                                        if (e.target.src !== EXTERNAL_LINKS.DEFAULT_AVATAR) {
                                            e.target.src = EXTERNAL_LINKS.DEFAULT_AVATAR; 
                                        }
                                    }}
                                />
                                <div className="flex-1 min-w-0">
                                    <div className="text-[10px] font-black text-gray-900 truncate flex items-center gap-1">
                                        {member.full_name}
                                        {member.is_primary && <span className="text-[7px] bg-blue-100 text-blue-600 px-1 rounded shrink-0 font-bold uppercase">หลัก</span>}
                                    </div>
                                    <div className="text-[8px] text-gray-400 font-bold leading-none">{member.car_reg}</div>
                                </div>
                                {member.phone && (
                                    <a href={`tel:${member.phone}`} className="p-1 bg-green-500 rounded-md hover:bg-green-600 transition-all shrink-0">
                                        <svg className="w-3 h-3" fill="none" stroke="white" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
                                        </svg>
                                    </a>
                                )}
                            </div>
                        ))}
                    </div>
                </details>
            )}

            <div className="pt-1.5 border-t border-gray-100">
                {!tech.is_me && tech.phone && (
                    <a href={`tel:${tech.phone}`}
                        className="flex w-full bg-green-600 hover:bg-green-500 text-white font-black h-9 rounded-xl text-[11px] items-center justify-center gap-2 transition-all active:scale-95 shadow-lg shadow-green-500/10 uppercase tracking-widest no-underline border-none cursor-pointer">
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
                        </svg>
                        ติดต่อช่าง
                    </a>
                )}
            </div>
        </div>
    );
};

const TechnicianMap = React.memo(({
    defaultCenter,
    setMapInstance,
    activeSelection,
    handleLocationSelect,
    setSearchResult,
    searchResult,
    routePath,
    isNavigating,
    autoSnapPaused,
    viewTarget,
    currentHeading,
    currentSpeed,
    locationNames,
    setActiveSelection,
    waypoints,
    completedWaypoints,
    visitOrder,
    handleViewLocation,
    removeWaypoint,
    routeLegs,
    currentLegIndex,
    currentPointIndex,
    tripType,
    userProfile,
    carStatus,
    myAssignment,
    onOpenInvite,
    otherTechs = [],
    startPoint,
    setStartPoint,
    updateLocationName,
    onMapInteract,
    is3D = false,
    isHudMode = false
}) => {
    const { showToast } = useToast();
    const mapContainer = useRef(null);
    const map = useRef(null);
    const markersRef = useRef({}); 
    const activeSelectionRef = useRef(activeSelection);
    const setSearchResultRef = useRef(setSearchResult);
    const handleLocationSelectRef = useRef(handleLocationSelect);
    const [isMapReady, setIsMapReady] = useState(false);
    const lastUpdateStateRef = useRef({ index: -1, time: 0 });

    useEffect(() => { activeSelectionRef.current = activeSelection; }, [activeSelection]);
    useEffect(() => { setSearchResultRef.current = setSearchResult; }, [setSearchResult]);
    useEffect(() => { handleLocationSelectRef.current = handleLocationSelect; }, [handleLocationSelect]);

    const toLngLat = (coords) => {
        if (!coords) return null;
        if (Array.isArray(coords)) return [coords[1], coords[0]];
        if (coords.lat !== undefined) return [coords.lng, coords.lat];
        return null;
    };


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
                        attribution: '&copy; OpenStreetMap contributors',
                        maxzoom: 19
                    }
                },
                layers: [{ id: 'osm-layer', type: 'raster', source: 'osm' }]
            },
            center: toLngLat(startPoint || defaultCenter),
            zoom: 13,
            maxZoom: 19,
            pitch: is3D ? 60 : 0,
            antialias: false
        });

        map.current.on('load', () => {
            const m = map.current;
            if (!m) return;

            m.setView = (center, zoom, options) => {
                const target = toLngLat(center);
                if (!target) return;
                if (options?.animate === false) {
                    m.jumpTo({ center: target, zoom: zoom });
                } else {
                    m.flyTo({ center: target, zoom: zoom, ...options });
                }
            };

            if (!m.getSource('route')) {
                m.addSource('route', { type: 'geojson', data: { type: 'Feature', geometry: { type: 'LineString', coordinates: [] } } });
                
                // Add Glow Layer (Bottom)
                m.addLayer({
                    id: 'route-line-glow', type: 'line', source: 'route',
                    layout: { 'line-join': 'round', 'line-cap': 'round' },
                    paint: { 
                        'line-color': '#2563EB', 
                        'line-width': 12, 
                        'line-opacity': 0.4,
                        'line-blur': 8
                    }
                });

                m.addLayer({
                    id: 'route-line', type: 'line', source: 'route',
                    layout: { 'line-join': 'round', 'line-cap': 'round' },
                    paint: { 'line-color': '#2563EB', 'line-width': 6, 'line-opacity': 1.0 }
                });
            }
            if (!m.getSource('route-future')) {
                m.addSource('route-future', { type: 'geojson', data: { type: 'Feature', geometry: { type: 'LineString', coordinates: [] } } });
                m.addLayer({
                    id: 'route-line-future', type: 'line', source: 'route-future',
                    layout: { 'line-join': 'round', 'line-cap': 'round' },
                    paint: { 'line-color': '#93c5fd', 'line-width': 6, 'line-opacity': 0.8 }
                });
            }

            m.isMapLibre = true;
            setIsMapReady(true);
            setMapInstance(m);
        });

        map.current.on('click', (e) => {
            const target = e.originalEvent.target;
            if (target.closest('.maplibregl-marker') || 
                target.closest('.mapboxgl-marker') || 
                target.closest('.maplibregl-popup') || 
                target.closest('.mapboxgl-popup') ||
                target.closest('button') ||
                target.closest('.nav-btn')) {
                return;
            }
            if (!e.lngLat) return;
            try {
                let lat, lng;
                if (typeof e.lngLat.lat === 'number') {
                    lat = e.lngLat.lat;
                    lng = e.lngLat.lng;
                } else if (typeof e.lngLat.lat === 'function') {
                    lat = e.lngLat.lat();
                    lng = e.lngLat.lng();
                } else if (Array.isArray(e.lngLat) && e.lngLat.length >= 2) {
                    lng = e.lngLat[0];
                    lat = e.lngLat[1];
                }
                if (lat === undefined || lng === undefined) return;
                const currentSelection = activeSelectionRef.current;
                const type = (currentSelection && typeof currentSelection === 'object') ? currentSelection.type : currentSelection;
                
                if (type && handleLocationSelectRef.current) {
                    handleLocationSelectRef.current(type, [lat, lng]);
                } else if (setSearchResultRef.current) {
                    let finalLat = Number(lat);
                    let finalLng = Number(lng);
                    if (Math.abs(finalLat) > 90 && Math.abs(finalLng) <= 90) {
                        const temp = finalLat;
                        finalLat = finalLng;
                        finalLng = temp;
                    }
                    if (!isNaN(finalLat) && !isNaN(finalLng)) {
                        setSearchResultRef.current({
                            lat: finalLat,
                            lng: finalLng,
                            name: `${finalLat.toFixed(5)}, ${finalLng.toFixed(5)}`
                        });
                    }
                }
            } catch (err) {}
        });

        const onInteraction = (e) => {
            if (e.originalEvent) onMapInteract?.('start');
        };
        map.current.on('dragstart', onInteraction);
        map.current.on('rotatestart', onInteraction);
        map.current.on('pitchstart', onInteraction);
        map.current.on('mousedown', onInteraction);
        map.current.on('touchstart', onInteraction);

        return () => {
            if (map.current) {
                map.current.remove();
                map.current = null;
            }
        };
    }, []);

    useEffect(() => {
        if (!map.current) return;
        const m = map.current;
        
        // Use CSS Filters for a 'Cyberpunk' Dark Map that shows intersections
        if (isHudMode) {
            if (m.getLayer('osm-layer')) m.setLayoutProperty('osm-layer', 'visibility', 'visible');
            
            // Apply filter to the map canvas/container
            const container = m.getContainer();
            container.style.background = '#000';
            // Filter: Higher contrast and brightness for road network to match overlays
            container.querySelector('canvas').style.filter = 'invert(100%) hue-rotate(180deg) brightness(1.2) contrast(1.8) grayscale(0.1)';
            
            // Neon path style (stays on top) - GREEN for sunlight visibility
            if (m.getLayer('route-line')) {
                m.setPaintProperty('route-line', 'line-color', '#39FF14'); 
                m.setPaintProperty('route-line', 'line-width', 14);
                m.setPaintProperty('route-line', 'line-blur', 2);
            }
            if (m.getLayer('route-line-future')) {
                m.setPaintProperty('route-line-future', 'line-color', '#1a5c0b');
                m.setPaintProperty('route-line-future', 'line-width', 14);
            }
        } else {
            if (m.getLayer('osm-layer')) m.setLayoutProperty('osm-layer', 'visibility', 'visible');
            const container = m.getContainer();
            container.style.background = '';
            const canvas = container.querySelector('canvas');
            if (canvas) canvas.style.filter = '';
            
            // Standard path style
            if (m.getLayer('route-line')) {
                m.setPaintProperty('route-line', 'line-color', '#2563EB');
                m.setPaintProperty('route-line', 'line-width', 6);
                m.setPaintProperty('route-line', 'line-blur', 0);
            }
            if (m.getLayer('route-line-glow')) {
                m.setPaintProperty('route-line-glow', 'line-color', '#2563EB');
                m.setPaintProperty('route-line-glow', 'line-width', 12);
                m.setPaintProperty('route-line-glow', 'line-opacity', 0.4);
            }
        }
    }, [isHudMode]);

    useEffect(() => {
        if (!map.current) return;
        const m = map.current;
        
        m.easeTo({
            pitch: is3D ? 60 : 0,
            duration: 1000,
            padding: { bottom: is3D ? 150 : 0 }
        });

        // Sky & Fog (Premium Effect)
        if (is3D) {
            if (m.setFog) {
                m.setFog({
                    'range': [0.5, 10],
                    'color': '#ffffff',
                    'horizon-blend': 0.1
                });
            }
        } else {
            if (m.setFog) m.setFog(null);
        }
    }, [is3D]);

    useEffect(() => {
        if (!map.current) return;
        if (markersRef.current.waypoints) {
            markersRef.current.waypoints.forEach(m => m.remove());
        }
        markersRef.current.waypoints = [];
        
        if (!waypoints || waypoints.length === 0) return;

        waypoints.forEach((wp, idx) => {
            if (!wp) return;
            if (isNavigating && completedWaypoints?.has(idx)) return;

            const displayIndex = visitOrder[idx] || (idx + 1);
            const color = '#EF4444'; 
            const el = document.createElement('div');
            el.className = 'dest-marker-premium cursor-pointer';
            el.style.zIndex = '400'; 
            el.innerHTML = `<div class="relative flex items-center justify-center" style="width:40px;height:40px;"><div class="w-8 h-8 rounded-full shadow-lg border-2 border-white flex items-center justify-center text-white text-[10px] font-black z-10" style="background:${color};">${displayIndex}</div><div class="absolute bottom-1 left-1/2 -translate-x-1/2 w-3 h-3 rotate-45 z-0" style="background:${color};"></div></div>`;
            const marker = new maplibregl.Marker({ element: el, anchor: 'bottom' })
                .setLngLat(toLngLat(wp))
                .setPopup(new maplibregl.Popup({ offset: 25 }).setHTML(`<div class="p-2 font-kanit"><div class="text-xs font-bold text-gray-500 mb-1 uppercase tracking-tight">จุดหมายที่ ${displayIndex}</div><div class="text-sm font-bold mb-3 text-gray-900 leading-tight">${locationNames[`waypoint-${idx}`] || 'พิกัดที่เลือก'}</div><div class="flex gap-2"><button class="flex-1 bg-blue-50 text-blue-600 rounded-xl p-2 text-[10px] font-bold border-none cursor-pointer hover:bg-blue-100 transition-colors" onclick="window.handleWaypointEdit(${idx})">แก้ไข</button><button class="flex-1 bg-red-50 text-red-600 rounded-xl p-2 text-[10px] font-bold border-none cursor-pointer hover:bg-red-100 transition-colors" onclick="window.handleWaypointRemove(${idx})">ลบ</button></div></div>`))
                .addTo(map.current);
            markersRef.current.waypoints.push(marker);
        });
        window.handleWaypointEdit = (idx) => setActiveSelection(`waypoint-${idx}`);
        window.handleWaypointRemove = (idx) => removeWaypoint(idx);
    }, [waypoints, locationNames, visitOrder, completedWaypoints, isNavigating, isMapReady]);

    useEffect(() => {
        const m = map.current;
        const isTeamMember = myAssignment?.ticket_id && !myAssignment?.is_primary;

        if (!m || !isMapReady || !startPoint || isTeamMember) {
            if (markersRef.current.user) { markersRef.current.user.remove(); markersRef.current.user = null; }
            return;
        }
        const pos = toLngLat(startPoint);
        if (!pos) return;
        const color = '#2563EB'; 
        const heading = isNaN(currentHeading) ? 0 : currentHeading;
        if (!markersRef.current.user) {
            const el = document.createElement('div');
            el.className = 'user-marker-premium';
            el.style.width = '60px'; el.style.height = '60px'; el.style.display = 'flex'; el.style.alignItems = 'center'; el.style.justifyContent = 'center'; el.style.pointerEvents = 'none'; el.style.zIndex = '1';
            el.innerHTML = `<div style="position:relative;width:60px;height:60px;display:flex;align-items:center;justify-content:center;"><div style="position:absolute;inset:0;border-radius:9999px;background:${color};opacity:0.2;border:2px solid ${color};"></div><div style="position:absolute;width:22px;height:22px;border-radius:9999px;border:3px solid white;box-shadow:0 4px 12px rgba(0,0,0,0.4);z-index:20;background:${color};top:50%;left:50%;transform:translate(-50%,-50%);"></div><div class="arrow-container" style="position:absolute;inset:0;display:flex;align-items:center;justify-content:center;opacity:${isNavigating ? 1 : 0};"><div style="width:24px;height:24px;transform:translateY(-24px);"><svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" style="filter:drop-shadow(0 2px 4px rgba(0,0,0,0.4));"><path d="M12 2L22 22L12 18L2 22L12 2Z" fill="${color}" stroke="white" stroke-width="2" stroke-linejoin="round"/></svg></div></div></div>`;
            markersRef.current.user = new maplibregl.Marker({ 
                element: el, 
                rotationAlignment: 'map', 
                pitchAlignment: 'viewport' 
            }).setLngLat(pos).setRotation(heading).addTo(m);
        } else {
            markersRef.current.user.setLngLat(pos).setRotation(heading);
            const arrow = markersRef.current.user.getElement().querySelector('.arrow-container');
            if (arrow) arrow.style.opacity = isNavigating ? 1 : 0;
            if (!markersRef.current.user.getElement().parentNode) markersRef.current.user.addTo(m);
        }
    }, [startPoint, currentHeading, isNavigating, isMapReady, myAssignment]);

    useEffect(() => {
        if (!map.current || routePath.length === 0 || isNavigating) return;
        const bounds = new maplibregl.LngLatBounds();
        routePath.forEach(p => bounds.extend([p[1], p[0]]));
        map.current.fitBounds(bounds, { padding: 80, duration: 1500 });
    }, [routePath, isNavigating]);

    useEffect(() => {
        if (!map.current || !isMapReady) return;
        const syncRoute = () => {
            const m = map.current;
            if (!m || !m.isStyleLoaded()) return;

            const routeSource = m.getSource('route');
            const futureSource = m.getSource('route-future');
            if (!routeSource || !futureSource) return;

            if (!routePath || routePath.length === 0) {
               
                if (routeSource) routeSource.setData({ type: 'Feature', geometry: { type: 'LineString', coordinates: [] } });
                if (futureSource) futureSource.setData({ type: 'Feature', geometry: { type: 'LineString', coordinates: [] } });
                lastUpdateStateRef.current = { index: -1, time: 0 };
                return;
            }

            const now = Date.now();
            const sIdx = (isNavigating || currentPointIndex > 0) ? currentPointIndex : 0;
            
          
            if (lastUpdateStateRef.current.index === sIdx && now - lastUpdateStateRef.current.time < 100) {
                return;
            }

            lastUpdateStateRef.current = { index: sIdx, time: now };

            try {
                let targetIdx = Math.max(0, Math.min(sIdx, routePath.length - 1));
                const isFin = !isNavigating && targetIdx >= routePath.length - 1 && routePath.length > 5;
                const eIdx = (routeLegs && routeLegs[currentLegIndex]) ? routeLegs[currentLegIndex].endIdx : routePath.length - 1;
       
                let activeCoords = [];
                if (!isFin) {
                    if (startPoint && isNavigating && routePath.length > 1) {
                         const currentPos = [startPoint[0], startPoint[1]];
                         let nextPointIdx = targetIdx + 1;
                         
                        
                         if (nextPointIdx >= routePath.length) nextPointIdx = routePath.length - 1;

                         activeCoords = [currentPos, ...routePath.slice(nextPointIdx, eIdx + 1)];
                    } else {
                        activeCoords = routePath.slice(targetIdx, eIdx + 1);
                    }
                }

                const future = isFin ? [] : routePath.slice(eIdx);

                routeSource.setData({ type: 'Feature', geometry: { type: 'LineString', coordinates: activeCoords.length > 1 ? activeCoords.map(p => [p[1], p[0]]) : [] } });
                futureSource.setData({ type: 'Feature', geometry: { type: 'LineString', coordinates: future.length > 1 ? future.map(p => [p[1], p[0]]) : [] } });
            } catch (err) {}
        };
        syncRoute();
      
        if (isMapReady) syncRoute();
        map.current.on('styledata', syncRoute);
        return () => { if (map.current) map.current.off('styledata', syncRoute); };
    }, [routePath, isNavigating, currentPointIndex, routeLegs, currentLegIndex, isMapReady, startPoint ? startPoint.toString() : '']);

    useEffect(() => {
        if (!map.current) return;
        if (markersRef.current.branches) markersRef.current.branches.forEach(m => m.remove());
        markersRef.current.branches = [];
        MAP_CONFIG.BRANCHES.forEach(branch => {
            const el = document.createElement('div');
            el.className = 'branch-marker-bubble cursor-pointer';
            el.innerHTML = `<div class="relative flex flex-col items-center pb-4 group pointer-events-auto"><div class="bg-[#1e293b] px-3 py-1 rounded-3xl shadow-xl border border-white/10 flex flex-col items-center min-w-[70px] relative z-20 transition-all duration-300 group-hover:scale-110 group-hover:-translate-y-1"><div class="flex flex-col items-center -space-y-0.5"><span style="color:#fa7000;font-family:'Impact','Arial Black',sans-serif;font-weight:900;font-size:13px;letter-spacing:-0.2px;line-height:1;transform:scaleY(0.9);">ISUZU</span><span class="text-white font-bold text-[10px]" style="font-family:'Kanit',sans-serif;letter-spacing:0.5px;">ประชากิจ</span></div><div class="absolute -bottom-1.5 left-1/2 -translate-x-1/2 w-3 h-3 bg-[#1e293b] rotate-45 border-r border-b border-white/10 z-10"></div></div></div>`;
            const marker = new maplibregl.Marker({ 
                element: el, 
                anchor: 'bottom', 
                rotationAlignment: 'viewport', 
                pitchAlignment: 'viewport' 
            })
                .setLngLat(toLngLat(branch.position))
                .setPopup(new maplibregl.Popup({ offset: 35, closeButton: true }).setHTML(`<div class="p-4 text-center font-kanit min-w-[200px]"><div class="text-[10px] font-black text-blue-500 uppercase tracking-widest mb-1">สาขา</div><div class="text-sm font-black text-gray-900 leading-tight mb-2">${branch.name}</div><div class="text-[10px] text-gray-400 font-bold mb-4 flex items-center justify-center gap-1"><svg class="w-3 h-3" fill="none" stroke="#22c55e" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"></path></svg>08:00 - 17:00 น.</div><div class="flex flex-col gap-2"><button class="w-full bg-green-500 text-white font-bold py-3 rounded-xl text-xs border-none cursor-pointer shadow-lg shadow-green-500/10" onclick="window.location.href='tel:${branch.phone}'">ติดต่อสาขา</button><button class="w-full bg-blue-500 text-white font-bold py-3 rounded-xl text-xs border-none cursor-pointer shadow-lg shadow-blue-500/10" onclick="window.handleBranchNavigate('${branch.id}')">เริ่มนำทาง</button></div></div>`))
                .addTo(map.current);
            markersRef.current.branches.push(marker);
        });
        window.handleBranchNavigate = (id) => {
            const b = MAP_CONFIG.BRANCHES.find(b => b.id === id);
            if (b) handleLocationSelect('waypoint-0', b.position);
        };
    }, []);

    const allTechs = useMemo(() => {
        const list = [...otherTechs];
        if (userProfile) {
            list.push({ ...userProfile, car_status: carStatus, is_me: true, active_ticket_id: myAssignment?.ticket_id, is_primary: myAssignment?.is_primary, assignment_status: myAssignment?.status });
        }
        return list;
    }, [otherTechs, userProfile, carStatus, myAssignment]);

    const filteredTechs = useMemo(() => {
        return allTechs.filter(tech => {
            if (!tech.last_lat || !tech.last_lng) return false;
            const isThisUserTeamMember = tech.is_me && tech.active_ticket_id && !tech.is_primary;
            const isMyTeammateGoingWithMe = !tech.is_me && 
                                           tech.active_ticket_id && 
                                           tech.active_ticket_id === myAssignment?.ticket_id && 
                                           !tech.is_primary;

            if ((isNavigating && tech.is_me) || isThisUserTeamMember || isMyTeammateGoingWithMe) return false;
          
            if (tech.active_ticket_id && tech.active_ticket_id === myAssignment?.ticket_id) return true;

            if (startPoint) {
                const dist = calculateDistance(startPoint[0], startPoint[1], tech.last_lat, tech.last_lng);
                return dist <= 150000; 
            }

            return true;
        });
    }, [allTechs, isNavigating, myAssignment, startPoint]);

    useEffect(() => {
        if (!map.current) return;
        if (!markersRef.current.techs) markersRef.current.techs = {};
        const currentIds = filteredTechs.map(t => t.id);
        Object.keys(markersRef.current.techs).forEach(id => {
            if (!currentIds.includes(id)) {
                const { marker, root } = markersRef.current.techs[id];
                marker.remove();
                if (root) setTimeout(() => root.unmount(), 0);
                delete markersRef.current.techs[id];
            }
        });

        filteredTechs.forEach(tech => {
            const pos = [tech.last_lng, tech.last_lat];
            const isPrimary = tech.is_primary || (tech.active_ticket_id && !tech.team_leader_name);

            if (!markersRef.current.techs[tech.id]) {
                const el = document.createElement('div');
                el.className = 'tech-marker cursor-pointer';
                // Higher z-index for primary techs
                el.style.zIndex = isPrimary ? '450' : '440';

                const firstName = tech.full_name?.split(' ')[0] || 'ช่าง';
                let lbl = '';
                if (isPrimary && tech.active_ticket_id) lbl = `<div style="position:absolute;top:-22px;left:50%;transform:translateX(-50%);white-space:nowrap;background:linear-gradient(135deg,#3b82f6,#6366f1);color:white;font-size:9px;font-weight:900;padding:2px 8px;border-radius:10px;box-shadow:0 2px 8px rgba(59,130,246,0.4);border:1.5px solid white;letter-spacing:0.3px;">ทีม: ${firstName}</div>`;
                else if (tech.team_leader_name) lbl = `<div style="position:absolute;top:-22px;left:50%;transform:translateX(-50%);white-space:nowrap;background:linear-gradient(135deg,#8b5cf6,#a855f7);color:white;font-size:9px;font-weight:900;padding:2px 8px;border-radius:10px;box-shadow:0 2px 8px rgba(139,92,246,0.4);border:1.5px solid white;letter-spacing:0.3px;">หน.${tech.team_leader_name.split(' ')[0]}</div>`;
                else lbl = `<div style="position:absolute;top:-22px;left:50%;transform:translateX(-50%);white-space:nowrap;background:rgba(255,255,255,0.95);color:#6b7280;font-size:9px;font-weight:800;padding:2px 8px;border-radius:10px;box-shadow:0 2px 6px rgba(0,0,0,0.1);border:1.5px solid #e5e7eb;letter-spacing:0.3px;">${firstName}</div>`;
                
                el.innerHTML = `<div style="position:relative;width:60px;height:60px;display:flex;align-items:center;justify-content:center;"><img src="${technicialcar}" style="width:56px;height:56px;object-fit:contain;filter:drop-shadow(0 4px 6px rgba(0,0,0,0.2));" />${lbl}</div>`;
                
                const popupNode = document.createElement('div');
                popupNode.className = 'custom-popup-premium';
                const root = createRoot(popupNode);
                const popup = new maplibregl.Popup({ offset: 25, maxWidth: '300px', className: 'rounded-2xl' }).setDOMContent(popupNode);
                
                const marker = new maplibregl.Marker({ 
                    element: el,
                    pitchAlignment: 'viewport',
                    rotationAlignment: 'viewport'
                }).setLngLat(pos).setPopup(popup).addTo(map.current);
                
                popup.on('open', () => {
                    onMapInteract?.('start');
                    root.render(<TechnicianPopupContent tech={tech} allTechs={allTechs} onMapInteract={onMapInteract} />);
                });
                markersRef.current.techs[tech.id] = { marker, root, popupNode, techData: JSON.stringify(tech) };
            } else {
                const e = markersRef.current.techs[tech.id];
                e.marker.setLngLat(pos);
                const p = e.marker.getPopup();
                const techStr = JSON.stringify(tech);
                if (p.isOpen() && e.techData !== techStr) {
                    e.root.render(<TechnicianPopupContent tech={tech} allTechs={allTechs} onMapInteract={onMapInteract} />);
                    e.techData = techStr;
                }
                if (!e.marker.getElement().parentNode) e.marker.addTo(map.current);
            }
        });
    }, [filteredTechs, isNavigating, onMapInteract, isMapReady]);

    useEffect(() => {
        if (!map.current || !isMapReady) return;
        if (markersRef.current.search) { markersRef.current.search.remove(); markersRef.current.search = null; }
        if (searchResult && searchResult.lat) {
            const el = document.createElement('div');
            el.className = 'search-marker-pin'; el.style.zIndex = '1'; el.style.cursor = 'pointer';
            el.innerHTML = `<div style="display:flex;flex-direction:column;align-items:center;width:60px;"><div style="background:white;padding:4px 8px;border-radius:6px;box-shadow:0 2px 4px rgba(0,0,0,0.2);font-family:'Kanit',sans-serif;font-size:11px;font-weight:bold;margin-bottom:2px;white-space:nowrap;pointer-events:none;">คลิกเพื่อเลือกเมนู</div><svg width="40" height="40" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" style="filter:drop-shadow(0 2px 3px rgba(0,0,0,0.3));pointer-events:auto;"><path d="M12 0C7.58 0 4 3.58 4 8C4 13.54 12 24 12 24C12 24 20 13.54 20 8C20 3.58 16.42 0 12 0Z" fill="#3B82F6"/><circle cx="12" cy="8" r="3" fill="white"/></svg></div>`;
            el.addEventListener('click', (e) => { e.stopPropagation(); if (markersRef.current.search) markersRef.current.search.togglePopup(); });
            markersRef.current.search = new maplibregl.Marker({ element: el, offset: [0, -32] }).setLngLat(toLngLat(searchResult)).addTo(map.current);
            const popupNode = document.createElement('div');
            popupNode.className = 'custom-popup-content font-kanit';
            popupNode.innerHTML = `<div class="p-3 min-w-[240px]"><div class="flex items-start gap-3 mb-3"><div class="w-8 h-8 rounded-full bg-blue-50 flex items-center justify-center shrink-0 border border-blue-100 mt-0.5"><svg class="w-4 h-4 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" /><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" /></svg></div><div class="min-w-0 flex-1"><div class="text-[10px] text-gray-400 font-bold uppercase tracking-wider mb-0.5">ตำแหน่งที่เลือก</div><div class="text-xs sm:text-sm font-black text-gray-900 leading-tight break-words">${searchResult.name || 'พิกัดที่เลือก'}</div></div></div><div class="space-y-2"><button id="btn-set-dest" class="w-full bg-blue-600 hover:bg-blue-700 text-white py-2.5 rounded-lg font-bold text-xs shadow-md active:scale-95 transition-all flex items-center justify-center gap-2"><svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 5l7 7-7 7M5 5l7 7-7 7" /></svg>ตั้งเป็นปลายทาง</button><div class="grid grid-cols-2 gap-2"><button id="btn-share" class="bg-gray-50 hover:bg-gray-100 text-gray-700 py-2 rounded-lg font-bold text-[10px] sm:text-xs border border-gray-100 active:scale-95 transition-all flex items-center justify-center gap-1.5"><svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.368 2.684 3 3 0 00-5.368-2.684z" /></svg>แชร์</button><button id="btn-cancel" class="bg-red-50 hover:bg-red-100 text-red-500 py-2 rounded-lg font-bold text-[10px] sm:text-xs border border-red-100 active:scale-95 transition-all flex items-center justify-center gap-1.5"><svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>ลบหมุด</button></div></div></div>`;
            const attachListeners = () => {
                 const btnSetDest = popupNode.querySelector('#btn-set-dest');
                 if (btnSetDest) btnSetDest.onclick = (e) => { e.stopPropagation(); setSearchResult(null); handleLocationSelectRef.current?.(`waypoint-${waypoints.indexOf(null) !== -1 ? waypoints.indexOf(null) : waypoints.length}`, [searchResult.lat, searchResult.lng]); };
                 const btnShare = popupNode.querySelector('#btn-share');
                 if (btnShare) btnShare.onclick = async (e) => { e.stopPropagation(); const shareUrl = EXTERNAL_LINKS.getAppShareUrl(searchResult.lat, searchResult.lng); try { await navigator.share({ title: 'แชร์ตำแหน่ง', url: shareUrl }); } catch { navigator.clipboard.writeText(shareUrl); showToast('คัดลอกลิงก์แล้ว', 'success'); }};
                 const btnCancel = popupNode.querySelector('#btn-cancel');
                 if (btnCancel) btnCancel.onclick = (e) => { e.stopPropagation(); setSearchResultRef.current?.(null); };
            };
            attachListeners();
            markersRef.current.search.setPopup(new maplibregl.Popup({ offset: 35, className: 'custom-popup-premium', closeButton: false }).setDOMContent(popupNode));
            if (!markersRef.current.search.getPopup().isOpen()) markersRef.current.search.togglePopup();
            showToast('ปักหมุดตำแหน่งที่เลือกแล้ว', 'success');
        }
    }, [searchResult, waypoints, isMapReady]);

    useEffect(() => {
        if (!map.current || !viewTarget) return;
        const coords = toLngLat(viewTarget.coords);
        if (coords) {
            map.current.flyTo({ center: coords, zoom: viewTarget.zoom || 16, speed: 1.2 });
        }
    }, [viewTarget]);

    return (
        <div className="w-full h-full relative">
            <div ref={mapContainer} className="w-full h-full" onClick={() => onMapInteract?.('click')} />
            {activeSelection && (
                <div className="absolute top-4 left-1/2 -translate-x-1/2 bg-white/90 backdrop-blur px-4 py-2 rounded-full shadow-lg border border-blue-100 z-[2000] animate-bounce">
                    <span className="text-blue-600 font-bold text-sm">📍 กำลังเลือกตำแหน่ง...</span>
                </div>
            )}
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
                    border-radius: 50% !important;
                    top: 8px !important;
                    right: 8px !important;
                    box-shadow: 0 2px 5px rgba(0,0,0,0.1) !important;
                    color: #9ca3af !important;
                    display: flex !important;
                    align-items: center !important;
                    justify-content: center !important;
                    z-index: 100 !important;
                    border: none !important;
                    font-size: 16px !important;
                }
                .maplibregl-popup-close-button:hover {
                    background-color: #f3f4f6 !important;
                    color: #111827 !important;
                }
            `}</style>
        </div>
    );
}, (p, n) => {
    
    const routeChanged = p.routePath !== n.routePath || (p.routePath && n.routePath && p.routePath.length !== n.routePath.length);
    const waypointsChanged = p.waypoints !== n.waypoints;
    
    if (routeChanged || waypointsChanged) return false;

    return p.isNavigating === n.isNavigating && 
           p.currentPointIndex === n.currentPointIndex && 
           p.currentHeading === n.currentHeading && 
           p.is3D === n.is3D && 
           p.activeSelection === n.activeSelection &&
           p.otherTechs === n.otherTechs &&
           p.startPoint?.[0] === n.startPoint?.[0] && 
           p.startPoint?.[1] === n.startPoint?.[1] &&
           p.searchResult?.lat === n.searchResult?.lat &&
           p.searchResult?.lng === n.searchResult?.lng;
});

export default TechnicianMap;
