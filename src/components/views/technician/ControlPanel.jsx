import React, { useState, useCallback, useEffect, useRef } from 'react';
import { formatTime } from '../../../utils/mapUtils';
import { useAuth } from '../../../contexts/AuthContext';
import { useToast } from '../../ui/ToastNotification';
import { NAVIGATION_MODES } from '../../../constants/visuals';

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
    favorites,
    onSelectFavorite,
    onDeleteFavorite,
    onEditFavorite,
    onViewFavorite,
    viewMode,
    setViewMode,
    pendingJobsCount = 0,
    onUrlSubmit,
    setSearchResult,
    setWaypoints
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
            <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-[3001] w-[90%] max-w-sm">
                <div className="bg-black/80 backdrop-blur-2xl rounded-3xl p-4 flex items-center justify-between shadow-2xl border border-white/10 animate-in slide-in-from-bottom duration-500">
                    <div className="flex gap-6 items-center">
                        <div className="text-center">
                            <div className="text-2xl font-black text-white leading-none whitespace-nowrap">
                                {Math.round(currentSpeed * 3.6)}
                            </div>
                            <div className="text-blue-400 text-[8px] font-black uppercase tracking-widest mt-1">KM/H</div>
                        </div>
                        <div className="w-px h-8 bg-white/10"></div>
                        <div className="text-center">
                            <div className="text-2xl font-black text-white leading-none whitespace-nowrap">
                                {distance ? parseFloat(distance).toFixed(1) : '0.0'}
                            </div>
                            <div className="text-white/40 text-[8px] font-black uppercase tracking-widest mt-1">KM/ระยะทางทั้งหมด</div>
                        </div>
                        <div className="w-px h-8 bg-white/10"></div>
                        <div className="text-center">
                            <div className="text-2xl font-black text-white leading-none whitespace-nowrap">
                                {getTimeDisplay().split(' ')[0]}
                            </div>
                            <div className="text-white/40 text-[8px] font-black uppercase tracking-widest mt-1">
                                {getTimeDisplay().split(' ')[1] || 'MIN'}
                            </div>
                        </div>
                    </div>
                    <button
                        onClick={() => setIsImmersive(false)}
                        className="bg-white/10 hover:bg-white/20 text-white p-3 rounded-2xl transition-all active:scale-90"
                    >
                        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
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
                    :root { --peek-height: 110px; }
                }
                @media (max-width: 639px) {
                    :root { --peek-height: 80px; }
                }
            `}} />

            <div className="bg-white w-full rounded-t-[3rem] shadow-[0_-20px_60px_-15px_rgba(0,0,0,0.3)] p-4 sm:p-5 pb-6 sm:pb-8 flex flex-col gap-2 sm:gap-4 animate-in slide-in-from-bottom duration-700 border-t border-white/50 relative">


                <div
                    className="absolute top-0 left-0 right-0 h-10 flex items-start justify-center cursor-grab active:cursor-grabbing z-50 touch-none"
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
                    <div className="w-16 h-1.5 bg-gray-200 rounded-full mt-4 hover:bg-gray-300 transition-colors shadow-inner"></div>
                </div>
                <div className="mt-0.5 sm:mt-1.5"></div>
                <div className="flex justify-between items-start mt-1 sm:mt-2">
                    <div className="text-center min-w-[60px] sm:min-w-[80px]">
                        <div className="text-2xl sm:text-4xl font-black text-gray-900 tracking-tight">
                            {distance ? parseFloat(distance).toFixed(1) : '0.0'}
                        </div>
                        <div className="text-gray-400 text-[8px] sm:text-[10px] font-bold uppercase tracking-widest mt-0">กม.</div>
                    </div>


                    <div className="flex flex-col items-center gap-1.5 sm:gap-4 flex-1 min-w-0">

                        <button
                            className="flex items-center gap-1 sm:gap-2 text-blue-500 bg-blue-50 px-2 sm:px-3 py-1 sm:py-1.5 rounded-full border border-blue-100 shadow-sm max-w-full hover:bg-blue-100 transition-colors group active:scale-95"
                        >
                            <svg className="w-2.5 h-2.5 sm:w-4 sm:h-4 shrink-0 group-hover:scale-110 transition-transform" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                                <circle cx="12" cy="12" r="10" />
                                <circle cx="12" cy="12" r="3" />
                                <line x1="22" x2="18" y1="12" y2="12" />
                                <line x1="6" x2="2" y1="12" y2="12" />
                                <line x1="12" x2="12" y1="6" y2="2" />
                                <line x1="12" x2="12" y1="22" y2="18" />
                            </svg>
                            <span className="text-[9px] sm:text-sm font-bold tracking-tight truncate max-w-[100px] sm:max-w-[250px]">
                                {startPoint ? `${startPoint[0].toFixed(4)}, ${startPoint[1].toFixed(4)}` : 'กำลังระบุ...'}
                            </span>
                        </button>
                    </div>


                    <div className="text-center min-w-[60px] sm:min-w-[80px]">
                        <div className="text-2xl sm:text-4xl font-black text-gray-900 tracking-tight">
                            {getTimeDisplay().split(' ')[0]}
                        </div>
                        <div className="text-gray-400 text-[8px] sm:text-[10px] font-bold uppercase tracking-widest mt-0">
                            {getTimeDisplay().split(' ')[1] || 'นาที'}
                        </div>
                    </div>
                </div>

                <div className="flex gap-2 sm:gap-3">
                    <div className="flex-1 bg-gray-50 border border-gray-100 rounded-xl sm:rounded-2xl flex items-center px-3 sm:px-4 py-2.5 sm:py-3 gap-2 sm:gap-3 focus-within:ring-2 focus-within:ring-blue-500/20 transition-all">
                        <svg className="w-4 h-4 sm:w-5 sm:h-5 text-gray-400 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" />
                        </svg>
                        <input
                            type="text"
                            placeholder="วางลิงก์ หรือพิกัด..."
                            value={urlInput}
                            onChange={(e) => setUrlInput(e.target.value)}
                            onKeyDown={(e) => e.key === 'Enter' && handleConfirmUrl()}
                            className="bg-transparent border-none outline-none w-full text-xs sm:text-sm font-bold text-gray-700 placeholder:text-gray-400"
                        />
                    </div>
                    <button
                        onClick={handleConfirmUrl}
                        className="bg-blue-600 hover:bg-blue-500 text-white font-bold px-4 sm:px-6 rounded-xl sm:rounded-2xl shadow-lg active:scale-95 transition-all text-xs sm:text-sm uppercase tracking-wide flex items-center gap-2"
                    >
                        <span>ยืนยัน</span>
                    </button>
                </div>

                {waypoints.filter(w => w !== null).length > 0 && (
                    <div className="flex items-left justify-left gap-1">
                        <div className="flex items-center gap-2 bg-blue-50 px-4 py-1.5 rounded-full border border-blue-100 shadow-sm animate-in fade-in slide-in-from-top-2 duration-500">
                            <div className="w-2 h-2 bg-blue-500 rounded-full animate-pulse"></div>
                            <span className="text-[10px] font-black text-blue-600 uppercase tracking-[0.15em]">
                                จำนวน : {waypoints.filter(w => w !== null).length} พิกัด
                            </span>
                        </div>
                    </div>
                )}


                <div className="flex flex-wrap gap-2 max-h-32 overflow-y-auto">
                    {waypoints.map((wp, idx) => {
                        if (wp === null) return null;
                        const name = locationNames[`waypoint-${idx}`] || `จุดแวะพัก ${idx + 1}`;
                        return (
                            <div key={idx} className="bg-blue-50 text-blue-600 px-3 py-1.5 rounded-full border border-blue-100 flex items-center gap-2 animate-in fade-in zoom-in duration-300">
                                <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 24 24"><path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zM7 9c0-2.76 2.24-5 5-5s5 2.24 5 5c0 2.88-2.88 7.19-5 9.88C9.92 16.21 7 11.85 7 9z" /><circle cx="12" cy="9" r="2.5" /></svg>
                                <span className="text-xs font-black tracking-tight">{name}</span>
                                <button
                                    onClick={() => removeWaypoint(idx)}
                                    className="w-4 h-4 rounded-full hover:bg-red-100 hover:text-red-500 flex items-center justify-center transition-colors"
                                >
                                    <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M6 18L18 6M6 6l12 12" /></svg>
                                </button>
                            </div>
                        );
                    })}
                </div>


                {waypoints.some(w => w !== null) && (
                    <div className="flex justify-end gap-3 px-2">
                        <button
                            onClick={handleCopyAllPoints}
                            className="text-xs font-black text-blue-500 uppercase tracking-widest flex items-center gap-1.5 hover:text-blue-600 transition-colors"
                        >
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 7v8a2 2 0 002 2h6M8 7V5a2 2 0 012-2h4.586a1 1 0 01.707.293l4.414 4.414a1 1 0 01.293.707V15a2 2 0 01-2 2h-2M8 7H6a2 2 0 00-2 2v10a2 2 0 002 2h8a2 2 0 002-2v-2" /></svg>
                            คัดลอกพิกัดทั้งหมด
                        </button>
                        <button
                            onClick={handleClearAll}
                            className="text-xs font-black text-red-500 uppercase tracking-widest flex items-center gap-1.5 hover:text-red-600 transition-colors"
                        >
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                            ล้างทั้งหมด
                        </button>
                    </div>
                )}


                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-6 bg-transparent">
                    <div className="flex bg-gray-50 p-1 sm:p-1.5 rounded-xl sm:rounded-2xl border border-gray-100">
                        <button
                            onClick={() => setTripType('oneway')}
                            className={`flex-1 py-2 sm:py-4 rounded-lg sm:rounded-xl text-xs sm:text-sm font-black transition-all ${tripType === 'oneway'
                                ? 'bg-white text-blue-600 shadow-sm border border-gray-100'
                                : 'text-gray-400 hover:text-gray-600'
                                }`}
                        >
                            ทางเดียว
                        </button>
                        <button
                            onClick={() => setTripType('roundtrip')}
                            className={`flex-1 py-2 sm:py-4 rounded-lg sm:rounded-xl text-xs sm:text-sm font-black transition-all ${tripType === 'roundtrip'
                                ? 'bg-white text-blue-600 shadow-sm border border-gray-100'
                                : 'text-gray-400 hover:text-gray-600'
                                }`}
                        >
                            ไป-กลับ
                        </button>
                    </div>

                    <div className="flex gap-3">
                        <button
                            onClick={startNavigation}
                            disabled={!distance}
                            className={`flex-1 py-3 sm:py-4 rounded-xl sm:rounded-2xl font-black text-xs sm:text-sm uppercase tracking-wider flex items-center justify-center gap-2 transition-all ${distance
                                ? 'bg-gray-200 text-gray-700 hover:bg-gray-300 active:scale-95'
                                : 'bg-gray-100 text-gray-300 cursor-not-allowed'
                                }`}
                        >
                            <svg className="w-4 h-4 sm:w-5 sm:h-5" fill="currentColor" viewBox="0 0 24 24"><path d="M12 2L4.5 20.29l.71.71L12 18l6.79 3 .71-.71z" /></svg>
                            เริ่มนำทาง
                        </button>
                        <button
                            onClick={simulateNavigation}
                            disabled={!distance}
                            className={`flex-1 py-3 sm:py-4 rounded-xl sm:rounded-2xl font-black text-xs sm:text-sm uppercase tracking-wider flex items-center justify-center gap-2 border-2 transition-all ${distance
                                ? 'border-blue-500 text-blue-500 hover:bg-blue-50 active:scale-95'
                                : 'border-gray-200 text-gray-300 cursor-not-allowed'
                                }`}
                        >
                            <svg className="w-4 h-4 sm:w-5 sm:h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                            จำลอง
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
}
