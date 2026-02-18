import { useEffect } from 'react';
import { useMap } from 'react-leaflet';
import L from 'leaflet';

export function SearchPanner({ searchResult }) {
    const map = useMap();
    useEffect(() => {
        if (searchResult && searchResult.lat !== undefined && searchResult.lng !== undefined) {
            map.flyTo([searchResult.lat, searchResult.lng], 18, { hard: true });
        }
    }, [searchResult, map]);
    return null;
}

export function RouteFitter({ routePath, isNavigating, autoSnapPaused }) {
    const map = useMap();
    useEffect(() => {
        if (!isNavigating && !autoSnapPaused && routePath && routePath.length > 0) {
            const bounds = L.latLngBounds(routePath);
            map.fitBounds(bounds, { padding: [50, 50], hard: true });
        }
    }, [routePath, map, isNavigating, autoSnapPaused]);
    return null;
}

export function AutoLocator({ setPosition, updateName, maxZoom = 16 }) {
    const map = useMap();
    useEffect(() => {
        const onLocationFound = (e) => {
            if (setPosition) setPosition([e.latlng.lat, e.latlng.lng]);
            if (updateName) updateName('start', e.latlng.lat, e.latlng.lng);
            map.flyTo(e.latlng, maxZoom, { hard: true });
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


export function MapInstanceCapturer({ setMapInstance }) {
    const map = useMap();
    useEffect(() => {
        if (!map) return;
        if (setMapInstance) setMapInstance(map);
        return () => {
            if (setMapInstance) setMapInstance(null);
        };
    }, [map, setMapInstance]);
    return null;
}
