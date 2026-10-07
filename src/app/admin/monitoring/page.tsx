'use client';

import React, { useState, useEffect } from 'react';
import {
  Activity, Brain, AlertTriangle, ShieldCheck, Zap,
  CheckCircle, RefreshCw, Radio, Server, Layers,
  Clock, ArrowUpRight, Sparkles, Filter, Database, Check, MapPin, Users
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { MetricCard } from '@/components/civic/shared';
import { DEPARTMENT_NAMES } from '@/lib/constants';
import { AIDepartmentMisroutingMonitor } from '@/components/civic/department-misrouting-alert';


export default function AIMonitoringDashboard() {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [simulating, setSimulating] = useState(false);

  const fetchMonitoringData = async () => {
    try {
      const res = await fetch('/api/ai/monitoring');
      if (res.ok) {
        setData(await res.json());
      }
    } catch (err) {
      console.error('Failed to load AI monitoring data:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchMonitoringData();
    const interval = setInterval(fetchMonitoringData, 8000);
    return () => clearInterval(interval);
  }, []);

  const handleSimulate = async () => {
    setSimulating(true);
    try {
      await fetch('/api/ai/monitoring', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'SIMULATE_EVENT' })
      });
      await fetchMonitoringData();
    } catch (err) {
      console.error('Simulation error:', err);
    } finally {
      setSimulating(false);
    }
  };

  if (loading) {
    return (
      <div className="flex h-96 items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <Brain className="size-10 text-indigo-500 animate-pulse" />
          <p className="text-sm font-medium text-slate-500">Connecting to Civic Telemetry Stream...</p>
        </div>
      </div>
    );
  }

  const { stats, events = [], predictions = [], activeIncidents = [] } = data || {};

  return (
    <div className="space-y-6 pb-12">
      {/* Header & Actions */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 text-white p-6 rounded-2xl shadow-xl border border-indigo-900/50">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="flex size-2.5 rounded-full bg-emerald-400 animate-pulse"></span>
            <Badge className="bg-emerald-500/20 text-emerald-300 border-emerald-500/30 text-[10px] uppercase font-bold tracking-wider">
              Live Operations Stream
            </Badge>
          </div>
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-white flex items-center gap-3">
            <Activity className="size-8 text-indigo-400" />
            Civic Issue Monitoring & Telemetry Center
          </h1>
          <p className="text-sm text-indigo-200/80 mt-1">
            Live defect tracking, on-the-spot photo location mapping, SLA breach predictions, and department dispatch status.
          </p>
        </div>

        <div className="flex flex-wrap gap-2.5 items-center">
          <Button
            variant="outline"
            onClick={fetchMonitoringData}
            className="border-indigo-700 bg-indigo-900/40 text-white hover:bg-indigo-800"
            size="sm"
          >
            <RefreshCw className="size-3.5 mr-1.5" /> Refresh Stream
          </Button>
        </div>
      </div>

      {/* AI Department Misrouting Audit Radar */}
      <AIDepartmentMisroutingMonitor />

      {/* Top Operational Performance Metrics */}

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <MetricCard
          title="Total Issues Logged"
          value={stats?.totalProcessed || 0}
          subtitle={`${stats?.autoTriageAccuracy || 0}% dispatch accuracy`}
          icon={<Brain className="size-5 text-indigo-500" />}
        />
        <MetricCard
          title="Duplicates Merged"
          value={stats?.duplicatesIdentified || 0}
          subtitle="Linked to primary work orders"
          icon={<Layers className="size-5 text-blue-500" />}
        />
        <MetricCard
          title="Active Systemic Clusters"
          value={activeIncidents.length || 0}
          subtitle="Derived from submitted complaints"
          icon={<AlertTriangle className="size-5 text-amber-500" />}
          className="border-amber-100 bg-amber-50/20"
        />
        <MetricCard
          title="Safety Escalations (4hr SLA)"
          value={stats?.highRiskSafetyEscalations || 0}
          subtitle="Live wire & hazard alarms"
          icon={<ShieldCheck className="size-5 text-red-500" />}
          className="border-red-100 bg-red-50/20"
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left 2 Cols: Live Telemetry & SLA Neural Predictor */}
        <div className="lg:col-span-2 space-y-6">
          {/* 1. Live AI Operations Stream */}
          <Card className="shadow-sm border-slate-200 dark:border-slate-800">
            <CardHeader className="pb-3 border-b">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Activity className="size-5 text-indigo-600 animate-pulse" />
                  <CardTitle className="text-base font-bold">Real-Time Issue & Department Dispatch Log</CardTitle>
                </div>
                <Badge variant="outline" className="text-xs font-mono">
                  {events.length} events logged
                </Badge>
              </div>
              <CardDescription className="text-xs">
                Live complaint classification, photo location verification, and department assignment stream
              </CardDescription>
            </CardHeader>
            <CardContent className="p-0">
              <div className="divide-y divide-slate-100 dark:divide-slate-800 max-h-[380px] overflow-y-auto">
                {events.map((evt: any) => (
                  <div key={evt.id} className="p-4 hover:bg-slate-50/60 dark:hover:bg-slate-800/40 transition-colors flex items-start gap-3.5 text-sm">
                    <div className={`flex size-8 shrink-0 items-center justify-center rounded-xl font-bold text-xs ${
                      evt.severity === 'CRITICAL' ? 'bg-red-100 text-red-700 dark:bg-red-950/50 dark:text-red-400' :
                      evt.severity === 'HIGH' ? 'bg-amber-100 text-amber-700 dark:bg-amber-950/50 dark:text-amber-400' :
                      'bg-indigo-100 text-indigo-700 dark:bg-indigo-950/50 dark:text-indigo-400'
                    }`}>
                      {evt.type === 'SAFETY_ESCALATION' ? <ShieldCheck className="size-4" /> :
                       evt.type === 'CLUSTER_DETECTED' ? <Layers className="size-4" /> :
                       evt.type === 'DUPLICATE_MERGE' ? <Database className="size-4" /> :
                       evt.type === 'SLA_RISK' ? <Clock className="size-4" /> : <Activity className="size-4" />}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between gap-2">
                        <span className="font-semibold text-slate-900 dark:text-slate-100 truncate">{evt.title}</span>
                        <span className="text-[11px] font-mono text-slate-400 shrink-0">
                          {new Date(evt.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
                        </span>
                      </div>
                      <p className="text-xs text-slate-600 dark:text-slate-400 mt-1 leading-relaxed">{evt.description}</p>
                      {evt.ward && (
                        <div className="mt-2 flex items-center gap-2">
                          <span className="rounded bg-slate-100 dark:bg-slate-800 px-2 py-0.5 text-[10px] font-medium text-slate-600 dark:text-slate-400">
                            <MapPin className="mr-1 inline size-3" />Ward {evt.ward}
                          </span>
                          <span className="text-[10px] text-emerald-600 dark:text-emerald-400 font-semibold flex items-center gap-1">
                            <Check className="size-3" /> Auto-Dispatched to Department
                          </span>
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* 2. Predictive SLA Breach Early Warning Radar */}
          <Card className="shadow-sm border-slate-200 dark:border-slate-800">
            <CardHeader className="pb-3 border-b">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Clock className="size-5 text-amber-500" />
                  <CardTitle className="text-base font-bold">Predictive SLA Breach & Delay Radar</CardTitle>
                </div>
                <Badge className="bg-amber-100 text-amber-800 dark:bg-amber-950/50 dark:text-amber-300 text-xs">
                  Early Warning Active
                </Badge>
              </div>
              <CardDescription className="text-xs">
                Real-time risk scoring for tickets approaching target resolution deadlines
              </CardDescription>
            </CardHeader>
            <CardContent className="p-4 space-y-4">
              {predictions.slice(0, 4).map((p: any) => (
                <div key={p.grievanceId} className="rounded-xl border border-slate-200 dark:border-slate-800 p-3.5 bg-white dark:bg-slate-800/60 shadow-xs space-y-2.5">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-mono text-xs text-indigo-600 font-bold">{p.grievanceId}</span>
                        <span className="rounded bg-slate-100 dark:bg-slate-700 px-1.5 py-0.2 text-[10px] text-slate-600 dark:text-slate-300">
                          {DEPARTMENT_NAMES[p.departmentId] || p.departmentId}
                        </span>
                        <span className="text-[10px] text-slate-400">Ward {p.ward}</span>
                      </div>
                      <h4 className="text-sm font-semibold text-slate-900 dark:text-slate-100 mt-1">{p.title}</h4>
                    </div>
                    <div className="text-right shrink-0">
                      <span className={`text-sm font-bold ${p.riskProbability >= 80 ? 'text-red-600' : 'text-amber-600'}`}>
                        {p.riskProbability}% Risk
                      </span>
                      <p className="text-[10px] text-slate-400">Delay Probability</p>
                    </div>
                  </div>

                  <div className="space-y-1">
                    <Progress value={p.riskProbability} className={`h-1.5 bg-slate-100 ${p.riskProbability >= 80 ? '[&>div]:bg-red-500' : '[&>div]:bg-amber-500'}`} />
                  </div>

                  <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center text-xs gap-2 pt-1 border-t border-slate-100 dark:border-slate-700/50">
                    <span className="text-slate-500 text-[11px]">
                      Bottleneck: <em>{p.bottleneckReason}</em>
                    </span>
                    <span className="text-indigo-600 dark:text-indigo-400 font-medium text-[11px]">
                      {p.recommendedAction}
                    </span>
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>
        </div>

        {/* Right Col: Active Systemic Incidents & Ward Hotspots */}
        <div className="space-y-6">
          {/* Active Systemic Incidents Quick Radar */}
          <Card className="shadow-sm border-amber-200 dark:border-amber-900 bg-amber-50/20">
            <CardHeader className="pb-3 border-b border-amber-100">
              <div className="flex items-center gap-2">
                <Radio className="size-5 text-amber-600 animate-pulse" />
                <CardTitle className="text-base font-bold text-amber-900 dark:text-amber-300">Active Anomaly Hotspots</CardTitle>
              </div>
              <CardDescription className="text-xs">Correlated multi-complaint ward incidents</CardDescription>
            </CardHeader>
            <CardContent className="p-4 space-y-3">
              {activeIncidents.map((inc: any) => (
                <div key={inc.id} className="p-3 bg-white dark:bg-slate-800 rounded-xl border border-amber-200 dark:border-amber-800/60 shadow-xs space-y-1">
                  <div className="flex justify-between items-center">
                    <Badge variant="outline" className="text-[10px] font-bold text-amber-700">
                      {inc.category || 'Water Supply'}
                    </Badge>
                    <span className="text-[10px] font-bold text-red-600 uppercase">
                      {inc.severity} Severity
                    </span>
                  </div>
                  <h5 className="text-xs font-bold text-slate-900 dark:text-slate-100">{inc.title}</h5>
                  <p className="text-[11px] text-slate-600 dark:text-slate-400">{inc.description}</p>
                  <div className="flex justify-between items-center text-[10px] text-slate-500 pt-1 font-semibold">
                    <span className="inline-flex items-center gap-1"><Users className="size-3" />~{inc.estimatedAffected || 0} Affected</span>
                    <span className="inline-flex items-center gap-1"><MapPin className="size-3" />Ward {typeof inc.location === 'object' ? inc.location.ward : inc.ward || 'Not specified'}</span>
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
