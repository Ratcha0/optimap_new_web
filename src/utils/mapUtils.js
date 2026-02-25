import { SEARCH_API } from '../constants/api';

export const formatTime = (seconds) => {
    const h = Math.floor(seconds / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    if (h > 0) return `${h} ชม. ${m} นาที`;
    return `${m} นาที`;
};

const geocodeCache = (function() {
    try {
        const saved = sessionStorage.getItem('optimap_geocode_cache');
        return saved ? new Map(JSON.parse(saved)) : new Map();
    } catch(e) { return new Map(); }
})();

function saveGeocodeCache() {
    try {
        const entries = Array.from(geocodeCache.entries()).slice(-100); 
        sessionStorage.setItem('optimap_geocode_cache', JSON.stringify(entries));
    } catch(e) {}
}

let sessionRequestCount = 0;
let lastRequestTime = 0;
let isServiceBlocked = false;
const SESSION_LIMIT = 50;

export const reverseGeocode = async (lat, lng) => {
    const cacheKey = `${lat.toFixed(5)},${lng.toFixed(5)}`;
    if (geocodeCache.has(cacheKey)) return geocodeCache.get(cacheKey);

    const now = Date.now();

    if (isServiceBlocked || now - lastRequestTime < 2000 || sessionRequestCount >= SESSION_LIMIT) {
        return `${lat.toFixed(6)}, ${lng.toFixed(6)}`;
    }

    try {
        lastRequestTime = now;
        sessionRequestCount++;
        
        const res = await fetch(`${SEARCH_API.NOMINATIM}/reverse?format=json&lat=${lat}&lon=${lng}&accept-language=th`);
        if (res.status === 403 || res.status === 429) {
            isServiceBlocked = true;
            return `${lat.toFixed(6)}, ${lng.toFixed(6)}`;
        }
        if (!res.ok) throw new Error('Geocoding failed');
        const data = await res.json();
        const address = data.address ? (data.address.road || data.address.suburb || data.address.village || data.display_name.split(',')[0]) : `${lat.toFixed(6)}, ${lng.toFixed(6)}`;
        
        geocodeCache.set(cacheKey, address);
        saveGeocodeCache();
        
        return address;
    } catch (e) {
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
    const intersections = step.intersections || [];
    
    let laneAdvice = "";
    if (intersections.length > 0 && intersections[0].lanes) {
        const lanes = intersections[0].lanes;
        const validLanes = lanes.map((l, i) => l.valid ? i + 1 : null).filter(l => l !== null);
        
        if (validLanes.length > 0 && validLanes.length < lanes.length) {
            if (validLanes.includes(1) && !validLanes.includes(lanes.length)) {
                laneAdvice = "ชิดซ้าย ";
            } else if (validLanes.includes(lanes.length) && !validLanes.includes(1)) {
                laneAdvice = "ชิดขวา ";
            } else {
                laneAdvice = "ใช้เลนกลาง ";
            }
        }
    }

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

    if (type === 'roundabout' || type === 'rotary') {
        const exit = step.maneuver.exit || 1;
        action = `${action} และใช้ทางออกที่ ${exit}`;
    }

    let finalInstruction = `${laneAdvice}${action}`;
    if (road && road !== "") {
        finalInstruction += ` เข้าสู่ ${road}`;
    }
    
    return finalInstruction;
};
