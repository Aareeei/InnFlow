'use client';

import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';

type DataPoint = { status: string; count: number };

const COLORS = ['#06b6d4', '#6366f1', '#10b981', '#f59e0b', '#ef4444', '#64748b'];

export function StatusDistributionChart({ data }: { data: DataPoint[] }) {
  const chartData = data.map((d) => ({
    ...d,
    label: d.status.replace(/_/g, ' '),
  }));

  return (
    <ResponsiveContainer width="100%" height={240}>
      <BarChart data={chartData} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="#243044" vertical={false} />
        <XAxis
          dataKey="label"
          tick={{ fill: '#64748b', fontSize: 10 }}
          stroke="#243044"
          interval={0}
          angle={-25}
          textAnchor="end"
          height={60}
        />
        <YAxis tick={{ fill: '#64748b', fontSize: 11 }} stroke="#243044" allowDecimals={false} />
        <Tooltip
          contentStyle={{
            backgroundColor: '#1a2332',
            border: '1px solid #243044',
            borderRadius: 8,
            fontSize: 12,
          }}
        />
        <Bar dataKey="count" radius={[4, 4, 0, 0]}>
          {chartData.map((_, index) => (
            <Cell key={index} fill={COLORS[index % COLORS.length]} />
          ))}
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  );
}
