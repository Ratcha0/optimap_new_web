import { useState, useRef, useEffect, useCallback } from 'react';
import L from 'leaflet';
import { findClosestPointOnRoute, calculateDistance, calculateBearing } from '../utils/geoUtils';

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
    is3D
}) => {
    const [isNavigating, setIsNavigating] = useState(false);
    const [simInterval, setSimInterval] = useState(null);
    const watchIdRef = useRef(null);
    const currentPointIndexRef = useRef(0);
    const [currentPointIndex, setCurrentPointIndex] = useState(0);
    const [eta, setEta] = useState(0);
    const [remainingDistance, setRemainingDistance] = useState(0);
    const [nextManeuver, setNextManeuver] = useState(null);
    const [secondNextManeuver, setSecondNextManeuver] = useState(null);
    const offRouteCount = useRef(0);
    const minDistToLegEnd = useRef(Infinity);
    const lastCheckLeg = useRef(-1);
    const simIndexRef = useRef(0);
    const currentPosRef = useRef(null);
    const lastHeadingRef = useRef(0);
    const lastVoiceTimeRef = useRef(0);
    const lastSignalTimeRef = useRef(Date.now());
    const lastRerouteTimeRef = useRef(0);
    const lastKnownSpeedRef = useRef(0);
    const deadReckoningIntervalRef = useRef(null);
    const isAutoSnapPausedRef = useRef(isAutoSnapPaused);
    const is3DRef = useRef(is3D);

    useEffect(() => { 
        isAutoSnapPausedRef.current = isAutoSnapPaused; 
    }, [isAutoSnapPaused]);

    useEffect(() => {
        is3DRef.current = is3D;
    }, [is3D]);

    useEffect(() => { 
        if (!isAutoSnapPaused && currentPosRef.current && isNavigating) {
            syncMap(currentPosRef.current[0], currentPosRef.current[1], lastHeadingRef.current);
        }
    }, [isAutoSnapPaused, isNavigating]);
    const routePathRef = useRef(routePath);
    const routeLegsRef = useRef(routeLegs);
    const navigationStepsRef = useRef(navigationSteps);
    const onLegCompleteRef = useRef(onLegComplete);
    useEffect(() => { routePathRef.current = routePath; }, [routePath]);
    useEffect(() => { navigationStepsRef.current = navigationSteps; }, [navigationSteps]);
    useEffect(() => { onLegCompleteRef.current = onLegComplete; }, [onLegComplete]);

    useEffect(() => {
        routeLegsRef.current = routeLegs;
        if (routeLegs && routeLegs.length > 0) {
            activeLegRef.current = 0;
            lastFinishedLegRef.current = -1;
            setVisitedIndices(new Set());
            setCurrentPointIndex(0);

            minDistToLegEnd.current = Infinity;
            lastCheckLeg.current = -1;
        }
    }, [routeLegs]);
    useEffect(() => { navigationStepsRef.current = navigationSteps; }, [navigationSteps]);

    const activeStepIndex = useRef(0);
    const lastSpokenType = useRef(null);
    const lastSpokenStepIdx = useRef(-1);
    const activeLegRef = useRef(0);
    const lastFinishedLegRef = useRef(-1);
    const [visitedIndices, setVisitedIndices] = useState(new Set());
    const [isWaitingForContinue, setIsWaitingForContinue] = useState(false);
    const isWaitingRef = useRef(false);
    useEffect(() => { isWaitingRef.current = isWaitingForContinue; }, [isWaitingForContinue]);

    const checkLegProgress = (lat, lng) => {
        if (isWaitingRef.current) return;
        const currentRouteLegs = routeLegsRef.current;
        if (!currentRouteLegs || currentRouteLegs.length === 0) return;
        const currentLeg = activeLegRef.current;
        if (currentLeg !== lastCheckLeg.current) {
            minDistToLegEnd.current = Infinity;
            lastCheckLeg.current = currentLeg;
        }

        if (currentLeg >= currentRouteLegs.length) return;
        const legData = currentRouteLegs[currentLeg];
        if (!legData) return;
        const legPoints = legData.coords || legData;
        if (!legPoints || legPoints.length === 0) return;
        const legEnd = legPoints[legPoints.length - 1];
        const distToEnd = calculateDistance(lat, lng, legEnd[0], legEnd[1]);
        if (distToEnd < minDistToLegEnd.current) {
            minDistToLegEnd.current = distToEnd;
        }
        const isCloseEnough = distToEnd < 30;
        const hasPassedBy = minDistToLegEnd.current < 30 && distToEnd > minDistToLegEnd.current + 20;

        if (isCloseEnough || hasPassedBy) {
            const isFinalLeg = currentLeg === currentRouteLegs.length - 1;

            if (currentLeg !== lastFinishedLegRef.current) {

                if (!visitedIndices.has(currentLeg)) {
                    const newSet = new Set(visitedIndices);
                    newSet.add(currentLeg);
                    setVisitedIndices(newSet);
                }

                

                if (onLegCompleteRef.current) onLegCompleteRef.current(currentLeg);
                const msg = isFinalLeg ? "ถึงจุดหมายปลายทางแล้วค่ะ" : "ถึงจุดหมายแล้วค่ะ";
                speak(`${msg} กรุณากดปุ่มเพื่อดำเนินการต่อค่ะ`);
                setIsWaitingForContinue(true);
                isWaitingRef.current = true;
                lastFinishedLegRef.current = currentLeg;
            }
        }
    };

    const calculateETA = (currentIndex, speed) => {
        const path = routePathRef.current;
        if (!path || path.length === 0 || currentIndex >= path.length - 1) {
            setRemainingDistance(0);
            setEta(0);
            return;
        }

        let totalDist = 0;
        for (let i = currentIndex; i < path.length - 1; i++) {
            totalDist += calculateDistance(path[i][0], path[i][1], path[i + 1][0], path[i + 1][1]);
        }

        setRemainingDistance(totalDist);

        const currentSpeedKmh = speed || 0;
        const effectiveSpeed = currentSpeedKmh > 5 ? currentSpeedKmh : 25;
        const timeHours = (totalDist / 1000) / effectiveSpeed;
        const timeMinutes = Math.ceil(timeHours * 60);
        setEta(timeMinutes);
    };

    const checkVoiceGuidance = (lat, lng, currentIndex) => {
        checkLegProgress(lat, lng);
        if (isWaitingRef.current) return;
        const currentSteps = navigationStepsRef.current;
        if (!currentSteps || currentSteps.length === 0) return;
        let currentStepIdx = -1;
        for (let i = 0; i < currentSteps.length; i++) {
            const step = currentSteps[i];
            if (currentIndex >= step.startIndex && currentIndex <= step.endIndex) {
                currentStepIdx = i;
                break;
            }
        }

        if (currentStepIdx !== -1) {
            activeStepIndex.current = currentStepIdx;
            const currentStep = currentSteps[currentStepIdx];
            if (setCurrentInstruction) setCurrentInstruction(currentStep.instruction);

            if (currentStepIdx < currentSteps.length - 1) {
                const nextStep = currentSteps[currentStepIdx + 1];
                const maneuverLat = nextStep.maneuver.location[1];
                const maneuverLng = nextStep.maneuver.location[0];
                const instructions = nextStep.instruction;
                const distToManeuver = calculateDistance(lat, lng, maneuverLat, maneuverLng);
                
                setNextManeuver({
                    type: nextStep.maneuver.type,
                    modifier: nextStep.maneuver.modifier,
                    distance: distToManeuver,
                    instruction: instructions,
                    afterDistance: nextStep.distance
                });

                if (currentStepIdx < currentSteps.length - 2) {
                    const followingStep = currentSteps[currentStepIdx + 2];
                    setSecondNextManeuver({
                        type: followingStep.maneuver.type,
                        modifier: followingStep.maneuver.modifier,
                        instruction: followingStep.instruction,
                        distance: nextStep.distance
                    });
                } else {
                    setSecondNextManeuver(null);
                }

                let triggerType = null;
                let textToSpeak = "";

                if (distToManeuver < 30) {
                    triggerType = 'near';
                    textToSpeak = `ถึงแล้ว ${instructions}`;
                } else if (distToManeuver < 100) {
                    triggerType = 'medium';
                    textToSpeak = `อีก 100 เมตร ${instructions}`;
                } else if (distToManeuver < 500 && distToManeuver > 450) {
                    triggerType = 'far';
                    textToSpeak = `อีก 500 เมตร ${instructions}`;
                } else if (distToManeuver < 1050 && distToManeuver > 950) {
                    triggerType = 'very_far';
                    textToSpeak = `อีก 1 กิโลเมตร ${instructions}`;
                } else if (distToManeuver < 2050 && distToManeuver > 1950) {
                    triggerType = 'extremely_far';
                    textToSpeak = `อีก 2 กิโลเมตร ${instructions}`;
                }

                if (currentStepIdx !== lastSpokenStepIdx.current) {
                    if (lastSpokenStepIdx.current !== -1) {
                        const dist = currentStep.distance;
                        if (dist > 2000) {
                            speak(`เลี้ยวเรียบร้อย ขับต่อไปอีก ${(dist / 1000).toFixed(1)} กิโลเมตรค่ะ`);
                        }
                    }
                    lastSpokenType.current = null;
                    lastSpokenStepIdx.current = currentStepIdx;
                }

                if (triggerType && triggerType !== lastSpokenType.current) {
                    if (triggerType === 'near' && lastSpokenType.current === 'near') return;
                    speak(textToSpeak);
                    lastSpokenType.current = triggerType;
                }
            } else {
                setNextManeuver(null);
                setSecondNextManeuver(null);
                if (routePath && routePath.length > 0) {
                    const lastPoint = routePath[routePath.length - 1];
                    const dist = calculateDistance(lat, lng, lastPoint[0], lastPoint[1]);
                    if (dist < 30 && lastSpokenType.current !== 'arrived') {
                        speak("คุณเดินทางถึงที่หมายแล้วค่ะ");
                        lastSpokenType.current = 'arrived';
                    }
                }
            }
        }
    };



    const pendingUpdateRef = useRef(null);
    const rafIdRef = useRef(null);
    const lastUpdateTimeRef = useRef(0);


    const performMapUpdate = (lat, lng, heading, force) => {
        
        if (!mapInstance || !mapInstance.getContainer()) return;
        
        try {
            const currentZoom = mapInstance.getZoom();
           
            if (currentZoom === undefined) return;

            let idealZoom = 18;
            if (lastKnownSpeedRef.current > 16.6) idealZoom = 16; 
            else if (lastKnownSpeedRef.current > 8.3) idealZoom = 17;

            const targetZoom = force ? Math.max(currentZoom, idealZoom) : (currentZoom < idealZoom ? idealZoom : currentZoom);

            let targetCenter = [lat, lng];
            const shouldUse3D = is3DRef.current;
            const offsetPixels = shouldUse3D ? window.innerHeight * 0.1 : window.innerHeight * 0.15;
            
           
            try {
                const point = mapInstance.project([lat, lng], targetZoom);
                if (!point) return;

                if (heading !== undefined) {
                    const rad = (heading * Math.PI) / 180;
                    point.x += offsetPixels * Math.sin(rad);
                    point.y -= offsetPixels * Math.cos(rad);
                } else {
                    point.y -= offsetPixels;
                }

                targetCenter = mapInstance.unproject(point, targetZoom);
            } catch (projError) {
                targetCenter = [lat, lng];
            }

            const options = {
                animate: true,
                duration: force ? 0.6 : 0.2, 
                easeLinearity: 1.0, 
                noMoveStart: true, 
                hard: true 
            };

           
            if (force) {
                mapInstance.flyTo(targetCenter, targetZoom, options);
            } else {
                mapInstance.setView(targetCenter, targetZoom, {
                    ...options,
                    animate: false,
                });
            }

            if (heading !== undefined && heading !== null) {
                if (typeof mapInstance.setBearing === 'function') {
                    const currentBearing = mapInstance.getBearing ? mapInstance.getBearing() : 0;
                    const targetBearing = 360 - heading;
                    const diff = Math.abs(currentBearing - targetBearing);
                    
                    if (diff > 180) {
                         mapInstance.setBearing(targetBearing);
                    } else {
                        mapInstance.setBearing(targetBearing);
                    }
                }
            }
        } catch (error) {
          
            if (error.message && error.message.includes('_leaflet_pos')) {
                return;
            }
            console.error("syncMap error:", error);
        }
    };

    const processMapUpdate = () => {
        if (pendingUpdateRef.current) {
            const { lat, lng, heading, force } = pendingUpdateRef.current;
            performMapUpdate(lat, lng, heading, force);
            pendingUpdateRef.current = null;
        }
        rafIdRef.current = null;
    };

    const syncMap = (lat, lng, heading, force = false) => {
        if (!mapInstance) return;
        if (!force && isAutoSnapPausedRef.current) return;
        
   
        const now = Date.now();
        if (!force && now - lastUpdateTimeRef.current < 33) {
             pendingUpdateRef.current = { lat, lng, heading, force };
             if (!rafIdRef.current) {
                 rafIdRef.current = requestAnimationFrame(processMapUpdate);
             }
             return;
        }

        lastUpdateTimeRef.current = now;
        
       
        if (rafIdRef.current) {
            cancelAnimationFrame(rafIdRef.current);
            rafIdRef.current = null;
        }
        
        performMapUpdate(lat, lng, heading, force);
    };

    const stopNavigation = useCallback(() => {
        setIsNavigating(false);
        if (watchIdRef.current) navigator.geolocation.clearWatch(watchIdRef.current);
        if (simInterval) clearInterval(simInterval);
        setSimInterval(null);
        setNextManeuver(null);
        setSecondNextManeuver(null);
    }, [simInterval]);

    const startNavigation = useCallback(() => {
        if (!routePathRef.current || routePathRef.current.length === 0) return;

        if (simInterval) clearInterval(simInterval);
        setSimInterval(null);
        setIsNavigating(true);
        setIsWaitingForContinue(false);
        activeStepIndex.current = 0;
        lastSpokenType.current = null;
        setVisitedIndices(new Set());
        activeLegRef.current = 0;
        lastFinishedLegRef.current = -1;
        setCurrentPointIndex(0);
        if (setCurrentLegIndex) setCurrentLegIndex(0);

        if ("geolocation" in navigator) {
            navigator.geolocation.getCurrentPosition(
                (pos) => {
                    const lat = pos.coords.latitude;
                    const lng = pos.coords.longitude;
                    currentPosRef.current = [lat, lng];
                    setStartPoint([lat, lng]);
                    syncMap(lat, lng, lastHeadingRef.current, true);
                },
                null,
                { enableHighAccuracy: true, timeout: 5000 }
            );
        }

        if (routePath.length > 0 && mapInstance) {
            if (currentPosRef.current) {
                syncMap(currentPosRef.current[0], currentPosRef.current[1], lastHeadingRef.current, true);
            } else {
                mapInstance.setView(routePath[0], 20);
            }
            
            if (navigationSteps && navigationSteps.length > 0) {
                const firstStep = navigationSteps[0];
                speak(`เริ่มการนำทางค่ะ ${firstStep.instruction}`);
            }
        }

        if ("geolocation" in navigator) {
            if (watchIdRef.current) navigator.geolocation.clearWatch(watchIdRef.current);
            watchIdRef.current = navigator.geolocation.watchPosition(
                (pos) => {
                    if (pos.coords.accuracy > 60) return;

                    let lat = pos.coords.latitude;
                    let lng = pos.coords.longitude;
                    let heading = pos.coords.heading;
                    const speed = pos.coords.speed || 0;

                    if (heading !== null && !isNaN(heading)) {
                        lastHeadingRef.current = heading;
                    } else {
                        heading = lastHeadingRef.current;
                    }

                    lastKnownSpeedRef.current = speed;
                    lastSignalTimeRef.current = Date.now();
                    setCurrentSpeed(speed);
                    if (heading !== null && !isNaN(heading)) setCurrentHeading(heading);
                    currentPosRef.current = [lat, lng];

                    if (isWaitingRef.current) {
                        setStartPoint([lat, lng]);
                        
                    }

                    let closestIndex = -1;

                    const currentPath = routePathRef.current;
                    if (currentPath.length > 0) {
                        const { point, distance, index } = findClosestPointOnRoute(lat, lng, heading, currentPath);
                        closestIndex = index;

                        if (point && distance <= 45) {
                            lat = point[0];
                            lng = point[1];
                            offRouteCount.current = 0;
                            currentPosRef.current = [lat, lng];
                            
                            if (index < currentPath.length - 1) {
                                const roadBearing = calculateBearing(currentPath[index][0], currentPath[index][1], currentPath[index+1][0], currentPath[index+1][1]);
                                heading = roadBearing;
                                lastHeadingRef.current = roadBearing;
                                setCurrentHeading(roadBearing);
                            }
                        } else {
                            const now = Date.now();
                           
                            if (!isWaitingRef.current && (now - lastRerouteTimeRef.current > 10000)) {
                                offRouteCount.current += 1;
                                if (offRouteCount.current >= 5) {
                                    offRouteCount.current = 0;
                                    lastRerouteTimeRef.current = now;
                                    if (onReroute) onReroute(lat, lng);
                                }
                            }
                        }
                    }

                    syncMap(lat, lng, heading);

                    if (closestIndex !== -1) {
                        currentPointIndexRef.current = closestIndex;
                        setCurrentPointIndex(closestIndex);
                        calculateETA(closestIndex, speed);
                        if (!isWaitingRef.current) {
                            checkVoiceGuidance(lat, lng, closestIndex);
                        }
                    }

                    setStartPoint([lat, lng]);
                },
                (err) => {},
                { enableHighAccuracy: true, timeout: 20000, maximumAge: 0 }
            );
        }
    }, [routePath, routeLegs, navigationSteps, speak, setStartPoint, setCurrentSpeed, setCurrentHeading, setLocationNames, onReroute, mapInstance, isAutoSnapPaused]);

    const simulateNavigation = useCallback(() => {
        const currentPath = routePathRef.current;
        if (!currentPath || currentPath.length === 0) return;

        if (watchIdRef.current) {
            navigator.geolocation.clearWatch(watchIdRef.current);
            watchIdRef.current = null;
        }

        setIsNavigating(true);
        activeStepIndex.current = 0;
        lastSpokenType.current = null;
        setVisitedIndices(new Set());

        activeLegRef.current = 0;
        lastFinishedLegRef.current = -1;
        setCurrentPointIndex(0);
        simIndexRef.current = 0;
        if (setCurrentLegIndex) setCurrentLegIndex(0);
        if (mapInstance && currentPath.length > 0) {
            const p0 = currentPath[0];
            const p1 = currentPath[Math.min(1, currentPath.length - 1)];
            const initBearing = calculateBearing(p0[0], p0[1], p1[0], p1[1]);
            setStartPoint([p0[0], p0[1]]);
            currentPosRef.current = [p0[0], p0[1]];
            setCurrentHeading(initBearing);
            performMapUpdate(p0[0], p0[1], initBearing, true);
        }
        if (simInterval) clearInterval(simInterval);

        setTimeout(() => {
        const interval = setInterval(() => {
            const latestPath = routePathRef.current;
            if (!latestPath || latestPath.length === 0) {
                return;
            }

            if (simIndexRef.current >= latestPath.length - 1) {
                clearInterval(interval);
                stopNavigation();
                return;
            }

            if (isWaitingRef.current) {
                return;
            }

            const idx = simIndexRef.current;
            const p1 = latestPath[idx];
            const p2 = latestPath[idx + 1];

            if (!p1 || !p2) return;

            const toRad = x => x * Math.PI / 180;
            const toDeg = x => x * 180 / Math.PI;
            let lookAheadIdx = idx + 1;
            const thresholdDeg = 0.00010;

            while (lookAheadIdx < latestPath.length - 1) {
                const pt = latestPath[lookAheadIdx];
                const dLat = Math.abs(pt[0] - p1[0]);
                const dLng = Math.abs(pt[1] - p1[1]);
                if (dLat + dLng > thresholdDeg) {
                    break;
                }
                lookAheadIdx++;
            }

            const pTarget = latestPath[lookAheadIdx];
            const lat1 = toRad(p1[0]); const lon1 = toRad(p1[1]);
            const lat2 = toRad(pTarget[0]); const lon2 = toRad(pTarget[1]);
            const y = Math.sin(lon2 - lon1) * Math.cos(lat2);
            const x = Math.cos(lat1) * Math.sin(lat2) - Math.sin(lat1) * Math.cos(lat2) * Math.cos(lon2 - lon1);
            const bearing = (toDeg(Math.atan2(y, x)) + 360) % 360;

            setStartPoint([p1[0], p1[1]]);
            currentPosRef.current = [p1[0], p1[1]];
            setCurrentHeading(bearing);
            setCurrentSpeed(30);

            syncMap(p1[0], p1[1], bearing);
            checkVoiceGuidance(p1[0], p1[1], idx);
            setCurrentPointIndex(idx);
            currentPointIndexRef.current = idx;
            calculateETA(idx, 30);

            simIndexRef.current++;
        }, 2000);

        setSimInterval(interval);
        }, 1500);
    }, [simInterval, setStartPoint, setCurrentHeading, setCurrentSpeed, mapInstance, isAutoSnapPaused, stopNavigation, isWaitingForContinue]);

    const continueNavigation = useCallback(() => {
        routePathRef.current = [];
        routeLegsRef.current = [];

        minDistToLegEnd.current = Infinity;
        lastCheckLeg.current = -1;
        simIndexRef.current = 0;

        const currentRouteLegs = routeLegsRef.current;
        if (!currentRouteLegs) return;

        if (onReroute) {
            if (currentPosRef.current) {
                onReroute(currentPosRef.current[0], currentPosRef.current[1]);
            } else if (mapInstance) {
                const center = mapInstance.getCenter();
                onReroute(center.lat, center.lng);
            } else if (watchIdRef.current) {
                onReroute(0, 0);
            }
        }

        setIsWaitingForContinue(false);
        speak("กำลังคำนวณเส้นทางใหม่จากตำแหน่งปัจจุบันค่ะ");
    }, [speak, onReroute, mapInstance]);

    useEffect(() => {
        if (!isNavigating) {
            if (deadReckoningIntervalRef.current) clearInterval(deadReckoningIntervalRef.current);
            return;
        }

        deadReckoningIntervalRef.current = setInterval(() => {
            const now = Date.now();
            const timeSinceLastSignal = now - lastSignalTimeRef.current;

            if (timeSinceLastSignal > 3000 && lastKnownSpeedRef.current > 1.3) {
                const currentPath = routePathRef.current;
                if (!currentPath || currentPath.length === 0) return;

                const currentIndex = currentPointIndexRef.current;
                if (currentIndex >= currentPath.length - 1) return;

                const speedMps = lastKnownSpeedRef.current / 3.6;
                const distanceToMove = speedMps * 1; 

                let remainingDist = distanceToMove;
                let newIndex = currentIndex;
                let finalPos = currentPath[currentIndex];

                while (remainingDist > 0 && newIndex < currentPath.length - 1) {
                    const p1 = currentPath[newIndex];
                    const p2 = currentPath[newIndex + 1];
                    const d = calculateDistance(p1[0], p1[1], p2[0], p2[1]);

                    if (remainingDist >= d) {
                        remainingDist -= d;
                        newIndex++;
                        finalPos = p2;
                    } else {
                        const ratio = remainingDist / d;
                        finalPos = [
                            p1[0] + (p2[0] - p1[0]) * ratio,
                            p1[1] + (p2[1] - p1[1]) * ratio
                        ];
                        remainingDist = 0;
                    }
                }

                if (newIndex !== currentIndex || remainingDist === 0) {
                    currentPointIndexRef.current = newIndex;
                    setCurrentPointIndex(newIndex);
                    setStartPoint(finalPos);
                    syncMap(finalPos[0], finalPos[1], lastHeadingRef.current);
                    checkVoiceGuidance(finalPos[0], finalPos[1], newIndex);
                }
            }
        }, 1000);

        return () => {
            if (deadReckoningIntervalRef.current) clearInterval(deadReckoningIntervalRef.current);
        };
    }, [isNavigating, setStartPoint, setCurrentPointIndex, speak]);

    return {
        isNavigating,
        startNavigation,
        simulateNavigation,
        stopNavigation,
        visitedIndices,
        currentPointIndex,
        eta,
        remainingDistance,
        nextManeuver,
        secondNextManeuver,
        isWaitingForContinue,
        continueNavigation,
        syncMap: (force = false) => {
            if (currentPosRef.current) {
                syncMap(currentPosRef.current[0], currentPosRef.current[1], lastHeadingRef.current, force);
            }
        }
    };
};
