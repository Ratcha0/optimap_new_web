import { useEffect } from 'react';

export const useTechnicianPersistence = ({
    startPoint,
    waypoints,
    locationNames,
    travelMode,
    tripType,
    completedWaypoints,
    currentLegIndex,
    navActive,
    isImmersive,
    currentPointIndex
}) => {
   
    useEffect(() => {
        if (startPoint) localStorage.setItem('tech_start_point', JSON.stringify(startPoint));
    }, [startPoint]);

    useEffect(() => {
        localStorage.setItem('tech_waypoints', JSON.stringify(waypoints));
    }, [waypoints]);

    useEffect(() => {
        localStorage.setItem('tech_location_names', JSON.stringify(locationNames));
    }, [locationNames]);

    
    useEffect(() => {
        localStorage.setItem('tech_travel_mode', travelMode);
    }, [travelMode]);

    useEffect(() => {
        localStorage.setItem('tech_trip_type', tripType);
    }, [tripType]);

    
    useEffect(() => {
        localStorage.setItem('tech_completed_wps', JSON.stringify([...completedWaypoints]));
    }, [completedWaypoints]);

    useEffect(() => {
        localStorage.setItem('tech_current_leg', currentLegIndex.toString());
    }, [currentLegIndex]);

    useEffect(() => {
        if (currentPointIndex !== undefined) {
            localStorage.setItem('tech_current_pt_idx', currentPointIndex.toString());
        }
    }, [currentPointIndex]);

   
    useEffect(() => {
        localStorage.setItem('tech_is_navigating', navActive.toString());
    }, [navActive]);

    useEffect(() => {
        localStorage.setItem('tech_is_immersive', isImmersive.toString());
    }, [isImmersive]);

    const clearPersistence = () => {
        localStorage.removeItem('tech_waypoints');
        localStorage.removeItem('tech_completed_wps');
        localStorage.removeItem('tech_current_leg');
        localStorage.removeItem('tech_current_pt_idx');
        localStorage.removeItem('tech_is_navigating');
        localStorage.removeItem('tech_is_immersive');
    };

    return { clearPersistence };
};
