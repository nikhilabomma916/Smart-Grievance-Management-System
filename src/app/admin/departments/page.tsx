'use client';

import React, { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Loader2 } from 'lucide-react';
import { Department } from '@/lib/types';
import { DEPARTMENT_NAMES } from '@/lib/constants';

export default function DepartmentsPage() {
  const [departments, setDepartments] = useState<Department[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchDeps = async () => {
      try {
        const response = await fetch('/api/departments');
        if (response.ok) {
          const result = await response.json();
          setDepartments(result);
        }
      } catch (error) {
        console.error('Failed to fetch departments', error);
      } finally {
        setLoading(false);
      }
    };
    fetchDeps();
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <Loader2 className="h-8 w-8 animate-spin text-blue-500" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-bold tracking-tight">Departments Management</h1>
      
      <Card>
        <CardHeader>
          <CardTitle>All Departments</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Head Officer</TableHead>
                <TableHead>Total Grievances</TableHead>
                <TableHead>Open Cases</TableHead>
                <TableHead>Avg Resolution Time</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {departments.map((dept) => (
                <TableRow key={dept.id}>
                  <TableCell className="font-medium">{DEPARTMENT_NAMES[dept.id] || dept.name}</TableCell>
                  <TableCell>{dept.headOfficerName || dept.headId || 'Unassigned'}</TableCell>
                  <TableCell>{dept.metrics?.totalGrievances ?? 0}</TableCell>
                  <TableCell>{dept.metrics?.openGrievances ?? 0}</TableCell>
                  <TableCell>{dept.metrics?.avgResolutionTimeHours ?? 24} hrs</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
