'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import {
  AlertTriangle,
  ArrowUpRight,
  Building2,
  CalendarDays,
  CheckCircle2,
  Clock,
  FileText,
  Bell,
  MapPin,
  Plus,
  Search,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  EmptyState,
  ErrorState,
  IssueConditionBadge,
  LoadingState,
  MetricCard,
  PriorityBadge,
  SLAIndicator,
  StatusBadge,
} from '@/components/civic/shared';
import { CATEGORY_NAMES, DEPARTMENT_IDS, DEPARTMENT_NAMES } from '@/lib/constants';

interface Grievance {
  id: string;
  title: string;
  categoryId: string;
  departmentId?: string;
  status: string;
  priorityLevel?: string;
  priorityScore?: number;
  location?: { address?: string; area?: string; ward?: string; city?: string };
  createdAt: string;
  updatedAt: string;
  slaDeadline?: string;
}

interface CitizenSummary {
  total: number;
  pending: number;
  inProgress: number;
  resolved: number;
  reopened: number;
  escalated: number;
  overdueOrAtRisk: number;
}

interface NotificationPreview {
  id: string;
  title: string;
  message: string;
  grievanceId: string;
  read: boolean;
  createdAt: string;
}

interface GrievanceResponse {
  data: Grievance[];
  meta: { total: number; page: number; limit: number };
  summary: CitizenSummary;
}

const PAGE_SIZE = 20;

const statusOptions = [
  ['SUBMITTED', 'Submitted'],
  ['AI_ANALYZED', 'AI analyzed'],
  ['ASSIGNED', 'Assigned'],
  ['IN_PROGRESS', 'In progress'],
  ['AWAITING_INFORMATION', 'Awaiting information'],
  ['RESOLVED', 'Resolved'],
  ['CLOSED', 'Closed'],
  ['SLA_AT_RISK', 'SLA at risk'],
  ['ESCALATED', 'Escalated'],
  ['REOPENED', 'Reopened'],
] as const;

