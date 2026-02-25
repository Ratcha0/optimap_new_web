import { useState, useRef, useEffect, useCallback } from 'react';
import { calculateDistance, calculateBearing } from '../../utils/geoUtils';

export const useGuidance = ({
    routePath,
    routeLegs,
    navigationSteps,
    speak,
    setCurrentInstruction,
    onLegComplete,
    onArrival,
    initialLegIndex = 0
}) => {
    const [eta, setEta] = useState(0);
    const [remainingDistance, setRemainingDistance] = useState(0);
    const [nextManeuver, setNextManeuver] = useState(null);
    const [secondNextManeuver, setSecondNextManeuver] = useState(null);
    const [isWaitingForContinue, setIsWaitingForContinue] = useState(false);
    const activeStepIndex = useRef(0);
    const lastSpokenType = useRef(null);
    const lastSpokenStepIdx = useRef(-1);
    const activeLegRef = useRef(initialLegIndex);
    const lastFinishedLegRef = useRef(initialLegIndex - 1);
    const minDistToLegEnd = useRef(Infinity);
    const lastCheckLeg = useRef(initialLegIndex - 1);
    const smoothedEtaRef = useRef(null);

    useEffect(() => {
        activeLegRef.current = initialLegIndex;
        lastFinishedLegRef.current = initialLegIndex - 1;
        lastCheckLeg.current = initialLegIndex - 1;
        minDistToLegEnd.current = Infinity;
        setIsWaitingForContinue(false); 
    }, [initialLegIndex, routePath, routeLegs]);

    const checkLegProgress = useCallback((lat, lng, speed = 0) => {
        if (isWaitingForContinue) return;
        if (!routeLegs || routeLegs.length === 0) return;
        
        const currentLeg = activeLegRef.current;
        if (currentLeg !== lastCheckLeg.current) {
            minDistToLegEnd.current = Infinity;
            lastCheckLeg.current = currentLeg;
        }

        if (currentLeg >= routeLegs.length) return;
        const legData = routeLegs[currentLeg];
        if (!legData) return;
        const legPoints = legData.coords || legData;
        if (!legPoints || legPoints.length === 0) return;
        
        const legEnd = legPoints[legPoints.length - 1];
        const distToEnd = calculateDistance(lat, lng, legEnd[0], legEnd[1]);
        
        const speedKmh = speed; 
        
        if (distToEnd < minDistToLegEnd.current) {
            minDistToLegEnd.current = distToEnd;
        }

      
        const arrivalThreshold = speedKmh < 15 ? 45 : 30;
        const isFinalLeg = currentLeg === routeLegs.length - 1;
        const speedLimit = isFinalLeg ? 28 : 85; 
        const isArrived = distToEnd < arrivalThreshold && speedKmh < speedLimit;
        const hasMissed = minDistToLegEnd.current < 40 && distToEnd > 70 && speedKmh > 15;

        if (isArrived || hasMissed) {
            if (currentLeg !== lastFinishedLegRef.current) {
                if (onLegComplete) onLegComplete(currentLeg);
                
                let sideText = "";
                if (legPoints.length > 2) {
                    const pBeforeEnd = legPoints[legPoints.length - 2];
                    const roadBearing = calculateBearing(pBeforeEnd[0], pBeforeEnd[1], legEnd[0], legEnd[1]);
                    const directBearing = calculateBearing(lat, lng, legEnd[0], legEnd[1]);
                    const diff = (directBearing - roadBearing + 540) % 360 - 180;
                    
                    if (Math.abs(diff) < 160) {
                        sideText = diff > 0 ? " ทางขวามือของคุณค่ะ" : " ทางซ้ายมือของคุณค่ะ";
                    }
                }

                let msg = isFinalLeg ? "ถึงจุดหมายปลายทางแล้วค่ะ" : "ถึงจุดหมายแล้วค่ะ";
                
                if (hasMissed && !isArrived) {
                    const overshootDist = Math.round(distToEnd);
                    msg = isFinalLeg ? `คุณขับเลยจุดหมายปลายทางมาแล้ว ${overshootDist} เมตรค่ะ` : `คุณขับเลยจุดหมายมาแล้ว ${overshootDist} เมตรค่ะ`;
                    speak(`${msg} กรุณาจอดรถในที่ปลอดภัยค่ะ`);
                } else {
                    speak(`${msg}${sideText} กรุณากดปุ่มเพื่อดำเนินการต่อค่ะ`);
                }

                setIsWaitingForContinue(true);
                lastFinishedLegRef.current = currentLeg;
            }
        }
    }, [isWaitingForContinue, routeLegs, onLegComplete, speak]);

    const calculateETA = useCallback((currentIndex, speed) => {
        if (!routePath || routePath.length === 0 || currentIndex >= routePath.length - 1) {
            setRemainingDistance(0);
            setEta(0);
            smoothedEtaRef.current = null;
            return;
        }

        let totalDist = 0;
        for (let i = currentIndex; i < routePath.length - 1; i++) {
            totalDist += calculateDistance(routePath[i][0], routePath[i][1], routePath[i + 1][0], routePath[i + 1][1]);
        }

        setRemainingDistance(totalDist);
        const currentSpeedKmh = speed || 0;
        const effectiveSpeed = currentSpeedKmh > 5 ? currentSpeedKmh : 25;
        const rawMinutes = ((totalDist / 1000) / effectiveSpeed) * 60;

        if (smoothedEtaRef.current === null || Math.abs(rawMinutes - smoothedEtaRef.current) > 10) {
            smoothedEtaRef.current = rawMinutes;
        } else {
            const alpha = 0.1; 
            smoothedEtaRef.current = (smoothedEtaRef.current * (1 - alpha)) + (rawMinutes * alpha);
        }
        setEta(Math.ceil(smoothedEtaRef.current));
    }, [routePath]);

    const checkVoiceGuidance = useCallback((lat, lng, currentIndex, speed = 0) => {
        checkLegProgress(lat, lng, speed);
        if (isWaitingForContinue || !navigationSteps || navigationSteps.length === 0) return;
        
        let currentStepIdx = -1;
        for (let i = 0; i < navigationSteps.length; i++) {
            const step = navigationSteps[i];
            if (currentIndex >= step.startIndex && currentIndex <= step.endIndex) {
                currentStepIdx = i;
                break;
            }
        }

        if (currentStepIdx !== -1) {
            const currentStep = navigationSteps[currentStepIdx];
            if (setCurrentInstruction) setCurrentInstruction(currentStep.instruction);

            if (currentStepIdx < navigationSteps.length - 1) {
                const nextStep = navigationSteps[currentStepIdx + 1];
                const distToManeuver = calculateDistance(lat, lng, nextStep.maneuver.location[1], nextStep.maneuver.location[0]);
                
                setNextManeuver({
                    type: nextStep.maneuver.type,
                    modifier: nextStep.maneuver.modifier,
                    distance: distToManeuver,
                    instruction: nextStep.instruction,
                    afterDistance: nextStep.distance
                });

                let combinationText = "";
                if (currentStepIdx < navigationSteps.length - 2) {
                    const fStep = navigationSteps[currentStepIdx + 2];
                    setSecondNextManeuver({
                        type: fStep.maneuver.type,
                        modifier: fStep.maneuver.modifier,
                        instruction: fStep.instruction,
                        distance: nextStep.distance
                    });
                    if (nextStep.distance < 80) combinationText = ` แล้วอีก ${Math.round(nextStep.distance)} เมตร ${fStep.instruction} ต่อทันทีค่ะ`;
                } else setSecondNextManeuver(null);

                const speedKmh = speed;
                const speedMps = speedKmh / 3.6;
                
                const triggers = [
                    { type: 'very_far', dist: Math.max(1000, speedKmh * 15), minSpeed: 60 },
                    { type: 'far', dist: Math.max(500, speedKmh * 8), minSpeed: 40 },
                    { type: 'medium', dist: Math.max(250, speedKmh * 4.5) },
                    { type: 'near', dist: Math.max(100, speedKmh * 2) }
                ];

                let triggerType = null;
                let textToSpeak = "";
                for (const t of triggers) {
                    if (t.minSpeed && speedKmh < t.minSpeed) continue;
                    const margin = Math.max(30, speedMps * 2.8); 
                    if (distToManeuver <= t.dist && distToManeuver > t.dist - margin) {
                        triggerType = t.type;
                        textToSpeak = t.dist >= 1000 ? `อีก ${(t.dist / 1000).toFixed(1)} กิโลเมตร ${nextStep.instruction}` : `อีก ${Math.round(t.dist)} เมตร ${nextStep.instruction}`;
                        if (t.type === 'near') textToSpeak = `เตรียมตัว${nextStep.instruction}${combinationText}`;
                        break;
                    }
                }

                if (distToManeuver < 18) {
                    triggerType = 'now';
                    textToSpeak = `${nextStep.instruction}${combinationText}`;
                }

                if (currentStepIdx !== lastSpokenStepIdx.current) {
                    if (lastSpokenStepIdx.current !== -1) {
                        const prevStep = navigationSteps[lastSpokenStepIdx.current];
                        if (prevStep && prevStep.distance > 1200) speak(`เลี้ยวเรียบร้อย ตรงไปต่ออีก ${(prevStep.distance / 1000).toFixed(1)} กิโลเมตรค่ะ`);
                    }
                    lastSpokenType.current = null;
                    lastSpokenStepIdx.current = currentStepIdx;
                }

                if (triggerType && triggerType !== lastSpokenType.current) {
                    speak(textToSpeak);
                    lastSpokenType.current = triggerType;
                }
            } else {
                setNextManeuver(null);
                setSecondNextManeuver(null);
                if (routePath?.length > 0) {
                    const distToFinal = calculateDistance(lat, lng, routePath[routePath.length - 1][0], routePath[routePath.length - 1][1]);
                    if (distToFinal < (speed < 20 ? 15 : 30) && lastSpokenType.current !== 'arrived') {
                        speak("คุณเดินทางถึงที่หมายแล้วค่ะ");
                        lastSpokenType.current = 'arrived';
                        if (onArrival) onArrival();
                    }
                }
            }
        }
    }, [checkLegProgress, isWaitingForContinue, navigationSteps, speak, routePath, onArrival, setCurrentInstruction]);

    const resetGuidance = useCallback((legIndex = 0) => {
        activeStepIndex.current = 0;
        lastSpokenType.current = null;
        lastSpokenStepIdx.current = -1;
        activeLegRef.current = legIndex;
        lastFinishedLegRef.current = legIndex - 1;
        minDistToLegEnd.current = Infinity;
        lastCheckLeg.current = legIndex - 1;
        setIsWaitingForContinue(false);
        setNextManeuver(null);
        setSecondNextManeuver(null);
    }, []);

    return {
        eta,
        remainingDistance,
        nextManeuver,
        secondNextManeuver,
        isWaitingForContinue,
        setIsWaitingForContinue,
        checkVoiceGuidance,
        calculateETA,
        checkLegProgress,
        resetGuidance,
        activeLegRef
    };
};
