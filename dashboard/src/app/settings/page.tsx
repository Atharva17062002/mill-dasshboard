'use client';

import { useState, useEffect } from 'react';
import './settings.css';

interface Settings {
    gunnyBagWeight: number;
    plasticBagWeight: number;
    millRate: number;
    qualityRate: number;
    recoveryRate: number;
    lotSize: number;
}

const DEFAULTS: Settings = {
    gunnyBagWeight: 0.7,
    plasticBagWeight: 0.3,
    millRate: 2369,
    qualityRate: 1900,
    recoveryRate: 0.68,
    lotSize: 290,
};

export default function SettingsPage() {
    const [settings, setSettings] = useState<Settings>(DEFAULTS);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [saved, setSaved] = useState(false);

    useEffect(() => {
        fetch('/api/settings')
            .then(r => r.json())
            .then(data => {
                setSettings({ ...DEFAULTS, ...data });
                setLoading(false);
            })
            .catch(() => setLoading(false));
    }, []);

    const handleChange = (key: keyof Settings, value: string) => {
        setSaved(false);
        setSettings(prev => ({
            ...prev,
            [key]: value === '' ? '' : Number(value),
        }));
    };

    const handleSave = async () => {
        setSaving(true);
        try {
            const res = await fetch('/api/settings', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(settings),
            });
            if (res.ok) {
                setSaved(true);
                setTimeout(() => setSaved(false), 3000);
            }
        } catch (err) {
            console.error('Failed to save settings', err);
        } finally {
            setSaving(false);
        }
    };

    const handleReset = () => {
        setSettings(DEFAULTS);
        setSaved(false);
    };

    // Live preview calculation
    const exampleGunny = 100;
    const examplePlastic = 20;
    const previewPacketKg = Math.round(
        (exampleGunny * (settings.gunnyBagWeight || 0)) +
        (examplePlastic * (settings.plasticBagWeight || 0))
    );

    if (loading) {
        return (
            <div className="settings-container">
                <div className="settings-loading">Loading settings...</div>
            </div>
        );
    }

    return (
        <div className="settings-container animate-in">
            <header className="settings-page-header">
                <div>
                    <h1>⚙️ Settings</h1>
                    <p>Configure calculation parameters and business rates</p>
                </div>
                <div className="settings-header-actions">
                    <button className="btn-reset" onClick={handleReset}>
                        ↺ Reset Defaults
                    </button>
                    <button className="btn-save" onClick={handleSave} disabled={saving}>
                        {saving ? 'Saving...' : saved ? '✓ Saved!' : '💾 Save Settings'}
                    </button>
                </div>
            </header>

            {/* Section: Packet Weight Formula */}
            <div className="settings-section">
                <div className="section-header">
                    <h2>📦 Packet Weight Formula</h2>
                    <p>Configure the weight deducted per gunny and plastic bag when calculating net weight.</p>
                </div>

                <div className="settings-formula-preview">
                    <div className="formula-display">
                        <span className="formula-text">
                            Packet Wt = (Gunny Bags × <strong>{settings.gunnyBagWeight}</strong>) + (Plastic Bags × <strong>{settings.plasticBagWeight}</strong>)
                        </span>
                    </div>
                    <div className="formula-example">
                        <span>Example: {exampleGunny} gunny + {examplePlastic} plastic = <strong>{previewPacketKg} kg</strong></span>
                    </div>
                </div>

                <div className="settings-grid">
                    <div className="setting-card">
                        <div className="setting-label">
                            <span className="setting-icon">👜</span>
                            Gunny Bag Weight
                        </div>
                        <div className="setting-description">Weight deducted per gunny (jute) bag in kilograms</div>
                        <div className="setting-input-group">
                            <input
                                type="number"
                                step="0.01"
                                className="setting-input"
                                value={settings.gunnyBagWeight}
                                onChange={e => handleChange('gunnyBagWeight', e.target.value)}
                            />
                            <span className="setting-unit">kg / bag</span>
                        </div>
                    </div>

                    <div className="setting-card">
                        <div className="setting-label">
                            <span className="setting-icon">🛍️</span>
                            Plastic Bag Weight
                        </div>
                        <div className="setting-description">Weight deducted per plastic bag in kilograms</div>
                        <div className="setting-input-group">
                            <input
                                type="number"
                                step="0.01"
                                className="setting-input"
                                value={settings.plasticBagWeight}
                                onChange={e => handleChange('plasticBagWeight', e.target.value)}
                            />
                            <span className="setting-unit">kg / bag</span>
                        </div>
                    </div>
                </div>
            </div>

            {/* Section: Revenue & Recovery Rates */}
            <div className="settings-section">
                <div className="section-header">
                    <h2>💰 Revenue & Recovery Rates</h2>
                    <p>Business rates used for revenue calculations on the dashboard.</p>
                </div>

                <div className="settings-grid four-col">
                    <div className="setting-card">
                        <div className="setting-label">
                            <span className="setting-icon">⚖️</span>
                            Mill Rate
                        </div>
                        <div className="setting-description">Rate per quintal for mill quantity</div>
                        <div className="setting-input-group">
                            <input
                                type="number"
                                className="setting-input"
                                value={settings.millRate}
                                onChange={e => handleChange('millRate', e.target.value)}
                            />
                            <span className="setting-unit">₹ / q</span>
                        </div>
                    </div>

                    <div className="setting-card">
                        <div className="setting-label">
                            <span className="setting-icon">✂️</span>
                            Quality Rate
                        </div>
                        <div className="setting-description">Rate per quintal for deductions</div>
                        <div className="setting-input-group">
                            <input
                                type="number"
                                className="setting-input"
                                value={settings.qualityRate}
                                onChange={e => handleChange('qualityRate', e.target.value)}
                            />
                            <span className="setting-unit">₹ / q</span>
                        </div>
                    </div>

                    <div className="setting-card">
                        <div className="setting-label">
                            <span className="setting-icon">📊</span>
                            Recovery Rate
                        </div>
                        <div className="setting-description">Rice recovery percentage</div>
                        <div className="setting-input-group">
                            <input
                                type="number"
                                step="0.01"
                                className="setting-input"
                                value={settings.recoveryRate}
                                onChange={e => handleChange('recoveryRate', e.target.value)}
                            />
                            <span className="setting-unit">ratio</span>
                        </div>
                    </div>

                    <div className="setting-card">
                        <div className="setting-label">
                            <span className="setting-icon">🧺</span>
                            Lot Size
                        </div>
                        <div className="setting-description">Size of one lot in quintals</div>
                        <div className="setting-input-group">
                            <input
                                type="number"
                                className="setting-input"
                                value={settings.lotSize}
                                onChange={e => handleChange('lotSize', e.target.value)}
                            />
                            <span className="setting-unit">quintal</span>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
