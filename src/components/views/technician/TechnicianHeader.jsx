import React from 'react';

export default function TechnicianHeader({ title, pendingCount, onShowJobs, userProfile, user, onAuthClick, onProfileClick, isImmersive }) {
    const isUserAuthenticated = user?.role === 'authenticated';

    if (isImmersive) return null;

    return (
        <div className="fixed top-0 left-0 w-full z-[1001] animate-in slide-in-from-top duration-500">
            <header className="flex items-center justify-between px-3 sm:px-6 py-1.5 sm:py-4 bg-white text-gray-900 shadow-md relative overflow-hidden backdrop-blur-md border-b border-gray-100/50">
                <div className="flex items-center gap-2.5 sm:gap-6 z-10">
                    <div className="w-2.5 h-2.5 bg-green-500 rounded-full animate-pulse shadow-[0_0_15px_rgba(34,197,94,0.6)]"></div>
                    <div className="flex flex-col">
                        <h1 className="text-xs sm:text-lg font-bold text-gray-900 tracking-wide leading-tight truncate max-w-[120px] sm:max-w-none">{title || 'Smart Tracking'}</h1>
                        <span className="text-[7px] sm:text-[10px] font-bold text-blue-500 uppercase tracking-[0.2em] mt-0.5">
                            {user ? (userProfile?.role === 'technician' ? 'Technician Mode' : 'Guest Mode') : 'Guest Mode'}
                        </span>
                    </div>
                </div>

                <div className="flex items-center gap-3 z-10">
                    <button
                        onClick={onShowJobs}
                        className="relative w-10 h-10 sm:w-12 sm:h-12 flex items-center justify-center bg-gray-100 hover:bg-gray-200 text-gray-500 hover:text-blue-600 rounded-xl sm:rounded-2xl transition-all active:scale-95 border border-gray-100"
                    >
                        <svg className="w-5 h-5 sm:w-6 sm:h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01" />
                        </svg>
                        {pendingCount > 0 && (
                            <span className="absolute top-1 right-1 w-2 h-2 bg-red-500 rounded-full shadow-lg border-2 border-white"></span>
                        )}
                    </button>

                    {isUserAuthenticated ? (
                        <button
                            onClick={onProfileClick}
                            className="flex items-center justify-center w-10 h-10 sm:w-12 sm:h-12 bg-blue-600 hover:bg-blue-500 rounded-xl sm:rounded-2xl text-white font-bold text-base sm:text-lg shadow-lg hover:shadow-blue-500/30 transition-all active:scale-95"
                        >
                            {userProfile?.avatar_url ? (
                                <img src={userProfile.avatar_url} alt="Profile" className="w-full h-full object-cover rounded-xl sm:rounded-2xl" />
                            ) : (
                                <span>{(userProfile?.full_name || user.email?.[0] || 'T').substring(0, 1).toUpperCase()}</span>
                            )}
                        </button>
                    ) : (
                        <button onClick={onAuthClick} className="flex items-center justify-center w-12 h-12 bg-gray-100 hover:bg-gray-200 rounded-2xl text-gray-400 hover:text-blue-600 transition-all active:scale-95 border border-gray-100">
                            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M11 16l-4-4m0 0l4-4m-4 4h14m-5 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h7a3 3 0 013 3v1" />
                            </svg>
                        </button>
                    )}
                </div>
            </header>
        </div>
    );
}
