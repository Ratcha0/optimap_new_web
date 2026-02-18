import { useState, useEffect, createContext, useContext } from 'react';
import { supabase } from '../utils/supabaseClient';

const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
    const [user, setUser] = useState(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const session = supabase.auth.getSession().then(({ data: { session }, error }) => {
            if (error || !session) {
                if (window.location.hash && window.location.hash.includes('access_token')) {
                    
                    const newUrl = window.location.href.split('#')[0];
                    window.history.replaceState(null, '', newUrl);
                }
            }

            setUser(session?.user ?? null);
            setLoading(false);
        });

        const { data: { subscription } } = supabase.auth.onAuthStateChange(
            (event, session) => {

                if (window.location.hash && window.location.hash.includes('access_token')) {
                    if (['SIGNED_IN', 'TOKEN_REFRESHED', 'USER_UPDATED', 'SIGNED_OUT'].includes(event)) {
                        const newUrl = window.location.href.split('#')[0];
                        window.history.replaceState(null, '', newUrl);
                    }
                }

                setUser(session?.user ?? null);
                setLoading(false);
            }
        );

        return () => subscription.unsubscribe();
    }, []);

    const value = {
        signUp: (data) => supabase.auth.signUp(data),
        signIn: (data) => supabase.auth.signInWithPassword(data),
        signOut: async () => {
            try {
                await supabase.auth.signOut();
            } catch (error) {
            
            } finally {
                setUser(null);
            }
        },
        user,
    };

    return (
        <AuthContext.Provider value={value}>
            {!loading && children}
        </AuthContext.Provider>
    );
};

export const useAuth = () => {
    return useContext(AuthContext);
};
