'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import './sidebar.css';

const NAV_ITEMS = [
    { href: '/', label: 'Dashboard', icon: '📊', screen: 'dashboard' },
    { href: '/records', label: 'Records', icon: '📋', screen: 'records' },
    { href: '/settings', label: 'Settings', icon: '⚙️', screen: 'settings' },
    { href: '/users', label: 'Users', icon: '👥', screen: 'users' },
];

export default function Sidebar() {
    const pathname = usePathname();
    const [collapsed, setCollapsed] = useState(false);
    const { user, logout, hasScreenAccess } = useAuth();

    const getRoleLabel = (role: string) => {
        switch (role) {
            case 'service_provider': return 'Service Provider';
            case 'admin': return 'Admin';
            case 'staff': return 'Staff';
            default: return role;
        }
    };

    const visibleItems = NAV_ITEMS.filter(item => hasScreenAccess(item.screen));

    return (
        <>
            <aside className={`sidebar ${collapsed ? 'collapsed' : ''}`}>
                <div className="sidebar-brand">
                    <span className="sidebar-logo">🌾</span>
                    {!collapsed && <span className="sidebar-title">Rice Mill</span>}
                </div>

                <nav className="sidebar-nav">
                    {visibleItems.map(item => {
                        const isActive = item.href === '/' ? pathname === '/' : pathname.startsWith(item.href);
                        return (
                            <Link
                                key={item.href}
                                href={item.href}
                                className={`sidebar-link ${isActive ? 'active' : ''}`}
                                title={item.label}
                            >
                                <span className="sidebar-link-icon">{item.icon}</span>
                                {!collapsed && <span className="sidebar-link-label">{item.label}</span>}
                            </Link>
                        );
                    })}
                </nav>

                {/* User Info & Logout */}
                {user && (
                    <div className="sidebar-user-section">
                        {!collapsed && (
                            <div className="sidebar-user-info">
                                <div className="sidebar-user-name">{user.name}</div>
                                <div className="sidebar-user-role">{getRoleLabel(user.role)}</div>
                            </div>
                        )}
                        <button
                            className="sidebar-logout-btn"
                            onClick={logout}
                            title="Sign out"
                        >
                            {collapsed ? '🚪' : '🚪 Sign Out'}
                        </button>
                    </div>
                )}

                <button
                    className="sidebar-toggle"
                    onClick={() => setCollapsed(!collapsed)}
                    title={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
                >
                    {collapsed ? '»' : '«'}
                </button>
            </aside>
            {/* Mobile overlay */}
            {!collapsed && <div className="sidebar-mobile-overlay" onClick={() => setCollapsed(true)} />}
        </>
    );
}
