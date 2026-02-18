import React from 'react';
import { Marker, Popup } from 'react-leaflet';
import L from 'leaflet';
import technicianCar from '../../assets/technicialcar.png';
import { EXTERNAL_LINKS } from '../../constants/api';
import { APP_THEME } from '../../constants/visuals';

import VehicleStatusDashboard from '../ui/VehicleStatusDashboard';
import { getEngineStatusDisplay } from '../../utils/statusUtils';

import { FiUsers } from 'react-icons/fi';

const TechnicianCarMarker = ({ tech, allTechs = [], onOpenInvite, onMapInteract, isAdminView = false }) => {
    if (!tech?.last_lat || !tech?.last_lng) return null;

    const teammates = allTechs.filter(t => 
        t.active_ticket_id && 
        t.active_ticket_id === tech.active_ticket_id &&
        t.id !== tech.id
    );
    
    const displayList = teammates.length > 0 ? [tech, ...teammates] : [tech];


    let labelHtml = '';
    if (isAdminView) {
        const firstName = tech.full_name?.split(' ')[0] || 'ช่าง';
        if (tech.is_primary && tech.active_ticket_id) {
            const memberCount = tech.team_member_count || 0;
            const countBadge = memberCount > 0 ? `<span style="background:#818cf8;color:white;padding:0 4px;border-radius:6px;font-size:8px;margin-left:3px;">+${memberCount}</span>` : '';
            labelHtml = `<div style="position:absolute;bottom:-18px;left:50%;transform:translateX(-50%);white-space:nowrap;background:linear-gradient(135deg,#3b82f6,#6366f1);color:white;font-size:9px;font-weight:900;padding:2px 8px;border-radius:10px;box-shadow:0 2px 8px rgba(59,130,246,0.4);border:1.5px solid white;letter-spacing:0.3px;">ทีม: ${firstName}${countBadge}</div>`;
        } else if (tech.team_leader_name) {
            const leaderFirst = tech.team_leader_name.split(' ')[0];
            labelHtml = `<div style="position:absolute;bottom:-18px;left:50%;transform:translateX(-50%);white-space:nowrap;background:linear-gradient(135deg,#8b5cf6,#a855f7);color:white;font-size:9px;font-weight:900;padding:2px 8px;border-radius:10px;box-shadow:0 2px 8px rgba(139,92,246,0.4);border:1.5px solid white;letter-spacing:0.3px;">หน.${leaderFirst}</div>`;
        } else {
            labelHtml = `<div style="position:absolute;bottom:-18px;left:50%;transform:translateX(-50%);white-space:nowrap;background:rgba(255,255,255,0.95);color:#6b7280;font-size:9px;font-weight:800;padding:2px 8px;border-radius:10px;box-shadow:0 2px 6px rgba(0,0,0,0.1);border:1.5px solid #e5e7eb;letter-spacing:0.3px;">${firstName}</div>`;
        }
    }

    const carIcon = L.divIcon({
        className: 'tech-marker-premium',
        html: `
            <div class="relative flex items-center justify-center cursor-pointer group" style="width: 60px; height: ${isAdminView ? '80' : '60'}px; pointer-events: auto;">
                <div class="absolute w-12 h-12 rounded-full opacity-20 animate-ping" style="background-color: ${APP_THEME.PRIMARY}; top: 0;"></div>
                <div class="w-14 h-14 relative z-10 flex items-center justify-center transition-transform group-hover:scale-110" style="top: 0;">
                    <img src="${technicianCar}" class="w-full h-full object-contain filter drop-shadow-xl pointer-events-none" />
                </div>
                ${labelHtml}
            </div>
        `,
        iconSize: [60, isAdminView ? 80 : 60],
        iconAnchor: [30, isAdminView ? 40 : 30]
    });

    const carStatusData = Array.isArray(tech.car_status) ? tech.car_status[0] : tech.car_status;
    const statusDisplay = carStatusData ? getEngineStatusDisplay(carStatusData) : null;

    return (
        <Marker
            position={[tech.last_lat, tech.last_lng]}
            icon={carIcon}
            riseOnHover={true}
            zIndexOffset={tech.is_primary ? 2000 : 1000}
            eventHandlers={{
                popupopen: () => onMapInteract?.('start')
            }}
        >
            <Popup className="rounded-2xl overflow-hidden shadow-2xl border-none" autoPan={false} autoPanPadding={[50, 50]}>
                <div className="p-3 flex flex-col gap-3 min-w-[280px] max-h-[60vh] overflow-y-auto thin-scrollbar">
                    <div className="flex items-center gap-3">
                        <div className="relative">
                            <img 
                                src={tech.avatar_url || EXTERNAL_LINKS.DEFAULT_AVATAR}
                                className={`w-12 h-12 rounded-xl object-cover shadow-lg border-2 ${tech.is_primary ? 'border-blue-500' : 'border-indigo-400'}`} 
                                onError={(e) => {
                                    e.target.src = EXTERNAL_LINKS.DEFAULT_AVATAR;
                                }}
                            />
                        </div>
                        <div className="min-w-0">
                            <div className="text-[9px] font-black text-blue-500 uppercase tracking-widest leading-none mb-1">
                                {tech.is_primary && tech.active_ticket_id ? 'ช่างรับงานหลัก' :
                                 tech.team_leader_name ? 'ช่างร่วมทีม' : 
                                 tech.active_ticket_id ? 'ช่างรับงานหลัก' : 'ช่างเทคนิค'}
                            </div>
                            <div className="text-sm font-black text-gray-900 leading-none truncate max-w-[160px]">{tech.full_name}</div>
                            <div className="text-[9px] text-gray-400 font-bold mt-1">
                                {tech.team_name || 'ศูนย์บริการ'} • {tech.car_reg || 'ไม่ระบุทะเบียน'}
                            </div>
                        </div>
                    </div>

                    {teammates.length > 0 ? (
                        <details className="group/status">
                            <summary className="list-none cursor-pointer">
                                <div className="flex items-center justify-between text-[9px] font-black text-gray-400 uppercase tracking-widest bg-gray-50 p-2 rounded-lg mb-1.5 hover:bg-gray-100 transition-colors">
                                    <div className="flex items-center gap-2">
                                        <span>สถานะรถยนต์</span>
                                        {statusDisplay && (
                                            <div className="flex items-center gap-1 px-1.5 py-0.5 bg-white rounded shadow-sm border border-gray-100">
                                                <span className={`w-1 h-1 rounded-full ${statusDisplay.dot} ${!statusDisplay.isCritical ? 'animate-pulse' : ''}`}></span>
                                                <span className={`${statusDisplay.color} font-bold text-[8px]`}>{statusDisplay.text}</span>
                                            </div>
                                        )}
                                    </div>
                                    <svg className="w-3 h-3 transform group-open/status:rotate-180 transition-transform text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M19 9l-7 7-7-7" />
                                    </svg>
                                </div>
                            </summary>
                            <div className="bg-gray-50/50 rounded-xl p-0.5 border border-gray-100 mb-1.5">
                                <VehicleStatusDashboard carStatus={carStatusData} isCollapsible={true} />
                            </div>
                        </details>
                    ) : (
                        <div className="bg-gray-50/50 rounded-xl p-0.5 border border-gray-100">
                            <VehicleStatusDashboard carStatus={carStatusData} />
                        </div>
                    )}

                    {teammates.length > 0 && tech.active_ticket_id && (
                        <details className="group/team" open>
                            <summary className="list-none cursor-pointer mb-1.5">
                                <div className="flex items-center justify-between text-[9px] font-black text-gray-400 uppercase tracking-widest px-1 hover:text-gray-600 transition-colors">
                                    <span>สมาชิกทีม ({displayList.length})</span>
                                    <svg className="w-3 h-3 transform group-open/team:rotate-180 transition-transform text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M19 9l-7 7-7-7" />
                                    </svg>
                                </div>
                            </summary>
                            <div className="flex flex-col gap-1.5 max-h-[100px] overflow-y-auto pr-1">
                                {displayList.map(member => (
                                    <div key={member.id} className={`flex items-center gap-2 p-1 rounded-lg transition-colors ${member.id === tech.id ? 'bg-blue-50 border border-blue-100' : 'bg-white border border-gray-100'}`}>
                                        <img 
                                            src={member.avatar_url || EXTERNAL_LINKS.DEFAULT_AVATAR} 
                                            className="w-7 h-7 rounded object-cover shadow-sm shrink-0"
                                            onError={(e) => {
                                                e.target.src = EXTERNAL_LINKS.DEFAULT_AVATAR;
                                            }}
                                        />
                                        <div className="flex-1 min-w-0">
                                            <div className="text-[10px] font-black text-gray-900 truncate flex items-center gap-1">
                                                {member.full_name}
                                                {member.is_primary && <span className="text-[7px] bg-blue-100 text-blue-600 px-1 rounded shrink-0 font-bold uppercase">หลัก</span>}
                                            </div>
                                            <div className="text-[8px] text-gray-400 font-bold leading-none">{member.car_reg}</div>
                                        </div>
                                        {member.phone && (
                                            <a href={`tel:${member.phone}`} className="p-1 bg-green-500 rounded-md hover:bg-green-600 transition-all shrink-0">
                                                <svg className="w-3 h-3" fill="none" stroke="white" viewBox="0 0 24 24">
                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
                                                </svg>
                                            </a>
                                        )}
                                    </div>
                                ))}
                            </div>
                        </details>
                    )}

                    <div className="pt-1.5 border-t border-gray-100">
                        {!tech.is_me && tech.phone && (
                            <a href={`tel:${tech.phone}`}
                                style={{ color: 'white' }}
                                className="w-full bg-green-600 hover:bg-green-500 text-white font-black h-10 rounded-xl text-[12px] flex items-center justify-center gap-2 transition-all active:scale-95 shadow-lg shadow-green-500/10 uppercase tracking-widest no-underline border-none cursor-pointer">
                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
                                </svg>
                                ติดต่อช่าง
                            </a>
                        )}
                    </div>
                </div>
            </Popup>
        </Marker>
    );
};


export default React.memo(TechnicianCarMarker);
