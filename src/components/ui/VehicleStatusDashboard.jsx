import React from 'react';
import { FiThermometer, FiZap, FiActivity, FiNavigation, FiDroplet } from 'react-icons/fi';
import { getEngineStatusDisplay, STATUS_THRESHOLDS } from '../../utils/statusUtils';

const VehicleStatusDashboard = ({ carStatus, isCollapsible = false }) => {
    if (!carStatus) return null;

    const status = getEngineStatusDisplay(carStatus);

    return (
        <div className="bg-gray-50 rounded-xl p-2 border border-gray-100 space-y-2">
            {!isCollapsible && (
                <div className="flex items-center justify-between text-[8px] font-black text-gray-400 uppercase tracking-widest border-b border-gray-200 pb-1 mb-0.5">
                    <span>สถานะรถยนต์</span>
                    <div className="flex items-center gap-1">
                        <span className={`w-1 h-1 rounded-full ${status.dot} ${!status.isCritical ? 'animate-pulse' : ''}`}></span>
                        <span className={`${status.color} font-black`}>{status.text}</span>
                    </div>
                </div>
            )}

            <div className="grid grid-cols-2 gap-2">
                <div className="space-y-0.5">
                    <div className="flex items-center gap-1 text-gray-400">
                        <FiThermometer size={11} className={carStatus.engine_temp > STATUS_THRESHOLDS.ENGINE_TEMP ? "text-rose-500" : "text-blue-500"} />
                        <span className="text-[8px] font-black uppercase tracking-tighter">ความร้อน</span>
                    </div>
                    <div className={`text-xs font-black ${carStatus.engine_temp > STATUS_THRESHOLDS.ENGINE_TEMP ? "text-rose-500 animate-pulse" : "text-gray-900"}`}>
                        {carStatus.engine_temp?.toFixed(1) || '0.0'}°C
                    </div>
                </div>

                <div className="space-y-0.5 border-l border-gray-200 pl-2">
                    <div className="flex items-center gap-1 text-gray-400">
                        <FiZap size={11} className={carStatus.battery_volt < STATUS_THRESHOLDS.BATTERY_VOLT ? "text-rose-500" : "text-amber-500"} />
                        <span className="text-[8px] font-black uppercase tracking-tighter">แบตเตอรี่</span>
                    </div>
                    <div className={`text-xs font-black ${carStatus.battery_volt < STATUS_THRESHOLDS.BATTERY_VOLT ? "text-rose-500" : "text-gray-900"}`}>
                        {carStatus.battery_volt?.toFixed(1) || '0.0'}V
                    </div>
                </div>

                <div className="space-y-0.5">
                    <div className="flex items-center gap-1 text-gray-400">
                        <FiNavigation size={11} className="text-indigo-500" />
                        <span className="text-[8px] font-black uppercase tracking-tighter">ความเร็ว</span>
                    </div>
                    <div className="text-xs font-black text-gray-900 leading-none">
                        {Math.round(carStatus.vehicle_speed || 0)} KM/H
                    </div>
                </div>

                <div className="space-y-0.5 border-l border-gray-200 pl-2">
                    <div className="flex items-center gap-1 text-gray-400">
                        <FiActivity size={11} className="text-emerald-500" />
                        <span className="text-[8px] font-black uppercase tracking-tighter">เลขไมล์</span>
                    </div>
                    <div className="text-xs font-black text-gray-900 truncate">
                        {(carStatus.odometer || 0).toLocaleString()} <span className="text-[7px]">KM</span>
                    </div>
                </div>
            </div>

            <div className="space-y-2 pt-0.5">
                <div className="space-y-1">
                    <div className="flex justify-between text-[8px] font-black text-gray-400 uppercase tracking-tighter">
                        <div className="flex items-center gap-1">
                            <FiDroplet size={10} className="text-blue-500" />
                            <span>น้ำหม้อน้ำ</span>
                        </div>
                        <span className={carStatus.water_level < STATUS_THRESHOLDS.WATER_LEVEL ? "text-rose-600 font-black" : "text-gray-600"}>
                            {Math.round(carStatus.water_level || 0)}%
                        </span>
                    </div>
                    <div className="h-1 bg-gray-200 rounded-full overflow-hidden">
                        <div
                            className={`h-full transition-all duration-500 rounded-full ${carStatus.water_level < STATUS_THRESHOLDS.WATER_LEVEL ? 'bg-rose-500' : 'bg-blue-500'}`}
                            style={{ width: `${carStatus.water_level || 0}%` }}
                        ></div>
                    </div>
                </div>

                <div className="space-y-1">
                    <div className="flex justify-between text-[8px] font-black text-gray-400 uppercase tracking-tighter">
                        <div className="flex items-center gap-1">
                            <FiDroplet size={10} className="text-amber-700" />
                            <span>น้ำมันเครื่อง</span>
                        </div>
                        <span className={carStatus.oil_level < STATUS_THRESHOLDS.OIL_LEVEL ? "text-rose-600 font-black" : "text-gray-600"}>
                            {Math.round(carStatus.oil_level || 0)}%
                        </span>
                    </div>
                    <div className="h-1 bg-gray-200 rounded-full overflow-hidden">
                        <div
                            className={`h-full transition-all duration-500 rounded-full ${carStatus.oil_level < STATUS_THRESHOLDS.OIL_LEVEL ? 'bg-rose-500' : 'bg-amber-800'}`}
                            style={{ width: `${carStatus.oil_level || 0}%` }}
                        ></div>
                    </div>
                </div>

                <div className="space-y-1">
                    <div className="flex justify-between text-[8px] font-black text-gray-400 uppercase tracking-tighter">
                        <div className="flex items-center gap-1">
                            <FiDroplet size={10} className="text-orange-500" />
                            <span>เชื้อเพลิง</span>
                        </div>
                        <span className={carStatus.fuel_level < STATUS_THRESHOLDS.FUEL_LEVEL ? "text-rose-600 font-black" : "text-gray-600"}>
                            {Math.round(carStatus.fuel_level || 0)}%
                        </span>
                    </div>
                    <div className="h-1 bg-gray-200 rounded-full overflow-hidden">
                        <div
                            className={`h-full transition-all duration-500 rounded-full ${carStatus.fuel_level < STATUS_THRESHOLDS.FUEL_LEVEL ? 'bg-rose-500' : 'bg-orange-500'}`}
                            style={{ width: `${carStatus.fuel_level || 0}%` }}
                        ></div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default VehicleStatusDashboard;
