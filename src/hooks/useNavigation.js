import { useState, useRef, useEffect, useCallback } from 'react';
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
    const watchIdRef = useRef(null);
    const currentPointIndexRef = useRef(initialPointIndex);
    const [currentPointIndex, setCurrentPointIndex] = useState(initialPointIndex);
    const currentPosRef = useRef(null);
    const lastHeadingRef = useRef(0);
    const lastSignalTimeRef = useRef(Date.now());
    const lastRerouteTimeRef = useRef(0);
    const lastKnownSpeedRef = useRef(0);
    const offRouteCount = useRef(0);
    const deadReckoningIntervalRef = useRef(null);
    const isWaitingRef = useRef(false);
    const simIndexRef = useRef(0);

    // 1. Map Sync Hook
    const { syncMap } = useMapSync(mapInstance, is3D, isAutoSnapPaused);

    // 2. Guidance Hook
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

    // 3. Simulation Hook
    const { simulateNavigation: runSim, stopSimulation } = useSimulation({
        routePath, mapInstance, syncMap, setStartPoint, setCurrentHeading, setCurrentSpeed,
        checkVoiceGuidance, calculateETA, checkLegProgress,
        is3DRef: { current: is3D }, setIsNavigating, simIndexRef, setCurrentPointIndex, isWaitingRef
    });


    const stopNavigation = useCallback(() => {
        setIsNavigating(false);
        setIsWaitingForContinue(false);
        isWaitingRef.current = false;
        
        if (watchIdRef.current) navigator.geolocation.clearWatch(watchIdRef.current);
        stopSimulation();
    }, [stopSimulation, setIsWaitingForContinue]);

    const startNavigation = useCallback((silent = false) => {
        if (!routePath || routePath.length === 0) return;

        stopSimulation();
        setIsNavigating(true);
        setIsWaitingForContinue(false);
        resetGuidance(0);
        
        if (!silent) {
            setCurrentPointIndex(0);
            currentPointIndexRef.current = 0;
            if (setCurrentLegIndex) setCurrentLegIndex(0);
        }

        if ("geolocation" in navigator) {
            navigator.geolocation.getCurrentPosition(
                (pos) => {
                    const lat = pos.coords.latitude;
                    const lng = pos.coords.longitude;
                    currentPosRef.current = [lat, lng];
                    setStartPoint([lat, lng]);
                    syncMap(lat, lng, lastHeadingRef.current, true, pos.coords.speed);
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
            
            if (!silent && navigationSteps && navigationSteps.length > 0) {
                speak(`เริ่มการนำทางค่ะ ${navigationSteps[0].instruction}`);
            } else if (silent) {
                speak("กู้คืนสถานะการนำทางเรียบร้อยค่ะ");
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
                    const speedMps = pos.coords.speed || 0;
                    const speedKmh = speedMps * 3.6;

                    if (speedKmh < 1.5) {
                        heading = lastHeadingRef.current;
                    } else if (heading !== null && !isNaN(heading)) {
                        const alpha = 0.3;
                        let diff = (heading - lastHeadingRef.current + 540) % 360 - 180;
                        heading = (lastHeadingRef.current + diff * alpha + 360) % 360;
                        lastHeadingRef.current = heading;
                    } else {
                        heading = lastHeadingRef.current;
                    }

                    lastKnownSpeedRef.current = speedKmh;
                    lastSignalTimeRef.current = Date.now();
                    setCurrentSpeed(speedKmh);
                    setCurrentHeading(heading);
                    currentPosRef.current = [lat, lng];

                    let closestIndex = -1;

                    const snapThreshold = speedKmh < 20 ? 30 : (speedKmh < 60 ? 65 : 90);

                    if (routePath.length > 0) {
                        const { point, distance, index } = findClosestPointOnRoute(
                            lat, lng, heading, routePath, currentPointIndexRef.current, snapThreshold, speedKmh
                        );
                        closestIndex = index;

                        if (point && distance <= snapThreshold) {
                            lat = point[0];
                            lng = point[1];
                            offRouteCount.current = 0;
                            currentPosRef.current = [lat, lng];
                            
                            if (index < routePath.length - 1) {
                                const roadBearing = calculateBearing(routePath[index][0], routePath[index][1], routePath[index+1][0], routePath[index+1][1]);
                                heading = roadBearing;
                                lastHeadingRef.current = roadBearing;
                                setCurrentHeading(roadBearing);
                            }
                        } else {
                        const now = Date.now();
                        if (!isWaitingRef.current && (now - lastRerouteTimeRef.current > 5000)) {
                            let increment = 1;

                            if (distance > 150) {
                                increment = 4;
                            } else if (distance > 80) {
                                increment = 2;
                            }

                            if (closestIndex !== -1 && closestIndex < routePath.length - 1 && speedKmh > 10) {
                                const roadBearing = calculateBearing(
                                    routePath[closestIndex][0], routePath[closestIndex][1],
                                    routePath[closestIndex+1][0], routePath[closestIndex+1][1]
                                );
                                const diff = Math.abs((heading - roadBearing + 540) % 360 - 180);
                                if (diff > 120) {
                                    increment += 2;
                                }
                            }

                            offRouteCount.current += increment;
                            
                            if (offRouteCount.current >= 4) {
                                offRouteCount.current = 0;
                                lastRerouteTimeRef.current = now;
                                if (onReroute) onReroute(lat, lng);
                            }
                        }
                        }
                    }

                    syncMap(lat, lng, heading, false, speed, nextManeuver?.distance);

                    if (closestIndex !== -1) {
                        currentPointIndexRef.current = closestIndex;
                        setCurrentPointIndex(closestIndex);
                        calculateETA(closestIndex, speedKmh);
                        if (!isWaitingRef.current) {
                            checkVoiceGuidance(lat, lng, closestIndex, speedKmh);
                        }
                    }
                    setStartPoint([lat, lng]);
                },
                null,
                { enableHighAccuracy: true, timeout: 20000, maximumAge: 0 }
            );
        }
    }, [routePath, navigationSteps, speak, setStartPoint, setCurrentSpeed, setCurrentHeading, onReroute, mapInstance, syncMap, stopSimulation, resetGuidance, calculateETA, checkVoiceGuidance, setCurrentLegIndex]);

    // Dead Reckoning Logic
    useEffect(() => {
        if (!isNavigating) {
            if (deadReckoningIntervalRef.current) clearInterval(deadReckoningIntervalRef.current);
            return;
        }

        deadReckoningIntervalRef.current = setInterval(() => {
            if (isWaitingRef.current) return;

            const now = Date.now();
            const timeSinceLastSignal = now - lastSignalTimeRef.current;
            const speedKmh = lastKnownSpeedRef.current;

            // 'Gap Filling' mode (even with signal) or 'Dead Reckoning' mode (signal lost)
            // We gap fill if we haven't had a signal for 200ms but less than 5000ms
            if (speedKmh > 2 && timeSinceLastSignal > 200 && timeSinceLastSignal < 5000) {
                const currentIndex = currentPointIndexRef.current;
                if (!routePath || currentIndex >= routePath.length - 1) return;

                const speedMps = speedKmh / 3.6;
                // Move based on the 200ms tick
                const distanceToMove = speedMps * 0.2; 

                let remainingDist = distanceToMove;
                let newIndex = currentIndex;
                let finalPos = currentPosRef.current || routePath[currentIndex];

                while (remainingDist > 0 && newIndex < routePath.length - 1) {
                    const p1 = routePath[newIndex];
                    const p2 = routePath[newIndex + 1];
                    const d = calculateDistance(p1[0], p1[1], p2[0], p2[1]);

                    if (remainingDist >= d) {
                        remainingDist -= d;
                        newIndex++;
                    } else {
                        const ratio = remainingDist / d;
                        finalPos = [p1[0] + (p2[0] - p1[0]) * ratio, p1[1] + (p2[1] - p1[1]) * ratio];
                        remainingDist = 0;
                    }
                }

                currentPointIndexRef.current = newIndex;
                currentPosRef.current = finalPos;
                setStartPoint(finalPos);

                if (newIndex < routePath.length - 1) {
                    const roadBearing = calculateBearing(routePath[newIndex][0], routePath[newIndex][1], routePath[newIndex+1][0], routePath[newIndex+1][1]);
                    lastHeadingRef.current = roadBearing;
                    setCurrentHeading(roadBearing);
                }

                // Sync map with 'force=false' to allow the 950ms smoothing in useMapSync to work
                syncMap(finalPos[0], finalPos[1], lastHeadingRef.current, false, speedKmh, nextManeuver?.distance);
            }
        }, 200);

        return () => {
            if (deadReckoningIntervalRef.current) clearInterval(deadReckoningIntervalRef.current);
        };
    }, [isNavigating, routePath, setStartPoint, syncMap, checkVoiceGuidance, calculateETA]);

    const continueNavigation = useCallback(() => {
        const currentLeg = activeLegRef.current;
        if (routeLegs && currentLeg < routeLegs.length - 1) {
            const nextLegIndex = currentLeg + 1;
            activeLegRef.current = nextLegIndex;
            if (setCurrentLegIndex) setCurrentLegIndex(nextLegIndex);
            setIsWaitingForContinue(false);
            speak("นำทางไปยังจุดหมายถัดไปค่ะ");
            return;
        }

        if (onReroute) {
            if (currentPosRef.current) onReroute(currentPosRef.current[0], currentPosRef.current[1]);
        }
        setIsWaitingForContinue(false);
        speak("กำลังคำนวณเส้นทางใหม่จากตำแหน่งปัจจุบันค่ะ");
    }, [routeLegs, speak, onReroute, setCurrentLegIndex, setIsWaitingForContinue, activeLegRef]);

    return {
        isNavigating,
        startNavigation,
        simulateNavigation: runSim,
        stopNavigation,
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

