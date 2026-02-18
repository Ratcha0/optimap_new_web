import { useState, useEffect, useCallback, useRef } from 'react';
import { supabase } from '../utils/supabaseClient';
import { useToast } from '../components/ui/ToastNotification';

const OFFLINE_QUEUE_KEY = 'isuzu_offline_updates';

export function useConnectionManager(user) {
    const [isOnline, setIsOnline] = useState(navigator.onLine);
    const [isSyncing, setIsSyncing] = useState(false);
    const { showToast } = useToast();
    const syncInProgress = useRef(false);


    const getQueue = () => {
        try {
            const queue = localStorage.getItem(OFFLINE_QUEUE_KEY);
            return queue ? JSON.parse(queue) : [];
        } catch (e) {
            return [];
        }
    };


    const saveQueue = (queue) => {
        localStorage.setItem(OFFLINE_QUEUE_KEY, JSON.stringify(queue));
    };


    const processQueue = useCallback(async () => {
        if (syncInProgress.current || !navigator.onLine) return;

        const queue = getQueue();
        if (queue.length === 0) return;

        syncInProgress.current = true;
        setIsSyncing(true);


        const remainingQueue = [];


        const latestUpdates = {};
        queue.forEach(item => {
            const key = `${item.table}-${item.id}`;
            if (!latestUpdates[key] || new Date(item.timestamp) > new Date(latestUpdates[key].timestamp)) {
                latestUpdates[key] = item;
            }
        });

        const updatesToProcess = Object.values(latestUpdates);

        for (const item of updatesToProcess) {
            try {
                const { error } = await supabase
                    .from(item.table)
                    .update(item.data)
                    .eq('id', item.id);

                if (error) throw error;
            } catch (err) {
                
                remainingQueue.push(item);
            }
        }

        saveQueue(remainingQueue);
        setIsSyncing(false);
        syncInProgress.current = false;

        if (remainingQueue.length === 0) {
            showToast('เชื่อมต่อเสถียร ซิงค์ข้อมูลพิกัดล่าสุดเรียบร้อยแล้ว', 'success');
        }
    }, [showToast]);

    useEffect(() => {
        const handleOnline = () => {
            setIsOnline(true);
            showToast('กลับมาออนไลน์แล้ว กำลังซิงค์ข้อมูล...', 'info');
            processQueue();
        };

        const handleOffline = () => {
            setIsOnline(false);
            showToast('ขาดการเชื่อมต่อ ระบบจะบันทึกข้อมูลไว้ชั่วคราว', 'warning');
        };

        window.addEventListener('online', handleOnline);
        window.addEventListener('offline', handleOffline);


        if (navigator.onLine) {
            processQueue();
        }

        return () => {
            window.removeEventListener('online', handleOnline);
            window.removeEventListener('offline', handleOffline);
        };
    }, [processQueue, showToast]);


    const queueUpdate = useCallback((table, id, data) => {
        const queue = getQueue();
        queue.push({
            table,
            id,
            data,
            timestamp: new Date().toISOString()
        });
        saveQueue(queue);
    }, []);

    return {
        isOnline,
        isSyncing,
        queueUpdate,
        processQueue
    };
}
