'use client';

import React from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';

const slaRules = [
  { priority: 'CRITICAL', resolution: 24, escalation: 4 },
  { priority: 'HIGH', resolution: 72, escalation: 12 },
  { priority: 'MEDIUM', resolution: 168, escalation: 48 },
  { priority: 'LOW', resolution: 336, escalation: 96 },
];

export default function SLAPage() {
  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-bold tracking-tight">SLA Management</h1>
      
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        <Card className="col-span-full">
          <CardHeader>
            <CardTitle>SLA Policies</CardTitle>
            <CardDescription>Target resolution times by priority level</CardDescription>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Priority Level</TableHead>
                  <TableHead>Resolution Target (Hours)</TableHead>
                  <TableHead>Escalation Threshold (Hours)</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {slaRules.map((rule) => (
                  <TableRow key={rule.priority}>
                    <TableCell className="font-bold">{rule.priority}</TableCell>
                    <TableCell>{rule.resolution}h</TableCell>
                    <TableCell>{rule.escalation}h</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
