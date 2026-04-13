'use client';

import { usePathname } from 'next/navigation';
import Sidebar from '@/components/Sidebar';
import { useAuth } from '@/contexts/AuthContext';

export default function AppShell({ children }: { children: React.ReactNode }) {
    const pathname = usePathname();
    const { user, loading } = useAuth();
    const isLoginPage = pathname.startsWith('/login');

    // Show nothing during initial load to prevent flash
    if (loading) {
        return (
            <div style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                minHeight: '100vh',
                background: 'var(--bg-primary)',
            }}>
                <div style={{ textAlign: 'center' }}>
                    <div style={{ fontSize: '2rem', marginBottom: '0.5rem' }}>🌾</div>
                    <div style={{ color: 'var(--text-secondary)', fontSize: '0.9rem' }}>Loading...</div>
                </div>
            </div>
        );
    }

    if (isLoginPage || !user) {
        return <>{children}</>;
    }

    return (
        <>
            <Sidebar />
            <main className="app-main">
                {children}
            </main>
        </>
    );
}
