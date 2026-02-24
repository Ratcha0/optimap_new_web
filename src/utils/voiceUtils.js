let thaiVoice = null;
let lastSpeakTime = 0;

const findThaiVoice = () => {
    if (typeof window === 'undefined' || !window.speechSynthesis) return null;
    const voices = window.speechSynthesis.getVoices();
    let thai = voices.find(v => v.lang === 'th-TH' || v.lang === 'th_TH');
    if (!thai) {
        thai = voices.find(v =>
            v.name.toLowerCase().includes('thai') ||
            v.name.toLowerCase().includes('kanya') ||
            v.name.toLowerCase().includes('narisa')
        );
    }
    return thai;
};

if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
    window.speechSynthesis.onvoiceschanged = () => {
        thaiVoice = findThaiVoice();
    };
    thaiVoice = findThaiVoice();
}

const playChime = () => {
    try {
        const AudioContext = window.AudioContext || window.webkitAudioContext;
        if (!AudioContext) return;
        const ctx = new AudioContext();
        
        const playNote = (freq, startTime, duration, volume = 0.25) => {
            const osc = ctx.createOscillator();
            const gain = ctx.createGain();
            osc.type = 'sine';
            osc.frequency.setValueAtTime(freq, startTime);
            gain.gain.setValueAtTime(0, startTime);
            gain.gain.linearRampToValueAtTime(volume, startTime + 0.01);
            gain.gain.exponentialRampToValueAtTime(0.001, startTime + duration);
            osc.connect(gain);
            gain.connect(ctx.destination);
            osc.start(startTime);
            osc.stop(startTime + duration);
        };

        const now = ctx.currentTime;
        playNote(783.99, now, 0.15, 0.2);        // Note 1: Low-Mid
        playNote(987.77, now + 0.06, 0.12, 0.22); // Note 2: Mid
        playNote(1318.51, now + 0.12, 0.18, 0.25); // Note 3: High (Bright finish)
    } catch { /* ignore */ }
};

const playErrorChime = () => {
    try {
        const AudioContext = window.AudioContext || window.webkitAudioContext;
        if (!AudioContext) return;
        const ctx = new AudioContext();
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = 'square';
        osc.frequency.setValueAtTime(440, ctx.currentTime);
        osc.frequency.linearRampToValueAtTime(220, ctx.currentTime + 0.2);
        gain.gain.setValueAtTime(0.1, ctx.currentTime);
        gain.gain.linearRampToValueAtTime(0.01, ctx.currentTime + 0.2);
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start();
        osc.stop(ctx.currentTime + 0.25);
    } catch { /* ignore */ }
};

export const speak = (text, force = false) => {
    if (typeof window === 'undefined' || !('speechSynthesis' in window)) return;

    const now = Date.now();
    if (!force && now - lastSpeakTime < 2000) return;
    lastSpeakTime = now;

    window.speechSynthesis.cancel();
    
    if (text.includes('ขาดการเชื่อมต่อ') || text.includes('เลิกเชื่อมต่อ') || text.includes('ผิดพลาด')) {
        playErrorChime();
    } else {
        playChime();
    }

    const cleanText = text.replace(/[A-Za-z]/g, '').trim();
    if (!cleanText) return;

    const utterance = new SpeechSynthesisUtterance(cleanText);
    utterance.lang = 'th-TH';
    utterance.rate = 1.0;
    utterance.pitch = 1.0;

    if (!thaiVoice) thaiVoice = findThaiVoice();
    if (thaiVoice) utterance.voice = thaiVoice;

    window.speechSynthesis.speak(utterance);
};
