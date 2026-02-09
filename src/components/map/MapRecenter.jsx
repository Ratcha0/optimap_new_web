import { useEffect } from 'react';
import { useMap } from 'react-leaflet';

export default function MapRecenter({ target, isNavigating }) {
    const map = useMap();
    useEffect(() => {
        if (target && target.coords) {
            const zoom = target.zoom || 20;
            if (isNavigating) {
                map.setView(target.coords, zoom, { animate: false });
            } else {
                map.setView(target.coords, zoom, { animate: true, duration: 1.0 });
            }
        }
    }, [target, map, isNavigating]);
    return null;
}
