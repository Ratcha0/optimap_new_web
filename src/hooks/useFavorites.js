import { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { supabase } from '../utils/supabaseClient';

export function useFavorites() {
    const [favorites, setFavorites] = useState([]);
    const { user } = useAuth();

    useEffect(() => {
        if (user) {
            const fetchFavorites = async () => {
                const { data, error } = await supabase
                    .from('favorites')
                    .select('*')
                    .eq('user_id', user.id)
                    .order('created_at', { ascending: false });

                if (error) console.error("Error fetching favorites:", error);
                else setFavorites(data || []);
            };
            fetchFavorites();
        } else {
            try {
                const stored = localStorage.getItem('my_map_favorites');
                if (stored) {
                    setFavorites(JSON.parse(stored));
                }
            } catch (e) {
                console.error("Failed to load favorites", e);
            }
        }
    }, [user]);

    const addFavorite = async (location) => {
        if (!user) {
            alert("กรุณาเข้าสู่ระบบก่อนเพื่อบันทึกรายการโปรด (Please Login First)");
            return;
        }

        const newFav = {
            id: Date.now(),
            ...location,
            created_at: new Date().toISOString()
        };
        setFavorites(prev => [newFav, ...prev]);
        const { error } = await supabase
            .from('favorites')
            .insert([{
                user_id: user.id,
                lat: location.lat,
                lng: location.lng,
                name: location.name
            }]);

        if (error) {
            console.error("Error saving favorite:", error);
        }
    };

    const removeFavorite = async (id) => {
        setFavorites(prev => prev.filter(item => item.id !== id));

        if (user) {
            const { error } = await supabase
                .from('favorites')
                .delete()
                .eq('id', id);
            if (error) console.error("Error deleting favorite:", error);
        } else {
            const currentFavs = JSON.parse(localStorage.getItem('my_map_favorites') || '[]');
            const updatedFavs = currentFavs.filter(item => item.id !== id);
            localStorage.setItem('my_map_favorites', JSON.stringify(updatedFavs));
        }
    };
    useEffect(() => {
        if (user && favorites.some(f => typeof f.id === 'number')) {
            const timeout = setTimeout(async () => {
                const { data } = await supabase
                    .from('favorites')
                    .select('*')
                    .eq('user_id', user.id)
                    .order('created_at', { ascending: false });
                if (data) setFavorites(data);
            }, 1000);
            return () => clearTimeout(timeout);
        }
    }, [favorites, user]);


    const isFavorite = (lat, lng) => {
        if (!lat || !lng) return false;
        return favorites.some(f =>
            Math.abs(f.lat - lat) < 0.0001 && Math.abs(f.lng - lng) < 0.0001
        );
    };

    const editFavorite = async (id, newName) => {
        setFavorites(prev => prev.map(item => item.id === id ? { ...item, name: newName } : item));

        if (user) {
            const { error } = await supabase
                .from('favorites')
                .update({ name: newName })
                .eq('id', id);

            if (error) console.error("Error updating favorite:", error);
        } else {
            const currentFavs = JSON.parse(localStorage.getItem('my_map_favorites') || '[]');
            const updatedFavs = currentFavs.map(item => item.id === id ? { ...item, name: newName } : item);
            localStorage.setItem('my_map_favorites', JSON.stringify(updatedFavs));
        }
    };

    return { favorites, addFavorite, removeFavorite, isFavorite, editFavorite };
}
