import { useEffect } from 'react';
import { useMap } from 'react-leaflet';
import L from 'leaflet';

// 1. ตัวเลื่อนแผนที่ไปหาจุดที่ค้นหา
export function SearchPanner({ searchResult }) {
    const map = useMap();
    useEffect(() => {
        if (searchResult && searchResult.lat !== undefined && searchResult.lng !== undefined) {
            map.flyTo([searchResult.lat, searchResult.lng], 18);
        }
    }, [searchResult, map]);
    return null;
}

// 2. ตัวปรับขอบเขตแผนที่ให้เห็นเส้นทางทั้งหมด
export function RouteFitter({ routePath, isNavigating }) {
    const map = useMap();
    useEffect(() => {
        if (!isNavigating && routePath && routePath.length > 0) {
            const bounds = L.latLngBounds(routePath);
            map.fitBounds(bounds, { padding: [50, 50] });
        }
    }, [routePath, map, isNavigating]);
    return null;
}

// 3. ตัวระบุตำแหน่งปัจจุบัน (แบบพื้นฐาน)
export function AutoLocator({ setPosition, updateName, maxZoom = 16 }) {
    const map = useMap();
    useEffect(() => {
        const onLocationFound = (e) => {
            if (setPosition) setPosition([e.latlng.lat, e.latlng.lng]);
            if (updateName) updateName('start', e.latlng.lat, e.latlng.lng);
            map.flyTo(e.latlng, maxZoom);
        };
        map.on("locationfound", onLocationFound);
        map.locate({ setView: false, maxZoom });
        return () => {
            map.off("locationfound", onLocationFound);
            map.stopLocate();
        };
    }, [map, setPosition, updateName, maxZoom]);
    return null;
}

// 4. ตัวบันทึก Instance ของ Map (สำหรับเรียกใช้ API พิเศษ)
export function MapInstanceCapturer({ setMapInstance }) {
    const map = useMap();
    useEffect(() => {
        if (setMapInstance) setMapInstance(map);
        return () => setMapInstance && setMapInstance(null);
    }, [map, setMapInstance]);
    return null;
}