export default function CitizenDashboard() {
  const [grievances, setGrievances] = useState<Grievance[]>([]);
  const [summary, setSummary] = useState<CitizenSummary | null>(null);
  const [totalResults, setTotalResults] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [searchInput, setSearchInput] = useState('');
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [categoryFilter, setCategoryFilter] = useState('ALL');
  const [priorityFilter, setPriorityFilter] = useState('ALL');
  const [departmentFilter, setDepartmentFilter] = useState('ALL');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [page, setPage] = useState(1);
  const [retry, setRetry] = useState(0);
  const [citizenName, setCitizenName] = useState('');
  const [notifications, setNotifications] = useState<NotificationPreview[]>([]);
  const [unreadNotifications, setUnreadNotifications] = useState(0);
  const [notificationLoading, setNotificationLoading] = useState(true);
  const [notificationError, setNotificationError] = useState('');

  useEffect(() => {
    const timeout = window.setTimeout(() => setSearch(searchInput.trim()), 250);
    return () => window.clearTimeout(timeout);
  }, [searchInput]);

  useEffect(() => {
    const controller = new AbortController();
    fetch('/api/auth/me', { cache: 'no-store', signal: controller.signal })
      .then(async (response) => {
        const result = await response.json() as {
          user?: { name?: string };
          error?: string;
        };
        if (!response.ok) throw new Error(result.error || 'Unable to load the current account.');
        setCitizenName(result.user?.name || '');
      })
      .catch((profileError: unknown) => {
        if (!controller.signal.aborted) console.error('Citizen dashboard profile lookup failed:', profileError);
      });
    return () => controller.abort();
  }, []);

  useEffect(() => {
    const controller = new AbortController();
    async function loadGrievances() {
      setLoading(true);
      setError('');
      const query = new URLSearchParams({ page: String(page), limit: String(PAGE_SIZE) });
      if (search) query.set('search', search);
      if (statusFilter !== 'ALL') query.set('status', statusFilter);
      if (categoryFilter !== 'ALL') query.set('category', categoryFilter);
      if (priorityFilter !== 'ALL') query.set('priority', priorityFilter);
      if (departmentFilter !== 'ALL') query.set('department', departmentFilter);
      if (dateFrom) query.set('dateFrom', dateFrom);
      if (dateTo) query.set('dateTo', dateTo);

      try {
        const response = await fetch(`/api/grievances?${query.toString()}`, {
          signal: controller.signal,
          cache: 'no-store',
        });
        const result = await response.json() as GrievanceResponse & { error?: string };
        if (!response.ok) throw new Error(result.error || 'Your grievances could not be loaded.');
        setGrievances(result.data);
        setTotalResults(result.meta.total);
        setSummary(result.summary);
      } catch (loadError) {
        if (controller.signal.aborted) return;
        console.error('Citizen dashboard grievances could not be loaded:', loadError);
        setError('Unable to load your dashboard. Please try again.');
      } finally {
        if (!controller.signal.aborted) setLoading(false);
      }
    }

    void loadGrievances();
    return () => controller.abort();
  }, [page, search, statusFilter, categoryFilter, priorityFilter, departmentFilter, dateFrom, dateTo, retry]);

  useEffect(() => {
    const controller = new AbortController();
    async function loadRecentNotifications() {
      setNotificationLoading(true);
      setNotificationError('');
      try {
        const response = await fetch('/api/notifications?limit=5', {
          cache: 'no-store',
          signal: controller.signal,
        });
        const result = await response.json() as {
          notifications?: NotificationPreview[];
          unreadCount?: number;
          error?: string;
        };
        if (!response.ok) throw new Error(result.error || 'Recent notifications could not be loaded.');
        setNotifications(result.notifications ?? []);
        setUnreadNotifications(result.unreadCount ?? 0);
      } catch (loadError) {
        if (controller.signal.aborted) return;
        console.error('Recent citizen notifications could not be loaded:', loadError);
        setNotificationError('Recent notifications are temporarily unavailable.');
      } finally {
        if (!controller.signal.aborted) setNotificationLoading(false);
      }
    }
    void loadRecentNotifications();
    return () => controller.abort();
  }, [retry]);

  const markNotificationRead = async (notificationId: string) => {
    try {
      const response = await fetch('/api/notifications', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: notificationId }),
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || 'Notification could not be marked as read.');
      setNotifications((current) => current.map((notification) =>
        notification.id === notificationId ? { ...notification, read: true } : notification,
      ));
      setUnreadNotifications((count) => Math.max(0, count - result.updatedCount));
    } catch (readError) {
      console.error('Citizen notification could not be marked as read:', readError);
      setNotificationError('This notification could not be marked as read. Please try again.');
    }
  };

  const maxPage = Math.max(1, Math.ceil(totalResults / PAGE_SIZE));
  const hasFilters = Boolean(search || statusFilter !== 'ALL' || categoryFilter !== 'ALL'
    || priorityFilter !== 'ALL' || departmentFilter !== 'ALL' || dateFrom || dateTo);
  const clearFilters = () => {
    setSearchInput('');
    setSearch('');
    setStatusFilter('ALL');
    setCategoryFilter('ALL');
    setPriorityFilter('ALL');
    setDepartmentFilter('ALL');
    setDateFrom('');
    setDateTo('');
    setPage(1);
  };

  if (loading && !summary) return <LoadingState message="Loading your grievance dashboard..." />;
  if (error && !summary) {
    return <ErrorState title="Dashboard unavailable" message={error} onRetry={() => setRetry((value) => value + 1)} />;
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">
            {citizenName ? `Welcome, ${citizenName}` : 'Welcome'}
          </h1>
          <p className="text-sm text-muted-foreground">Track your complaints, receive updates, and stay informed.</p>
        </div>
        <Link href="/citizen/submit">
          <Button className="gap-2 font-semibold">
            <Plus className="size-4" />
            Submit a grievance
          </Button>
        </Link>
      </div>

      {error && (
        <div role="alert" className="rounded-lg border border-destructive/30 bg-destructive/5 p-3 text-sm text-destructive">
          {error}
          <Button variant="link" size="sm" onClick={() => setRetry((value) => value + 1)}>Retry</Button>
        </div>
      )}

      {summary && (
        <div className="grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-7">
          <MetricCard title="Total complaints" value={summary.total} icon={<FileText className="size-5" />} />
          <MetricCard title="Submitted" value={summary.pending} icon={<Clock className="size-5 text-blue-600" />} />
          <MetricCard title="In progress" value={summary.inProgress} icon={<ArrowUpRight className="size-5 text-amber-600" />} />
          <MetricCard title="Resolved" value={summary.resolved} icon={<CheckCircle2 className="size-5 text-emerald-600" />} />
          <MetricCard title="Reopened" value={summary.reopened} icon={<AlertTriangle className="size-5 text-amber-600" />} />
          <MetricCard title="Escalated" value={summary.escalated} icon={<AlertTriangle className="size-5 text-red-600" />} />
          <MetricCard title="Overdue / SLA risk" value={summary.overdueOrAtRisk} icon={<AlertTriangle className="size-5 text-orange-600" />} />
        </div>
      )}

      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0">
          <div>
            <CardTitle className="flex items-center gap-2 text-base">
              <Bell className="size-4 text-primary" />
              Recent notifications
            </CardTitle>
            <p className="mt-1 text-sm text-muted-foreground">
              {unreadNotifications ? `${unreadNotifications} unread update${unreadNotifications === 1 ? '' : 's'}` : 'You are all caught up.'}
            </p>
          </div>
          <Link href="/citizen/notifications" className="text-sm font-medium text-primary hover:underline">
            View all
          </Link>
        </CardHeader>
        <CardContent className="space-y-3">
          {notificationLoading ? (
            <LoadingState message="Loading recent notifications..." />
          ) : notificationError ? (
            <p role="alert" className="text-sm text-destructive">{notificationError}</p>
          ) : notifications.length === 0 ? (
            <p className="text-sm text-muted-foreground">No complaint updates yet.</p>
          ) : notifications.map((notification) => (
            <div key={notification.id} className="flex items-start gap-3 rounded-lg border p-3">
              <div className={`mt-1 size-2 shrink-0 rounded-full ${notification.read ? 'bg-muted' : 'bg-primary'}`} />
              <Link href={`/citizen/grievances/${notification.grievanceId}`} className="min-w-0 flex-1 hover:underline">
                <p className="text-sm font-medium">{notification.title}</p>
                <p className="mt-0.5 line-clamp-2 text-sm text-muted-foreground">{notification.message}</p>
                <p className="mt-1 text-xs text-muted-foreground">{new Date(notification.createdAt).toLocaleString('en-IN')}</p>
              </Link>
              {!notification.read && (
                <Button variant="ghost" size="sm" onClick={() => void markNotificationRead(notification.id)}>
                  Mark read
                </Button>
              )}
            </div>
          ))}
        </CardContent>
      </Card>

      <section className="overflow-hidden rounded-xl border bg-card shadow-sm" aria-labelledby="my-complaints-heading">
        <div className="flex flex-col gap-3 border-b bg-slate-50/50 px-5 py-4 dark:bg-slate-800/50 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h2 id="my-complaints-heading" className="font-bold">Recent complaints</h2>
            <p className="text-xs text-muted-foreground">Complaint details and updates are visible only to you.</p>
          </div>
          <Link href="/citizen/grievances" className="text-sm font-semibold text-primary hover:underline">
            Open full list
          </Link>
        </div>

        <div className="grid gap-3 border-b p-4 sm:grid-cols-2 xl:grid-cols-4">
          <div className="relative sm:col-span-2 xl:col-span-1">
            <Search className="absolute left-3 top-2.5 size-4 text-muted-foreground" />
            <Input
              aria-label="Search complaints"
              placeholder="Search ID, title, description, or location"
              className="pl-9"
              value={searchInput}
              onChange={(event) => {
                setSearchInput(event.target.value);
                setPage(1);
              }}
            />
          </div>
          <Select value={statusFilter} onValueChange={(value) => { if (value) { setStatusFilter(value); setPage(1); } }}>
            <SelectTrigger aria-label="Filter by status"><SelectValue placeholder="All statuses" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="ALL">All statuses</SelectItem>
              {statusOptions.map(([value, label]) => <SelectItem key={value} value={value}>{label}</SelectItem>)}
            </SelectContent>
          </Select>
          <Select value={categoryFilter} onValueChange={(value) => { if (value) { setCategoryFilter(value); setPage(1); } }}>
            <SelectTrigger aria-label="Filter by category"><SelectValue placeholder="All categories" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="ALL">All categories</SelectItem>
              {Object.entries(CATEGORY_NAMES).map(([id, name]) => <SelectItem key={id} value={id}>{name}</SelectItem>)}
            </SelectContent>
          </Select>
          <Select value={priorityFilter} onValueChange={(value) => { if (value) { setPriorityFilter(value); setPage(1); } }}>
            <SelectTrigger aria-label="Filter by priority"><SelectValue placeholder="All priorities" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="ALL">All priorities</SelectItem>
              <SelectItem value="CRITICAL">Critical</SelectItem>
              <SelectItem value="HIGH">High</SelectItem>
              <SelectItem value="MEDIUM">Medium</SelectItem>
              <SelectItem value="LOW">Low</SelectItem>
            </SelectContent>
          </Select>
          <Select value={departmentFilter} onValueChange={(value) => { if (value) { setDepartmentFilter(value); setPage(1); } }}>
            <SelectTrigger aria-label="Filter by department"><SelectValue placeholder="All departments" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="ALL">All departments</SelectItem>
              {DEPARTMENT_IDS.map((id) => <SelectItem key={id} value={id}>{DEPARTMENT_NAMES[id]}</SelectItem>)}
            </SelectContent>
          </Select>
          <div className="relative">
            <CalendarDays className="absolute left-3 top-2.5 size-4 text-muted-foreground" />
            <Input
              aria-label="Filter from submission date"
              type="date"
              className="pl-9"
              value={dateFrom}
              max={dateTo || undefined}
              onChange={(event) => { setDateFrom(event.target.value); setPage(1); }}
            />
          </div>
          <div className="relative">
            <CalendarDays className="absolute left-3 top-2.5 size-4 text-muted-foreground" />
            <Input
              aria-label="Filter through submission date"
              type="date"
              className="pl-9"
              value={dateTo}
              min={dateFrom || undefined}
              onChange={(event) => { setDateTo(event.target.value); setPage(1); }}
            />
          </div>
        </div>

        {loading ? (
          <div className="p-8"><LoadingState message="Updating complaint list..." /></div>
        ) : grievances.length === 0 ? (
          <EmptyState
            icon={<FileText className="size-12" />}
            title={summary?.total === 0 ? 'No complaints yet' : 'No complaints match your current filters'}
            description={summary?.total === 0
              ? 'Submit a grievance to track its progress here.'
              : 'Try changing your search or filters.'}
            action={summary?.total === 0 ? (
              <Link href="/citizen/submit"><Button size="sm">Submit a grievance</Button></Link>
            ) : hasFilters ? (
              <Button size="sm" variant="outline" onClick={clearFilters}>Clear filters</Button>
            ) : undefined}
          />
        ) : (
          <div className="divide-y divide-slate-100 dark:divide-slate-800">
            {grievances.map((grievance) => {
              const departmentName = DEPARTMENT_NAMES[grievance.departmentId || ''] || 'Department pending review';
              const location = grievance.location?.address
                || grievance.location?.area
                || grievance.location?.ward
                || grievance.location?.city;
              return (
                <Link
                  key={grievance.id}
                  href={`/citizen/grievances/${grievance.id}`}
                  className="flex flex-col gap-3 px-5 py-4 transition-colors hover:bg-slate-50/80 dark:hover:bg-slate-800/50 sm:flex-row sm:items-center sm:justify-between"
                >
                  <div className="min-w-0 flex-1 space-y-1.5">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="break-all font-mono text-xs font-bold text-primary">ID: {grievance.id}</span>
                      <StatusBadge status={grievance.status} />
                      <PriorityBadge level={grievance.priorityLevel} score={grievance.priorityScore} />
                    </div>
                    <h3 className="truncate text-sm font-semibold">{grievance.title}</h3>
                    <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-muted-foreground">
                      <span>{CATEGORY_NAMES[grievance.categoryId] || grievance.categoryId}</span>
                      <span className="inline-flex items-center gap-1">
                        <Building2 className="size-3.5 text-primary" />{departmentName}
                      </span>
                      {location && <span className="inline-flex items-center gap-1"><MapPin className="size-3.5" />{location}</span>}
                      <span>Submitted {new Date(grievance.createdAt).toLocaleString('en-IN')}</span>
                      <span>Last updated {new Date(grievance.updatedAt).toLocaleString('en-IN')}</span>
                      {grievance.slaDeadline && !['RESOLVED', 'CLOSED'].includes(grievance.status) && (
                        <SLAIndicator deadline={grievance.slaDeadline} />
                      )}
                      <IssueConditionBadge status={grievance.status} />
                    </div>
                  </div>
                  <span className="shrink-0 text-sm font-medium text-primary">View details →</span>
                </Link>
              );
            })}
          </div>
        )}

        {maxPage > 1 && (
          <div className="flex flex-col gap-3 border-t px-5 py-3 text-sm text-muted-foreground sm:flex-row sm:items-center sm:justify-between">
            <span>
              Showing {(page - 1) * PAGE_SIZE + 1}–{Math.min(page * PAGE_SIZE, totalResults)} of {totalResults}
            </span>
            <div className="flex gap-2">
              <Button variant="outline" size="sm" disabled={page <= 1 || loading} onClick={() => setPage((value) => value - 1)}>
                Previous
              </Button>
              <Button variant="outline" size="sm" disabled={page >= maxPage || loading} onClick={() => setPage((value) => value + 1)}>
                Next
              </Button>
            </div>
          </div>
        )}
      </section>
    </div>
  );
}
