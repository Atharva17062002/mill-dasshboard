'use client';

import {
    PieChart,
    Pie,
    Cell,
    ResponsiveContainer,
    BarChart,
    Bar,
    XAxis,
    YAxis,
    Tooltip,
    CartesianGrid,
} from 'recharts';

const CHART_COLORS = {
    blue: '#3b82f6',
    rose: '#f43f5e',
    emerald: '#10b981',
    gold: '#f5a623',
    purple: '#8b5cf6',
    cyan: '#06b6d4',
    amber: '#f59e0b',
};

interface QualityMoistureChartProps {
    qualityCut: number;
    moistureCut: number;
}

export function QualityMoistureChart({ qualityCut, moistureCut }: QualityMoistureChartProps) {
    const data = [
        { name: 'Quality', value: qualityCut, color: CHART_COLORS.blue },
        { name: 'Moisture', value: moistureCut, color: CHART_COLORS.rose },
    ];

    const total = qualityCut + moistureCut;

    return (
        <div className="quality-split">
            <ResponsiveContainer width="100%" height={220}>
                <PieChart>
                    <Pie
                        data={data}
                        cx="50%"
                        cy="50%"
                        innerRadius={60}
                        outerRadius={90}
                        paddingAngle={4}
                        dataKey="value"
                        stroke="none"
                    >
                        {data.map((entry, index) => (
                            <Cell key={`cell-${index}`} fill={entry.color} />
                        ))}
                    </Pie>
                    <text
                        x="50%"
                        y="47%"
                        textAnchor="middle"
                        dominantBaseline="middle"
                        fill="#f1f5f9"
                        fontSize={22}
                        fontWeight={800}
                    >
                        {total.toFixed(2)}
                    </text>
                    <text
                        x="50%"
                        y="58%"
                        textAnchor="middle"
                        dominantBaseline="middle"
                        fill="#94a3b8"
                        fontSize={11}
                    >
                        Quintals
                    </text>
                </PieChart>
            </ResponsiveContainer>
            <div className="quality-legend">
                <div className="legend-item">
                    <div className="legend-dot quality" />
                    <div>
                        <div className="legend-text">Quality</div>
                        <div className="legend-value">{qualityCut.toFixed(2)} q</div>
                    </div>
                </div>
                <div className="legend-item">
                    <div className="legend-dot moisture" />
                    <div>
                        <div className="legend-text">Moisture</div>
                        <div className="legend-value">{moistureCut.toFixed(2)} q</div>
                    </div>
                </div>
            </div>
        </div>
    );
}

interface PerLotChartProps {
    records: {
        slNo: number;
        farmerName: string;
        qualityCut: number;
        moistureCut: number;
        millQty: number;
    }[];
}

export function PerLotBarChart({ records }: PerLotChartProps) {
    const chartData = records.map((r) => ({
        name: `#${r.slNo}`,
        farmer: r.farmerName,
        quality: r.qualityCut / 100,
        moisture: r.moistureCut / 100,
        millQty: r.millQty,
    }));

    const CustomTooltip = ({ active, payload, label }: { active?: boolean; payload?: { name: string; value: number; color: string }[]; label?: string }) => {
        if (!active || !payload) return null;
        const record = records.find(r => `#${r.slNo}` === label);
        return (
            <div style={{
                background: '#1a2234',
                border: '1px solid rgba(255,255,255,0.1)',
                borderRadius: '8px',
                padding: '10px 14px',
                fontSize: '0.8rem',
            }}>
                <div style={{ color: '#f1f5f9', fontWeight: 600, marginBottom: 4 }}>
                    {record?.farmerName || label}
                </div>
                {payload.map((p, i) => (
                    <div key={i} style={{ color: p.color, marginTop: 2 }}>
                        {p.name}: {p.value.toFixed(2)} q
                    </div>
                ))}
            </div>
        );
    };

    return (
        <ResponsiveContainer width="100%" height={280}>
            <BarChart data={chartData} barGap={2}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
                <XAxis
                    dataKey="name"
                    tick={{ fill: '#64748b', fontSize: 11 }}
                    axisLine={{ stroke: 'rgba(255,255,255,0.06)' }}
                    tickLine={false}
                />
                <YAxis
                    tick={{ fill: '#64748b', fontSize: 11 }}
                    axisLine={false}
                    tickLine={false}
                    tickFormatter={(v: number) => `${v}q`}
                />
                <Tooltip content={<CustomTooltip />} />
                <Bar dataKey="quality" name="Quality Cut" fill={CHART_COLORS.blue} radius={[3, 3, 0, 0]} />
                <Bar dataKey="moisture" name="Moisture Cut" fill={CHART_COLORS.rose} radius={[3, 3, 0, 0]} />
            </BarChart>
        </ResponsiveContainer>
    );
}

interface MillQtyChartProps {
    records: {
        slNo: number;
        farmerName: string;
        millQty: number;
        tokenQty: number;
    }[];
}

export function MillQtyChart({ records }: MillQtyChartProps) {
    const chartData = records.map((r) => ({
        name: `#${r.slNo}`,
        farmer: r.farmerName,
        millQty: r.millQty,
        tokenQty: r.tokenQty,
    }));

    const CustomTooltip = ({ active, payload, label }: { active?: boolean; payload?: { name: string; value: number; color: string }[]; label?: string }) => {
        if (!active || !payload) return null;
        const record = records.find(r => `#${r.slNo}` === label);
        return (
            <div style={{
                background: '#1a2234',
                border: '1px solid rgba(255,255,255,0.1)',
                borderRadius: '8px',
                padding: '10px 14px',
                fontSize: '0.8rem',
            }}>
                <div style={{ color: '#f1f5f9', fontWeight: 600, marginBottom: 4 }}>
                    {record?.farmerName || label}
                </div>
                {payload.map((p, i) => (
                    <div key={i} style={{ color: p.color, marginTop: 2 }}>
                        {p.name}: {p.value.toFixed(2)} q
                    </div>
                ))}
            </div>
        );
    };

    return (
        <ResponsiveContainer width="100%" height={280}>
            <BarChart data={chartData} barGap={2}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
                <XAxis
                    dataKey="name"
                    tick={{ fill: '#64748b', fontSize: 11 }}
                    axisLine={{ stroke: 'rgba(255,255,255,0.06)' }}
                    tickLine={false}
                />
                <YAxis
                    tick={{ fill: '#64748b', fontSize: 11 }}
                    axisLine={false}
                    tickLine={false}
                    tickFormatter={(v: number) => `${v}q`}
                />
                <Tooltip content={<CustomTooltip />} />
                <Bar dataKey="tokenQty" name="Token Qty" fill={CHART_COLORS.amber} radius={[3, 3, 0, 0]} />
                <Bar dataKey="millQty" name="Mill Qty" fill={CHART_COLORS.emerald} radius={[3, 3, 0, 0]} />
            </BarChart>
        </ResponsiveContainer>
    );
}
