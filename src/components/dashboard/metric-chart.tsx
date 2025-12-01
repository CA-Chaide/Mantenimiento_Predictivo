"use client";

import { format } from "date-fns";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from "recharts";
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  ChartLegend,
  ChartLegendContent,
} from "@/components/ui/chart";
import { MetricDataPoint } from "@/lib/data";

interface LineConfig {
  name: string;
  key: string;
}

interface MetricChartProps {
  data: MetricDataPoint[];
  metricKey: "current" | "unbalance" | "load_factor";
  yAxisLabel: string;
  lineConfig: {
    real: LineConfig;
    ref: LineConfig;
    limit: LineConfig;
  };
}

export function MetricChart({ data, metricKey, yAxisLabel, lineConfig }: MetricChartProps) {
  const chartData = data.map(d => ({
    ...d.metrics[metricKey],
    timestamp: d.timestamp,
  }));

  const chartConfig = {
    [lineConfig.real.key]: {
      label: lineConfig.real.name,
      color: "hsl(var(--primary))",
    },
    [lineConfig.ref.key]: {
      label: lineConfig.ref.name,
      color: "hsl(var(--muted-foreground))",
    },
    [lineConfig.limit.key]: {
      label: lineConfig.limit.name,
      color: "hsl(var(--destructive))",
    },
  };

  return (
    <ChartContainer config={chartConfig} className="h-[300px] w-full">
      <ResponsiveContainer>
        <LineChart data={chartData} margin={{ top: 5, right: 20, left: -10, bottom: 5 }}>
          <CartesianGrid strokeDasharray="3 3" vertical={false} />
          <XAxis
            dataKey="timestamp"
            tickLine={false}
            axisLine={false}
            tickMargin={8}
            tickFormatter={(value) => format(new Date(value), "MMM d")}
          />
          <YAxis
            tickLine={false}
            axisLine={false}
            tickMargin={8}
            label={{ value: yAxisLabel, angle: -90, position: 'insideLeft', offset: 10 }}
          />
          <Tooltip
            cursor={false}
            content={<ChartTooltipContent indicator="dot" />}
          />
          <Legend content={<ChartLegendContent />} />
          <Line
            dataKey={lineConfig.real.key}
            type="monotone"
            stroke="var(--color-val_smooth)"
            strokeWidth={2}
            dot={false}
          />
          <Line
            dataKey={lineConfig.ref.key}
            type="monotone"
            stroke="var(--color-ref_smooth)"
            strokeWidth={2}
            strokeDasharray="3 4"
            dot={false}
          />
          <Line
            dataKey={lineConfig.limit.key}
            type="monotone"
            stroke="var(--color-max)" // Assuming max/threshold keys are consistent
            strokeWidth={2}
            strokeDasharray="5 5"
            dot={false}
          />
        </LineChart>
      </ResponsiveContainer>
    </ChartContainer>
  );
}
