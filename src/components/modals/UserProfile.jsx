import React, { useState, useEffect, useRef } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { supabase } from '../../utils/supabaseClient';

export default function UserProfile({ isOpen, onClose, user: propUser, onUpdate, setActiveSelection, activeSelection }) {
    const { user: authUser, signOut } = useAuth();
    const user = propUser || authUser;
    const fileInputRef = useRef(null);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [uploading, setUploading] = useState(false);
    const [profileData, setProfileData] = useState({
        role: 'user',
        full_name: '',
        email: '',
        phone: '',
        avatar_url: '',
        home_lat: null,
        home_lng: null,
        address: '',
        team_name: '',
        car_reg: ''
    });
    const [message, setMessage] = useState({ type: '', text: '' });
    const [isEditing, setIsEditing] = useState(false);

    useEffect(() => {
        if (activeSelection?.status === 'confirmed' && activeSelection?.type === 'home-picking') {
            setProfileData(prev => ({
                ...prev,
                home_lat: activeSelection.coords[0],
                home_lng: activeSelection.coords[1]
            }));
            setMessage({ type: 'success', text: 'เลือกพิกัดบ้านสำเร็จ! อย่าลืมกดบันทึก' });
            if (setActiveSelection) setActiveSelection(null);
        }
    }, [activeSelection, setActiveSelection]);

    useEffect(() => {
        async function fetchProfile() {
            if (!user || !isOpen) return;
            try {
                setLoading(true);
                const { data } = await supabase.from('profiles').select('*').eq('id', user.id).single();
                if (data) {
                    setProfileData({
                        role: data.role || 'user',
                        full_name: data.full_name || '',
                        email: user.email,
                        phone: data.phone || '',
                        avatar_url: data.avatar_url || '',
                        home_lat: data.home_lat || null,
                        home_lng: data.home_lng || null,
                        address: data.address || '',
                        team_name: data.team_name || '',
                        car_reg: data.car_reg || ''
                    });
                }
            } catch (err) {
                
            } finally {
                setLoading(false);
            }
        }
        fetchProfile();
    }, [user, isOpen]);

    const handleFileUpload = async (e) => {
        try {
            setUploading(true);
            const file = e.target.files[0];
            if (!file) return;
            const fileExt = file.name.split('.').pop();
            const fileName = `${user.id}-${Date.now()}.${fileExt}`;
            const { error } = await supabase.storage.from('avatars').upload(fileName, file, { upsert: true, contentType: file.type });
            if (error) throw error;
            const { data: { publicUrl } } = supabase.storage.from('avatars').getPublicUrl(fileName);
            setProfileData(prev => ({ ...prev, avatar_url: publicUrl }));

            await supabase.from('profiles').upsert({ id: user.id, avatar_url: publicUrl, updated_at: new Date().toISOString() });
            setMessage({ type: 'success', text: 'อัปโหลดรูปสำเร็จ!' });
            if (onUpdate) onUpdate();
        } catch (error) {
            setMessage({ type: 'error', text: 'ผิดพลาด: ' + error.message });
        } finally {
            setUploading(false);
        }
    };

    const handleSave = async () => {
        setSaving(true);
        try {
            const { error } = await supabase.from('profiles').upsert({
                id: user.id,
                full_name: profileData.full_name,
                phone: profileData.phone,
                avatar_url: profileData.avatar_url,
                home_lat: profileData.home_lat,
                home_lng: profileData.home_lng,
                address: profileData.address,
                team_name: profileData.team_name,
                car_reg: profileData.car_reg,
                updated_at: new Date().toISOString(),
            });
            if (error) throw error;
            if (onUpdate) onUpdate();
            setMessage({ type: 'success', text: 'บันทึกเรียบร้อย!' });
            setIsEditing(false);
        } catch (err) {
            setMessage({ type: 'error', text: 'พลาด: ' + err.message });
        } finally {
            setSaving(false);
        }
    };

    const handleLogout = async () => {
        if (user?.id) {

            await supabase.from('profiles').update({
                last_lat: null,
                last_lng: null,
                last_updated: null
            }).eq('id', user.id);
        }
        await signOut();
        onClose();
    };

    const getCurrentGPSLocation = () => {
        if (!navigator.geolocation) {
            setMessage({ type: 'error', text: 'เบราว์เซอร์ของคุณไม่รองรับการระบุตำแหน่ง' });
            return;
        }

        setLoading(true);
        navigator.geolocation.getCurrentPosition(
            (pos) => {
                const { latitude, longitude } = pos.coords;
                setProfileData(prev => ({ ...prev, home_lat: latitude, home_lng: longitude }));
                setMessage({ type: 'success', text: 'ปักหมุดตามตำแหน่ง GPS สำเร็จ! อย่าลืมกดบันทึก' });
                setLoading(false);
            },
            (err) => {
                setMessage({ type: 'error', text: 'ไม่สามารถระบุตำแหน่งได้: ' + err.message });
                setLoading(false);
            },
            { enableHighAccuracy: true }
        );
    };

    const startPicking = () => {
        if (setActiveSelection) {
            setActiveSelection({ type: 'home-picking', status: 'picking' });
        }
    };

    const isPicking = activeSelection?.type === 'home-picking' &&
        (activeSelection?.status === 'picking' || activeSelection?.status === 'selecting');

    if (!isOpen || !user || isPicking) return null;

    const roleBadge = (() => {
        switch (profileData.role) {
            case 'technician': return { label: 'ช่างเทคนิค', color: 'bg-blue-500' };
            case 'admin': return { label: 'ผู้ดูแลระบบ', color: 'bg-purple-500' };
            default: return { label: 'ผู้ใช้งาน', color: 'bg-gray-500' };
        }
    })();

    return (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-[11000] flex items-center justify-center p-2 sm:p-4 animate-in fade-in duration-300">
            <div className="bg-white w-full max-w-[340px] rounded-[1.8rem] shadow-2xl relative animate-in zoom-in-95 duration-300 overflow-hidden flex flex-col max-h-[92vh]">


                <div className="bg-gradient-to-br from-blue-500 to-blue-600 px-4 sm:px-6 pt-6 sm:pt-8 pb-12 sm:pb-16 text-center relative shrink-0">
                    <button
                        onClick={onClose}
                        className="absolute top-4 right-4 p-2 bg-white/20 hover:bg-white/30 text-white rounded-xl transition-all active:scale-95"
                    >
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M6 18L18 6M6 6l12 12" />
                        </svg>
                    </button>

                    <div className="relative inline-block">
                        <div
                            className="w-20 h-20 sm:w-24 sm:h-24 bg-white rounded-full mx-auto cursor-pointer relative overflow-hidden flex items-center justify-center text-2xl sm:text-3xl shadow-xl border-4 border-white transition-transform active:scale-95"
                            onClick={() => fileInputRef.current.click()}
                        >
                            {profileData.avatar_url ? (
                                <img 
                                    src={profileData.avatar_url} 
                                    alt="Avatar" 
                                    className="w-full h-full object-cover" 
                                    onError={(e) => {
                                        if (e.target.style.display !== 'none') {
                                            e.target.style.display = 'none';
                                            if (e.target.nextSibling) e.target.nextSibling.style.display = 'flex';
                                        }
                                    }}
                                />
                            ) : null}
                            <span 
                                className="font-black text-blue-300" 
                                style={{ display: profileData.avatar_url ? 'none' : 'flex' }}
                            >
                                {(profileData.full_name || user.email)?.[0]?.toUpperCase()}
                            </span>
                            {uploading && (
                                <div className="absolute inset-0 flex items-center justify-center bg-white/80">
                                    <div className="w-6 h-6 border-3 border-blue-200 border-t-blue-600 rounded-full animate-spin"></div>
                                </div>
                            )}
                        </div>
                    </div>
                    <input type="file" ref={fileInputRef} onChange={handleFileUpload} accept="image/*" className="hidden" />

                    <div className="mt-4">
                        <div className="flex items-center justify-center gap-2">
                            <h2 className="text-xl font-bold text-white leading-tight">{profileData.full_name || 'ไม่ระบุชื่อ'}</h2>
                            <button onClick={() => setIsEditing(true)} className="p-1 hover:bg-white/20 rounded-lg transition-colors">
                                <svg className="w-4 h-4 text-white/80" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
                                </svg>
                            </button>
                        </div>
                        <p className="text-blue-100 text-sm mt-1">{user.email}</p>
                        <span className={`inline-block mt-3 px-4 py-1.5 ${roleBadge.color} text-white text-xs font-bold rounded-full uppercase tracking-wider`}>
                            {roleBadge.label}
                        </span>
                    </div>
                </div>


                <div className="px-3 sm:px-4 pb-4 sm:pb-5 -mt-5 sm:-mt-6 relative overflow-y-auto flex-1 thin-scrollbar">
                    <div className="bg-white rounded-xl shadow-lg border border-gray-100/50 overflow-hidden">
                        {message.text && (
                            <div className={`px-4 py-2.5 text-[10px] font-bold text-center ${message.type === 'success' ? 'bg-green-50 text-green-600' : 'bg-red-50 text-red-600'}`}>
                                {message.text}
                            </div>
                        )}

                        {isEditing ? (
                            <div className="p-3 space-y-3">
                                <div>
                                    <label className="text-[10px] font-bold text-gray-400 mb-1 ml-1 block uppercase">ชื่อ-นามสกุล</label>
                                    <input
                                        type="text"
                                        value={profileData.full_name}
                                        onChange={(e) => setProfileData({ ...profileData, full_name: e.target.value })}
                                        className="w-full border border-gray-100 bg-gray-50/30 rounded-lg px-3 py-2 text-sm font-bold text-gray-900 focus:bg-white focus:border-blue-400 outline-none transition-all"
                                        placeholder="กรอกชื่อ-นามสกุล"
                                    />
                                </div>
                                <div>
                                    <label className="text-[10px] font-bold text-gray-400 mb-1 ml-1 block uppercase">เบอร์โทรศัพท์</label>
                                    <input
                                        type="tel"
                                        value={profileData.phone}
                                        onChange={(e) => setProfileData({ ...profileData, phone: e.target.value })}
                                        className="w-full border border-gray-100 bg-gray-50/30 rounded-lg px-3 py-2 text-sm font-bold text-gray-900 focus:bg-white focus:border-blue-400 outline-none transition-all"
                                        placeholder="กรอกเบอร์โทรศัพท์"
                                    />
                                </div>
                                {profileData.role === 'technician' && (
                                    <>
                                        <div>
                                            <label className="text-[10px] font-bold text-gray-400 mb-1 ml-1 block uppercase">ทีมช่าง / สังกัด</label>
                                            <input
                                                type="text"
                                                value={profileData.team_name}
                                                onChange={(e) => setProfileData({ ...profileData, team_name: e.target.value })}
                                                className="w-full border border-gray-100 bg-gray-50/30 rounded-lg px-3 py-2 text-sm font-bold text-gray-900 focus:bg-white focus:border-blue-400 outline-none transition-all"
                                                placeholder="ชื่อทีมช่าง"
                                            />
                                        </div>
                                        <div>
                                            <label className="text-[10px] font-bold text-gray-400 mb-1 ml-1 block uppercase">ทะเบียนรถ</label>
                                            <input
                                                type="text"
                                                value={profileData.car_reg}
                                                onChange={(e) => setProfileData({ ...profileData, car_reg: e.target.value })}
                                                className="w-full border border-gray-100 bg-gray-50/30 rounded-lg px-3 py-2 text-sm font-bold text-gray-900 focus:bg-white focus:border-blue-400 outline-none transition-all"
                                                placeholder="เช่น กข 1234 กทม."
                                            />
                                        </div>
                                    </>
                                )}
                                <div>
                                    <label className="text-[10px] uppercase font-black tracking-widest text-gray-400 ml-1 mb-1 block">รายละเอียดที่อยู่</label>
                                    <textarea
                                        value={profileData.address}
                                        onChange={(e) => setProfileData({ ...profileData, address: e.target.value })}
                                        className="w-full bg-gray-50/30 border border-gray-100 px-3 py-2 rounded-lg text-xs font-bold text-gray-800 outline-none focus:bg-white focus:border-blue-400 transition-all min-h-[80px] shadow-sm placeholder:text-gray-300 resize-none"
                                        placeholder="เช่น บ้านเลขที่ 123/4 หมู่บ้าน... ซอย..."
                                    />
                                </div>
                                <div className="flex gap-2 pt-1">
                                    <button
                                        onClick={() => setIsEditing(false)}
                                        className="flex-1 py-2 text-xs border border-gray-200 text-gray-500 font-bold rounded-lg hover:bg-gray-50 transition-colors"
                                    >
                                        ยกเลิก
                                    </button>
                                    <button
                                        onClick={handleSave}
                                        disabled={saving}
                                        className="flex-1 py-2 text-xs bg-blue-500 text-white font-bold rounded-lg hover:bg-blue-600 transition-colors disabled:opacity-50"
                                    >
                                        {saving ? 'บันทึก...' : 'บันทึก'}
                                    </button>
                                </div>
                            </div>
                        ) : (
                            <div className="divide-y divide-gray-50">

                                <div className="flex items-center gap-3 px-4 py-3">
                                    <div className="w-8 h-8 bg-blue-50 rounded-lg flex items-center justify-center text-blue-500 shrink-0">
                                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
                                        </svg>
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <p className="text-[9px] text-gray-400 font-bold uppercase tracking-wide">เบอร์โทรศัพท์</p>
                                        <p className="text-xs font-black text-gray-900 truncate">{profileData.phone || 'ไม่ได้ระบุ'}</p>
                                    </div>
                                    <button onClick={() => setIsEditing(true)} className="p-1.5 hover:bg-gray-50 rounded-md transition-colors text-gray-300">
                                        <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
                                        </svg>
                                    </button>
                                </div>

                                {profileData.role === 'technician' && (
                                    <>
                                        <div className="flex items-center gap-3 px-4 py-3">
                                            <div className="w-8 h-8 bg-purple-50 rounded-lg flex items-center justify-center text-purple-500 shrink-0">
                                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                                                </svg>
                                            </div>
                                            <div className="flex-1 min-w-0">
                                                <p className="text-[9px] text-gray-400 font-bold uppercase tracking-wide">ทีมช่าง / สังกัด</p>
                                                <p className="text-xs font-black text-gray-900 truncate">{profileData.team_name || 'ยังไม่มีสังกัด'}</p>
                                            </div>
                                        </div>

                                        <div className="flex items-center gap-3 px-4 py-3">
                                            <div className="w-8 h-8 bg-indigo-50 rounded-lg flex items-center justify-center text-indigo-500 shrink-0">
                                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 17a2 2 0 11-4 0 2 2 0 014 0zM19 17a2 2 0 11-4 0 2 2 0 014 0z" />
                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 16V6a1 1 0 00-1-1H4a1 1 0 00-1 1v10a1 1 0 001 1h1m8-1a1 1 0 01-1 1H9m4-1V8a1 1 0 011-1h2.586a1 1 0 01.707.293l3.414 3.414a1 1 0 01.293.707V16a1 1 0 01-1 1h-1m-6-1a1 1 0 001 1h1M5 17a2 2 0 104 0m-4 0a2 2 0 114 0m6 0a2 2 0 104 0m-4 0a2 2 0 114 0" />
                                                </svg>
                                            </div>
                                            <div className="flex-1 min-w-0">
                                                <p className="text-[9px] text-gray-400 font-bold uppercase tracking-wide">ทะเบียนรถ</p>
                                                <p className="text-xs font-black text-gray-900 truncate">{profileData.car_reg || 'ไม่ได้ระบุ'}</p>
                                            </div>
                                        </div>
                                    </>
                                )}

                                <div className="px-4 py-3 bg-gray-50/40">
                                    <div className="flex items-center gap-3 mb-3">
                                        <div className="w-8 h-8 bg-orange-50 rounded-lg flex items-center justify-center text-orange-500 shrink-0">
                                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
                                            </svg>
                                        </div>
                                        <div className="flex-1 min-w-0">
                                            <p className="text-[9px] text-gray-400 font-bold uppercase tracking-wide">ตำแหน่งที่อยู่บ้าน</p>
                                            <p className="text-[10px] font-black text-gray-600 truncate">
                                                {profileData.home_lat ? `${profileData.home_lat.toFixed(5)}, ${profileData.home_lng.toFixed(5)}` : 'ยังไม่ได้ตั้งค่า'}
                                            </p>
                                        </div>
                                        {profileData.home_lat && (
                                            <button
                                                onClick={handleSave}
                                                disabled={saving}
                                                className="text-[9px] font-black text-blue-500 uppercase tracking-widest bg-white px-2 py-1 rounded-md shadow-sm border border-blue-50 active:scale-95 transition-all"
                                            >
                                                {saving ? '...' : 'SAVE'}
                                            </button>
                                        )}
                                    </div>

                                    <div className="grid grid-cols-2 gap-2">
                                        <button
                                            onClick={startPicking}
                                            className="flex items-center justify-center gap-1.5 py-2 bg-white border border-gray-100 rounded-lg text-[9px] font-black text-gray-700 hover:bg-gray-50 active:scale-95 transition-all shadow-sm"
                                        >
                                            <svg className="w-3.5 h-3.5 text-blue-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                                            </svg>
                                            เลือกบนแผนที่
                                        </button>
                                        <button
                                            onClick={getCurrentGPSLocation}
                                            className="flex items-center justify-center gap-1.5 py-2 bg-white border border-gray-100 rounded-lg text-[9px] font-black text-gray-700 hover:bg-gray-50 active:scale-95 transition-all shadow-sm"
                                        >
                                            <svg className="w-3.5 h-3.5 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M12 19c-3.87 0-7-3.13-7-7s3.13-7 7-7 7 3.13 7 7-3.13 7-7 7z" />
                                            </svg>
                                            อิงจาก GPS
                                        </button>
                                    </div>
                                </div>

                                <div className="px-4 py-3 bg-gray-50/20">
                                    <div className="flex items-center justify-between mb-2">
                                        <p className="text-[9px] uppercase font-black tracking-widest text-gray-400">รายละเอียดที่อยู่</p>
                                        <button onClick={() => setIsEditing(true)} className="text-[9px] font-black text-blue-500 uppercase tracking-widest bg-blue-50/50 px-2 py-0.5 rounded-md">แก้ไข</button>
                                    </div>
                                    <div className="bg-white border border-gray-100/50 p-3 rounded-lg">
                                        <p className="text-xs font-bold text-gray-800 break-words leading-relaxed min-h-[30px]">
                                            {profileData.address || <span className="text-gray-300 font-medium italic">ยังไม่ได้ระบุรายละเอียด</span>}
                                        </p>
                                    </div>
                                </div>
                            </div>
                        )}
                    </div>

                    <button
                        onClick={handleLogout}
                        className="w-full mt-4 py-3 bg-red-50/50 text-red-500 text-xs font-black rounded-xl hover:bg-red-100/50 transition-all flex items-center justify-center gap-2 active:scale-95 border border-red-100/30"
                    >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                        </svg>
                        ออกจากระบบ
                    </button>
                </div>
            </div>
        </div>
    );
}
