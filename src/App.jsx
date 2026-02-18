import React, { useState, useEffect, lazy, Suspense } from 'react'
import { useAuth } from './contexts/AuthContext'
import { supabase } from './utils/supabaseClient'
import { ToastProvider } from './components/ui/ToastNotification'
import LoadingScreen from './components/ui/LoadingScreen'
import ErrorBoundary from './components/ui/ErrorBoundary'

// Lazy load heavy views
const TechnicianView = lazy(() => import('./components/views/TechnicianView'));
const CustomerView = lazy(() => import('./components/views/CustomerView'));
const AdminDashboard = lazy(() => import('./components/views/admin/AdminDashboard'));

function App() {
  const { user, loading: authLoading } = useAuth();
  const [userProfile, setUserProfile] = useState(null);
  const [profileLoading, setProfileLoading] = useState(true);

  const [sharedLocation, setSharedLocation] = useState(null);

  useEffect(() => {
    // Check for shared location in URL
    const params = new URLSearchParams(window.location.search);
    const lat = parseFloat(params.get('share_lat'));
    const lng = parseFloat(params.get('share_lng'));
    const pointsStr = params.get('points');

    if (!isNaN(lat) && !isNaN(lng)) {
      setSharedLocation({ lat, lng });
    } else if (pointsStr) {
      const pointPairs = pointsStr.split('|');
      const coords = pointPairs.map(p => {
        const [pLat, pLng] = p.split(',').map(Number);
        return (!isNaN(pLat) && !isNaN(pLng)) ? [pLat, pLng] : null;
      }).filter(c => c !== null);

      if (coords.length > 0) {
        setSharedLocation({ isMulti: true, coords });
      }
    }
  }, []);

  useEffect(() => {
    const minLoadingTime = new Promise(resolve => setTimeout(resolve, 1500));

    if (user) {
      setProfileLoading(true);
      const fetchProfile = supabase.from('profiles').select('*').eq('id', user.id).single();

      Promise.all([fetchProfile, minLoadingTime]).then(([result]) => {
        setUserProfile(result.data);
        setProfileLoading(false);
      });
    } else {
      minLoadingTime.then(() => {
        setUserProfile(null);
        setProfileLoading(false);
      });
    }
  }, [user]);

  if (authLoading || profileLoading) {
    return <LoadingScreen />;
  }

  return (

    <ToastProvider>
      <ErrorBoundary>
        <Suspense fallback={<LoadingScreen />}>
          {(!user) ? (
            <TechnicianView user={null} userProfile={null} sharedLocation={sharedLocation} />
          ) : (userProfile?.role === 'admin') ? (
            <AdminDashboard user={user} userProfile={userProfile} />
          ) : (userProfile?.role === 'user') ? (
            <CustomerView user={user} sharedLocation={sharedLocation} />
          ) : (
            <TechnicianView user={user} userProfile={userProfile} sharedLocation={sharedLocation} />
          )}
        </Suspense>
      </ErrorBoundary>
    </ToastProvider>
  );
}

export default App;
