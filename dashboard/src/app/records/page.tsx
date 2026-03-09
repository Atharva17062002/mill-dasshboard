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
    // Dynamic row counts
    const [qualityRowCount, setQualityRowCount] = useState(1);
    const [moistureRowCount, setMoistureRowCount] = useState(1);
    // Track quality cut mode per row: 'percent' or 'kgpkt'
    const [qualityCutModes, setQualityCutModes] = useState<string[]>(['percent']);

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
            'quality_count_1': '', 'quality_pct_1': '', 'quality_kgpkt_1': '',
            'moisture_count_1': '', 'moisture_pct_1': '',
            'Quality cut': '',
            'Moisture cut': ''
        });
        setQualityRowCount(1);
        setMoistureRowCount(1);
        setQualityCutModes(['percent']);
        setIsFormModalOpen(true);
    };

    const handleOpenEdit = (record: any) => {
        setCurrentRecord(record);
        const formattedDate = record.Date ? new Date(record.Date).toISOString().split('T')[0] : '';

        // Migrate old-format fields into new field names
        const migrated: any = { ...record, Date: formattedDate };
        for (let i = 1; i <= 20; i++) {
            // Old format migration (packets 1-4 had quality % + moisture %, 5-8 had kg/pkt)
            if (i <= 4) {
                migrated[`quality_count_${i}`] = migrated[`quality_count_${i}`] ?? migrated[`No of Packet ${i}`] ?? '';
                migrated[`quality_pct_${i}`] = migrated[`quality_pct_${i}`] ?? migrated[`quality packet ${i} (Q)`] ?? '';
                migrated[`quality_kgpkt_${i}`] = migrated[`quality_kgpkt_${i}`] ?? '';
                migrated[`moisture_count_${i}`] = migrated[`moisture_count_${i}`] ?? migrated[`No of Packet ${i}`] ?? '';
                migrated[`moisture_pct_${i}`] = migrated[`moisture_pct_${i}`] ?? migrated[`MC packet ${i} (Q)`] ?? '';
            } else if (i <= 8) {
                migrated[`quality_count_${i}`] = migrated[`quality_count_${i}`] ?? migrated[`No of Packet ${i}`] ?? '';
                migrated[`quality_pct_${i}`] = migrated[`quality_pct_${i}`] ?? '';
                migrated[`quality_kgpkt_${i}`] = migrated[`quality_kgpkt_${i}`] ?? migrated[`quality by packet ${i}`] ?? '';
                migrated[`moisture_count_${i}`] = migrated[`moisture_count_${i}`] ?? '';
                migrated[`moisture_pct_${i}`] = migrated[`moisture_pct_${i}`] ?? '';
            }
        }

        // Detect how many quality/moisture rows have data
        let qCount = 1;
        let mCount = 1;
        for (let i = 1; i <= 20; i++) {
            if (Number(migrated[`quality_count_${i}`]) || Number(migrated[`quality_pct_${i}`]) || Number(migrated[`quality_kgpkt_${i}`])) {
                qCount = i;
            }
            if (Number(migrated[`moisture_count_${i}`]) || Number(migrated[`moisture_pct_${i}`])) {
                mCount = i;
            }
        }

        // Determine modes from existing data
        const modes: string[] = [];
        for (let i = 0; i < qCount; i++) {
            const idx = i + 1;
            if (Number(migrated[`quality_kgpkt_${idx}`]) > 0 && !Number(migrated[`quality_pct_${idx}`])) {
                modes.push('kgpkt');
            } else {
                modes.push('percent');
            }
        }

        setFormData(migrated);
        setQualityRowCount(qCount);
        setMoistureRowCount(mCount);
        setQualityCutModes(modes);
        setIsFormModalOpen(true);
    };

    const handleModeChange = (rowIndex: number, mode: string) => {
        setQualityCutModes(prev => {
            const next = [...prev];
            next[rowIndex] = mode;
            return next;
        });
    };

    const addQualityRow = () => {
        const next = qualityRowCount + 1;
        setQualityRowCount(next);
        setQualityCutModes(prev => [...prev, 'percent']);
        setFormData((prev: any) => ({ ...prev, [`quality_count_${next}`]: '', [`quality_pct_${next}`]: '', [`quality_kgpkt_${next}`]: '' }));
    };

    const removeQualityRow = (idx: number) => {
        if (qualityRowCount <= 1) return;
        // Shift data from rows above the removed one down
        const newData = { ...formData };
        const newModes = [...qualityCutModes];
        for (let i = idx; i < qualityRowCount; i++) {
            newData[`quality_count_${i}`] = newData[`quality_count_${i + 1}`] ?? '';
            newData[`quality_pct_${i}`] = newData[`quality_pct_${i + 1}`] ?? '';
            newData[`quality_kgpkt_${i}`] = newData[`quality_kgpkt_${i + 1}`] ?? '';
            newModes[i - 1] = newModes[i] ?? 'percent';
        }
        // Clear the last row
        delete newData[`quality_count_${qualityRowCount}`];
        delete newData[`quality_pct_${qualityRowCount}`];
        delete newData[`quality_kgpkt_${qualityRowCount}`];
        newModes.pop();
        setFormData(newData);
        setQualityCutModes(newModes);
        setQualityRowCount(qualityRowCount - 1);
    };

    const addMoistureRow = () => {
        const next = moistureRowCount + 1;
        setMoistureRowCount(next);
        setFormData((prev: any) => ({ ...prev, [`moisture_count_${next}`]: '', [`moisture_pct_${next}`]: '' }));
    };

    const removeMoistureRow = (idx: number) => {
        if (moistureRowCount <= 1) return;
        const newData = { ...formData };
        for (let i = idx; i < moistureRowCount; i++) {
            newData[`moisture_count_${i}`] = newData[`moisture_count_${i + 1}`] ?? '';
            newData[`moisture_pct_${i}`] = newData[`moisture_pct_${i + 1}`] ?? '';
        }
        delete newData[`moisture_count_${moistureRowCount}`];
        delete newData[`moisture_pct_${moistureRowCount}`];
        setFormData(newData);
        setMoistureRowCount(moistureRowCount - 1);
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
        let parsedValue = type === 'number' ? (value === '' ? '' : Number(value)) : value;
        if (name === 'Vehicle No' && typeof parsedValue === 'string') {
            parsedValue = parsedValue.toUpperCase();
        }
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

        // Quality rows (dynamic count)
        for (let i = 1; i <= qualityRowCount; i++) {
            const count = safeNum(newData[`quality_count_${i}`]);
            const mode = qualityCutModes[i - 1] || 'percent';
            let qCut = 0;
            if (mode === 'kgpkt') {
                const kgPerPkt = safeNum(newData[`quality_kgpkt_${i}`]);
                qCut = Math.round(kgPerPkt * count);
            } else {
                const pct = safeNum(newData[`quality_pct_${i}`]);
                qCut = Math.round((weightPerPacketIfAny * count) * (pct / 100));
            }
            newData[`Quality Packet ${i} total (Q)`] = qCut;
            totalQCut += qCut;
        }

        // Moisture rows (dynamic count)
        for (let i = 1; i <= moistureRowCount; i++) {
            const count = safeNum(newData[`moisture_count_${i}`]);
            const pct = safeNum(newData[`moisture_pct_${i}`]);
            const mCut = Math.round((weightPerPacketIfAny * count) * (pct / 100));
            newData[`MC Packet ${i} total (Q)`] = mCut;
            totalMCut += mCut;
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
                        {/* Live Calculations Banner — outside modal-body so it stays fixed */}
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
                        <div className="modal-body">
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
                                        <input type="text" name="Farmer Name" className="form-control" value={formData['Farmer Name'] || ''} onChange={handleInputChange} />
                                    </div>
                                    <div className="form-group">
                                        <label>Society</label>
                                        <input type="text" name="Society" className="form-control" value={formData['Society'] || ''} onChange={handleInputChange} />
                                    </div>
                                    <div className="form-group">
                                        <label>Vehicle No</label>
                                        <input type="text" name="Vehicle No" style={{ textTransform: "uppercase" }} className="form-control" value={formData['Vehicle No'] || ''} onChange={handleInputChange} />
                                    </div>
                                    <div className="form-group">
                                        <label>TP Accepted (q)</label>
                                        <input type="number" step="0.01" name="TP ACCEPTED" className="form-control" value={formData['TP ACCEPTED'] ?? ''} onChange={handleInputChange} />
                                    </div>
                                    <div className="form-group">
                                        <label>Token Qty (q)</label>
                                        <input type="number" step="0.01" name="Token Qty ( Quintal )" className="form-control" value={formData['Token Qty ( Quintal )'] ?? ''} onChange={handleInputChange} />
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
                                        <input type="number" name="Tare(KG)" className="form-control" value={formData['Tare(KG)'] ?? ''} onChange={handleInputChange} />
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

                                {/* Quality Cuts Section */}
                                <h3 className="form-section-title">Quality Cuts</h3>
                                <p className="form-help-text">Add packet counts and choose either percentage (%) or fixed kg/pkt for each row.</p>

                                <div className="packets-grid">
                                    {Array.from({ length: qualityRowCount }, (_, i) => i + 1).map(num => (
                                        <div key={`q${num}`} className="packet-row quality-row">
                                            <div className="packet-label">Q-Row {num}</div>
                                            <div className="form-group">
                                                <label>Count</label>
                                                <input type="number" name={`quality_count_${num}`} className="form-control" value={formData[`quality_count_${num}`] ?? ''} onChange={handleInputChange} />
                                            </div>
                                            <div className="form-group">
                                                <div className="mode-toggle">
                                                    <button type="button" className={`mode-btn ${qualityCutModes[num - 1] === 'percent' ? 'active' : ''}`} onClick={() => handleModeChange(num - 1, 'percent')}>%</button>
                                                    <button type="button" className={`mode-btn ${qualityCutModes[num - 1] === 'kgpkt' ? 'active' : ''}`} onClick={() => handleModeChange(num - 1, 'kgpkt')}>kg/pkt</button>
                                                </div>
                                                {qualityCutModes[num - 1] === 'percent' ? (
                                                    <>
                                                        <label>Quality Cut (%)</label>
                                                        <input type="number" step="0.01" name={`quality_pct_${num}`} className="form-control" value={formData[`quality_pct_${num}`] ?? ''} onChange={handleInputChange} />
                                                    </>
                                                ) : (
                                                    <>
                                                        <label>Quality Cut (kg/pkt)</label>
                                                        <input type="number" step="0.01" name={`quality_kgpkt_${num}`} className="form-control" value={formData[`quality_kgpkt_${num}`] ?? ''} onChange={handleInputChange} />
                                                    </>
                                                )}
                                            </div>
                                            <div className="packet-subtotal">
                                                <span className="subtotal-label">Cut</span>
                                                <span className="subtotal-value">{formatNum(derivedData[`Quality Packet ${num} total (Q)`])} kg</span>
                                            </div>
                                            {qualityRowCount > 1 && (
                                                <button type="button" className="btn-remove-row" onClick={() => removeQualityRow(num)} title="Remove row">×</button>
                                            )}
                                        </div>
                                    ))}
                                    <button type="button" className="btn-add-row quality-add" onClick={addQualityRow}>+ Add Quality Row</button>
                                </div>

                                {/* Moisture Cuts Section */}
                                <h3 className="form-section-title moisture-title">Moisture Cuts</h3>
                                <p className="form-help-text">Add packet counts and moisture percentage for each row.</p>

                                <div className="packets-grid">
                                    {Array.from({ length: moistureRowCount }, (_, i) => i + 1).map(num => (
                                        <div key={`m${num}`} className="packet-row moisture-row">
                                            <div className="packet-label">M-Row {num}</div>
                                            <div className="form-group">
                                                <label>Count</label>
                                                <input type="number" name={`moisture_count_${num}`} className="form-control" value={formData[`moisture_count_${num}`] ?? ''} onChange={handleInputChange} />
                                            </div>
                                            <div className="form-group">
                                                <label>Moisture Cut (%)</label>
                                                <input type="number" step="0.01" name={`moisture_pct_${num}`} className="form-control" value={formData[`moisture_pct_${num}`] ?? ''} onChange={handleInputChange} />
                                            </div>
                                            <div className="packet-subtotal">
                                                <span className="subtotal-label">Cut</span>
                                                <span className="subtotal-value">{formatNum(derivedData[`MC Packet ${num} total (Q)`])} kg</span>
                                            </div>
                                            {moistureRowCount > 1 && (
                                                <button type="button" className="btn-remove-row" onClick={() => removeMoistureRow(num)} title="Remove row">×</button>
                                            )}
                                        </div>
                                    ))}
                                    <button type="button" className="btn-add-row moisture-add" onClick={addMoistureRow}>+ Add Moisture Row</button>
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
