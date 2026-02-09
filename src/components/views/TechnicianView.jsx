import React, { useState, useRef, useEffect, useCallback } from 'react';
import { supabase } from '../../utils/supabaseClient';
import { useWakeLock } from '../../hooks/useWakeLock';
import { useNavigation } from '../../hooks/useNavigation';
import { useFavorites } from '../../hooks/useFavorites';
import { useRouting } from '../../hooks/useRouting';
import { useTechnicianData } from '../../hooks/useTechnicianData';
import { reverseGeocode, parseCoordinateUrl } from '../../utils/mapUtils';
import { speak } from '../../utils/voiceUtils';
import { MAP_CONFIG } from '../../constants/visuals';
import { calculateDistance, calculateRemainingDistance } from '../../utils/geoUtils';
import { formatTime } from '../../utils/mapUtils';
import NavigationOverlay from './technician/NavigationOverlay';
import ControlPanel from './technician/ControlPanel';
import SearchControl from '../map/SearchControl';
import UrlInputModal from '../modals/UrlInputModal';
import MapSelectionOverlay from '../ui/MapSelectionOverlay';
import UserProfile from '../modals/UserProfile';
import JobListView from './technician/JobListView';
import { useToast } from '../ui/ToastNotification';
import TechnicianHeader from './technician/TechnicianHeader';
import TechnicianMap from './technician/TechnicianMap';
import ArrivalOverlay from './technician/ArrivalOverlay';
import AuthModal from '../modals/AuthModal';

