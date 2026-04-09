import React from "react";
import {
  AreaChart,
  Area,
  ResponsiveContainer,
  YAxis,
  XAxis,
  CartesianGrid,
  Tooltip,
} from "recharts";

export type BandwidthPoint = {
  time: string;
  rx: number;
  tx: number;
};

export const formatBandwidth = (mbps: number) => {
  if (typeof mbps !== "number" || isNaN(mbps) || mbps < 0.000001) return "0 bps";
  if (mbps < 0.001) return `${(mbps * 1000000).toFixed(0)} bps`;
  if (mbps < 1) return `${(mbps * 1000).toFixed(2)} Kbps`;
  if (mbps < 1000) return `${mbps.toFixed(2)} Mbps`;
  return `${(mbps / 1000).toFixed(2)} Gbps`;
};

const tooltipFormatter = (value: any, name: string) => {
  if (typeof value !== "number") return [value, name];
  const formatted = formatBandwidth(value);
  return [formatted, name.toLowerCase() === "rx" ? "RX" : "TX"];
};

type BandwidthSparklineProps = {
  data: BandwidthPoint[];
};

const BandwidthSparkline: React.FC<BandwidthSparklineProps> = ({ data }) => {
  if (!data || data.length === 0) {
    return (
      <div className="flex h-24 items-center justify-center text-[11px] text-slate-400">
        Belum ada data bandwidth.
      </div>
    );
  }

  return (
    <div className="h-32 w-full">
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={data} margin={{ top: 4, right: 8, left: 0, bottom: 0 }}>
          <defs>
            <linearGradient id="rxGradient" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#22c55e" stopOpacity={0.35} />
              <stop offset="100%" stopColor="#22c55e" stopOpacity={0} />
            </linearGradient>
            <linearGradient id="txGradient" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#0ea5e9" stopOpacity={0.35} />
              <stop offset="100%" stopColor="#0ea5e9" stopOpacity={0} />
            </linearGradient>
          </defs>

          <CartesianGrid stroke="#e5e7eb" strokeWidth={0.5} vertical={false} />
          <XAxis dataKey="time" hide />
          <YAxis hide />
          <Tooltip
            cursor={{ stroke: "#cbd5f5", strokeWidth: 1 }}
            contentStyle={{
              fontSize: 11,
              borderRadius: 12,
              borderColor: "#e5e7eb",
            }}
            labelStyle={{ fontSize: 11, color: "#6b7280" }}
            formatter={tooltipFormatter as any}
          />

          <Area
            type="monotone"
            dataKey="rx"
            stroke="#22c55e"
            strokeWidth={1}
            fill="url(#rxGradient)"
            isAnimationActive={false}
          />
          <Area
            type="monotone"
            dataKey="tx"
            stroke="#0ea5e9"
            strokeWidth={1}
            fill="url(#txGradient)"
            isAnimationActive={false}
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
};

export default BandwidthSparkline;
