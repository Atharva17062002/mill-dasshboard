'use client';

import { useEffect, useState, useCallback, useRef, useMemo } from 'react';
import Link from 'next/link';
import { QualityMoistureChart, PerLotBarChart, MillQtyChart } from '@/components/Charts';

interface DashboardData {
  summary: {
    millQty: number;
    totalQualityCutting: number;
    percentage: number;
    qualityCut: number;
    moistureCut: number;
    qualityPct: number;
    moisturePct: number;
    gross: number;
    tare: number;
    netKg: number;
    netQuintal: number;
    gunny: number;
    totalPacket: number;
    tpAccepted: number;
  };
  revenue: {
    millRate: number;
    qualityRate: number;
    millRevenue: number;
    qualityDeductionRevenue: number;
    tpRevenue: number;
    millRecovery: number;
    qualityRecovery: number;
    tpRecovery: number;
    millLots: number;
    qualityLots: number;
    tpLots: number;
    recoveryRate: number;
    lotSize: number;
  };
  records: {
    slNo: number;
    date: string;
    society: string;
    farmerName: string;
    vehicleNo: string;
    tpAccepted: number;
    tokenQty: number;
    millQty: number;
    balance: number;
    grossKg: number;
    tareKg: number;
    netKg: number;
    totalPacket: number;
    qualityCut: number;
    moistureCut: number;
    totalCutting: number;
    percentage: number;
    ppcName: string;
  }[];
  totalRecords: number;
}

// ==================== TILE CONFIG ====================
interface TileConfig {
  id: string;
  label: string;
  icon: string;
  category: 'kpi' | 'section';
}

const ALL_TILES: TileConfig[] = [
  // KPI Cards
  { id: 'kpi-mill-qty', label: 'Mill Quantity', icon: '⚖️', category: 'kpi' },
  { id: 'kpi-tp-accepted', label: 'TP Accepted (SBP)', icon: '📋', category: 'kpi' },
  { id: 'kpi-quality-pct', label: 'Deduction %', icon: '📊', category: 'kpi' },
  { id: 'kpi-net-qty', label: 'Net Quantity', icon: '📦', category: 'kpi' },
  { id: 'kpi-gross', label: 'Gross Weight', icon: '🏋️', category: 'kpi' },
  { id: 'kpi-packets', label: 'Total Packets', icon: '🧺', category: 'kpi' },
  { id: 'kpi-gunny', label: 'Gunny Deduction', icon: '👜', category: 'kpi' },
  { id: 'kpi-deduction', label: 'Total Cutting', icon: '✂️', category: 'kpi' },
  // Section Cards
  { id: 'revenue', label: 'Revenue & Recovery', icon: '💰', category: 'section' },
  { id: 'quality-moisture', label: 'Quality vs Moisture', icon: '🔬', category: 'section' },
  { id: 'weight-breakdown', label: 'Weight Breakdown', icon: '⚖️', category: 'section' },
  { id: 'quick-stats', label: 'Quick Stats', icon: '📋', category: 'section' },
  { id: 'mill-qty-chart', label: 'Token vs Mill Qty Chart', icon: '📊', category: 'section' },
  { id: 'cutting-chart', label: 'Quality & Moisture Chart', icon: '✂️', category: 'section' },
  { id: 'records-table', label: 'Lot Records Table', icon: '📜', category: 'section' },
];

const STORAGE_KEY = 'mill-dashboard-visible-tiles';

function getDefaultVisibility(): Record<string, boolean> {
  return Object.fromEntries(ALL_TILES.map(t => [t.id, true]));
}

// ==================== HELPERS ====================
function formatNum(n: number, decimals = 2): string {
  return n.toLocaleString('en-IN', {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  });
}

function formatCurrency(n: number): string {
  return '₹' + n.toLocaleString('en-IN', {
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  });
}

function formatDate(dateStr: string): string {
  if (!dateStr) return '—';
  const d = new Date(dateStr);
  return d.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: '2-digit' });
}

