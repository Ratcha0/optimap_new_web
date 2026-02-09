export const calculateDistance = (lat1, lon1, lat2, lon2) => {
    const R = 6371e3;
    const toRad = x => x * Math.PI / 180;
    const dLat = toRad(lat2 - lat1);
    const dLon = toRad(lon2 - lon1);
    const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
        Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) *
        Math.sin(dLon / 2) * Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
};

export const calculateBearing = (lat1, lon1, lat2, lon2) => {
    const toRad = x => x * Math.PI / 180;
    const toDeg = x => x * 180 / Math.PI;
    const dLon = toRad(lon2 - lon1);
    const y = Math.sin(dLon) * Math.cos(toRad(lat2));
    const x = Math.cos(toRad(lat1)) * Math.sin(toRad(lat2)) -
        Math.sin(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.cos(dLon);
    return (toDeg(Math.atan2(y, x)) + 360) % 360;
};

export const findClosestPointOnRoute = (userLat, userLng, userHeading, routePath, threshold = 40) => {

    let minDist = Infinity;
    let closestPoint = null;
    let closestIndex = -1;
    for (let i = 0; i < routePath.length; i++) {
        const p = routePath[i];
        const dist = calculateDistance(userLat, userLng, p[0], p[1]);

        if (dist < minDist) {


            let directionalMatch = true;
            if (userHeading !== undefined && userHeading !== null && !isNaN(userHeading)) {

                if (i < routePath.length - 1) {
                    const roadBearing = calculateBearing(p[0], p[1], routePath[i + 1][0], routePath[i + 1][1]);
                    const diff = Math.abs(userHeading - roadBearing);
                    const angleDiff = diff > 180 ? 360 - diff : diff;
                    if (angleDiff > 100) {
                        directionalMatch = false;
                    }
                }
            }

            if (directionalMatch && dist <= threshold) {
                minDist = dist;
                closestPoint = p;
                closestIndex = i;
            }
        }
    }

    return { point: closestPoint, distance: minDist, index: closestIndex };
};
export const calculateRemainingDistance = (routePath, startIndex) => {
    if (!routePath || routePath.length <= 1 || startIndex >= routePath.length - 1) return 0;
    let total = 0;
    const start = Math.max(0, startIndex);
    for (let i = start; i < routePath.length - 1; i++) {
        total += calculateDistance(
            routePath[i][0], routePath[i][1],
            routePath[i + 1][0], routePath[i + 1][1]
        );
    }
    return total;
};
