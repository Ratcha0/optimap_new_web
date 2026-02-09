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

export const speak = (text, force = false) => {
    if (typeof window === 'undefined' || !('speechSynthesis' in window)) return;

    const now = Date.now();
    if (!force && now - lastSpeakTime < 2000) return;
    lastSpeakTime = now;

    window.speechSynthesis.cancel();

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
