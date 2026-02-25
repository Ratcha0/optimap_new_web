import { useState, useRef, useEffect, useCallback, useMemo } from 'react';
import { findClosestPointOnRoute, calculateDistance, calculateBearing } from '../utils/geoUtils';
import { useMapSync } from './navigation/useMapSync';
import { useGuidance } from './navigation/useGuidance';
import { useSimulation } from './navigation/useSimulation';

export const useNavigation = ({
    routePath,
    routeLegs,
    navigationSteps,
    speak,
    setStartPoint,
    setCurrentSpeed,
    setCurrentHeading,
    setLocationNames,
    onReroute,
    setCurrentInstruction,
    mapInstance,
    isAutoSnapPaused,
    setCurrentLegIndex,
    waypoints,
    onLegComplete,
    is3D,
    onArrival,
    setAutoSnapPaused,
    initialPointIndex = 0,
    initialLegIndex = 0
}) => {
    const [isNavigating, setIsNavigating] = useState(false);
    const [isSimulating, setIsSimulating] = useState(false);
    const watchIdRef = useRef(null);
    const currentPointIndexRef = useRef(initialPointIndex);
    const [currentPointIndex, setCurrentPointIndex] = useState(initialPointIndex);
    const currentPosRef = useRef(null);
    const lastHeadingRef = useRef(0);
    const lastSignalTimeRef = useRef(Date.now());
    const lastRerouteTimeRef = useRef(0);
    const lastKnownSpeedRef = useRef(0);
    const offRouteCount = useRef(0);
    const lastOffRouteWarningRef = useRef(0);
    const isWaitingRef = useRef(false);
    const simIndexRef = useRef(0);
    const is3DRef = useRef(is3D);

    useEffect(() => { is3DRef.current = is3D; }, [is3D]);

    const { syncMap } = useMapSync(mapInstance, is3D, isAutoSnapPaused);

    const {
        eta,
        remainingDistance,
        nextManeuver,
        secondNextManeuver,
        isWaitingForContinue,
        setIsWaitingForContinue,
        checkVoiceGuidance,
        calculateETA,
        checkLegProgress,
        resetGuidance,
        activeLegRef
    } = useGuidance({
        routePath, routeLegs, navigationSteps, speak, 
        setCurrentInstruction, onLegComplete, onArrival, initialLegIndex
    });

    useEffect(() => { 
        isWaitingRef.current = isWaitingForContinue; 
    }, [isWaitingForContinue]);

    const { simulateNavigation: runSim, stopSimulation } = useSimulation({
        routePath, mapInstance, syncMap, setStartPoint, setCurrentHeading, setCurrentSpeed,
        checkVoiceGuidance, calculateETA, checkLegProgress,
        is3DRef, setIsNavigating, simIndexRef, setCurrentPointIndex, isWaitingRef
    });

    const stopNavigation = useCallback(() => {
        setIsNavigating(false);
        setIsSimulating(false);
        setIsWaitingForContinue(false);
        isWaitingRef.current = false;
        if (watchIdRef.current) navigator.geolocation.clearWatch(watchIdRef.current);
        stopSimulation();
    }, [stopSimulation]);

    const startNavigation = useCallback((silent = false) => {
        if (!routePath || routePath.length === 0) return;
        stopSimulation();
        setIsNavigating(true);
        setIsSimulating(false);
        setIsWaitingForContinue(false);
        resetGuidance(0);
        if (!silent) {
            setCurrentPointIndex(0);
            currentPointIndexRef.current = 0;
            if (setCurrentLegIndex) setCurrentLegIndex(0);
        }
        if (routePath.length > 0 && mapInstance) {
            if (currentPosRef.current) syncMap(currentPosRef.current[0], currentPosRef.current[1], lastHeadingRef.current, true);
            else mapInstance.jumpTo({ center: [routePath[0][1], routePath[0][0]], zoom: 20 });
            if (!silent && navigationSteps?.length > 0) speak(`เริ่มการนำทางค่ะ ${navigationSteps[0].instruction}`);
            else if (silent) speak("กู้คืนสถานะการนำทางเรียบร้อยค่ะ");
        }
    }, [routePath, navigationSteps, speak, mapInstance, syncMap, stopSimulation, resetGuidance, setCurrentLegIndex]);

    const handleSimulateNavigation = useCallback(() => {
        setIsSimulating(true);
        runSim();
    }, [runSim]);

    const continueNavigation = useCallback(() => {
        setIsWaitingForContinue(false);
        isWaitingRef.current = false;
    }, [setIsWaitingForContinue]);

    const handleGpsUpdate = useCallback((lat, lng, heading, speedMps, accuracy) => {
        if (!isNavigating || isWaitingRef.current || isSimulating) return;
        if (accuracy > 70) return;
        
        const speedKmh = speedMps * 3.6;
        let pHeading = heading;
        
        if (speedKmh < 1.5) pHeading = lastHeadingRef.current;
        else if (pHeading !== null && !isNaN(pHeading)) {
            const alpha = speedKmh > 40 ? 0.15 : 0.3; 
            let diff = (pHeading - lastHeadingRef.current + 540) % 360 - 180;
            pHeading = (lastHeadingRef.current + diff * alpha + 360) % 360;
            lastHeadingRef.current = pHeading;
        } else pHeading = lastHeadingRef.current;

        lastKnownSpeedRef.current = speedKmh;
        lastSignalTimeRef.current = Date.now();
        setCurrentSpeed(speedKmh);
        
        let fLat = lat, fLng = lng, cIdx = -1;
        const sThreshold = speedKmh < 20 ? 35 : (speedKmh < 60 ? 60 : 90);
        
        if (routePath?.length > 0) {
            const { point, distance, index } = findClosestPointOnRoute(lat, lng, pHeading, routePath, currentPointIndexRef.current, sThreshold, speedKmh);
            cIdx = index;
            if (point && distance <= sThreshold) {
                fLat = point[0]; fLng = point[1];
                offRouteCount.current = 0;
                lastOffRouteWarningRef.current = 0;
                
                if (index < routePath.length - 1) {
                    const rB = calculateBearing(routePath[index][0], routePath[index][1], routePath[index+1][0], routePath[index+1][1]);
                    pHeading = (pHeading * 0.3 + rB * 0.7); 
                    lastHeadingRef.current = pHeading;
                }
            } else {
                const now = Date.now();
                if (now - lastRerouteTimeRef.current > 5000) {
                    let inc = distance > 200 ? 5 : (distance > 100 ? 3 : 1);
                    if (cIdx !== -1 && cIdx < routePath.length - 1 && speedKmh > 20) {
                        const rB = calculateBearing(routePath[cIdx][0], routePath[cIdx][1], routePath[cIdx+1][0], routePath[cIdx+1][1]);
                        const angleDiff = Math.abs((pHeading - rB + 540) % 360 - 180);
                        if (angleDiff > 110) inc += 3; 
                    }
                    offRouteCount.current += inc;
                    if (offRouteCount.current >= 8) {
                        offRouteCount.current = 0; lastRerouteTimeRef.current = now;
                        if (onReroute) onReroute(lat, lng);
                    }
                }
            }
        }

        const prevPos = currentPosRef.current || [fLat, fLng];
        const jumps = calculateDistance(prevPos[0], prevPos[1], fLat, fLng);
        
        if (jumps > 0.3 && jumps < 60 && speedKmh > 3) {
            const steps = speedKmh > 50 ? 3 : 5;
            const stepDuration = 1000 / steps;
            for (let i = 1; i <= steps; i++) {
                const ratio = i / steps;
                const iLat = prevPos[0] + (fLat - prevPos[0]) * ratio;
                const iLng = prevPos[1] + (fLng - prevPos[1]) * ratio;
                setTimeout(() => {
                    if (!isNavigating) return;
                    syncMap(iLat, iLng, pHeading, false, speedKmh, nextManeuver?.distance);
                    setStartPoint([iLat, iLng]);
                }, i * stepDuration);
            }
        } else {
            syncMap(fLat, fLng, pHeading, false, speedKmh, nextManeuver?.distance);
            setStartPoint([fLat, fLng]);
        }

        currentPosRef.current = [fLat, fLng];
        setCurrentHeading(pHeading);
        
        if (cIdx !== -1) {
            currentPointIndexRef.current = cIdx;
            setCurrentPointIndex(cIdx);
            calculateETA(cIdx, speedKmh);
            checkVoiceGuidance(fLat, fLng, cIdx, speedKmh);
        }
    }, [isNavigating, isSimulating, routePath, syncMap, nextManeuver, calculateETA, checkVoiceGuidance, setStartPoint, setCurrentSpeed, setCurrentHeading, onReroute, speak]);

 
    useEffect(() => {
        if (!isNavigating || isSimulating || isWaitingRef.current) return;

        const DR_INTERVAL = 1000;
        const interval = setInterval(() => {
            const now = Date.now();
            const timeSinceLastSignal = now - lastSignalTimeRef.current;
            
            if (timeSinceLastSignal >= 1500 && timeSinceLastSignal < 12000 && lastKnownSpeedRef.current > 5) {
                const speedMps = lastKnownSpeedRef.current / 3.6;
                const distToMove = speedMps * (DR_INTERVAL / 1000);
                
                if (routePath?.length > 0 && currentPointIndexRef.current < routePath.length - 1) {
                    const curIdx = currentPointIndexRef.current;
                    const p1 = routePath[curIdx];
                    const p2 = routePath[curIdx + 1];
                    const segDist = calculateDistance(p1[0], p1[1], p2[0], p2[1]);
                    const ratio = segDist > 0 ? Math.min(1, distToMove / segDist) : 0;
                    const drLat = p1[0] + (p2[0] - p1[0]) * ratio;
                    const drLng = p1[1] + (p2[1] - p1[1]) * ratio;
                    const pHeading = calculateBearing(p1[0], p1[1], p2[0], p2[1]);
                    
                    handleGpsUpdate(drLat, drLng, pHeading, lastKnownSpeedRef.current / 3.6, 10);
                }
            }
        }, DR_INTERVAL);

        return () => clearInterval(interval);
    }, [isNavigating, isSimulating, routePath, handleGpsUpdate]);

    return useMemo(() => ({
        isNavigating, isSimulating, handleGpsUpdate, startNavigation, simulateNavigation: handleSimulateNavigation,
        stopNavigation, currentPointIndex, eta, remainingDistance, nextManeuver, secondNextManeuver,
        isWaitingForContinue, continueNavigation, syncMap
    }), [isNavigating, isSimulating, handleGpsUpdate, startNavigation, handleSimulateNavigation, stopNavigation, currentPointIndex, eta, remainingDistance, nextManeuver, secondNextManeuver, isWaitingForContinue, continueNavigation, syncMap]);
};
