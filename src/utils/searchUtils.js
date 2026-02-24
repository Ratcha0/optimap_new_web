import { SEARCH_API } from '../constants/api';
import { calculateDistance } from './geoUtils';


export const formatMapTilerResult = (item, currentPosition) => {
    if (!item || !item.geometry) return null;
    const lat = item.geometry.coordinates[1];
    const lon = item.geometry.coordinates[0];
    
    let distNum = Infinity;
    if (currentPosition) {
        distNum = calculateDistance(currentPosition[0], currentPosition[1], lat, lon);
    }

    return {
        lat,
        lon,
        display_name: item.place_name_th || item.place_name || item.text_th || item.text || "ไม่ทราบชื่อสถานที่",
        distance: distNum,
        source: 'maptiler'
    };
};


export const formatPhotonResult = (f, currentPosition) => {
    if (!f || !f.properties || !f.geometry) return null;
    const p = f.properties;
    const mainName = p.name || p.street || p.housenumber || "";
    const subDetails = [p.city, p.district, p.state].filter(Boolean).join(', ');
    const fullName = mainName + (subDetails ? ` (${subDetails})` : "");
    const lat = f.geometry.coordinates[1];
    const lon = f.geometry.coordinates[0];

    let distNum = Infinity;
    if (currentPosition) {
        distNum = calculateDistance(currentPosition[0], currentPosition[1], lat, lon);
    }

    return {
        lat,
        lon,
        display_name: fullName || "ไม่ทราบชื่อสถานที่",
        distance: distNum,
        source: 'photon'
    };
};


export const formatNominatimResult = (item, currentPosition) => {
    if (!item || !item.lat || !item.lon) return null;
    const lat = parseFloat(item.lat);
    const lon = parseFloat(item.lon);

    let distNum = Infinity;
    if (currentPosition) {
        distNum = calculateDistance(currentPosition[0], currentPosition[1], lat, lon);
    }

    const addr = item.address || {};
    const main = addr.amenity || addr.building || addr.road || addr.suburb || addr.city || addr.state || item.display_name.split(',')[0];
    const subList = [addr.suburb, addr.city, addr.state].filter(s => s && s !== main).slice(0, 2);
    const display = main + (subList.length > 0 ? ` (${subList.join(', ')})` : "");

    return {
        lat,
        lon,
        display_name: display || "ไม่ทราบชื่อสถานที่",
        distance: distNum,
        source: 'nominatim'
    };
};


export const performPlaceSearch = async (query, currentPosition) => {
    if (!query || query.length < 2) return [];

    if (SEARCH_API.MAPTILER_KEY) {
        try {
            let maptilerUrl = `${SEARCH_API.MAPTILER}/${encodeURIComponent(query)}.json?key=${SEARCH_API.MAPTILER_KEY}&language=th&country=th&types=poi,address,place&fuzzyMatch=true&autocomplete=true&limit=10`;
            if (currentPosition) {
                maptilerUrl += `&proximity=${currentPosition[1]},${currentPosition[0]}`;
            }

            const response = await fetch(maptilerUrl);
            if (response.ok) {
                const data = await response.json();
                if (data && data.features && data.features.length > 0) {
                    let formattedResults = data.features.map(f => formatMapTilerResult(f, currentPosition)).filter(Boolean);
                    
                    if (currentPosition) {
                        formattedResults.sort((a, b) => a.distance - b.distance);
                    }
                    
                    return formattedResults;
                }
            }
        } catch (error) {
            console.warn("MapTiler search failed, falling back to Photon:", error);
        }
    }

  
    try {
        let url = `${SEARCH_API.PHOTON}?q=${encodeURIComponent(query)}&limit=10`;
        if (currentPosition) {
            url += `&lat=${currentPosition[0]}&lon=${currentPosition[1]}`;
        }

        const response = await fetch(url);
        if (response.ok) {
            const data = await response.json();
            if (data && data.features && data.features.length > 0) {
                let formattedResults = data.features.map(f => formatPhotonResult(f, currentPosition)).filter(Boolean);
                if (currentPosition) {
                    formattedResults.sort((a, b) => a.distance - b.distance);
                }
                return formattedResults;
            }
        }
    } catch (error) {
        console.warn("Photon search failed:", error);
    }


    try {
        let nominatimUrl = `${SEARCH_API.NOMINATIM}/search?format=json&q=${encodeURIComponent(query)}&addressdetails=1&limit=15&countrycodes=th&accept-language=th`;
        if (currentPosition) {
            const lat = currentPosition[0];
            const lon = currentPosition[1];
            const offset = 0.5;
            const viewbox = `${lon - offset},${lat + offset},${lon + offset},${lat - offset}`;
            nominatimUrl += `&viewbox=${viewbox}&lat=${lat}&lon=${lon}`;
        }

        const response = await fetch(nominatimUrl, {
            headers: { 'Accept-Language': 'th,en;q=0.9', 'User-Agent': 'OptiMap-App' }
        });

        if (response.ok) {
            const data = await response.json();
            if (data && data.length > 0) {
                let formattedResults = data.map(i => formatNominatimResult(i, currentPosition)).filter(Boolean);
                if (currentPosition) {
                    formattedResults.sort((a, b) => a.distance - b.distance);
                }
                return formattedResults;
            }
        }
    } catch (error) {}

    return [];
};
