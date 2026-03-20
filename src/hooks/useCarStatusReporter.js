import { useEffect, useRef } from 'react';
import { supabase } from '../utils/supabaseClient';
import { isVehicleCritical } from '../utils/statusUtils';
import { useConnectionManager } from './useConnectionManager';

export function useCarStatusReporter(user, userProfile, isNavigating, currentSpeed, navExtra = {}) {
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

    const lastUpdateRef = useRef({
        engine_temp: 0,
        battery_volt: 0,
        fuel_level: 0,
        vehicle_speed: -1,
        rpm: 0
    });

    useEffect(() => {
        if (!user || (userProfile?.role !== 'technician' && userProfile?.role !== 'admin')) return;

        const interval = setInterval(async () => {
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

            const rpm = speedRef.current > 0 
                ? 800 + (speedRef.current * 40) + (Math.random() * 200) 
                : 750 + (Math.random() * 50);
            
            const currentVin = userProfile?.vin || `SIM-${user.id.substring(0, 8).toUpperCase()}`;

            const mockStatus = {
                engine_temp: engineTemp,
                battery_volt: batteryVolt,
                water_level: waterLevel,
                fuel_level: fuelLevel,
                oil_level: oilLevel,
                vehicle_speed: speedRef.current ? speedRef.current : 0,
                odometer: Math.floor(odoRef.current),
                engine_status: engineStatus,
                rpm: Math.floor(rpm),
                engine_load: speedRef.current > 0 ? 15 + Math.random() * 60 : 5 + Math.random() * 10,
                throttle_pos: speedRef.current > 0 ? 10 + Math.random() * 40 : 0,
                engine_runtime: Math.floor(Date.now() / 1000) % 86400,
                intake_air_temp: 35 + Math.random() * 15,
                ambient_temp: 30 + Math.random() * 5,
                oil_temp: engineTemp + 5 + Math.random() * 5,
                fuel_rate: speedRef.current > 0 ? 5 + Math.random() * 10 : 0.8 + Math.random() * 0.4,
                barometric_pressure: 101.3 + Math.random() * 0.5,
                distance_since_mil: 0,
                vin: currentVin,
                eta: navExtraRef.current?.eta || null,
                distance_remaining: navExtraRef.current?.distance_remaining || null,
                last_updated: new Date().toISOString()
            };

            const last = lastUpdateRef.current;
            const significantChange = 
                Math.abs(last.engine_temp - engineTemp) > 2 ||
                Math.abs(last.battery_volt - batteryVolt) > 0.3 ||
                Math.abs(last.fuel_level - fuelLevel) > 1 ||
                Math.abs(last.vehicle_speed - mockStatus.vehicle_speed) > 5;

            if (!significantChange && !isTempCritical && !isBatteryCritical) return;

            lastUpdateRef.current = {
                engine_temp: engineTemp,
                battery_volt: batteryVolt,
                fuel_level: fuelLevel,
                vehicle_speed: mockStatus.vehicle_speed,
                rpm: mockStatus.rpm
            };

            if (!navigator.onLine) {
                // For simulator, we'll try to use the function when online
                return;
            }

            // Try Edge Function first, if it fails, fallback to direct upsert
            const { error: funcError } = await supabase.functions.invoke('smart-function', {
                body: mockStatus
            });

            if (funcError) {
                // Fallback to direct upsert if function is not available
                await supabase
                    .from('car_status')
                    .upsert(mockStatus, { onConflict: 'vin' });
            }
        }, 10000);

        return () => clearInterval(interval);
    }, [user, userProfile?.role]);
}
