import React from 'react';

const VehicleGauge = ({ 
    value = 0, 
    min = 0, 
    max = 200, 
    label = "", 
    unit = "", 
    color = "#3b82f6",
    size = 120 
}) => {
    const radius = size * 0.4;
    const center = size / 2;
    const circumference = 2 * Math.PI * radius;
    const progress = Math.min(Math.max((value - min) / (max - min), 0), 1);
    const strokeDashoffset = circumference * (1 - progress * 0.75);
    const rotation = -225;

    return (
        <div className="flex flex-col items-center justify-center relative" style={{ width: size, height: size }}>
            <svg width={size} height={size} className="transform rotate-0">
                <circle
                    cx={center}
                    cy={center}
                    r={radius}
                    fill="none"
                    stroke="#e5e7eb"
                    strokeWidth={size * 0.08}
                    strokeDasharray={circumference}
                    strokeDashoffset={circumference * 0.25}
                    strokeLinecap="round"
                    style={{
                        transform: `rotate(${rotation}deg)`,
                        transformOrigin: '50% 50%'
                    }}
                />
                <circle
                    cx={center}
                    cy={center}
                    r={radius}
                    fill="none"
                    stroke={color}
                    strokeWidth={size * 0.08}
                    strokeDasharray={circumference}
                    strokeDashoffset={strokeDashoffset}
                    strokeLinecap="round"
                    className="transition-all duration-1000 ease-out"
                    style={{
                        transform: `rotate(${rotation}deg)`,
                        transformOrigin: '50% 50%'
                    }}
                />
            </svg>
            <div className="absolute inset-0 flex flex-col items-center justify-center pt-2">
                <span className="text-xl sm:text-2xl font-black text-gray-900 leading-none tracking-tight">
                    {Math.round(value)}
                </span>
                <span className="text-[10px] sm:text-xs font-bold text-gray-400 uppercase tracking-tighter mt-1">
                    {unit}
                </span>
                <span className="text-[10px] sm:text-[11px] font-black text-blue-500 uppercase tracking-widest mt-1.5 opacity-80">
                    {label}
                </span>
            </div>
        </div>
    );
};

export default VehicleGauge;
