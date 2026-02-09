import React, { useState, useEffect } from 'react';
import { calculateDistance } from '../../utils/geoUtils';
import { SEARCH_API } from '../../constants/api';

export default function SearchControl({ onResultSelect, currentPosition }) {
    const [query, setQuery] = useState('');
    const [results, setResults] = useState([]);
    const [isSearching, setIsSearching] = useState(false);

    const formatPhotonResult = (f) => {
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
            distance: distNum
        };
    };

    const formatNominatimResult = (item) => {
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
            distance: distNum
        };
    };

    const handleSearch = async (manualQuery = null) => {
        const q = manualQuery || query;
        if (!q || q.length < 2) return;
        setIsSearching(true);

        if (q.includes('destination=')) {
            try {
                const parts = q.split('destination=')[1].split('&')[0].split(',');
                if (parts.length >= 2) {
                    const lat = parseFloat(parts[0]);
                    const lon = parseFloat(parts[1]);
                    if (!isNaN(lat) && !isNaN(lon)) {
                        setResults([{ lat, lon, display_name: "📍 ตำแหน่งจากลิงค์ URL", distance: 0 }]);
                        setIsSearching(false);
                        return;
                    }
                }
            } catch (e) {
                console.error(e);
            }
        }

        if (q.match(/^-?\d+(\.\d+)?,\s*-?\d+(\.\d+)?$/)) {
            const parts = q.split(',');
            const lat = parseFloat(parts[0]);
            const lon = parseFloat(parts[1]);
            setResults([{ lat, lon, display_name: `📍 พิกัด: ${lat}, ${lon}`, distance: 0 }]);
            setIsSearching(false);
            return;
        }

        try {
            let url = `${SEARCH_API.PHOTON}?q=${encodeURIComponent(q)}&lang=th&limit=10`;
            if (currentPosition) {
                url += `&lat=${currentPosition[0]}&lon=${currentPosition[1]}`;
            }

            const response = await fetch(url);
            if (response.ok) {
                const data = await response.json();
                if (data && data.features && data.features.length > 0) {
                    let formattedResults = data.features.map(formatPhotonResult).filter(Boolean);
                    if (currentPosition) {
                        formattedResults.sort((a, b) => a.distance - b.distance);
                    }
                    setResults(formattedResults);
                    setIsSearching(false);
                    return;
                }
            }
        } catch (error) {
            console.warn("Photon search failing, trying fallback...", error);
        }

        try {
            let nominatimUrl = `${SEARCH_API.NOMINATIM}/search?format=json&q=${encodeURIComponent(q)}&addressdetails=1&limit=15&countrycodes=th&accept-language=th`;

            if (currentPosition) {

                const lat = currentPosition[0];
                const lon = currentPosition[1];
                const offset = 0.5;
                const viewbox = `${lon - offset},${lat + offset},${lon + offset},${lat - offset}`;
                nominatimUrl += `&viewbox=${viewbox}&lat=${lat}&lon=${lon}`;
            }

            const response = await fetch(nominatimUrl, {
                headers: {
                    'Accept-Language': 'th,en;q=0.9',
                    'User-Agent': 'OptiMap-App'
                }
            });

            if (response.ok) {
                const data = await response.json();
                if (data && data.length > 0) {
                    let formattedResults = data.map(formatNominatimResult).filter(Boolean);
                    if (currentPosition) {
                        formattedResults.sort((a, b) => a.distance - b.distance);
                    }
                    setResults(formattedResults);
                    setIsSearching(false);
                    return;
                }
            }
        } catch (error) {
            console.error("Nominatim fallback search error:", error);
        }

        setResults([]);
        setIsSearching(false);
    };

    useEffect(() => {
        if (!query.trim()) {
            setResults([]);
            return;
        }
        const timer = setTimeout(() => {
            if (query.length >= 2) {
                handleSearch();
            }
        }, 300);
        return () => clearTimeout(timer);
    }, [query]);

    return (
        <div className="w-[95%] sm:w-full sm:max-w-[1000px] relative z-[1000] flex flex-col gap-2">
            <div className="flex bg-white rounded-2xl sm:rounded-3xl border border-gray-100 shadow-xl overflow-hidden group focus-within:ring-2 focus-within:ring-blue-500/20 transition-all">
                <div className="relative flex-grow flex items-center">
                    <div className="pl-3 sm:pl-4 text-gray-400">
                        <svg className="w-4 h-4 sm:w-5 sm:h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                        </svg>
                    </div>
                    <input
                        type="text"
                        value={query}
                        onChange={(e) => setQuery(e.target.value)}
                        placeholder="ค้นหาสถานที่...."
                        className="w-full bg-transparent border-none outline-none py-2.5 sm:py-4 px-2 sm:px-3 text-gray-900 placeholder-gray-400 text-[11px] sm:text-sm font-bold"
                    />
                    {query && (
                        <button
                            onClick={() => { setQuery(''); setResults([]); }}
                            className="p-1.5 sm:p-2 mr-1 text-gray-400 hover:text-gray-600 transition-colors"
                        >
                            <svg className="w-4 h-4 sm:w-5 sm:h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M6 18L18 6M6 6l12 12" />
                            </svg>
                        </button>
                    )}
                </div>
                {isSearching && (
                    <div className="pr-4 flex items-center">
                        <div className="w-4 h-4 border-2 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
                    </div>
                )}
            </div>

            {results.length > 0 && (
                <div className="bg-white rounded-2xl border border-gray-100 shadow-2xl overflow-hidden max-h-[60vh] overflow-y-auto animate-in fade-in slide-in-from-top-2 duration-300">
                    {results.map((item, index) => (
                        <button
                            key={index}
                            onClick={() => {
                                onResultSelect({ lat: item.lat, lng: item.lon, name: item.display_name });
                                setResults([]);
                                setQuery('');
                            }}
                            className="w-full flex items-center gap-3 sm:gap-4 px-3 sm:px-5 py-3 sm:py-4 border-b border-gray-50 hover:bg-gray-50 transition-colors text-left active:bg-blue-50"
                        >
                            <div className="p-1.5 sm:p-2 bg-blue-50 rounded-lg sm:rounded-xl text-blue-500 shrink-0">
                                <svg className="w-4 h-4 sm:w-5 sm:h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                                </svg>
                            </div>
                            <div className="flex-grow min-w-0">
                                <div className="text-xs sm:text-sm font-black text-gray-900 leading-tight mb-0.5 truncate">
                                    {item.display_name.split(' (')[0]}
                                </div>
                                <div className="text-[9px] sm:text-[10px] text-gray-500 font-bold uppercase tracking-wider flex items-center gap-1.5 sm:gap-2">
                                    {item.display_name.includes(' (') && (
                                        <span className="truncate max-w-[120px] sm:max-w-[150px]">
                                            {item.display_name.split(' (')[1].replace(')', '')}
                                        </span>
                                    )}
                                    {item.distance !== Infinity && (
                                        <span className="text-blue-600 font-black shrink-0">
                                            • {(item.distance / 1000).toFixed(1)} km
                                        </span>
                                    )}
                                </div>
                            </div>
                        </button>
                    ))}
                </div>
            )}
        </div>
    );
}
