import { useRef, useEffect, useCallback } from 'react';

export const useMapSync = (mapInstance, is3D, isAutoSnapPaused) => {
    const pendingUpdateRef = useRef(null);
    const rafIdRef = useRef(null);
    const lastUpdateTimeRef = useRef(0);
    const lastMoveTimeRef = useRef(Date.now());
    const is3DRef = useRef(is3D);
    const isAutoSnapPausedRef = useRef(isAutoSnapPaused);
    const lastKnownSpeedRef = useRef(0);

    useEffect(() => {
        is3DRef.current = is3D;
    }, [is3D]);

    useEffect(() => {
        isAutoSnapPausedRef.current = isAutoSnapPaused;
    }, [isAutoSnapPaused]);

    const performMapUpdate = useCallback((lat, lng, heading, force, distToManeuver = Infinity) => {
        if (!mapInstance || !mapInstance.getContainer()) return;
        
        try {
            const currentZoom = mapInstance.getZoom();
            if (currentZoom === undefined) return;

            const speed = lastKnownSpeedRef.current || 0;
            
            let targetZoom = 19;
            if (speed > 110) targetZoom = 15.0;
            else if (speed > 90) targetZoom = 16.0;
            else if (speed > 70) targetZoom = 17.0;
            else if (speed > 50) targetZoom = 17.8;
            else if (speed > 30) targetZoom = 18.5;
            else if (speed > 10) targetZoom = 19.0;

            if (distToManeuver < 40) {
                targetZoom = Math.min(20, targetZoom + 1.2); 
            } else if (distToManeuver < 100) {
                targetZoom = Math.min(19.5, targetZoom + 0.6);
            }
            
            const smoothedZoom = force ? targetZoom : (currentZoom * 0.9 + targetZoom * 0.1); 

            const shouldUse3D = is3DRef.current;
            
            let targetPitch = shouldUse3D ? 65 : 0;
            if (shouldUse3D) {
                if (speed > 90) targetPitch = 35;
                else if (speed > 60) targetPitch = 45;
                else if (speed > 30) targetPitch = 55;
                
                if (distToManeuver < 60) targetPitch = 70;
            }

            const offsetY = shouldUse3D ? window.innerHeight * 0.22 : window.innerHeight * 0.15; 
            const centerOffset = [0, offsetY];

            const commonOptions = {
                center: mapInstance.isMapLibre ? [lng, lat] : [lat, lng],
                zoom: smoothedZoom,
                bearing: heading !== undefined ? (mapInstance.isMapLibre ? heading : (360 - heading)) : undefined,
                pitch: targetPitch,
                padding: { top: 0, bottom: 0, left: 0, right: 0 }, 
                offset: centerOffset
            };

            if (force) {
                mapInstance.flyTo({
                    ...commonOptions,
                    animate: true,
                    duration: 0.6,
                    essential: true
                });
            } else {
                const isHighFreq = speed > 2; 
                const smoothDuration = isHighFreq ? 1200 : 300; 
                
                mapInstance.easeTo({
                    ...commonOptions,
                    duration: smoothDuration,
                    easing: (t) => t 
                });
            }

        } catch (error) {
             console.error("syncMap error:", error);
        }
    }, [mapInstance]);

    const processMapUpdate = useCallback(() => {
        if (pendingUpdateRef.current) {
            const { lat, lng, heading, force, distToManeuver } = pendingUpdateRef.current;
            performMapUpdate(lat, lng, heading, force, distToManeuver);
            pendingUpdateRef.current = null;
        }
        rafIdRef.current = null;
    }, [performMapUpdate]);

    const syncMap = useCallback((lat, lng, heading, force = false, currentSpeed = null, distToManeuver = Infinity) => {
        if (!mapInstance) return;
        if (!force && isAutoSnapPausedRef.current) return;
        
        const now = Date.now();
        if (currentSpeed !== null) {
            lastKnownSpeedRef.current = currentSpeed;
            if (currentSpeed > 1.5) {
                lastMoveTimeRef.current = now;
            }
        }

        const isStationaryLong = now - lastMoveTimeRef.current > 60000;
        const minInterval = force ? 0 : (isStationaryLong ? 5000 : 20); 

        if (now - lastUpdateTimeRef.current < minInterval) {
             pendingUpdateRef.current = { lat, lng, heading, force, distToManeuver };
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
        
        performMapUpdate(lat, lng, heading, force, distToManeuver);
    }, [mapInstance, performMapUpdate, processMapUpdate]);

    return { syncMap };
};
