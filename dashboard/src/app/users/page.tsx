'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useRouter } from 'next/navigation';
import './users.css';

const SCREENS = ['dashboard', 'records', 'settings', 'users'];
const RECORD_FIELDS = [
    'Date', 'Farmer Name', 'Society', 'Vehicle No', 'TP ACCEPTED',
    'Token Qty ( Quintal )', 'Gross(KG)', 'Tare(KG)',
    'Total Packet', 'Plastic Packet', 'Quality Cuts', 'Moisture Cuts',
];

interface UserRecord {
    id: string;
    name: string;
    email: string;
    mill: string | null;
    role: string;
    createdBy: string | null;
    createdAt: string;
    screenPermissions: { screen: string; canAccess: boolean; canCreate: boolean; canEdit: boolean; canDelete: boolean }[];
    fieldPermissions: { screen: string; fieldName: string; canView: boolean; canEdit: boolean }[];
}

export default function UsersPage() {
    const { user: authUser, hasScreenAccess } = useAuth();
    const router = useRouter();
    const [users, setUsers] = useState<UserRecord[]>([]);
    const [loading, setLoading] = useState(true);
    const [toast, setToast] = useState<{ message: string; type: 'error' | 'success' } | null>(null);

    // Modal states
    const [showCreateModal, setShowCreateModal] = useState(false);
    const [showEditModal, setShowEditModal] = useState(false);
    const [showDeleteModal, setShowDeleteModal] = useState(false);
    const [selectedUser, setSelectedUser] = useState<UserRecord | null>(null);
    const [saving, setSaving] = useState(false);

    // Form state for create
    const [createForm, setCreateForm] = useState({ name: '', email: '', password: '', role: 'staff', mill: '' });

    // Form state for edit
    const [editForm, setEditForm] = useState<{
        name: string; role: string; mill: string; password: string;
        screenPermissions: { screen: string; canAccess: boolean; canCreate: boolean; canEdit: boolean; canDelete: boolean }[];
        fieldPermissions: { screen: string; fieldName: string; canView: boolean; canEdit: boolean }[];
    }>({ name: '', role: 'staff', mill: '', password: '', screenPermissions: [], fieldPermissions: [] });

    // Check access
    useEffect(() => {
        if (authUser && !hasScreenAccess('users')) {
            router.push('/');
        }
    }, [authUser, hasScreenAccess, router]);

    const showToast = (message: string, type: 'error' | 'success' = 'error') => {
        setToast({ message, type });
        setTimeout(() => setToast(null), 4000);
    };

    const fetchUsers = async () => {
        try {
            setLoading(true);
            const res = await fetch('/api/users');
            if (res.ok) {
                setUsers(await res.json());
            } else {
                const err = await res.json();
                showToast(err.error || 'Failed to load users');
            }
        } catch {
            showToast('Failed to load users');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => { fetchUsers(); }, []);

    // Create User
    const handleCreate = async () => {
        if (!createForm.name || !createForm.email || !createForm.password) {
            showToast('Name, email and password are required');
            return;
        }
        setSaving(true);
        try {
            const res = await fetch('/api/users', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(createForm),
            });
            if (res.ok) {
                showToast('User created successfully', 'success');
                setShowCreateModal(false);
                setCreateForm({ name: '', email: '', password: '', role: 'staff', mill: '' });
                fetchUsers();
            } else {
                const err = await res.json();
                showToast(err.error || 'Failed to create user');
            }
        } catch {
            showToast('Failed to create user');
        } finally {
            setSaving(false);
        }
    };

    // Open Edit
    const openEdit = (u: UserRecord) => {
        setSelectedUser(u);
        setEditForm({
            name: u.name,
            role: u.role,
            mill: u.mill || '',
            password: '',
            screenPermissions: SCREENS.map(screen => {
                const existing = u.screenPermissions.find(sp => sp.screen === screen);
                return {
                    screen,
                    canAccess: existing?.canAccess ?? false,
                    canCreate: existing?.canCreate ?? false,
                    canEdit: existing?.canEdit ?? false,
                    canDelete: existing?.canDelete ?? false,
                };
            }),
            fieldPermissions: RECORD_FIELDS.map(field => {
                const existing = u.fieldPermissions.find(fp => fp.fieldName === field && fp.screen === 'records');
                return {
                    screen: 'records',
                    fieldName: field,
                    canView: existing?.canView ?? true,
                    canEdit: existing?.canEdit ?? false,
                };
            }),
        });
        setShowEditModal(true);
    };

    // Save Edit
    const handleEdit = async () => {
        if (!selectedUser) return;
        setSaving(true);
        try {
            const res = await fetch('/api/users', {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    id: selectedUser.id,
                    name: editForm.name,
                    role: editForm.role,
                    mill: editForm.mill || null,
                    password: editForm.password || undefined,
                    screenPermissions: editForm.screenPermissions,
                    fieldPermissions: editForm.fieldPermissions,
                }),
            });
            if (res.ok) {
                showToast('User updated successfully', 'success');
                setShowEditModal(false);
                setSelectedUser(null);
                fetchUsers();
            } else {
                const err = await res.json();
                showToast(err.error || 'Failed to update user');
            }
        } catch {
            showToast('Failed to update user');
        } finally {
            setSaving(false);
        }
    };

    // Delete User
    const handleDelete = async () => {
        if (!selectedUser) return;
        setSaving(true);
        try {
            const res = await fetch(`/api/users?id=${selectedUser.id}`, { method: 'DELETE' });
            if (res.ok) {
                // Close all modals first, then refresh
                setShowDeleteModal(false);
                setShowCreateModal(false);
                setShowEditModal(false);
                setSelectedUser(null);
                showToast('User deleted', 'success');
                await fetchUsers();
            } else {
                const err = await res.json();
                showToast(err.error || 'Failed to delete user');
            }
        } catch {
            showToast('Failed to delete user');
        } finally {
            setSaving(false);
        }
    };

    const updateScreenPerm = (screen: string, field: string, value: boolean) => {
        setEditForm(prev => ({
            ...prev,
            screenPermissions: prev.screenPermissions.map(sp =>
                sp.screen === screen ? { ...sp, [field]: value } : sp
            ),
        }));
    };

    const updateFieldPerm = (fieldName: string, field: string, value: boolean) => {
        setEditForm(prev => ({
            ...prev,
            fieldPermissions: prev.fieldPermissions.map(fp =>
                fp.fieldName === fieldName ? { ...fp, [field]: value } : fp
            ),
        }));
    };

    const getRoleLabel = (role: string) => {
        switch (role) {
            case 'service_provider': return 'Service Provider';
            case 'admin': return 'Admin';
            case 'staff': return 'Staff';
            default: return role;
        }
    };

    const availableRoles = authUser?.role === 'service_provider'
        ? ['service_provider', 'admin', 'staff']
        : ['staff'];

    return (
        <div className="users-container animate-in">
            {/* Toast */}
            {toast && <div className={`users-toast ${toast.type}`}>{toast.message}</div>}

            {/* Header */}
            <header className="users-header">
                <div>
                    <h1>👥 User Management</h1>
                    <p>Create and manage users, assign roles and permissions</p>
                </div>
                <button className="btn-primary" onClick={() => setShowCreateModal(true)}>+ Create User</button>
            </header>

            {/* User Table */}
            <div className="users-table-card animate-in delay-1">
                <table className="users-table">
                    <thead>
                        <tr>
                            <th>Email</th>
                            <th>Name</th>
                            <th>Role</th>
                            <th>Mill</th>
                            <th style={{ textAlign: 'right' }}>Actions</th>
                        </tr>
                    </thead>
                    <tbody>
                        {loading ? (
                            <tr><td colSpan={5} style={{ textAlign: 'center', padding: '40px 0' }}>Loading users...</td></tr>
                        ) : users.length === 0 ? (
                            <tr><td colSpan={5}><div className="users-empty"><div className="users-empty-icon">👥</div><p>No users found. Create one to get started.</p></div></td></tr>
                        ) : users.map(u => (
                            <tr key={u.id}>
                                <td className="user-email">{u.email}</td>
                                <td>{u.name}</td>
                                <td><span className={`role-badge ${u.role}`}>{getRoleLabel(u.role)}</span></td>
                                <td>{u.mill || '—'}</td>
                                <td>
                                    <div className="user-actions">
                                        <button className="btn-user-edit" onClick={(e) => { e.stopPropagation(); openEdit(u); }}>✎ Edit</button>
                                        {u.id !== authUser?.id && (
                                            <button className="btn-user-delete" onClick={(e) => { e.stopPropagation(); setSelectedUser(u); setShowDeleteModal(true); }}>× Delete</button>
                                        )}
                                    </div>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>

            {/* Create Modal */}
            {showCreateModal && (
                <div className="users-modal-overlay" onClick={() => setShowCreateModal(false)}>
                    <div className="users-modal" onClick={e => e.stopPropagation()}>
                        <div className="users-modal-header">
                            <h2>Create New User</h2>
                            <button className="users-modal-close" onClick={() => setShowCreateModal(false)}>×</button>
                        </div>
                        <div className="users-modal-body">
                            <div className="user-form-grid">
                                <div className="user-form-group">
                                    <label>Name</label>
                                    <input type="text" autoComplete="off" data-lpignore="true" value={createForm.name} onChange={e => setCreateForm({ ...createForm, name: e.target.value })} placeholder="Full Name" />
                                </div>
                                <div className="user-form-group">
                                    <label>Email</label>
                                    <input type="email" autoComplete="off" data-lpignore="true" value={createForm.email} onChange={e => setCreateForm({ ...createForm, email: e.target.value })} placeholder="user@example.com" />
                                </div>
                                <div className="user-form-group">
                                    <label>Password</label>
                                    <input type="password" autoComplete="new-password" data-lpignore="true" value={createForm.password} onChange={e => setCreateForm({ ...createForm, password: e.target.value })} placeholder="Min 6 characters" />
                                </div>
                                <div className="user-form-group">
                                    <label>Role</label>
                                    <select value={createForm.role} onChange={e => setCreateForm({ ...createForm, role: e.target.value })}>
                                        {availableRoles.map(r => <option key={r} value={r}>{getRoleLabel(r)}</option>)}
                                    </select>
                                </div>
                                <div className="user-form-group">
                                    <label>Mill (Optional)</label>
                                    <input type="text" value={createForm.mill} onChange={e => setCreateForm({ ...createForm, mill: e.target.value })} placeholder="Mill Name" />
                                </div>
                            </div>
                        </div>
                        <div className="users-modal-footer">
                            <button className="btn-secondary" onClick={() => setShowCreateModal(false)}>Cancel</button>
                            <button className="btn-primary" onClick={handleCreate} disabled={saving}>{saving ? 'Creating...' : 'Create User'}</button>
                        </div>
                    </div>
                </div>
            )}

            {/* Edit Modal */}
            {showEditModal && selectedUser && (
                <div className="users-modal-overlay" onClick={() => setShowEditModal(false)}>
                    <div className="users-modal" onClick={e => e.stopPropagation()} style={{ maxWidth: '720px' }}>
                        <div className="users-modal-header">
                            <h2>Edit User — {selectedUser.email}</h2>
                            <button className="users-modal-close" onClick={() => setShowEditModal(false)}>×</button>
                        </div>
                        <div className="users-modal-body">
                            {/* Basic Info */}
                            <div className="user-form-grid">
                                <div className="user-form-group">
                                    <label>Name</label>
                                    <input type="text" autoComplete="off" data-lpignore="true" value={editForm.name} onChange={e => setEditForm({ ...editForm, name: e.target.value })} />
                                </div>
                                <div className="user-form-group">
                                    <label>Role</label>
                                    <select value={editForm.role} onChange={e => setEditForm({ ...editForm, role: e.target.value })}>
                                        {availableRoles.map(r => <option key={r} value={r}>{getRoleLabel(r)}</option>)}
                                    </select>
                                </div>
                                <div className="user-form-group">
                                    <label>Mill</label>
                                    <input type="text" value={editForm.mill} onChange={e => setEditForm({ ...editForm, mill: e.target.value })} />
                                </div>
                                <div className="user-form-group">
                                    <label>New Password (leave blank to keep)</label>
                                    <input type="password" autoComplete="new-password" data-lpignore="true" value={editForm.password} onChange={e => setEditForm({ ...editForm, password: e.target.value })} placeholder="••••••••" />
                                </div>
                            </div>

                            {/* Screen Permissions */}
                            {(editForm.role === 'staff') && (
                                <>
                                    <div className="perm-section-title">Screen Permissions</div>
                                    <div className="screen-perm-grid">
                                        <div className="screen-perm-row header">
                                            <span>Screen</span>
                                            <span>Access</span>
                                            <span>Create</span>
                                            <span>Edit</span>
                                            <span>Delete</span>
                                        </div>
                                        {editForm.screenPermissions.map(sp => (
                                            <div key={sp.screen} className="screen-perm-row">
                                                <span className="screen-name">{sp.screen}</span>
                                                <div className="perm-toggle">
                                                    <input type="checkbox" checked={sp.canAccess} onChange={e => updateScreenPerm(sp.screen, 'canAccess', e.target.checked)} />
                                                </div>
                                                <div className="perm-toggle">
                                                    <input type="checkbox" checked={sp.canCreate} onChange={e => updateScreenPerm(sp.screen, 'canCreate', e.target.checked)} />
                                                </div>
                                                <div className="perm-toggle">
                                                    <input type="checkbox" checked={sp.canEdit} onChange={e => updateScreenPerm(sp.screen, 'canEdit', e.target.checked)} />
                                                </div>
                                                <div className="perm-toggle">
                                                    <input type="checkbox" checked={sp.canDelete} onChange={e => updateScreenPerm(sp.screen, 'canDelete', e.target.checked)} />
                                                </div>
                                            </div>
                                        ))}
                                    </div>

                                    {/* Field Permissions */}
                                    <div className="perm-section-title">Record Field Permissions</div>
                                    <div className="field-perm-grid">
                                        <div className="field-perm-row header">
                                            <span>Field</span>
                                            <span>Can Edit</span>
                                        </div>
                                        {editForm.fieldPermissions.map(fp => (
                                            <div key={fp.fieldName} className="field-perm-row">
                                                <span className="field-name">{fp.fieldName}</span>
                                                <div className="perm-toggle">
                                                    <input type="checkbox" checked={fp.canEdit} onChange={e => updateFieldPerm(fp.fieldName, 'canEdit', e.target.checked)} />
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                </>
                            )}
                        </div>
                        <div className="users-modal-footer">
                            <button className="btn-secondary" onClick={() => setShowEditModal(false)}>Cancel</button>
                            <button className="btn-primary" onClick={handleEdit} disabled={saving}>{saving ? 'Saving...' : 'Save Changes'}</button>
                        </div>
                    </div>
                </div>
            )}

            {/* Delete Confirmation */}
            {showDeleteModal && selectedUser && (
                <div className="users-modal-overlay" onClick={() => setShowDeleteModal(false)}>
                    <div className="users-modal" onClick={e => e.stopPropagation()} style={{ maxWidth: '420px' }}>
                        <div className="users-modal-body" style={{ paddingTop: '2rem' }}>
                            <div className="confirm-icon">⚠️</div>
                            <div className="confirm-text">Delete User?</div>
                            <div className="confirm-subtext">
                                Are you sure you want to delete <strong>{selectedUser.name}</strong> ({selectedUser.email})? This will remove their account and all permissions. This action cannot be undone.
                            </div>
                        </div>
                        <div className="users-modal-footer" style={{ justifyContent: 'center' }}>
                            <button className="btn-secondary" onClick={() => setShowDeleteModal(false)}>Cancel</button>
                            <button className="btn-danger" onClick={handleDelete} disabled={saving}>{saving ? 'Deleting...' : 'Yes, Delete'}</button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
