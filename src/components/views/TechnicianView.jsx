import React, { useState, useRef, useEffect, useCallback } from 'react';
import { supabase } from '../../utils/supabaseClient';
import { useWakeLock } from '../../hooks/useWakeLock';
import { useNavigation } from '../../hooks/useNavigation';
import { useRouting } from '../../hooks/useRouting';
import { useTechnicianData } from '../../hooks/useTechnicianData';
import { useCarStatusSimulator } from '../../hooks/useCarStatusSimulator';
import { reverseGeocode, parseCoordinateUrl } from '../../utils/mapUtils';
import { speak } from '../../utils/voiceUtils';
import { MAP_CONFIG } from '../../constants/visuals';
import { calculateDistance, calculateRemainingDistance } from '../../utils/geoUtils';
import { formatTime } from '../../utils/mapUtils';
import NavigationOverlay from './technician/NavigationOverlay';
import HUDOverlay from './technician/HUDOverlay';
import ControlPanel from './technician/ControlPanel';
import SearchControl from '../map/SearchControl';
import UrlInputModal from '../modals/UrlInputModal';
import MapSelectionOverlay from '../ui/MapSelectionOverlay';
import UserProfile from '../modals/UserProfile';
import JobListView from './technician/JobListView';
import { useToast } from '../ui/ToastNotification';
import TechnicianHeader from './technician/TechnicianHeader';
import TechnicianMap from './technician/TechnicianMap';
import TeamInviteModal from '../modals/TeamInviteModal';
import ArrivalOverlay from './technician/ArrivalOverlay';
import AuthModal from '../modals/AuthModal';
import TeamInviteNotification from '../ui/TeamInviteNotification';
import { useTeamManager } from '../../hooks/useTeamManager';
import { useTechnicianPersistence } from '../../hooks/useTechnicianPersistence';
import OfflineWarning from '../ui/OfflineWarning';

