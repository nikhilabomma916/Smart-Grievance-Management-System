import { CATEGORY_NAMES, DEPARTMENT_IDS, DEPARTMENT_NAMES } from '@/lib/constants';
import { getDatabasePool } from '@/server/db';

export interface DepartmentAnalytics {
  departmentId: string;
  departmentName: string;
  total: number;
  pending: number;
  assigned: number;
  inProgress: number;
  resolved: number;
  overdue: number;
  resolutionRate: number;
  averageResolutionHours: number;
}

export interface OfficerAnalytics {
  officerId: string;
  officerName: string;
  departmentId?: string;
  assigned: number;
  resolved: number;
  pending: number;
  overdue: number;
}

export interface AdminAnalytics {
  totalGrievances: number;
  pending: number;
  assigned: number;
  inProgress: number;
  resolved: number;
  overdue: number;
  slaAtRisk: number;
  escalated: number;
  avgResolutionHours: number;
  statusDistribution: Record<string, number>;
  categoryDistribution: Record<string, number>;
  priorityDistribution: Record<string, number>;
  departmentWorkload: Record<string, number>;
  dailyVolume: { date: string; count: number }[];
  resolutionTrend: { date: string; count: number }[];
  escalationTrend: { date: string; count: number }[];
  slaPerformance: { compliant: number; breached: number; activeOverdue: number; totalResolvedWithSla: number };
  departments: DepartmentAnalytics[];
  officers: OfficerAnalytics[];
}

function numberValue(value: unknown): number {
  return Number(value || 0);
}

