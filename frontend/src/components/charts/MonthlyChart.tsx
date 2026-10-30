import {
  Bar,
  BarChart,
  CartesianGrid,
  Legend,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { useTranslation } from 'react-i18next';
import { useTheme } from '../../context/ThemeContext';
import { TrendPoint } from '../../types';
import { formatMonth } from '../../utils/date';
import { currentIntlLocale } from '../../utils/format';

interface Props {
  data: TrendPoint[];
  currency?: string;
}

export function MonthlyChart({ data, currency = 'RWF' }: Props) {
  const { t } = useTranslation();
  const { resolvedTheme } = useTheme();
  const isDark = resolvedTheme === 'dark';
  const gridStroke = isDark ? '#334155' : '#e2e8f0';
  const tickFill = isDark ? '#94a3b8' : '#94a3b8';

  return (
    <div className="h-[280px] w-full min-w-0 sm:h-[320px] lg:h-[340px]">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={data} margin={{ top: 8, right: 8, left: 0, bottom: 0 }} barGap={4}>
          <CartesianGrid strokeDasharray="3 3" stroke={gridStroke} vertical={false} />
          <XAxis
            dataKey="label"
            tickFormatter={formatMonth}
            tick={{ fontSize: 11, fill: tickFill }}
            axisLine={false}
            tickLine={false}
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
            labelFormatter={(label) => formatMonth(String(label))}
            contentStyle={{
              borderRadius: 12,
              border: `1px solid ${gridStroke}`,
              fontSize: 12,
              background: isDark ? '#1e293b' : '#ffffff',
              color: isDark ? '#f1f5f9' : '#1e293b',
            }}
          />
          <Legend
            formatter={(value) => (value === 'income' ? t('charts.income') : t('charts.expense'))}
            wrapperStyle={{ fontSize: 12 }}
          />
          <Bar dataKey="income" fill="#10b981" radius={[6, 6, 0, 0]} maxBarSize={38} />
          <Bar dataKey="expense" fill="#ef4444" radius={[6, 6, 0, 0]} maxBarSize={38} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
