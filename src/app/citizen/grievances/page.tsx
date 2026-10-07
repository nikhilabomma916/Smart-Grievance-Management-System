'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { Search, Filter, FileText, Building2, MapPin } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { StatusBadge, PriorityBadge, IssueConditionBadge, LoadingState, EmptyState } from '@/components/civic/shared';
import { CATEGORY_NAMES, DEPARTMENT_NAMES } from '@/lib/constants';

interface Grievance {
  id: string;
  title: string;
  categoryId: string;
  departmentId?: string;
  status: string;
  priorityLevel?: string;
  priorityScore?: number;
  createdAt: string;
  location: { address?: string; area?: string; ward?: string };
}

export default function MyGrievancesPage() {
  const [grievances, setGrievances] = useState<Grievance[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');

  useEffect(() => {
    fetch('/api/grievances')
      .then((r) => r.json())
      .then((d) => { setGrievances(Array.isArray(d) ? d : d?.data ?? []); setLoading(false); })
      .catch(() => setLoading(false));
  }, []);

  const filtered = grievances.filter((g) => {
    if (search && !g.title.toLowerCase().includes(search.toLowerCase()) && !g.id.toLowerCase().includes(search.toLowerCase())) return false;
    if (statusFilter !== 'all' && g.status !== statusFilter) return false;
    return true;
  });

  if (loading) return <LoadingState message="Loading grievances..." />;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">My Grievances</h1>
        <p className="text-sm text-muted-foreground">View and track the grievances submitted through your account.</p>
      </div>

      <div className="flex flex-col gap-3 sm:flex-row">
        <div className="relative flex-1">
          <Search className="absolute top-2.5 left-3 size-4 text-muted-foreground" />
          <Input placeholder="Search by title, location, or complaint ID" className="pl-9" value={search} onChange={(e) => setSearch(e.target.value)} />
        </div>
        <Select value={statusFilter} onValueChange={(v) => { if (v) setStatusFilter(v); }}>
          <SelectTrigger className="w-full sm:w-56">
            <Filter className="mr-2 size-4" />
            <SelectValue placeholder="Filter status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All statuses</SelectItem>
            <SelectItem value="RESOLVED">Resolved</SelectItem>
            <SelectItem value="IN_PROGRESS">In Progress</SelectItem>
            <SelectItem value="AI_ANALYZED">AI Analyzed</SelectItem>
            <SelectItem value="ESCALATED">Escalated</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {filtered.length === 0 ? (
        <EmptyState icon={<FileText className="size-12" />} title="No grievances found" description={search || statusFilter !== 'all' ? 'Try adjusting your filters.' : 'Submit your first grievance to track it here.'} />
      ) : (
        <div className="rounded-xl border bg-card shadow-sm divide-y divide-slate-100 dark:divide-slate-800 overflow-hidden">
          {filtered.map((g) => {
            const deptName = DEPARTMENT_NAMES[g.departmentId || ''] || 'Respective Department';
            const catName = CATEGORY_NAMES[g.categoryId] || g.categoryId || 'General Defect';
            return (
              <Link key={g.id} href={`/citizen/grievances/${g.id}`} className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 px-5 py-4 transition-colors hover:bg-slate-50/80 dark:hover:bg-slate-800/50">
                <div className="min-w-0 flex-1 space-y-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="font-mono text-xs font-bold text-indigo-600">{g.id}</span>
                    <IssueConditionBadge status={g.status} />
                    <span className="rounded bg-slate-100 dark:bg-slate-800 px-2 py-0.5 text-xs text-slate-700 dark:text-slate-300 font-medium">
                      {catName}
                    </span>
                    {g.priorityLevel && <PriorityBadge level={g.priorityLevel as any} />}
                  </div>
                  <h3 className="truncate text-sm font-semibold text-slate-900 dark:text-slate-100">{g.title}</h3>
                  <div className="flex items-center gap-4 text-xs text-slate-500 flex-wrap">
                    <span className="flex items-center gap-1">
                      <Building2 className="size-3.5 text-indigo-500" />
                      Department: <strong className="text-slate-700 dark:text-slate-300">{deptName}</strong>
                    </span>
                    <span className="flex items-center gap-1">
                      <MapPin className="size-3.5 text-slate-400" />
                      {g.location?.address || g.location?.ward || 'Location not provided'}
                    </span>
                    <span>
                      {new Date(g.createdAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}
                    </span>
                  </div>
                </div>
                <div className="shrink-0 flex items-center gap-2">
                  <StatusBadge status={g.status as any} />
                </div>
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}
