import { useRef, useCallback } from 'react';
import { calculateBearing, calculateDistance } from '../../utils/geoUtils';

export const useSimulation = ({
    routePath,
    mapInstance,
    syncMap,
    setStartPoint,
    setCurrentHeading,
    setCurrentSpeed,
    checkVoiceGuidance,
    calculateETA,
    checkLegProgress,
    is3DRef,
    setIsNavigating,
    simIndexRef,
    setCurrentPointIndex,
    isWaitingRef
}) => {
    const simIntervalRef = useRef(null);
    const lastStatePointRef = useRef([0, 0]);

    const stopSimulation = useCallback(() => {
        if (simIntervalRef.current) {
            cancelAnimationFrame(simIntervalRef.current);
            simIntervalRef.current = null;
        }
    }, []);

    const simulateNavigation = useCallback(() => {
        if (!routePath || routePath.length === 0) return;

        setIsNavigating(true);
        simIndexRef.current = 0;
        setCurrentPointIndex(0);
        
        let startTime = null;
        let lastFrameTime = 0;
        const SPEED_KMH = 80; 
        const SPEED_MPS = SPEED_KMH / 3.6;
        
        const startPos = routePath[0];
        const secondPos = routePath[1] || startPos;
        const initialBearing = calculateBearing(startPos[0], startPos[1], secondPos[0], secondPos[1]);
        
        setStartPoint(startPos);
        lastStatePointRef.current = startPos;
        setCurrentHeading(initialBearing);
        
        setTimeout(() => {
            if (mapInstance?.isMapLibre) {
                mapInstance.jumpTo({
                    center: [startPos[1], startPos[0]],
                    zoom: 19,
                    pitch: is3DRef.current ? 65 : 0,
                    bearing: initialBearing
                });
            }
            syncMap(startPos[0], startPos[1], initialBearing, true, SPEED_KMH);
        }, 50);

        const distances = [0];
        let totalDistance = 0;
        for (let i = 0; i < routePath.length - 1; i++) {
            totalDistance += calculateDistance(routePath[i][0], routePath[i][1], routePath[i+1][0], routePath[i+1][1]);
            distances.push(totalDistance);
        }

        stopSimulation();
        
        let lastUpdateTime = 0;

        const updateSimulation = (timestamp) => {
            if (!startTime) {
                startTime = timestamp;
                lastFrameTime = timestamp;
            }

            if (isWaitingRef.current) {
                startTime += (timestamp - lastFrameTime);
                lastFrameTime = timestamp;
                simIntervalRef.current = requestAnimationFrame(updateSimulation);
                return;
            }
            
            lastFrameTime = timestamp;
            const elapsedSeconds = (timestamp - startTime) / 1000;
            const distanceCovered = elapsedSeconds * SPEED_MPS;

            if (distanceCovered >= totalDistance) {
                const endPos = routePath[routePath.length - 1];
                setStartPoint(endPos);
                syncMap(endPos[0], endPos[1], initialBearing, false, 0);
                checkLegProgress(endPos[0], endPos[1], 0);
                return;
            }

            let idx = 0;
            while (idx < distances.length - 2 && distances[idx + 1] <= distanceCovered) idx++;

            const p1 = routePath[idx];
            const p2 = routePath[idx + 1];
            const segmentDist = distances[idx + 1] - distances[idx];
            const ratio = segmentDist > 0 ? Math.max(0, Math.min(1, (distanceCovered - distances[idx]) / segmentDist)) : 0;

            const curLat = p1[0] + (p2[0] - p1[0]) * ratio;
            const curLng = p1[1] + (p2[1] - p1[1]) * ratio;
            const head = calculateBearing(p1[0], p1[1], p2[0], p2[1]);
            
            const now = Date.now();
            if (now - lastUpdateTime > 60) {
                const movedDist = calculateDistance(curLat, curLng, lastStatePointRef.current[0], lastStatePointRef.current[1]);
                if (movedDist > 2) {
                    setStartPoint([curLat, curLng]);
                    lastStatePointRef.current = [curLat, curLng];
                    setCurrentHeading(head);
                    setCurrentSpeed(SPEED_KMH); 
                    lastUpdateTime = now;
                }
            }

            syncMap(curLat, curLng, head, false, SPEED_KMH);
            checkLegProgress(curLat, curLng, SPEED_KMH);
            
            if (idx !== simIndexRef.current) {
                simIndexRef.current = idx;
                setCurrentPointIndex(idx);
                checkVoiceGuidance(curLat, curLng, idx, SPEED_KMH);
                calculateETA(idx, SPEED_KMH);
            }

            simIntervalRef.current = requestAnimationFrame(updateSimulation);
        };

        simIntervalRef.current = requestAnimationFrame(updateSimulation);
    }, [routePath, mapInstance, syncMap, setStartPoint, setCurrentHeading, setCurrentSpeed, checkVoiceGuidance, calculateETA, checkLegProgress, is3DRef, setIsNavigating, simIndexRef, setCurrentPointIndex, isWaitingRef, stopSimulation]);

    return { simulateNavigation, stopSimulation };
};
