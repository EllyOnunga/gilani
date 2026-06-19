import React from "react";
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  RadarChart,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
  Radar,
} from "recharts";

interface RevisionProgressChartProps {
  data: { date: string; score: number }[];
}

export const RevisionProgressChart = React.memo(function RevisionProgressChart({
  data,
}: RevisionProgressChartProps) {
  return (
    <ResponsiveContainer width="100%" height="100%">
      <AreaChart data={data} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
        <defs>
          <linearGradient id="scoreColor" x1="0" y1="0" x2="0" y2="1">
            <stop offset="5%" stopColor="hsl(22, 75%, 48%)" stopOpacity={0.2} />
            <stop offset="95%" stopColor="hsl(22, 75%, 48%)" stopOpacity={0} />
          </linearGradient>
        </defs>
        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="rgba(0,0,0,0.06)" />
        <XAxis dataKey="date" fontStyle="italic" style={{ fontSize: 10 }} />
        <YAxis domain={[0, 100]} style={{ fontSize: 10 }} />
        <Tooltip />
        <Area
          type="monotone"
          dataKey="score"
          stroke="hsl(22, 75%, 48%)"
          strokeWidth={2.5}
          fillOpacity={1}
          fill="url(#scoreColor)"
        />
      </AreaChart>
    </ResponsiveContainer>
  );
});

interface SubjectMasteryChartProps {
  data: { subject: string; score: number }[];
}

export const SubjectMasteryChart = React.memo(function SubjectMasteryChart({
  data,
}: SubjectMasteryChartProps) {
  return (
    <ResponsiveContainer width="100%" height="100%">
      <RadarChart cx="50%" cy="50%" outerRadius="65%" data={data}>
        <PolarGrid stroke="rgba(0,0,0,0.08)" />
        <PolarAngleAxis dataKey="subject" style={{ fontSize: 10 }} />
        <PolarRadiusAxis angle={30} domain={[0, 100]} style={{ fontSize: 8 }} />
        <Radar
          name="Mastery"
          dataKey="score"
          stroke="hsl(22, 75%, 48%)"
          fill="hsl(22, 75%, 48%)"
          fillOpacity={0.25}
        />
      </RadarChart>
    </ResponsiveContainer>
  );
});
