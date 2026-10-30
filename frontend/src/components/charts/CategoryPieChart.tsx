import { Cell, Legend, Pie, PieChart, ResponsiveContainer, Tooltip } from 'recharts';
import { useTheme } from '../../context/ThemeContext';
import { CategoryBreakdown } from '../../types';
import { currentIntlLocale } from '../../utils/format';

interface Props {
  data: CategoryBreakdown[];
  currency?: string;
}

const FALLBACK_COLORS = ['#10b981', '#0ea5e9', '#f97316', '#8b5cf6', '#ef4444', '#eab308', '#94a3b8'];

export function CategoryPieChart({ data, currency = 'RWF' }: Props) {
  const { resolvedTheme } = useTheme();
  const isDark = resolvedTheme === 'dark';
  const borderStroke = isDark ? '#334155' : '#e2e8f0';

  return (
    <div className="h-[280px] w-full min-w-0 sm:h-[320px]">
      <ResponsiveContainer width="100%" height="100%">
        <PieChart>
          <Pie
            data={data}
            dataKey="total"
            nameKey="category_name"
            innerRadius="45%"
            outerRadius="75%"
            paddingAngle={2}
          >
            {data.map((entry, index) => (
              <Cell
                key={entry.category_id ?? index}
                fill={entry.color || FALLBACK_COLORS[index % FALLBACK_COLORS.length]}
              />
            ))}
          </Pie>
          <Tooltip
            formatter={(value: number, _name, item) => [
              `${currency} ${Number(value).toLocaleString(currentIntlLocale())}`,
              (item?.payload as CategoryBreakdown)?.category_name ?? '',
            ]}
            contentStyle={{
              borderRadius: 12,
              border: `1px solid ${borderStroke}`,
              fontSize: 12,
              background: isDark ? '#1e293b' : '#ffffff',
              color: isDark ? '#f1f5f9' : '#1e293b',
            }}
          />
          <Legend
            wrapperStyle={{ fontSize: 12 }}
            formatter={(value) => <span className="text-muted-foreground">{value}</span>}
          />
        </PieChart>
      </ResponsiveContainer>
    </div>
  );
}
