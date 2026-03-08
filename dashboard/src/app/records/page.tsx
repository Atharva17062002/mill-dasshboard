'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import './records.css';

export default function RecordsPage() {
    const [records, setRecords] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);

    // Modal states
    const [isFormModalOpen, setIsFormModalOpen] = useState(false);
    const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
    const [currentRecord, setCurrentRecord] = useState<any>(null);
    const [formData, setFormData] = useState<any>({});

    const fetchRecords = async () => {
        try {
            setLoading(true);
            const res = await fetch('/api/records');
            const data = await res.json();
            setRecords(Array.isArray(data) ? data : []);
        } catch (err) {
            console.error('Failed to fetch records', err);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchRecords();
    }, []);

    const handleOpenAdd = () => {
        setCurrentRecord(null);
        setFormData({
            'Date': new Date().toISOString().split('T')[0],
            'Farmer Name': '',
            'Society': '',
            'Vehicle No': '',
            'TP ACCEPTED': '',
            'Token Qty ( Quintal )': '',
            'Mill Qty. (qunital)': '',
            'Total Packet': '',
            'Plastic Packet': '',
            'Gross(KG)': '',
            'Tare(KG)': '',
            'quality packet 1 (Q)': '', 'No of Packet 1': '', 'MC packet 1 (Q)': '',
            'quality packet 2 (Q)': '', 'No of Packet 2': '', 'MC packet 2 (Q)': '',
            'quality packet 3 (Q)': '', 'No of Packet 3': '', 'MC packet 3 (Q)': '',
            'quality packet 4 (Q)': '', 'No of Packet 4': '', 'MC packet 4 (Q)': '',
            'quality by packet 5': '', 'No of Packet 5': '',
            'quality by packet 6': '', 'No of Packet 6': '',
            'quality by packet 7': '', 'No of Packet 7': '',
            'quality by packet 8': '', 'No of Packet 8': '',
            'Quality cut': '',
            'Moisture cut': ''
        });
        setIsFormModalOpen(true);
    };

    const handleOpenEdit = (record: any) => {
        setCurrentRecord(record);
        // Format date string for the input
        const formattedDate = record.Date ? new Date(record.Date).toISOString().split('T')[0] : '';
        setFormData({ ...record, Date: formattedDate });
        setIsFormModalOpen(true);
    };

    const handleOpenDelete = (record: any) => {
        setCurrentRecord(record);
        setIsDeleteModalOpen(true);
    };

    const handleCloseModals = () => {
        setIsFormModalOpen(false);
        setIsDeleteModalOpen(false);
        setCurrentRecord(null);
    };

    const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const { name, value, type } = e.target;
        // Auto-cast number inputs
        const parsedValue = type === 'number' ? (value === '' ? '' : Number(value)) : value;
        setFormData({ ...formData, [name]: parsedValue });
    };

    const calculateDerivedFields = (data: any) => {
        const newData = { ...data };
        const safeNum = (val: any) => Number(val) || 0;

        const totalPacket = safeNum(newData['Total Packet']);
        const plasticPacket = safeNum(newData['Plastic Packet']);
        const gunnyCal = totalPacket - plasticPacket;

        const gross = safeNum(newData['Gross(KG)']);
        const tare = safeNum(newData['Tare(KG)']);
        const netKg = gross - tare;
        newData['NET (KG)'] = netKg;

        const packetKgCalc = Math.round((gunnyCal * 0.7) + (plasticPacket * 0.3));
        newData['Packet (KG) calculated'] = packetKgCalc;

        const weightPerPacketIfAny = totalPacket > 0 ? (gross - tare - packetKgCalc) / totalPacket : 0;

        let totalQCut = 0;
        let totalMCut = 0;

        // Packets 1-4 (Quality and Moisture)
        for (let i = 1; i <= 4; i++) {
            const qPct = safeNum(newData[`quality packet ${i} (Q)`]);
            const count = safeNum(newData[`No of Packet ${i}`]);
            const mPct = safeNum(newData[`MC packet ${i} (Q)`]);

            const qCut = Math.round((weightPerPacketIfAny * count) * (qPct / 100));
            const mCut = Math.round((weightPerPacketIfAny * count) * (mPct / 100));

            newData[`Quality Packet ${i} total (Q)`] = qCut;
            newData[`MC Packet ${i} total (Q)`] = mCut;

            totalQCut += qCut;
            totalMCut += mCut;
        }

        // Packets 5-8 (Quality only, simple multiplication)
        for (let i = 5; i <= 8; i++) {
            const qPct = safeNum(newData[`quality by packet ${i}`]);
            const count = safeNum(newData[`No of Packet ${i}`]);

            const qCut = Math.round(qPct * count);

            newData[`Packet ${i} cutting total`] = qCut;
            totalQCut += qCut;
        }

        newData['Quality cut'] = totalQCut;
        newData['Moisture cut'] = totalMCut;
        newData['Total quality cutting'] = totalQCut + totalMCut;

        const millQtyCalcKg = gross - tare - packetKgCalc - (totalQCut + totalMCut);
        newData['Mill Qty. calculated'] = millQtyCalcKg;

        const millQtyQuintal = millQtyCalcKg / 100;
        newData['Mill Qty. (qunital)'] = millQtyQuintal;

        const tokenQty = safeNum(newData['Token Qty ( Quintal )']);
        newData['Balance'] = millQtyQuintal - tokenQty;

        if (netKg > 0) {
            newData['percentage'] = ((totalQCut + totalMCut) / netKg) * 100;
        } else {
            newData['percentage'] = 0;
        }

        return newData;
    };

    const derivedData = calculateDerivedFields(formData);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();

        const finalData = derivedData;
        const isEdit = !!currentRecord;
        const method = isEdit ? 'PUT' : 'POST';

        try {
            const res = await fetch('/api/records', {
                method,
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(finalData),
            });

            if (res.ok) {
                handleCloseModals();
                fetchRecords();
            } else {
                alert('Failed to save record.');
            }
        } catch (err) {
            console.error(err);
            alert('An error occurred.');
        }
    };

    const handleDelete = async () => {
        if (!currentRecord) return;

        try {
            const res = await fetch(`/api/records?id=${currentRecord['Sl No']}`, {
                method: 'DELETE',
            });

            if (res.ok) {
                handleCloseModals();
                fetchRecords();
            } else {
                alert('Failed to delete record.');
            }
        } catch (err) {
            console.error(err);
            alert('An error occurred.');
        }
    };

    const formatNum = (n: any) => {
        const num = Number(n);
        if (isNaN(num)) return '0';
        return num.toLocaleString('en-IN', { maximumFractionDigits: 2 });
    };

    const formatDate = (dateStr: string) => {
        if (!dateStr) return '—';
        return new Date(dateStr).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: '2-digit' });
    };

    // Summary Calc
    const totalMillQty = records.reduce((s, r) => s + (Number(r['Mill Qty. (qunital)']) || 0), 0);
    const totalTp = records.reduce((s, r) => s + (Number(r['TP ACCEPTED']) || 0), 0);

    return (
        <div className="records-container animate-in">
            {/* Header */}
            <header className="records-header">
                <div className="header-left">
                    <Link href="/" className="back-btn" title="Back to Dashboard">
                        ←
                    </Link>
                    <div className="header-title-group">
                        <h1>Lot Records Management</h1>
                        <p>Manage all incoming paddy receipts and quality deductions</p>
                    </div>
                </div>
                <div className="action-buttons">
                    <button className="btn-primary" onClick={handleOpenAdd}>
                        + Add New Lot
                    </button>
                </div>
            </header>

            {/* Summary */}
            <div className="records-summary delay-1 animate-in">
                <div className="summary-item">
                    <span className="summary-label">Total Records</span>
                    <span className="summary-value highlight">{records.length}</span>
                </div>
                <div className="summary-item">
                    <span className="summary-label">Total Mill Qty</span>
                    <span className="summary-value">{formatNum(totalMillQty)} q</span>
                </div>
                <div className="summary-item">
                    <span className="summary-label">Total TP Accepted</span>
                    <span className="summary-value">{formatNum(totalTp)} q</span>
                </div>
            </div>

            {/* Table */}
            <div className="section-card delay-2 animate-in" style={{ padding: 0, overflow: 'hidden' }}>
                <div className="records-scroll" style={{ margin: 0, padding: 0 }}>
                    <table className="records-table">
                        <thead style={{ zIndex: 10 }}>
                            <tr>
                                <th>#</th>
                                <th>Date</th>
                                <th>Farmer</th>
                                <th>Vehicle</th>
                                <th className="text-right">TP (q)</th>
                                <th className="text-right">Mill Qty (q)</th>
                                <th className="text-right">Net (kg)</th>
                                <th className="text-right">Cut %</th>
                                <th className="text-right">Actions</th>
                            </tr>
                        </thead>
                        <tbody>
                            {loading ? (
                                <tr>
                                    <td colSpan={9} style={{ textAlign: 'center', padding: '40px 0' }}>Loading records...</td>
                                </tr>
                            ) : records.length === 0 ? (
                                <tr>
                                    <td colSpan={9} style={{ textAlign: 'center', padding: '40px 0' }}>No records found. Click "Add New Lot" to create one.</td>
                                </tr>
                            ) : (
                                records.map((rec) => (
                                    <tr key={rec['Sl No']}>
                                        <td>{rec['Sl No']}</td>
                                        <td>{formatDate(rec['Date'])}</td>
                                        <td className="farmer-name">{rec['Farmer Name']}</td>
                                        <td>{rec['Vehicle No']?.toUpperCase()}</td>
                                        <td className="text-right">{formatNum(rec['TP ACCEPTED'])}</td>
                                        <td className="text-right">{formatNum(rec['Mill Qty. (qunital)'])}</td>
                                        <td className="text-right">{formatNum(rec['NET (KG)'])}</td>
                                        <td className="text-right">
                                            <span className={`pct-badge ${rec.percentage < 2 ? 'good' : rec.percentage < 4 ? 'warning' : 'danger'}`}>
                                                {formatNum(rec.percentage)}%
                                            </span>
                                        </td>
                                        <td className="text-right">
                                            <div className="action-buttons">
                                                <button className="btn-icon-edit" onClick={() => handleOpenEdit(rec)} title="Edit Record">
                                                    ✎ Edit
                                                </button>
                                                <button className="btn-icon-delete" onClick={() => handleOpenDelete(rec)} title="Delete Record">
                                                    × Delete
                                                </button>
                                            </div>
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* Form Modal */}
            {isFormModalOpen && (
                <div className="modal-overlay" onClick={handleCloseModals}>
                    <div className="modal-content" onClick={e => e.stopPropagation()}>
                        <div className="modal-header">
                            <h2>{currentRecord ? `Edit Lot #${currentRecord['Sl No']}` : 'Add New Lot Record'}</h2>
                            <button className="close-btn" onClick={handleCloseModals}>×</button>
                        </div>
                        <div className="modal-body">
                            {/* Live Calculations Banner */}
                            <div className="computed-results-grid">
                                <div className="computed-box">
                                    <span className="computed-label">Net (kg)</span>
                                    <span className="computed-value">{formatNum(derivedData['NET (KG)'])}</span>
                                </div>
                                <div className="computed-box">
                                    <span className="computed-label">Pkt Wt (kg)</span>
                                    <span className="computed-value">{formatNum(derivedData['Packet (KG) calculated'])}</span>
                                </div>
                                <div className="computed-box">
                                    <span className="computed-label">Q-Cut (kg)</span>
                                    <span className="computed-value">{formatNum(derivedData['Quality cut'])}</span>
                                </div>
                                <div className="computed-box">
                                    <span className="computed-label">M-Cut (kg)</span>
                                    <span className="computed-value">{formatNum(derivedData['Moisture cut'])}</span>
                                </div>
                                <div className="computed-box highlight">
                                    <span className="computed-label">Mill Qty (q)</span>
                                    <span className="computed-value">{formatNum(derivedData['Mill Qty. (qunital)'])}</span>
                                </div>
                                <div className="computed-box">
                                    <span className="computed-label">Balance (q)</span>
                                    <span className={`computed-value ${derivedData['Balance'] >= 0 ? 'text-positive' : 'text-negative'}`}>
                                        {derivedData['Balance'] > 0 ? '+' : ''}{formatNum(derivedData['Balance'])}
                                    </span>
                                </div>
                                <div className="computed-box">
                                    <span className="computed-label">Cut %</span>
                                    <span className="computed-value">{formatNum(derivedData['percentage'])}%</span>
                                </div>
                            </div>

                            <form id="record-form" onSubmit={handleSubmit}>
                                {/* Basic Info Section */}
                                <h3 className="form-section-title">Basic Information</h3>
                                <div className="form-grid">
                                    <div className="form-group">
                                        <label>Date</label>
                                        <input type="date" name="Date" className="form-control" required value={formData['Date'] || ''} onChange={handleInputChange} />
                                    </div>
                                    <div className="form-group">
                                        <label>Farmer Name</label>
                                        <input type="text" name="Farmer Name" className="form-control" required value={formData['Farmer Name'] || ''} onChange={handleInputChange} />
                                    </div>
                                    <div className="form-group">
                                        <label>Society</label>
                                        <input type="text" name="Society" className="form-control" value={formData['Society'] || ''} onChange={handleInputChange} />
                                    </div>
                                    <div className="form-group">
                                        <label>Vehicle No</label>
                                        <input type="text" name="Vehicle No" className="form-control" required value={formData['Vehicle No'] || ''} onChange={handleInputChange} />
                                    </div>
                                    <div className="form-group">
                                        <label>TP Accepted (q)</label>
                                        <input type="number" step="0.01" name="TP ACCEPTED" className="form-control" required value={formData['TP ACCEPTED'] ?? ''} onChange={handleInputChange} />
                                    </div>
                                    <div className="form-group">
                                        <label>Token Qty (q)</label>
                                        <input type="number" step="0.01" name="Token Qty ( Quintal )" className="form-control" required value={formData['Token Qty ( Quintal )'] ?? ''} onChange={handleInputChange} />
                                    </div>
                                </div>

                                {/* Weights & Packets Section */}
                                <h3 className="form-section-title">Weights & Bags</h3>
                                <div className="form-grid">
                                    <div className="form-group">
                                        <label>Gross Weight (kg)</label>
                                        <input type="number" name="Gross(KG)" className="form-control" required value={formData['Gross(KG)'] ?? ''} onChange={handleInputChange} />
                                    </div>
                                    <div className="form-group">
                                        <label>Tare Weight (kg)</label>
                                        <input type="number" name="Tare(KG)" className="form-control" required value={formData['Tare(KG)'] ?? ''} onChange={handleInputChange} />
                                    </div>
                                    <div className="form-group">
                                        <label>Total Packets</label>
                                        <input type="number" name="Total Packet" className="form-control" required value={formData['Total Packet'] ?? ''} onChange={handleInputChange} />
                                    </div>
                                    <div className="form-group">
                                        <label>Plastic Packets</label>
                                        <input type="number" name="Plastic Packet" className="form-control" required value={formData['Plastic Packet'] ?? ''} onChange={handleInputChange} />
                                    </div>
                                </div>

                                {/* Quality & Moisture Section */}
                                <h3 className="form-section-title">Quality & Moisture Cuts</h3>
                                <p className="form-help-text">Packets 1-4 take percentages (%). Packets 5-8 take fixed KG cuts per packet.</p>

                                <div className="packets-grid">
                                    {/* Packets 1-4 */}
                                    {[1, 2, 3, 4].map(num => (
                                        <div key={`p${num}`} className="packet-row">
                                            <div className="packet-label">Packet {num}</div>
                                            <div className="form-group">
                                                <label>Count</label>
                                                <input type="number" name={`No of Packet ${num}`} className="form-control" value={formData[`No of Packet ${num}`] ?? ''} onChange={handleInputChange} />
                                            </div>
                                            <div className="form-group">
                                                <label>Quality %</label>
                                                <input type="number" step="0.01" name={`quality packet ${num} (Q)`} className="form-control" value={formData[`quality packet ${num} (Q)`] ?? ''} onChange={handleInputChange} />
                                            </div>
                                            <div className="form-group">
                                                <label>Moisture %</label>
                                                <input type="number" step="0.01" name={`MC packet ${num} (Q)`} className="form-control" value={formData[`MC packet ${num} (Q)`] ?? ''} onChange={handleInputChange} />
                                            </div>
                                        </div>
                                    ))}

                                    {/* Packets 5-8 */}
                                    {[5, 6, 7, 8].map(num => (
                                        <div key={`p${num}`} className="packet-row">
                                            <div className="packet-label">Packet {num}</div>
                                            <div className="form-group">
                                                <label>Count</label>
                                                <input type="number" name={`No of Packet ${num}`} className="form-control" value={formData[`No of Packet ${num}`] ?? ''} onChange={handleInputChange} />
                                            </div>
                                            <div className="form-group" style={{ gridColumn: 'span 2' }}>
                                                <label>Quality Cut (kg/pkt)</label>
                                                <input type="number" step="0.01" name={`quality by packet ${num}`} className="form-control" value={formData[`quality by packet ${num}`] ?? ''} onChange={handleInputChange} />
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </form>
                        </div>
                        <div className="modal-footer">
                            <button className="btn-secondary" onClick={handleCloseModals}>Cancel</button>
                            <button type="submit" form="record-form" className="btn-primary">
                                {currentRecord ? 'Save Changes' : 'Add Record'}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Delete Confirmation Modal */}
            {isDeleteModalOpen && currentRecord && (
                <div className="modal-overlay" onClick={handleCloseModals}>
                    <div className="modal-content" style={{ maxWidth: 400 }} onClick={e => e.stopPropagation()}>
                        <div className="modal-body confirm-message">
                            <div className="confirm-icon">⚠️</div>
                            <div className="confirm-text">Delete Lot Record?</div>
                            <div className="confirm-subtext">
                                Are you sure you want to delete the record for <strong>{currentRecord['Farmer Name']}</strong>? This action cannot be undone.
                            </div>
                        </div>
                        <div className="modal-footer" style={{ justifyContent: 'center' }}>
                            <button className="btn-secondary" onClick={handleCloseModals}>Cancel</button>
                            <button className="btn-danger" onClick={handleDelete}>Yes, Delete Record</button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
