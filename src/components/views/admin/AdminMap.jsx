import React, { useState } from 'react';
import { MapContainer, TileLayer } from 'react-leaflet';
import { MAP_TILE_URL, MAP_TILE_URL_SECONDARY } from '../../../constants/api';
import { MAP_CONFIG } from '../../../constants/visuals';
import { MapInstanceCapturer } from '../../map/MapHelpers';
import BranchMarkers from '../../map/BranchMarkers';
import TechnicianCarMarker from '../../map/TechnicianCarMarker';
import { useToast } from '../../ui/ToastNotification';

export default function AdminMap({ techs = [] }) {
    const [mapInstance, setMapInstance] = useState(null);
    const { showToast } = useToast();
    const [mapUrl, setMapUrl] = React.useState(MAP_TILE_URL);

    const handleMapError = React.useCallback(() => {
        if (mapUrl !== MAP_TILE_URL_SECONDARY) {
            setMapUrl(MAP_TILE_URL_SECONDARY);
        }
    }, [mapUrl]);

    return (
        <div className="w-full h-[600px] rounded-3xl overflow-hidden border border-gray-100 shadow-inner relative bg-gray-900">
            <MapContainer
                center={MAP_CONFIG.DEFAULT_CENTER}
                zoom={10}
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

                <BranchMarkers showToast={showToast} />

                {techs.filter(tech => !tech.active_ticket_id || tech.is_primary).map(tech => (
                    <TechnicianCarMarker key={tech.id} tech={tech} allTechs={techs} isAdminView={true} />
                ))}
            </MapContainer>

            {/* Legend / Status Overlay */}
            <div className="absolute top-4 left-4 z-[1000] flex flex-col gap-2">
                <div className="bg-white/90 backdrop-blur-md p-3 rounded-2xl shadow-xl border border-white/50 min-w-[150px]">
                    <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2">สถานะช่าง</p>
                    <div className="space-y-1.5">
                        <div className="flex items-center gap-2">
                            <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 shadow-[0_0_10px_rgba(16,185,129,0.5)]"></span>
                            <span className="text-xs font-bold text-gray-700">ออนไลน์ ({techs.filter(t => t.last_updated && new Date(t.last_updated) > new Date(Date.now() - 5 * 60 * 1000)).length})</span>
                        </div>
                        <div className="flex items-center gap-2">
                            <span className="w-2.5 h-2.5 rounded-full bg-gray-300"></span>
                            <span className="text-xs font-bold text-gray-500">ออฟไลน์ ({techs.length - techs.filter(t => t.last_updated && new Date(t.last_updated) > new Date(Date.now() - 5 * 60 * 1000)).length})</span>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
