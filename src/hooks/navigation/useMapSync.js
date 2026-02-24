import { useRef, useEffect } from 'react';

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

    const performMapUpdate = (lat, lng, heading, force, distToManeuver = Infinity) => {
        if (!mapInstance || !mapInstance.getContainer()) return;
        
        try {
            const currentZoom = mapInstance.getZoom();
            if (currentZoom === undefined) return;

            const speed = lastKnownSpeedRef.current || 0;
            let idealZoom = 19;
            
            if (speed > 22.2) idealZoom = 17.2;
            else if (speed > 13.8) idealZoom = 17.8;
            else if (speed > 8.3) idealZoom = 18.3;
            else if (speed > 1.3) idealZoom = 18.8;

            if (distToManeuver < 50) {
                idealZoom = 19.5; 
            } else if (distToManeuver < 150) {
                idealZoom = Math.max(idealZoom, 18.8);
            }
            
            const targetZoom = force ? idealZoom : (currentZoom * 0.9 + idealZoom * 0.1); 

            const shouldUse3D = is3DRef.current;
            
            let idealPitch = shouldUse3D ? 60 : 0;
            if (shouldUse3D && speed > 16.6) { // > 60 km/h
                idealPitch = 45; 
            }

            const offsetY = shouldUse3D ? window.innerHeight * 0.25 : window.innerHeight * 0.2; 
            const centerOffset = [0, offsetY];

            const commonOptions = {
                center: mapInstance.isMapLibre ? [lng, lat] : [lat, lng],
                zoom: targetZoom,
                bearing: heading !== undefined ? (mapInstance.isMapLibre ? heading : (360 - heading)) : undefined,
                pitch: idealPitch,
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
                // Adaptive duration: Longer for regular GPS updates to create 'continuous' feel
                const isHighFreq = speed > 1; // Basic detection
                const smoothDuration = isHighFreq ? 950 : 50; 
                
                mapInstance.easeTo({
                    ...commonOptions,
                    duration: smoothDuration,
                    easing: (t) => t // Linear for path following
                });
            }

        } catch (error) {
             if (error.message && error.message.includes('_leaflet_pos')) return;
             console.error("syncMap error:", error);
        }
    };

    const processMapUpdate = () => {
        if (pendingUpdateRef.current) {
            const { lat, lng, heading, force, distToManeuver } = pendingUpdateRef.current;
            performMapUpdate(lat, lng, heading, force, distToManeuver);
            pendingUpdateRef.current = null;
        }
        rafIdRef.current = null;
    };

    const syncMap = (lat, lng, heading, force = false, currentSpeed = null, distToManeuver = Infinity) => {
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
    };

    return { syncMap };
};
