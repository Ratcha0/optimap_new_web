import React, { useState } from 'react';
import { supabase } from '../../utils/supabaseClient';
import { useToast } from '../ui/ToastNotification';
import { EXTERNAL_LINKS } from '../../constants/api';

export default function AuthModal({ isOpen, onClose }) {
    const [authMode, setAuthMode] = useState('login');
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [fullName, setFullName] = useState('');
    const [phone, setPhone] = useState('');
    const [error, setError] = useState(null);
    const [loadingAuth, setLoadingAuth] = useState(false);
    const [showPassword, setShowPassword] = useState(false);
    const [showConfirmPassword, setShowConfirmPassword] = useState(false);
    const { showToast } = useToast();

    if (!isOpen) return null;

    const handleAuth = async (e) => {
        e.preventDefault();
        if (loadingAuth) return;
        setError(null);


        if (!email.includes('@')) return setError('กรุณากรอกรูปแบบอีเมลให้ถูกต้อง');
        if (password.length < 6) return setError('รหัสผ่านต้องมีความยาวอย่างน้อย 6 ตัวอักษร');

        if (authMode === 'signup') {
            if (!fullName.trim()) return setError('กรุณากรอกชื่อ-นามสกุล');
            if (!phone.trim()) return setError('กรุณากรอกเบอร์โทรศัพท์');
            if (password !== confirmPassword) return setError('รหัสผ่านไม่ตรงกัน');
        }

        setLoadingAuth(true);
        try {
            if (authMode === 'signup') {
                const { error: signUpError } = await supabase.auth.signUp({
                    email,
                    password,
                    options: {
                        data: {
                            role: 'user',
                            full_name: fullName,
                            phone: phone
                        }
                    }
                });
                if (signUpError) throw signUpError;
                showToast('สมัครสมาชิกสำเร็จ! กรุณาล็อกอิน', 'success');
                setAuthMode('login');
            } else {
                const { error: signInError } = await supabase.auth.signInWithPassword({ email, password });
                if (signInError) throw signInError;
                showToast('ยินดีต้อนรับ! เข้าสู่ระบบสำเร็จ', 'success');
                onClose();
            }
        } catch (err) {
            setError(err.message);
            showToast(err.message, 'error');
        } finally {
            setLoadingAuth(false);
        }
    };

    return (
        <div className="fixed inset-0 bg-gray-50/80 backdrop-blur-xl z-[9999] flex items-center justify-center p-4 sm:p-6 animate-in fade-in duration-500">
            <div className="bg-white border border-gray-100 w-full max-w-2xl p-6 sm:p-8 rounded-[2.5rem] sm:rounded-[3rem] shadow-[0_20px_50px_-12px_rgba(0,0,0,0.1)] relative overflow-hidden animate-in zoom-in-95 duration-500 max-h-[90vh] overflow-y-auto thin-scrollbar">
                <button
                    onClick={onClose}
                    className="absolute top-6 right-6 p-2 rounded-full bg-gray-100 hover:bg-gray-200 text-gray-500 hover:text-gray-900 transition-all z-10"
                >
                    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M6 18L18 6M6 6l12 12" />
                    </svg>
                </button>
                <div className="absolute top-0 left-0 right-0 h-1.5 bg-gradient-to-r from-blue-500 via-indigo-500 to-purple-500"></div>
                <div className="text-center mb-6 mt-2">
                    <div className="w-16 h-2 bg-gray-200 rounded-full mx-auto mb-6"></div>
                    <h3 className="text-2xl sm:text-3xl font-black text-gray-900 mb-2 uppercase tracking-tighter">{authMode === 'login' ? 'เข้าสู่ระบบ' : 'สมัครสมาชิก'}</h3>
                    <p className="text-[10px] text-gray-400 font-bold mb-4 uppercase tracking-[0.3em]">{authMode === 'login' ? 'เข้าสู่ระบบเพื่อใช้งาน' : 'กรอกข้อมูลเพื่อสมัครสมาชิก'}</p>
                </div>

                {error && <div className="bg-red-50 border border-red-100 text-red-600 text-[10px] font-black p-4 rounded-2xl mb-6 text-center uppercase tracking-wider">{error}</div>}

                <form onSubmit={handleAuth} className="space-y-3">
                    {authMode === 'signup' && (
                        <>
                            <div className="space-y-1">
                                <label className="text-[14px] font-black text-gray-700 uppercase tracking-widest block ml-2">ชื่อ-นามสกุล</label>
                                <input
                                    type="text" placeholder="สมชาย ใจดี" value={fullName} onChange={e => setFullName(e.target.value)}
                                    className="w-full bg-gray-50 border border-gray-100 p-4 rounded-2xl text-gray-900 font-bold focus:bg-white focus:border-blue-500 outline-none transition-all placeholder:text-gray-400 text-sm focus:ring-4 focus:ring-blue-500/10" required
                                />
                            </div>
                            <div className="space-y-1">
                                <label className="text-[14px] font-black text-gray-700 uppercase tracking-widest block ml-2">อีเมล</label>
                                <input
                                    type="email" placeholder="example@gmail.com" value={email} onChange={e => setEmail(e.target.value)}
                                    className="w-full bg-gray-50 border border-gray-100 p-4 rounded-2xl text-gray-900 font-bold focus:bg-white focus:border-blue-500 outline-none transition-all placeholder:text-gray-400 text-sm focus:ring-4 focus:ring-blue-500/10" required
                                />
                            </div>
                            <div className="space-y-1">
                                <label className="text-[14px] font-black text-gray-700 uppercase tracking-widest block ml-2">เบอร์โทรศัพท์</label>
                                <input
                                    type="tel" placeholder="081xxxxxxx" value={phone} onChange={e => setPhone(e.target.value)}
                                    className="w-full bg-gray-50 border border-gray-100 p-4 rounded-2xl text-gray-900 font-bold focus:bg-white focus:border-blue-500 outline-none transition-all placeholder:text-gray-400 text-sm focus:ring-4 focus:ring-blue-500/10" required
                                />
                            </div>
                        </>
                    )}

                    {authMode === 'login' && (
                        <div className="space-y-1">
                            <label className="text-[14px] font-black text-gray-700 uppercase tracking-widest block ml-2">ชื่อผู้ใช้ / อีเมล</label>
                            <input
                                type="email" placeholder="xxx@gmail.com" value={email} onChange={e => setEmail(e.target.value)}
                                className="w-full bg-gray-50 border border-gray-100 p-4 rounded-2xl text-gray-900 font-bold focus:bg-white focus:border-blue-500 outline-none transition-all placeholder:text-gray-400 text-sm focus:ring-4 focus:ring-blue-500/10" required
                            />
                        </div>
                    )}

                    <div className="space-y-1">
                        <label className="text-[14px] font-black text-gray-700 uppercase tracking-widest block ml-2">รหัสผ่าน</label>
                        <div className="relative">
                            <input
                                type={showPassword ? "text" : "password"}
                                placeholder="*******"
                                value={password}
                                onChange={e => setPassword(e.target.value)}
                                className="w-full bg-gray-50 border border-gray-100 p-4 rounded-2xl text-gray-900 font-bold focus:bg-white focus:border-blue-500 outline-none transition-all placeholder:text-gray-400 text-sm pr-12 focus:ring-4 focus:ring-blue-500/10"
                                required
                            />
                            <button
                                type="button"
                                onClick={() => setShowPassword(!showPassword)}
                                className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 transition-colors"
                            >
                                {showPassword ? (
                                    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5">
                                        <path strokeLinecap="round" strokeLinejoin="round" d="M3.98 8.223A10.477 10.477 0 0 0 1.934 12C3.226 16.338 7.244 19.5 12 19.5c.993 0 1.953-.138 2.863-.395M6.228 6.228A10.451 10.451 0 0 1 12 4.5c4.756 0 8.773 3.162 10.065 7.498a10.522 10.522 0 0 1-4.293 5.774M6.228 6.228 3 3m3.228 3.228 3.65 3.65m7.894 7.894L21 21m-3.228-3.228-3.65-3.65m0 0a3 3 0 1 0-4.243-4.243m4.242 4.242L9.88 9.88" />
                                    </svg>
                                ) : (
                                    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5">
                                        <path strokeLinecap="round" strokeLinejoin="round" d="M2.036 12.322a1.012 1.012 0 0 1 0-.639C3.423 7.51 7.36 4.5 12 4.5c4.638 0 8.573 3.007 9.963 7.178.07.207.07.431 0 .639C20.577 16.49 16.64 19.5 12 19.5c-4.638 0-8.573-3.007-9.963-7.178Z" />
                                        <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 1 1-6 0 3 3 0 0 1 6 0Z" />
                                    </svg>
                                )}
                            </button>
                        </div>
                    </div>

                    {authMode === 'signup' && (
                        <div className="space-y-1">
                            <label className="text-[14px] font-black text-gray-700 uppercase tracking-widest block ml-2">ยืนยันรหัสผ่าน</label>
                            <div className="relative">
                                <input
                                    type={showConfirmPassword ? "text" : "password"}
                                    placeholder="*******"
                                    value={confirmPassword}
                                    onChange={e => setConfirmPassword(e.target.value)}
                                    className="w-full bg-gray-50 border border-gray-100 p-4 rounded-2xl text-gray-900 font-bold focus:bg-white focus:border-blue-500 outline-none transition-all placeholder:text-gray-400 text-sm pr-12 focus:ring-4 focus:ring-blue-500/10"
                                    required
                                />
                                <button
                                    type="button"
                                    onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                                    className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 transition-colors"
                                >
                                    {showConfirmPassword ? (
                                        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5">
                                            <path strokeLinecap="round" strokeLinejoin="round" d="M3.98 8.223A10.477 10.477 0 0 0 1.934 12C3.226 16.338 7.244 19.5 12 19.5c.993 0 1.953-.138 2.863-.395M6.228 6.228A10.451 10.451 0 0 1 12 4.5c4.756 0 8.773 3.162 10.065 7.498a10.522 10.522 0 0 1-4.293 5.774M6.228 6.228 3 3m3.228 3.228 3.65 3.65m7.894 7.894L21 21m-3.228-3.228-3.65-3.65m0 0a3 3 0 1 0-4.243-4.243m4.242 4.242L9.88 9.88" />
                                        </svg>
                                    ) : (
                                        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5">
                                            <path strokeLinecap="round" strokeLinejoin="round" d="M2.036 12.322a1.012 1.012 0 0 1 0-.639C3.423 7.51 7.36 4.5 12 4.5c4.638 0 8.573 3.007 9.963 7.178.07.207.07.431 0 .639C20.577 16.49 16.64 19.5 12 19.5c-4.638 0-8.573-3.007-9.963-7.178Z" />
                                            <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 1 1-6 0 3 3 0 0 1 6 0Z" />
                                        </svg>
                                    )}
                                </button>
                            </div>
                        </div>
                    )}

                    <button type="submit" disabled={loadingAuth} className="w-full bg-blue-600 hover:bg-blue-500 text-white font-black py-4 rounded-2xl shadow-xl shadow-blue-500/30 active:scale-95 transition-all text-[12px] uppercase tracking-[0.3em] mt-4 flex items-center justify-center gap-2">
                        {loadingAuth ? (
                            <div className="w-4 h-4 border-2 border-white/20 border-t-white rounded-full animate-spin"></div>
                        ) : (authMode === 'login' ? 'เข้าสู่ระบบ' : 'สมัครสมาชิก')}
                    </button>
                </form>

                <div className="my-10 flex items-center gap-4 py-2">
                    <div className="flex-1 h-px bg-gray-200"></div>
                    <span className="text-[14px] text-gray-400 font-black uppercase tracking-widest">หรือ</span>
                    <div className="flex-1 h-px bg-gray-200"></div>
                </div>

                <button
                    onClick={async () => {
                        try {
                            const { error } = await supabase.auth.signInWithOAuth({ provider: 'google', options: { redirectTo: window.location.origin } });
                            if (error) throw error;
                        } catch (error) { setError(error.message); }
                    }}
                    className="w-full bg-white border border-gray-200 flex items-center justify-center gap-3 p-5 rounded-2xl hover:bg-gray-50 transition-all active:scale-95 group shadow-sm"
                >
                    <img src={EXTERNAL_LINKS.GOOGLE_AUTH_ICON} alt="G" className="w-5 group-hover:scale-110 transition-transform" />
                    <span className="text-[12px] font-black text-gray-700 uppercase tracking-[0.2em]">Login with Google</span>
                </button>



                <div className="text-center text-[12px] font-black uppercase tracking-widest text-gray-400 mt-2">
                    {authMode === 'login' ? (
                        <span>ยังไม่มีบัญชี? <button onClick={() => setAuthMode('signup')} className="text-blue-500 hover:text-blue-600 ml-1">คลิกสมัครสมาชิก</button></span>
                    ) : (
                        <span>มีบัญชีแล้ว? <button onClick={() => setAuthMode('login')} className="text-blue-500 hover:text-blue-600 ml-1">คลิกเข้าสู่ระบบ</button></span>
                    )}
                </div>
            </div>
        </div>
    );
}
