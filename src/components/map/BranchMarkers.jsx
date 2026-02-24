import React, { useEffect, useRef } from 'react';
import maplibregl from 'maplibre-gl';
import { MAP_CONFIG } from '../../constants/visuals';
import { speak } from '../../utils/voiceUtils';

const BranchMarkers = ({ map, onNavigate, showToast }) => {
    const markersRef = useRef({});

    useEffect(() => {
        if (!map) return;

        MAP_CONFIG.BRANCHES.forEach(branch => {
            const el = document.createElement('div');
            el.className = 'branch-marker-bubble-wrapper';
            el.innerHTML = `
                <div class="relative flex flex-col items-center pb-2 cursor-pointer group">
                    <div class="bg-[#1e293b] px-3 py-1 rounded-3xl shadow-xl border border-white/10 flex flex-col items-center min-w-[70px] relative z-20 transition-all duration-300 group-hover:scale-110 group-hover:-translate-y-1">
                        <div class="flex flex-col items-center -space-y-0.5 pointer-events-none">
                            <span style="color: #fa7000; font-family: 'Impact', 'Arial Black', sans-serif; font-weight: 900; font-size: 13px; letter-spacing: -0.2px; line-height: 1; transform: scaleY(0.9);">ISUZU</span>
                            <span class="text-white font-bold text-[10px]" style="font-family: 'Kanit', sans-serif; letter-spacing: 0.5px;">ประชากิจ</span>
                        </div>
                        <div class="absolute -bottom-1.5 left-1/2 -translate-x-1/2 w-3 h-3 bg-[#1e293b] rotate-45 border-r border-b border-white/10 z-10 pointer-events-none"></div>
                    </div>
                    <div class="w-1.5 h-1.5 bg-blue-500 rounded-full border border-white shadow-sm mt-0.5 relative z-30 transition-transform duration-300 group-hover:scale-125 pointer-events-none"></div>
                </div>
            `;

            const popupContent = `
                <div class="p-4 text-center bg-white rounded-2xl relative" style="font-family: 'Kanit', sans-serif; min-width: 250px;">
                    <div style="font-size: 14px; font-weight: 900; color: #2563eb; text-transform: uppercase; letter-spacing: 0.1em; margin-bottom: 4px;">สาขา</div>
                    <div style="font-size: 16px; font-weight: 900; color: #111827; line-height: 1.25; margin-bottom: 8px;">${branch.name}</div>
                    <div style="font-size: 12px; color: #9ca3af; font-weight: 700; margin-bottom: 16px; font-style: italic; display: flex; align-items: center; justify-content: center; gap: 4px;">
                        <svg style="width: 12px; height: 12px;" fill="none" stroke="#22c55e" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"></path></svg>
                        08:00 - 17:00 น.
                    </div>
                    <div style="display: flex; flex-direction: column; gap: 10px;">
                        <button class="branch-call-btn" style="width: 100%; background: #22c55e; color: white; font-size: 13px; font-weight: 900; padding: 12px; border-radius: 12px; border: none; cursor: pointer; display: flex; align-items: center; justify-content: center; gap: 8px; text-transform: uppercase; letter-spacing: 0.05em; font-family: 'Kanit', sans-serif; box-shadow: 0 10px 15px -3px rgba(34,197,94,0.2);">
                            <span>ติดต่อสาขา</span>
                        </button>
                        ${onNavigate ? `
                            <button class="branch-nav-btn" style="width: 100%; background: #2563eb; color: white; font-size: 13px; font-weight: 900; padding: 12px; border-radius: 12px; border: none; cursor: pointer; display: flex; align-items: center; justify-content: center; gap: 8px; text-transform: uppercase; letter-spacing: 0.05em; font-family: 'Kanit', sans-serif; box-shadow: 0 10px 15px -3px rgba(37,99,235,0.2);">
                                <span>เริ่มนำทาง</span>
                            </button>
                        ` : ''}
                    </div>
                </div>
            `;

            const popup = new maplibregl.Popup({ offset: 25, closeButton: true })
                .setHTML(popupContent);

            const marker = new maplibregl.Marker({ element: el, anchor: 'bottom' })
                .setLngLat([branch.position[1], branch.position[0]])
                .setPopup(popup)
                .addTo(map);

            popup.on('open', () => {
                const callBtn = popup.getElement().querySelector('.branch-call-btn');
                const navBtn = popup.getElement().querySelector('.branch-nav-btn');
                
                if (callBtn) callBtn.onclick = () => window.location.href = `tel:${branch.phone}`;
                if (navBtn) navBtn.onclick = () => {
                    onNavigate(branch.position);
                    popup.remove();
                    const msg = `เริ่มนำทางไปที่สาขา ${branch.name} ค่ะ`;
                    if (showToast) showToast(msg, 'info');
                    speak(msg);
                };
            });

            markersRef.current[branch.id] = marker;
        });

        return () => {
            Object.values(markersRef.current).forEach(m => m.remove());
            markersRef.current = {};
        };
    }, [map, onNavigate, showToast]);

    return null;
};

export default React.memo(BranchMarkers);
