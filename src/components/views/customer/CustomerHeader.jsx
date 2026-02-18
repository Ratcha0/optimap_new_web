import React from 'react';

export default function CustomerHeader({ title, subtitle, onShowTickets, hasNotifications, userProfile, onProfileClick }) {
    return (
        <div className="fixed top-0 left-0 w-full z-[1001] animate-in slide-in-from-top duration-500">
            <header className="flex items-center justify-between px-3 sm:px-6 py-1 sm:py-2.5 bg-white text-gray-900 shadow-sm border-b border-gray-100 relative overflow-hidden backdrop-blur-md">

                <div className="flex items-center gap-2 sm:gap-4 z-10">
                    <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse shadow-[0_0_10px_rgba(34,197,94,0.5)]"></div>
                    <div className="flex flex-col">
                        <h1 className="text-[11px] sm:text-base font-bold text-gray-900 tracking-wide leading-tight truncate max-w-[120px] sm:max-w-none">{title || 'Smart Tracking'}</h1>
                        <p className="text-[6px] sm:text-[9px] font-bold text-blue-500 uppercase tracking-[0.15em] mt-0.5">{subtitle || 'Live Connection'}</p>
                    </div>
                </div>

                <div className="flex items-center gap-2 z-10">

                    <button
                        onClick={onShowTickets}
                        className="relative w-8 h-8 sm:w-10 sm:h-10 flex items-center justify-center bg-gray-100 hover:bg-gray-200 text-gray-500 hover:text-blue-600 rounded-lg sm:rounded-xl transition-all active:scale-95 border border-gray-200"
                    >
                        <svg className="w-4 h-4 sm:w-5 sm:h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01" />
                        </svg>
                        {hasNotifications && (
                            <span className="absolute top-0.5 right-0.5 w-1.5 h-1.5 bg-red-500 rounded-full border border-white"></span>
                        )}
                    </button>


                    <button
                        onClick={onProfileClick}
                        className="flex items-center justify-center w-8 h-8 sm:w-10 sm:h-10 bg-blue-600 hover:bg-blue-500 rounded-lg sm:rounded-xl text-white font-bold text-sm sm:text-base shadow-md transition-all active:scale-95 overflow-hidden"
                    >
                        {userProfile?.avatar_url ? (
                            <img 
                                src={userProfile.avatar_url} 
                                alt="Profile" 
                                className="w-full h-full object-cover" 
                                onError={(e) => {
                                    e.target.style.display = 'none';
                                    e.target.nextSibling.style.display = 'flex';
                                }}
                            />
                        ) : null}
                        <span style={{ display: userProfile?.avatar_url ? 'none' : 'flex' }}>
                            {(userProfile?.full_name || 'U').substring(0, 1).toUpperCase()}
                        </span>
                    </button>
                </div>
            </header>
        </div>
    );
}