// ==================== MAIN COMPONENT ====================
export default function Dashboard() {
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [visibleTiles, setVisibleTiles] = useState<Record<string, boolean>>(getDefaultVisibility);
  const [hydrated, setHydrated] = useState(false);
  const [filterText, setFilterText] = useState('');
  const [expanded, setExpanded] = useState(false);
  const [displayCount, setDisplayCount] = useState(15);
  const recordsContainerRef = useRef<HTMLDivElement>(null);

  // Load from localStorage AFTER hydration to avoid mismatch
  useEffect(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) {
        setVisibleTiles(JSON.parse(stored));
      }
    } catch { /* ignore */ }
    setHydrated(true);
  }, []);

  useEffect(() => {
    fetch('/api/dashboard')
      .then((r) => r.json())
      .then((d) => {
        setData(d);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, []);

  // Persist visibility to localStorage (only after initial hydration)
  useEffect(() => {
    if (!hydrated) return;
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(visibleTiles));
    } catch { /* ignore */ }
  }, [visibleTiles, hydrated]);

  const toggleTile = useCallback((id: string) => {
    setVisibleTiles(prev => ({ ...prev, [id]: !prev[id] }));
  }, []);

  const showAll = useCallback(() => {
    setVisibleTiles(Object.fromEntries(ALL_TILES.map(t => [t.id, true])));
  }, []);

  const hideAll = useCallback(() => {
    setVisibleTiles(Object.fromEntries(ALL_TILES.map(t => [t.id, false])));
  }, []);

  const isVisible = (id: string) => visibleTiles[id] !== false;

  const visibleKpis = ALL_TILES.filter(t => t.category === 'kpi' && isVisible(t.id));
  const hiddenCount = ALL_TILES.filter(t => !isVisible(t.id)).length;

  if (loading) {
    return (
      <div className="dashboard-container" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '100vh' }}>
        <div style={{ textAlign: 'center' }}>
          <div style={{ fontSize: '2rem', marginBottom: '0.5rem' }}>🌾</div>
          <div style={{ color: 'var(--text-secondary)', fontSize: '0.9rem' }}>Loading dashboard...</div>
        </div>
      </div>
    );
  }

  if (!data) {
    return (
      <div className="dashboard-container" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '100vh' }}>
        <div style={{ color: 'var(--accent-rose)' }}>Failed to load dashboard data.</div>
      </div>
    );
  }

  const { summary: s, revenue: r, records } = data;

  // Map KPI IDs to their render content
  const kpiContent: Record<string, React.ReactNode> = {
    'kpi-mill-qty': (
      <div className="kpi-card gold" key="kpi-mill-qty">
        <div className="kpi-icon">⚖️</div>
        <div className="kpi-label">Mill Quantity</div>
        <div className="kpi-value">{formatNum(s.millQty)} q</div>
        <div className="kpi-subtext">Final milled paddy quantity</div>
      </div>
    ),
    'kpi-tp-accepted': (
      <div className="kpi-card emerald" key="kpi-tp-accepted">
        <div className="kpi-icon">📋</div>
        <div className="kpi-label">TP Accepted (SBP)</div>
        <div className="kpi-value">{formatNum(s.tpAccepted)} q</div>
        <div className="kpi-subtext">Government token permit qty</div>
      </div>
    ),
    'kpi-quality-pct': (
      <div className="kpi-card rose" key="kpi-quality-pct">
        <div className="kpi-icon">📊</div>
        <div className="kpi-label">Deduction %</div>
        <div className="kpi-value">{formatNum(s.percentage)}%</div>
        <div className="kpi-subtext">Quality + Moisture deduction rate</div>
      </div>
    ),
    'kpi-net-qty': (
      <div className="kpi-card blue" key="kpi-net-qty">
        <div className="kpi-icon">📦</div>
        <div className="kpi-label">Net Quantity</div>
        <div className="kpi-value">{formatNum(s.netQuintal)} q</div>
        <div className="kpi-subtext">Gross − Tare = {s.netKg.toLocaleString('en-IN')} KG</div>
      </div>
    ),
    'kpi-gross': (
      <div className="kpi-card purple" key="kpi-gross">
        <div className="kpi-icon">🏋️</div>
        <div className="kpi-label">Gross Weight</div>
        <div className="kpi-value">{s.gross.toLocaleString('en-IN')} kg</div>
        <div className="kpi-subtext">Total incoming weight</div>
      </div>
    ),
    'kpi-packets': (
      <div className="kpi-card cyan" key="kpi-packets">
        <div className="kpi-icon">🧺</div>
        <div className="kpi-label">Total Packets</div>
        <div className="kpi-value">{s.totalPacket.toLocaleString('en-IN')}</div>
        <div className="kpi-subtext">Across all lots</div>
      </div>
    ),
    'kpi-gunny': (
      <div className="kpi-card amber" key="kpi-gunny">
        <div className="kpi-icon">👜</div>
        <div className="kpi-label">Gunny Deduction</div>
        <div className="kpi-value">{formatNum(s.gunny)} q</div>
        <div className="kpi-subtext">Bag weight adjustment</div>
      </div>
    ),
    'kpi-deduction': (
      <div className="kpi-card emerald" key="kpi-deduction">
        <div className="kpi-icon">✂️</div>
        <div className="kpi-label">Total Cutting</div>
        <div className="kpi-value">{formatNum(s.totalQualityCutting)} q</div>
        <div className="kpi-subtext">Quality: {formatNum(s.qualityCut)}q &bull; Moisture: {formatNum(s.moistureCut)}q</div>
      </div>
    ),
  };

  // Check which paired sections are visible
  const revenueVisible = isVisible('revenue');
  const qualityMoistureVisible = isVisible('quality-moisture');
  const weightVisible = isVisible('weight-breakdown');
  const statsVisible = isVisible('quick-stats');
  const millChartVisible = isVisible('mill-qty-chart');
  const cuttingChartVisible = isVisible('cutting-chart');
  const recordsVisible = isVisible('records-table');

  return (
    <div className="dashboard-container">
      {/* ===== SETTINGS DRAWER ===== */}
      <div className={`settings-overlay ${settingsOpen ? 'open' : ''}`} onClick={() => setSettingsOpen(false)} />
      <div className={`settings-drawer ${settingsOpen ? 'open' : ''}`}>
        <div className="settings-header">
          <h2 className="settings-title">⚙️ Customize Dashboard</h2>
          <button className="settings-close" onClick={() => setSettingsOpen(false)}>✕</button>
        </div>
        <div className="settings-actions">
          <button className="settings-btn" onClick={showAll}>Show All</button>
          <button className="settings-btn" onClick={hideAll}>Hide All</button>
        </div>

        <div className="settings-group">
          <div className="settings-group-label">KPI Cards</div>
          {ALL_TILES.filter(t => t.category === 'kpi').map(tile => (
            <label key={tile.id} className="settings-toggle-row">
              <span className="settings-toggle-label">
                <span className="settings-tile-icon">{tile.icon}</span>
                {tile.label}
              </span>
              <div className={`toggle-switch ${isVisible(tile.id) ? 'on' : ''}`} onClick={() => toggleTile(tile.id)}>
                <div className="toggle-knob" />
              </div>
            </label>
          ))}
        </div>

        <div className="settings-group">
          <div className="settings-group-label">Sections</div>
          {ALL_TILES.filter(t => t.category === 'section').map(tile => (
            <label key={tile.id} className="settings-toggle-row">
              <span className="settings-toggle-label">
                <span className="settings-tile-icon">{tile.icon}</span>
                {tile.label}
              </span>
              <div className={`toggle-switch ${isVisible(tile.id) ? 'on' : ''}`} onClick={() => toggleTile(tile.id)}>
                <div className="toggle-knob" />
              </div>
            </label>
          ))}
        </div>
      </div>

      {/* ===== HEADER ===== */}
      <header className="dashboard-header animate-in">
        <div className="header-left">
          <div className="header-icon">🌾</div>
          <div>
            <h1 className="header-title">Rice Mill Dashboard</h1>
            <p className="header-subtitle">Operations & Quality Tracker — BARAIPALI MY</p>
          </div>
        </div>
        <div className="header-right">
          <button
            className="settings-trigger"
            onClick={() => setSettingsOpen(true)}
            title="Customize tiles"
          >
            ⚙️ Customize
            {hiddenCount > 0 && <span className="hidden-badge">{hiddenCount} hidden</span>}
          </button>
          <div className="header-badge">
            <span className="dot" />
            Live Data
          </div>
          <div className="header-date">
            Season 2025-26 &bull; {data.totalRecords} Lots
          </div>
        </div>
      </header>

      {/* ===== KPI CARDS (dynamic grid) ===== */}
      {visibleKpis.length > 0 && (
        <div className="kpi-grid animate-in delay-1" style={{
          gridTemplateColumns: `repeat(${Math.min(visibleKpis.length, 4)}, 1fr)`
        }}>
          {visibleKpis.map(tile => kpiContent[tile.id])}
        </div>
      )}

      {/* ===== REVENUE & QUALITY SPLIT ===== */}
      {(revenueVisible || qualityMoistureVisible) && (
        <div className={`section-row animate-in delay-3 ${revenueVisible && qualityMoistureVisible ? 'wide-narrow' : ''}`}
          style={!(revenueVisible && qualityMoistureVisible) ? { gridTemplateColumns: '1fr' } : undefined}>
          {revenueVisible && (
            <div className="section-card" id="revenue-section">
              <div className="section-title">
                <span className="icon">💰</span>
                Revenue & Recovery Analysis
              </div>
              <table className="revenue-table">
                <thead>
                  <tr>
                    <th>Metric</th>
                    <th>Quantity (q)</th>
                    <th>Rate (₹/q)</th>
                    <th>Revenue (₹)</th>
                    <th>68% Recovery (q)</th>
                    <th>Lots ({r.lotSize}q)</th>
                  </tr>
                </thead>
                <tbody>
                  <tr>
                    <td className="revenue-label">Mill Quantity</td>
                    <td className="revenue-value">{formatNum(s.millQty)}</td>
                    <td className="revenue-subvalue">{formatCurrency(r.millRate)}</td>
                    <td className="revenue-highlight">{formatCurrency(r.millRevenue)}</td>
                    <td className="revenue-subvalue">{formatNum(r.millRecovery)}</td>
                    <td className="revenue-subvalue">{formatNum(r.millLots)}</td>
                  </tr>
                  <tr>
                    <td className="revenue-label">Quality + Moisture</td>
                    <td className="revenue-value">{formatNum(s.totalQualityCutting)}</td>
                    <td className="revenue-subvalue">{formatCurrency(r.qualityRate)}</td>
                    <td className="revenue-highlight">{formatCurrency(r.qualityDeductionRevenue)}</td>
                    <td className="revenue-subvalue">{formatNum(r.qualityRecovery)}</td>
                    <td className="revenue-subvalue">{formatNum(r.qualityLots)}</td>
                  </tr>
                  <tr>
                    <td className="revenue-label">TP Accepted (SBP)</td>
                    <td className="revenue-value">{formatNum(s.tpAccepted)}</td>
                    <td className="revenue-subvalue">{formatCurrency(r.qualityRate)}</td>
                    <td className="revenue-highlight">{formatCurrency(r.tpRevenue)}</td>
                    <td className="revenue-subvalue">{formatNum(r.tpRecovery)}</td>
                    <td className="revenue-subvalue">{formatNum(r.tpLots)}</td>
                  </tr>
                </tbody>
              </table>
            </div>
          )}
          {qualityMoistureVisible && (
            <div className="section-card" id="quality-split-section">
              <div className="section-title">
                <span className="icon">🔬</span>
                Quality vs Moisture
              </div>
              <QualityMoistureChart qualityCut={s.qualityCut} moistureCut={s.moistureCut} />
            </div>
          )}
        </div>
      )}

      {/* ===== WEIGHT BREAKDOWN & STATS ===== */}
      {(weightVisible || statsVisible) && (
        <div className={`section-row animate-in delay-4 ${weightVisible && statsVisible ? 'wide-narrow' : ''}`}
          style={!(weightVisible && statsVisible) ? { gridTemplateColumns: '1fr' } : undefined}>
          {weightVisible && (
            <div className="section-card" id="weight-section">
              <div className="section-title">
                <span className="icon">⚖️</span>
                Weight Breakdown
              </div>
              <div className="weight-breakdown">
                <div className="weight-item">
                  <div className="weight-label-group">
                    <div className="weight-label">Gross</div>
                    <div className="weight-value">{s.gross.toLocaleString('en-IN')} kg</div>
                  </div>
                  <div className="weight-bar-container">
                    <div className="weight-bar gross" style={{ width: '100%' }}>
                      <span className="weight-bar-text">100%</span>
                    </div>
                  </div>
                </div>
                <div className="weight-item">
                  <div className="weight-label-group">
                    <div className="weight-label">Tare</div>
                    <div className="weight-value">{s.tare.toLocaleString('en-IN')} kg</div>
                  </div>
                  <div className="weight-bar-container">
                    <div className="weight-bar tare" style={{ width: `${(s.tare / s.gross * 100).toFixed(1)}%` }}>
                      <span className="weight-bar-text">{(s.tare / s.gross * 100).toFixed(1)}%</span>
                    </div>
                  </div>
                </div>
                <div className="weight-item">
                  <div className="weight-label-group">
                    <div className="weight-label">Net</div>
                    <div className="weight-value">{s.netKg.toLocaleString('en-IN')} kg</div>
                  </div>
                  <div className="weight-bar-container">
                    <div className="weight-bar net" style={{ width: `${(s.netKg / s.gross * 100).toFixed(1)}%` }}>
                      <span className="weight-bar-text">{(s.netKg / s.gross * 100).toFixed(1)}%</span>
                    </div>
                  </div>
                </div>
                <div className="weight-item">
                  <div className="weight-label-group">
                    <div className="weight-label">Gunny</div>
                    <div className="weight-value">{(s.gunny * 100).toLocaleString('en-IN')} kg</div>
                  </div>
                  <div className="weight-bar-container">
                    <div className="weight-bar gunny" style={{ width: `${((s.gunny * 100) / s.gross * 100).toFixed(1)}%` }}>
                      <span className="weight-bar-text">{((s.gunny * 100) / s.gross * 100).toFixed(1)}%</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}
          {statsVisible && (
            <div className="section-card" id="stats-section">
              <div className="section-title">
                <span className="icon">📋</span>
                Quick Stats
              </div>
              <div className="stat-pills">
                <div className="stat-pill">
                  <div className="stat-pill-label">Total Lots</div>
                  <div className="stat-pill-value">{data.totalRecords}</div>
                </div>
                <div className="stat-pill">
                  <div className="stat-pill-label">Tare %</div>
                  <div className="stat-pill-value">{(s.tare / s.gross * 100).toFixed(1)}%</div>
                </div>
                <div className="stat-pill">
                  <div className="stat-pill-label">Quality %</div>
                  <div className="stat-pill-value">{formatNum(s.qualityPct)}%</div>
                </div>
                <div className="stat-pill">
                  <div className="stat-pill-label">Moisture %</div>
                  <div className="stat-pill-value">{formatNum(s.moisturePct)}%</div>
                </div>
                <div className="stat-pill">
                  <div className="stat-pill-label">Recovery Rate</div>
                  <div className="stat-pill-value">{(r.recoveryRate * 100)}%</div>
                </div>
                <div className="stat-pill">
                  <div className="stat-pill-label">Lot Size</div>
                  <div className="stat-pill-value">{r.lotSize} q</div>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* ===== CHARTS ===== */}
      {(millChartVisible || cuttingChartVisible) && (
        <div className={`section-row animate-in delay-5 ${millChartVisible && cuttingChartVisible ? 'two-col' : ''}`}
          style={!(millChartVisible && cuttingChartVisible) ? { gridTemplateColumns: '1fr' } : undefined}>
          {millChartVisible && (
            <div className="section-card" id="lot-chart-section">
              <div className="section-title">
                <span className="icon">📊</span>
                Token Qty vs Mill Qty (Per Lot)
              </div>
              <MillQtyChart records={records} />
            </div>
          )}
          {cuttingChartVisible && (
            <div className="section-card" id="cutting-chart-section">
              <div className="section-title">
                <span className="icon">✂️</span>
                Quality & Moisture Cutting (Per Lot)
              </div>
              <PerLotBarChart records={records} />
            </div>
          )}
        </div>
      )}

      {/* ===== RECORDS LINK SECTION ===== */}
      {recordsVisible && (
        <div className="section-card animate-in delay-6" id="records-section">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
            <div>
              <div className="section-title" style={{ marginBottom: '8px' }}>
                <span className="icon">📜</span>
                Lot Records Management
              </div>
              <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem' }}>
                Latest 10 paddy lot entries out of {data.totalRecords} total records.
              </p>
            </div>
            <Link href="/records" style={{
              background: 'linear-gradient(135deg, var(--accent-gold), #e8930c)',
              color: '#fff',
              textDecoration: 'none',
              padding: '10px 20px',
              borderRadius: 'var(--radius-md)',
              fontWeight: 600,
              boxShadow: '0 4px 12px rgba(245, 166, 35, 0.2)',
              display: 'inline-flex',
              alignItems: 'center',
              gap: '8px',
              transition: 'transform 0.2s',
              fontSize: '0.95rem'
            }}>
              View All & Manage →
            </Link>
          </div>

          <div className="records-scroll">
            <table className="records-table">
              <thead>
                <tr>
                  <th>#</th>
                  <th>Date</th>
                  <th>Farmer</th>
                  <th>Society</th>
                  <th>Vehicle</th>
                  <th className="text-right">TP Qty (q)</th>
                  <th className="text-right">Token Qty (q)</th>
                  <th className="text-right">Mill Qty (q)</th>
                  <th className="text-right">Balance (q)</th>
                  <th className="text-right">Gross (kg)</th>
                  <th className="text-right">Tare (kg)</th>
                  <th className="text-right">Net (kg)</th>
                  <th className="text-right">Packets</th>
                  <th className="text-right">Cut %</th>
                </tr>
              </thead>
              <tbody>
                {records.slice(0, 10).map((rec) => (
                  <tr key={rec.slNo}>
                    <td>{rec.slNo}</td>
                    <td>{formatDate(rec.date)}</td>
                    <td className="farmer-name">{rec.farmerName}</td>
                    <td>{rec.society.length > 20 ? rec.society.slice(0, 20) + '…' : rec.society}</td>
                    <td>{rec.vehicleNo.toUpperCase()}</td>
                    <td className="text-right">{formatNum(rec.tpAccepted)}</td>
                    <td className="text-right">{formatNum(rec.tokenQty)}</td>
                    <td className="text-right">{formatNum(rec.millQty)}</td>
                    <td className={`text-right ${rec.balance >= 0 ? 'balance-positive' : 'balance-negative'}`}>
                      {rec.balance >= 0 ? '+' : ''}{formatNum(rec.balance)}
                    </td>
                    <td className="text-right">{rec.grossKg.toLocaleString('en-IN')}</td>
                    <td className="text-right">{rec.tareKg.toLocaleString('en-IN')}</td>
                    <td className="text-right">{rec.netKg.toLocaleString('en-IN')}</td>
                    <td className="text-right">{rec.totalPacket}</td>
                    <td className="text-right">
                      <span className={`pct-badge ${rec.percentage < 2 ? 'good' : rec.percentage < 4 ? 'warning' : 'danger'}`}>
                        {formatNum(rec.percentage)}%
                      </span>
                    </td>
                  </tr>
                ))}
                {records.length === 0 && (
                  <tr>
                    <td colSpan={14} style={{ textAlign: 'center', padding: '2rem', color: 'var(--text-tertiary)' }}>
                      No lot records found.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ===== EMPTY STATE ===== */}
      {visibleKpis.length === 0 && !revenueVisible && !qualityMoistureVisible && !weightVisible && !statsVisible && !millChartVisible && !cuttingChartVisible && !recordsVisible && (
        <div className="empty-state">
          <div style={{ fontSize: '2.5rem', marginBottom: '0.75rem' }}>🫥</div>
          <p>All tiles are hidden.</p>
          <p style={{ fontSize: '0.85rem', color: 'var(--text-tertiary)', marginTop: '0.25rem' }}>
            Click <strong>⚙️ Customize</strong> to add tiles back.
          </p>
        </div>
      )}

      {/* Footer */}
      <footer style={{
        textAlign: 'center',
        padding: 'var(--gap-xl) 0 var(--gap-md)',
        color: 'var(--text-tertiary)',
        fontSize: '0.75rem',
      }}>
        Rice Mill Dashboard v1.0 &bull; Phase 1 &bull; Data from Excel import
      </footer>
    </div>
  );
}
