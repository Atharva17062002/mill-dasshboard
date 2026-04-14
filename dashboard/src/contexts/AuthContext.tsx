'use client';

import { createContext, useContext, useEffect, useState, useCallback, type ReactNode } from 'react';
import { createClient } from '@/lib/supabase/client';
import { useRouter } from 'next/navigation';
import type { User as SupabaseUser } from '@supabase/supabase-js';

export interface ScreenPerm {
    screen: string;
    canAccess: boolean;
    canCreate: boolean;
    canEdit: boolean;
    canDelete: boolean;
}

export interface FieldPerm {
    screen: string;
    fieldName: string;
    canView: boolean;
    canEdit: boolean;
}

export interface AppUser {
    id: string;
    name: string;
    email: string;
    mill: string | null;
    role: string;
    createdBy: string | null;
    screenPermissions: ScreenPerm[];
    fieldPermissions: FieldPerm[];
}

interface AuthContextType {
    user: AppUser | null;
    supabaseUser: SupabaseUser | null;
    loading: boolean;
    login: (email: string, password: string) => Promise<{ error: string | null }>;
    logout: () => Promise<void>;
    refreshUser: () => Promise<void>;
    hasScreenAccess: (screen: string) => boolean;
    canPerform: (screen: string, action: 'access' | 'create' | 'edit' | 'delete') => boolean;
    canEditField: (screen: string, fieldName: string) => boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
    const [user, setUser] = useState<AppUser | null>(null);
    const [supabaseUser, setSupabaseUser] = useState<SupabaseUser | null>(null);
    const [loading, setLoading] = useState(true);
    const router = useRouter();

    const fetchUser = useCallback(async () => {
        try {
            const res = await fetch('/api/auth/me');
            if (res.ok) {
                const data = await res.json();
                setUser(data.user);
                setSupabaseUser(data.supabaseUser);
            } else {
                setUser(null);
                setSupabaseUser(null);
            }
        } catch {
            setUser(null);
            setSupabaseUser(null);
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        fetchUser();
    }, [fetchUser]);

    // ── Inactivity auto-logout (5 minutes) ──
    useEffect(() => {
        if (!user) return; // Only track when logged in

        const INACTIVITY_TIMEOUT = 5 * 60 * 1000; // 5 minutes
        let timer: ReturnType<typeof setTimeout>;

        const resetTimer = () => {
            clearTimeout(timer);
            timer = setTimeout(() => {
                // Auto-logout on inactivity
                const supabase = createClient();
                supabase.auth.signOut().then(() => {
                    setUser(null);
                    setSupabaseUser(null);
                    window.location.href = '/login';
                });
            }, INACTIVITY_TIMEOUT);
        };

        // Events that count as "activity"
        const activityEvents = ['mousedown', 'mousemove', 'keydown', 'scroll', 'touchstart', 'click'];
        activityEvents.forEach(event => window.addEventListener(event, resetTimer, { passive: true }));

        // Start the timer
        resetTimer();

        return () => {
            clearTimeout(timer);
            activityEvents.forEach(event => window.removeEventListener(event, resetTimer));
        };
    }, [user]);


    const login = async (email: string, password: string): Promise<{ error: string | null }> => {
        const supabase = createClient();
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) {
            return { error: error.message };
        }
        await fetchUser();
        router.push('/');
        return { error: null };
    };

    const logout = async () => {
        const supabase = createClient();
        await supabase.auth.signOut();
        setUser(null);
        setSupabaseUser(null);
        router.push('/login');
    };

    const refreshUser = async () => {
        await fetchUser();
    };

    const hasScreenAccess = (screen: string): boolean => {
        if (!user) return false;
        if (user.role === 'service_provider' || user.role === 'admin') return true;
        const perm = user.screenPermissions.find(p => p.screen === screen);
        return perm?.canAccess ?? false;
    };

    const canPerform = (screen: string, action: 'access' | 'create' | 'edit' | 'delete'): boolean => {
        if (!user) return false;
        if (user.role === 'service_provider' || user.role === 'admin') return true;
        const perm = user.screenPermissions.find(p => p.screen === screen);
        if (!perm) return false;
        switch (action) {
            case 'access': return perm.canAccess;
            case 'create': return perm.canCreate;
            case 'edit': return perm.canEdit;
            case 'delete': return perm.canDelete;
            default: return false;
        }
    };

    const canEditField = (screen: string, fieldName: string): boolean => {
        if (!user) return false;
        if (user.role === 'service_provider' || user.role === 'admin') return true;
        const perm = user.fieldPermissions.find(p => p.screen === screen && p.fieldName === fieldName);
        return perm?.canEdit ?? false;
    };

    return (
        <AuthContext.Provider value={{
            user,
            supabaseUser,
            loading,
            login,
            logout,
            refreshUser,
            hasScreenAccess,
            canPerform,
            canEditField,
        }}>
            {children}
        </AuthContext.Provider>
    );
}

export function useAuth(): AuthContextType {
    const context = useContext(AuthContext);
    if (!context) {
        throw new Error('useAuth must be used within an AuthProvider');
    }
    return context;
}
