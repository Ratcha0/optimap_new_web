import React, { useEffect, useRef } from 'react';
import maplibregl from 'maplibre-gl';
import technicianCar from '../../assets/technicialcar.png';
import { EXTERNAL_LINKS } from '../../constants/api';
import { APP_THEME } from '../../constants/visuals';
import { getEngineStatusDisplay } from '../../utils/statusUtils';
import { createRoot } from 'react-dom/client';
import VehicleStatusDashboard from '../ui/VehicleStatusDashboard';

const AdminTechPopupContent = ({ tech }) => {
    const carStatusData = Array.isArray(tech.car_status) ? tech.car_status[0] : tech.car_status;
    const statusDisplay = carStatusData ? getEngineStatusDisplay(carStatusData) : null;

    return (
        <div className="p-1 flex flex-col gap-3 min-w-[280px] font-kanit">
             <div className="flex items-center gap-3">
                <img 
                    src={tech.avatar_url || EXTERNAL_LINKS.DEFAULT_AVATAR}
                    className="w-12 h-12 rounded-xl object-cover shadow-lg border-2 border-blue-500" 
                    onError={(e) => { 
                        if (e.target.src !== EXTERNAL_LINKS.DEFAULT_AVATAR) {
                            e.target.src = EXTERNAL_LINKS.DEFAULT_AVATAR; 
                        }
                    }}
                />
                <div className="min-w-0 flex-1">
                    <div className="text-[9px] font-black text-blue-500 uppercase tracking-widest leading-none mb-1">
                        {tech.is_primary ? 'ช่างรับงานหลัก' : 'ช่างเทคนิค'}
                    </div>
                    <div className="text-sm font-black text-gray-900 leading-none truncate">{tech.full_name}</div>
                    <div className="text-[9px] text-gray-400 font-bold mt-1">
                        {tech.team_name || 'ศูนย์บริการ'} • {tech.car_reg || 'ไม่ระบุทะเบียน'}
                    </div>
                </div>
            </div>

            {carStatusData && (
                <div className="bg-gray-50/50 rounded-xl p-0.5 border border-gray-100">
                    <VehicleStatusDashboard carStatus={carStatusData} />
                </div>
            )}

            {tech.phone && (
                <div className="pt-1.5 border-t border-gray-100">
                    <a href={`tel:${tech.phone}`}
                        className="flex w-full bg-green-600 hover:bg-green-500 text-white font-black h-9 rounded-xl text-[11px] items-center justify-center gap-2 transition-all active:scale-95 shadow-lg shadow-green-500/10 uppercase tracking-widest no-underline border-none cursor-pointer">
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
                        </svg>
                        ติดต่อเจ้าหน้าที่
                    </a>
                </div>
            )}
        </div>
    );
};

const TechnicianCarMarker = ({ map, tech, isAdminView = false }) => {
    const markerRef = useRef(null);

    useEffect(() => {
        if (!map || !tech?.last_lat || !tech?.last_lng) return;

        const firstName = tech.full_name?.split(' ')[0] || 'ช่าง';
        let labelHtml = `<div style="position:absolute;top:-22px;left:50%;transform:translateX(-50%);white-space:nowrap;background:rgba(255,255,255,0.95);color:#6b7280;font-size:9px;font-weight:800;padding:2px 8px;border-radius:10px;box-shadow:0 2px 6px rgba(0,0,0,0.1);border:1.5px solid #e5e7eb;letter-spacing:0.3px;">${firstName}</div>`;
        
        if (tech.is_primary && tech.active_ticket_id) {
            labelHtml = `<div style="position:absolute;top:-22px;left:50%;transform:translateX(-50%);white-space:nowrap;background:linear-gradient(135deg,#3b82f6,#6366f1);color:white;font-size:9px;font-weight:900;padding:2px 8px;border-radius:10px;box-shadow:0 2px 8px rgba(59,130,246,0.4);border:1.5px solid white;letter-spacing:0.3px;">ทีม: ${firstName}</div>`;
        }

        const el = document.createElement('div');
        el.className = 'tech-marker-premium-wrapper';
        el.innerHTML = `
            <div class="relative flex items-center justify-center cursor-pointer group" style="width: 60px; height: 60px;">
                <div class="absolute w-12 h-12 rounded-full opacity-20 animate-ping" style="background-color: ${APP_THEME.PRIMARY};"></div>
                <img src="${technicianCar}" class="w-14 h-14 object-contain filter drop-shadow-xl z-10 transition-transform group-hover:scale-110" />
                ${isAdminView ? labelHtml : ''}
            </div>
        `;

        const popupNode = document.createElement('div');
        popupNode.className = 'custom-popup-premium';
        const root = createRoot(popupNode);
        const popup = new maplibregl.Popup({ offset: 25, maxWidth: '300px', className: 'rounded-2xl' }).setDOMContent(popupNode);

        markerRef.current = new maplibregl.Marker({ element: el, anchor: 'center' })
            .setLngLat([tech.last_lng, tech.last_lat])
            .setPopup(popup)
            .addTo(map);

        popup.on('open', () => {
            root.render(<AdminTechPopupContent tech={tech} />);
        });

        return () => {
            if (markerRef.current) markerRef.current.remove();
            if (root) setTimeout(() => root.unmount(), 0);
        };
    }, [map, tech, isAdminView]);

    return null;
};

export default React.memo(TechnicianCarMarker);
