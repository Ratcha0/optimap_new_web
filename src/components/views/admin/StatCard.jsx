import React from 'react';

const StatCard = ({ label, value, sub, color }) => {
    const colors = {
        blue: 'bg-blue-50 text-blue-600',
        green: 'bg-emerald-50 text-emerald-600',
        orange: 'bg-orange-50 text-orange-600',
        purple: 'bg-purple-50 text-purple-600',
        cyan: 'bg-cyan-50 text-cyan-600'
    };

    return (
        <div className="bg-white p-2 sm:p-6 rounded-lg sm:rounded-3xl border border-gray-100 shadow-sm hover:shadow-md transition-shadow flex flex-col justify-between h-full min-w-0">
            <div className="min-w-0">
                <p className="text-[8px] sm:text-sm font-bold text-gray-400 uppercase tracking-tighter sm:tracking-wider mb-0 sm:mb-2 truncate">{label}</p>
                <div className="flex items-baseline gap-1">
                    <h3 className="text-base sm:text-4xl font-extrabold truncate">{value}</h3>
                    <span className="text-[7px] sm:text-sm text-gray-400 font-medium">{sub}</span>
                </div>
            </div>
            <div className={`h-0.5 sm:h-1 w-6 sm:w-12 mt-1.5 sm:mt-4 rounded-full ${colors[color].split(' ')[0]}`} />
        </div>
    );
};

export default StatCard;
