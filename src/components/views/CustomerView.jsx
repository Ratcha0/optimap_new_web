import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useToast } from '../ui/ToastNotification';
import { useCustomerData } from '../../hooks/useCustomerData';
import { SEARCH_API } from '../../constants/api';
import { MAP_CONFIG } from '../../constants/visuals';
import { reverseGeocode, parseCoordinateUrl } from '../../utils/mapUtils';
import { calculateDistance } from '../../utils/geoUtils';
import { speak } from '../../utils/voiceUtils';
import { useRouting } from '../../hooks/useRouting';
import CustomerControlPanel from './customer/CustomerControlPanel';
import UrlInputModal from '../modals/UrlInputModal';
import ReportIssueModal from '../modals/ReportIssueModal';
import UserProfile from '../modals/UserProfile';
import MessageModal from '../modals/MessageModal';
import MyTicketsView from './customer/MyTicketsView';
import MapSelectionOverlay from '../ui/MapSelectionOverlay';
import CustomerHeader from './customer/CustomerHeader';
import CustomerMap from './customer/CustomerMap';

export default function CustomerView({ user, sharedLocation }) {
    const { showToast } = useToast();
    const [myPosition, setMyPosition] = useState(null);
    const [mapInstance, setMapInstance] = useState(null);

    useEffect(() => {
        if (sharedLocation && mapInstance) {
            if (sharedLocation.isMulti && sharedLocation.coords?.length > 0) {
                const firstPoint = sharedLocation.coords[0];
                setMyPosition(firstPoint);
                mapInstance.setView(firstPoint, 16);
            } else if (sharedLocation.lat && sharedLocation.lng) {
                const { lat, lng } = sharedLocation;
                setMyPosition([lat, lng]);
                mapInstance.setView([lat, lng], 16);
            }
        }
    }, [sharedLocation, mapInstance]);

    const [activeSelection, setActiveSelection] = useState(null);
    const [activeMenu, setActiveMenu] = useState(null);
    const [locationNames, setLocationNames] = useState({});
    const [urlModalOpen, setUrlModalOpen] = useState(false);
    const [urlModalTarget, setUrlModalTarget] = useState({ type: null, idx: null });
    const [reportModalOpen, setReportModalOpen] = useState(false);
    const [profileModalOpen, setProfileModalOpen] = useState(false);
    const [viewMode, setViewMode] = useState('map');
    const [isMessageOpen, setIsMessageOpen] = useState(false);
    const [activeChatTicket, setActiveChatTicket] = useState(null);
    const [waypoints, setWaypoints] = useState([]);
    const mapRef = useRef(null);
    const defaultCenter = [13.7563, 100.5018];

    const {
        techLocations,
        userProfile,
        fetchProfile,
        submitTicket
    } = useCustomerData(user);

    const {
        routeLegs, routePath, segments, distance, totalDuration, navigationSteps,
        visitOrder, legTargetIndices, clearRoute
    } = useRouting({
        startPoint: myPosition,
        waypoints,
        locationNames,
        travelMode: 'driving',
        tripType: 'oneway',
        isNavigating: false,
    });


    useEffect(() => {
        if (myPosition && waypoints.length > 0 && waypoints[0]) {
            const dest = waypoints[0];
            const dist = calculateDistance(myPosition[0], myPosition[1], dest[0], dest[1]);

            if (dist <= 10) {
                setWaypoints([]);
                const msg = 'คุณถึงที่หมายแล้วค่ะ';
                showToast(`🏠 ${msg}`, 'success');
                speak(msg);
            }
        }
    }, [myPosition, waypoints, showToast]);

    const updateLocationName = useCallback(async (key, lat, lng) => {
        const name = await reverseGeocode(lat, lng);
        setLocationNames(prev => ({ ...prev, [key]: name }));
    }, []);

    const handleLocationSelect = useCallback((type, coords) => {
        if (type === 'start') {
            setMyPosition(coords);
            updateLocationName('start', coords[0], coords[1]);
        } else if (type === 'home-picking') {
            setActiveSelection({ type: 'home-picking', status: 'selecting', coords });
            return;
        }
        setActiveSelection(null);
    }, [updateLocationName]);

    const handleUrlInput = (targetType, idx = null) => {
        setUrlModalTarget({ type: targetType, idx });
        setUrlModalOpen(true);
    };

    const handleUrlSubmit = (input) => {
        if (!input) { setUrlModalOpen(false); return; }

        const coords = parseCoordinateUrl(input);

        if (coords) {
            const { lat, lng } = coords;
            if (urlModalTarget.type === 'start') {
                setMyPosition([lat, lng]);
                updateLocationName('start', lat, lng);
            }
            setActiveMenu(null);
        } else {
            showToast('ไม่สามารถระบุพิกัดได้ โปรดตรวจสอบรูปแบบลิงค์หรือพิกัด', 'error');
        }
        setUrlModalOpen(false);
    };

    const useCurrentLocation = useCallback(() => {
        if (navigator.geolocation) {
            navigator.geolocation.getCurrentPosition(async (pos) => {
                const { latitude, longitude } = pos.coords;
                setMyPosition([latitude, longitude]);
                updateLocationName('start', latitude, longitude);
            });
        }
    }, [updateLocationName]);

    const handleReportIssue = () => {
        if (!user) {
            showToast('กรุณาเข้าสู่ระบบเพื่อแจ้งปัญหา', 'warning');
            return;
        }
        setReportModalOpen(true);
    };

    const handleReportSubmit = async (issueType, details, carData) => {
        let issueLat = null;
        let issueLng = null;

        if (issueType === 'GPS') {
            if (!myPosition) {
                showToast('ไม่พบตำแหน่ง GPS ของคุณ กรุณารอสักครู่ให้ระบบระบุตำแหน่งแล้วลองใหม่', 'warning');
                return;
            }
            issueLat = myPosition[0];
            issueLng = myPosition[1];
        } else if (issueType === 'Profile') {
            if (userProfile?.home_lat && userProfile?.home_lng) {
                issueLat = userProfile.home_lat;
                issueLng = userProfile.home_lng;

                if (userProfile.address) {
                    details = details + `\n(ที่อยู่จากโปรไฟล์: ${userProfile.address})`;
                }
            }
        }

        const ticketData = {
            user_id: user.id,
            issue_type: issueType,
            description: details,
            lat: issueLat,
            lng: issueLng,
            car_reg_number: carData.car_number,
            car_reg_text: carData.car_reg,
            car_reg_province: carData.province,
            status: 'pending'
        };

        const firebaseData = (issueLat && issueLng) ? { lat: issueLat, lng: issueLng } : null;

        const result = await submitTicket(ticketData, firebaseData);

        if (result.success) {
            showToast('✅ ส่งข้อมูลสำเร็จ! เจ้าหน้าที่จะตรวจสอบข้อมูลและติดต่อกลับโดยเร็วที่สุดค่ะ', 'success');
            setReportModalOpen(false);
        } else {
            showToast('เกิดข้อผิดพลาดในการส่งข้อมูล: ' + result.error.message, 'error');
        }
    };

    const handleOpenChat = useCallback((ticket) => {
        setActiveChatTicket(ticket);
        setIsMessageOpen(true);
    }, []);

    if (viewMode === 'tickets') {
        return (
            <div className="h-screen overflow-y-auto bg-gray-50">
                <MyTicketsView user={user} setViewMode={setViewMode} />
            </div>
        );
    }

    return (
        <div className="flex flex-col h-screen bg-gray-100 overflow-hidden relative">
            <CustomerHeader
                title="แจ้งซ่อมรถถึงหน้าบ้าน"
                subtitle="ติดตามสถานะการซ่อมแบบเรียลไทม์"
                onShowTickets={() => setViewMode('tickets')}
                hasNotifications={false}
                userProfile={userProfile}
                onProfileClick={() => setProfileModalOpen(true)}
            />

            <main className="flex-grow relative">
                <CustomerMap
                    defaultCenter={MAP_CONFIG.DEFAULT_CENTER}
                    myPosition={myPosition}
                    setMyPosition={setMyPosition}
                    activeSelection={activeSelection}
                    handleLocationSelect={handleLocationSelect}
                    techLocations={techLocations}
                    setActiveSelection={setActiveSelection}
                    setMapInstance={setMapInstance}
                    userProfile={userProfile}
                    routePath={routePath}
                    routeLegs={routeLegs}
                    waypoints={waypoints}
                    setWaypoints={setWaypoints}
                    locationNames={locationNames}
                />

                {activeSelection?.type === 'home-picking' && activeSelection?.status !== 'confirmed' && (
                    <MapSelectionOverlay
                        message={activeSelection.coords ? "ตำแหน่งนี้ใช่หรือไม่?" : "จิ้มตำแหน่งบ้านที่ต้องการบนแผนที่"}
                        onConfirm={() => activeSelection.coords && setActiveSelection({ ...activeSelection, status: 'confirmed' })}
                        onCancel={() => setActiveSelection(null)}
                    />
                )}

                <button
                    onClick={() => {
                        if (myPosition && mapInstance) mapInstance.flyTo(myPosition, 15);
                        else useCurrentLocation();
                    }}
                    className="fixed bottom-[85%] right-4 z-[9999] w-12 h-12 bg-white rounded-2xl shadow-xl flex items-center justify-center text-blue-600 hover:bg-blue-50 transition-all active:scale-90 border border-gray-100"
                >
                    <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 24 24">
                        <path d="M12 8c-2.21 0-4 1.79-4 4s1.79 4 4 4 4-1.79 4-4-1.79-4-4-4zm8.94 3c-.46-4.17-3.77-7.48-7.94-7.94V1h-2v2.06C6.83 3.52 3.52 6.83 3.06 11H1v2h2.06c.46 4.17 3.77 7.48 7.94 7.94V23h2v-2.06c4.17-.46 7.48-3.77 7.94-7.94H23v-2h-2.06zM12 19c-3.87 0-7-3.13-7-7s3.13-7 7-7 7 3.13 7 7-3.13 7-7 7z" />
                    </svg>
                </button>

                {waypoints.length > 0 && (
                    <button
                        onClick={() => {
                            setWaypoints([]);
                            showToast('ยกเลิกการแสดงเส้นทางเรียบร้อยแล้ว', 'info');
                        }}
                        className="fixed bottom-[35%] right-4 z-[9999] w-12 h-12 bg-red-500 rounded-2xl shadow-xl flex flex-col items-center justify-center text-white hover:bg-red-600 transition-all active:scale-90 border border-red-400 group"
                    >
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M6 18L18 6M6 6l12 12" />
                        </svg>
                        <span className="text-[8px] font-black uppercase mt-0.5">ลบเส้นทาง</span>
                    </button>
                )}

            </main>

            <div className="z-[1001]">
                <CustomerControlPanel
                    isImmersive={false}
                    startPoint={myPosition}
                    locationNames={locationNames}
                    activeSelection={activeSelection}
                    activeMenu={activeMenu}
                    handleUrlInput={handleUrlInput}
                    setActiveSelection={setActiveSelection}
                    setActiveMenu={setActiveMenu}
                    mapRef={mapRef}
                    onReportIssue={handleReportIssue}
                    userProfile={userProfile}
                    onProfileUpdate={fetchProfile}
                    viewMode={viewMode}
                    setViewMode={setViewMode}
                    onOpenChat={handleOpenChat}
                />
            </div>


            <UrlInputModal isOpen={urlModalOpen} onClose={() => setUrlModalOpen(false)} onSubmit={handleUrlSubmit} />
            <ReportIssueModal
                isOpen={reportModalOpen}
                onClose={() => setReportModalOpen(false)}
                onSubmit={handleReportSubmit}
                myPosition={myPosition}
                userProfile={userProfile}
            />
            <UserProfile
                isOpen={profileModalOpen}
                onClose={() => setProfileModalOpen(false)}
                user={user}
                onUpdate={fetchProfile}
                setActiveSelection={setActiveSelection}
                activeSelection={activeSelection}
            />


            {activeChatTicket && (
                <MessageModal
                    isOpen={isMessageOpen}
                    onClose={() => setIsMessageOpen(false)}
                    ticketId={activeChatTicket.id}
                    currentUser={user}
                    otherPartyName={activeChatTicket.profiles?.full_name || 'ช่างเทคนิค'}
                    otherPartyAvatar={activeChatTicket.profiles?.avatar_url}
                />
            )}
        </div>
    );
}
