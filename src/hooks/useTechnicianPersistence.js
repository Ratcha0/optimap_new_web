import { useEffect } from 'react';

export const PERSISTENCE_KEYS = {
    START_POINT: 'tech_start_point',
    WAYPOINTS: 'tech_waypoints',
    LOCATION_NAMES: 'tech_location_names',
    TRIP_TYPE: 'tech_trip_type',
    COMPLETED_WPS: 'tech_completed_wps',
    CURRENT_LEG: 'tech_current_leg',
    CURRENT_PT_IDX: 'tech_current_pt_idx',
    IS_NAVIGATING: 'tech_is_navigating',
    IS_IMMERSIVE: 'tech_is_immersive',
    ORIGINAL_START: 'tech_original_start',
    STORAGE_VERSION: 'tech_storage_version'
};

export const useTechnicianPersistence = ({
    startPoint,
    waypoints,
    locationNames,
    tripType,
    completedWaypoints,
    currentLegIndex,
    navActive,
    isImmersive,
    currentPointIndex,
    originalStart
}) => {
    
    useEffect(() => {
        if (startPoint) localStorage.setItem(PERSISTENCE_KEYS.START_POINT, JSON.stringify(startPoint));
        localStorage.setItem(PERSISTENCE_KEYS.WAYPOINTS, JSON.stringify(waypoints));
        localStorage.setItem(PERSISTENCE_KEYS.LOCATION_NAMES, JSON.stringify(locationNames));
    }, [startPoint, waypoints, locationNames]);

    useEffect(() => {
        localStorage.setItem(PERSISTENCE_KEYS.TRIP_TYPE, tripType);
    }, [tripType]);

    useEffect(() => {
        localStorage.setItem(PERSISTENCE_KEYS.COMPLETED_WPS, JSON.stringify([...completedWaypoints]));
    }, [completedWaypoints]);

    useEffect(() => {
        localStorage.setItem(PERSISTENCE_KEYS.CURRENT_LEG, currentLegIndex.toString());
        if (currentPointIndex !== undefined) {
            localStorage.setItem(PERSISTENCE_KEYS.CURRENT_PT_IDX, currentPointIndex.toString());
        }
    }, [currentLegIndex, currentPointIndex]);

    useEffect(() => {
        localStorage.setItem(PERSISTENCE_KEYS.IS_NAVIGATING, navActive.toString());
        localStorage.setItem(PERSISTENCE_KEYS.IS_IMMERSIVE, isImmersive.toString());
        if (originalStart) {
            localStorage.setItem(PERSISTENCE_KEYS.ORIGINAL_START, JSON.stringify(originalStart));
        } else {
            localStorage.removeItem(PERSISTENCE_KEYS.ORIGINAL_START);
        }
    }, [navActive, isImmersive, originalStart]);

    const clearPersistence = () => {
        const keysToClear = [
            PERSISTENCE_KEYS.WAYPOINTS,
            PERSISTENCE_KEYS.COMPLETED_WPS,
            PERSISTENCE_KEYS.CURRENT_LEG,
            PERSISTENCE_KEYS.CURRENT_PT_IDX,
            PERSISTENCE_KEYS.IS_NAVIGATING,
            PERSISTENCE_KEYS.IS_IMMERSIVE,
            PERSISTENCE_KEYS.ORIGINAL_START
        ];
        keysToClear.forEach(k => localStorage.removeItem(k));
    };

    return { clearPersistence };
};
