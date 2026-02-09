import { useState, useRef, useEffect, useCallback } from 'react';
import { findClosestPointOnRoute, calculateDistance } from '../utils/geoUtils';

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
    onLegComplete
}) => {
    const [isNavigating, setIsNavigating] = useState(false);
    const [simInterval, setSimInterval] = useState(null);
    const watchIdRef = useRef(null);
    const currentPointIndexRef = useRef(0);
    const [currentPointIndex, setCurrentPointIndex] = useState(0);
    const offRouteCount = useRef(0);
    const minDistToLegEnd = useRef(Infinity);
    const lastCheckLeg = useRef(-1);
    const simIndexRef = useRef(0);
    const currentPosRef = useRef(null);
    const lastHeadingRef = useRef(0);
    const lastVoiceTimeRef = useRef(0);
    const isAutoSnapPausedRef = useRef(isAutoSnapPaused);
    useEffect(() => { isAutoSnapPausedRef.current = isAutoSnapPaused; }, [isAutoSnapPaused]);
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

                // console.log(`Arrived at Leg ${currentLeg} end. (Final: ${isFinalLeg})`);

                if (onLegCompleteRef.current) onLegCompleteRef.current(currentLeg);
                const msg = isFinalLeg ? "ถึงจุดหมายปลายทางแล้วค่ะ" : "ถึงจุดหมายแล้วค่ะ";
                speak(`${msg} กรุณากดปุ่มเพื่อดำเนินการต่อค่ะ`);
                setIsWaitingForContinue(true);
                isWaitingRef.current = true;
                lastFinishedLegRef.current = currentLeg;
            }
        }
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
                }

                if (currentStepIdx !== lastSpokenStepIdx.current) {
                    lastSpokenType.current = null;
                    lastSpokenStepIdx.current = currentStepIdx;
                }

                if (triggerType && triggerType !== lastSpokenType.current) {
                    if (triggerType === 'near' && lastSpokenType.current === 'near') return;
                    // console.log(`Speaking: [${triggerType}] ${textToSpeak}`);
                    speak(textToSpeak);
                    lastSpokenType.current = triggerType;
                }
            } else {
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

    const syncMap = (lat, lng, heading) => {
        if (!mapInstance || isAutoSnapPausedRef.current) return;

        try {
            const container = mapInstance.getContainer();
            if (!container || !document.body.contains(container)) return;

            const currentZoom = mapInstance.getZoom();
            const targetZoom = currentZoom < 17 ? 18 : currentZoom;

            mapInstance.setView([lat, lng], targetZoom, {
                animate: true,
                duration: 1.2,
                easeLinearity: 0.1
            });

            if (typeof mapInstance.setBearing === 'function' && heading !== undefined && heading !== null) {
                mapInstance.setBearing(360 - heading);
            }
        } catch (error) {
            console.debug("Map sync skipped:", error.message);
        }
    };

    const stopNavigation = useCallback(() => {
        setIsNavigating(false);
        if (watchIdRef.current) navigator.geolocation.clearWatch(watchIdRef.current);
        if (simInterval) clearInterval(simInterval);
        setSimInterval(null);
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

        if (routePath.length > 0 && mapInstance) {
            mapInstance.setView(routePath[0], 20);
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

                    setCurrentSpeed(speed);
                    if (heading !== null && !isNaN(heading)) setCurrentHeading(heading);

                    if (isWaitingRef.current) {
                        setStartPoint([lat, lng]);
                        syncMap(lat, lng, heading);
                    }

                    let closestIndex = -1;

                    const currentPath = routePathRef.current;
                    if (currentPath.length > 0) {
                        const { point, distance, index } = findClosestPointOnRoute(lat, lng, heading, currentPath);
                        closestIndex = index;

                        if (point && distance <= 25) {
                            lat = point[0];
                            lng = point[1];
                            offRouteCount.current = 0;
                        } else {
                            if (!isWaitingRef.current) {
                                offRouteCount.current += 1;
                                if (offRouteCount.current >= 3) {
                                    offRouteCount.current = 0;
                                    if (onReroute) onReroute(lat, lng);
                                }
                            }
                        }
                    }

                    syncMap(lat, lng, heading);

                    if (closestIndex !== -1) {
                        setCurrentPointIndex(closestIndex);
                        if (!isWaitingRef.current) {
                            checkVoiceGuidance(lat, lng, closestIndex);
                        }
                    }

                    setStartPoint([lat, lng]);
                },
                (err) => console.error(err),
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
        if (mapInstance && currentPath.length > 0) mapInstance.setView([currentPath[0][0], currentPath[0][1]], 18);
        if (simInterval) clearInterval(simInterval);
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

            simIndexRef.current++;
        }, 2000);

        setSimInterval(interval);
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

    return {
        isNavigating,
        startNavigation,
        simulateNavigation,
        stopNavigation,
        visitedIndices,
        currentPointIndex,
        isWaitingForContinue,
        continueNavigation
    };
};