export async function getAdminAnalytics(departmentId?: string): Promise<AdminAnalytics> {
  const pool = getDatabasePool();
  const scope = departmentId ?? null;
  const [
    summaryResult,
    statusResult,
    categoryResult,
    priorityResult,
    departmentResult,
    officerResult,
    dailyResult,
    resolutionResult,
    escalationResult,
    slaResult,
  ] = await Promise.all([
    pool.query(
      `SELECT
         COUNT(*)::int AS total,
         COUNT(*) FILTER (WHERE status IN ('SUBMITTED', 'AI_ANALYZED'))::int AS pending,
         COUNT(*) FILTER (WHERE status = 'ASSIGNED')::int AS assigned,
         COUNT(*) FILTER (WHERE status IN ('IN_PROGRESS', 'AWAITING_INFORMATION', 'REOPENED'))::int AS in_progress,
         COUNT(*) FILTER (WHERE status IN ('RESOLVED', 'CLOSED'))::int AS resolved,
         COUNT(*) FILTER (
           WHERE status NOT IN ('RESOLVED', 'CLOSED') AND sla_deadline < NOW()
         )::int AS overdue,
         COUNT(*) FILTER (
           WHERE status NOT IN ('RESOLVED', 'CLOSED')
             AND (status = 'SLA_AT_RISK' OR sla_deadline BETWEEN NOW() AND NOW() + INTERVAL '24 hours')
         )::int AS sla_at_risk,
         COUNT(*) FILTER (WHERE status = 'ESCALATED')::int AS escalated,
         COALESCE(AVG(EXTRACT(EPOCH FROM (resolved_at - created_at)) / 3600)
           FILTER (WHERE resolved_at IS NOT NULL), 0)::numeric AS avg_resolution_hours
       FROM grievances g
       WHERE ($1::text IS NULL OR g.department_id = $1)`,
      [scope],
    ),
    pool.query(
      `SELECT status, COUNT(*)::int AS count
       FROM grievances g
       WHERE ($1::text IS NULL OR g.department_id = $1)
       GROUP BY status`,
      [scope],
    ),
    pool.query(
      `SELECT category_id, COUNT(*)::int AS count
       FROM grievances g
       WHERE ($1::text IS NULL OR g.department_id = $1)
       GROUP BY category_id`,
      [scope],
    ),
    pool.query(
      `SELECT COALESCE(priority_level, 'UNASSIGNED') AS priority, COUNT(*)::int AS count
       FROM grievances g
       WHERE ($1::text IS NULL OR g.department_id = $1)
       GROUP BY priority_level`,
      [scope],
    ),
    pool.query(
      `SELECT department_id,
         COUNT(*)::int AS total,
         COUNT(*) FILTER (WHERE status IN ('SUBMITTED', 'AI_ANALYZED'))::int AS pending,
         COUNT(*) FILTER (WHERE status = 'ASSIGNED')::int AS assigned,
         COUNT(*) FILTER (WHERE status IN ('IN_PROGRESS', 'AWAITING_INFORMATION', 'REOPENED'))::int AS in_progress,
         COUNT(*) FILTER (WHERE status IN ('RESOLVED', 'CLOSED'))::int AS resolved,
         COUNT(*) FILTER (
           WHERE status NOT IN ('RESOLVED', 'CLOSED') AND sla_deadline < NOW()
         )::int AS overdue,
         COALESCE(AVG(EXTRACT(EPOCH FROM (resolved_at - created_at)) / 3600)
           FILTER (WHERE resolved_at IS NOT NULL), 0)::numeric AS average_resolution_hours
       FROM grievances g
       WHERE ($1::text IS NULL OR g.department_id = $1)
       GROUP BY department_id`,
      [scope],
    ),
    pool.query(
      `SELECT u.id AS officer_id, u.display_name AS officer_name, u.department_id,
         COUNT(g.id)::int AS assigned,
         COUNT(g.id) FILTER (WHERE g.status IN ('RESOLVED', 'CLOSED'))::int AS resolved,
         COUNT(g.id) FILTER (WHERE g.status NOT IN ('RESOLVED', 'CLOSED'))::int AS pending,
         COUNT(g.id) FILTER (
           WHERE g.status NOT IN ('RESOLVED', 'CLOSED') AND g.sla_deadline < NOW()
         )::int AS overdue
       FROM users u
       LEFT JOIN grievances g ON g.assigned_officer_id = u.id
         AND ($1::text IS NULL OR g.department_id = $1)
       WHERE u.role = 'officer' AND u.account_status = 'active'
         AND ($1::text IS NULL OR u.department_id = $1)
       GROUP BY u.id, u.display_name, u.department_id
       ORDER BY u.display_name, u.id`,
      [scope],
    ),
    pool.query(
      `SELECT to_char(created_at::date, 'YYYY-MM-DD') AS date, COUNT(*)::int AS count
       FROM grievances g
       WHERE created_at >= NOW() - INTERVAL '30 days'
         AND ($1::text IS NULL OR g.department_id = $1)
       GROUP BY created_at::date
       ORDER BY created_at::date`,
      [scope],
    ),
    pool.query(
      `SELECT to_char(resolved_at::date, 'YYYY-MM-DD') AS date, COUNT(*)::int AS count
       FROM grievances g
       WHERE resolved_at >= NOW() - INTERVAL '30 days'
         AND ($1::text IS NULL OR g.department_id = $1)
       GROUP BY resolved_at::date
       ORDER BY resolved_at::date`,
      [scope],
    ),
    pool.query(
      `SELECT to_char(h.changed_at::date, 'YYYY-MM-DD') AS date, COUNT(*)::int AS count
       FROM grievance_status_history h
       JOIN grievances g ON g.id = h.grievance_id
       WHERE h.to_status = 'ESCALATED'
         AND h.changed_at >= NOW() - INTERVAL '30 days'
         AND ($1::text IS NULL OR g.department_id = $1)
       GROUP BY h.changed_at::date
       ORDER BY h.changed_at::date`,
      [scope],
    ),
    pool.query(
      `SELECT
         COUNT(*) FILTER (
           WHERE status IN ('RESOLVED', 'CLOSED') AND resolved_at <= sla_deadline
         )::int AS compliant,
         COUNT(*) FILTER (
           WHERE status IN ('RESOLVED', 'CLOSED') AND resolved_at > sla_deadline
         )::int AS breached,
         COUNT(*) FILTER (
           WHERE status NOT IN ('RESOLVED', 'CLOSED') AND sla_deadline < NOW()
         )::int AS active_overdue,
         COUNT(*) FILTER (WHERE status IN ('RESOLVED', 'CLOSED'))::int AS total_resolved_with_sla
       FROM grievances g
       WHERE sla_deadline IS NOT NULL
         AND ($1::text IS NULL OR g.department_id = $1)`,
      [scope],
    ),
  ]);

  const summary = summaryResult.rows[0];
  const departmentsById = new Map<string, DepartmentAnalytics>(
    departmentResult.rows.map((row) => {
      const total = numberValue(row.total);
      const resolved = numberValue(row.resolved);
      const id = row.department_id || 'unassigned';
      return [id, {
        departmentId: id,
        departmentName: DEPARTMENT_NAMES[id] || (id === 'unassigned' ? 'Unassigned' : id),
        total,
        pending: numberValue(row.pending),
        assigned: numberValue(row.assigned),
        inProgress: numberValue(row.in_progress),
        resolved,
        overdue: numberValue(row.overdue),
        resolutionRate: total ? Number(((resolved / total) * 100).toFixed(1)) : 0,
        averageResolutionHours: Number(numberValue(row.average_resolution_hours).toFixed(1)),
      }];
    }),
  );

  const departments = (scope ? [scope] : [...DEPARTMENT_IDS, 'unassigned']).map((id) => (
    departmentsById.get(id) || {
      departmentId: id,
      departmentName: DEPARTMENT_NAMES[id] || (id === 'unassigned' ? 'Unassigned' : id),
      total: 0,
      pending: 0,
      assigned: 0,
      inProgress: 0,
      resolved: 0,
      overdue: 0,
      resolutionRate: 0,
      averageResolutionHours: 0,
    }
  ));

  const distribution = (rows: Array<{ status?: string; category_id?: string; priority?: string; count: unknown }>) =>
    Object.fromEntries(rows.map((row) => [
      row.status || row.category_id || row.priority || 'Unknown',
      numberValue(row.count),
    ]));
  const statusDistribution = distribution(statusResult.rows);
  const categoryDistribution = Object.fromEntries(categoryResult.rows.map((row) => [
    CATEGORY_NAMES[row.category_id] || row.category_id,
    numberValue(row.count),
  ]));
  const priorityDistribution = distribution(priorityResult.rows);
  const departmentWorkload = Object.fromEntries(departments.map((department) => [
    department.departmentName,
    department.total - department.resolved,
  ]));

  return {
    totalGrievances: numberValue(summary.total),
    pending: numberValue(summary.pending),
    assigned: numberValue(summary.assigned),
    inProgress: numberValue(summary.in_progress),
    resolved: numberValue(summary.resolved),
    overdue: numberValue(summary.overdue),
    slaAtRisk: numberValue(summary.sla_at_risk),
    escalated: numberValue(summary.escalated),
    avgResolutionHours: Number(numberValue(summary.avg_resolution_hours).toFixed(1)),
    statusDistribution,
    categoryDistribution,
    priorityDistribution,
    departmentWorkload,
    dailyVolume: dailyResult.rows.map((row) => ({ date: row.date, count: numberValue(row.count) })),
    resolutionTrend: resolutionResult.rows.map((row) => ({ date: row.date, count: numberValue(row.count) })),
    escalationTrend: escalationResult.rows.map((row) => ({ date: row.date, count: numberValue(row.count) })),
    slaPerformance: {
      compliant: numberValue(slaResult.rows[0].compliant),
      breached: numberValue(slaResult.rows[0].breached),
      activeOverdue: numberValue(slaResult.rows[0].active_overdue),
      totalResolvedWithSla: numberValue(slaResult.rows[0].total_resolved_with_sla),
    },
    departments,
    officers: officerResult.rows.map((row) => ({
      officerId: row.officer_id,
      officerName: row.officer_name,
      ...(row.department_id ? { departmentId: row.department_id } : {}),
      assigned: numberValue(row.assigned),
      resolved: numberValue(row.resolved),
      pending: numberValue(row.pending),
      overdue: numberValue(row.overdue),
    })),
  };
}

export interface GrievanceMapMarker {
  latitude: number;
  longitude: number;
  categoryId: string;
  priorityLevel?: string;
  status: string;
}

export async function getGrievanceMapMarkers(filters: {
  departmentId?: string;
  categoryId?: string;
  priorityLevel?: string;
  status?: string;
}): Promise<GrievanceMapMarker[]> {
  const result = await getDatabasePool().query(
    `SELECT latitude, longitude, category_id, priority_level, status
     FROM grievances
     WHERE latitude IS NOT NULL AND longitude IS NOT NULL
       AND ($1::text IS NULL OR department_id = $1)
       AND ($2::text IS NULL OR category_id = $2)
       AND ($3::text IS NULL OR priority_level = $3)
       AND ($4::text IS NULL OR status = $4)
     ORDER BY created_at DESC
     LIMIT 5000`,
    [
      filters.departmentId ?? null,
      filters.categoryId ?? null,
      filters.priorityLevel ?? null,
      filters.status ?? null,
    ],
  );
  return result.rows.map((row) => ({
    latitude: Number(row.latitude),
    longitude: Number(row.longitude),
    categoryId: row.category_id,
    ...(row.priority_level ? { priorityLevel: row.priority_level } : {}),
    status: row.status,
  }));
}
