import { useState, useEffect, useRef } from 'react';

export const useGeolocation = (enabled = true) => {
    const [location, setLocation] = useState(null);
    const [heading, setHeading] = useState(0);
    const [speed, setSpeed] = useState(0);
    const [accuracy, setAccuracy] = useState(null);
    const [error, setError] = useState(null);
    const watchIdRef = useRef(null);

    useEffect(() => {
        if (!enabled || !("geolocation" in navigator)) return;

        watchIdRef.current = navigator.geolocation.watchPosition(
            (pos) => {
                const { latitude, longitude, heading: h, speed: s, accuracy: acc } = pos.coords;
                setLocation([latitude, longitude]);
                if (h !== null && !isNaN(h)) setHeading(h);
                setSpeed(s || 0);
                setAccuracy(acc);
                setError(null);
            },
            (err) => {
                setError(err.message);
                console.warn("Geolocation Error:", err.message);
            },
            {
                enableHighAccuracy: true,
                timeout: 30000,
                maximumAge: 5000
            }
        );

        return () => {
            if (watchIdRef.current !== null) {
                navigator.geolocation.clearWatch(watchIdRef.current);
            }
        };
    }, [enabled]);

    return { location, heading, speed, accuracy, error };
};
