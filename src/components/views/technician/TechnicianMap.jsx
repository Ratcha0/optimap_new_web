import React from 'react';
import { MapContainer, TileLayer, Marker, Popup, Tooltip, useMap } from 'react-leaflet';
import L from 'leaflet';
import iconShadow from 'leaflet/dist/images/marker-shadow.png';
import { MapInstanceCapturer, SearchPanner, RouteFitter, AutoLocator } from '../../map/MapHelpers';
import MapUserInteraction from '../../map/MapUserInteraction';
import UserMarker from '../../map/UserMarker';
import MapLayers from '../../map/MapLayers';
import MapRecenter from '../../map/MapRecenter';
import { MAP_TILE_URL, EXTERNAL_LINKS } from '../../../constants/api';
import { MAP_CONFIG } from '../../../constants/visuals';
import { useToast } from '../../ui/ToastNotification';
import { speak } from '../../../utils/voiceUtils';
import BranchMarkers from '../../map/BranchMarkers';
import TechnicianCarMarker from '../../map/TechnicianCarMarker';

const map3DStyles = `
    .map-container-3d {
        perspective: 9000000000000px;
        perspective-origin: center center;
        overflow: hidden;
        background: #e6e3dd;
        width: 100%;
        height: 100%;
    }
    .map-3d .leaflet-container {
        transform: rotateX(65deg) scale(1.0) !important;
        transform-origin: center center;
        transition: transform 0.3s ease;
        height: 350% !important;
        top: -100% !important;
        left: 0 !important;
        width: 100% !important;
    }
    /* Stretch Isuzu markers to look "standing" in 3D perspective */
    .map-3d .leaflet-marker-icon.branch-marker-bubble > div {
        transform: scaleY(3.0) scaleX(1.1) !important;
        transform-origin: bottom center !important;
        transition: transform 0.3s ease;
        position: relative; /* Ensure pseudo-element positions relative to this */
    }
    /* Enhance hit area for easy clicking in 3D */
    .map-3d .leaflet-marker-icon.branch-marker-bubble > div::after {
        content: '';
        position: absolute;
        bottom: -20%;
        left: 50%;
        transform: translateX(-50%);
        width: 180%; 
        height: 140%; 
        background: transparent;
        z-index: 50;
        cursor: pointer;
    }
    /* Stretch Technician Car markers to look "standing" in 3D perspective */
    .map-3d .leaflet-marker-icon.tech-marker-premium {
        transform-style: preserve-3d !important;
    }
    .map-3d .leaflet-marker-icon.tech-marker-premium > div {
        transform: scaleY(3.0) scaleX(1.1) !important;
        transform-origin: bottom center !important;
        transition: transform 0.3s ease;
    }
    
    /* CUSTOM 3D TOOLTIP STYLES (Replacing Popup) */
    .custom-3d-tooltip {
        background: transparent !important;
        border: none !important;
        box-shadow: none !important;
        padding: 0 !important;
        margin: 0 !important;
    }
    .custom-3d-tooltip::before {
        display: none !important;
    }
    .map-3d .custom-3d-tooltip {
        transform-style: preserve-3d !important;
        transform: scaleY(3.0) scaleX(1.1) !important;
        transform-origin: bottom center !important;
        z-index: 5000 !important;
        transition: transform 0.3s ease;
    }

    /* Stretch search pin marker in 3D */
    .map-3d .leaflet-marker-icon.search-pin-marker > div {
        transform: scaleY(3.0) scaleX(1.1) !important;
        transform-origin: bottom center !important;
        transition: transform 0.3s ease;
    }
    /* Stretch destination/waypoint markers in 3D */
    .map-3d .leaflet-marker-icon.dest-marker-premium > div {
        transform: scaleY(3.0) scaleX(1.1) !important;
        transform-origin: bottom center !important;
        transition: transform 0.3s ease;
    }
    .map-3d .leaflet-tooltip:not(.custom-3d-tooltip) {
        display: none !important;
    }
    .map-3d .leaflet-popup {
        transform: scaleY(3.0) scaleX(1.1) !important;
        transform-origin: bottom center !important;
    }

    .map-2d .leaflet-container {
        transform: rotateX(0deg) scale(1) !important;
        transform-origin: center center;
        transition: transform 1s cubic-bezier(0.4, 0, 0.2, 1);
        height: 100% !important;
        top: 0 !important;
    }
    .map-3d .leaflet-control-container {
        display: none !important;
    }
`;


