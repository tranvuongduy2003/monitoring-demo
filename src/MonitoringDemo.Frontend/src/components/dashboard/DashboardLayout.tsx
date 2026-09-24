import React, { useState, useEffect } from 'react';
import { 
  Activity, 
  Server, 
  ShoppingCart, 
  AlertTriangle,
  ExternalLink,
  PlusCircle,
  CheckCircle2,
  Database
} from 'lucide-react';
import { GlassMetricCard } from './GlassMetricCard';
import { LatencyChart, OrdersChart, LatencyData, OrdersData } from './GlassChartCard';
import { RecentOrdersTable } from './RecentOrdersTable';
import { StatusBeacon } from './StatusBeacon';
import { useApiData } from '@/hooks/useApiData';
import { OrderStats } from '@/types';

const generateLatencyData = (): LatencyData[] => {
  const data: LatencyData[] = [];
  const now = new Date();
  for (let i = 12; i >= 0; i--) {
    const time = new Date(now.getTime() - i * 60000);
    const baseP50 = 35 + Math.random() * 15;
    const isSpike = Math.random() > 0.85;
    const p99Multiplier = isSpike ? (3 + Math.random() * 3) : (1.4 + Math.random() * 0.8);
    
    data.push({
      time: `${time.getHours()}:${time.getMinutes().toString().padStart(2, '0')}`,
      p50: Math.round(baseP50),
      p99: Math.round(baseP50 * p99Multiplier)
    });
  }
  return data;
};

const generateOrdersData = (): OrdersData[] => {
  const data: OrdersData[] = [];
  const now = new Date();
  for (let i = 12; i >= 0; i--) {
    const time = new Date(now.getTime() - i * 60000);
    const completed = Math.floor(Math.random() * 35) + 8;
    const failed = Math.random() > 0.8 ? Math.floor(Math.random() * 4) + 1 : 0;
    
    data.push({
      time: `${time.getHours()}:${time.getMinutes().toString().padStart(2, '0')}`,
      completed,
      failed
    });
  }
  return data;
};

const defaultMockOrders = [
  { id: 1042, product: { name: 'Quantum Processor 8-Core' }, status: 'Completed', quantity: 1, total: 2499.00, createdAt: new Date(Date.now() - 1000 * 60 * 2).toISOString() },
  { id: 1041, product: { name: 'Titanium Cloud Storage 2TB' }, status: 'Pending', quantity: 3, total: 450.00, createdAt: new Date(Date.now() - 1000 * 60 * 5).toISOString() },
  { id: 1040, product: { name: 'Developer Pro License' }, status: 'Completed', quantity: 2, total: 398.00, createdAt: new Date(Date.now() - 1000 * 60 * 12).toISOString() },
  { id: 1039, product: { name: 'High-Throughput Gateway' }, status: 'Failed', quantity: 1, total: 850.00, createdAt: new Date(Date.now() - 1000 * 60 * 18).toISOString() },
  { id: 1038, product: { name: '24/7 Enterprise SLA Support' }, status: 'Completed', quantity: 1, total: 1800.00, createdAt: new Date(Date.now() - 1000 * 60 * 30).toISOString() },
];

