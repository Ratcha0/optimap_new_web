import React, { useState } from 'react';
import { useToast } from '../ui/ToastNotification';
import { PROVINCES } from '../../constants/provinces';

export default function ReportIssueModal({ isOpen, onClose, onSubmit, myPosition, userProfile }) {
    const [issueType, setIssueType] = useState('GPS');
    const [details, setDetails] = useState('');
    const [carNumber, setCarNumber] = useState('');
    const [carReg, setCarReg] = useState('');
    const [province, setProvince] = useState('');
    const [isSubmitting, setIsSubmitting] = useState(false);
    const { showToast } = useToast();



    if (!isOpen) return null;

    const handleSubmit = async (e) => {
        e.preventDefault();
        setIsSubmitting(true);
        await onSubmit(issueType, details, {
            car_number: carNumber,
            car_reg: carReg,
            province: province
        });
        setIsSubmitting(false);
        setDetails('');
        setCarNumber('');
        setCarReg('');
        setProvince('');
        onClose();
    };

    return (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-xl z-[11000] flex items-center justify-center p-4 sm:p-6 animate-in fade-in duration-500 overflow-y-auto">
            <div className="bg-white w-full max-w-2xl min-w-[300px] my-auto rounded-[2rem] sm:rounded-[3rem] shadow-2xl relative animate-in zoom-in-95 duration-500 overflow-hidden">
                <div className="bg-gradient-to-br from-orange-400 via-amber-500 to-red-500 px-6 sm:px-8 pt-6 sm:pt-10 pb-16 sm:pb-20 text-center relative overflow-hidden">
                    <div className="absolute top-0 left-0 w-full h-full opacity-30 pointer-events-none">
                        <div className="absolute -top-24 -left-24 w-64 h-64 bg-white/20 rounded-full blur-3xl animate-pulse"></div>
                        <div className="absolute -bottom-24 -right-24 w-64 h-64 bg-black/10 rounded-full blur-3xl"></div>
                    </div>

                    <button
                        type="button"
                        onClick={onClose}
                        className="absolute top-3 right-3 sm:top-4 sm:right-4 p-3 sm:p-4 bg-white/20 text-white hover:bg-white/40 rounded-full transition-all active:scale-95 border border-white/20 z-[100] flex items-center justify-center group"
                        aria-label="Close"
                    >
                        <svg className="w-5 h-5 sm:w-6 sm:h-6 group-hover:rotate-90 transition-transform duration-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M6 18L18 6M6 6l12 12" />
                        </svg>
                    </button>

                    <div className="relative z-10">
                        <div className="w-12 h-12 sm:w-20 sm:h-20 bg-white/20 backdrop-blur-md rounded-2xl sm:rounded-[2.5rem] flex items-center justify-center mx-auto mb-3 sm:mb-6 text-xl sm:text-3xl shadow-2xl border border-white/30 animate-float">📢</div>
                        <h2 className="text-xl sm:text-3xl font-black text-white leading-tight uppercase tracking-tighter">แจ้งซ่อม / แจ้งปัญหา</h2>
                        <p className="text-[10px] sm:text-[12px] font-black text-white/80 uppercase tracking-[0.2em] sm:tracking-[0.3em] mt-1 italic">กรุณากรอกข้อมูลด้านล่าง</p>
                    </div>
                </div>

               
                <div className="px-6 pb-12 -mt-12 relative z-20">
                    <div className="bg-white/95 backdrop-blur-3xl rounded-[2.5rem] p-6 shadow-2xl border border-white/50">
                        <form onSubmit={handleSubmit} className="space-y-6">
                            <div className="space-y-2 sm:space-y-3">
                                <label className="text-[10px] sm:text-[12px] uppercase font-black tracking-widest text-gray-400 ml-4">วิธีระบุตำแหน่ง</label>
                                <div className="grid grid-cols-2 gap-3 sm:gap-4">
                                    <button
                                        type="button"
                                        onClick={() => setIssueType('GPS')}
                                        className={`p-3 sm:p-5 rounded-2xl sm:rounded-[2rem] border-2 transition-all flex flex-col items-center gap-2 sm:gap-3 group active:scale-95 ${issueType === 'GPS'
                                            ? 'border-orange-500 bg-orange-50 shadow-lg shadow-orange-100'
                                            : 'border-transparent bg-gray-50/50'
                                            }`}
                                    >
                                        <span className={`text-xl sm:text-2xl transition-transform ${issueType === 'GPS' ? 'scale-110' : 'opacity-40'}`}>📍</span>
                                        <span className={`text-[10px] sm:text-[12px] font-black uppercase tracking-tight ${issueType === 'GPS' ? 'text-orange-600' : 'text-gray-400'}`}>GPS ปัจจุบัน</span>
                                        {issueType === 'GPS' && myPosition && (
                                            <span className="text-[8px] sm:text-[10px] text-orange-400 font-black opacity-60 tabular-nums">
                                                {myPosition[0].toFixed(3)}, {myPosition[1].toFixed(3)}
                                            </span>
                                        )}
                                    </button>

                                    <button
                                        type="button"
                                        onClick={() => {
                                            if (userProfile?.home_lat) setIssueType('Profile');
                                            else showToast('กรุณาเลือกตำแหน่งที่หน้าโปรไฟล์ก่อน', 'warning');
                                        }}
                                        className={`p-3 sm:p-5 rounded-2xl sm:rounded-[2rem] border-2 transition-all flex flex-col items-center gap-2 sm:gap-3 group active:scale-95 ${issueType === 'Profile'
                                            ? 'border-orange-500 bg-orange-50 shadow-lg shadow-orange-100'
                                            : 'border-transparent bg-gray-50/50'
                                            }`}
                                    >
                                        <span className={`text-xl sm:text-2xl transition-transform ${issueType === 'Profile' ? 'scale-110' : 'opacity-40'}`}>🏠</span>
                                        <span className={`text-[10px] sm:text-[12px] font-black uppercase tracking-tight ${issueType === 'Profile' ? 'text-orange-600' : 'text-gray-400'}`}>จากโปรไฟล์</span>
                                        {issueType === 'Profile' && userProfile?.home_lat && (
                                            <span className="text-[8px] sm:text-[10px] text-orange-400 font-black opacity-60 tabular-nums">
                                                {userProfile.home_lat.toFixed(3)}, {userProfile.home_lng.toFixed(3)}
                                            </span>
                                        )}
                                    </button>
                                </div>
                            </div>

                            <div className="space-y-2 sm:space-y-3">
                                <label className="text-[10px] sm:text-[12px] uppercase font-black tracking-widest text-gray-400 ml-4">ข้อมูลรถยนต์</label>
                                <div className="grid grid-cols-2 bg-gray-50/50 rounded-2xl sm:rounded-[1.8rem] border border-gray-100 overflow-hidden divide-x divide-gray-100">
                                    <input
                                        type="text"
                                        placeholder="1กง"
                                        value={carNumber}
                                        onChange={(e) => setCarNumber(e.target.value)}
                                        className="w-full bg-transparent px-4 py-3 sm:py-5 text-sm font-black text-gray-800 placeholder:text-gray-300 outline-none text-center min-w-0"
                                    />
                                    <input
                                        type="text"
                                        placeholder="1234"
                                        value={carReg}
                                        onChange={(e) => setCarReg(e.target.value)}
                                        className="w-full bg-transparent px-4 py-3 sm:py-5 text-sm font-black text-gray-800 placeholder:text-gray-300 outline-none text-center min-w-0"
                                    />
                                </div>
                                <div className="relative">
                                    <select
                                        value={province}
                                        onChange={(e) => setProvince(e.target.value)}
                                        className="w-full bg-gray-50/50 border border-gray-100 p-3 sm:p-5 rounded-2xl sm:rounded-[1.8rem] text-xs font-black text-gray-800 outline-none appearance-none cursor-pointer focus:bg-white transition-all shadow-sm pl-6"
                                    >
                                        <option value="">เลือกจังหวัด</option>
                                        {PROVINCES.map(p => <option key={p} value={p}>{p}</option>)}
                                    </select>
                                    <div className="absolute right-6 top-1/2 -translate-y-1/2 pointer-events-none text-gray-300">
                                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M19 9l-7 7-7-7" /></svg>
                                    </div>
                                </div>
                            </div>

                            <div className="space-y-3">
                                <label className="text-[10px] uppercase font-black tracking-widest text-gray-400 ml-4">รายละเอียดเพิ่มเติม</label>
                                <textarea
                                    value={details}
                                    onChange={(e) => setDetails(e.target.value)}
                                    placeholder="รายระเอียดเพิ่มเติม..."
                                    required
                                    className="w-full bg-gray-50/50 border border-gray-100 p-6 rounded-[2rem] text-sm font-bold text-gray-800 outline-none focus:bg-white transition-all min-h-[120px] shadow-sm placeholder:text-gray-300"
                                />
                            </div>

                            <div className="grid grid-cols-1 gap-4 pt-0 sm:pt-2">
                                <button
                                    type="submit"
                                    disabled={isSubmitting}
                                    className="w-full bg-black text-white font-black py-4 sm:py-5 rounded-2xl sm:rounded-[2rem] shadow-xl text-[10px] sm:text-[11px] uppercase tracking-[0.2em] sm:tracking-[0.3em] active:scale-95 transition-all disabled:opacity-50 flex items-center justify-center gap-2 sm:gap-3"
                                >
                                    {isSubmitting ? (
                                        <div className="w-4 h-4 sm:w-5 sm:h-5 border-3 border-white/20 border-t-white rounded-full animate-spin"></div>
                                    ) : (
                                        <>
                                            <span>ส่งคำขอ</span>
                                            <svg className="w-4 h-4 sm:w-5 sm:h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M14 5l7 7m0 0l-7 7m7-7H3" /></svg>
                                        </>
                                    )}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            </div>
        </div>
    );
}
