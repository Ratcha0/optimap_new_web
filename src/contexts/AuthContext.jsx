import { useState, useEffect, createContext, useContext } from 'react';
import { supabase } from '../utils/supabaseClient';

const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
    const [user, setUser] = useState(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const { data: { subscription } } = supabase.auth.onAuthStateChange(
            (event, session) => {
                if (event === 'SIGNED_OUT' || event === 'USER_DELETED') {
                     // Ensure clean state
                     setUser(null);
                     setLoading(false);
                     // Clear any local storage auth tokens if Supabase doesn't do it automatically
                     Object.keys(localStorage).forEach(key => {
                         if (key.startsWith('sb-')) localStorage.removeItem(key);
                     });
                } else if (event === 'SIGNED_IN' || event === 'TOKEN_REFRESHED') {
                    setUser(session?.user ?? null);
                    setLoading(false);
                } else if (event === 'INITIAL_SESSION') {
                     // Handle initial load
                     setUser(session?.user ?? null);
                     setLoading(false);
                }
            }
        );

        // Check initial session
        supabase.auth.getSession().then(({ data: { session }, error }) => {
            if (error) {
                console.error("Auth session error:", error);
                // If token is invalid (e.g. refresh token not found), force logout logic
                if (error.message && (error.message.includes("Refresh Token") || error.message.includes("Invalid"))) {
                    supabase.auth.signOut();
                    setUser(null);
                }
            } else {
                setUser(session?.user ?? null);
            }
            setLoading(false);
        });

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
