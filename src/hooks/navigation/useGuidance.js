import { useState, useRef, useEffect } from 'react';
import { calculateDistance } from '../../utils/geoUtils';

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

    const checkLegProgress = (lat, lng, speed = 0) => {
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
        
        if (distToEnd < minDistToLegEnd.current) {
            minDistToLegEnd.current = distToEnd;
        }

        const speedKmh = speed; 
        const arrivalThreshold = speedKmh < 20 ? 15 : 30;

        const isCloseEnough = distToEnd < arrivalThreshold;
        const hasPassedBy = minDistToLegEnd.current < 20 && distToEnd > minDistToLegEnd.current + 15;

        if (isCloseEnough || hasPassedBy) {
            const isFinalLeg = currentLeg === routeLegs.length - 1;
            if (currentLeg !== lastFinishedLegRef.current) {
                if (onLegComplete) onLegComplete(currentLeg);
                const msg = isFinalLeg ? "ถึงจุดหมายปลายทางแล้วค่ะ" : "ถึงจุดหมายแล้วค่ะ";
                speak(`${msg} กรุณากดปุ่มเพื่อดำเนินการต่อค่ะ`);
                setIsWaitingForContinue(true);
                lastFinishedLegRef.current = currentLeg;
            }
        }
    };

    const smoothedEtaRef = useRef(null);

    const calculateETA = (currentIndex, speed) => {
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
        const timeHours = (totalDist / 1000) / effectiveSpeed;
        const rawMinutes = timeHours * 60;

        if (smoothedEtaRef.current === null || Math.abs(rawMinutes - smoothedEtaRef.current) > 10) {
            smoothedEtaRef.current = rawMinutes;
        } else {
            const alpha = 0.1; 
            smoothedEtaRef.current = (smoothedEtaRef.current * (1 - alpha)) + (rawMinutes * alpha);
        }

        const finalMinutes = Math.ceil(smoothedEtaRef.current);
        setEta(finalMinutes);
    };

    const checkVoiceGuidance = (lat, lng, currentIndex, speed = 0) => {
        checkLegProgress(lat, lng, speed);
        if (isWaitingForContinue) return;
        
        if (!navigationSteps || navigationSteps.length === 0) return;
        
        let currentStepIdx = -1;
        for (let i = 0; i < navigationSteps.length; i++) {
            const step = navigationSteps[i];
            if (currentIndex >= step.startIndex && currentIndex <= step.endIndex) {
                currentStepIdx = i;
                break;
            }
        }

        if (currentStepIdx !== -1) {
            activeStepIndex.current = currentStepIdx;
            const currentStep = navigationSteps[currentStepIdx];
            if (setCurrentInstruction) setCurrentInstruction(currentStep.instruction);

            if (currentStepIdx < navigationSteps.length - 1) {
                const nextStep = navigationSteps[currentStepIdx + 1];
                const maneuverLat = nextStep.maneuver.location[1];
                const maneuverLng = nextStep.maneuver.location[0];
                const instructions = nextStep.instruction;
                const distToManeuver = calculateDistance(lat, lng, maneuverLat, maneuverLng);
                
                setNextManeuver({
                    type: nextStep.maneuver.type,
                    modifier: nextStep.maneuver.modifier,
                    distance: distToManeuver,
                    instruction: instructions,
                    afterDistance: nextStep.distance
                });

                if (currentStepIdx < navigationSteps.length - 2) {
                    const followingStep = navigationSteps[currentStepIdx + 2];
                    setSecondNextManeuver({
                        type: followingStep.maneuver.type,
                        modifier: followingStep.maneuver.modifier,
                        instruction: followingStep.instruction,
                        distance: nextStep.distance
                    });
                } else {
                    setSecondNextManeuver(null);
                }

                const speedMps = speed / 3.6;
                const speedKmh = speed;

                let triggers = [
                    { type: 'very_far', dist: 1000, text: 'อีก 1 กิโลเมตร' },
                    { type: 'far', dist: 500, text: 'อีก 500 เมตร' },
                    { type: 'medium', dist: speedKmh > 40 ? 200 : 100, text: speedKmh > 40 ? 'อีก 200 เมตร' : 'อีก 100 เมตร' },
                    { type: 'near', dist: speedKmh > 40 ? 40 : 25, text: 'เตรียมตัว' }
                ];

                let triggerType = null;
                let textToSpeak = "";

                for (const t of triggers) {
                    const margin = Math.max(15, speedMps * 2); 
                    if (distToManeuver <= t.dist && distToManeuver > t.dist - margin) {
                        if (t.type === 'very_far' && speedKmh < 45) continue;
                        if (t.type === 'far' && speedKmh < 30) continue;
                        
                        triggerType = t.type;
                        textToSpeak = t.type === 'near' ? `${textToSpeak} ${instructions}` : `${t.text} ${instructions}`;
                        if (t.type === 'near') textToSpeak = `อีกนิดเดียว ${instructions}`;
                        break;
                    }
                }

                if (distToManeuver < 15) {
                    triggerType = 'now';
                    textToSpeak = instructions;
                }

                if (currentStepIdx !== lastSpokenStepIdx.current) {
                    if (lastSpokenStepIdx.current !== -1) {
                        const prevStep = navigationSteps[lastSpokenStepIdx.current];
                        if (prevStep && prevStep.distance > 1500) {
                            speak(`เลี้ยวเรียบร้อย ตรงไปต่ออีก ${(prevStep.distance / 1000).toFixed(1)} กิโลเมตรค่ะ`);
                        }
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
                if (routePath && routePath.length > 0) {
                    const lastPoint = routePath[routePath.length - 1];
                    const speedKmh = speed;
                    const arrivalThreshold = speedKmh < 20 ? 15 : 30;
                    
                    if (dist < arrivalThreshold && lastSpokenType.current !== 'arrived') {
                        speak("คุณเดินทางถึงที่หมายแล้วค่ะ");
                        lastSpokenType.current = 'arrived';
                        if (onArrival) onArrival();
                    }
                }
            }
        }
    };

    const resetGuidance = (legIndex = 0) => {
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
    };

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
