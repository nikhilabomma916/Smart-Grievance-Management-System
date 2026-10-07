'use client';

import React, { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Loader2 } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { DEPARTMENT_IDS, DEPARTMENT_NAMES } from '@/lib/constants';

interface OfficerData {
  id: string;
  name: string;
  email: string;
  departmentId?: string;
  role?: string;
  status?: string;
  openCases: number;
  resolvedToday?: number;
}

export default function OfficersPage() {
  const [officers, setOfficers] = useState<OfficerData[]>([]);
  const [departmentSelections, setDepartmentSelections] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [savingOfficerId, setSavingOfficerId] = useState<string | null>(null);
  const [canManageDepartments, setCanManageDepartments] = useState(false);

  useEffect(() => {
    const fetchOfficers = async () => {
      try {
        const [response, authResponse] = await Promise.all([
          fetch('/api/officers'),
          fetch('/api/auth/me'),
        ]);
        const [result, auth] = await Promise.all([response.json(), authResponse.json()]);
        if (!response.ok || !authResponse.ok) {
          throw new Error(result.error || auth.error || 'The officer list could not be loaded.');
        }
        setCanManageDepartments(auth.user?.role === 'admin');
        setOfficers(result);
      } catch (error) {
        console.error('Failed to fetch officers', error);
        setError(error instanceof Error ? error.message : 'The officer list could not be loaded.');
      } finally {
        setLoading(false);
      }
    };
    fetchOfficers();
  }, []);

  const saveDepartment = async (officer: OfficerData) => {
    const departmentId = departmentSelections[officer.id] ?? officer.departmentId ?? '';
    setSavingOfficerId(officer.id);
    setError('');
    try {
      const response = await fetch(`/api/officers/${officer.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ departmentId: departmentId || null }),
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || 'The officer department could not be updated.');
      setOfficers((current) => current.map((item) =>
        item.id === officer.id ? { ...item, departmentId: departmentId || undefined } : item,
      ));
    } catch (error) {
      console.error('Failed to update officer department', error);
      setError(error instanceof Error ? error.message : 'The officer department could not be updated.');
    } finally {
      setSavingOfficerId(null);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <Loader2 className="h-8 w-8 animate-spin text-blue-500" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-bold tracking-tight">Officers Management</h1>

      {error && <p role="alert" className="text-sm text-red-600">{error}</p>}
      
      <Card>
        <CardHeader>
          <CardTitle>Active Officers</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Email</TableHead>
                <TableHead>Department</TableHead>
                <TableHead>Role</TableHead>
                <TableHead>Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {officers.map((officer) => (
                <TableRow key={officer.id}>
                  <TableCell className="font-medium">{officer.name}</TableCell>
                  <TableCell>{officer.email}</TableCell>
                  <TableCell>
                    {canManageDepartments ? <div className="flex min-w-[260px] items-center gap-2">
                      <select
                        aria-label={`Department for ${officer.name}`}
                        className="h-9 min-w-0 flex-1 rounded-md border border-slate-300 bg-white px-2 text-sm"
                        value={departmentSelections[officer.id] ?? officer.departmentId ?? ''}
                        onChange={(event) => setDepartmentSelections((current) => ({
                          ...current,
                          [officer.id]: event.target.value,
                        }))}
                      >
                        <option value="">General / Field Officer</option>
                        {DEPARTMENT_IDS.map((id) => (
                          <option key={id} value={id}>{DEPARTMENT_NAMES[id]}</option>
                        ))}
                      </select>
                      <Button
                        size="sm"
                        variant="outline"
                        disabled={savingOfficerId === officer.id}
                        onClick={() => void saveDepartment(officer)}
                      >
                        {savingOfficerId === officer.id ? 'Saving…' : 'Save'}
                      </Button>
                    </div> : DEPARTMENT_NAMES[officer.departmentId || ''] || 'Unassigned'}
                  </TableCell>
                  <TableCell className="capitalize">{(officer.role || 'Officer').replace('_', ' ')}</TableCell>
                  <TableCell>
                    <Badge variant={(officer.status || 'active') === 'active' ? 'default' : 'secondary'}>
                      {officer.status || 'active'}
                    </Badge>
                  </TableCell>
                </TableRow>
              ))}
              {!officers.length && !error && (
                <TableRow>
                  <TableCell colSpan={5} className="h-24 text-center text-slate-500">
                    No active officers are available.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
