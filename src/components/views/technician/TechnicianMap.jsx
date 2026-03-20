import React, { useEffect, useRef, useState, useMemo, useCallback } from 'react';
import maplibregl from 'maplibre-gl';
import 'maplibre-gl/dist/maplibre-gl.css';
import { MAP_CONFIG } from '../../../constants/visuals';
import { EXTERNAL_LINKS } from '../../../constants/api';
import { useToast } from '../../ui/ToastNotification';
import technicialcar from '../../../assets/technicialcar.png';
import { createRoot } from 'react-dom/client';

import { calculateDistance, toLngLat } from '../../../utils/geoUtils';

import TechnicianPopupContent from '../../map/TechnicianPopupContent';
import BranchMarkers from '../../map/BranchMarkers';

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
    
    const handleBranchNavigate = useCallback((pos) => {
        handleLocationSelect('waypoint-0', pos);
    }, [handleLocationSelect]);




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

            if (!m.getSource('route-future')) {
                m.addSource('route-future', { type: 'geojson', data: { type: 'Feature', geometry: { type: 'LineString', coordinates: [] } } });
                m.addLayer({
                    id: 'route-line-future', type: 'line', source: 'route-future',
                    layout: { 'line-join': 'round', 'line-cap': 'round' },
                    paint: { 'line-color': '#93c5fd', 'line-width': 6, 'line-opacity': 0.8 }
                });
            }

            if (!m.getSource('route')) {
                m.addSource('route', { type: 'geojson', data: { type: 'Feature', geometry: { type: 'LineString', coordinates: [] } } });
                
               
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
            } catch { /* ignore */ }
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
        
       
        if (isHudMode) {
            if (m.getLayer('osm-layer')) m.setLayoutProperty('osm-layer', 'visibility', 'visible');
            
            
            const container = m.getContainer();
            container.style.background = '#000';
            container.querySelector('canvas').style.filter = 'invert(100%) hue-rotate(180deg) brightness(1.2) contrast(1.8) grayscale(0.1)';
            
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
            if (m.getLayer('route-line-future')) {
                m.setPaintProperty('route-line-future', 'line-color', '#93c5fd');
                m.setPaintProperty('route-line-future', 'line-width', 6);
                m.setPaintProperty('route-line-future', 'line-opacity', 0.8);
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
        const syncRoute = (isForce = false) => {
            const m = map.current;
            if (!m) return;
            
            if (!m.isStyleLoaded() && !isForce) return;

            const routeSource = m.getSource('route');
            const futureSource = m.getSource('route-future');
            if (!routeSource || !futureSource) return;

            if (!routePath || routePath.length === 0) {
                routeSource.setData({ type: 'Feature', geometry: { type: 'LineString', coordinates: [] } });
                if (futureSource) futureSource.setData({ type: 'Feature', geometry: { type: 'LineString', coordinates: [] } });
                lastUpdateStateRef.current = { index: -1, time: 0 };
                return;
            }

            const now = Date.now();
            const sIdx = (isNavigating || currentPointIndex > 0) ? currentPointIndex : 0;
            
            const throttleTime = isNavigating ? 30 : 100;
            if (!isForce && now - lastUpdateStateRef.current.time < throttleTime) {
                if (lastUpdateStateRef.current.index === sIdx) return;
            }
            lastUpdateStateRef.current = { index: sIdx, time: now };

            try {
                let validSIdx = sIdx;
                if (validSIdx >= routePath.length && routePath.length > 0) {
                    validSIdx = 0;
                }

                let targetIdx = Math.max(0, Math.min(validSIdx, routePath.length - 1));
                const isFin = !isNavigating && targetIdx >= routePath.length - 1 && routePath.length > 5 && sIdx > 0;
                const eIdx = (routeLegs && routeLegs[currentLegIndex]) ? routeLegs[currentLegIndex].endIndex : routePath.length - 1;
       
                let activeCoords = [];
                if (!isFin) {
                    if (startPoint && isNavigating && routePath.length > 1) {
                         let nextPointIdx = targetIdx + 1;
                         if (nextPointIdx >= routePath.length) nextPointIdx = routePath.length - 1;
                         activeCoords = [[startPoint[0], startPoint[1]], ...routePath.slice(nextPointIdx, eIdx + 1)];
                    } else {
                        activeCoords = routePath.slice(targetIdx, eIdx + 1);
                    }
                }

                const future = isFin ? [] : routePath.slice(eIdx);

                routeSource.setData({ 
                    type: 'Feature', 
                    geometry: { 
                        type: 'LineString', 
                        coordinates: activeCoords.length > 1 ? activeCoords.map(p => [p[1], p[0]]) : [] 
                    } 
                });
                
                futureSource.setData({ 
                    type: 'Feature', 
                    geometry: { 
                        type: 'LineString', 
                        coordinates: future.length > 1 ? future.map(p => [p[1], p[0]]) : [] 
                    } 
                });

                if (!isForce && routePath.length > 0 && activeCoords.length > 1) {
                    setTimeout(() => {
                        const checkM = map.current;
                        if (!checkM) return;
                        const s = checkM.getSource('route');
                        if (s && s._data?.geometry?.coordinates?.length === 0) {
                            syncRoute(true);
                        }
                    }, 300);
                }
            } catch {
                /* ignore */
            }
        };

        syncRoute();
        
        const retryTimer = setTimeout(() => syncRoute(true), 500);
        const retryTimer2 = setTimeout(() => syncRoute(true), 1500);

        map.current.on('styledata', () => syncRoute(false));
        return () => { 
            if (map.current) map.current.off('styledata', () => syncRoute(false));
            clearTimeout(retryTimer);
            clearTimeout(retryTimer2);
        };
    }, [routePath, isNavigating, currentPointIndex, routeLegs, currentLegIndex, isMapReady, startPoint ? startPoint.toString() : '']);

 

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
                const isMobile = window.innerWidth < 768;
                const popup = new maplibregl.Popup({ 
                    offset: 25, 
                    maxWidth: 'none', 
                    className: 'custom-vehicle-popup',
                    autoPan: false,
                    anchor: isMobile ? 'bottom' : 'left'
                }).setDOMContent(popupNode);
                
                const marker = new maplibregl.Marker({ 
                    element: el,
                    pitchAlignment: 'viewport',
                    rotationAlignment: 'viewport'
                }).setLngLat(pos).setPopup(popup).addTo(map.current);
                
                popup.on('open', () => {
                    onMapInteract?.('start');
                    setTimeout(() => {
                        const isMobile = window.innerWidth < 768;
                        if (map.current) {
                            map.current.easeTo({
                                center: pos,
                                offset: isMobile ? [0, 280] : [-150, 0],
                                duration: 400
                            });
                        }
                    }, 50);
                });
                root.render(<TechnicianPopupContent tech={tech} allTechs={allTechs} onMapInteract={onMapInteract} />);
                markersRef.current.techs[tech.id] = { marker, root, popupNode, techData: JSON.stringify(tech) };
            } else {
                const e = markersRef.current.techs[tech.id];
                e.marker.setLngLat(pos);
                const p = e.marker.getPopup();
                const techStr = JSON.stringify(tech);
                if (e.techData !== techStr) {
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
            
            {isMapReady && (
                <BranchMarkers 
                    map={map.current} 
                    onNavigate={handleBranchNavigate} 
                    showToast={showToast} 
                />
            )}

            {activeSelection && (
                <div className="absolute top-4 left-1/2 -translate-x-1/2 bg-white/90 backdrop-blur px-4 py-2 rounded-full shadow-lg border border-blue-100 z-[2000] animate-bounce">
                    <span className="text-blue-600 font-bold text-sm">📍 กำลังเลือกตำแหน่ง...</span>
                </div>
            )}
            <style>{`
                .custom-vehicle-popup {
                    z-index: 5000 !important;
                    max-width: none !important;
                }
                .custom-vehicle-popup .maplibregl-popup-content {
                    padding: 0 !important;
                    border-radius: 20px !important;
                    overflow: hidden;
                    box-shadow: 0 10px 25px rgba(0,0,0,0.1) !important;
                    width: 320px;
                }
                @media (min-width: 768px) {
                    .custom-vehicle-popup .maplibregl-popup-content {
                        width: 450px !important;
                    }
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
    
    const routeChanged = p.routePath !== n.routePath || 
                         (p.routePath?.length !== n.routePath?.length) || 
                         (p.routePath?.[0]?.[0] !== n.routePath?.[0]?.[0]);
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
