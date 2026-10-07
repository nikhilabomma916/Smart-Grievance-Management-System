'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Search, Download } from 'lucide-react';
import { PriorityBadge, StatusBadge, SLAIndicator, LoadingState } from '@/components/civic/shared';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { CATEGORY_NAMES } from '@/lib/constants';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';

export default function GrievancesPage() {
  const router = useRouter();
  const [grievances, setGrievances] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [priorityFilter, setPriorityFilter] = useState('ALL');
  const [error, setError] = useState('');

  useEffect(() => {
    async function fetchData() {
      try {
        const res = await fetch('/api/grievances?limit=100');
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || 'Assigned grievances could not be loaded.');
        setGrievances(data.data ?? []);
        setError('');
      } catch (error) {
        console.error('Error fetching grievances:', error);
        setError(error instanceof Error ? error.message : 'Assigned grievances could not be loaded.');
      } finally {
        setLoading(false);
      }
    }
    fetchData();
  }, []);

  const filteredGrievances = grievances.filter(g => {
    const matchesSearch = 
      g.id.toLowerCase().includes(searchQuery.toLowerCase()) || 
      g.title.toLowerCase().includes(searchQuery.toLowerCase());
    
    const matchesStatus = statusFilter === 'ALL' || g.status === statusFilter;
    const gPriority = (g.priorityLevel || g.priority || 'MEDIUM').toUpperCase();
    const matchesPriority = priorityFilter === 'ALL' || gPriority === priorityFilter;

    return matchesSearch && matchesStatus && matchesPriority;
  });

  if (loading) return <LoadingState message="Loading grievances..." />;

  return (
    <div className="space-y-6">
      {error && <p role="alert" className="text-sm text-red-600">{error}</p>}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900">All Grievances</h1>
          <p className="text-slate-500">Manage and resolve reported issues.</p>
        </div>
      </div>

      <div className="flex flex-col sm:flex-row gap-4 bg-white p-4 rounded-lg border border-slate-200 shadow-sm">
        <div className="relative flex-1">
          <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-slate-400" />
          <Input
            placeholder="Search by ID or title..."
            className="pl-9"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>
        <div className="flex gap-2">
          <Select value={statusFilter} onValueChange={(v) => { if (v) setStatusFilter(v); }}>
            <SelectTrigger className="w-[140px]">
              <SelectValue placeholder="Status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="ALL">All Status</SelectItem>
              <SelectItem value="SUBMITTED">Submitted</SelectItem>
              <SelectItem value="AI_ANALYZED">AI Analyzed</SelectItem>
              <SelectItem value="ASSIGNED">Assigned</SelectItem>
              <SelectItem value="IN_PROGRESS">In Progress</SelectItem>
              <SelectItem value="RESOLVED">Resolved</SelectItem>
              <SelectItem value="CLOSED">Closed</SelectItem>
              <SelectItem value="ESCALATED">Escalated</SelectItem>
              <SelectItem value="SLA_AT_RISK">SLA At Risk</SelectItem>
            </SelectContent>
          </Select>
          
          <Select value={priorityFilter} onValueChange={(v) => { if (v) setPriorityFilter(v); }}>
            <SelectTrigger className="w-[140px]">
              <SelectValue placeholder="Priority" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="ALL">All Priority</SelectItem>
              <SelectItem value="CRITICAL">Critical</SelectItem>
              <SelectItem value="HIGH">High</SelectItem>
              <SelectItem value="MEDIUM">Medium</SelectItem>
              <SelectItem value="LOW">Low</SelectItem>
            </SelectContent>
          </Select>
          
          <Button variant="outline" size="icon" title="Export">
            <Download className="h-4 w-4" />
          </Button>
        </div>
      </div>

      <div className="bg-white rounded-lg border border-slate-200 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow className="bg-slate-50 hover:bg-slate-50">
                <TableHead className="w-[100px]">ID</TableHead>
                <TableHead>Complaint</TableHead>
                <TableHead>Category</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Priority</TableHead>
                <TableHead>SLA / Date</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredGrievances.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} className="h-32 text-center text-slate-500">
                    No grievances found matching your filters.
                  </TableCell>
                </TableRow>
              ) : (
                filteredGrievances.map((grievance) => (
                  <TableRow 
                    key={grievance.id}
                    className="cursor-pointer hover:bg-slate-50"
                    onClick={() => router.push(`/officer/grievances/${grievance.id}`)}
                  >
                    <TableCell className="font-mono text-xs text-slate-500">
                      {grievance.id.substring(0, 8)}
                    </TableCell>
                    <TableCell>
                      <div className="font-medium text-slate-900 truncate max-w-xs">{grievance.title}</div>
                      <div className="text-xs text-slate-500 truncate max-w-xs">{grievance.location?.address || grievance.location?.area || 'Bangalore'}</div>
                    </TableCell>
                    <TableCell className="text-sm">
                      {CATEGORY_NAMES[grievance.categoryId] || grievance.category || 'General'}
                    </TableCell>
                    <TableCell>
                      <StatusBadge status={grievance.status} />
                    </TableCell>
                    <TableCell>
                      <PriorityBadge level={grievance.priorityLevel || grievance.priority || 'MEDIUM'} score={grievance.priorityScore} />
                    </TableCell>
                    <TableCell>
                      <div className="space-y-1">
                        {grievance.slaDeadline ? (
                          <SLAIndicator deadline={grievance.slaDeadline} />
                        ) : (
                          <div className="text-sm text-slate-500">
                            {new Date(grievance.createdAt).toLocaleDateString()}
                          </div>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>
        <div className="p-4 border-t border-slate-200 text-sm text-slate-500 flex justify-between items-center">
          <div>Showing {filteredGrievances.length} results</div>
          <div className="flex gap-1">
            <Button variant="outline" size="sm" disabled>Previous</Button>
            <Button variant="outline" size="sm" disabled>Next</Button>
          </div>
        </div>
      </div>
    </div>
  );
}
