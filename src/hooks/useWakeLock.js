import { useEffect, useRef } from 'react';

export const useWakeLock = (active = false) => {
    const wakeLockRef = useRef(null);

    useEffect(() => {
        if (!active) {

            if (wakeLockRef.current) {
                wakeLockRef.current.release().catch(() => { });
                wakeLockRef.current = null;
            }
            return;
        }

        const requestWakeLock = async () => {
            try {
                if ('wakeLock' in navigator) {
                    wakeLockRef.current = await navigator.wakeLock.request('screen');

                    document.addEventListener('visibilitychange', handleVisibilityChange);
                }
            } catch (err) {
                
            }
        };

        const handleVisibilityChange = async () => {
            if (wakeLockRef.current !== null && document.visibilityState === 'visible') {
                try {
                    wakeLockRef.current = await navigator.wakeLock.request('screen');
                } catch (e) { }
            }
        };

        requestWakeLock();

        return () => {
            document.removeEventListener('visibilitychange', handleVisibilityChange);
            if (wakeLockRef.current) {
                wakeLockRef.current.release().catch(() => { });
                wakeLockRef.current = null;
            }
        };
    }, [active]);
};
