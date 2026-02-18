import React from 'react';
import { MapContainer, TileLayer, Marker, Popup, Tooltip } from 'react-leaflet';
import L from 'leaflet';
import iconShadow from 'leaflet/dist/images/marker-shadow.png';
import MapUserInteraction from '../../map/MapUserInteraction';
import UserMarker from '../../map/UserMarker';
import { AutoLocator, MapInstanceCapturer, RouteFitter } from '../../map/MapHelpers';
import MapLayers from '../../map/MapLayers';
import { MAP_TILE_URL, MAP_TILE_URL_SECONDARY, EXTERNAL_LINKS } from '../../../constants/api';
import { MAP_CONFIG } from '../../../constants/visuals';
import { useToast } from '../../ui/ToastNotification';
import BranchMarkers from '../../map/BranchMarkers';
import TechnicianCarMarker from '../../map/TechnicianCarMarker';


const TechnicianMarkerList = React.memo(({ techLocations }) => {
    return (
        <>
            {techLocations.filter(t => t.is_primary).map(tech => (
                <TechnicianCarMarker 
                    key={tech.id} 
                    tech={tech} 
                    allTechs={techLocations}
                />
            ))}
        </>
    );
});

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
    locationNames = {},
    autoSnapPaused,
    onMapInteract
}) {
    const { showToast } = useToast();
    const [mapUrl, setMapUrl] = React.useState(MAP_TILE_URL);

    const handleMapError = React.useCallback(() => {
        if (mapUrl !== MAP_TILE_URL_SECONDARY) {
            setMapUrl(MAP_TILE_URL_SECONDARY);
        }
    }, [mapUrl]);

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
            touchRotate={true}
            rotateControl={false}
            zoomAnimation={false}
            fadeAnimation={false}
            renderer={L.svg({ padding: 1 })}
            maxBounds={MAP_CONFIG.THAILAND_BOUNDS}
            minZoom={MAP_CONFIG.MIN_ZOOM}
            maxBoundsViscosity={1.0}
        >
            <MapInstanceCapturer setMapInstance={setMapInstance} />
            <TileLayer
                url={mapUrl}
                attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/attributions">CARTO</a>'
                keepBuffer={15}
                updateWhenZooming={true}
                updateWhenIdle={false}
                minZoom={3}
                maxZoom={MAP_CONFIG.MAX_ZOOM}
                eventHandlers={{
                    tileerror: handleMapError
                }}
            />
            <MapUserInteraction
                activeSelection={activeSelection}
                onLocationSelect={handleLocationSelect}
                onMapInteract={onMapInteract}
            />
            <AutoLocator setPosition={setMyPosition} />

            <RouteFitter routePath={routePath} isNavigating={false} autoSnapPaused={autoSnapPaused} />

            <BranchMarkers
                showToast={showToast}
                onNavigate={(pos) => setWaypoints([pos])}
            />

            {myPosition && (
                <UserMarker position={myPosition} speed={0} gpsHeading={0} isCustomer={true} />
            )}

            <TechnicianMarkerList techLocations={techLocations} />

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
                                    className="flex items-center gap-1 text-[10px] font-black text-green-500 hover:text-green-600 transition-colors bg-green-50 px-2 py-0.5 rounded-md border-none cursor-pointer"
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
