import { useState, useRef, useEffect, useCallback } from 'react';
import { calculateDistance } from '../utils/geoUtils';
import { prefetchRouteTiles } from '../utils/prefetchUtils';
import { formatTime, translateInstruction } from '../utils/mapUtils';

const PRIMARY_OSRM = 'https://router.project-osrm.org';
const SECONDARY_OSRM = 'https://routing.openstreetmap.de/routed-car';

export const useRouting = ({
    startPoint,
    waypoints,
    locationNames,
    tripType,
    isNavigating,
    rerouteTrigger,
    completedWaypoints,
    originalStart,
    currentLegIndex,
    setRerouteTrigger,
    isOnline
}) => {
    const [routePath, setRoutePath] = useState([]);
    const [routeLegs, setRouteLegs] = useState([]);
    const [segments, setSegments] = useState([]);
    const [distance, setDistance] = useState(0);
    const [totalDuration, setTotalDuration] = useState(0);
    const [navigationSteps, setNavigationSteps] = useState([]);
    const [visitOrder, setVisitOrder] = useState({});
    const [legTargetIndices, setLegTargetIndices] = useState([]);
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState(null);

    const lastFetchTimeRef = useRef(0);
    const lastWaypointsRef = useRef("");
    const lastRoutedPos = useRef(null);
    const debounceTimerRef = useRef(null);
    const routingCache = useRef({});

    const clearRoute = useCallback(() => {
        setRouteLegs([]);
        setRoutePath([]);
        setSegments([]);
        setDistance(0);
        setTotalDuration(0);
        setNavigationSteps([]);
        setVisitOrder({});
        setLegTargetIndices([]);
        lastRoutedPos.current = null;
    }, []);



    useEffect(() => {
        const validWpsWithIndexes = waypoints
            .map((wp, i) => ({ coords: wp, origIdx: i }))
            .filter(item => item.coords !== null);

        if (!startPoint || validWpsWithIndexes.length === 0) {
            if (routePath.length > 0) clearRoute();
            lastWaypointsRef.current = "";
            return;
        }

        const waypointsStr = JSON.stringify(waypoints) + `-${tripType}-${isNavigating}-${rerouteTrigger}-${currentLegIndex}`;
        const waypointsChanged = waypointsStr !== lastWaypointsRef.current;

        if (!waypointsChanged && lastRoutedPos.current && !error && routePath.length > 0) {
            if (isNavigating && rerouteTrigger === 0) return;
            const dist = calculateDistance(startPoint[0], startPoint[1], lastRoutedPos.current[0], lastRoutedPos.current[1]);
            if (!isNavigating && dist < 25) return;
        }

        lastWaypointsRef.current = waypointsStr;

        let activeWps = [...validWpsWithIndexes];
        if (isNavigating) {
            activeWps = activeWps.filter(w => !completedWaypoints.has(w.origIdx));
        }

        const coordsForApi = [startPoint, ...activeWps.map(w => w.coords)];
        const inputIndicesMap = [-1, ...activeWps.map(w => w.origIdx)];

       
        if (tripType === 'roundtrip') {
            const origin = originalStart || startPoint;
            coordsForApi.push(origin);
            inputIndicesMap.push(-2);
        }

        if (coordsForApi.length < 2) {
            if (routePath.length > 0) clearRoute();
            return;
        }

        const coordStr = coordsForApi.map(p => `${p[1]},${p[0]}`).join(';');
        const isOptimized = true; 
        const apiPath = 'trip';
        const cacheKey = coordStr + `-${apiPath}-` + (isNavigating ? 'nav' : 'pre');

        const processData = (data) => {
            lastRoutedPos.current = startPoint;

            const route = isOptimized ? data.trips[0] : data.routes[0];
            const legs = route.legs;
            const waypointsMeta = isOptimized ? data.waypoints : null;
            
            if (legs) {
                const newOrder = {};
                const absoluteTargetIndices = [];

                if (isOptimized && waypointsMeta) {
                   
                    waypointsMeta.sort((a, b) => a.trips_index - b.trips_index);
                    waypointsMeta.forEach((wpMeta, seq) => {
                        const inputIdx = wpMeta.waypoint_index;
                        const originalId = inputIndicesMap[inputIdx];
                        if (originalId >= 0) newOrder[originalId] = seq;
                        
                        if (seq > 0) absoluteTargetIndices.push(originalId);
                    });
                    
                   
                    while (absoluteTargetIndices.length < legs.length) {
                         absoluteTargetIndices.push(absoluteTargetIndices[absoluteTargetIndices.length-1]);
                    }
                } else {
                    inputIndicesMap.forEach((origIdx, seq) => { 
                        if (origIdx >= 0) newOrder[origIdx] = seq; 
                        if (seq > 0) absoluteTargetIndices.push(origIdx);
                    });
                }
                
                setVisitOrder(newOrder);
                setLegTargetIndices(absoluteTargetIndices);

                const newLegs = []; const allCoords = []; const allSteps = [];
                const legInfos = [];

                legs.forEach((leg, i) => {
                    const legStartIdx = allCoords.length;
                    if (leg.steps) {
                        leg.steps.forEach(step => {
                            if (step.geometry?.coordinates) {
                                const sIdx = allCoords.length;
                                const stepCoords = step.geometry.coordinates.map(c => [c[1], c[0]]);
                                stepCoords.forEach(coord => {
                                    if (allCoords.length === 0 || coord[0] !== allCoords[allCoords.length-1][0] || coord[1] !== allCoords[allCoords.length-1][1]) {
                                        allCoords.push(coord);
                                    }
                                });
                                allSteps.push({ ...step, startIndex: sIdx, endIndex: allCoords.length - 1, instruction: translateInstruction(step) });
                            }
                        });
                    }
                    
                   
                    let fromName = "จุดเริ่มต้น";
                    let toName = "ปลายทาง";
                    
                    if (isOptimized && waypointsMeta) {
                        const startMeta = waypointsMeta[i];
                        const endMeta = waypointsMeta[i+1];
                        const getOptimizedName = (meta) => {
                            if (!meta) return "ปลายทาง";
                            const idx = inputIndicesMap[meta.waypoint_index];
                            if (idx === -1) return locationNames['start'] || "จุดเริ่มต้น";
                            if (idx === -2) return "กลับสู่จุดเริ่มต้น";
                            return locationNames[`waypoint-${idx}`] || `จุดหมายที่ ${idx + 1}`;
                        };
                        fromName = getOptimizedName(startMeta);
                        toName = endMeta ? getOptimizedName(endMeta) : (isNavigating ? "จุดหมาย" : "ปลายทาง");
                    } else {
                        const fromIdx = inputIndicesMap[i];
                        const toIdx = inputIndicesMap[i + 1] !== undefined ? inputIndicesMap[i + 1] : -99;
                        const getName = (idx) => {
                            if (idx === -1) return locationNames['start'] || "จุดเริ่มต้น";
                            if (idx === -2) return "กลับสู่จุดเริ่มต้น";
                            if (idx === -99) return "ปลายทาง";
                            return locationNames[`waypoint-${idx}`] || `จุดหมายที่ ${idx + 1}`;
                        };
                        fromName = getName(fromIdx);
                        toName = getName(toIdx);
                    }

                    legInfos.push({
                        from: fromName,
                        to: toName,
                        dist: (leg.distance / 1000).toFixed(2),
                        time: Math.round(leg.duration / 60) + " นาที",
                        isPassed: isNavigating && i < currentLegIndex,
                        isCurrent: isNavigating && i === currentLegIndex
                    });
                    newLegs.push({ coords: allCoords.slice(legStartIdx), startIdx: legStartIdx, endIndex: allCoords.length - 1 });
                });

                setRouteLegs(newLegs);
                setRoutePath(allCoords);
                prefetchRouteTiles(allCoords);
                setSegments(legInfos);
                setDistance((route.distance / 1000).toFixed(2));
                setTotalDuration(formatTime(route.duration));
                setNavigationSteps(allSteps);
                
                if (setRerouteTrigger) setRerouteTrigger(0);
            }
        };

        if (routingCache.current[cacheKey] && !rerouteTrigger && Date.now() - routingCache.current[cacheKey].time < 30000) {
            processData(routingCache.current[cacheKey].data);
            return;
        }

        const performFetch = async () => {
            const now = Date.now();
            if (now - lastFetchTimeRef.current < 600) return;
            lastFetchTimeRef.current = now;
            setIsLoading(true);
            setError(null);

            const isRound = tripType === 'roundtrip';
            const options = `steps=true&geometries=geojson&overview=full&source=first&destination=${isRound ? 'last' : 'any'}&roundtrip=false`;
            const abortController = new AbortController();
            const timeoutId = setTimeout(() => abortController.abort(), 15000);
            
            const fetchRoute = async (host) => {
                const url = `${host}/${apiPath}/v1/driving/${coordStr}?${options}`;
                const res = await fetch(url, { signal: abortController.signal });
                if (!res.ok) throw new Error(`HTTP ${res.status}`);
                const data = await res.json();
                if (data.code !== 'Ok') throw new Error(data.code);
                return data;
            };

            Promise.any([
                fetchRoute(SECONDARY_OSRM),
                fetchRoute(PRIMARY_OSRM)
            ])
            .then(data => {
                clearTimeout(timeoutId);
                abortController.abort();
                routingCache.current[cacheKey] = { data, time: Date.now() };
                processData(data);
            })
            .catch(err => {
                if (err.name === 'AbortError') return;
                console.error("Routing error:", err);
                setError("เซิร์ฟเวอร์คำนวณเส้นทางขัดข้อง โปรดลองใหม่");
            })
            .finally(() => {
                clearTimeout(timeoutId);
                setIsLoading(false);
            });
        };

        if (debounceTimerRef.current) clearTimeout(debounceTimerRef.current);
        if (isOnline) {
            debounceTimerRef.current = setTimeout(performFetch, 500);
        }
        return () => clearTimeout(debounceTimerRef.current);
    }, [startPoint, waypoints, locationNames, tripType, isNavigating, rerouteTrigger, completedWaypoints, originalStart, currentLegIndex, setRerouteTrigger, clearRoute, isOnline]);

    return { routeLegs, routePath, segments, distance, totalDuration, navigationSteps, visitOrder, legTargetIndices, clearRoute, isLoading, error };
};
