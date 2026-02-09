import React, { useEffect } from 'react';
import { Marker, Popup, Polyline, Tooltip, useMap } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet-polylinedecorator';
import { createNumberedIcon } from '../../utils/mapUtils';
import { APP_THEME } from '../../constants/visuals';

function ArrowDecorator({ positions, color }) {
    const map = useMap();
    useEffect(() => {
        if (!map || !positions || positions.length === 0) return;
        const decorator = L.polylineDecorator(positions, {
            patterns: [
                { offset: '5%', repeat: '100px', symbol: L.Symbol.arrowHead({ pixelSize: 10, polygon: false, pathOptions: { stroke: true, color: color, opacity: 0.8, weight: 2 } }) }
            ]
        });
        decorator.addTo(map);
        return () => {
            map.removeLayer(decorator);
        };
    }, [map, positions, color]);
    return null;
}

export default function MapLayers({
    startPoint,
    locationNames,
    setActiveSelection,
    visibleWaypoints,
    visitOrder,
    handleViewLocation,
    removeWaypoint,
    routePath,
    routeLegs,
    currentLegIndex,
    currentPointIndex,
    isNavigating,
    completedWaypoints = new Set(),
}) {
    return (
        <>
            {visibleWaypoints.map((wpObj, idx) => {
                if (!wpObj) return null;
                if (isNavigating && completedWaypoints.has(idx)) return null;
                const displayIndex = idx + 1;

                return (
                    <Marker
                        key={idx}
                        position={wpObj}
                        icon={createNumberedIcon(visitOrder[displayIndex] || displayIndex)}
                        eventHandlers={{
                            click: () => {
                                handleViewLocation(wpObj);
                            }
                        }}
                    >
                        <Popup className="rounded-2xl overflow-hidden shadow-2xl border-none custom-popup">
                            <div className="p-1 min-w-[160px]">
                                <div className="flex flex-col gap-1 mb-3">
                                    <div className="text-[10px] font-black text-red-500 uppercase tracking-widest leading-none">Destination {displayIndex}</div>
                                    <div className="text-sm font-bold text-gray-900 leading-tight">
                                        {locationNames[`waypoint-${idx}`] || 'ตำแหน่งที่ระบุ'}
                                    </div>
                                    {visitOrder[displayIndex] && (
                                        <div className="text-[9px] font-bold text-gray-400 uppercase">ลำดับที่ {visitOrder[displayIndex]}</div>
                                    )}
                                </div>

                                <div className="flex gap-2">
                                    <button
                                        onClick={() => setActiveSelection(`waypoint-${idx}`)}
                                        className="flex-1 bg-blue-50 hover:bg-blue-100 text-blue-600 font-bold py-2 rounded-xl text-[10px] transition-colors"
                                    >
                                        แก้ไข
                                    </button>
                                    <button
                                        onClick={() => removeWaypoint(idx)}
                                        className="flex-1 bg-red-50 hover:bg-red-100 text-red-600 font-bold py-2 rounded-xl text-[10px] transition-colors"
                                    >
                                        ลบ
                                    </button>
                                </div>
                            </div>
                        </Popup>
                    </Marker>
                );
            })}

            {routePath.length > 0 && (
                <Polyline positions={routePath} color={APP_THEME.INACTIVE} weight={5} opacity={0.3} dashArray="12, 12" />
            )}

            {routeLegs.map((leg, i) => {
                const isCurrent = i === currentLegIndex;
                const isPassed = i < currentLegIndex;
                if (isPassed && isNavigating) return null;

                let color = isCurrent ? APP_THEME.PRIMARY : APP_THEME.INACTIVE;
                let displayCoords = leg.coords;

                if (isCurrent && isNavigating && currentPointIndex != null) {
                    const legStartIdx = leg.startIdx || 0;
                    const relativeIdx = Math.max(0, currentPointIndex - legStartIdx);
                    if (relativeIdx > 0 && relativeIdx < leg.coords.length) {
                        displayCoords = leg.coords.slice(relativeIdx);
                    }
                }

                if (displayCoords.length === 0) return null;

                return (
                    <React.Fragment key={i}>
                        <Polyline
                            positions={displayCoords}
                            color={color}
                            weight={isCurrent ? 7 : 4}
                            opacity={isCurrent ? 1 : 0.5}
                        >
                            {isCurrent && isNavigating && (
                                <Tooltip sticky direction="top" permanent className="bg-blue-600 text-white border-none rounded-lg px-2 py-1 text-[10px] font-bold shadow-lg">
                                    กำลังเดินทาง
                                </Tooltip>
                            )}
                        </Polyline>
                        {!isPassed && <ArrowDecorator positions={displayCoords} color={color} />}
                    </React.Fragment>
                )
            })}
        </>
    );
}
