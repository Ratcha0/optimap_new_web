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

/**
 * Finds the closest point on a line segment defined by p1 and p2 from a given user point.
 */
export const getClosestPointOnSegment = (uLat, uLng, p1, p2) => {
    const Ax = p1[1]; const Ay = p1[0];
    const Bx = p2[1]; const By = p2[0];
    const Cx = uLng; const Cy = uLat;

    const ABx = Bx - Ax;
    const ABy = By - Ay;
    const ACx = Cx - Ax;
    const ACy = Cy - Ay;

    const dot = ACx * ABx + ACy * ABy;
    const lenSq = ABx * ABx + ABy * ABy;
    
    let t = lenSq > 0 ? dot / lenSq : -1;
    t = Math.max(0, Math.min(1, t)); // Clamp to segment

    const closestLng = Ax + t * ABx;
    const closestLat = Ay + t * ABy;
    
    return {
        point: [closestLat, closestLng],
        distance: calculateDistance(uLat, uLng, closestLat, closestLng)
    };
};

export const findClosestPointOnRoute = (userLat, userLng, userHeading, routePath, lastIndex = -1, threshold = 65, speed = 0) => {
    let minDist = Infinity;
    let closestPoint = null;
    let closestIndex = -1;

    const startSearch = lastIndex === -1 ? 0 : Math.max(0, lastIndex - 5);
    const endSearch = routePath.length - 1;

    const effectiveHeading = speed < 1.38 ? null : userHeading;

    for (let i = startSearch; i < endSearch; i++) {
        if (lastIndex !== -1 && i > lastIndex + 80 && minDist < threshold * 0.8) break;

        const p1 = routePath[i];
        const p2 = routePath[i+1];
        
        const { point, distance } = getClosestPointOnSegment(userLat, userLng, p1, p2);

        if (distance < minDist) {
            let directionalMatch = true;
            if (effectiveHeading !== undefined && effectiveHeading !== null && !isNaN(effectiveHeading)) {
                const roadBearing = calculateBearing(p1[0], p1[1], p2[0], p2[1]);
                const diff = Math.abs(effectiveHeading - roadBearing);
                const angleDiff = diff > 180 ? 360 - diff : diff;
                
                const isNearLastIndex = (lastIndex !== -1 && Math.abs(i - lastIndex) < 8);
                const maxAngle = isNearLastIndex ? 140 : 100;

                if (angleDiff > maxAngle) {
                    directionalMatch = false;
                }
            }

            if (directionalMatch && distance <= threshold) {
                minDist = distance;
                closestPoint = point;
                closestIndex = i;
            }
        }
    }

    if (closestIndex === -1 && lastIndex !== -1) {
        const fallbackThreshold = threshold * 0.8;
        return findClosestPointOnRoute(userLat, userLng, userHeading, routePath, -1, fallbackThreshold, speed);
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

export const getTrimmedRoutePath = (startPoint, routePath, targetIdx, eIdx) => {
    if (!startPoint || !routePath || routePath.length === 0) return [];
    
    // Safety
    let startI = Math.max(0, Math.min(targetIdx, routePath.length - 1));
    let endI = (eIdx !== undefined && eIdx !== null) ? eIdx : routePath.length - 1;
    
    // Base Check
    const remainingPath = routePath.slice(startI, endI + 1);
    
    if (remainingPath.length <= 1) {
        if (remainingPath.length > 0) return [[startPoint[0], startPoint[1]], ...remainingPath];
        return remainingPath;
    }

    const currentPos = [startPoint[0], startPoint[1]];
    let activeCoords = [currentPos, ...remainingPath];
    let foundSegment = false;
    
    // Look ahead up to 50 segments (increased from 5 for safety)
    const lookAheadCount = Math.min(50, remainingPath.length - 1);
    let lastPassedIndex = -1;

    for (let i = 0; i < lookAheadCount; i++) {
        const pA = remainingPath[i];
        const pB = remainingPath[i+1];
        
        const Ax = pA[1]; const Ay = pA[0];
        const Bx = pB[1]; const By = pB[0];
        const Cx = currentPos[1]; const Cy = currentPos[0];

        const ABx = Bx - Ax;
        const ABy = By - Ay;
        const ACx = Cx - Ax;
        const ACy = Cy - Ay;

        const dot = ACx * ABx + ACy * ABy;
        const lenSq = ABx * ABx + ABy * ABy;
        
        const t = lenSq > 0 ? dot / lenSq : -1;

        if (t > 1) {
            // Car is past this segment (A->B).
            // Track this index so if we exit loop, we know we can prune up to here.
            lastPassedIndex = i;
            continue;
        } else if (t >= 0) {
            // Car is projected ON this segment (between A and B) or slightly before A
            // Connect Car -> B -> rest...
            // Note: using i+1 includes point B as the next point
            activeCoords = [currentPos, ...remainingPath.slice(i + 1)];
            foundSegment = true;
            break;
        } else {
            // t < 0: Car is projected before A.
            // This suggests we are technically on this segment (approaching A->B) 
            // OR we are between the previous segment and this one.
            // We'll connect Car -> A -> B...
            activeCoords = [currentPos, ...remainingPath.slice(i)];
            foundSegment = true;
            break;
        }
    }
    
    // Fallback: If loop finished without finding an "active" segment (foundSegment = false)
    if (!foundSegment) {
       if (lastPassedIndex !== -1) {
           // We passed all segments we checked. So the car is likely ahead of the lookAhead window.
           // Start drawing from the end of the last passed segment.
           activeCoords = [currentPos, ...remainingPath.slice(lastPassedIndex + 1)];
       } else {
           // We didn't pass anything? Maybe t was always < 0? 
           // Revert to standard fallback
           activeCoords = [currentPos, ...remainingPath];
       }
    }
    
    return activeCoords;
};
