export const APP_THEME = {
    PRIMARY: '#3B82F6',
    SECONDARY: '#6366F1',
    EMERGENCY: '#EF4444',
    SUCCESS: '#10B981',
    WARNING: '#F59E0B',
    INACTIVE: '#6366F1',
    DARK_GLASS: 'bg-black/40 backdrop-blur-2xl border border-white/10',
    LIGHT_GLASS: 'bg-white/80 backdrop-blur-2xl border border-white/40'
};


export const TICKET_STATUS = {
    PENDING: { id: 'pending', label: 'รอรับงาน', color: 'text-rose-600', hex: '#E11D48', bg: 'bg-rose-50' },
    ACCEPTED: { id: 'accepted', label: 'รับงานแล้ว', color: 'text-orange-600', hex: '#EA580C', bg: 'bg-orange-50' },
    IN_PROGRESS: { id: 'in_progress', label: 'กำลังเดินทาง', color: 'text-blue-600', hex: '#2563EB', bg: 'bg-blue-50' },
    COMPLETED: { id: 'completed', label: 'เสร็จสิ้น', color: 'text-emerald-600', hex: '#059669', bg: 'bg-emerald-50' }
};
export const MAP_CONFIG = {
    DEFAULT_CENTER: [12.662882, 102.080809], // Chanthaburi isuzu ตำแหน่งตอนเปิดแอพ
    DEFAULT_ZOOM: 18,
    SHARE_ZOOM: 18,
    MAX_ZOOM: 19,
    MIN_ZOOM: 5,
    THAILAND_BOUNDS: [[5.61, 97.34], [20.46, 105.63]],
    BRANCHES: [
        {
            id: 'main',
            name: 'อีซูซุประชากิจจันทบุรี (สำนักงานใหญ่)',
            position: [12.66328, 102.08041],
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
