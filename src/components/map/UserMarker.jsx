import { useState, useRef, useEffect, useMemo } from 'react';
import { Marker, useMap, Popup } from 'react-leaflet';
import L from 'leaflet';
import { APP_THEME } from '../../constants/visuals';

export default function UserMarker({ position, gpsHeading, speed, isCustomer = false, teammates = [] }) {
    const map = useMap();
    const [compassHeading, setCompassHeading] = useState(0);
    const [mapBearing, setMapBearing] = useState(0);

    useEffect(() => {
        const handleOrientation = (event) => {
            let compass = event.webkitCompassHeading;
            if (compass === undefined || compass === null) {
                if (event.alpha !== null) {
                    compass = (360 - event.alpha) % 360;
                }
            }
            if (compass !== undefined && compass !== null) {
                setCompassHeading(compass);
            }
        };

        if (window.DeviceOrientationEvent) {
            window.addEventListener('deviceorientation', handleOrientation);
        }
        return () => window.removeEventListener('deviceorientation', handleOrientation);
    }, []);

    useEffect(() => {
        if (!map) return;
        const onRotate = () => {
            if (typeof map.getBearing === 'function') {
                setMapBearing(map.getBearing() || 0);
            }
        };
        map.on('rotate', onRotate);
        if (typeof map.getBearing === 'function') {
            setMapBearing(map.getBearing() || 0);
        }
        return () => map.off('rotate', onRotate);
    }, [map]);

    const displayHeadingRaw = (speed > 1 && gpsHeading != null && !isNaN(gpsHeading)) ? gpsHeading : compassHeading;
    const displayHeading = (displayHeadingRaw + mapBearing + 360) % 360;
    const color = isCustomer ? APP_THEME.SECONDARY : '#2563EB';

    const icon = useMemo(() => {
        return L.divIcon({
            className: 'user-marker-premium',
            html: `
                <div class="relative w-[60px] h-[60px] flex items-center justify-center">
                    <div class="absolute w-full h-full rounded-full animate-ping opacity-20" 
                         style="background: ${color}; animation-duration: 2s;"></div>
                    <div class="absolute w-6 h-6 rounded-full border-4 border-white shadow-xl z-20" 
                         style="background: ${color};"></div>
                    <div class="absolute inset-0 flex items-center justify-center pointer-events-none" 
                         style="transform: rotate(${displayHeading}deg); transition: transform 0.2s cubic-bezier(0.4, 0, 0.2, 1);">
                        <div class="w-6 h-6 -translate-y-6">
                            <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" class="filter drop-shadow-md">
                                <path d="M12 2L22 22L12 18L2 22L12 2Z" fill="${color}" stroke="white" stroke-width="1.5" stroke-linejoin="round"/>
                            </svg>
                        </div>
                    </div>
                </div>
            `,
            iconSize: [60, 60],
            iconAnchor: [30, 30],
        });
    }, [displayHeading, color]);

    return (
        <Marker position={position} icon={icon} interactive={!isCustomer}>
            {!isCustomer && teammates.length > 0 && (
                <Popup className="rounded-3xl overflow-hidden shadow-2xl border-none">
                    <div className="p-4 min-w-[200px] bg-white text-gray-900">
                        <div className="text-[10px] font-black text-blue-500 uppercase tracking-widest mb-3">ทีมงานของคุณ</div>
                        <div className="space-y-2">
                            {teammates.map(member => (
                                <div key={member.id} className="flex items-center gap-3 p-2 bg-gray-50 rounded-xl">
                                    <img 
                                        src={member.avatar_url || `https://ui-avatars.com/api/?name=${member.full_name}&background=random`} 
                                        className="w-8 h-8 rounded-lg object-cover"
                                        alt=""
                                        onError={(e) => {
                                            e.target.src = `https://ui-avatars.com/api/?name=${member.full_name || 'T'}&background=random`;
                                        }}
                                    />
                                    <span className="text-sm font-bold text-gray-700">{member.full_name}</span>
                                </div>
                            ))}
                        </div>
                    </div>
                </Popup>
            )}
        </Marker>
    );
}