export const DashboardLayout: React.FC = () => {
  const { data: apiStats, loading: statsLoading, refetch: refetchStats } = useApiData<OrderStats>('/api/orders/stats', 4000);
  const { data: apiOrders, loading: ordersLoading, refetch: refetchOrders } = useApiData<any[]>('/api/orders?limit=10', 4000);

  const [latencyData, setLatencyData] = useState<LatencyData[]>([]);
  const [ordersData, setOrdersData] = useState<OrdersData[]>([]);
  const [triggeringOrder, setTriggeringOrder] = useState(false);
  const [triggerSuccess, setTriggerSuccess] = useState(false);

  useEffect(() => {
    setLatencyData(generateLatencyData());
    setOrdersData(generateOrdersData());
    
    const interval = setInterval(() => {
      setLatencyData(generateLatencyData());
      setOrdersData(generateOrdersData());
    }, 6000);
    
    return () => clearInterval(interval);
  }, []);

  const handleCreateTestOrder = async () => {
    try {
      setTriggeringOrder(true);
      const res = await fetch('/api/orders', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ productId: Math.floor(Math.random() * 15) + 1, quantity: Math.floor(Math.random() * 3) + 1 }),
      });
      if (res.ok) {
        setTriggerSuccess(true);
        setTimeout(() => setTriggerSuccess(false), 2500);
        refetchStats();
        refetchOrders();
      }
    } catch (e) {
      console.error('Failed to trigger order:', e);
    } finally {
      setTriggeringOrder(false);
    }
  };

  const isConnected = !statsLoading && apiStats !== null;
  const currentP99 = latencyData.length > 0 ? latencyData[latencyData.length - 1].p99 : 68;
  const isHighLatency = currentP99 > 200;

  const totalRevenue = apiStats?.totalRevenue ?? 34820;
  const ordersLastHour = apiStats?.ordersLastHour ?? (ordersData.reduce((acc, curr) => acc + curr.completed, 0));
  const failedOrders = apiStats?.failedOrders ?? 4;
  const totalOrders = apiStats?.totalOrders ?? 184;
  const errorRate = ((failedOrders / Math.max(totalOrders, 1)) * 100).toFixed(1);

  return (
    <div className="flex-1 ml-64 min-h-screen pb-16">
      <div className="max-w-7xl mx-auto p-8 space-y-8">
        
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-3">
              <h1 className="text-h1 font-bold text-ink tracking-tight">Observability Dashboard</h1>
              <span className="bg-brand-50 border border-brand-200/60 text-brand-700 text-xs px-2.5 py-0.5 rounded-full font-medium shadow-sm">
                Aspire 9
              </span>
            </div>
            <p className="text-ink-muted text-sm mt-1">
              {new Date().toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
              {' • '}
              <span className="text-ink-subtle">
                {isConnected ? 'Connected to Minimal API & PostgreSQL' : 'Simulator Mode (Connecting to API...)'}
              </span>
            </p>
          </div>

          <div className="flex items-center gap-3 flex-wrap">
            <button
              onClick={handleCreateTestOrder}
              disabled={triggeringOrder}
              className="glass-card interactive-lift px-4 py-2 rounded-xl text-xs font-semibold text-brand-700 bg-white/80 border border-brand-200/80 shadow-glass-soft flex items-center gap-2 hover:bg-brand-50 transition-all cursor-pointer disabled:opacity-50"
            >
              {triggerSuccess ? (
                <>
                  <CheckCircle2 className="w-4 h-4 text-emerald-500 animate-bounce" />
                  <span>Span & Metric Emitted!</span>
                </>
              ) : (
                <>
                  <PlusCircle className="w-4 h-4 text-brand-600" />
                  <span>{triggeringOrder ? 'Recording...' : 'Trigger Order Event'}</span>
                </>
              )}
            </button>

            <div className="glass-card px-3.5 py-2 rounded-xl text-xs font-medium text-ink-muted flex items-center gap-2 border border-white/65 shadow-glass-soft">
              <StatusBeacon status={isConnected ? 'healthy' : 'warning'} size="sm" />
              <span>{isConnected ? 'Live Telemetry' : 'Simulator'}</span>
            </div>

            <div className="glass-card px-3.5 py-2 rounded-xl text-xs font-mono text-ink-muted border border-white/65 shadow-glass-soft">
              Poll: 4s
            </div>
          </div>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <a
            href="http://localhost:3000"
            target="_blank"
            rel="noreferrer"
            className="glass-card interactive-lift p-3 rounded-xl border border-white/60 flex items-center justify-between group hover:border-brand-300"
          >
            <div className="flex items-center gap-2.5">
              <div className="w-7 h-7 rounded-lg bg-amber-50 border border-amber-200/60 flex items-center justify-center text-amber-600 font-bold text-xs">
                G
              </div>
              <div className="text-left">
                <div className="text-xs font-semibold text-ink group-hover:text-brand-600 transition-colors">Grafana UI</div>
                <div className="text-[10px] text-ink-subtle">:3000 (admin/admin)</div>
              </div>
            </div>
            <ExternalLink className="w-3.5 h-3.5 text-ink-subtle group-hover:text-brand-500" />
          </a>

          <a
            href="http://localhost:9090"
            target="_blank"
            rel="noreferrer"
            className="glass-card interactive-lift p-3 rounded-xl border border-white/60 flex items-center justify-between group hover:border-brand-300"
          >
            <div className="flex items-center gap-2.5">
              <div className="w-7 h-7 rounded-lg bg-red-50 border border-red-200/60 flex items-center justify-center text-red-600 font-bold text-xs">
                P
              </div>
              <div className="text-left">
                <div className="text-xs font-semibold text-ink group-hover:text-brand-600 transition-colors">Prometheus</div>
                <div className="text-[10px] text-ink-subtle">:9090 (Target: UP)</div>
              </div>
            </div>
            <ExternalLink className="w-3.5 h-3.5 text-ink-subtle group-hover:text-brand-500" />
          </a>

          <a
            href="http://localhost:5000/metrics"
            target="_blank"
            rel="noreferrer"
            className="glass-card interactive-lift p-3 rounded-xl border border-white/60 flex items-center justify-between group hover:border-brand-300"
          >
            <div className="flex items-center gap-2.5">
              <div className="w-7 h-7 rounded-lg bg-brand-50 border border-brand-200/60 flex items-center justify-center text-brand-600 font-bold text-xs">
                API
              </div>
              <div className="text-left">
                <div className="text-xs font-semibold text-ink group-hover:text-brand-600 transition-colors">/metrics Endpoint</div>
                <div className="text-[10px] text-ink-subtle">:5000/metrics</div>
              </div>
            </div>
            <ExternalLink className="w-3.5 h-3.5 text-ink-subtle group-hover:text-brand-500" />
          </a>

          <div className="glass-card p-3 rounded-xl border border-white/60 flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <div className="w-7 h-7 rounded-lg bg-emerald-50 border border-emerald-200/60 flex items-center justify-center text-emerald-600 font-bold text-xs">
                <Database className="w-4 h-4" />
              </div>
              <div className="text-left">
                <div className="text-xs font-semibold text-ink">PostgreSQL 17</div>
                <div className="text-[10px] text-emerald-600 font-medium">Auto-Seeded</div>
              </div>
            </div>
            <StatusBeacon status="healthy" size="sm" />
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5">
          <GlassMetricCard
            title="Total Revenue"
            value={new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(totalRevenue)}
            icon={Activity}
            change={8.4}
            changeLabel="vs yesterday"
          />
          <GlassMetricCard
            title="Orders (Last Hour)"
            value={ordersLastHour}
            icon={ShoppingCart}
            change={14.2}
            changeLabel="vs avg"
          />
          <GlassMetricCard
            title="P99 Gateway Latency"
            value={`${currentP99}ms`}
            icon={AlertTriangle}
            status={isHighLatency ? 'warning' : 'healthy'}
            change={isHighLatency ? -12 : 3.1}
            changeLabel="vs target"
          />
          <GlassMetricCard
            title="Error Rate"
            value={`${errorRate}%`}
            icon={Server}
            status={parseFloat(errorRate) > 5 ? 'critical' : 'healthy'}
            change={parseFloat(errorRate) > 5 ? -2.4 : 0.8}
            changeLabel="SLA: < 2%"
          />
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
          <LatencyChart data={latencyData} />
          <OrdersChart data={ordersData} />
        </div>

        <div className="w-full">
          <RecentOrdersTable orders={apiOrders && apiOrders.length > 0 ? apiOrders : defaultMockOrders} />
        </div>

      </div>
    </div>
  );
};
