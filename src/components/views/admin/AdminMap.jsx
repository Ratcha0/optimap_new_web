import React, { useState, useEffect, useRef } from 'react';
import maplibregl from 'maplibre-gl';
import 'maplibre-gl/dist/maplibre-gl.css';
import { MAP_CONFIG } from '../../../constants/visuals';
import BranchMarkers from '../../map/BranchMarkers';
import TechnicianCarMarker from '../../map/TechnicianCarMarker';
import { useToast } from '../../ui/ToastNotification';

export default function AdminMap({ techs = [] }) {
    const mapContainer = useRef(null);
    const map = useRef(null);
    const [mapReady, setMapReady] = useState(false);
    const { showToast } = useToast();

    useEffect(() => {
        if (!mapContainer.current || map.current) return;

        map.current = new maplibregl.Map({
            container: mapContainer.current,
            style: {
                version: 8,
                sources: {
                    'osm': {
                        type: 'raster',
                        tiles: ['https://tile.openstreetmap.org/{z}/{x}/{y}.png'],
                        tileSize: 256
                    }
                },
                layers: [{ id: 'osm', type: 'raster', source: 'osm' }]
            },
            center: [MAP_CONFIG.DEFAULT_CENTER[1], MAP_CONFIG.DEFAULT_CENTER[0]],
            zoom: 10,
            pitch: 45
        });

        map.current.on('load', () => setMapReady(true));

        return () => {
            if (map.current) {
                map.current.remove();
                map.current = null;
            }
        };
    }, []);

    const onlineTechs = techs.filter(t => t.last_updated && new Date(t.last_updated) > new Date(Date.now() - 5 * 60 * 1000));

    return (
        <div className="w-full h-[600px] rounded-3xl overflow-hidden border border-gray-100 shadow-inner relative bg-gray-900">
            <div ref={mapContainer} className="w-full h-full" />
            
            {mapReady && (
                <>
                    <BranchMarkers map={map.current} showToast={showToast} />
                    {techs.filter(tech => !tech.active_ticket_id || tech.is_primary).map(tech => (
                        <TechnicianCarMarker key={tech.id} map={map.current} tech={tech} isAdminView={true} />
                    ))}
                </>
            )}

            <div className="absolute top-4 left-4 z-[1000] flex flex-col gap-2 pointer-events-none">
                <div className="bg-white/90 backdrop-blur-md p-3 rounded-2xl shadow-xl border border-white/50 min-w-[150px] pointer-events-auto">
                    <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2 font-kanit">สถานะช่าง (ปัจจุบัน)</p>
                    <div className="space-y-1.5 font-kanit">
                        <div className="flex items-center gap-2">
                            <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 shadow-[0_0_10px_rgba(16,185,129,0.5)]"></span>
                            <span className="text-xs font-bold text-gray-700">ออนไลน์ ({onlineTechs.length})</span>
                        </div>
                        <div className="flex items-center gap-2">
                            <span className="w-2.5 h-2.5 rounded-full bg-gray-300"></span>
                            <span className="text-xs font-bold text-gray-500">ออฟไลน์ ({techs.length - onlineTechs.length})</span>
                        </div>
                    </div>
                </div>
            </div>

            <style>{`
                .maplibregl-popup {
                    z-index: 5000 !important;
                }
                .maplibregl-popup-content {
                    padding: 0 !important;
                    border-radius: 20px !important;
                    overflow: hidden;
                    box-shadow: 0 10px 25px rgba(0,0,0,0.1) !important;
                }
                .maplibregl-popup-close-button {
                    width: 24px;
                    height: 24px;
                    background: white !important;
                    border-radius: 50% !important;
                    top: 8px !important;
                    right: 8px !important;
                    box-shadow: 0 2px 5px rgba(0,0,0,0.1) !important;
                    color: #9ca3af !important;
                    display: flex !important;
                    align-items: center !important;
                    justify-content: center !important;
                    z-index: 100 !important;
                    border: none !important;
                    font-size: 16px !important;
                }
                .maplibregl-popup-close-button:hover {
                    background-color: #f3f4f6 !important;
                    color: #111827 !important;
                }
            `}</style>
        </div>
    );
}
