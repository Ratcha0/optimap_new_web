import { useState, useEffect, useRef, useCallback } from 'react';
import L from 'leaflet';
import { calculateDistance } from '../utils/geoUtils';
import { formatTime, translateInstruction } from '../utils/mapUtils';
import { ROUTING_API } from '../constants/api';

export const useRouting = ({
    startPoint,
    waypoints,
    locationNames,
    travelMode,
    tripType,
    isNavigating,
    rerouteTrigger,
    setRerouteTrigger,
    completedWaypoints,
    originalStart,
    currentLegIndex
}) => {
    const [routeLegs, setRouteLegs] = useState([]);
    const [routePath, setRoutePath] = useState([]);
    const [segments, setSegments] = useState([]);
    const [distance, setDistance] = useState(null);
    const [totalDuration, setTotalDuration] = useState(null);
    const [navigationSteps, setNavigationSteps] = useState([]);
    const [visitOrder, setVisitOrder] = useState({});
    const [legTargetIndices, setLegTargetIndices] = useState([]);
    const lastWaypointsRef = useRef("");
    const lastRoutedPos = useRef(null);
    const clearRoute = useCallback(() => {
        setRouteLegs([]);
        setRoutePath([]);
        setSegments([]);
        setDistance(null);
        setTotalDuration(null);
        setNavigationSteps([]);
        setVisitOrder({});
        setLegTargetIndices([]);
    }, []);

    useEffect(() => {
        const validWps = waypoints.filter(wp => wp !== null);


        if (!startPoint || validWps.length === 0) {
            if (routePath.length > 0) clearRoute();
            lastWaypointsRef.current = "";
            return;
        }

        const waypointsStr = JSON.stringify(validWps) + `-${tripType}-${travelMode}`;
        const waypointsChanged = waypointsStr !== lastWaypointsRef.current;

        if (!waypointsChanged && lastRoutedPos.current) {
            if (isNavigating && rerouteTrigger === 0) return;
            const dist = L.latLng(startPoint).distanceTo(lastRoutedPos.current);
            if (!isNavigating && dist < 30) return;
        }

        lastWaypointsRef.current = waypointsStr;
        let wpsWithIndex = validWps.map((wp, i) => ({ coords: wp, originalIndex: i }));
        if (isNavigating) {
            wpsWithIndex = wpsWithIndex.filter(w => !completedWaypoints.has(w.originalIndex));
        } else if (tripType === 'oneway') {
            wpsWithIndex.sort((a, b) => calculateDistance(startPoint[0], startPoint[1], a.coords[0], a.coords[1]) - calculateDistance(startPoint[0], startPoint[1], b.coords[0], b.coords[1]));
        }

        const sortedWps = wpsWithIndex.map(w => w.coords);
        let coords = [startPoint, ...sortedWps];
        let indices = [-1, ...wpsWithIndex.map(w => w.originalIndex)];

        if (tripType === 'roundtrip' && isNavigating && originalStart) {
            coords.push(originalStart);
            indices.push(-2);
        }

        const inputIndicesMap = indices;
        const coordStr = coords.map(p => `${p[1]},${p[0]}`).join(';');
        const apiMode = travelMode === 'motorbike' ? 'driving' : travelMode;
        let baseUrl = ROUTING_API.OSRM_GENERIC;
        if (apiMode === 'driving') baseUrl = ROUTING_API.OSM_CAR;
        if (apiMode === 'bike') baseUrl = ROUTING_API.OSM_BIKE;
        if (apiMode === 'foot') baseUrl = ROUTING_API.OSM_FOOT;

        let service = (tripType === 'roundtrip' && !isNavigating) ? 'trip' : 'route';
        let options = `&steps=true&geometries=geojson`;
        if (service === 'trip') options += `&roundtrip=true&source=first`;

        const fetchRoute = async (url) => {
            const res = await fetch(url);
            const data = await res.json();
            if (data.code !== 'Ok') throw new Error(data.code);
            return data;
        };

        const primaryUrl = `${baseUrl}/${service}/v1/driving/${coordStr}?overview=false${options}`;
        const fallbackUrl = `${ROUTING_API.OSRM_GENERIC}/${service}/v1/driving/${coordStr}?overview=false${options}`;

        const processData = (data) => {
            lastRoutedPos.current = startPoint;
            let legs, sortedOriginalIndices, totalDistance = 0, totalSecs = 0;
            const adjustTime = (sec) => travelMode === 'motorbike' ? sec * 0.7 : sec;

            if (service === 'trip' && data.trips) {
                const trip = data.trips[0];
                legs = trip.legs; totalDistance = trip.distance; totalSecs = adjustTime(trip.duration);
                sortedOriginalIndices = data.waypoints.map(wp => inputIndicesMap[wp.waypoint_index]);
                if (tripType === 'roundtrip') sortedOriginalIndices.push(-2);
            } else if (data.routes) {
                const route = data.routes[0];
                legs = route.legs; totalDistance = route.distance; totalSecs = adjustTime(route.duration);
                sortedOriginalIndices = [...inputIndicesMap];
            }

            if (legs) {
                const newOrder = {};
                sortedOriginalIndices.forEach((origIdx, seq) => { if (origIdx >= 0) newOrder[origIdx] = seq; });
                setVisitOrder(newOrder);

                const newLegs = []; const legInfos = []; const allCoords = []; const allSteps = [];
                legs.forEach((leg, i) => {
                    const legStartIdx = allCoords.length;
                    if (leg.steps) {
                        leg.steps.forEach(step => {
                            if (step.geometry?.coordinates) {
                                const sIdx = allCoords.length;
                                const stepCoords = step.geometry.coordinates.map(c => [c[1], c[0]]);
                                allCoords.push(...stepCoords);
                                allSteps.push({
                                    ...step,
                                    startIndex: sIdx,
                                    endIndex: allCoords.length - 1,
                                    instruction: translateInstruction(step)
                                });
                            }
                        });
                    }
                    const fromIdx = sortedOriginalIndices[i];
                    const toIdx = sortedOriginalIndices[i + 1];
                    const getName = (idx) => {
                        if (idx === -1) return locationNames['start'] || "จุดเริ่มต้น";
                        if (idx === -2) return "จุดเริ่มต้น (ขากลับ)";
                        return locationNames[`waypoint-${idx}`] || `ปลายทางที่ ${idx + 1}`;
                    };
                    legInfos.push({
                        from: getName(fromIdx),
                        to: getName(toIdx),
                        dist: (leg.distance / 1000).toFixed(2),
                        time: formatTime(adjustTime(leg.duration || 0)),
                        isPassed: isNavigating && i < currentLegIndex,
                        isCurrent: isNavigating && i === currentLegIndex
                    });
                    newLegs.push({ coords: allCoords.slice(legStartIdx), startIdx: legStartIdx, endIdx: allCoords.length - 1 });
                });

                setRouteLegs(newLegs);
                setRoutePath(allCoords);
                setSegments(legInfos);
                setDistance((totalDistance / 1000).toFixed(2));
                setTotalDuration(formatTime(totalSecs));
                setNavigationSteps(allSteps);
                setLegTargetIndices(legs.map((_, i) => sortedOriginalIndices[i + 1]));
                if (setRerouteTrigger) setRerouteTrigger(0);
            }
        };

        fetchRoute(primaryUrl)
            .then(processData)
            .catch(() => {
                fetchRoute(fallbackUrl)
                    .then(processData)
                    .catch(err => console.error("All routing attempts failed:", err));
            });
    }, [startPoint, waypoints, locationNames, travelMode, tripType, isNavigating, rerouteTrigger, completedWaypoints, originalStart, currentLegIndex, setRerouteTrigger, clearRoute, routePath.length]);

    return {
        routeLegs,
        routePath,
        segments,
        distance,
        totalDuration,
        navigationSteps,
        visitOrder,
        legTargetIndices,
        clearRoute
    };
};