function Map3DTileBooster({ is3D }) {
    const map = useMap();
    React.useEffect(() => {
        if (!map) return;
        const gridLayer = Object.values(map._layers).find(l => l._url);
        if (!gridLayer) return;
        
        if (is3D) {
           
            if (!gridLayer._origGetTiledPixelBounds) {
                gridLayer._origGetTiledPixelBounds = gridLayer._getTiledPixelBounds;
            }
           
            gridLayer._getTiledPixelBounds = function(center) {
                const bounds = this._origGetTiledPixelBounds(center);
                const w = bounds.max.x - bounds.min.x;
                const h = bounds.max.y - bounds.min.y;
                const expandX = w * 1.5;
                const expandY = h * 2.5; 
                bounds.min.x -= expandX;
                bounds.min.y -= expandY;
                bounds.max.x += expandX;
                bounds.max.y += expandY;
                return bounds;
            };
        } else {
            // Restore original
            if (gridLayer._origGetTiledPixelBounds) {
                gridLayer._getTiledPixelBounds = gridLayer._origGetTiledPixelBounds;
            }
        }
        
        // Force tile recalculation
        setTimeout(() => {
            map.invalidateSize();
            gridLayer.redraw();
        }, 100);
    }, [map, is3D]);
    
    return null;
}

const TechnicianMarkerList = React.memo(({ allTechs, onOpenInvite, onMapInteract }) => {
    return (
        <>
            {allTechs.filter(t => !t.is_me && (!t.active_ticket_id || t.is_primary)).map(tech => (
                <TechnicianCarMarker 
                    key={tech.id} 
                    tech={tech} 
                    allTechs={allTechs}
                    onOpenInvite={onOpenInvite}
                    onMapInteract={onMapInteract}
                />
            ))}
        </>
    );
});

