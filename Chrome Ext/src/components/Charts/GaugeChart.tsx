import React from "react";
import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer } from "recharts";

interface GaugeChartProps {
  value: number; // 0–100
  label?: string;
  color?: string;
}

const getColor = (value: number) => {
  if (value >= 75) return "#52c41a";
  if (value >= 50) return "#faad14";
  return "#ff4d4f";
};

const GaugeChart: React.FC<GaugeChartProps> = ({
  value,
  label = "Health Score",
  color,
}) => {
  const clampedValue = Math.max(0, Math.min(100, value));
  const fill = color ?? getColor(clampedValue);

  const data = [
    { name: "score", value: clampedValue },
    { name: "empty", value: 100 - clampedValue },
  ];

  return (
    <div style={{ position: "relative", width: "100%", height: 180 }}>
      <ResponsiveContainer width="100%" height="100%">
        <PieChart>
          <Pie
            data={data}
            cx="50%"
            cy="90%"
            startAngle={180}
            endAngle={0}
            innerRadius="55%"
            outerRadius="80%"
            dataKey="value"
            strokeWidth={0}
          >
            <Cell key="score" fill={fill} />
            <Cell key="empty" fill="rgba(128,128,128,0.15)" />
          </Pie>
          <Tooltip
            formatter={(val: number, name: string) =>
              name === "score" ? [`${val}%`, label] : null
            }
          />
        </PieChart>
      </ResponsiveContainer>
      <div
        style={{
          position: "absolute",
          bottom: 16,
          left: "50%",
          transform: "translateX(-50%)",
          textAlign: "center",
          pointerEvents: "none",
        }}
      >
        <div
          style={{ fontSize: 32, fontWeight: 700, color: fill, lineHeight: 1 }}
        >
          {clampedValue}
        </div>
        <div
          style={{
            fontSize: 12,
            color: "var(--qa-text-secondary)",
            marginTop: 4,
          }}
        >
          {label}
        </div>
      </div>
    </div>
  );
};

export default GaugeChart;
