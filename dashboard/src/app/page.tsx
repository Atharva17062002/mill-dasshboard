'use client';

import { useEffect, useState } from 'react';
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
    millBags: number;
    qualityBags: number;
    tpBags: number;
    recoveryRate: number;
    bagWeight: number;
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

export default function Dashboard() {
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch('/api/dashboard')
      .then((r) => r.json())
      .then((d) => {
        setData(d);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, []);

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

  return (
    <div className="dashboard-container">
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
          <div className="header-badge">
            <span className="dot" />
            Live Data
          </div>
          <div className="header-date">
            Season 2025-26 &bull; {data.totalRecords} Lots
          </div>
        </div>
      </header>

      {/* ===== PRIMARY KPI CARDS ===== */}
      <div className="kpi-grid animate-in delay-1">
        <div className="kpi-card gold" id="kpi-mill-qty">
          <div className="kpi-icon">⚖️</div>
          <div className="kpi-label">Mill Quantity</div>
          <div className="kpi-value">{formatNum(s.millQty)} q</div>
          <div className="kpi-subtext">Final milled paddy quantity</div>
        </div>

        <div className="kpi-card emerald" id="kpi-tp-accepted">
          <div className="kpi-icon">📋</div>
          <div className="kpi-label">TP Accepted (SBP)</div>
          <div className="kpi-value">{formatNum(s.tpAccepted)} q</div>
          <div className="kpi-subtext">Government token permit qty</div>
        </div>

        <div className="kpi-card rose" id="kpi-quality-pct">
          <div className="kpi-icon">📊</div>
          <div className="kpi-label">Deduction %</div>
          <div className="kpi-value">{formatNum(s.percentage)}%</div>
          <div className="kpi-subtext">Quality + Moisture deduction rate</div>
        </div>

        <div className="kpi-card blue" id="kpi-net-qty">
          <div className="kpi-icon">📦</div>
          <div className="kpi-label">Net Quantity</div>
          <div className="kpi-value">{formatNum(s.netQuintal)} q</div>
          <div className="kpi-subtext">Gross − Tare = {s.netKg.toLocaleString('en-IN')} KG</div>
        </div>
      </div>

      {/* ===== SECONDARY KPI CARDS ===== */}
      <div className="kpi-grid animate-in delay-2">
        <div className="kpi-card purple" id="kpi-gross">
          <div className="kpi-icon">🏋️</div>
          <div className="kpi-label">Gross Weight</div>
          <div className="kpi-value">{s.gross.toLocaleString('en-IN')} kg</div>
          <div className="kpi-subtext">Total incoming weight</div>
        </div>

        <div className="kpi-card cyan" id="kpi-packets">
          <div className="kpi-icon">🧺</div>
          <div className="kpi-label">Total Packets</div>
          <div className="kpi-value">{s.totalPacket.toLocaleString('en-IN')}</div>
          <div className="kpi-subtext">Across all lots</div>
        </div>

        <div className="kpi-card amber" id="kpi-gunny">
          <div className="kpi-icon">👜</div>
          <div className="kpi-label">Gunny Deduction</div>
          <div className="kpi-value">{formatNum(s.gunny)} q</div>
          <div className="kpi-subtext">Bag weight adjustment</div>
        </div>

        <div className="kpi-card emerald" id="kpi-deduction">
          <div className="kpi-icon">✂️</div>
          <div className="kpi-label">Total Cutting</div>
          <div className="kpi-value">{formatNum(s.totalQualityCutting)} q</div>
          <div className="kpi-subtext">Quality: {formatNum(s.qualityCut)}q &bull; Moisture: {formatNum(s.moistureCut)}q</div>
        </div>
      </div>

      {/* ===== REVENUE & QUALITY SPLIT ===== */}
      <div className="section-row wide-narrow animate-in delay-3">
        {/* Revenue Table */}
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
                <th>Bags (290kg)</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td className="revenue-label">Mill Quantity</td>
                <td className="revenue-value">{formatNum(s.millQty)}</td>
                <td className="revenue-subvalue">{formatCurrency(r.millRate)}</td>
                <td className="revenue-highlight">{formatCurrency(r.millRevenue)}</td>
                <td className="revenue-subvalue">{formatNum(r.millRecovery)}</td>
                <td className="revenue-subvalue">{formatNum(r.millBags)}</td>
              </tr>
              <tr>
                <td className="revenue-label">Quality + Moisture</td>
                <td className="revenue-value">{formatNum(s.totalQualityCutting)}</td>
                <td className="revenue-subvalue">{formatCurrency(r.qualityRate)}</td>
                <td className="revenue-highlight">{formatCurrency(r.qualityDeductionRevenue)}</td>
                <td className="revenue-subvalue">{formatNum(r.qualityRecovery)}</td>
                <td className="revenue-subvalue">{formatNum(r.qualityBags)}</td>
              </tr>
              <tr>
                <td className="revenue-label">TP Accepted (SBP)</td>
                <td className="revenue-value">{formatNum(s.tpAccepted)}</td>
                <td className="revenue-subvalue">{formatCurrency(r.qualityRate)}</td>
                <td className="revenue-highlight">{formatCurrency(r.tpRevenue)}</td>
                <td className="revenue-subvalue">{formatNum(r.tpRecovery)}</td>
                <td className="revenue-subvalue">{formatNum(r.tpBags)}</td>
              </tr>
            </tbody>
          </table>
        </div>

        {/* Quality / Moisture Split */}
        <div className="section-card" id="quality-split-section">
          <div className="section-title">
            <span className="icon">🔬</span>
            Quality vs Moisture
          </div>
          <QualityMoistureChart
            qualityCut={s.qualityCut}
            moistureCut={s.moistureCut}
          />
        </div>
      </div>

      {/* ===== WEIGHT BREAKDOWN & STATS ===== */}
      <div className="section-row wide-narrow animate-in delay-4">
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
              <div className="stat-pill-label">Bag Weight</div>
              <div className="stat-pill-value">{r.bagWeight} kg</div>
            </div>
          </div>
        </div>
      </div>

      {/* ===== CHARTS ===== */}
      <div className="section-row two-col animate-in delay-5">
        <div className="section-card" id="lot-chart-section">
          <div className="section-title">
            <span className="icon">📊</span>
            Token Qty vs Mill Qty (Per Lot)
          </div>
          <MillQtyChart records={records} />
        </div>

        <div className="section-card" id="cutting-chart-section">
          <div className="section-title">
            <span className="icon">✂️</span>
            Quality & Moisture Cutting (Per Lot)
          </div>
          <PerLotBarChart records={records} />
        </div>
      </div>

      {/* ===== RECORDS TABLE ===== */}
      <div className="section-card animate-in delay-6" id="records-section">
        <div className="section-title">
          <span className="icon">📜</span>
          Lot Records ({data.totalRecords} entries)
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
              {records.map((rec) => (
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
            </tbody>
          </table>
        </div>
      </div>

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