export default function TechnicianMap({
    defaultCenter,
    setMapInstance,
    activeSelection,
    handleLocationSelect,
    setSearchResult,
    searchResult,
    routePath,
    isNavigating,
    autoSnapPaused,
    viewTarget,
    currentHeading,
    currentSpeed,
    locationNames,
    setActiveSelection,
    waypoints,
    completedWaypoints,
    visitOrder,
    handleViewLocation,
    removeWaypoint,
    routeLegs,
    currentLegIndex,
    currentPointIndex,
    tripType,
    userProfile,
    carStatus,
    myAssignment,
    onOpenInvite,
    otherTechs = [],
    startPoint,
    setStartPoint,
    updateLocationName,
    onMapInteract,
    is3D = false
}) {
    // ... existing hook logic ...
    const { showToast } = useToast();
    const [mapUrl, setMapUrl] = React.useState(MAP_TILE_URL);

    const handleMapError = React.useCallback(() => {
        if (mapUrl !== MAP_TILE_URL_SECONDARY) {
            console.warn("Switching to secondary map provider due to performance/limit issues.");
            setMapUrl(MAP_TILE_URL_SECONDARY);
        }
    }, [mapUrl]);

    const allTechs = React.useMemo(() => {
        const list = [...otherTechs];
        if (userProfile) {
            list.push({
                ...userProfile,
                car_status: carStatus,
                is_me: true,
                active_ticket_id: myAssignment?.ticket_id,
                is_primary: myAssignment?.is_primary,
                assignment_status: myAssignment?.status
            });
        }
        return list;
    }, [otherTechs, userProfile, carStatus, myAssignment]);

    const isTeamMember = myAssignment?.status === 'accepted' && !myAssignment?.is_primary;

    return (
        <div className={`w-full h-full relative map-container-3d ${is3D ? 'map-3d' : 'map-2d'}`}>
            <style>{map3DStyles}</style>
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
            <Map3DTileBooster is3D={is3D} />

            {!startPoint && (
                <AutoLocator setPosition={setStartPoint} updateName={updateLocationName} maxZoom={15} />
            )}

            <MapUserInteraction
                activeSelection={activeSelection}
                onLocationSelect={handleLocationSelect}
                setSearchResult={setSearchResult}
                onMapInteract={onMapInteract}
            />

            <TileLayer
                url={mapUrl}
                attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/attributions">CARTO</a>'
                keepBuffer={50}
                updateWhenZooming={true}
                updateWhenIdle={false}
                minZoom={3}
                maxZoom={MAP_CONFIG.MAX_ZOOM}
                loading={true}
                eventHandlers={{
                    tileerror: handleMapError
                }}
            />

            <SearchPanner searchResult={searchResult} />
            <RouteFitter routePath={routePath} isNavigating={isNavigating} />
            <MapRecenter target={autoSnapPaused ? null : viewTarget} isNavigating={isNavigating} />

            <BranchMarkers
                onNavigate={(pos) => handleLocationSelect('waypoint-0', pos)}
                showToast={showToast}
            />

            {!isTeamMember && (
                <UserMarker
                    position={startPoint || defaultCenter}
                    gpsHeading={currentHeading}
                    speed={currentSpeed}
                    teammates={allTechs.filter(t => 
                        !t.is_me && 
                        t.active_ticket_id && 
                        t.active_ticket_id === (myAssignment?.ticket_id) &&
                        (t.assignment_status === 'accepted' || t.assignment_status === 'active')
                    )}
                />
            )}

            <TechnicianMarkerList 
                allTechs={allTechs}
                onOpenInvite={onOpenInvite}
                onMapInteract={onMapInteract}
            />

            {searchResult && searchResult.lat !== undefined && (
                <Marker 
                    position={[searchResult.lat, searchResult.lng]}
                    icon={L.divIcon({
                        className: 'search-pin-marker',
                        html: `<div class="flex flex-col items-center pointer-events-auto">
                            <div style="background: white; padding: 4px 12px; border-radius: 8px; box-shadow: 0 2px 8px rgba(0,0,0,0.15); font-family: 'Kanit', sans-serif; font-size: 12px; color: #374151; font-weight: 600; white-space: nowrap; margin-bottom: 4px;">คลิกเพื่อเลือกเมนู</div>
                            <svg width="30" height="42" viewBox="0 0 30 42" fill="none" xmlns="http://www.w3.org/2000/svg">
                                <path d="M15 0C6.716 0 0 6.716 0 15c0 10.5 15 27 15 27s15-16.5 15-27C30 6.716 23.284 0 15 0z" fill="#3B82F6"/>
                                <circle cx="15" cy="14" r="6" fill="white"/>
                            </svg>
                        </div>`,
                        iconSize: [140, 72],
                        iconAnchor: [70, 72]
                    })}
                    eventHandlers={{
                        popupopen: () => onMapInteract?.('start')
                    }}
                >
                    <Popup className="rounded-3xl overflow-hidden shadow-2xl border-none" autoPan={false} autoPanPadding={[50, 50]}>
                        <div className="p-4 min-w-[200px] bg-white text-gray-900">
                            <div className="text-[10px] font-black text-blue-500 uppercase tracking-widest mb-1">ตำแหน่งที่ระบุ</div>
                            <div className="text-sm font-black text-gray-900 leading-tight mb-4">{searchResult.name || 'พิกัดที่เลือก'}</div>
                            <div className="flex flex-col gap-2">
                                <button
                                    className="w-full bg-blue-500 hover:bg-blue-600 text-white font-black py-3 rounded-2xl text-[12px] tracking-wide transition-all active:scale-95 border-none cursor-pointer"
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        const emptyIdx = waypoints.indexOf(null);
                                        const targetIdx = emptyIdx !== -1 ? emptyIdx : waypoints.length;
                                        handleLocationSelect(`waypoint-${targetIdx}`, [searchResult.lat, searchResult.lng]);
                                        setSearchResult(null);
                                    }}
                                >
                                    ตั้งเป็นจุดหมายปลายทาง
                                </button>
                                <button
                                    className="w-full bg-green-600 hover:bg-green-500 text-white font-black py-3 rounded-2xl text-[12px] tracking-wide transition-all active:scale-95 shadow-lg shadow-green-500/20 flex items-center justify-center gap-2 border-none cursor-pointer"
                                    onClick={async (e) => {
                                        e.stopPropagation();
                                        const shareUrl = EXTERNAL_LINKS.getAppShareUrl(searchResult.lat, searchResult.lng);

                                        if (navigator.share) {
                                            try {
                                                await navigator.share({
                                                    title: 'แชร์ตำแหน่งพิกัด',
                                                    text: `ดูตำแหน่งบนแอป: ${searchResult.display_name || ''}`,
                                                    url: shareUrl,
                                                });
                                            } catch (err) {
                                                
                                            }
                                        } else {
                                            try {
                                                await navigator.clipboard.writeText(shareUrl);
                                                showToast('คัดลอกลิงก์แอปเรียบร้อยแล้ว', 'success');
                                            } catch (err) {
                                                const gmapsUrl = EXTERNAL_LINKS.getGoogleMapsUrl(searchResult.lat, searchResult.lng);
                                                window.open(gmapsUrl, '_blank');
                                            }
                                        }
                                    }}
                                >
                                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.368 2.684 3 3 0 00-5.368-2.684z" /></svg>
                                    แชร์ตำแหน่ง
                                </button>

                                <button
                                    className="w-full bg-red-50 hover:bg-red-100 text-red-500 font-black py-3 rounded-2xl text-[12px] tracking-wide transition-all active:scale-95 border border-red-100 cursor-pointer"
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        setSearchResult(null);
                                    }}
                                >
                                    ยกเลิกหมุด
                                </button>
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
                startPoint={startPoint}
                locationNames={locationNames}
                activeSelection={activeSelection}
                setActiveSelection={setActiveSelection}
                waypoints={waypoints}
                visibleWaypoints={waypoints}
                completedWaypoints={completedWaypoints}
                visitOrder={visitOrder}
                handleViewLocation={handleViewLocation}
                removeWaypoint={removeWaypoint}
                routePath={routePath}
                routeLegs={routeLegs}
                currentLegIndex={currentLegIndex}
                currentPointIndex={currentPointIndex}
                isNavigating={isNavigating}
                tripType={tripType}
            />
        </MapContainer>
        </div>
    );
}
