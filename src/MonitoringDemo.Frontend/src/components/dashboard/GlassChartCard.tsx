import React from 'react';
import { 
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, 
  BarChart, Bar, Legend, Cell
} from 'recharts';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';

export interface LatencyData {
  time: string;
  p99: number;
  p50: number;
}

export interface OrdersData {
  time: string;
  completed: number;
  failed: number;
}

const GlassTooltip = ({ active, payload, label }: any) => {
  if (active && payload && payload.length) {
    return (
      <div className="glass-popover bg-white/82 backdrop-blur-[22px] border border-white/80 p-3 rounded-xl shadow-lg">
        <p className="text-sm font-semibold text-ink mb-2">{label}</p>
        {payload.map((entry: any, index: number) => (
          <div key={`item-${index}`} className="flex items-center gap-2 text-sm text-ink-muted">
            <span 
              className="w-2.5 h-2.5 rounded-full" 
              style={{ backgroundColor: entry.color || entry.fill }}
            />
            <span className="capitalize">{entry.name}:</span>
            <span className="font-medium text-ink">{entry.value}</span>
          </div>
        ))}
      </div>
    );
  }
  return null;
};

export const LatencyChart: React.FC<{ data: LatencyData[] }> = ({ data }) => {
  return (
    <Card variant="glass" className="h-[380px]">
      <CardHeader>
        <CardTitle className="text-lg font-semibold text-ink">API Latency</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="h-[280px] w-full">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={data} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
              <defs>
                <linearGradient id="colorP99" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#ef4444" stopOpacity={0.25}/>
                  <stop offset="95%" stopColor="#ef4444" stopOpacity={0}/>
                </linearGradient>
                <linearGradient id="colorP50" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.25}/>
                  <stop offset="95%" stopColor="#3b82f6" stopOpacity={0}/>
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" vertical={false} />
              <XAxis 
                dataKey="time" 
                stroke="#94a3b8" 
                fontSize={12} 
                tickLine={false} 
                axisLine={false}
              />
              <YAxis 
                stroke="#94a3b8" 
                fontSize={12} 
                tickLine={false} 
                axisLine={false}
                tickFormatter={(val) => `${val}ms`}
              />
              <Tooltip content={<GlassTooltip />} />
              <Legend 
                verticalAlign="top" 
                height={36}
                iconType="circle"
                wrapperStyle={{ fontSize: '12px', color: '#475569' }}
              />
              <Area 
                type="monotone" 
                dataKey="p99" 
                name="p99 Latency"
                stroke="#ef4444" 
                fillOpacity={1} 
                fill="url(#colorP99)" 
                strokeWidth={2}
              />
              <Area 
                type="monotone" 
                dataKey="p50" 
                name="p50 Latency"
                stroke="#3b82f6" 
                fillOpacity={1} 
                fill="url(#colorP50)" 
                strokeWidth={2}
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </CardContent>
    </Card>
  );
};

export const OrdersChart: React.FC<{ data: OrdersData[] }> = ({ data }) => {
  return (
    <Card variant="glass" className="h-[380px]">
      <CardHeader>
        <CardTitle className="text-lg font-semibold text-ink">Order Volume</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="h-[280px] w-full">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={data} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" vertical={false} />
              <XAxis 
                dataKey="time" 
                stroke="#94a3b8" 
                fontSize={12} 
                tickLine={false} 
                axisLine={false}
              />
              <YAxis 
                stroke="#94a3b8" 
                fontSize={12} 
                tickLine={false} 
                axisLine={false}
              />
              <Tooltip content={<GlassTooltip />} cursor={{ fill: '#f1f5f9', opacity: 0.5 }} />
              <Legend 
                verticalAlign="top" 
                height={36}
                iconType="circle"
                wrapperStyle={{ fontSize: '12px', color: '#475569' }}
              />
              <Bar dataKey="completed" name="Completed" fill="#3b82f6" radius={[4, 4, 0, 0]} stackId="a" />
              <Bar dataKey="failed" name="Failed" fill="#ef4444" radius={[4, 4, 0, 0]} stackId="a" />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </CardContent>
    </Card>
  );
};