export default function TechnicianView({ user, userProfile, sharedLocation }) {

    const [startPoint, setStartPoint] = useState(null);
    const [mapInstance, setMapInstance] = useState(null);

    useEffect(() => {
        if (sharedLocation && mapInstance) {
            if (sharedLocation.isMulti) {
                setWaypoints(sharedLocation.coords);
                mapInstance.fitBounds(sharedLocation.coords);
            } else {
                const { lat, lng } = sharedLocation;
                setStartPoint([lat, lng]);
                mapInstance.setView([lat, lng], 16);
            }
        }
    }, [sharedLocation, mapInstance]);
    const [currentHeading, setCurrentHeading] = useState(0);
    const [waypoints, setWaypoints] = useState([null]);
    const [locationNames, setLocationNames] = useState({});
    const [activeSelection, setActiveSelection] = useState(null);
    const [searchResult, setSearchResult] = useState(null);
    const [activeMenu, setActiveMenu] = useState(null);
    const [urlModalOpen, setUrlModalOpen] = useState(false);
    const [authModalOpen, setAuthModalOpen] = useState(false);
    const [profileModalOpen, setProfileModalOpen] = useState(false);
    const [urlModalTarget, setUrlModalTarget] = useState({ type: null, idx: null });
    const [viewTarget, setViewTarget] = useState(null);
    const [currentLegIndex, setCurrentLegIndex] = useState(0);
    const [currentInstruction, setCurrentInstruction] = useState("");
    const [tripType, setTripType] = useState('oneway');
    const [completedWaypoints, setCompletedWaypoints] = useState(new Set());
    const [rerouteTrigger, setRerouteTrigger] = useState(0);
    const [autoSnapPaused, setAutoSnapPaused] = useState(false);
    const [isImmersive, setIsImmersive] = useState(false);
    const [travelMode, setTravelMode] = useState('driving');
    const [currentSpeed, setCurrentSpeed] = useState(0);
    const [originalStart, setOriginalStart] = useState(null);
    const [viewMode, setViewMode] = useState('map');
    const [otherTechs, setOtherTechs] = useState([]);
    const { showToast } = useToast();
    const { favorites, addFavorite, isFavorite } = useFavorites();
    const {
        pendingJobsCount,
        unreadMessagesCount,
        setUnreadMessagesCount,
        syncPosition
    } = useTechnicianData(user);

    const startPointRef = useRef(startPoint);
    useEffect(() => { startPointRef.current = startPoint; }, [startPoint]);



    const [navActive, setNavActive] = useState(false);
    const {
        routeLegs, routePath, segments, distance, totalDuration, navigationSteps,
        visitOrder, legTargetIndices, clearRoute
    } = useRouting({
        startPoint, waypoints, locationNames, travelMode, tripType, isNavigating: navActive,
        rerouteTrigger, setRerouteTrigger, completedWaypoints, originalStart, currentLegIndex
    });

    const handleReroute = useCallback((newLat, newLng) => {
        clearRoute();
        setStartPoint([newLat, newLng]);
        setCurrentLegIndex(0);
        speak("กำลังคำนวณเส้นทางใหม่ค่ะ");
        setRerouteTrigger(prev => prev + 1);
    }, [speak, clearRoute]);

    const handleLegComplete = useCallback((navLegIndex) => {
        const waypointIndexToMark = legTargetIndices[navLegIndex];
        if (waypointIndexToMark !== undefined && waypointIndexToMark >= 0) {
            setCompletedWaypoints(prev => {
                const newSet = new Set(prev);
                newSet.add(waypointIndexToMark);
                return newSet;
            });
        }
    }, [legTargetIndices]);

    const nav = useNavigation({
        routePath, routeLegs, navigationSteps, speak, setStartPoint, setCurrentSpeed,
        setCurrentHeading, setLocationNames, onReroute: handleReroute,
        setCurrentInstruction, mapInstance, isAutoSnapPaused: autoSnapPaused,
        setCurrentLegIndex, waypoints, onLegComplete: handleLegComplete
    });

    const {
        isNavigating,
        startNavigation: hookStartNav,
        simulateNavigation: hookSimNav,
        stopNavigation: hookStopNav,
        currentPointIndex,
        isWaitingForContinue,
        continueNavigation
    } = nav;

    useEffect(() => { setNavActive(isNavigating); }, [isNavigating]);
    useWakeLock(isNavigating);
    const [liveDistance, setLiveDistance] = useState(null);
    const [liveDuration, setLiveDuration] = useState(null);

    useEffect(() => {
        if (!isNavigating) {
            setLiveDistance(distance);
            setLiveDuration(totalDuration);
            return;
        }

        const remainingMeters = calculateRemainingDistance(routePath, currentPointIndex);
        setLiveDistance((remainingMeters / 1000).toFixed(2));
        const adjustTime = (sec) => travelMode === 'motorbike' ? sec * 0.7 : sec;
        const estimatedSeconds = remainingMeters / 11.1;
        setLiveDuration(formatTime(adjustTime(estimatedSeconds)));
    }, [isNavigating, distance, totalDuration, routePath, currentPointIndex, travelMode]);

    const fetchOtherTechs = useCallback(async () => {
        if (!user) {
            setOtherTechs([]);
            return;
        }

        const tenMinutesAgo = new Date(Date.now() - 10 * 60 * 1000).toISOString();

        const { data } = await supabase
            .from('profiles')
            .select('id, full_name, last_lat, last_lng, avatar_url, role, last_updated, phone, team_name, car_reg')
            .eq('role', 'technician')
            .neq('id', user.id)
            .not('last_lat', 'is', null)
            .gte('last_updated', tenMinutesAgo)
            .limit(20);

        setOtherTechs(data || []);
    }, [user]);

    useEffect(() => {
        fetchOtherTechs();
        const interval = setInterval(fetchOtherTechs, 5000);
        return () => clearInterval(interval);
    }, [fetchOtherTechs]);


    useEffect(() => {
        if (!user || isNavigating) return;

        const watchId = navigator.geolocation.watchPosition(
            (pos) => {
                const { latitude, longitude, heading, speed } = pos.coords;
                setStartPoint([latitude, longitude]);
                if (heading !== null && !isNaN(heading)) setCurrentHeading(heading);
                setCurrentSpeed(speed || 0);
            },
            (err) => console.debug("GPS Watch error:", err),
            { enableHighAccuracy: true, timeout: 5000, maximumAge: 0 }
        );

        return () => navigator.geolocation.clearWatch(watchId);
    }, [user, isNavigating]);

    // Auto-clear route when arriving at destination (within 20 meters) - Consistent with Customer View
    useEffect(() => {
        if (!isNavigating && startPoint && waypoints.length > 0 && waypoints[0]) {
            const dest = waypoints[0];
            const dist = calculateDistance(startPoint[0], startPoint[1], dest[0], dest[1]);

            if (dist <= 10) {
                setWaypoints([null]);
                clearRoute();
                const msg = 'ถึงที่หมายแล้วค่ะ';
                showToast(`🏠 ${msg}`, 'success');
                speak(msg);
            }
        }
    }, [startPoint, waypoints, isNavigating, clearRoute, showToast]);


    useEffect(() => {
        if (!user) return;
        const interval = setInterval(() => {
            if (startPointRef.current) {
                syncPosition(startPointRef.current);
            }
        }, 2000);

        return () => clearInterval(interval);
    }, [user, syncPosition]);

    const startNavigation = () => {
        setOriginalStart(startPoint);
        hookStartNav();
        setAutoSnapPaused(false);
        setIsImmersive(true);
        speak("เริ่มนำทางค่ะ ขอให้เดินทางโดยสวัสดิภาพ");
    };

    const simulateNavigation = () => {
        setOriginalStart(startPoint);
        hookSimNav();
        setAutoSnapPaused(false);
        setIsImmersive(true);
        speak("เริ่มระบบจำลองค่ะ");
    };

    const stopNavigation = () => {
        hookStopNav();
        setIsImmersive(false);
        speak("สิ้นสุดการนำทางค่ะ");
        setOriginalStart(null);
        clearRoute();
        setWaypoints([null]);
        setCompletedWaypoints(new Set());
        setCurrentLegIndex(0);
        setRerouteTrigger(0);
    };


    const handleStopNavigation = useCallback(() => {
        stopNavigation();
        if (navigator.geolocation) {
            navigator.geolocation.getCurrentPosition((pos) => {
                const coords = [pos.coords.latitude, pos.coords.longitude];
                setStartPoint(coords);
                syncPosition(coords);
            });
        }
    }, [stopNavigation, syncPosition]);

    const updateLocationName = useCallback(async (key, lat, lng, providedName = null) => {
        if (providedName) setLocationNames(prev => ({ ...prev, [key]: providedName }));
        else {
            const name = await reverseGeocode(lat, lng);
            setLocationNames(prev => ({ ...prev, [key]: name }));
        }
    }, []);

    const handleLocationSelect = useCallback((type, coords) => {
        if (!type || typeof type !== 'string') return;
        if (type === 'start') {
            setStartPoint(coords);
            updateLocationName('start', coords[0], coords[1]);
            if (!coords) clearRoute();
        }
        else if (type.startsWith('waypoint-')) {
            const idx = parseInt(type.split('-')[1]);
            const newWps = [...waypoints];
            newWps[idx] = coords;
            setWaypoints(newWps);
            if (coords) updateLocationName(type, coords[0], coords[1]);

            if (!newWps.some(w => w !== null)) clearRoute();
        }
        setActiveSelection(null);
    }, [waypoints, updateLocationName, clearRoute]);

    const handleUrlInput = (targetType, idx = null) => {
        setUrlModalTarget({ type: targetType, idx });
        setUrlModalOpen(true);
    };

    const handleUrlSubmit = (input, targetOverride = null) => {
        if (!input) return;
        const allCoords = [];
        const coordRegex = /([-+]?\d+\.\d+)\s*,\s*([-+]?\d+\.\d+)/g;
        let match;
        while ((match = coordRegex.exec(input)) !== null) {
            allCoords.push({ lat: parseFloat(match[1]), lng: parseFloat(match[2]) });
        }
        if (allCoords.length === 0) {
            const coords = parseCoordinateUrl(input);
            if (coords) allCoords.push(coords);
        }

        if (allCoords.length === 0) {
            showToast('ไม่สามารถระบุพิกัดได้ โปรดตรวจสอบรูปแบบลิงค์หรือพิกัด', 'error');
            return;
        }

        const target = targetOverride || urlModalTarget;

        if (allCoords.length === 1) {
            const { lat, lng } = allCoords[0];
            if (target.type === 'start') {
                setStartPoint([lat, lng]);
                updateLocationName('start', lat, lng);
            } else {
                const idx = (target.idx !== null && target.idx !== undefined) ? target.idx : waypoints.length;
                const newWps = [...waypoints];
                if (idx < newWps.length) {
                    newWps[idx] = [lat, lng];
                } else {
                    newWps.push([lat, lng]);
                }
                setWaypoints(newWps);
                updateLocationName(`waypoint-${idx}`, lat, lng);
            }
        } else {
            let startIdx = 0;
            let currentWps = [...waypoints];

            if (target.type === 'start') {
                setStartPoint([allCoords[0].lat, allCoords[0].lng]);
                updateLocationName('start', allCoords[0].lat, allCoords[0].lng);
                startIdx = 1;
            }

            const newWps = [];
            let targetStartIdx = (target.type === 'waypoint' && target.idx !== null) ? target.idx : currentWps.findIndex(w => w === null);
            if (targetStartIdx === -1) targetStartIdx = currentWps.length;

            for (let i = startIdx; i < allCoords.length; i++) {
                const { lat, lng } = allCoords[i];
                const currentTargetIdx = targetStartIdx + (i - startIdx);

                if (currentTargetIdx < currentWps.length) {
                    currentWps[currentTargetIdx] = [lat, lng];
                } else {
                    currentWps.push([lat, lng]);
                }
                updateLocationName(`waypoint-${currentTargetIdx}`, lat, lng);
            }

            setWaypoints(currentWps.filter(w => w !== null || currentWps.indexOf(w) === currentWps.length - 1));
        }

        setActiveMenu(null);
        setUrlModalOpen(false);
    };

    const handleViewLocation = useCallback((coords) => {
        setViewTarget({ coords, t: Date.now() });
    }, []);

    const handleFavoriteView = useCallback((input) => {
        let coords;
        let name = "ตำแหน่งที่เลือก";
        if (Array.isArray(input)) coords = input;
        else if (input?.lat !== undefined) {
            coords = [input.lat, input.lng];
            name = input.name || name;
        }

        if (coords) {
            setViewTarget({ coords, t: Date.now() });
            setSearchResult({ lat: coords[0], lng: coords[1], name });
        }
    }, []);

    const addWaypoint = () => setWaypoints([...waypoints, null]);
    const removeWaypoint = (index) => {
        const newWps = [...waypoints];
        if (newWps.length > 1) newWps.splice(index, 1);
        else newWps[index] = null;
        setWaypoints(newWps);
        if (!newWps.some(w => w !== null) || !startPoint) clearRoute();
    };

    const useCurrentLocation = useCallback(() => {
        if (navigator.geolocation) {
            navigator.geolocation.getCurrentPosition(async (pos) => {
                const { latitude, longitude } = pos.coords;
                setStartPoint([latitude, longitude]);
                updateLocationName('start', latitude, longitude);
            });
        }
    }, [updateLocationName]);

    const handleAcceptJob = useCallback((job) => {
        if (job.lat && job.lng) {
            setWaypoints(prev => {
                const newWps = [...prev];
                const emptyIdx = newWps.findIndex(w => w === null);
                const targetIdx = emptyIdx !== -1 ? emptyIdx : newWps.length;
                const coords = [job.lat, job.lng];
                const jobName = job.profiles?.full_name ? `บ้านคุณ ${job.profiles.full_name}` : job.issue_type;

                if (emptyIdx !== -1) newWps[emptyIdx] = coords;
                else newWps.push(coords);

                updateLocationName(`waypoint-${targetIdx}`, job.lat, job.lng, jobName);
                return newWps;
            });
            showToast(`รับงานสำเร็จ เพิ่มเข้าสู่รายการเดินทางแล้วค่ะ`, 'success');
        } else {
            showToast('งานนี้ไม่ได้ระบุพิกัดที่ตั้ง ไม่สามารถนำทางได้', 'warning');
        }
    }, [updateLocationName, showToast]);

    if (viewMode === 'jobs') {
        return (
            <div className="h-screen overflow-y-auto bg-gray-50">
                <JobListView user={user} onAcceptJob={handleAcceptJob} setViewMode={setViewMode} />
            </div>
        );
    }

    return (
        <div className="flex flex-col h-screen bg-gray-100 overflow-hidden relative">
            <TechnicianHeader
                title="ระบบนำทาง"
                isImmersive={isImmersive}
                pendingCount={pendingJobsCount}
                onShowJobs={() => setViewMode('jobs')}
                userProfile={userProfile}
                user={user}
                onAuthClick={() => setAuthModalOpen(true)}
                onProfileClick={() => setProfileModalOpen(true)}
            />

            <main className="flex-grow relative">
                <TechnicianMap
                    defaultCenter={MAP_CONFIG.DEFAULT_CENTER}
                    setMapInstance={setMapInstance}
                    activeSelection={activeSelection}
                    handleLocationSelect={handleLocationSelect}
                    setSearchResult={setSearchResult}
                    startPoint={startPoint}
                    setStartPoint={setStartPoint}
                    updateLocationName={updateLocationName}
                    otherTechs={otherTechs}
                    searchResult={searchResult}
                    routePath={routePath}
                    isNavigating={isNavigating}
                    autoSnapPaused={autoSnapPaused}
                    viewTarget={viewTarget}
                    currentHeading={currentHeading}
                    currentSpeed={currentSpeed}
                    locationNames={locationNames}
                    setActiveSelection={setActiveSelection}
                    waypoints={waypoints}
                    completedWaypoints={completedWaypoints}
                    visitOrder={visitOrder}
                    handleViewLocation={handleViewLocation}
                    removeWaypoint={removeWaypoint}
                    routeLegs={routeLegs}
                    currentLegIndex={currentLegIndex}
                    currentPointIndex={currentPointIndex}
                    tripType={tripType}
                    addFavorite={addFavorite}
                    isFavorite={isFavorite}
                />




                <NavigationOverlay
                    isNavigating={isNavigating}
                    isWaitingForContinue={isWaitingForContinue}
                    currentInstruction={currentInstruction}
                    currentSpeed={currentSpeed}
                    autoSnapPaused={autoSnapPaused}
                    isImmersive={isImmersive}
                    setIsImmersive={setIsImmersive}
                    onStopNavigation={stopNavigation}
                    onContinueNavigation={continueNavigation}
                    onRecenter={() => setAutoSnapPaused(false)}
                />


                {!isNavigating && !isImmersive && !activeSelection && (
                    <div className="absolute top-20 left-1/2 -translate-x-1/2 w-[90%] max-w-lg z-[1000]">
                        <SearchControl
                            onResultSelect={(res) => {
                                setSearchResult(res);
                                handleViewLocation([res.lat, res.lng]);
                            }}
                            currentPosition={startPoint}
                        />
                    </div>
                )}


                <button
                    onClick={() => {
                        if (startPoint) {
                            mapInstance && mapInstance.flyTo(startPoint, 17);
                        } else {
                            useCurrentLocation();
                        }
                    }}
                    className="fixed bottom-[32%] right-4 z-[9999] w-12 h-12 bg-white rounded-2xl shadow-xl flex items-center justify-center text-blue-600 hover:bg-blue-50 transition-all active:scale-90 border border-gray-100"
                >
                    <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 24 24">
                        <path d="M12 8c-2.21 0-4 1.79-4 4s1.79 4 4 4 4-1.79 4-4-1.79-4-4-4zm8.94 3c-.46-4.17-3.77-7.48-7.94-7.94V1h-2v2.06C6.83 3.52 3.52 6.83 3.06 11H1v2h2.06c.46 4.17 3.77 7.48 7.94 7.94V23h2v-2.06c4.17-.46 7.48-3.77 7.94-7.94H23v-2h-2.06zM12 19c-3.87 0-7-3.13-7-7s3.13-7 7-7 7 3.13 7 7-3.13 7-7 7z" />
                    </svg>
                </button>


                {activeSelection?.type === 'home-picking' && activeSelection?.status !== 'confirmed' && (
                    <MapSelectionOverlay
                        message={activeSelection.coords ? "ตำแหน่งนี้ใช่หรือไม่?" : "จิ้มตำแหน่งบ้านที่ต้องการบนแผนที่"}
                        onConfirm={() => activeSelection.coords && setActiveSelection({ ...activeSelection, status: 'confirmed' })}
                        onCancel={() => setActiveSelection(null)}
                    />
                )}
            </main>


            <div className="z-[1001]">
                <ControlPanel
                    isImmersive={isImmersive} setIsImmersive={setIsImmersive} startPoint={startPoint} waypoints={waypoints}
                    visitOrder={visitOrder} locationNames={locationNames} activeSelection={activeSelection}
                    activeMenu={activeMenu} tripType={tripType} travelMode={travelMode}
                    routePath={routePath} distance={liveDistance || distance} currentSpeed={currentSpeed}
                    isNavigating={isNavigating} totalDuration={liveDuration || totalDuration} segments={segments}
                    setTripType={setTripType} setTravelMode={setTravelMode} startNavigation={startNavigation}
                    simulateNavigation={simulateNavigation} stopNavigation={handleStopNavigation} handleViewLocation={handleViewLocation}
                    useCurrentLocation={useCurrentLocation} handleUrlInput={handleUrlInput}
                    setActiveSelection={setActiveSelection} setActiveMenu={setActiveMenu}
                    addWaypoint={addWaypoint} removeWaypoint={removeWaypoint} favorites={favorites} user={user}
                    onViewFavorite={handleFavoriteView} onSelectFavorite={handleFavoriteView}
                    viewMode={viewMode} setViewMode={setViewMode} pendingJobsCount={pendingJobsCount}
                    unreadMessagesCount={unreadMessagesCount} setUnreadMessagesCount={setUnreadMessagesCount}
                    onAuthClick={() => setUrlModalOpen(false) || setAuthModalOpen(true)}
                    onUrlSubmit={handleUrlSubmit}
                    setSearchResult={setSearchResult}
                    setWaypoints={setWaypoints}
                />
            </div>


            <UrlInputModal
                isOpen={urlModalOpen}
                onClose={() => setUrlModalOpen(false)}
                onSubmit={handleUrlSubmit}
            />

            <AuthModal isOpen={authModalOpen} onClose={() => setAuthModalOpen(false)} />
            <UserProfile
                isOpen={profileModalOpen}
                onClose={() => setProfileModalOpen(false)}
                user={user}
                onUpdate={() => { window.location.reload(); }}
            />

            <ArrivalOverlay
                isVisible={isWaitingForContinue}
                onContinue={continueNavigation}
            />
        </div>
    );
}
