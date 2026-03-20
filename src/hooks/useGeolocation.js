import { useState, useEffect, useRef } from 'react';

export const useGeolocation = (enabled = true) => {
    const [location, setLocation] = useState(null);
    const [heading, setHeading] = useState(0);
    const [speed, setSpeed] = useState(0);
    const [accuracy, setAccuracy] = useState(null);
    const [error, setError] = useState(null);
    const watchIdRef = useRef(null);

    const isMountedRef = useRef(true);
    const retryTimeoutRef = useRef(null);
    const retryCountRef = useRef(0);

    useEffect(() => {
        isMountedRef.current = true;
        if (!enabled || !("geolocation" in navigator)) return;

        const startWatching = () => {
            if (!isMountedRef.current) return;
            
           
            const useHighAccuracy = retryCountRef.current < 2;

            watchIdRef.current = navigator.geolocation.watchPosition(
                (pos) => {
                    const { latitude, longitude, heading: h, speed: s, accuracy: acc } = pos.coords;
                    setLocation([latitude, longitude]);
                    if (h !== null && !isNaN(h)) setHeading(h);
                    setSpeed(s || 0);
                    setAccuracy(acc);
                    setError(null);
                    retryCountRef.current = 0; 
                },
                (err) => {
                    setError(err.message);
                    
                  
                    if (err.code === 3) {
                        if (retryCountRef.current === 0) {
                            console.log("Geolocation: Initial timeout, retrying...");
                        }
                    } else {
                        console.warn(`Geolocation Error (${err.code}):`, err.message);
                    }
                    
                    if (enabled && isMountedRef.current) {
                        navigator.geolocation.clearWatch(watchIdRef.current);
                        retryCountRef.current++;
                        
                      
                        const delay = retryCountRef.current > 2 ? 5000 : 2000;
                        retryTimeoutRef.current = setTimeout(startWatching, delay);
                    }
                },
                {
                    enableHighAccuracy: useHighAccuracy,
                    timeout: 30000,
                    maximumAge: 0 
                }
            );
        };

        startWatching();

        return () => {
            isMountedRef.current = false;
            if (watchIdRef.current !== null) {
                navigator.geolocation.clearWatch(watchIdRef.current);
            }
            if (retryTimeoutRef.current) {
                clearTimeout(retryTimeoutRef.current);
            }
        };
    }, [enabled]);

    return { location, heading, speed, accuracy, error };
};