export default function TechnicianView({ user, userProfile, sharedLocation }) {

    const [startPoint, setStartPoint] = useState(() => {
        const saved = localStorage.getItem('tech_start_point');
        return saved ? JSON.parse(saved) : null;
    });
    const [mapInstance, setMapInstance] = useState(null);
    const [waypoints, setWaypoints] = useState(() => {
        const saved = localStorage.getItem('tech_waypoints');
        return saved ? JSON.parse(saved) : [null];
    });
    const [locationNames, setLocationNames] = useState(() => {
        const saved = localStorage.getItem('tech_location_names');
        return saved ? JSON.parse(saved) : {};
    });
    const [currentHeading, setCurrentHeading] = useState(0);
    const [activeSelection, setActiveSelection] = useState(null);
    const [searchResult, setSearchResult] = useState(null);

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
    const [activeMenu, setActiveMenu] = useState(null);
    const [urlModalOpen, setUrlModalOpen] = useState(false);
    const [authModalOpen, setAuthModalOpen] = useState(false);
    const [profileModalOpen, setProfileModalOpen] = useState(false);
    const [urlModalTarget, setUrlModalTarget] = useState({ type: null, idx: null });
    const [viewTarget, setViewTarget] = useState(null);
    const [currentLegIndex, setCurrentLegIndex] = useState(() => Number(localStorage.getItem('tech_current_leg')) || 0);
    const [currentInstruction, setCurrentInstruction] = useState("");
    const [tripType, setTripType] = useState('oneway');
    const [completedWaypoints, setCompletedWaypoints] = useState(() => {
        const saved = localStorage.getItem('tech_completed_wps');
        return saved ? new Set(JSON.parse(saved)) : new Set();
    });
    const [rerouteTrigger, setRerouteTrigger] = useState(0);
    const [view3D, setView3D] = useState(false);
    const [navActive, setNavActive] = useState(() => localStorage.getItem('tech_is_navigating') === 'true');
    const [isImmersive, setIsImmersive] = useState(() => localStorage.getItem('tech_is_immersive') === 'true');
    const [autoSnapPaused, setAutoSnapPaused] = useState(false);
    const [travelMode, setTravelMode] = useState(() => localStorage.getItem('tech_travel_mode') || 'driving');
    const [currentSpeed, setCurrentSpeed] = useState(0);
    const [gpsAccuracy, setGpsAccuracy] = useState(null);
    const [originalStart, setOriginalStart] = useState(null);
    const [viewMode, setViewMode] = useState('map');
    const [activeInviteTicket, setActiveInviteTicket] = useState(null);
    const [isInviteOpen, setIsInviteOpen] = useState(false);
    const [isHudMode, setIsHudMode] = useState(false);
    const { showToast } = useToast();
    const {
        otherTechs,
        myAssignment,
        pendingInvite,
        handleAcceptInvite,
        handleDeclineInvite
    } = useTeamManager(user, setViewMode);

    const {
        pendingJobsCount,
        unreadMessagesCount,
        setUnreadMessagesCount,
        syncPosition,
        carStatus,
        isOnline
    } = useTechnicianData(user);

    const startPointRef = useRef(startPoint);
    useEffect(() => { startPointRef.current = startPoint; }, [startPoint]);


    const {
        routeLegs, routePath, segments, distance, totalDuration, navigationSteps,
        visitOrder, legTargetIndices, clearRoute, isLoading: isRouting
    } = useRouting({
        startPoint, waypoints, locationNames, travelMode, tripType, isNavigating: navActive,
        rerouteTrigger, setRerouteTrigger, completedWaypoints, originalStart, currentLegIndex,
        isOnline
    });

    const hasAttemptedResume = useRef(false);



    const handleReroute = useCallback((newLat, newLng) => {
        setStartPoint([newLat, newLng]);
        setCurrentLegIndex(0);
        speak("กำลังคำนวณเส้นทางใหม่ค่ะ");
        setRerouteTrigger(prev => prev + 1);
    }, []);


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
        setAutoSnapPaused,
        setCurrentLegIndex, waypoints, onLegComplete: handleLegComplete,
        is3D: view3D,
        initialPointIndex: Number(localStorage.getItem('tech_current_pt_idx')) || 0,
        initialLegIndex: currentLegIndex
    });

    const {
        isNavigating,
        startNavigation: hookStartNav,
        simulateNavigation: hookSimNav,
        stopNavigation: hookStopNav,
        currentPointIndex,
        eta,
        remainingDistance,
        nextManeuver,
        secondNextManeuver,
        isWaitingForContinue,
        continueNavigation: hookContinueNav
    } = nav;

    const { clearPersistence } = useTechnicianPersistence({
        startPoint, waypoints, locationNames, travelMode, tripType,
        completedWaypoints, currentLegIndex, navActive, isImmersive,
        currentPointIndex: currentPointIndex || 0
    });

    useEffect(() => {
        if (navActive && !isNavigating && !hasAttemptedResume.current && routePath.length > 0) {
            hasAttemptedResume.current = true;
            hookStartNav(true); 
        }
    }, [navActive, isNavigating, routePath, hookStartNav]);


    useEffect(() => {
        if (!isOnline && isNavigating) {
            speak("ขาดการเชื่อมต่ออินเทอร์เน็ต ระบบจะไม่สามารถคำนวณเส้นทางใหม่ได้ในขณะนี้ค่ะ");
        } else if (isOnline && isNavigating) {
            speak("กลับมาออนไลน์แล้วค่ะ");
        }
    }, [isOnline, isNavigating]);

    const [mapRemountKey, setMapRemountKey] = useState(0);

    const stopNavigation = useCallback(() => {
        hookStopNav();
        setIsImmersive(false);
        speak("สิ้นสุดการนำทางค่ะ");
        setOriginalStart(null);
        clearRoute();
        setWaypoints([null]);
        setCompletedWaypoints(new Set());
        setCurrentLegIndex(0);
        setRerouteTrigger(0);
        
        
        clearPersistence();
        
       
        setMapRemountKey(prev => prev + 1);
    }, [hookStopNav, clearRoute]);

    const handleContinueNavigation = useCallback(() => {
     
        if (routeLegs && currentLegIndex < routeLegs.length - 1) {
             const nextLeg = currentLegIndex + 1;
             setCurrentLegIndex(nextLeg);
             hookContinueNav(); 
        } else {
             
             stopNavigation();
             showToast('ถึงจุดหมายปลายทางเรียบร้อยแล้ว', 'success');
        }
    }, [currentLegIndex, routeLegs, hookContinueNav, stopNavigation, showToast]);


    useEffect(() => { setNavActive(isNavigating); }, [isNavigating]);
    
    useEffect(() => {
        if (isNavigating) {
            setView3D(true);
        } else {
            setView3D(false);
        }
    }, [isNavigating]);

    useWakeLock(isNavigating);
    useCarStatusSimulator(user, userProfile, isNavigating, currentSpeed, { eta, distance_remaining: remainingDistance });
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

    const handleOpenInvite = useCallback((ticket) => {
        setActiveInviteTicket(ticket);
        setIsInviteOpen(true);
    }, []);


    useEffect(() => {
        if (isNavigating) return;
        
        navigator.geolocation.getCurrentPosition(
            (pos) => setStartPoint([pos.coords.latitude, pos.coords.longitude]),
            null,
            { enableHighAccuracy: false, timeout: 5000, maximumAge: 60000 }
        );

        const watchId = navigator.geolocation.watchPosition(
            (pos) => {
                const { latitude, longitude, heading, speed, accuracy } = pos.coords;
              
                setStartPoint([latitude, longitude]);
                if (heading !== null && !isNaN(heading)) setCurrentHeading(heading);
                setCurrentSpeed(speed || 0);
                setGpsAccuracy(accuracy);
            },
            (err) => {
                if (err.code !== 3) {
                    console.warn("Location update failed:", err.message);
                    setGpsAccuracy(null);
                }
            },
            { 
                enableHighAccuracy: true, 
                timeout: 20000, 
                maximumAge: 5000 
            }
        );

        return () => navigator.geolocation.clearWatch(watchId);
    }, [isNavigating]);


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
                setMapRemountKey(prev => prev + 1);
            }
        }
    }, [startPoint, waypoints, isNavigating, clearRoute, showToast]);


    useEffect(() => {
        if (!user) return;
        const interval = setInterval(() => {
            if (startPointRef.current) {
                syncPosition(startPointRef.current);
            }
        }, 5000);

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
        else if (type === 'home-picking') {
            setActiveSelection({ type: 'home-picking', status: 'selecting', coords });
            return;
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


    const addWaypoint = () => setWaypoints([...waypoints, null]);
    const removeWaypoint = (index) => {
        const newWps = [...waypoints];
        if (newWps.length > 1) newWps.splice(index, 1);
        else newWps[index] = null;
        setWaypoints(newWps);
        if (!newWps.some(w => w !== null) || !startPoint) clearRoute();
    };

    const handleUseCurrentLocation = useCallback(() => {
        if (!navigator.geolocation) {
            showToast('เบราว์เซอร์ไม่รองรับการระบุตำแหน่ง', 'error');
            return;
        }

        showToast('กำลังจับตำแหน่งปัจจุบัน...', 'info');
        navigator.geolocation.getCurrentPosition(
            async (pos) => {
                const { latitude, longitude } = pos.coords;
                
                if (isNavigating) {
                    stopNavigation();
                    showToast('หยุดการจำลอง/นำทาง เพื่อใช้ตำแหน่งปัจจุบัน', 'warning');
                }

                setStartPoint([latitude, longitude]);
                updateLocationName('start', latitude, longitude);
                
                
                setAutoSnapPaused(false);
                setViewTarget({ coords: [latitude, longitude], t: Date.now() });
                
                if (nav && nav.syncMap) {
                    nav.syncMap(true);
                }

                showToast('จับตำแหน่งสำเร็จ', 'success');
            },
            (err) => {
                showToast(`ไม่สามารถจับตำแหน่งได้: ${err.message}`, 'error');
            },
            { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 }
        );
    }, [updateLocationName, isNavigating, stopNavigation, mapInstance, showToast]);

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



    return (
        <div className="flex flex-col h-screen bg-transparent overflow-hidden relative">
            <TechnicianHeader
                title="ระบบนำทาง"
                isImmersive={isImmersive}
                pendingCount={pendingJobsCount}
                onShowJobs={() => setViewMode('jobs')}
                userProfile={userProfile}
                user={user}
                onAuthClick={() => setAuthModalOpen(true)}
                onProfileClick={() => setProfileModalOpen(true)}
                isOnline={isOnline}
                gpsAccuracy={gpsAccuracy}
            />

            <main className={`flex-grow relative ${isHudMode ? 'bg-black' : ''}`} style={isHudMode ? { transform: 'scaleX(-1)' } : {}}>
                <TechnicianMap
                    key={mapRemountKey}
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
                    userProfile={userProfile}
                    carStatus={carStatus}
                    myAssignment={myAssignment}
                    onOpenInvite={handleOpenInvite}
                    onMapInteract={(type) => {
                        if (type === 'start') setAutoSnapPaused(true);
                    }}
                    is3D={view3D}
                    isHudMode={isHudMode}
                />






                <NavigationOverlay
                    isNavigating={isNavigating}
                    isWaitingForContinue={isWaitingForContinue}
                    currentInstruction={currentInstruction}
                    currentSpeed={currentSpeed}
                    autoSnapPaused={autoSnapPaused}
                    isImmersive={isImmersive}
                    setIsImmersive={setIsImmersive}
                    onStopNavigation={handleStopNavigation}
                    onContinueNavigation={handleContinueNavigation}
                    onHUDToggle={() => setIsHudMode(true)}
                    onRecenter={() => setAutoSnapPaused(false)}
                    eta={eta}
                    remainingDistance={remainingDistance}
                    nextManeuver={nextManeuver}
                    secondNextManeuver={secondNextManeuver}
                    isHudMode={isHudMode}
                />
                {!isOnline && <OfflineWarning isNavigating={isNavigating} />}


                {!isNavigating && !isImmersive && !activeSelection && (
                    <div className="absolute top-14 sm:top-20 left-1/2 -translate-x-1/2 w-[90%] max-w-lg z-[1000]">
                        <SearchControl
                            onResultSelect={(res) => {
                                setSearchResult(res);
                                handleViewLocation([res.lat, res.lng]);
                            }}
                            currentPosition={startPoint}
                        />
                    </div>
                )}


                {!isHudMode && (
                <div className="fixed bottom-[10%] right-4 z-[900] flex flex-col gap-3">
                    <button
                        onClick={() => setView3D(!view3D)}
                        className={`w-10 h-10 rounded-2xl shadow-xl flex items-center justify-center transition-all active:scale-90 border font-black text-xs ${
                            view3D
                            ? 'bg-blue-600 text-white border-blue-400' 
                            : 'bg-white text-blue-600 border-gray-100'
                        }`}
                        title="สลับมุมมอง 3D"
                    >
                        { view3D ? '2D' : '3D' }
                    </button>

                    <button
                        onClick={() => {
                            setAutoSnapPaused(false);
                            if (isNavigating && startPoint) {
                                if (nav && nav.syncMap) {
                                    nav.syncMap(true);
                                }
                            } else if (startPoint) {
                                setViewTarget({ coords: startPoint, zoom: 17, t: Date.now() });
                            } else {
                                handleUseCurrentLocation();
                            }
                        }}
                        className={`w-10 h-10 rounded-2xl shadow-xl flex items-center justify-center transition-all active:scale-90 border ${
                            !autoSnapPaused && (isNavigating || !autoSnapPaused)
                            ? 'bg-blue-600 text-white border-blue-400' 
                            : 'bg-white text-blue-600 border-gray-100'
                        }`}
                        title={!autoSnapPaused ? "กำลังติดตามตำแหน่ง" : "ล็อกตำแหน่งปัจจุบัน"}
                    >
                        <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 24 24">
                            <path d="M12 8c-2.21 0-4 1.79-4 4s1.79 4 4 4 4-1.79 4-4-1.79-4-4-4zm8.94 3c-.46-4.17-3.77-7.48-7.94-7.94V1h-2v2.06C6.83 3.52 3.52 6.83 3.06 11H1v2h2.06c.46 4.17 3.77 7.48 7.94 7.94V23h2v-2.06c4.17-.46 7.48-3.77 7.94-7.94H23v-2h-2.06zM12 19c-3.87 0-7-3.13-7-7s3.13-7 7-7 7 3.13 7 7-3.13 7-7 7z" />
                        </svg>
                    </button>
                </div>
                )}


                {activeSelection?.type === 'home-picking' && activeSelection?.status !== 'confirmed' && (
                    <MapSelectionOverlay
                        message={activeSelection.coords ? "ตำแหน่งนี้ใช่หรือไม่?" : "จิ้มตำแหน่งบ้านที่ต้องการบนแผนที่"}
                        coords={activeSelection.coords}
                        onConfirm={() => activeSelection.coords && setActiveSelection({ ...activeSelection, status: 'confirmed' })}
                        onCancel={() => setActiveSelection(null)}
                    />
                )}
                {viewMode === 'jobs' && (
                    <div className="absolute inset-0 z-[5000] bg-gray-50 overflow-y-auto animate-in fade-in slide-in-from-bottom-4 duration-300">
                        <JobListView user={user} onAcceptJob={handleAcceptJob} setViewMode={setViewMode} />
                    </div>
                )}
            </main>


            {!isHudMode && (
            <div className="z-[1001]">
                <ControlPanel
                    isImmersive={isImmersive} setIsImmersive={setIsImmersive} startPoint={startPoint} waypoints={waypoints}
                    visitOrder={visitOrder} locationNames={locationNames} activeSelection={activeSelection}
                    activeMenu={activeMenu} tripType={tripType} travelMode={travelMode}
                    routePath={routePath} distance={liveDistance || distance} currentSpeed={currentSpeed}
                    isNavigating={isNavigating} totalDuration={liveDuration || totalDuration} segments={segments}
                    setTripType={setTripType} setTravelMode={setTravelMode} startNavigation={startNavigation}
                    simulateNavigation={simulateNavigation} stopNavigation={handleStopNavigation} handleViewLocation={handleViewLocation}
                    useCurrentLocation={handleUseCurrentLocation} handleUrlInput={handleUrlInput}
                    setActiveSelection={setActiveSelection} setActiveMenu={setActiveMenu}
                    addWaypoint={addWaypoint} removeWaypoint={removeWaypoint} user={user}
                    viewMode={viewMode} setViewMode={setViewMode} pendingJobsCount={pendingJobsCount}
                    unreadMessagesCount={unreadMessagesCount} setUnreadMessagesCount={setUnreadMessagesCount}
                    onAuthClick={() => setUrlModalOpen(false) || setAuthModalOpen(true)}
                    onUrlSubmit={handleUrlSubmit}
                    setSearchResult={setSearchResult}
                    setWaypoints={setWaypoints}
                    carStatus={carStatus}
                    eta={eta}
                    remainingDistance={remainingDistance}
                    isRouting={isRouting}
                    setCompletedWaypoints={setCompletedWaypoints}
                    setCurrentLegIndex={setCurrentLegIndex}
                />
            </div>
            )}


            <UrlInputModal
                isOpen={urlModalOpen}
                onClose={() => setUrlModalOpen(false)}
                onSubmit={handleUrlSubmit}
            />

            <AuthModal isOpen={authModalOpen} onClose={() => setAuthModalOpen(false)} />
            
            {isHudMode && (
                <HUDOverlay 
                    isNavigating={isNavigating}
                    nextManeuver={nextManeuver}
                    currentSpeed={currentSpeed}
                    remainingDistance={remainingDistance}
                    eta={eta}
                    onClose={() => setIsHudMode(false)}
                    isHudMode={isHudMode}
                />
            )}

            <UserProfile
                isOpen={profileModalOpen}
                onClose={() => setProfileModalOpen(false)}
                user={user}
                onUpdate={() => { window.location.reload(); }}
                activeSelection={activeSelection}
                setActiveSelection={setActiveSelection}
            />

            {activeInviteTicket && (
                <TeamInviteModal
                    isOpen={isInviteOpen}
                    onClose={() => setIsInviteOpen(false)}
                    ticketId={activeInviteTicket.id}
                    currentUser={user}
                />
            )}

            <ArrivalOverlay
                isVisible={isWaitingForContinue}
                onContinue={handleContinueNavigation}
            />

            <TeamInviteNotification
                invite={pendingInvite}
                onAccept={handleAcceptInvite}
                onDecline={handleDeclineInvite}
            />
        </div>
    );
}
