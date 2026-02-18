import React from 'react';

export default function ManeuverIcon({ maneuver, className = "w-6 h-6" }) {
    if (!maneuver) {
        return (
            <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M5 10l7-7m0 0l7 7m-7-7v18" />
            </svg>
        );
    }

    const { type, modifier } = maneuver;

    if (modifier === 'straight') {
        return (
            <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M5 10l7-7m0 0l7 7m-7-7v18" />
            </svg>
        );
    }

    if (type === 'arrive') {
        return (
            <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
            </svg>
        );
    }

    if (type && (type.includes('roundabout') || type.includes('rotary'))) {
        return (
            <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M12 2v4m0 12v4M2 12h4m12 0h4" />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M12 7a5 5 0 100 10 5 5 0 000-10z" />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M12 7l3 3m-3-3l-3 3" />
            </svg>
        );
    }

    if (modifier === 'uturn') {
        return (
            <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M10 19V9a5 5 0 0110 0v10m-3-3l3 3 3-3" />
            </svg>
        );
    }

    if (type === 'ramp' || type === 'on ramp' || type === 'off ramp') {
        return (
            <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M6 18l6-6m0 0l6-6m-6 6h12" />
            </svg>
        );
    }

    switch (modifier) {
        case 'sharp left':
        case 'left':
            return (
                <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M10 19l-7-7m0 0l7-7m-7 7h18" />
                </svg>
            );
        case 'slight left':
            return (
                <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M12 19l-5-5m0 0l5-5m-5 5h14" transform="rotate(45 12 12)" />
                </svg>
            );
        case 'sharp right':
        case 'right':
            return (
                <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M14 5l7 7m0 0l-7 7m7-7H3" />
                </svg>
            );
        case 'slight right':
            return (
                <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M12 5l5 5m0 0l-5 5m5-5H3" transform="rotate(-45 12 12)" />
                </svg>
            );
        default:
            return (
                <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M5 10l7-7m0 0l7 7m-7-7v18" />
                </svg>
            );
    }
}
