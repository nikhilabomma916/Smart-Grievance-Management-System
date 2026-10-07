'use client';

import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { Search } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { ErrorState, LoadingState, PriorityBadge, StatusBadge } from '@/components/civic/shared';
import { CATEGORY_NAMES, DEPARTMENT_IDS, DEPARTMENT_NAMES } from '@/lib/constants';
import { GRIEVANCE_STATUSES, PRIORITY_LEVELS } from '@/server/validation/grievance';
import type { Grievance } from '@/lib/types';

const PAGE_SIZE = 25;

interface Officer {
  id: string;
  name: string;
  departmentId?: string;
}

export default function AdminGrievancesPage() {
  const [grievances, setGrievances] = useState<Grievance[]>([]);
  const [officers, setOfficers] = useState<Officer[]>([]);
  const [selectedOfficers, setSelectedOfficers] = useState<Record<string, string>>({});
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState('ALL');
  const [priority, setPriority] = useState('ALL');
  const [category, setCategory] = useState('ALL');
  const [department, setDepartment] = useState('ALL');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [retry, setRetry] = useState(0);
  const [assigningId, setAssigningId] = useState<string | null>(null);
  const [departmentAdmin, setDepartmentAdmin] = useState(false);

  useEffect(() => {
    fetch('/api/auth/me')
      .then(async (response) => {
        const result = await response.json();
        if (!response.ok) throw new Error(result.error || 'Administrator profile could not be loaded.');
        setDepartmentAdmin(result.user?.role === 'department_admin');
      })
      .catch((authError) => console.error('Administrator role could not be loaded:', authError));
  }, []);

  const loadGrievances = useCallback(async () => {
    setLoading(true);
    setError('');
    const params = new URLSearchParams({ page: String(page), limit: String(PAGE_SIZE) });
    if (search.trim()) params.set('search', search.trim());
    if (status !== 'ALL') params.set('status', status);
    if (priority !== 'ALL') params.set('priority', priority);
    if (category !== 'ALL') params.set('category', category);
    if (department !== 'ALL' && !departmentAdmin) params.set('department', department);
    try {
      const [grievanceResponse, officerResponse] = await Promise.all([
        fetch(`/api/grievances?${params}`, { cache: 'no-store' }),
        officers.length ? Promise.resolve(null) : fetch('/api/officers', { cache: 'no-store' }),
      ]);
      const grievanceResult = await grievanceResponse.json();
      if (!grievanceResponse.ok) throw new Error(grievanceResult.error || 'Grievances could not be loaded.');
      setGrievances(grievanceResult.data ?? []);
      setTotal(grievanceResult.meta?.total ?? 0);

      if (officerResponse) {
        const officerResult = await officerResponse.json();
        if (!officerResponse.ok) throw new Error(officerResult.error || 'Active officers could not be loaded.');
        setOfficers(officerResult);
      }
    } catch (loadError) {
      console.error('Administrator grievance list could not be loaded:', loadError);
      setError(loadError instanceof Error ? loadError.message : 'The grievance list could not be loaded.');
    } finally {
      setLoading(false);
    }
  }, [page, search, status, priority, category, department, departmentAdmin, officers.length]);

  useEffect(() => {
    void loadGrievances();
  }, [loadGrievances, retry]);

  const assignGrievance = async (grievanceId: string) => {
    const grievance = grievances.find((item) => item.id === grievanceId);
    const officerId = selectedOfficers[grievanceId] || grievance?.assignedOfficerId;
    if (!officerId) return;
    setAssigningId(grievanceId);
    setError('');
    try {
      const response = await fetch(`/api/grievances/${grievanceId}/assign`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ officerId }),
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || 'The grievance could not be assigned.');
      setGrievances((current) => current.map((item) => item.id === grievanceId ? result.grievance : item));
    } catch (assignError) {
      console.error('Grievance assignment failed:', assignError);
      setError(assignError instanceof Error ? assignError.message : 'The grievance could not be assigned.');
    } finally {
      setAssigningId(null);
    }
  };

  if (loading && grievances.length === 0 && !error) return <LoadingState message="Loading system grievances..." />;
  if (error && grievances.length === 0) {
    return <ErrorState title="Grievance list unavailable" message={error} onRetry={() => setRetry((value) => value + 1)} />;
  }

  const maxPage = Math.max(1, Math.ceil(total / PAGE_SIZE));

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">System Grievances</h1>
        <p className="text-sm text-muted-foreground">Search, filter, inspect, and assign system-wide complaints.</p>
      </div>
      {error && <p role="alert" className="rounded-md border border-destructive/30 bg-destructive/5 p-3 text-sm text-destructive">{error}</p>}

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
        <div className="relative sm:col-span-2 xl:col-span-1">
          <Search className="absolute left-3 top-2.5 size-4 text-muted-foreground" />
          <Input aria-label="Search grievances" className="pl-9" placeholder="Search ID, title, or location" value={search} onChange={(event) => { setSearch(event.target.value); setPage(1); }} />
        </div>
        <Select value={status} onValueChange={(value) => { if (value) { setStatus(value); setPage(1); } }}>
          <SelectTrigger aria-label="Filter by status"><SelectValue placeholder="All statuses" /></SelectTrigger>
          <SelectContent><SelectItem value="ALL">All statuses</SelectItem>{GRIEVANCE_STATUSES.map((item) => <SelectItem key={item} value={item}>{item.replace(/_/g, ' ')}</SelectItem>)}</SelectContent>
        </Select>
        <Select value={category} onValueChange={(value) => { if (value) { setCategory(value); setPage(1); } }}>
          <SelectTrigger aria-label="Filter by category"><SelectValue placeholder="All categories" /></SelectTrigger>
          <SelectContent><SelectItem value="ALL">All categories</SelectItem>{Object.entries(CATEGORY_NAMES).map(([id, name]) => <SelectItem key={id} value={id}>{name}</SelectItem>)}</SelectContent>
        </Select>
        <Select value={priority} onValueChange={(value) => { if (value) { setPriority(value); setPage(1); } }}>
          <SelectTrigger aria-label="Filter by priority"><SelectValue placeholder="All priorities" /></SelectTrigger>
          <SelectContent><SelectItem value="ALL">All priorities</SelectItem>{PRIORITY_LEVELS.map((item) => <SelectItem key={item} value={item}>{item}</SelectItem>)}</SelectContent>
        </Select>
        {!departmentAdmin && <Select value={department} onValueChange={(value) => { if (value) { setDepartment(value); setPage(1); } }}>
          <SelectTrigger aria-label="Filter by department"><SelectValue placeholder="All departments" /></SelectTrigger>
          <SelectContent><SelectItem value="ALL">All departments</SelectItem>{DEPARTMENT_IDS.map((item) => <SelectItem key={item} value={item}>{DEPARTMENT_NAMES[item]}</SelectItem>)}</SelectContent>
        </Select>}
      </div>

      <Card>
        <CardHeader><CardTitle>{departmentAdmin ? 'Department Grievances' : 'All Grievances'} ({total})</CardTitle></CardHeader>
        <CardContent>
          {loading ? <LoadingState message="Updating grievance results..." /> : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader><TableRow>
                  <TableHead>ID / Details</TableHead><TableHead>Category</TableHead><TableHead>Department</TableHead>
                  <TableHead>Priority</TableHead><TableHead>Status</TableHead><TableHead>Created</TableHead><TableHead>Assign officer</TableHead>
                </TableRow></TableHeader>
                <TableBody>
                  {grievances.map((grievance) => (
                    <TableRow key={grievance.id}>
                      <TableCell className="min-w-[220px]">
                        <Link href={`/admin/grievances/${grievance.id}`} className="font-mono text-xs text-primary hover:underline">
                          {grievance.id}
                        </Link>
                        <p className="max-w-[220px] truncate font-medium">{grievance.title}</p>
                      </TableCell>
                      <TableCell>{CATEGORY_NAMES[grievance.categoryId] || grievance.categoryId}</TableCell>
                      <TableCell>{DEPARTMENT_NAMES[grievance.departmentId || ''] || 'Unassigned'}</TableCell>
                      <TableCell><PriorityBadge level={grievance.priorityLevel || grievance.priority || 'MEDIUM'} score={grievance.priorityScore} /></TableCell>
                      <TableCell><StatusBadge status={grievance.status} /></TableCell>
                      <TableCell>{new Date(grievance.createdAt).toLocaleString('en-IN')}</TableCell>
                      <TableCell>
                        <div className="flex min-w-[250px] items-center gap-2">
                          <select
                            aria-label={`Officer for grievance ${grievance.id}`}
                            className="h-9 min-w-0 flex-1 rounded-md border border-slate-300 bg-white px-2 text-sm"
                            value={selectedOfficers[grievance.id] || grievance.assignedOfficerId || ''}
                            onChange={(event) => setSelectedOfficers((current) => ({ ...current, [grievance.id]: event.target.value }))}
                            disabled={!officers.length || ['RESOLVED', 'CLOSED'].includes(grievance.status)}
                          >
                            <option value="">Select officer</option>
                            {officers
                              .filter((officer) => !grievance.departmentId || !officer.departmentId || officer.departmentId === grievance.departmentId)
                              .map((officer) => <option key={officer.id} value={officer.id}>{officer.name}</option>)}
                          </select>
                          <Button
                            size="sm"
                            onClick={() => void assignGrievance(grievance.id)}
                            disabled={(!selectedOfficers[grievance.id] && !grievance.assignedOfficerId) || assigningId === grievance.id || ['RESOLVED', 'CLOSED'].includes(grievance.status)}
                          >
                            {assigningId === grievance.id ? 'Saving…' : grievance.assignedOfficerId ? 'Reassign' : 'Assign'}
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                  {grievances.length === 0 && <TableRow><TableCell colSpan={7} className="h-24 text-center text-muted-foreground">No grievances match these filters.</TableCell></TableRow>}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
        {maxPage > 1 && (
          <div className="flex items-center justify-between border-t px-6 py-3 text-sm text-muted-foreground">
            <span>Page {page} of {maxPage} · {total} grievances</span>
            <div className="flex gap-2">
              <Button variant="outline" size="sm" disabled={page <= 1 || loading} onClick={() => setPage((value) => value - 1)}>Previous</Button>
              <Button variant="outline" size="sm" disabled={page >= maxPage || loading} onClick={() => setPage((value) => value + 1)}>Next</Button>
            </div>
          </div>
        )}
      </Card>
    </div>
  );
}
