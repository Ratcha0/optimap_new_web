
export const STATUS_THRESHOLDS = {
    ENGINE_TEMP: 105,
    BATTERY_VOLT: 13,
    WATER_LEVEL: 40,
    FUEL_LEVEL: 30,
    OIL_LEVEL: 40
};

export const isVehicleCritical = (carStatus) => {
    if (!carStatus) return false;

    return (
        carStatus.engine_temp > STATUS_THRESHOLDS.ENGINE_TEMP ||
        carStatus.battery_volt < STATUS_THRESHOLDS.BATTERY_VOLT ||
        carStatus.water_level < STATUS_THRESHOLDS.WATER_LEVEL ||
        carStatus.oil_level < STATUS_THRESHOLDS.OIL_LEVEL
    );
};


export const getEngineStatusDisplay = (carStatus) => {
    if (!carStatus) return { text: 'ไม่มีข้อมูล', color: 'text-gray-400', dot: 'bg-gray-400', isCritical: false };

    const isCritical = isVehicleCritical(carStatus);

    if (isCritical) {
        return {
            text: 'ตรวจสอบเครื่องยนต์',
            color: 'text-rose-600',
            dot: 'bg-rose-500',
            isCritical: true
        };
    }

    return {
        text: 'เครื่องยนต์ปกติ',
        color: 'text-emerald-600',
        dot: 'bg-emerald-500',
        isCritical: false
    };
};
