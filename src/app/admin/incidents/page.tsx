'use client';

import React, { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Loader2, Brain, AlertTriangle, MapPin } from 'lucide-react';
import { Incident } from '@/lib/types';
import { Badge } from '@/components/ui/badge';

export default function IncidentsPage() {
  const [incidents, setIncidents] = useState<Incident[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchIncidents = async () => {
      try {
        const response = await fetch('/api/analytics/incidents');
        if (response.ok) {
          const result = await response.json();
          setIncidents(result);
        }
      } catch (error) {
        console.error('Failed to fetch incidents', error);
      } finally {
        setLoading(false);
      }
    };
    fetchIncidents();
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
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Recurring Issues & Incidents</h1>
        <p className="text-slate-500 mt-2">AI-detected systemic issues based on complaint patterns.</p>
      </div>
      
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {incidents.length === 0 ? (
          <div className="col-span-full p-8 text-center text-slate-500 bg-slate-50 dark:bg-slate-900 rounded-lg border border-dashed">
            No active incidents detected.
          </div>
        ) : (
          incidents.map((incident) => (
            <Card key={incident.id} className="border-amber-200 dark:border-amber-900">
              <CardHeader className="pb-3">
                <div className="flex justify-between items-start">
                  <Badge variant={incident.severity?.toUpperCase() === 'CRITICAL' ? 'destructive' : 'secondary'}>
                    {incident.severity?.toUpperCase() || 'HIGH'}
                  </Badge>
                  <Brain className="h-5 w-5 text-amber-500" />
                </div>
                <CardTitle className="text-lg mt-2">{incident.title}</CardTitle>
                <CardDescription>{incident.description}</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-2 text-sm">
                  <div className="flex items-center text-slate-500">
                    <MapPin className="h-4 w-4 mr-2" />
                    {typeof incident.location === 'object' ? `Ward ${incident.location.ward || ''} ${incident.location.area || ''}` : (incident.ward || incident.location || 'City-wide')}
                  </div>
                  <div className="flex justify-between items-center mt-4">
                    <span className="font-medium text-slate-700 dark:text-slate-300">
                      Related Complaints: {incident.grievanceIds?.length || incident.relatedGrievanceIds?.length || incident.totalComplaints || 0}
                    </span>
                    <span className="text-amber-600 font-medium capitalize">
                      {incident.status?.replace('_', ' ') || 'ACTIVE'}
                    </span>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))
        )}
      </div>
    </div>
  );
}
