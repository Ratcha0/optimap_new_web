import React, { useState } from 'react';
import { Marker, useMapEvents } from 'react-leaflet';
import L from 'leaflet';
import { MAP_CONFIG } from '../../constants/visuals';
import { speak } from '../../utils/voiceUtils';

const BranchMarkers = ({ onNavigate, showToast }) => {
    const [activeBranchId, setActiveBranchId] = useState(null);

    const getBranchIcon = (branch, isActive) => {
        return L.divIcon({
            className: 'branch-marker-bubble',
            html: `
                <div class="relative flex flex-col items-center pb-2 cursor-pointer group pointer-events-auto">
                    <div class="bg-[#1e293b] px-3 py-1 rounded-3xl shadow-xl border border-white/10 flex flex-col items-center min-w-[70px] relative z-20 transition-all duration-300 group-hover:scale-110 group-hover:-translate-y-1">
                        <div class="flex flex-col items-center -space-y-0.5">
                            <span style="color: #fa7000; font-family: 'Impact', 'Arial Black', sans-serif; font-weight: 900; font-size: 13px; letter-spacing: -0.2px; line-height: 1; transform: scaleY(0.9);">ISUZU</span>
                            <span class="text-white font-bold text-[10px]" style="font-family: 'Kanit', sans-serif; letter-spacing: 0.5px;">ประชากิจ</span>
                        </div>
                        <div class="absolute -bottom-1.5 left-1/2 -translate-x-1/2 w-3 h-3 bg-[#1e293b] rotate-45 border-r border-b border-white/10 z-10"></div>
                    </div>
                    <div class="w-1.5 h-1.5 bg-blue-500 rounded-full border border-white shadow-sm mt-0.5 relative z-30 transition-transform duration-300 group-hover:scale-125"></div>

                    ${isActive ? `
                        <div class="absolute bottom-[130%] left-1/2 w-[270px] cursor-default" 
                             style="transform: translateX(-50%); transform-origin: bottom center; z-index: 50;">
                            <div class="p-4 text-center bg-white rounded-2xl shadow-2xl border border-gray-100 relative" style="font-family: 'Kanit', sans-serif;">
                                <button class="popup-close-btn absolute top-2 right-2 w-7 h-7 bg-gray-100 hover:bg-gray-200 rounded-full flex items-center justify-center text-gray-400 transition-colors border-none cursor-pointer">
                                    <svg class="w-4 h-4 pointer-events-none" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"></path></svg>
                                </button>
                                <div style="font-size: 14px; font-weight: 900; color: #2563eb; text-transform: uppercase; letter-spacing: 0.1em; margin-bottom: 4px;">สาขา</div>
                                <div style="font-size: 16px; font-weight: 900; color: #111827; line-height: 1.25; margin-bottom: 8px;">${branch.name}</div>
                                <div style="font-size: 12px; color: #9ca3af; font-weight: 700; margin-bottom: 16px; font-style: italic; display: flex; align-items: center; justify-content: center; gap: 4px;">
                                    <svg style="width: 12px; height: 12px;" fill="none" stroke="#22c55e" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"></path></svg>
                                    08:00 - 17:00 น.
                                </div>
                                ${branch.phone ? `
                                    <div style="display: flex; flex-direction: column; gap: 10px;">
                                        <button class="popup-call-btn" style="width: 100%; background: #22c55e; color: white; font-size: 13px; font-weight: 900; padding: 12px; border-radius: 12px; border: none; cursor: pointer; display: flex; align-items: center; justify-content: center; gap: 8px; text-transform: uppercase; letter-spacing: 0.05em; font-family: 'Kanit', sans-serif; box-shadow: 0 10px 15px -3px rgba(34,197,94,0.2);">
                                            <svg style="width: 16px; height: 16px;" class="pointer-events-none" fill="none" stroke="white" viewBox="0 0 24 24">
                                                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
                                            </svg>
                                            <span class="pointer-events-none">ติดต่อสาขา</span>
                                        </button>
                                        ${onNavigate ? `
                                            <button class="popup-nav-btn" style="width: 100%; background: #2563eb; color: white; font-size: 13px; font-weight: 900; padding: 12px; border-radius: 12px; border: none; cursor: pointer; display: flex; align-items: center; justify-content: center; gap: 8px; text-transform: uppercase; letter-spacing: 0.05em; font-family: 'Kanit', sans-serif; box-shadow: 0 10px 15px -3px rgba(37,99,235,0.2);">
                                                <svg style="width: 16px; height: 16px;" class="pointer-events-none" fill="none" stroke="white" viewBox="0 0 24 24">
                                                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                                                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                                                </svg>
                                                <span class="pointer-events-none">เริ่มนำทาง</span>
                                            </button>
                                        ` : ''}
                                    </div>
                                ` : ''}
                            </div>
                        </div>
                    ` : ''}
                </div>
            `,
            iconSize: [100, 60],
            iconAnchor: [50, 55]
        });
    };

    // Close popup when clicking map
    useMapEvents({
        click: () => setActiveBranchId(null)
    });

    return (
        <>
            {MAP_CONFIG.BRANCHES.map(branch => (
                <Marker
                    key={branch.id}
                    position={branch.position}
                    zIndexOffset={activeBranchId === branch.id ? 5000 : 2000}
                    icon={getBranchIcon(branch, activeBranchId === branch.id)}
                    eventHandlers={{
                        click: (e) => {
                            L.DomEvent.stopPropagation(e);
                            const target = e.originalEvent.target;
                            
                            // Close Button
                            if (target.closest('.popup-close-btn')) {
                                setActiveBranchId(null);
                                return;
                            }
                            // Navigate Button
                            if (target.closest('.popup-nav-btn')) {
                                if (onNavigate) {
                                    onNavigate(branch.position);
                                    setActiveBranchId(null);
                                    const msg = `เริ่มนำทางไปที่สาขา ${branch.name} ค่ะ`;
                                    if (showToast) showToast(msg, 'info');
                                    speak(msg);
                                }
                                return;
                            }
                            // Call Button
                            if (target.closest('.popup-call-btn')) {
                                window.location.href = `tel:${branch.phone}`;
                                return;
                            }
                            
                            // Toggle popup
                            setActiveBranchId(prev => prev === branch.id ? null : branch.id);
                        }
                    }}
                />
            ))}
        </>
    );
};

export default React.memo(BranchMarkers);
