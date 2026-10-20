import {
  Area,
  AreaChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { useTranslation } from 'react-i18next';
import { useTheme } from '../../context/ThemeContext';
import { TrendPoint } from '../../types';
import { formatShortDate } from '../../utils/date';
import { currentIntlLocale } from '../../utils/format';

interface Props {
  data: TrendPoint[];
  currency?: string;
}

export function IncomeExpenseChart({ data, currency = 'RWF' }: Props) {
  const { t } = useTranslation();
  const { resolvedTheme } = useTheme();
  const isDark = resolvedTheme === 'dark';
  const gridStroke = isDark ? '#334155' : '#e2e8f0';
  const tickFill = isDark ? '#94a3b8' : '#94a3b8';

  return (
    <ResponsiveContainer width="100%" height={280}>
      <AreaChart data={data} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
        <defs>
          <linearGradient id="incomeFill" x1="0" y1="0" x2="0" y2="1">
            <stop offset="5%" stopColor="#10b981" stopOpacity={0.35} />
            <stop offset="95%" stopColor="#10b981" stopOpacity={0} />
          </linearGradient>
          <linearGradient id="expenseFill" x1="0" y1="0" x2="0" y2="1">
            <stop offset="5%" stopColor="#ef4444" stopOpacity={0.3} />
            <stop offset="95%" stopColor="#ef4444" stopOpacity={0} />
          </linearGradient>
        </defs>
        <CartesianGrid strokeDasharray="3 3" stroke={gridStroke} vertical={false} />
        <XAxis
          dataKey="label"
          tickFormatter={formatShortDate}
          tick={{ fontSize: 11, fill: tickFill }}
          axisLine={false}
          tickLine={false}
          minTickGap={24}
        />
        <YAxis
          tick={{ fontSize: 11, fill: tickFill }}
          axisLine={false}
          tickLine={false}
          width={62}
          tickFormatter={(v) => Number(v).toLocaleString(currentIntlLocale(), { notation: 'compact' })}
        />
        <Tooltip
          formatter={(value: number, name: string) => [
            `${currency} ${Number(value).toLocaleString(currentIntlLocale())}`,
            name === 'income' ? t('charts.income') : t('charts.expense'),
          ]}
          labelFormatter={(label) => formatShortDate(String(label))}
          contentStyle={{
            borderRadius: 12,
            border: `1px solid ${gridStroke}`,
            fontSize: 12,
            background: isDark ? '#1e293b' : '#ffffff',
            color: isDark ? '#f1f5f9' : '#1e293b',
          }}
        />
        <Area
          type="monotone"
          dataKey="income"
          stroke="#10b981"
          strokeWidth={2}
          fill="url(#incomeFill)"
        />
        <Area
          type="monotone"
          dataKey="expense"
          stroke="#ef4444"
          strokeWidth={2}
          fill="url(#expenseFill)"
        />
      </AreaChart>
    </ResponsiveContainer>
  );
}
