'use client';

import { useCallback, useEffect, useState } from 'react';
import dynamic from 'next/dynamic';
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Line,
  LineChart,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { ErrorState, LoadingState, MetricCard } from '@/components/civic/shared';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import type { AdminAnalytics, GrievanceMapMarker } from '@/server/data/analytics';
import { CATEGORY_NAMES } from '@/lib/constants';
import { GRIEVANCE_CATEGORIES, GRIEVANCE_STATUSES, PRIORITY_LEVELS } from '@/server/validation/grievance';

const GeographicMap = dynamic(() => import('./geographic-map'), {
  ssr: false,
  loading: () => <div className="flex h-[460px] items-center justify-center rounded-lg bg-muted text-sm text-muted-foreground">Loading map…</div>,
});

const CHART_COLORS = ['#2563eb', '#059669', '#d97706', '#dc2626', '#7c3aed', '#0891b2', '#ea580c', '#db2777'];

export default function AnalyticsPage() {
  const [data, setData] = useState<AdminAnalytics | null>(null);
  const [markers, setMarkers] = useState<GrievanceMapMarker[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [mapError, setMapError] = useState('');
  const [category, setCategory] = useState('ALL');
  const [priority, setPriority] = useState('ALL');
  const [status, setStatus] = useState('ALL');
  const [retry, setRetry] = useState(0);

  const loadAnalytics = useCallback(async () => {
    setError('');
    try {
      const response = await fetch('/api/analytics/overview', { cache: 'no-store' });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || 'Analytics could not be loaded.');
      setData(result);
    } catch (loadError) {
      console.error('System analytics could not be loaded:', loadError);
      setError(loadError instanceof Error ? loadError.message : 'Analytics could not be loaded.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadAnalytics();
  }, [loadAnalytics, retry]);

  useEffect(() => {
    const controller = new AbortController();
    async function loadMarkers() {
      setMapError('');
      const params = new URLSearchParams();
      if (category !== 'ALL') params.set('category', category);
      if (priority !== 'ALL') params.set('priority', priority);
      if (status !== 'ALL') params.set('status', status);
      try {
        const response = await fetch(`/api/analytics/geography?${params}`, {
          cache: 'no-store',
          signal: controller.signal,
        });
        const result = await response.json();
        if (!response.ok) throw new Error(result.error || 'Geographic complaints could not be loaded.');
        setMarkers(result.markers || []);
      } catch (mapLoadError) {
        if (controller.signal.aborted) return;
        console.error('Geographic complaints could not be loaded:', mapLoadError);
        setMapError(mapLoadError instanceof Error ? mapLoadError.message : 'Geographic complaints could not be loaded.');
      }
    }
    void loadMarkers();
    return () => controller.abort();
  }, [category, priority, status]);

  if (loading) return <LoadingState message="Loading system analytics..." />;
  if (error && !data) {
    return <ErrorState title="Analytics unavailable" message={error} onRetry={() => setRetry((value) => value + 1)} />;
  }
  if (!data) return <ErrorState title="Analytics unavailable" message="No analytics data was returned." onRetry={() => setRetry((value) => value + 1)} />;

  const resolutionRate = data.totalGrievances
    ? Number(((data.resolved / data.totalGrievances) * 100).toFixed(1))
    : 0;
  const slaDenominator = data.slaPerformance.compliant + data.slaPerformance.breached;
  const slaCompliance = slaDenominator
    ? Number(((data.slaPerformance.compliant / slaDenominator) * 100).toFixed(1))
    : 0;
  const escalationRate = data.totalGrievances
    ? Number(((data.escalated / data.totalGrievances) * 100).toFixed(1))
    : 0;

  const categoryData = Object.entries(data.categoryDistribution).map(([name, count]) => ({ name, count }));
  const departmentData = data.departments.map((department) => ({
    name: department.departmentName,
    workload: department.total - department.resolved,
  }));
  const statusData = Object.entries(data.statusDistribution).map(([name, count]) => ({
    name: name.replace(/_/g, ' '),
    count,
  }));
  const priorityData = Object.entries(data.priorityDistribution).map(([name, value]) => ({ name, value }));
  const slaData = [
    { name: 'Compliant', value: data.slaPerformance.compliant },
    { name: 'Breached', value: data.slaPerformance.breached },
    { name: 'Open overdue', value: data.slaPerformance.activeOverdue },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">System Analytics</h1>
        <p className="text-sm text-muted-foreground">Persisted complaint trends, service performance, and privacy-safe geographic patterns.</p>
      </div>
      {error && <p role="alert" className="rounded-md border border-destructive/30 bg-destructive/5 p-3 text-sm text-destructive">{error}</p>}

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <MetricCard title="Resolution rate" value={`${resolutionRate}%`} subtitle={`${data.resolved} resolved complaints`} />
        <MetricCard title="Average resolution time" value={`${data.avgResolutionHours} h`} />
        <MetricCard title="SLA compliance" value={`${slaCompliance}%`} subtitle={`${data.slaPerformance.compliant} on time · ${data.slaPerformance.breached} breached`} />
        <MetricCard title="Escalation rate" value={`${escalationRate}%`} subtitle={`${data.escalated} currently escalated`} />
      </div>

      <div className="grid gap-4 xl:grid-cols-2">
        <Card>
          <CardHeader><CardTitle>Complaints over time</CardTitle><CardDescription>Daily submissions during the last 30 days</CardDescription></CardHeader>
          <CardContent><div className="h-[300px]">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={data.dailyVolume}><CartesianGrid strokeDasharray="3 3" vertical={false} /><XAxis dataKey="date" /><YAxis allowDecimals={false} /><Tooltip /><Line dataKey="count" name="Complaints" type="monotone" stroke="#2563eb" strokeWidth={2} /></LineChart>
            </ResponsiveContainer>
          </div></CardContent>
        </Card>
        <Card>
          <CardHeader><CardTitle>Resolution trend</CardTitle><CardDescription>Complaints resolved per day during the last 30 days</CardDescription></CardHeader>
          <CardContent><div className="h-[300px]">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={data.resolutionTrend}><CartesianGrid strokeDasharray="3 3" vertical={false} /><XAxis dataKey="date" /><YAxis allowDecimals={false} /><Tooltip /><Line dataKey="count" name="Resolved" type="monotone" stroke="#059669" strokeWidth={2} /></LineChart>
            </ResponsiveContainer>
          </div></CardContent>
        </Card>
        <Card>
          <CardHeader><CardTitle>Complaints by category</CardTitle><CardDescription>Categories with the highest submitted volume</CardDescription></CardHeader>
          <CardContent><div className="h-[340px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={categoryData} layout="vertical" margin={{ left: 12, right: 12 }}><CartesianGrid strokeDasharray="3 3" horizontal={false} /><XAxis type="number" allowDecimals={false} /><YAxis dataKey="name" type="category" width={145} /><Tooltip /><Bar dataKey="count" fill="#7c3aed" radius={[0, 4, 4, 0]} /></BarChart>
            </ResponsiveContainer>
          </div></CardContent>
        </Card>
        <Card>
          <CardHeader><CardTitle>Department workload</CardTitle><CardDescription>Open complaints by department</CardDescription></CardHeader>
          <CardContent><div className="h-[340px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={departmentData} layout="vertical" margin={{ left: 12, right: 12 }}><CartesianGrid strokeDasharray="3 3" horizontal={false} /><XAxis type="number" allowDecimals={false} /><YAxis dataKey="name" type="category" width={145} /><Tooltip /><Bar dataKey="workload" fill="#0f766e" radius={[0, 4, 4, 0]} /></BarChart>
            </ResponsiveContainer>
          </div></CardContent>
        </Card>
        <Card>
          <CardHeader><CardTitle>Complaints by priority</CardTitle><CardDescription>Persisted priority levels</CardDescription></CardHeader>
          <CardContent><div className="h-[300px]">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart><Pie data={priorityData} dataKey="value" nameKey="name" outerRadius={100} label>{priorityData.map((entry, index) => <Cell key={entry.name} fill={CHART_COLORS[index % CHART_COLORS.length]} />)}</Pie><Tooltip /></PieChart>
            </ResponsiveContainer>
          </div></CardContent>
        </Card>
        <Card>
          <CardHeader><CardTitle>Complaints by status</CardTitle><CardDescription>Current grievance workflow states</CardDescription></CardHeader>
          <CardContent><div className="h-[300px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={statusData}><CartesianGrid strokeDasharray="3 3" vertical={false} /><XAxis dataKey="name" angle={-25} textAnchor="end" height={70} interval={0} /><YAxis allowDecimals={false} /><Tooltip /><Bar dataKey="count" fill="#d97706" /></BarChart>
            </ResponsiveContainer>
          </div></CardContent>
        </Card>
        <Card>
          <CardHeader><CardTitle>SLA performance</CardTitle><CardDescription>Resolved within deadline, breached, and currently overdue</CardDescription></CardHeader>
          <CardContent><div className="h-[300px]">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart><Pie data={slaData} dataKey="value" nameKey="name" outerRadius={100} label>{slaData.map((entry, index) => <Cell key={entry.name} fill={CHART_COLORS[index]} />)}</Pie><Tooltip /></PieChart>
            </ResponsiveContainer>
          </div></CardContent>
        </Card>
        <Card>
          <CardHeader><CardTitle>Escalation trend</CardTitle><CardDescription>Escalation events recorded per day</CardDescription></CardHeader>
          <CardContent><div className="h-[300px]">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={data.escalationTrend}><CartesianGrid strokeDasharray="3 3" vertical={false} /><XAxis dataKey="date" /><YAxis allowDecimals={false} /><Tooltip /><Line dataKey="count" name="Escalations" type="monotone" stroke="#dc2626" strokeWidth={2} /></LineChart>
            </ResponsiveContainer>
          </div></CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Geographic complaint heatmap</CardTitle>
          <CardDescription>Markers are grouped to show density; citizen names, complaint text, and exact addresses are not included.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-3 sm:grid-cols-3">
            <Select value={category} onValueChange={(value) => { if (value) setCategory(value); }}>
              <SelectTrigger aria-label="Filter map by category"><SelectValue placeholder="All categories" /></SelectTrigger>
              <SelectContent><SelectItem value="ALL">All categories</SelectItem>{GRIEVANCE_CATEGORIES.map((id) => <SelectItem key={id} value={id}>{CATEGORY_NAMES[id] || id}</SelectItem>)}</SelectContent>
            </Select>
            <Select value={priority} onValueChange={(value) => { if (value) setPriority(value); }}>
              <SelectTrigger aria-label="Filter map by priority"><SelectValue placeholder="All priorities" /></SelectTrigger>
              <SelectContent><SelectItem value="ALL">All priorities</SelectItem>{PRIORITY_LEVELS.map((level) => <SelectItem key={level} value={level}>{level}</SelectItem>)}</SelectContent>
            </Select>
            <Select value={status} onValueChange={(value) => { if (value) setStatus(value); }}>
              <SelectTrigger aria-label="Filter map by status"><SelectValue placeholder="All statuses" /></SelectTrigger>
              <SelectContent><SelectItem value="ALL">All statuses</SelectItem>{GRIEVANCE_STATUSES.map((value) => <SelectItem key={value} value={value}>{value.replace(/_/g, ' ')}</SelectItem>)}</SelectContent>
            </Select>
          </div>
          {mapError && <p role="alert" className="text-sm text-destructive">{mapError}</p>}
          {markers.length === 0 ? (
            <div className="flex h-40 items-center justify-center rounded-lg border border-dashed text-center text-sm text-muted-foreground">
              No geolocated complaints match these filters.
            </div>
          ) : (
            <GeographicMap markers={markers} />
          )}
        </CardContent>
      </Card>
    </div>
  );
}
