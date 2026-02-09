import { useState, useEffect, createContext, useContext } from 'react';
import { supabase } from '../utils/supabaseClient';

const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
    const [user, setUser] = useState(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const session = supabase.auth.getSession().then(({ data: { session } }) => {
            // console.log('Initial Session Check:', session?.user?.email || 'No user');
            setUser(session?.user ?? null);
            setLoading(false);
        });

        const { data: { subscription } } = supabase.auth.onAuthStateChange(
            (event, session) => {
                // console.log('Auth State Changed:', event, session?.user?.email || 'No user');
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
                console.warn('Supabase SignOut error (likely already signed out):', error);
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
