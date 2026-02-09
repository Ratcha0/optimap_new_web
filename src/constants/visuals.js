export const APP_THEME = {
    PRIMARY: '#3B82F6',
    SECONDARY: '#6366F1',
    EMERGENCY: '#EF4444',
    SUCCESS: '#10B981',
    WARNING: '#F59E0B',
    INACTIVE: '#94A3B8',
    DARK_GLASS: 'bg-black/40 backdrop-blur-2xl border border-white/10',
    LIGHT_GLASS: 'bg-white/80 backdrop-blur-2xl border border-white/40'
};

export const NAVIGATION_MODES = [
    { id: 'driving', label: 'DRIVE', icon: '🚗' },
    { id: 'motorbike', label: 'MOTO', icon: '🛵' },
    { id: 'foot', label: 'WALK', icon: '🚶' },
    { id: 'bike', label: 'BIKE', icon: '🚴' }
];

export const TICKET_STATUS = {
    PENDING: { id: 'pending', label: 'รอรับงาน', color: 'text-amber-600', hex: '#D97706', bg: 'bg-amber-50' },
    ACCEPTED: { id: 'accepted', label: 'รับงานแล้ว', color: 'text-blue-600', hex: '#2563EB', bg: 'bg-blue-50' },
    IN_PROGRESS: { id: 'in_progress', label: 'กำลังเดินทาง', color: 'text-indigo-600', hex: '#4F46E5', bg: 'bg-indigo-50' },
    COMPLETED: { id: 'completed', label: 'เสร็จสิ้น', color: 'text-emerald-600', hex: '#059669', bg: 'bg-emerald-50' }
};
export const MAP_CONFIG = {
    DEFAULT_CENTER: [12.662882, 102.080809], // Chanthaburi isuzu ตำแหน่งตอนเปิดแอพ
    DEFAULT_ZOOM: 18,
    SHARE_ZOOM: 18,
    BRANCHES: [
        {
            id: 'main',
            name: 'อีซูซุประชากิจจันทบุรี (สำนักงานใหญ่)',
            position: [12.662882, 102.080809],
            phone: '039336088'
        },
        {
            id: 'nayaiam',
            name: 'อีซูซุประชากิจ (สาขานายายอาม)',
            position: [12.777209, 101.828952],
            phone: '0843624203'
        },
        {
            id: 'khlung',
            name: 'อีซูซุประชากิจ (สาขาขลุง)',
            position: [12.464065, 102.224595],
            phone: '039442600'
        },
        {
            id: 'soidao',
            name: 'อีซูซุประชากิจ (สาขาสอยดาว)',
            position: [13.130850, 102.210334],
            phone: '0843624205'
        }
    ]
};
