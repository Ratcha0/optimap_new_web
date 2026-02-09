import React from 'react';
import { MapContainer, TileLayer, Marker, Popup, Tooltip } from 'react-leaflet';
import L from 'leaflet';
import iconShadow from 'leaflet/dist/images/marker-shadow.png';
import MapUserInteraction from '../../map/MapUserInteraction';
import UserMarker from '../../map/UserMarker';
import { AutoLocator, MapInstanceCapturer, RouteFitter } from '../../map/MapHelpers';
import MapLayers from '../../map/MapLayers';
import { MAP_TILE_URL, EXTERNAL_LINKS } from '../../../constants/api';
import { APP_THEME, MAP_CONFIG } from '../../../constants/visuals';
import { useToast } from '../../ui/ToastNotification';
import { speak } from '../../../utils/voiceUtils';
import technicianCar from '../../../assets/technicialcar.png';

export default function CustomerMap({
    defaultCenter,
    myPosition,
    setMyPosition,
    activeSelection,
    handleLocationSelect,
    techLocations,
    setActiveSelection,
    setMapInstance,
    userProfile,
    routePath = [],
    routeLegs = [],
    waypoints = [],
    setWaypoints,
    locationNames = {}
}) {
    const { showToast } = useToast();
    const homeIcon = L.divIcon({
        className: 'home-marker-premium',
        html: `
            <div class="relative flex items-center justify-center">
                <div class="w-10 h-10 bg-white rounded-xl flex items-center justify-center shadow-xl border-2 border-orange-500 text-orange-500 scale-100 hover:scale-110 transition-transform">
                    <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
                        <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"></path>
                        <polyline points="9 22 9 12 15 12 15 22"></polyline>
                    </svg>
                </div>
                <div class="absolute -top-10 left-1/2 -translate-x-1/2 bg-gray-900 text-white text-[10px] font-bold px-2 py-1 rounded-md opacity-0 group-hover:opacity-100 whitespace-nowrap shadow-xl border border-gray-800 pointer-events-none transition-opacity">
                    บ้านของเลข
                </div>
                <div class="absolute -bottom-1 w-2 h-2 bg-orange-500 rotate-45 z-[-1]"></div>
            </div>
        `,
        iconSize: [40, 40],
        iconAnchor: [20, 40]
    });
    return (
        <MapContainer
            center={defaultCenter}
            zoom={13}
            style={{ width: '100%', height: '100%' }}
            zoomControl={false}
            rotate={true}
            preferCanvas={true}
        >
            <MapInstanceCapturer setMapInstance={setMapInstance} />
            <TileLayer
                url={MAP_TILE_URL}
                keepBuffer={15}
                updateWhenZooming={true}
                updateWhenIdle={false}
                minZoom={3}
                maxZoom={20}
            />
            <MapUserInteraction
                activeSelection={activeSelection}
                onLocationSelect={handleLocationSelect}
            />
            <AutoLocator setPosition={setMyPosition} />

            <RouteFitter routePath={routePath} isNavigating={false} />


            {MAP_CONFIG.BRANCHES.map(branch => (
                <Marker
                    key={branch.id}
                    position={branch.position}
                    zIndexOffset={2000}
                    icon={L.divIcon({
                        className: 'branch-marker-bubble',
                        html: `
                            <div class="relative flex flex-col items-center pb-2">
                                <!-- Bubble Container -->
                                <div class="bg-[#1e293b] px-3 py-1 rounded-3xl shadow-xl border border-white/10 flex flex-col items-center min-w-[70px] relative z-20">
                                    <!-- Logo Text Section -->
                                    <div class="flex flex-col items-center -space-y-0.5">
                                        <span style="color: #fa7000; font-family: 'Impact', 'Arial Black', sans-serif; font-weight: 900; font-size: 13px; letter-spacing: -0.2px; line-height: 1; transform: scaleY(0.9);">ISUZU</span>
                                        <span class="text-white font-bold text-[10px]" style="font-family: 'Kanit', sans-serif; letter-spacing: 0.5px;">ประชากิจ</span>
                                    </div>
                                    
                                    <!-- Pointer/Arrow below the bubble -->
                                    <div class="absolute -bottom-1.5 left-1/2 -translate-x-1/2 w-3 h-3 bg-[#1e293b] rotate-45 border-r border-b border-white/10 z-10"></div>
                                </div>
                                
                                <!-- Static Center Point (Small Blue Dot) -->
                                <div class="w-1.5 h-1.5 bg-blue-500 rounded-full border border-white shadow-sm mt-0.5 relative z-30"></div>
                            </div>
                        `,
                        iconSize: [100, 50],
                        iconAnchor: [50, 48]
                    })}
                >
                    <Popup className="rounded-2xl overflow-hidden border-none shadow-2xl">
                        <div className="p-3 text-center min-w-[180px]">
                            <div className="text-[10px] font-black text-blue-500 uppercase tracking-widest mb-1">สาขา</div>
                            <div className="text-sm font-black text-gray-900 leading-tight">{branch.name}</div>
                            <div className="text-[10px] text-gray-400 font-bold mt-1 italic">เปิดทำการ: 08:00 - 17:00 น.</div>
                            {branch.phone && (
                                <div className="mt-3 flex flex-col gap-2">
                                    <a href={`tel:${branch.phone}`}
                                        style={{ color: 'white' }}
                                        className="w-full bg-green-600 hover:bg-green-500 text-white text-[12px] font-black py-3 rounded-2xl shadow-lg shadow-green-500/20 transition-all active:scale-95 flex items-center justify-center gap-2 uppercase tracking-wider no-underline">
                                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
                                        </svg>
                                        ติดต่อสาขา
                                    </a>
                                    <button
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            setWaypoints([branch.position]);
                                            const msg = `เริ่มนำทางไปที่สาขา ${branch.name} ค่ะ`;
                                            showToast(msg, 'info');
                                            speak(msg);
                                        }}
                                        style={{ color: 'white' }}
                                        className="w-full bg-blue-600 hover:bg-blue-500 text-white text-[12px] font-black py-3 rounded-2xl shadow-lg shadow-blue-500/20 transition-all active:scale-95 flex items-center justify-center gap-2 uppercase tracking-wider no-underline border-none">
                                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                                        </svg>
                                        เริ่มนำทาง
                                    </button>
                                </div>
                            )}
                        </div>
                    </Popup>
                </Marker>
            ))}

            {myPosition && (
                <UserMarker position={myPosition} speed={0} gpsHeading={0} isCustomer={true} />
            )}

            {techLocations.map(tech => (
                <Marker
                    key={tech.id}
                    position={[tech.last_lat, tech.last_lng]}
                    icon={L.divIcon({
                        className: 'tech-marker-premium',
                        html: `
                            <div class="relative flex items-center justify-center">
                                <div class="absolute w-12 h-12 rounded-full opacity-20 animate-ping" style="background-color: ${APP_THEME.PRIMARY};"></div>
                                <div class="w-14 h-14 relative z-10 flex items-center justify-center">
                                    <img src="${technicianCar}" 
                                         class="w-full h-full object-contain filter drop-shadow-lg" />
                                </div>
                            </div>
                        `,
                        iconSize: [64, 64],
                        iconAnchor: [32, 64]
                    })}
                >
                    <Popup className="rounded-3xl overflow-hidden shadow-2xl border-none">
                        <div className="p-4 flex flex-col gap-4 min-w-[300px]">
                            <div className="flex items-center gap-4">
                                <img src={tech.avatar_url || EXTERNAL_LINKS.DEFAULT_AVATAR} className="w-12 h-12 rounded-2xl object-cover shadow-lg" />
                                <div>
                                    <div className="text-[10px] font-black text-blue-500 uppercase tracking-widest leading-none mb-1">กำลังเดินทาง</div>
                                    <div className="text-sm font-black text-gray-900 leading-none truncate max-w-[100px]">{tech.full_name}</div>
                                </div>
                            </div>

                            {(tech.team_name || tech.car_reg) && (
                                <div className="flex flex-wrap gap-1">
                                    {tech.team_name && (
                                        <div className="bg-indigo-50 text-indigo-600 text-[12px] font-black px-2 py-0.5 rounded-lg flex items-center gap-1 border border-indigo-100">
                                            <svg className="w-2.5 h-2.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" /></svg>
                                            ทีมช่าง : {tech.team_name}
                                        </div>
                                    )}
                                    {tech.car_reg && (
                                        <div className="bg-indigo-50 text-indigo-600 text-[12px] font-black px-2 py-0.5 rounded-lg flex items-center gap-1 border border-indigo-100">
                                            <svg className="w-2.5 h-2.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M9 17a2 2 0 11-4 0 2 2 0 014 0zM19 17a2 2 0 11-4 0 2 2 0 014 0zM13 16V6a1 1 0 00-1-1H4a1 1 0 00-1 1v10a1 1 0 001 1h1m8-1a1 1 0 01-1 1H9m4-1V8a1 1 0 011-1h2.586a1 1 0 01.707.293l3.414 3.414a1 1 0 01.293.707V16a1 1 0 01-1 1h-1m-6-1a1 1 0 001 1h1" /></svg>
                                            ทะเบียนรถ : {tech.car_reg}
                                        </div>
                                    )}
                                </div>
                            )}

                            {tech.phone && (
                                <a
                                    href={`tel:${tech.phone}`}
                                    style={{ color: 'white' }}
                                    className="w-full bg-green-600 hover:bg-green-500 text-white font-black py-3 rounded-2xl text-[12px] flex items-center justify-center gap-2 transition-all active:scale-95 shadow-lg shadow-green-500/20 uppercase tracking-wider no-underline"
                                    onClick={(e) => e.stopPropagation()}
                                >
                                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
                                    </svg>
                                    ติดต่อช่าง
                                </a>
                            )}
                        </div>
                    </Popup>
                </Marker>
            ))}


            {userProfile?.home_lat && userProfile?.home_lng && activeSelection?.type !== 'home-picking' && (
                <Marker
                    position={[userProfile.home_lat, userProfile.home_lng]}
                    icon={homeIcon}
                >
                    <Popup className="rounded-2xl overflow-hidden shadow-2xl border-none">
                        <div className="p-4 min-w-[200px] max-w-[300px]">
                            <div className="flex items-center justify-between mb-2 border-b border-orange-100 pb-1">
                                <div className="text-[12px] font-black text-orange-500 uppercase tracking-widest">
                                    ตำแหน่งบ้านของคุณ
                                </div>
                                <button
                                    onClick={async () => {
                                        const shareUrl = EXTERNAL_LINKS.getAppShareUrl(userProfile.home_lat, userProfile.home_lng);

                                        if (navigator.share) {
                                            try {
                                                await navigator.share({
                                                    title: 'ตำแหน่งบ้านของฉัน',
                                                    text: `ดูตำแหน่งบนแอป: ${userProfile.address || ''}`,
                                                    url: shareUrl,
                                                });
                                            } catch (err) {
                                                console.error('Error sharing:', err);
                                            }
                                        } else {
                                            try {
                                                await navigator.clipboard.writeText(shareUrl);
                                                showToast('คัดลอกลิงก์แอปเรียบร้อยแล้ว', 'success');
                                            } catch (err) {
                                                const gmapsUrl = EXTERNAL_LINKS.getGoogleMapsUrl(userProfile.home_lat, userProfile.home_lng);
                                                window.open(gmapsUrl, '_blank');
                                            }
                                        }
                                    }}
                                    className="flex items-center gap-1 text-[10px] font-black text-green-500 hover:text-green-600 transition-colors bg-green-50 px-2 py-0.5 rounded-md"
                                >
                                    <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.368 2.684 3 3 0 00-5.368-2.684z" />
                                    </svg>
                                    แชร์
                                </button>
                            </div>
                            <div className="text-[11px] text-gray-400 font-bold mb-2">
                                พิกัด: {userProfile.home_lat?.toFixed(6)}, {userProfile.home_lng?.toFixed(6)}
                            </div>
                            <div className="text-sm font-bold text-gray-900 leading-relaxed whitespace-pre-line bg-gray-50/50 p-3 rounded-xl border border-gray-100">
                                {userProfile.address || 'ยังไม่ได้ระบุรายละเอียดที่อยู่'}
                            </div>


                        </div>
                    </Popup>
                </Marker>
            )}

            {activeSelection?.type === 'home-picking' && activeSelection?.coords && (
                <Marker
                    position={activeSelection.coords}
                    icon={L.icon({
                        iconUrl: EXTERNAL_LINKS.VIOLET_MARKER,
                        shadowUrl: iconShadow,
                        iconSize: [25, 41],
                        iconAnchor: [12, 41]
                    })}
                >
                    <Tooltip direction="top" offset={[0, -40]} opacity={1} permanent>
                        เล็งตำแหน่งบ้าน
                    </Tooltip>
                </Marker>
            )}

            <MapLayers
                startPoint={myPosition}
                locationNames={locationNames}
                setActiveSelection={setActiveSelection}
                visibleWaypoints={waypoints}
                visitOrder={{}}
                handleViewLocation={(coords) => setWaypoints([coords])}
                removeWaypoint={() => setWaypoints([])}
                routePath={routePath}
                routeLegs={routeLegs}
                currentLegIndex={0}
                currentPointIndex={null}
                isNavigating={false}
            />
        </MapContainer>
    );
}
