import React from 'react';
import { TICKET_STATUS } from '../../constants/visuals';

export default function StatusBadge({ status }) {
    const config = TICKET_STATUS[status?.toUpperCase()];

    if (!config) {
        return (
            <div className="px-4 py-1.5 rounded-full text-[10px] font-black text-white flex items-center gap-2 uppercase tracking-widest shadow-lg shadow-gray-200 bg-gray-500">
                <span className="text-sm leading-none">❓</span>
                <span>ไม่ระบุ</span>
            </div>
        );
    }

    let icon = '❓';
    if (status === 'pending') icon = '⏳';
    if (status === 'accepted') icon = '📝';
    if (status === 'in_progress') icon = '🚚';
    if (status === 'completed') icon = '✅';

    return (
        <div
            className="px-4 py-1.5 rounded-full text-[10px] font-black text-white flex items-center gap-2 uppercase tracking-widest shadow-lg shadow-gray-200 transition-all hover:scale-105"
            style={{ backgroundColor: config.hex }}
        >
            <span className="text-sm leading-none">{icon}</span>
            <span>{config.label}</span>
        </div>
    );
}
