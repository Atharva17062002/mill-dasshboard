'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useState } from 'react';
import './sidebar.css';

const NAV_ITEMS = [
    { href: '/', label: 'Dashboard', icon: '📊' },
    { href: '/records', label: 'Records', icon: '📋' },
    { href: '/settings', label: 'Settings', icon: '⚙️' },
];

export default function Sidebar() {
    const pathname = usePathname();
    const [collapsed, setCollapsed] = useState(false);

    return (
        <>
            <aside className={`sidebar ${collapsed ? 'collapsed' : ''}`}>
                <div className="sidebar-brand">
                    <span className="sidebar-logo">🌾</span>
                    {!collapsed && <span className="sidebar-title">Rice Mill</span>}
                </div>

                <nav className="sidebar-nav">
                    {NAV_ITEMS.map(item => {
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
