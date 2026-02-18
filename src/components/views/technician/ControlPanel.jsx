import React, { useState, useCallback, useEffect, useRef } from 'react';
import { formatTime } from '../../../utils/mapUtils';
import { useAuth } from '../../../contexts/AuthContext';
import { useToast } from '../../ui/ToastNotification';
import { NAVIGATION_MODES } from '../../../constants/visuals';
import { FiThermometer, FiZap, FiActivity, FiNavigation, FiDroplet } from 'react-icons/fi';

export default function ControlPanel({
    isImmersive,
    setIsImmersive,
    startPoint,
    waypoints,
    visitOrder,
    locationNames,
    activeSelection,
    activeMenu,
    tripType,
    travelMode,
    routePath,
    distance,
    currentSpeed,
    isNavigating,
    totalDuration,
    segments,
    setTripType,
    setTravelMode,
    startNavigation,
    simulateNavigation,
    handleViewLocation,
    useCurrentLocation,
    handleUrlInput,
    setActiveSelection,
    setActiveMenu,
    addWaypoint,
    removeWaypoint,
    viewMode,
    setViewMode,
    pendingJobsCount = 0,
    onUrlSubmit,
    setSearchResult,
    setWaypoints,
    carStatus,
    eta,
    remainingDistance,
    isRouting
}) {
    const { user, signOut } = useAuth();
    const [authMode, setAuthMode] = useState('login');
    const { showToast } = useToast();


    const getTimeDisplay = () => {
        if (isNavigating && currentSpeed > 1.4) {
            return formatTime((parseFloat(distance) * 1000) / currentSpeed);
        }
        return totalDuration || '0:00';
    };

    const handleCopyAllPoints = () => {
        const allPoints = waypoints.filter(w => w !== null);

        if (allPoints.length === 0) {
            showToast('ไม่มีพิกัดให้คัดลอก', 'warning');
            return;
        }


        const origin = window.location.origin;
        const pathname = window.location.pathname;
        const pointsStr = allPoints
            .map(w => `${w[0]},${w[1]}`)
            .join('|');

        const finalUrl = `${origin}${pathname}?points=${pointsStr}`;

        navigator.clipboard.writeText(finalUrl);
        showToast('คัดลอกลิงก์ของแอปสำเร็จ', 'success');
    };

    const handleClearAll = () => {
        setWaypoints([null]);
        showToast('ล้างรายการทั้งหมดสำเร็จ', 'success');
    };

    const [urlInput, setUrlInput] = useState('');

    const handleConfirmUrl = () => {
        if (!urlInput.trim()) return;
        if (onUrlSubmit) {
            const emptyIdx = waypoints.indexOf(null);
            const targetIdx = emptyIdx !== -1 ? emptyIdx : waypoints.length;
            onUrlSubmit(urlInput, { type: 'waypoint', idx: targetIdx });
            setUrlInput('');
        }
    };

    const [isMinimized, setIsMinimized] = useState(false);
    const [dragY, setDragY] = useState(0);
    const [isDragging, setIsDragging] = useState(false);
    const startYRef = useRef(0);
    const currentDragYRef = useRef(0);

    const handlePointerDown = (e) => {
        e.currentTarget.setPointerCapture(e.pointerId);
        setIsDragging(true);
        startYRef.current = e.clientY;
        currentDragYRef.current = 0;
        setDragY(0);
    };

    const handlePointerMove = (e) => {
        if (!isDragging) return;
        const deltaY = e.clientY - startYRef.current;

        let newDragY = 0;
        if (!isMinimized) {
            newDragY = Math.max(0, deltaY);
        } else {
            newDragY = Math.min(0, deltaY);
        }

        currentDragYRef.current = newDragY;
        setDragY(newDragY);
    };

    const handlePointerUp = (e) => {
        if (!isDragging) return;
        e.currentTarget.releasePointerCapture(e.pointerId);

        const finalDelta = currentDragYRef.current;
        if (!isMinimized && finalDelta > 80) {
            if (isNavigating) {
                setIsImmersive(true);
            } else {
                setIsMinimized(true);
            }
        } else if (isMinimized && finalDelta < -80) {
            setIsMinimized(false);
        }

        setIsDragging(false);
        setDragY(0);
    };

    if (isImmersive) {
        return (
            <div className="fixed bottom-3 sm:bottom-6 left-1/2 -translate-x-1/2 z-[3001] w-[92%] sm:w-[90%] max-w-sm">
                <div className="bg-black/80 backdrop-blur-2xl rounded-2xl sm:rounded-3xl p-2.5 sm:p-4 flex items-center justify-between shadow-2xl border border-white/10 animate-in slide-in-from-bottom duration-500">
                    <div className="flex gap-3 sm:gap-6 items-center flex-1 justify-around ml-1 sm:ml-2">
                        <div className="text-center">
                            <div className="text-xl sm:text-2xl font-black text-white leading-none whitespace-nowrap">
                                {Math.round(currentSpeed * 3.6)}
                            </div>
                            <div className="text-blue-400 text-[7px] sm:text-[8px] font-black uppercase tracking-widest mt-0.5 sm:mt-1">KM/H</div>
                        </div>
                        <div className="w-px h-6 sm:h-8 bg-white/10"></div>
                        <div className="text-center">
                            <div className="text-xl sm:text-2xl font-black text-white leading-none whitespace-nowrap">
                                {remainingDistance ? (remainingDistance / 1000).toFixed(1) : '0.0'}
                            </div>
                            <div className="text-white/40 text-[7px] sm:text-[8px] font-black uppercase tracking-widest mt-0.5 sm:mt-1">กม. เหลือ</div>
                        </div>
                        <div className="w-px h-6 sm:h-8 bg-white/10"></div>
                        <div className="text-center">
                            <div className="text-xl sm:text-2xl font-black text-white leading-none whitespace-nowrap">
                                {eta || '--'}
                            </div>
                            <div className="text-white/40 text-[7px] sm:text-[8px] font-black uppercase tracking-widest mt-0.5 sm:mt-1">
                                นาที
                            </div>
                        </div>
                    </div>
                    <button
                        onClick={() => setIsImmersive(false)}
                        className="bg-white/10 hover:bg-white/20 text-white p-2 sm:p-3 rounded-xl sm:rounded-2xl transition-all active:scale-90 ml-2"
                    >
                        <svg className="w-5 h-5 sm:w-6 sm:h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M4 6h16M4 12h16m-7 6h7" />
                        </svg>
                    </button>
                </div>
            </div>
        );
    }


    const PEEK_VAR = 'var(--peek-height, 95px)';

    const getTransform = () => {
        if (isDragging) {
            if (!isMinimized) return `translateY(${dragY}px)`;
            return `translateY(calc(100% - ${PEEK_VAR} + ${dragY}px))`;
        }
        return isMinimized ? `translateY(calc(100% - ${PEEK_VAR}))` : 'translateY(0)';
    };

    return (
        <div
            className={`fixed bottom-0 left-0 right-0 z-[1001] flex justify-center ${!isDragging ? 'transition-all duration-500 ease-out' : ''}`}
            style={{
                transform: getTransform(),
            }}
        >
            <style dangerouslySetInnerHTML={{
                __html: `
                @media (min-width: 640px) {
                    :root { --peek-height: 90px; }
                }
                @media (max-width: 639px) {
                    :root { --peek-height: 45px; }
                }
            `}} />

            <div className="bg-white w-full rounded-t-[1.5rem] shadow-[0_-15px_50px_-12px_rgba(0,0,0,0.25)] p-2 sm:p-4 pb-4 sm:pb-6 flex flex-col gap-1.5 sm:gap-3 animate-in slide-in-from-bottom duration-700 border-t border-white/50 relative">
                <div
                    className="absolute top-0 left-0 right-0 h-7 flex items-start justify-center cursor-grab active:cursor-grabbing z-50 touch-none"
                    onPointerDown={handlePointerDown}
                    onPointerMove={handlePointerMove}
                    onPointerUp={handlePointerUp}
                    onPointerCancel={handlePointerUp}
                    onClick={() => {
                        if (Math.abs(currentDragYRef.current) < 5) {
                            setIsMinimized(!isMinimized);
                        }
                    }}
                >
                    <div className="w-10 h-1 bg-gray-200 rounded-full mt-2.5 hover:bg-gray-300 transition-colors shadow-inner"></div>
                </div>
                
                <div className="mt-1"></div>
                
                <div className="flex justify-between items-start mt-0.5 sm:mt-1">
                    <div className="text-center min-w-[50px] sm:min-w-[70px]">
                        <div className="text-lg sm:text-2xl font-black text-gray-900 tracking-tight leading-none">
                            {distance ? parseFloat(distance).toFixed(1) : '0.0'}
                        </div>
                        <div className="text-gray-400 text-[6.5px] sm:text-[9px] font-bold uppercase tracking-widest mt-1">กม.</div>
                    </div>

                    <div className="flex flex-col items-center gap-1 sm:gap-2 flex-1 min-w-0 px-1">
                        <button
                            onClick={useCurrentLocation}
                            className="flex items-center gap-1 sm:gap-1.5 text-blue-500 bg-blue-50/50 px-2 py-0.5 sm:py-1 rounded-full border border-blue-100 shadow-sm max-w-full hover:bg-blue-100 transition-colors group active:scale-95"
                        >
                            <svg className="w-2.5 sm:w-3.5 h-2.5 sm:h-3.5 shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                                <circle cx="12" cy="12" r="10" /><circle cx="12" cy="12" r="3" />
                                <line x1="22" x2="18" y1="12" y2="12" /><line x1="6" x2="2" y1="12" y2="12" />
                            </svg>
                            <span className="text-[8px] sm:text-[12px] font-bold tracking-tight truncate max-w-[70px] sm:max-w-[200px]">
                                {startPoint ? `${startPoint[0].toFixed(4)}, ${startPoint[1].toFixed(4)}` : 'กำลังระบุ...'}
                            </span>
                        </button>
                    </div>

                    <div className="text-center min-w-[50px] sm:min-w-[70px]">
                        <div className="text-lg sm:text-2xl font-black text-gray-900 tracking-tight leading-none">
                            {getTimeDisplay().split(' ')[0]}
                        </div>
                        <div className="text-gray-400 text-[6.5px] sm:text-[9px] font-bold uppercase tracking-widest mt-1">
                            {getTimeDisplay().split(' ')[1] || 'นาที'}
                        </div>
                    </div>
                </div>

                <div className="flex gap-1.5 sm:gap-2">
                    <div className="flex-1 bg-gray-50 border border-gray-100 rounded-lg flex items-center px-2.5 sm:px-3.5 py-1 sm:py-2 gap-1.5 sm:gap-2 focus-within:ring-2 focus-within:ring-blue-500/20 transition-all">
                        <svg className="w-3 h-3 sm:w-4.5 sm:h-4.5 text-gray-400 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" />
                        </svg>
                        <input
                            type="text"
                            placeholder="ลิงก์ หรือ พิกัด..."
                            value={urlInput}
                            onChange={(e) => setUrlInput(e.target.value)}
                            onKeyDown={(e) => e.key === 'Enter' && handleConfirmUrl()}
                            className="bg-transparent border-none outline-none w-full text-[9px] sm:text-sm font-bold text-gray-700 placeholder:text-gray-400"
                        />
                    </div>
                    <button
                        onClick={handleConfirmUrl}
                        className="bg-blue-600 hover:bg-blue-500 text-white font-black px-2.5 sm:px-5 rounded-lg shadow-md active:scale-95 transition-all text-[9.5px] sm:text-xs uppercase tracking-wide flex items-center gap-1.5"
                    >
                        <span>ตกลง</span>
                    </button>
                </div>

                {waypoints.filter(w => w !== null).length > 0 && (
                    <div className="flex items-center justify-between px-0.5">
                        <div className="flex items-center gap-1 bg-blue-50/50 px-2 py-0.5 rounded-full border border-blue-100/50 w-fit">
                            <div className="w-1 h-1 bg-blue-500 rounded-full animate-pulse"></div>
                            <span className="text-[8px] font-black text-blue-600 uppercase tracking-wider">
                                {waypoints.filter(w => w !== null).length} จุดแวะพัก
                            </span>
                        </div>
                        <div className="flex gap-2.5">
                            <button onClick={handleCopyAllPoints} className="text-[8px] font-black text-blue-500 uppercase tracking-widest hover:text-blue-600 transition-colors">คัดลอกหมด</button>
                            <button onClick={handleClearAll} className="text-[8px] font-black text-red-500 uppercase tracking-widest hover:text-red-600 transition-colors">ล้างหมด</button>
                        </div>
                    </div>
                )}

                <div className="flex flex-wrap gap-1 max-h-20 overflow-y-auto">
                    {waypoints.map((wp, idx) => {
                        if (wp === null) return null;
                        const name = locationNames[`waypoint-${idx}`] || `จุด ${idx + 1}`;
                        return (
                            <div key={idx} className="bg-gray-50 text-gray-600 px-2 py-0.5 rounded-md border border-gray-100 flex items-center gap-1">
                                <span className="text-[9px] font-bold truncate max-w-[80px]">{name}</span>
                                <button onClick={() => removeWaypoint(idx)} className="text-gray-400 hover:text-red-500 transition-colors">
                                    <svg className="w-2.5 h-2.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M6 18L18 6M6 6l12 12" /></svg>
                                </button>
                            </div>
                        );
                    })}
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5 sm:gap-3">
                    <div className="flex bg-gray-50 p-0.5 rounded-lg border border-gray-100/80">
                        <button
                            onClick={() => setTripType('oneway')}
                            className={`flex-1 py-1 rounded-md text-[9px] sm:text-[11px] font-black transition-all ${tripType === 'oneway' ? 'bg-white text-blue-600 shadow-sm' : 'text-gray-400'}`}
                        >
                            ทางเดียว
                        </button>
                        <button
                            onClick={() => setTripType('roundtrip')}
                            className={`flex-1 py-1 rounded-md text-[9px] sm:text-[11px] font-black transition-all ${tripType === 'roundtrip' ? 'bg-white text-blue-600 shadow-sm' : 'text-gray-400'}`}
                        >
                            ไป-กลับ
                        </button>
                    </div>

                    <div className="flex gap-1.5">
                        <button
                            onClick={startNavigation}
                            disabled={!distance || isRouting}
                            className={`flex-1 py-1.5 sm:py-2 rounded-lg font-black text-[9px] sm:text-xs uppercase flex items-center justify-center gap-1.5 transition-all ${distance && !isRouting ? 'bg-blue-600 text-white shadow-md shadow-blue-500/10' : 'bg-gray-100 text-gray-300'}`}
                        >
                            <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 24 24"><path d="M12 2L4.5 20.29l.71.71L12 18l6.79 3 .71-.71z" /></svg>
                            {isRouting ? 'รอ...' : 'นำทาง'}
                        </button>
                        <button
                            onClick={simulateNavigation}
                            disabled={!distance || isRouting}
                            className={`flex-1 py-1.5 sm:py-2 rounded-lg font-black text-[9px] sm:text-xs uppercase flex items-center justify-center gap-1.5 border-2 transition-all ${distance && !isRouting ? 'border-blue-500 text-blue-500' : 'border-gray-200 text-gray-300'}`}
                        >
                            <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z" /></svg>
                            จำลอง
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
}
