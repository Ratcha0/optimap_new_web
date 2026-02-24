import { useEffect, useRef } from 'react';
import { supabase } from '../utils/supabaseClient';
import { isVehicleCritical } from '../utils/statusUtils';
import { useConnectionManager } from './useConnectionManager';

export function useCarStatusSimulator(user, userProfile, isNavigating, currentSpeed, navExtra = {}) {
    const odoRef = useRef(125000 + Math.random() * 10);
    const navRef = useRef(isNavigating);
    const speedRef = useRef(currentSpeed);
    const navExtraRef = useRef(navExtra);
    const { queueUpdate } = useConnectionManager(user);

    useEffect(() => {
        navRef.current = isNavigating;
        speedRef.current = currentSpeed;
        navExtraRef.current = navExtra;
    }, [isNavigating, currentSpeed, navExtra]);

    useEffect(() => {
        if (!user || (userProfile?.role !== 'technician' && userProfile?.role !== 'admin')) return;

        const interval = setInterval(async () => {
            // Independent randomization for each metric
            const isTempCritical = Math.random() < 0.10;
            const isBatteryCritical = Math.random() < 0.15;
            const isWaterCritical = Math.random() < 0.10;
            const isFuelCritical = Math.random() < 0.20;
            const isOilCritical = Math.random() < 0.05;

            const engineTemp = (isTempCritical) ? 106 + Math.random() * 5 : 85 + Math.random() * 12;
            const batteryVolt = (isBatteryCritical) ? 10.5 + Math.random() * 2.0 : 13.2 + Math.random() * 1.2;
            const waterLevel = (isWaterCritical) ? 5 + Math.random() * 25 : 80 + Math.random() * 20;
            const fuelLevel = (isFuelCritical) ? 2 + Math.random() * 20 : 60 + Math.random() * 40;
            const oilLevel = (isOilCritical) ? 5 + Math.random() * 30 : 80 + Math.random() * 18;

            const currentMetrics = {
                engine_temp: engineTemp,
                battery_volt: batteryVolt,
                water_level: waterLevel,
                oil_level: oilLevel,
                fuel_level: fuelLevel
            };

            const engineStatus = !isVehicleCritical(currentMetrics);

            if (navRef.current && speedRef.current > 0) {
                odoRef.current += (speedRef.current * 2) / 3600;
            }

            const mockStatus = {
                engine_temp: engineTemp,
                battery_volt: batteryVolt,
                water_level: waterLevel,
                fuel_level: fuelLevel,
                oil_level: oilLevel,
                vehicle_speed: speedRef.current ? speedRef.current * 3.6 : 0,
                odometer: Math.floor(odoRef.current),
                engine_status: engineStatus,
                eta: navExtraRef.current?.eta || null,
                distance_remaining: navExtraRef.current?.distance_remaining || null,
                last_updated: new Date().toISOString()
            };

            if (!navigator.onLine) {
                queueUpdate('car_status', user.id, mockStatus);
                return;
            }

            const { error } = await supabase
                .from('car_status')
                .update(mockStatus)
                .eq('id', user.id);

            if (error) {
                
                queueUpdate('car_status', user.id, mockStatus);
            }
        }, 5000);

        return () => clearInterval(interval);
    }, [user, userProfile?.role]);
}
