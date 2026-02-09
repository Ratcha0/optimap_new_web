import L from 'leaflet';
import { APP_THEME } from '../constants/visuals';
import { SEARCH_API } from '../constants/api';

export const formatTime = (seconds) => {
    const h = Math.floor(seconds / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    if (h > 0) return `${h} ชม. ${m} นาที`;
    return `${m} นาที`;
};

export const createNumberedIcon = (number, color = APP_THEME.EMERGENCY) => {
    const iconSize = 40;
    return L.divIcon({
        className: 'dest-marker-premium',
        html: `
            <div class="relative flex items-center justify-center" style="width: ${iconSize}px; height: ${iconSize}px;">
                <div class="w-8 h-8 rounded-full shadow-lg border-2 border-white flex items-center justify-center text-white text-[10px] font-black z-10" style="background: ${color};">
                    ${number}
                </div>
                <div class="absolute bottom-1 left-1/2 -translate-x-1/2 w-3 h-3 rotate-45 z-0" style="background: ${color};"></div>
            </div>
        `,
        iconSize: [iconSize, iconSize],
        iconAnchor: [iconSize / 2, iconSize],
        popupAnchor: [0, -iconSize],
    });
};

const geocodeCache = new Map();

const sleep = (ms) => new Promise(res => setTimeout(res, ms));

export const reverseGeocode = async (lat, lng) => {
    const cacheKey = `${lat.toFixed(5)},${lng.toFixed(5)}`;
    if (geocodeCache.has(cacheKey)) return geocodeCache.get(cacheKey);

    try {
        await sleep(1000);
        const res = await fetch(`${SEARCH_API.NOMINATIM}/reverse?format=json&lat=${lat}&lon=${lng}&accept-language=th`);
        if (!res.ok) throw new Error('Geocoding failed');
        const data = await res.json();
        const address = data.address ? (data.address.road || data.address.suburb || data.display_name.split(',')[0]) : `${lat.toFixed(6)}, ${lng.toFixed(6)}`;
        geocodeCache.set(cacheKey, address);
        return address;
    } catch (e) {
        console.warn('Geocoding error:', e);
        return `${lat.toFixed(6)}, ${lng.toFixed(6)}`;
    }
};

export const parseCoordinateUrl = (input) => {
    if (!input) return null;
    const queryMatch = input.match(/(?:q|destination)=([-+]?\d*\.?\d+),([-+]?\d*\.?\d+)/);
    if (queryMatch) {
        return { lat: parseFloat(queryMatch[1]), lng: parseFloat(queryMatch[2]) };
    }
    const coordMatch = input.match(/([-+]?\d+\.\d+)\s*,\s*([-+]?\d+\.\d+)/);
    if (coordMatch) {
        return { lat: parseFloat(coordMatch[1]), lng: parseFloat(coordMatch[2]) };
    }
    return null;
};
export const translateInstruction = (step) => {
    if (!step || !step.maneuver) return "ตรงไป";

    const type = step.maneuver.type;
    const modifier = step.maneuver.modifier;
    const road = step.name || "";

    const translations = {
        'turn': {
            'left': 'เลี้ยวซ้าย',
            'right': 'เลี้ยวขวา',
            'sharp left': 'เลี้ยวซ้ายหักศอก',
            'sharp right': 'เลี้ยวขวาหักศอก',
            'slight left': 'เบี่ยงซ้าย',
            'slight right': 'เบี่ยงขวา',
            'straight': 'ตรงไป',
            'uturn': 'กลับรถ'
        },
        'new name': 'มุ่งหน้าต่อไปยัง',
        'continue': 'มุ่งหน้าต่อไปบน',
        'depart': 'เริ่มเดินทาง',
        'arrive': 'ถึงจุดหมาย',
        'merge': 'เบี่ยงเข้าสู่',
        'ramp': 'ขึ้นทางลาด',
        'on ramp': 'ขึ้นทางลาด',
        'off ramp': 'ลงทางลาด',
        'fork': 'เบี่ยงออกที่ทางแยก',
        'roundabout': 'เข้าสู่ทางวงเวียน',
        'exit roundabout': 'ออกจากทางวงเวียน',
        'rotary': 'เข้าสู่ทางแยกวงเวียน',
        'exit rotary': 'ออกจากทางแยกวงเวียน',
        'roundabout turn': 'เลี้ยวที่วงเวียน',
        'notification': 'แจ้งเตือน',
        'end of road': 'สุดถนน'
    };

    let action = translations[type] || "ตรงไป";
    if (typeof action === 'object') {
        action = action[modifier] || "เลี้ยว";
    }

    if (road && road !== "") {
        return `${action} เข้าสู่ ${road}`;
    }
    return action;
};
