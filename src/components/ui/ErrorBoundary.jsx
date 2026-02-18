
import React from 'react';
import { logger } from '../../utils/logger';

class ErrorBoundary extends React.Component {
    constructor(props) {
        super(props);
        this.state = { hasError: false, error: null, errorInfo: null };
    }

    static getDerivedStateFromError(error) {
        return { hasError: true, error };
    }

    componentDidCatch(error, errorInfo) {
        logger.error(error, { componentStack: errorInfo.componentStack });
        this.setState({ errorInfo });
    }

    handleRetry = () => {
        this.setState({ hasError: false, error: null, errorInfo: null });
        window.location.reload(); 
    }

    render() {
        if (this.state.hasError) {
            return (
                <div className="flex flex-col items-center justify-center min-h-[50vh] p-6 text-center bg-gray-50 rounded-2xl border border-gray-200 shadow-sm m-4">
                    <div className="bg-red-100 p-4 rounded-full mb-4">
                        <svg className="w-12 h-12 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                        </svg>
                    </div>
                    <h2 className="text-xl font-black text-gray-900 mb-2">อู๊ยย! เกิดข้อผิดพลาดบางอย่าง</h2>
                    <p className="text-gray-500 mb-6 max-w-md">
                        ระบบทำงานผิดพลาดเล็กน้อย ไม่ต้องกังวลนะคะ ข้อมูลของคุณปลอดภัยดี ลองโหลดใหม่อีกครั้งค่ะ
                    </p>

                    <button
                        onClick={this.handleRetry}
                        className="bg-blue-600 hover:bg-blue-700 text-white font-bold py-3 px-8 rounded-full shadow-lg shadow-blue-500/30 transition-all active:scale-95 animate-bounce-slow"
                    >
                        ลองโหลดใหม่
                    </button>
                    <a href="/" className="mt-4 text-sm text-gray-400 font-bold hover:text-gray-600 cursor-pointer no-underline">
                        กลับหน้าแรก
                    </a>
                </div>
            );
        }

        return this.props.children;
    }
}

export default ErrorBoundary;
