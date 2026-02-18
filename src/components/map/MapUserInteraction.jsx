import { useMapEvents } from 'react-leaflet';
import React from 'react';

export default function MapUserInteraction({ activeSelection, onLocationSelect, setSearchResult, onMapInteract }) {
    useMapEvents({
        click(e) {
            if (e.originalEvent.target.closest('button') ||
                e.originalEvent.target.closest('input') ||
                e.originalEvent.target.closest('.leaflet-popup-content-wrapper') ||
                e.originalEvent.target.closest('.leaflet-control')) return;

            if (activeSelection) {
                const type = typeof activeSelection === 'object' ? activeSelection.type : activeSelection;
                onLocationSelect(type, [e.latlng.lat, e.latlng.lng]);
            } else if (setSearchResult) {
                setSearchResult({
                    lat: e.latlng.lat,
                    lng: e.latlng.lng,
                    name: `${e.latlng.lat.toFixed(6)}, ${e.latlng.lng.toFixed(6)}`
                });
            }
        },
        dragstart: () => onMapInteract?.('start'),
        rotatestart: () => onMapInteract?.('start'),
        zoomstart: (e) => {
           
            if (e.originalEvent) onMapInteract?.('start');
        }
    });
    return null;
}
