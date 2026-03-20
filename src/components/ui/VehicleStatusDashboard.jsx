import React from 'react';
import { 
    FiThermometer, FiZap, FiActivity, FiNavigation, FiDroplet, 
    FiWind, FiClock, FiCpu, FiAlertCircle, FiTag, FiBarChart2 
} from 'react-icons/fi';
import { getEngineStatusDisplay, STATUS_THRESHOLDS } from '../../utils/statusUtils';
import VehicleGauge from './VehicleGauge';

const VehicleStatusDashboard = ({ carStatus }) => {
    if (!carStatus) return null;

    const status = getEngineStatusDisplay(carStatus);

    const formatRuntime = (seconds) => {
        if (!seconds) return '0h 0m';
        const h = Math.floor(seconds / 3600);
        const m = Math.floor((seconds % 3600) / 60);
        return `${h}h ${m}m`;
    };

    return (
        <div className="bg-white rounded-2xl p-2 sm:p-4 border border-gray-100 shadow-sm space-y-3 sm:space-y-4 font-kanit w-full">
            <div className="flex items-center justify-between border-b border-gray-50 pb-2">
                <div className="flex flex-col">
                    <span className="text-[11px] sm:text-xs font-black text-gray-400 uppercase tracking-widest">เลขตัวถัง (VIN)</span>
                    <span className="text-sm sm:text-base font-black text-blue-600 font-mono">{carStatus.vin || 'N/A'}</span>
                </div>
                <div className="flex items-center gap-2 bg-gray-50 px-3 py-1.5 rounded-xl">
                    <span className={`w-2.5 h-2.5 rounded-full ${status.dot} animate-pulse`}></span>
                    <span className={`${status.color} text-[11px] sm:text-xs font-black uppercase`}>{status.text}</span>
                </div>
            </div>

            <div className="flex justify-around items-center py-2 bg-gray-50/50 rounded-2xl">
                <VehicleGauge 
                    value={carStatus.vehicle_speed || 0} 
                    label="SPEED" 
                    unit="KM/H" 
                    max={220}
                    color="#3b82f6"
                    size={window.innerWidth >= 768 ? 120 : 100}
                />
                <VehicleGauge 
                    value={carStatus.rpm || 0} 
                    label="RPM" 
                    unit="x1000" 
                    max={8000}
                    color="#6366f1"
                    size={window.innerWidth >= 768 ? 120 : 100}
                />
            </div>

            <div className="grid grid-cols-3 gap-2">
                <StatItem icon={<FiCpu />} label="Load" value={`${Math.round(carStatus.engine_load || 0)}%`} color="text-orange-500" />
                <StatItem icon={<FiActivity />} label="Throttle" value={`${Math.round(carStatus.throttle_pos || 0)}%`} color="text-emerald-500" />
                <StatItem icon={<FiClock />} label="Runtime" value={formatRuntime(carStatus.engine_runtime)} color="text-purple-500" />
                
                <StatItem icon={<FiThermometer />} label="Coolant" value={`${Math.round(carStatus.engine_temp || 0)}°C`} color="text-rose-500" highlight={carStatus.engine_temp > STATUS_THRESHOLDS.ENGINE_TEMP} />
                <StatItem icon={<FiWind />} label="Intake" value={`${Math.round(carStatus.intake_air_temp || 0)}°C`} color="text-blue-400" />
                <StatItem icon={<FiThermometer />} label="Oil Temp" value={`${Math.round(carStatus.oil_temp || 0)}°C`} color="text-amber-600" />
                
                <StatItem icon={<FiWind />} label="Ambient" value={`${Math.round(carStatus.ambient_temp || 0)}°C`} color="text-teal-500" />
                <StatItem icon={<FiBarChart2 />} label="Baro" value={`${(carStatus.barometric_pressure || 0).toFixed(1)}`} color="text-gray-500" unit="kPa" />
                <StatItem icon={<FiDroplet />} label="Fuel Rate" value={`${(carStatus.fuel_rate || 0).toFixed(1)}`} color="text-orange-600" unit="L/h" />
            </div>

            <div className="space-y-2 pt-2 border-t border-gray-50">
                <ProgressBar label="น้ำหม้อน้ำ" value={carStatus.water_level} color="bg-blue-500" threshold={STATUS_THRESHOLDS.WATER_LEVEL} />
                <ProgressBar label="น้ำมันเครื่อง" value={carStatus.oil_level} color="bg-amber-800" threshold={STATUS_THRESHOLDS.OIL_LEVEL} />
                <ProgressBar label="เชื้อเพลิง" value={carStatus.fuel_level} color="bg-orange-500" threshold={STATUS_THRESHOLDS.FUEL_LEVEL} />
            </div>

            {carStatus.distance_since_mil > 0 && (
                <div className="flex items-center gap-2 bg-rose-50 p-2 rounded-xl border border-rose-100">
                    <FiAlertCircle className="text-rose-500" size={14} />
                    <span className="text-[10px] font-bold text-rose-700">Distance since MIL: {carStatus.distance_since_mil} KM</span>
                </div>
            )}
        </div>
    );
};

const StatItem = ({ icon, label, value, color, unit, highlight }) => (
    <div className="flex flex-col items-center p-2 sm:p-3 bg-gray-50/50 rounded-2xl border border-gray-100 transition-all hover:bg-gray-100/80">
        <div className={`flex items-center gap-1.5 ${color} opacity-90 mb-1.5`}>
            {React.cloneElement(icon, { size: 14 })}
            <span className="text-[9px] sm:text-[10px] font-black uppercase tracking-widest">{label}</span>
        </div>
        <div className={`text-xs sm:text-base font-black ${highlight ? 'text-rose-600 animate-pulse' : 'text-gray-900'} leading-none`}>
            {value} <span className="text-[9px] font-bold text-gray-400">{unit}</span>
        </div>
    </div>
);

const ProgressBar = ({ label, value, color, threshold }) => (
    <div className="space-y-1.5">
        <div className="flex justify-between text-[10px] sm:text-xs font-black text-gray-500 uppercase tracking-widest px-1">
            <span>{label}</span>
            <span className={value < threshold ? "text-rose-600 font-black animate-pulse" : "text-gray-700"}>{Math.round(value || 0)}%</span>
        </div>
        <div className="h-2 w-full bg-gray-100 rounded-full overflow-hidden border border-gray-50 p-0.5">
            <div
                className={`h-full transition-all duration-1000 rounded-full ${value < threshold ? 'bg-rose-500 shadow-lg shadow-rose-200' : color + ' shadow-sm'}`}
                style={{ width: `${value || 0}%` }}
            ></div>
        </div>
    </div>
);

export default VehicleStatusDashboard;
