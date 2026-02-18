import { useEffect } from 'react';
import { useMap } from 'react-leaflet';

export default function MapRecenter({ target, isNavigating }) {
    const map = useMap();
    useEffect(() => {
        // เมื่ออยู่ในโหมดนำทาง ให้ตัวระบบนำทาง (useNavigation) เป็นคนคุมกล้องเจ้าเดียว
        // เพื่อป้องกันการสั่งการซ้ำซ้อนจนกล้องกระโดด
        if (target && target.coords && !isNavigating) {
            const zoom = target.zoom || 18;
            map.setView(target.coords, zoom, { animate: true, duration: 1.0 });
        }
    }, [target, map, isNavigating]);
    return null;
}
