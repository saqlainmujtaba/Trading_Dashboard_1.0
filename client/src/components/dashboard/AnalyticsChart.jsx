import { useId } from 'react';
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Legend,
  Line,
  LineChart,
  Pie,
  PieChart,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';

const palette = ['#0f766e', '#2563eb', '#e6a23c', '#dc5a4f', '#7c3aed', '#64748b'];

const formatDate = (value) => new Date(`${value}T00:00:00`).toLocaleDateString('en-US', {
  month: 'short',
  day: 'numeric',
});

const AnalyticsChart = ({
  type,
  data,
  categoryKey,
  series,
  theme,
  horizontal = false,
  dateAxis = false,
  valueType = 'currency',
}) => {
  const gradientId = useId().replaceAll(':', '');
  const axisColor = theme === 'dark' ? '#9aa9bf' : '#64748b';
  const gridColor = theme === 'dark' ? 'rgba(148, 163, 184, 0.18)' : 'rgba(148, 163, 184, 0.25)';
  const formatValue = (value) => valueType === 'currency'
    ? `$${Number(value).toLocaleString()}`
    : Number(value).toLocaleString();
  const tooltipStyle = {
    background: 'var(--panel)',
    borderColor: 'var(--border)',
    borderRadius: 8,
    color: 'var(--text)',
  };
  const formatCategory = dateAxis ? formatDate : undefined;

  if (type === 'pie') {
    const pieSeries = series[0];
    return (
      <ResponsiveContainer width="100%" height="100%">
        <PieChart>
          <Tooltip formatter={(value, name) => [formatValue(value), name]} contentStyle={tooltipStyle} />
          <Legend />
          <Pie data={data} dataKey={pieSeries.dataKey} nameKey={categoryKey} innerRadius="48%" outerRadius="76%" paddingAngle={2}>
            {data.map((item, index) => <Cell key={String(item[categoryKey])} fill={item.color || palette[index % palette.length]} />)}
          </Pie>
        </PieChart>
      </ResponsiveContainer>
    );
  }

  const isHorizontalBar = type === 'bar' && horizontal;
  const Chart = type === 'bar' ? BarChart : type === 'line' ? LineChart : AreaChart;

  return (
    <ResponsiveContainer width="100%" height="100%">
      <Chart data={data} layout={isHorizontalBar ? 'vertical' : 'horizontal'} margin={{ top: 8, right: 16, bottom: 0, left: 4 }}>
        <CartesianGrid stroke={gridColor} strokeDasharray="3 4" horizontal={!isHorizontalBar} vertical={isHorizontalBar} />
        <XAxis
          dataKey={isHorizontalBar ? undefined : categoryKey}
          type={isHorizontalBar ? 'number' : 'category'}
          tickFormatter={isHorizontalBar ? formatValue : formatCategory}
          tick={{ fill: axisColor, fontSize: 11 }}
          axisLine={{ stroke: gridColor }}
          tickLine={false}
          {...(isHorizontalBar ? { tickFormatter: formatValue } : {})}
        />
        <YAxis
          dataKey={isHorizontalBar ? categoryKey : undefined}
          type={isHorizontalBar ? 'category' : 'number'}
          tickFormatter={isHorizontalBar ? undefined : formatValue}
          tick={{ fill: axisColor, fontSize: 11 }}
          axisLine={false}
          tickLine={false}
          width={isHorizontalBar ? 118 : 72}
        />
        <Tooltip
          labelFormatter={(value) => (dateAxis ? formatDate(value) : value)}
          formatter={(value, name) => [formatValue(value), name]}
          contentStyle={tooltipStyle}
        />
        {series.length > 1 && <Legend />}
        {!isHorizontalBar && valueType === 'currency' && <ReferenceLine y={0} stroke={gridColor} />}
        {isHorizontalBar && valueType === 'currency' && <ReferenceLine x={0} stroke={gridColor} />}
        {series.map((item, index) => {
          const color = item.color || palette[index % palette.length];
          const commonProps = {
            key: item.dataKey,
            dataKey: item.dataKey,
            name: item.name,
            stroke: color,
            fill: color,
            stackId: item.stackId,
          };

          if (type === 'bar') return <Bar {...commonProps} radius={isHorizontalBar ? [0, 4, 4, 0] : [4, 4, 0, 0]} />;
          if (type === 'line') return <Line {...commonProps} type="monotone" strokeWidth={2.5} dot={{ r: 3 }} activeDot={{ r: 5 }} />;
          return <Area {...commonProps} type="monotone" strokeWidth={2} fill={`url(#${gradientId}-${index})`} fillOpacity={0.22} />;
        })}
        {type === 'area' && (
          <defs>
            {series.map((item, index) => (
              <linearGradient key={item.dataKey} id={`${gradientId}-${index}`} x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor={item.color || palette[index % palette.length]} stopOpacity={0.35} />
                <stop offset="100%" stopColor={item.color || palette[index % palette.length]} stopOpacity={0.02} />
              </linearGradient>
            ))}
          </defs>
        )}
      </Chart>
    </ResponsiveContainer>
  );
};

export const ChartTypeSelect = ({ value, onChange, options, label }) => (
  <label className="chart-type-select">
    <span>Chart type</span>
    <select aria-label={`Chart type for ${label}`} value={value} onChange={(event) => onChange(event.target.value)}>
      {options.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
    </select>
  </label>
);

export default AnalyticsChart;