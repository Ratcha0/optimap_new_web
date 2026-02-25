export const SEARCH_API = {
    PHOTON: 'https://photon.komoot.io/api/',
    NOMINATIM: 'https://nominatim.openstreetmap.org',
    MAPTILER: 'https://api.maptiler.com/geocoding',
    MAPTILER_KEY: import.meta.env.VITE_MAPTILER_API_KEY || ''
};

export const ROUTING_API = {
    OSM_CAR: 'https://routing.openstreetmap.de/routed-car',
    OSRM_PRO: 'https://router.project-osrm.org'
};

export const EXTERNAL_LINKS = {
    GOOGLE_MAPS_BASE: 'https://www.google.com/maps?q=',
    GOOGLE_AUTH_ICON: 'https://www.gstatic.com/firebasejs/ui/2.0.0/images/auth/google.svg',
    DEFAULT_AVATAR: 'https://cdn-icons-png.flaticon.com/512/3135/3135715.png',
    VIOLET_MARKER: 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-violet.png',

   
    getGoogleMapsUrl: (lat, lng) => `https://www.google.com/maps/dir/?api=1&destination=${lat},${lng}`,

   
    getAppShareUrl: (lat, lng) => {
        const origin = window.location.origin;
        const pathname = window.location.pathname;
        return `${origin}${pathname}?share_lat=${lat}&share_lng=${lng}`;
    }
};

export const SUPABASE_CONFIG = {
    URL: import.meta.env.VITE_SUPABASE_URL,
    ANON_KEY: import.meta.env.VITE_SUPABASE_ANON_KEY
};
