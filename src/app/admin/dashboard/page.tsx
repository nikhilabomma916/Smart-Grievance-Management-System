'use client';

import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import {
  AlertTriangle,
  ArrowUpRight,
  Building2,
  CheckCircle2,
  Clock,
  FileText,
  ShieldAlert,
  Users,
} from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ErrorState, LoadingState, MetricCard } from '@/components/civic/shared';
import type { AdminAnalytics } from '@/server/data/analytics';

const summaryCards = [
  { key: 'totalGrievances', title: 'Total grievances', icon: FileText },
  { key: 'pending', title: 'Pending', icon: Clock },
  { key: 'assigned', title: 'Assigned', icon: Users },
  { key: 'inProgress', title: 'In progress', icon: ArrowUpRight },
  { key: 'resolved', title: 'Resolved', icon: CheckCircle2 },
  { key: 'overdue', title: 'Overdue', icon: AlertTriangle },
  { key: 'slaAtRisk', title: 'SLA at risk', icon: Clock },
  { key: 'escalated', title: 'Escalated', icon: ShieldAlert },
] as const;

export default function AdminDashboard() {
  const [data, setData] = useState<AdminAnalytics | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [retry, setRetry] = useState(0);

  const loadDashboard = useCallback(async () => {
    setError('');
    try {
      const response = await fetch('/api/analytics/overview', { cache: 'no-store' });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || 'Administrator dashboard could not be loaded.');
      setData(result);
    } catch (loadError) {
      console.error('Administrator dashboard could not be loaded:', loadError);
      setError(loadError instanceof Error ? loadError.message : 'Administrator dashboard could not be loaded.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadDashboard();
    const intervalId = window.setInterval(() => void loadDashboard(), 60_000);
    return () => window.clearInterval(intervalId);
  }, [loadDashboard, retry]);

  if (loading) return <LoadingState message="Loading system dashboard..." />;
  if (error && !data) {
    return <ErrorState title="Dashboard unavailable" message={error} onRetry={() => setRetry((value) => value + 1)} />;
  }
  if (!data) return <ErrorState title="Dashboard unavailable" message="No analytics data was returned." onRetry={() => setRetry((value) => value + 1)} />;

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Administrator Dashboard</h1>
          <p className="text-sm text-muted-foreground">System-wide grievance, department, officer, and SLA overview.</p>
        </div>
        <div className="flex gap-2">
          <Link href="/admin/grievances"><Button variant="outline">View grievances</Button></Link>
          <Link href="/admin/analytics"><Button>Analytics and heatmap</Button></Link>
        </div>
      </div>

      {error && <p role="alert" className="rounded-md border border-destructive/30 bg-destructive/5 p-3 text-sm text-destructive">{error}</p>}

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        {summaryCards.map(({ key, title, icon: Icon }) => (
          <MetricCard
            key={key}
            title={title}
            value={data[key]}
            icon={<Icon className="size-5" />}
          />
        ))}
      </div>

      <div className="grid gap-4 xl:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Complaints over time</CardTitle>
            <CardDescription>Daily submissions for the last 30 days</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="h-[280px]">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={data.dailyVolume}>
                  <defs>
                    <linearGradient id="admin-volume" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#4f36ff" stopOpacity={0.7} />
                      <stop offset="95%" stopColor="#4f36ff" stopOpacity={0.05} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} />
                  <XAxis dataKey="date" />
                  <YAxis allowDecimals={false} />
                  <Tooltip />
                  <Area type="monotone" dataKey="count" stroke="#4f36ff" fill="url(#admin-volume)" />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Active workload by department</CardTitle>
            <CardDescription>Open grievances across municipal departments</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="h-[280px]">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={data.departments} layout="vertical" margin={{ left: 12, right: 12 }}>
                  <CartesianGrid strokeDasharray="3 3" horizontal={false} />
                  <XAxis type="number" allowDecimals={false} />
                  <YAxis dataKey="departmentName" type="category" width={140} />
                  <Tooltip />
                  <Bar dataKey={(row) => row.total - row.resolved} name="Open complaints" fill="#7665ff" radius={[0, 4, 4, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2"><Building2 className="size-5" />Department monitoring</CardTitle>
          <CardDescription>Workload and resolution performance using persisted grievance records.</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full min-w-[720px] text-sm">
              <thead><tr className="border-b text-left text-muted-foreground">
                <th className="p-2 font-medium">Department</th><th className="p-2 font-medium">Total</th>
                <th className="p-2 font-medium">Pending</th><th className="p-2 font-medium">Assigned</th>
                <th className="p-2 font-medium">In progress</th><th className="p-2 font-medium">Resolved</th>
                <th className="p-2 font-medium">Overdue</th><th className="p-2 font-medium">Resolution rate</th>
                <th className="p-2 font-medium">Avg. time</th>
              </tr></thead>
              <tbody>
                {data.departments.map((department) => (
                  <tr key={department.departmentId} className="border-b last:border-0">
                    <td className="p-2 font-medium">{department.departmentName}</td>
                    <td className="p-2">{department.total}</td><td className="p-2">{department.pending}</td>
                    <td className="p-2">{department.assigned}</td><td className="p-2">{department.inProgress}</td>
                    <td className="p-2">{department.resolved}</td><td className="p-2">{department.overdue}</td>
                    <td className="p-2">{department.resolutionRate}%</td>
                    <td className="p-2">{department.averageResolutionHours} h</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2"><Users className="size-5" />Officer monitoring</CardTitle>
          <CardDescription>Current assignment workload and outcomes for active officers.</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full min-w-[560px] text-sm">
              <thead><tr className="border-b text-left text-muted-foreground">
                <th className="p-2 font-medium">Officer</th><th className="p-2 font-medium">Department</th>
                <th className="p-2 font-medium">Assigned</th><th className="p-2 font-medium">Pending</th>
                <th className="p-2 font-medium">Resolved</th><th className="p-2 font-medium">Overdue</th>
              </tr></thead>
              <tbody>
                {data.officers.map((officer) => (
                  <tr key={officer.officerId} className="border-b last:border-0">
                    <td className="p-2 font-medium">{officer.officerName}</td>
                    <td className="p-2">{officer.departmentId || 'Unassigned'}</td>
                    <td className="p-2">{officer.assigned}</td><td className="p-2">{officer.pending}</td>
                    <td className="p-2">{officer.resolved}</td><td className="p-2">{officer.overdue}</td>
                  </tr>
                ))}
                {data.officers.length === 0 && <tr><td className="p-4 text-center text-muted-foreground" colSpan={6}>No active officers found.</td></tr>}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
