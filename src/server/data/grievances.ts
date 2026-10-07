import { randomUUID } from 'node:crypto';
import type { PoolClient, QueryResultRow } from 'pg';
import { getDatabasePool, withDatabaseTransaction } from '@/server/db';
import { stripDecorativeSymbols } from '@/lib/text';
import { priorityLevelFromScore, type PriorityBreakdown } from '@/server/ai/priority-engine';
import type {
  Attachment,
  CitizenUpdate,
  Feedback,
  Grievance,
  GrievanceAnalysis,
  GrievanceAIDecisionRecord,
  GrievanceAIDecisionValue,
  GrievanceAIRecommendationContent,
  GrievanceLocation,
  GrievanceResolution,
  GrievanceStatus,
  InternalNote,
  PriorityLevel,
  StatusHistoryEntry,
  UserRole,
} from '@/lib/types';
import type { AIAnalysisResult, AIResolutionResult } from '@/server/ai/ai-service';
import type { DuplicateCandidate } from '@/server/ai/duplicate-detection';
import {
  insertNotification,
  notifyActiveAdministrators,
  notifyDepartmentAdministrators,
  notifyDepartmentOfficers,
} from '@/server/data/notifications';
import {
  impactLevelSchema,
  priorityLevelSchema,
  urgencyLevelSchema,
  grievanceRecommendationSchema,
  grievanceAIDecisionValueSchema,
  type GrievanceCreateInput,
  type GrievanceUpdateInput,
} from '@/server/validation/grievance';

const categoryDetails: Record<string, { name: string; departmentId: string; departmentName: string }> = {
  'cat-water-supply': { name: 'Water Supply Issue', departmentId: 'dept-water', departmentName: 'Water Supply' },
  'cat-sewerage': { name: 'Sewerage/Drainage', departmentId: 'dept-water', departmentName: 'Water Supply' },
  'cat-potholes': { name: 'Potholes/Road Damage', departmentId: 'dept-roads', departmentName: 'Roads & Infrastructure' },
  'cat-footpaths': { name: 'Footpath Encroachment', departmentId: 'dept-roads', departmentName: 'Roads & Infrastructure' },
  'cat-garbage': { name: 'Garbage Collection', departmentId: 'dept-sanitation', departmentName: 'Sanitation' },
  'cat-public-toilets': { name: 'Public Toilets', departmentId: 'dept-sanitation', departmentName: 'Sanitation' },
  'cat-streetlights': { name: 'Streetlights', departmentId: 'dept-electrical', departmentName: 'Electrical' },
  'cat-power': { name: 'Power Cut', departmentId: 'dept-electrical', departmentName: 'Electrical' },
  'cat-hazards': { name: 'Safety Hazards', departmentId: 'dept-safety', departmentName: 'Public Safety' },
  'cat-stray-animals': { name: 'Stray Animals', departmentId: 'dept-safety', departmentName: 'Public Safety' },
  'cat-health': { name: 'Public Health', departmentId: 'dept-health', departmentName: 'Healthcare' },
  'cat-schools': { name: 'Public Schools', departmentId: 'dept-edu', departmentName: 'Education' },
  'cat-transit': { name: 'Public Transit', departmentId: 'dept-transport', departmentName: 'Transport' },
};

interface GrievanceRow extends QueryResultRow {
  id: string;
  citizen_id: string;
  title: string;
  description: string;
  category_id: string;
  street_address: string | null;
  area: string | null;
  ward: string | null;
  city: string;
  duration: string | null;
  affected_count: number | null;
  previous_complaint_reference: string | null;
  latitude: string | number | null;
  longitude: string | number | null;
  status: GrievanceStatus;
  priority_score: number | null;
  priority_level: PriorityLevel | null;
  department_id: string | null;
  assigned_officer_id: string | null;
  sla_deadline: Date | string | null;
  complaint_letter: string | null;
  created_at: Date | string;
  updated_at: Date | string;
  resolved_at: Date | string | null;
  attachments: Array<{
    id: string;
    fileName: string;
    fileType: string;
    fileSize: number;
    storageRef: string | null;
    uploadedAt: Date | string;
  }>;
}

interface AnalysisRow extends QueryResultRow {
  id: string;
  grievance_id: string;
  summary: string;
  category: string;
  subcategory: string | null;
  issue_type: string | null;
  extracted_location: string | null;
  extracted_duration: string | null;
  affected_population: string | null;
  urgency: GrievanceAnalysis['urgency'];
  impact: GrievanceAnalysis['impact'];
  safety_risk: boolean;
  reasoning: string[];
  confidence: number | null;
  ai_provider: GrievanceAnalysis['aiProvider'] | null;
  created_at: Date | string;
}

const grievanceSelect = `
  SELECT g.*,
    COALESCE((
      SELECT json_agg(json_build_object(
        'id', a.id,
        'fileName', a.file_name,
        'fileType', a.file_type,
        'fileSize', a.file_size,
        'storageRef', a.storage_ref,
        'uploadedAt', a.uploaded_at
      ) ORDER BY a.uploaded_at)
      FROM grievance_attachments a WHERE a.grievance_id = g.id
    ), '[]'::json) AS attachments
  FROM grievances g`;

function toIso(value: Date | string | null): string | undefined {
  if (value === null) return undefined;
  return value instanceof Date ? value.toISOString() : new Date(value).toISOString();
}

function mapAttachment(row: GrievanceRow['attachments'][number], grievanceId: string): Attachment {
  return {
    id: row.id,
    grievanceId,
    fileName: stripDecorativeSymbols(row.fileName),
    fileType: row.fileType,
    fileSize: Number(row.fileSize),
    storageRef: row.storageRef,
    uploadedAt: toIso(row.uploadedAt)!,
    ...(row.storageRef ? { filePath: row.storageRef } : {}),
  };
}

function mapGrievance(row: GrievanceRow): Grievance {
  const priorityScore = row.priority_score === null ? undefined : Number(row.priority_score);
  const storedPriorityLevel = row.priority_level === null
    ? undefined
    : priorityLevelSchema.parse(row.priority_level);
  const derivedPriorityLevel = priorityScore === undefined
    ? storedPriorityLevel
    : priorityLevelFromScore(priorityScore);
  if (storedPriorityLevel && derivedPriorityLevel && storedPriorityLevel !== derivedPriorityLevel) {
    throw new Error(`Persisted grievance priority is inconsistent for grievance ${row.id}.`);
  }

  const location: GrievanceLocation = {
    ...(row.street_address ? { address: stripDecorativeSymbols(row.street_address) } : {}),
    ...(row.area ? { area: stripDecorativeSymbols(row.area) } : {}),
    ...(row.ward ? { ward: stripDecorativeSymbols(row.ward) } : {}),
    city: stripDecorativeSymbols(row.city),
    ...(row.latitude !== null ? { latitude: Number(row.latitude) } : {}),
    ...(row.longitude !== null ? { longitude: Number(row.longitude) } : {}),
  };

  return {
    id: row.id,
    citizenId: row.citizen_id,
    title: stripDecorativeSymbols(row.title),
    description: stripDecorativeSymbols(row.description),
    categoryId: row.category_id,
    category: categoryDetails[row.category_id]?.name,
    location,
    ...(row.duration ? { duration: stripDecorativeSymbols(row.duration) } : {}),
    ...(row.affected_count !== null ? { affectedCount: row.affected_count } : {}),
    ...(row.previous_complaint_reference
      ? { previousComplaintId: stripDecorativeSymbols(row.previous_complaint_reference) }
      : {}),
    status: row.status,
    ...(priorityScore !== undefined ? { priorityScore } : {}),
    ...(derivedPriorityLevel ? { priorityLevel: derivedPriorityLevel, priority: derivedPriorityLevel } : {}),
    ...(row.department_id ? { departmentId: row.department_id } : {}),
    ...(row.assigned_officer_id ? { assignedOfficerId: row.assigned_officer_id } : {}),
    ...(row.sla_deadline ? { slaDeadline: toIso(row.sla_deadline) } : {}),
    createdAt: toIso(row.created_at)!,
    updatedAt: toIso(row.updated_at)!,
    ...(row.resolved_at ? { resolvedAt: toIso(row.resolved_at) } : {}),
    attachments: (row.attachments || []).map((attachment) => mapAttachment(attachment, row.id)),
    ...(row.complaint_letter ? { complaintLetter: stripDecorativeSymbols(row.complaint_letter) } : {}),
  };
}

function mapAnalysis(row: AnalysisRow): GrievanceAnalysis {
  return {
    id: row.id,
    grievanceId: row.grievance_id,
    summary: stripDecorativeSymbols(row.summary),
    category: stripDecorativeSymbols(row.category),
    ...(row.subcategory ? { subcategory: stripDecorativeSymbols(row.subcategory) } : {}),
    ...(row.issue_type ? { issueType: stripDecorativeSymbols(row.issue_type) } : {}),
    ...(row.extracted_location ? { extractedLocation: stripDecorativeSymbols(row.extracted_location) } : {}),
    ...(row.extracted_duration ? { extractedDuration: stripDecorativeSymbols(row.extracted_duration) } : {}),
    ...(row.affected_population ? { affectedPopulation: stripDecorativeSymbols(row.affected_population) } : {}),
    urgency: urgencyLevelSchema.parse(row.urgency),
    impact: impactLevelSchema.parse(row.impact),
    safetyRisk: row.safety_risk,
    reasoning: row.reasoning.map(stripDecorativeSymbols),
    ...(row.confidence !== null ? { confidence: Number(row.confidence) } : {}),
    ...(row.ai_provider ? { aiProvider: row.ai_provider } : {}),
    createdAt: toIso(row.created_at)!,
  };
}

async function selectGrievance(client: PoolClient, id: string): Promise<Grievance | undefined> {
  const result = await client.query<GrievanceRow>(`${grievanceSelect} WHERE g.id = $1`, [id]);
  return result.rows[0] ? mapGrievance(result.rows[0]) : undefined;
}

export function isValidGrievanceId(id: string): boolean {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(id);
}

export function getDepartmentForCategory(categoryId: string): string | undefined {
  return categoryDetails[categoryId]?.departmentId;
}

export interface ActiveOfficer {
  id: string;
  name: string;
  email: string;
  role: 'officer';
  status: 'active';
  departmentId?: string;
  openCases: number;
}

export async function listActiveOfficers(departmentId?: string): Promise<ActiveOfficer[]> {
  const result = await getDatabasePool().query(
    `SELECT u.id, u.display_name AS name, u.email, u.role,
            u.account_status AS status, u.department_id,
            COUNT(g.id) FILTER (WHERE g.status NOT IN ('RESOLVED', 'CLOSED'))::int AS open_cases
     FROM users u
     LEFT JOIN grievances g ON g.assigned_officer_id = u.id
     WHERE u.role = 'officer' AND u.account_status = 'active'
       AND ($1::text IS NULL OR u.department_id = $1)
     GROUP BY u.id
     ORDER BY u.display_name, u.id`,
    [departmentId ?? null],
  );
  return result.rows.map((row) => ({
    id: row.id,
    name: row.name,
    email: row.email,
    role: 'officer' as const,
    status: 'active' as const,
    ...(row.department_id ? { departmentId: row.department_id } : {}),
    openCases: Number(row.open_cases),
  }));
}

export async function updateOfficerDepartment(
  officerId: string,
  departmentId: string | null,
): Promise<'updated' | 'not_found' | 'has_assigned_cases'> {
  return withDatabaseTransaction(async (client) => {
    const officer = await client.query(
      `SELECT id FROM users
       WHERE id = $1 AND role = 'officer' AND account_status = 'active'
       FOR UPDATE`,
      [officerId],
    );
    if (officer.rowCount !== 1) return 'not_found';

    if (departmentId) {
      const assignments = await client.query(
        `SELECT 1 FROM grievances
         WHERE assigned_officer_id = $1
           AND department_id IS NOT NULL
           AND department_id <> $2
           AND status NOT IN ('RESOLVED', 'CLOSED')
         LIMIT 1`,
        [officerId, departmentId],
      );
      if (assignments.rowCount) return 'has_assigned_cases';
    }

    await client.query(
      `UPDATE users SET department_id = $2, updated_at = NOW() WHERE id = $1`,
      [officerId, departmentId],
    );
    return 'updated';
  });
}

export interface OfficerDashboardStats {
  assigned: number;
  unprocessed: number;
  inProgress: number;
  awaitingInformation: number;
  resolved: number;
  slaAtRisk: number;
  overdue: number;
  escalated: number;
  critical: number;
  high: number;
  medium: number;
  low: number;
}

export async function getOfficerDashboardStats(officerId: string): Promise<OfficerDashboardStats> {
  const result = await getDatabasePool().query(
    `SELECT
       COUNT(*)::int AS assigned,
       COUNT(*) FILTER (WHERE status IN ('ASSIGNED', 'REOPENED'))::int AS unprocessed,
       COUNT(*) FILTER (WHERE status = 'IN_PROGRESS')::int AS in_progress,
       COUNT(*) FILTER (WHERE status = 'AWAITING_INFORMATION')::int AS awaiting_information,
       COUNT(*) FILTER (WHERE status IN ('RESOLVED', 'CLOSED'))::int AS resolved,
       COUNT(*) FILTER (WHERE status = 'SLA_AT_RISK')::int AS sla_at_risk,
       COUNT(*) FILTER (WHERE status = 'ESCALATED')::int AS escalated,
       COUNT(*) FILTER (
         WHERE sla_deadline <= NOW() AND status NOT IN ('RESOLVED', 'CLOSED')
       )::int AS overdue,
       COUNT(*) FILTER (WHERE priority_level = 'CRITICAL')::int AS critical,
       COUNT(*) FILTER (WHERE priority_level = 'HIGH')::int AS high,
       COUNT(*) FILTER (WHERE priority_level = 'MEDIUM')::int AS medium,
       COUNT(*) FILTER (WHERE priority_level = 'LOW')::int AS low
     FROM grievances
     WHERE assigned_officer_id = $1`,
    [officerId],
  );
  const row = result.rows[0];
  return {
    assigned: row.assigned,
    unprocessed: row.unprocessed,
    inProgress: row.in_progress,
    awaitingInformation: row.awaiting_information,
    resolved: row.resolved,
    slaAtRisk: row.sla_at_risk,
    overdue: row.overdue,
    escalated: row.escalated,
    critical: row.critical,
    high: row.high,
    medium: row.medium,
    low: row.low,
  };
}

export interface GrievanceParticipants {
  citizenName: string;
  citizenPhone?: string;
  assignedOfficerName?: string;
  assignedOfficerEmail?: string;
  assignedOfficerDepartmentId?: string;
}

export type PersistedGrievanceRecommendation = AIResolutionResult & {
  id: string;
  grievanceId: string;
  generatedBy: string;
  createdAt: string;
};

function mapGrievanceRecommendation(row: QueryResultRow): PersistedGrievanceRecommendation {
  return {
    ...grievanceRecommendationSchema.parse(row.recommendation),
    id: row.id,
    grievanceId: row.grievance_id,
    generatedBy: row.generated_by,
    createdAt: toIso(row.created_at)!,
  };
}

export async function getLatestGrievanceRecommendation(
  grievanceId: string,
): Promise<PersistedGrievanceRecommendation | undefined> {
  const result = await getDatabasePool().query(
    `SELECT id, grievance_id, generated_by, recommendation, created_at
     FROM grievance_ai_recommendations
     WHERE grievance_id = $1
     ORDER BY created_at DESC
     LIMIT 1`,
    [grievanceId],
  );
  return result.rows[0] ? mapGrievanceRecommendation(result.rows[0]) : undefined;
}

export async function getLatestGrievanceAIDecision(
  grievanceId: string,
): Promise<GrievanceAIDecisionRecord | undefined> {
  const result = await getDatabasePool().query(
    `SELECT id, grievance_id, recommendation_id, officer_id, decision,
            original_recommendation, final_recommendation, officer_note, created_at
     FROM grievance_ai_decisions
     WHERE grievance_id = $1
     ORDER BY created_at DESC
     LIMIT 1`,
    [grievanceId],
  );
  const row = result.rows[0];
  if (!row) return undefined;
  return {
    id: row.id,
    grievanceId: row.grievance_id,
    recommendationId: row.recommendation_id,
    officerId: row.officer_id,
    decision: grievanceAIDecisionValueSchema.parse(row.decision),
    originalRecommendation: grievanceRecommendationSchema.parse(row.original_recommendation),
    finalRecommendation: row.final_recommendation === null
      ? null
      : grievanceRecommendationSchema.parse(row.final_recommendation),
    ...(row.officer_note ? { officerNote: row.officer_note } : {}),
    createdAt: toIso(row.created_at)!,
  };
}

export async function persistGrievanceRecommendation(
  grievanceId: string,
  officerId: string,
  recommendation: AIResolutionResult,
): Promise<PersistedGrievanceRecommendation | undefined> {
  const validatedRecommendation = grievanceRecommendationSchema.parse(recommendation);
  return withDatabaseTransaction(async (client) => {
    const grievance = await client.query(
      `SELECT 1 FROM grievances
       WHERE id = $1 AND assigned_officer_id = $2
       FOR UPDATE`,
      [grievanceId, officerId],
    );
    if (grievance.rowCount !== 1) return undefined;

    const analysis = await client.query(
      `SELECT 1 FROM grievance_analyses WHERE grievance_id = $1 LIMIT 1`,
      [grievanceId],
    );
    if (analysis.rowCount !== 1) return undefined;

    const result = await client.query(
      `INSERT INTO grievance_ai_recommendations
        (grievance_id, generated_by, recommendation)
       VALUES ($1, $2, $3::jsonb)
       RETURNING id, grievance_id, generated_by, recommendation, created_at`,
      [grievanceId, officerId, JSON.stringify(validatedRecommendation)],
    );
    return mapGrievanceRecommendation(result.rows[0]);
  });
}

export type PersistGrievanceAIDecisionResult =
  | { ok: true; decision: GrievanceAIDecisionRecord }
  | { ok: false; reason: 'not_assigned' | 'no_recommendation' | 'already_decided' };

export async function persistGrievanceAIDecision(
  grievanceId: string,
  officerId: string,
  decision: GrievanceAIDecisionValue,
  finalRecommendation?: AIResolutionResult,
  officerNote?: string,
): Promise<PersistGrievanceAIDecisionResult> {
  const validatedFinalRecommendation = finalRecommendation
    ? grievanceRecommendationSchema.parse(finalRecommendation)
    : undefined;

  return withDatabaseTransaction(async (client) => {
    const grievance = await client.query(
      `SELECT 1 FROM grievances
       WHERE id = $1 AND assigned_officer_id = $2
       FOR UPDATE`,
      [grievanceId, officerId],
    );
    if (grievance.rowCount !== 1) return { ok: false, reason: 'not_assigned' };

    const recommendationResult = await client.query(
      `SELECT id, recommendation
       FROM grievance_ai_recommendations
       WHERE grievance_id = $1
       ORDER BY created_at DESC
       LIMIT 1`,
      [grievanceId],
    );
    const recommendationRow = recommendationResult.rows[0];
    if (!recommendationRow) return { ok: false, reason: 'no_recommendation' };

    const existingDecision = await client.query(
      `SELECT 1 FROM grievance_ai_decisions WHERE recommendation_id = $1 LIMIT 1`,
      [recommendationRow.id],
    );
    if (existingDecision.rowCount) return { ok: false, reason: 'already_decided' };

    if (decision === 'MODIFIED' && !validatedFinalRecommendation) {
      throw new Error('A modified recommendation requires a final recommendation.');
    }
    const originalRecommendation = grievanceRecommendationSchema.parse(recommendationRow.recommendation);
    let final: GrievanceAIRecommendationContent | null = null;
    if (decision === 'ACCEPTED') final = originalRecommendation;
    if (decision === 'MODIFIED') {
      if (!validatedFinalRecommendation) {
        throw new Error('A modified recommendation requires a final recommendation.');
      }
      final = validatedFinalRecommendation;
    }

    const result = await client.query(
      `INSERT INTO grievance_ai_decisions (
        grievance_id, recommendation_id, officer_id, decision,
        original_recommendation, final_recommendation, officer_note
      ) VALUES ($1, $2, $3, $4, $5::jsonb, $6::jsonb, $7)
      RETURNING id, grievance_id, recommendation_id, officer_id, decision,
                original_recommendation, final_recommendation, officer_note, created_at`,
      [
        grievanceId,
        recommendationRow.id,
        officerId,
        decision,
        JSON.stringify(originalRecommendation),
        final ? JSON.stringify(final) : null,
        officerNote ?? null,
      ],
    );
    const row = result.rows[0];
    return {
      ok: true,
      decision: {
        id: row.id,
        grievanceId: row.grievance_id,
        recommendationId: row.recommendation_id,
        officerId: row.officer_id,
        decision: grievanceAIDecisionValueSchema.parse(row.decision),
        originalRecommendation: grievanceRecommendationSchema.parse(row.original_recommendation),
        finalRecommendation: row.final_recommendation === null
          ? null
          : grievanceRecommendationSchema.parse(row.final_recommendation),
        ...(row.officer_note ? { officerNote: row.officer_note } : {}),
        createdAt: toIso(row.created_at)!,
      },
    };
  });
}

export async function getGrievanceParticipants(id: string): Promise<GrievanceParticipants | undefined> {
  const result = await getDatabasePool().query(
    `SELECT citizen.display_name AS citizen_name,
            profile.phone_number AS citizen_phone,
            officer.display_name AS assigned_officer_name,
            officer.email AS assigned_officer_email,
            officer.department_id AS assigned_officer_department_id
     FROM grievances g
     JOIN users citizen ON citizen.id = g.citizen_id
     LEFT JOIN citizen_profiles profile ON profile.user_id = citizen.id
     LEFT JOIN users officer ON officer.id = g.assigned_officer_id
     WHERE g.id = $1`,
    [id],
  );
  const row = result.rows[0];
  if (!row) return undefined;
  return {
    citizenName: row.citizen_name,
    ...(row.citizen_phone ? { citizenPhone: row.citizen_phone } : {}),
    ...(row.assigned_officer_name ? { assignedOfficerName: row.assigned_officer_name } : {}),
    ...(row.assigned_officer_email ? { assignedOfficerEmail: row.assigned_officer_email } : {}),
    ...(row.assigned_officer_department_id
      ? { assignedOfficerDepartmentId: row.assigned_officer_department_id }
      : {}),
  };
}

export type AssignGrievanceResult =
  | { ok: true; grievance: Grievance }
  | { ok: false; reason: 'not_found' | 'inactive_officer' | 'department_mismatch' | 'closed' };

export async function assignGrievanceToOfficer(
  grievanceId: string,
  officerId: string,
  actor: { userId: string; role: UserRole; departmentId?: string },
): Promise<AssignGrievanceResult> {
  return withDatabaseTransaction(async (client) => {
    const grievanceResult = await client.query<GrievanceRow>(
      `${grievanceSelect}
       WHERE g.id = $1
         AND ($2::text <> 'department_admin' OR g.department_id = $3)
       FOR UPDATE OF g`,
      [grievanceId, actor.role, actor.departmentId ?? null],
    );
    const currentRow = grievanceResult.rows[0];
    if (!currentRow) return { ok: false, reason: 'not_found' };
    if (currentRow.status === 'RESOLVED' || currentRow.status === 'CLOSED') {
      return { ok: false, reason: 'closed' };
    }

    const officerResult = await client.query(
      `SELECT department_id FROM users
       WHERE id = $1 AND role = 'officer' AND account_status = 'active'
       FOR SHARE`,
      [officerId],
    );
    if (officerResult.rowCount !== 1) return { ok: false, reason: 'inactive_officer' };

    const officerDepartmentId = officerResult.rows[0].department_id as string | null;
    if (
      (actor.role === 'department_admin' &&
        (!actor.departmentId || currentRow.department_id !== actor.departmentId ||
          officerDepartmentId !== actor.departmentId)) ||
      currentRow.department_id &&
      officerDepartmentId &&
      currentRow.department_id !== officerDepartmentId
    ) {
      return { ok: false, reason: 'department_mismatch' };
    }

    const wasReassigned = currentRow.assigned_officer_id !== officerId;
    await client.query(
      `UPDATE grievances
       SET assigned_officer_id = $2, status = 'ASSIGNED', updated_at = NOW()
       WHERE id = $1`,
      [grievanceId, officerId],
    );

    if (currentRow.status !== 'ASSIGNED' || wasReassigned) {
      await client.query(
        `INSERT INTO grievance_status_history
          (grievance_id, from_status, to_status, changed_by, changed_by_role, note)
           VALUES ($1, $2, 'ASSIGNED', $3, $4, $5)`,
        [
          grievanceId,
          currentRow.status,
            actor.userId,
            actor.role,
            wasReassigned && currentRow.assigned_officer_id
              ? 'Grievance reassigned by administrator'
              : 'Grievance assigned by administrator',
        ],
      );
    }
    if (wasReassigned) {
      await client.query(
        `INSERT INTO grievance_citizen_updates (grievance_id, message, is_public)
         VALUES ($1, 'Your grievance has been assigned to an officer.', TRUE)`,
        [grievanceId],
      );
      await insertNotification(client, {
        userId: currentRow.citizen_id,
        grievanceId,
        eventKey: `assignment:${grievanceId}:${officerId}:${randomUUID()}`,
        type: 'complaint_assigned',
        title: 'Officer assigned',
        message: 'An officer has been assigned to your complaint.',
      });
      await insertNotification(client, {
        userId: officerId,
        grievanceId,
        eventKey: `new-assignment:${grievanceId}:${officerId}:${randomUUID()}`,
        type: 'new_assignment',
        title: 'Complaint assigned to you',
        message: `Complaint ${grievanceId} has been assigned to you.`,
      });
      if (currentRow.department_id) {
        await notifyDepartmentAdministrators(client, currentRow.department_id, {
          grievanceId,
          type: 'complaint_assigned',
          title: 'Officer assigned',
          message: `An officer was assigned to complaint ${grievanceId}.`,
        });
      }
    }

    const grievance = await selectGrievance(client, grievanceId);
    if (!grievance) throw new Error('Assigned grievance could not be reloaded.');
    return { ok: true, grievance };
  });
}

export type OfficerStatusChangeResult =
  | { ok: true; grievance: Grievance }
  | { ok: false; reason: 'not_assigned' | 'invalid_transition' };

export async function changeOfficerGrievanceStatus(
  grievanceId: string,
  officerId: string,
  status: Extract<GrievanceStatus, 'IN_PROGRESS' | 'AWAITING_INFORMATION' | 'RESOLVED'>,
  citizenMessage?: string,
): Promise<OfficerStatusChangeResult> {
  return withDatabaseTransaction(async (client) => {
    const result = await client.query<GrievanceRow>(
      `${grievanceSelect}
       WHERE g.id = $1 AND g.assigned_officer_id = $2
       FOR UPDATE OF g`,
      [grievanceId, officerId],
    );
    const currentRow = result.rows[0];
    if (!currentRow) return { ok: false, reason: 'not_assigned' };

    const permittedTransitions: Record<string, string[]> = {
      ASSIGNED: ['IN_PROGRESS'],
      IN_PROGRESS: ['AWAITING_INFORMATION', 'RESOLVED'],
      AWAITING_INFORMATION: ['IN_PROGRESS'],
      REOPENED: ['IN_PROGRESS'],
    };
    if (!permittedTransitions[currentRow.status]?.includes(status)) {
      return { ok: false, reason: 'invalid_transition' };
    }

    await client.query(
      `UPDATE grievances
       SET status = $2, resolved_at = CASE WHEN $2 = 'RESOLVED' THEN NOW() ELSE NULL END,
           updated_at = NOW()
       WHERE id = $1`,
      [grievanceId, status],
    );
    await client.query(
      `INSERT INTO grievance_status_history
        (grievance_id, from_status, to_status, changed_by, changed_by_role, note)
       VALUES ($1, $2, $3, $4, 'officer', $5)`,
      [
        grievanceId,
        currentRow.status,
        status,
        officerId,
        status === 'AWAITING_INFORMATION'
          ? 'Officer requested additional information'
          : status === 'RESOLVED'
            ? 'Officer resolved grievance'
            : 'Officer started work',
      ],
    );
    if (status === 'RESOLVED') {
      await client.query(
        `INSERT INTO grievance_resolutions
          (grievance_id, resolved_by, resolved_by_role, details, resolved_at)
         VALUES ($1, $2, 'officer', $3, NOW())`,
        [grievanceId, officerId, citizenMessage || 'The assigned officer marked the grievance as resolved.'],
      );
    }

    if (citizenMessage && (status === 'AWAITING_INFORMATION' || status === 'RESOLVED')) {
      await client.query(
        `INSERT INTO grievance_citizen_updates (grievance_id, message, is_public)
         VALUES ($1, $2, TRUE)`,
        [grievanceId, citizenMessage],
      );
    }

    const notificationType = status === 'AWAITING_INFORMATION'
      ? 'info_requested'
      : status === 'RESOLVED'
        ? 'complaint_resolved'
        : 'status_updated';
    await insertNotification(client, {
      userId: currentRow.citizen_id,
      grievanceId,
      eventKey: `status:${grievanceId}:${status}:${randomUUID()}`,
      type: notificationType,
      title: status === 'AWAITING_INFORMATION'
        ? 'More information requested'
        : status === 'RESOLVED'
          ? 'Complaint marked resolved'
          : 'Complaint status updated',
      message: status === 'AWAITING_INFORMATION'
        ? citizenMessage || 'The officer needs more information to continue.'
        : status === 'RESOLVED'
          ? citizenMessage || 'The officer marked your complaint as resolved.'
          : 'Your complaint is now in progress.',
    });
    if (status === 'RESOLVED') {
      await insertNotification(client, {
        userId: currentRow.citizen_id,
        grievanceId,
        eventKey: `feedback-requested:${grievanceId}:${randomUUID()}`,
        type: 'feedback_requested',
        title: 'Share resolution feedback',
        message: 'Please confirm the outcome and rate your resolution experience.',
      });
      await notifyActiveAdministrators(client, {
        grievanceId,
        type: 'complaint_resolved',
        title: 'Complaint resolved',
        message: `Complaint ${grievanceId} was marked resolved.`,
      });
      if (currentRow.department_id) {
        await notifyDepartmentAdministrators(client, currentRow.department_id, {
          grievanceId,
          type: 'complaint_resolved',
          title: 'Complaint resolved',
          message: `Complaint ${grievanceId} was marked resolved.`,
        });
      }
    }

    const grievance = await selectGrievance(client, grievanceId);
    if (!grievance) throw new Error('Updated grievance could not be reloaded.');
    return { ok: true, grievance };
  });
}

export type EscalateGrievanceResult =
  | { ok: true; grievance: Grievance }
  | { ok: false; reason: 'not_found' | 'closed' };

export async function escalateGrievance(
  grievanceId: string,
  actor: { userId: string; role: UserRole; departmentId?: string },
): Promise<EscalateGrievanceResult> {
  return withDatabaseTransaction(async (client) => {
    const result = await client.query<GrievanceRow>(
      `${grievanceSelect}
       WHERE g.id = $1
         AND ($2::text <> 'officer' OR g.assigned_officer_id = $3)
         AND ($2::text <> 'department_admin' OR g.department_id = $4)
       FOR UPDATE OF g`,
      [grievanceId, actor.role, actor.userId, actor.departmentId ?? null],
    );
    const current = result.rows[0];
    if (!current) return { ok: false, reason: 'not_found' };
    if (current.status === 'RESOLVED' || current.status === 'CLOSED') {
      return { ok: false, reason: 'closed' };
    }
    if (current.status !== 'ESCALATED') {
      await client.query(
        `UPDATE grievances SET status = 'ESCALATED', updated_at = NOW() WHERE id = $1`,
        [grievanceId],
      );
      await client.query(
        `INSERT INTO grievance_status_history
          (grievance_id, from_status, to_status, changed_by, changed_by_role, note)
         VALUES ($1, $2, 'ESCALATED', $3, $4, 'Grievance escalated')`,
        [grievanceId, current.status, actor.userId, actor.role],
      );
      await insertNotification(client, {
        userId: current.citizen_id,
        grievanceId,
        eventKey: `escalation:${grievanceId}:${randomUUID()}`,
        type: 'complaint_escalated',
        title: 'Complaint escalated',
        message: 'Your complaint has been escalated for urgent review.',
      });
      if (current.assigned_officer_id) {
        await insertNotification(client, {
          userId: current.assigned_officer_id,
          grievanceId,
          eventKey: `escalation-officer:${grievanceId}:${randomUUID()}`,
          type: 'complaint_escalated',
          title: 'Assigned complaint escalated',
          message: `Complaint ${grievanceId} was escalated.`,
        });
      }
      await notifyActiveAdministrators(client, {
        grievanceId,
        type: 'complaint_escalated',
        title: 'Complaint escalated',
        message: `Complaint ${grievanceId} requires escalation review.`,
      });
      if (current.department_id) {
        await notifyDepartmentAdministrators(client, current.department_id, {
          grievanceId,
          type: 'complaint_escalated',
          title: 'Complaint escalated',
          message: `Complaint ${grievanceId} requires escalation review.`,
        });
      }
    }
    const grievance = await selectGrievance(client, grievanceId);
    if (!grievance) throw new Error('Escalated grievance could not be reloaded.');
    return { ok: true, grievance };
  });
}

export async function createGrievance(
  citizenId: string,
  citizenName: string,
  input: GrievanceCreateInput,
): Promise<Grievance> {
  const id = randomUUID();
  const category = categoryDetails[input.categoryId];
  const location = input.location;
  const complaintLetter = `To the ${category.departmentName},\n\nSubject: Citizen Grievance / Student Issue Complaint\n\nDear Sir/Madam,\n\nI, ${citizenName}, am filing this complaint regarding the issue titled "${input.title}".\n\nIssue Details:\n- Category: ${category.name}\n- Location: ${location.address || location.area || location.ward || 'Not specified'}, ${location.city}\n- Description: ${input.description}\n- Duration: ${input.duration || 'Not specified'}\n- Affected count: ${input.affectedCount ?? 'Not specified'}\n\nThis issue affects public safety and welfare and requires prompt review and resolution. Kindly treat this as an urgent matter and provide an update on the action taken.\n\nSincerely,\n${citizenName}\nCitizen / Complainant`;

  return withDatabaseTransaction(async (client) => {
    const inserted = await client.query<GrievanceRow>(
      `INSERT INTO grievances (
        id, citizen_id, title, description, category_id, street_address, area, ward, city,
        duration, affected_count, previous_complaint_reference, latitude, longitude,
        status, department_id, complaint_letter
      ) VALUES (
        $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14,
        'SUBMITTED', $15, $16
      ) RETURNING *`,
      [
        id, citizenId, input.title, input.description, input.categoryId,
        location.address || null, location.area || null, location.ward || null, location.city,
        input.duration || null, input.affectedCount ?? null, input.previousComplaintId || null,
        location.latitude ?? null, location.longitude ?? null, category.departmentId, complaintLetter,
      ],
    );

    for (const attachment of input.attachments) {
      await client.query(
        `INSERT INTO grievance_attachments (grievance_id, file_name, file_type, file_size)
         VALUES ($1, $2, $3, $4)`,
        [id, attachment.fileName, attachment.fileType, attachment.fileSize],
      );
    }

    await client.query(
      `INSERT INTO grievance_status_history
        (grievance_id, from_status, to_status, changed_by, changed_by_role, note)
       VALUES ($1, NULL, 'SUBMITTED', $2, 'citizen', 'Grievance submitted')`,
      [id, citizenId],
    );
    await insertNotification(client, {
      userId: citizenId,
      grievanceId: id,
      eventKey: `submitted:${id}:${citizenId}`,
      type: 'complaint_received',
      title: 'Complaint submitted',
      message: `Your complaint ${id} has been submitted.`,
    });
    await insertNotification(client, {
      userId: citizenId,
      grievanceId: id,
      eventKey: `department-assigned:${id}:${citizenId}`,
      type: 'department_assigned',
      title: 'Department assigned',
      message: `Your complaint was routed to ${category.departmentName}.`,
    });
    await notifyDepartmentOfficers(client, {
      grievanceId: id,
      departmentId: category.departmentId,
      type: 'department_assigned',
      title: 'New department complaint',
      message: `Complaint ${id} was routed to your department.`,
    });
    await notifyDepartmentAdministrators(client, category.departmentId, {
      grievanceId: id,
      type: 'department_assigned',
      title: 'New department complaint',
      message: `Complaint ${id} was routed to your department.`,
    });
    await notifyActiveAdministrators(client, {
      grievanceId: id,
      type: 'complaint_received',
      title: 'New grievance submitted',
      message: `Complaint ${id} was submitted.`,
    });

    const attachments = await client.query<GrievanceRow['attachments'][number]>(
      `SELECT id, file_name AS "fileName", file_type AS "fileType", file_size AS "fileSize",
              storage_ref AS "storageRef", uploaded_at AS "uploadedAt"
       FROM grievance_attachments WHERE grievance_id = $1 ORDER BY uploaded_at`,
      [id],
    );
    return mapGrievance({ ...inserted.rows[0], attachments: attachments.rows });
  });
}

export interface GrievanceFilters {
  page: number;
  limit: number;
  status?: GrievanceStatus;
  categoryId?: string;
  priorityLevel?: PriorityLevel;
  departmentId?: string;
  citizenId?: string;
  officerId?: string;
  userDepartmentId?: string;
  search?: string;
  dateFrom?: string;
  dateTo?: string;
  role: UserRole;
  userId: string;
}

export async function listGrievances(filters: GrievanceFilters): Promise<{ data: Grievance[]; total: number }> {
  const pool = getDatabasePool();
  const clauses: string[] = [];
  const values: unknown[] = [];
  const add = (sql: string, value: unknown) => {
    values.push(value);
    clauses.push(sql.replace('?', `$${values.length}`));
  };

  if (filters.role === 'citizen') add('g.citizen_id = ?', filters.userId);
  else if (filters.role === 'officer') add('g.assigned_officer_id = ?', filters.userId);
  else if (filters.role === 'department_admin') add('g.department_id = ?', filters.userDepartmentId ?? null);
  else if (filters.citizenId) add('g.citizen_id = ?', filters.citizenId);

  if (filters.role === 'admin' && filters.officerId) add('g.assigned_officer_id = ?', filters.officerId);
  if (filters.status) add('g.status = ?', filters.status);
  if (filters.categoryId) add('g.category_id = ?', filters.categoryId);
  if (filters.priorityLevel) add('g.priority_level = ?', filters.priorityLevel);
  if (filters.departmentId) add('g.department_id = ?', filters.departmentId);
  if (filters.dateFrom) add('g.created_at >= ?::date', filters.dateFrom);
  if (filters.dateTo) add("g.created_at < (?::date + INTERVAL '1 day')", filters.dateTo);
  if (filters.search) {
    values.push(`%${filters.search}%`);
    clauses.push(`(
      g.id::text ILIKE $${values.length}
      OR g.title ILIKE $${values.length}
      OR g.description ILIKE $${values.length}
      OR COALESCE(g.street_address, '') ILIKE $${values.length}
      OR COALESCE(g.area, '') ILIKE $${values.length}
      OR COALESCE(g.ward, '') ILIKE $${values.length}
      OR g.city ILIKE $${values.length}
    )`);
  }

  const where = clauses.length ? `WHERE ${clauses.join(' AND ')}` : '';
  const count = await pool.query<{ total: string }>(
    `SELECT count(*)::text AS total FROM grievances g ${where}`,
    values,
  );
  const pageValues = [...values, filters.limit, (filters.page - 1) * filters.limit];
  const ordering = filters.role === 'officer'
    ? 'ORDER BY g.priority_score DESC NULLS LAST, g.created_at ASC'
    : 'ORDER BY g.created_at DESC';
  const result = await pool.query<GrievanceRow>(
    `${grievanceSelect} ${where} ${ordering} LIMIT $${pageValues.length - 1} OFFSET $${pageValues.length}`,
    pageValues,
  );
  return {
    data: result.rows.map(mapGrievance),
    total: Number(count.rows[0]?.total || 0),
  };
}

export async function getGrievanceForUser(
  id: string,
  user: { userId: string; role: UserRole; departmentId?: string },
): Promise<Grievance | undefined> {
  const result = await getDatabasePool().query<GrievanceRow>(
    `${grievanceSelect}
     WHERE g.id = $1
       AND ($2::text <> 'citizen' OR g.citizen_id = $3)
       AND ($2::text <> 'officer' OR g.assigned_officer_id = $3)
       AND ($2::text <> 'department_admin' OR g.department_id = $4)`,
    [id, user.role, user.userId, user.departmentId ?? null],
  );
  return result.rows[0] ? mapGrievance(result.rows[0]) : undefined;
}

export interface CitizenGrievanceSummary {
  total: number;
  pending: number;
  inProgress: number;
  resolved: number;
  reopened: number;
  escalated: number;
  overdueOrAtRisk: number;
}

export async function getCitizenGrievanceSummary(citizenId: string): Promise<CitizenGrievanceSummary> {
  const result = await getDatabasePool().query(
    `SELECT
       COUNT(*)::int AS total,
       COUNT(*) FILTER (WHERE status IN ('SUBMITTED', 'AI_ANALYZED'))::int AS pending,
       COUNT(*) FILTER (WHERE status IN ('ASSIGNED', 'IN_PROGRESS', 'AWAITING_INFORMATION'))::int AS in_progress,
       COUNT(*) FILTER (WHERE status IN ('RESOLVED', 'CLOSED'))::int AS resolved,
       COUNT(*) FILTER (WHERE status = 'REOPENED')::int AS reopened,
       COUNT(*) FILTER (WHERE status = 'ESCALATED')::int AS escalated,
       COUNT(*) FILTER (
         WHERE status NOT IN ('RESOLVED', 'CLOSED')
           AND (status = 'SLA_AT_RISK' OR sla_deadline <= NOW())
       )::int AS overdue_or_at_risk
     FROM grievances
     WHERE citizen_id = $1`,
    [citizenId],
  );
  const row = result.rows[0];
  return {
    total: row.total,
    pending: row.pending,
    inProgress: row.in_progress,
    resolved: row.resolved,
    reopened: row.reopened,
    escalated: row.escalated,
    overdueOrAtRisk: row.overdue_or_at_risk,
  };
}

export interface PublicAssignedOfficer {
  name: string;
  departmentId?: string;
}

export async function getPublicAssignedOfficer(
  grievanceId: string,
): Promise<PublicAssignedOfficer | undefined> {
  const result = await getDatabasePool().query(
    `SELECT officer.display_name AS name, officer.department_id
     FROM grievances g
     JOIN users officer ON officer.id = g.assigned_officer_id AND officer.role = 'officer'
     WHERE g.id = $1`,
    [grievanceId],
  );
  const row = result.rows[0];
  if (!row) return undefined;
  return {
    name: row.name,
    ...(row.department_id ? { departmentId: row.department_id } : {}),
  };
}

export async function getAllGrievancesForAnalysis(departmentId?: string): Promise<Grievance[]> {
  const result = await getDatabasePool().query<GrievanceRow>(
    `${grievanceSelect}
     WHERE ($1::text IS NULL OR g.department_id = $1)
     ORDER BY g.created_at DESC`,
    [departmentId ?? null],
  );
  return result.rows.map(mapGrievance);
}

export async function getRecentGrievancesForDuplicateCheck(): Promise<DuplicateCandidate[]> {
  const result = await getDatabasePool().query(
    `SELECT id, title, description, category_id, street_address, area, ward, city, status, created_at
     FROM grievances
     WHERE created_at >= NOW() - INTERVAL '90 days'
     ORDER BY created_at DESC
     LIMIT 500`,
  );
  return result.rows.map((row) => ({
    id: row.id,
    title: stripDecorativeSymbols(row.title),
    description: stripDecorativeSymbols(row.description),
    categoryId: row.category_id,
    location: {
      ...(row.street_address ? { address: stripDecorativeSymbols(row.street_address) } : {}),
      ...(row.area ? { area: stripDecorativeSymbols(row.area) } : {}),
      ...(row.ward ? { ward: stripDecorativeSymbols(row.ward) } : {}),
      city: stripDecorativeSymbols(row.city),
    },
    status: row.status,
    createdAt: toIso(row.created_at)!,
  }));
}

export async function getGrievanceAnalysis(id: string): Promise<GrievanceAnalysis | undefined> {
  const result = await getDatabasePool().query<AnalysisRow>(
    `SELECT * FROM grievance_analyses WHERE grievance_id = $1 ORDER BY created_at DESC LIMIT 1`,
    [id],
  );
  return result.rows[0] ? mapAnalysis(result.rows[0]) : undefined;
}

export async function getGrievanceStatusHistory(id: string): Promise<StatusHistoryEntry[]> {
  const result = await getDatabasePool().query(
    `SELECT id, grievance_id, from_status, to_status, changed_by, changed_by_role, note, changed_at
     FROM grievance_status_history WHERE grievance_id = $1 ORDER BY changed_at`,
    [id],
  );
  return result.rows.map((row) => ({
    id: row.id,
    grievanceId: row.grievance_id,
    fromStatus: row.from_status,
    toStatus: row.to_status,
    changedBy: row.changed_by,
    changedByRole: row.changed_by_role,
    ...(row.note ? { note: stripDecorativeSymbols(row.note) } : {}),
    timestamp: toIso(row.changed_at)!,
  }));
}

export async function getGrievanceInternalNotes(id: string): Promise<InternalNote[]> {
  const result = await getDatabasePool().query(
    `SELECT id, grievance_id, author_id, author_name, author_role, content, created_at
     FROM grievance_internal_notes WHERE grievance_id = $1 ORDER BY created_at`,
    [id],
  );
  return result.rows.map((row) => ({
    id: row.id,
    grievanceId: row.grievance_id,
    authorId: row.author_id,
    authorName: row.author_name,
    authorRole: row.author_role,
    content: stripDecorativeSymbols(row.content),
    createdAt: toIso(row.created_at)!,
  }));
}

export async function createGrievanceInternalNote(
  id: string,
  actor: { userId: string; name: string; role: Exclude<UserRole, 'citizen'>; departmentId?: string },
  content: string,
): Promise<InternalNote | undefined> {
  return withDatabaseTransaction(async (client) => {
    const grievance = await client.query(
      `SELECT 1 FROM grievances
       WHERE id = $1
         AND ($2::text <> 'officer' OR assigned_officer_id = $3)
         AND ($2::text <> 'department_admin' OR department_id = $4)`,
      [id, actor.role, actor.userId, actor.departmentId ?? null],
    );
    if (grievance.rowCount !== 1) return undefined;

    const result = await client.query(
      `INSERT INTO grievance_internal_notes
        (grievance_id, author_id, author_name, author_role, content)
       VALUES ($1, $2, $3, $4, $5)
       RETURNING id, grievance_id, author_id, author_name, author_role, content, created_at`,
      [id, actor.userId, actor.name, actor.role, content],
    );
    const row = result.rows[0];
    return {
      id: row.id,
      grievanceId: row.grievance_id,
      authorId: row.author_id,
      authorName: row.author_name,
      authorRole: row.author_role,
      content: stripDecorativeSymbols(row.content),
      createdAt: toIso(row.created_at)!,
    };
  });
}

export async function getGrievanceCitizenUpdates(
  id: string,
  publicOnly = false,
): Promise<CitizenUpdate[]> {
  const result = await getDatabasePool().query(
    `SELECT id, grievance_id, message, is_public, created_at
     FROM grievance_citizen_updates
     WHERE grievance_id = $1 AND ($2::boolean = FALSE OR is_public = TRUE)
     ORDER BY created_at`,
    [id, publicOnly],
  );
  return result.rows.map((row) => ({
    id: row.id,
    grievanceId: row.grievance_id,
    message: stripDecorativeSymbols(row.message),
    isPublic: row.is_public,
    createdAt: toIso(row.created_at)!,
  }));
}

export async function getGrievanceFeedback(id: string): Promise<Feedback | undefined> {
  const result = await getDatabasePool().query(
    `SELECT id, grievance_id, citizen_id, rating, comment, created_at
     FROM grievance_feedback WHERE grievance_id = $1 ORDER BY created_at DESC LIMIT 1`,
    [id],
  );
  const row = result.rows[0];
  if (!row) return undefined;
  return {
    id: row.id,
    grievanceId: row.grievance_id,
    citizenId: row.citizen_id,
    rating: row.rating,
    ...(row.comment ? { comment: stripDecorativeSymbols(row.comment) } : {}),
    createdAt: toIso(row.created_at)!,
  };
}

export async function getGrievanceResolutions(id: string): Promise<GrievanceResolution[]> {
  const result = await getDatabasePool().query(
    `SELECT id, grievance_id, details, resolved_by_role, resolved_at
     FROM grievance_resolutions
     WHERE grievance_id = $1
     ORDER BY resolved_at DESC`,
    [id],
  );
  return result.rows.map((row) => ({
    id: row.id,
    grievanceId: row.grievance_id,
    details: stripDecorativeSymbols(row.details),
    resolvedByRole: row.resolved_by_role,
    resolvedAt: toIso(row.resolved_at)!,
  }));
}

export type CitizenResolutionAction =
  | { ok: true; grievance: Grievance }
  | { ok: false; reason: 'not_found' | 'invalid_status' };

export async function updateCitizenResolution(
  grievanceId: string,
  citizenId: string,
  action: 'confirm' | 'reopen',
  reason?: string,
): Promise<CitizenResolutionAction> {
  return withDatabaseTransaction(async (client) => {
    const result = await client.query<GrievanceRow>(
      `${grievanceSelect} WHERE g.id = $1 AND g.citizen_id = $2 FOR UPDATE OF g`,
      [grievanceId, citizenId],
    );
    const current = result.rows[0];
    if (!current) return { ok: false, reason: 'not_found' };
    const allowed = action === 'confirm'
      ? current.status === 'RESOLVED'
      : current.status === 'RESOLVED' || current.status === 'CLOSED';
    if (!allowed) return { ok: false, reason: 'invalid_status' };

    const nextStatus = action === 'confirm' ? 'CLOSED' : 'REOPENED';
    const note = action === 'confirm'
      ? 'Citizen confirmed the grievance resolution.'
      : `Citizen reopened the grievance: ${reason}`;
    await client.query(
      `UPDATE grievances
       SET status = $2,
           resolved_at = CASE WHEN $2 = 'REOPENED' THEN NULL ELSE resolved_at END,
           updated_at = NOW()
       WHERE id = $1`,
      [grievanceId, nextStatus],
    );
    await client.query(
      `INSERT INTO grievance_status_history
        (grievance_id, from_status, to_status, changed_by, changed_by_role, note)
       VALUES ($1, $2, $3, $4, 'citizen', $5)`,
      [grievanceId, current.status, nextStatus, citizenId, note],
    );
    if (action === 'reopen') {
      await client.query(
        `INSERT INTO grievance_citizen_updates (grievance_id, message, is_public)
         VALUES ($1, $2, TRUE)`,
        [grievanceId, `The grievance was reopened by the citizen. Reason: ${reason}`],
      );
    }

    const notification = action === 'confirm'
      ? {
          type: 'status_updated' as const,
          title: 'Resolution confirmed',
          message: `The citizen confirmed the resolution of complaint ${grievanceId}.`,
        }
      : {
          type: 'complaint_reopened' as const,
          title: 'Complaint reopened',
          message: `Complaint ${grievanceId} was reopened by the citizen. Reason: ${reason}`,
        };
    if (current.assigned_officer_id) {
      await insertNotification(client, {
        userId: current.assigned_officer_id,
        grievanceId,
        eventKey: `citizen-resolution:${grievanceId}:${nextStatus}:${randomUUID()}`,
        ...notification,
      });
    }
    if (current.department_id && action === 'reopen') {
      await notifyDepartmentOfficers(client, {
        grievanceId,
        departmentId: current.department_id,
        ...notification,
      });
      await notifyDepartmentAdministrators(client, current.department_id, {
        grievanceId,
        ...notification,
      });
    }
    await notifyActiveAdministrators(client, { grievanceId, ...notification });

    const grievance = await selectGrievance(client, grievanceId);
    if (!grievance) throw new Error('Updated grievance could not be reloaded.');
    return { ok: true, grievance };
  });
}

export type CreateFeedbackResult =
  | { ok: true; feedback: Feedback }
  | { ok: false; reason: 'not_found' | 'not_resolved' | 'already_submitted' };

export async function createGrievanceFeedback(
  id: string,
  citizenId: string,
  rating: number,
  comment?: string,
): Promise<CreateFeedbackResult> {
  return withDatabaseTransaction(async (client) => {
    const grievance = await client.query<{ status: GrievanceStatus }>(
      'SELECT status FROM grievances WHERE id = $1 AND citizen_id = $2 FOR UPDATE',
      [id, citizenId],
    );
    const current = grievance.rows[0];
    if (!current) return { ok: false, reason: 'not_found' };
    if (current.status !== 'RESOLVED' && current.status !== 'CLOSED') {
      return { ok: false, reason: 'not_resolved' };
    }
    const existing = await client.query(
      'SELECT 1 FROM grievance_feedback WHERE grievance_id = $1 AND citizen_id = $2 LIMIT 1',
      [id, citizenId],
    );
    if (existing.rowCount) return { ok: false, reason: 'already_submitted' };

    const result = await client.query(
      `INSERT INTO grievance_feedback (grievance_id, citizen_id, rating, comment)
       VALUES ($1, $2, $3, $4)
       RETURNING id, grievance_id, citizen_id, rating, comment, created_at`,
      [id, citizenId, rating, comment || null],
    );
    const row = result.rows[0];
    return { ok: true, feedback: {
      id: row.id,
      grievanceId: row.grievance_id,
      citizenId: row.citizen_id,
      rating: row.rating,
      ...(row.comment ? { comment: row.comment } : {}),
      createdAt: toIso(row.created_at)!,
    } };
  });
}

export async function updateGrievance(
  id: string,
  actor: { userId: string; role: UserRole; departmentId?: string },
  update: GrievanceUpdateInput,
): Promise<Grievance | undefined> {
  return withDatabaseTransaction(async (client) => {
    const currentResult = await client.query<GrievanceRow>(
      `${grievanceSelect}
       WHERE g.id = $1
         AND ($2::text <> 'officer' OR g.assigned_officer_id = $3)
         AND ($2::text <> 'department_admin' OR g.department_id = $4)
       FOR UPDATE OF g`,
      [id, actor.role, actor.userId, actor.departmentId ?? null],
    );
    const currentRow = currentResult.rows[0];
    if (!currentRow) return undefined;
    const current = mapGrievance(currentRow);

    const assignments: string[] = [];
    const values: unknown[] = [id];
    const assign = (column: string, value: unknown) => {
      values.push(value);
      assignments.push(`${column} = $${values.length}`);
    };

    if (update.status !== undefined) assign('status', update.status);
    if (update.slaDeadline !== undefined) assign('sla_deadline', update.slaDeadline);
    if (update.resolvedAt !== undefined) assign('resolved_at', update.resolvedAt);
    if (update.title !== undefined) assign('title', update.title);
    if (update.description !== undefined) assign('description', update.description);
    if (update.duration !== undefined) assign('duration', update.duration);
    if (update.affectedCount !== undefined) assign('affected_count', update.affectedCount);
    if (update.location?.address !== undefined) assign('street_address', update.location.address || null);
    if (update.location?.area !== undefined) assign('area', update.location.area || null);
    if (update.location?.ward !== undefined) assign('ward', update.location.ward || null);
    if (update.location?.city !== undefined) assign('city', update.location.city);
    if (update.location?.latitude !== undefined) assign('latitude', update.location.latitude);
    if (update.location?.longitude !== undefined) assign('longitude', update.location.longitude);

    if (update.status === 'RESOLVED' && update.resolvedAt === undefined) {
      assign('resolved_at', new Date().toISOString());
    } else if (update.status && update.status !== 'RESOLVED' && update.resolvedAt === undefined) {
      assign('resolved_at', null);
    }

    assign('updated_at', new Date().toISOString());
    const result = await client.query(
      `UPDATE grievances SET ${assignments.join(', ')} WHERE id = $1`,
      values,
    );
    if (result.rowCount !== 1) return undefined;

    if (update.status && update.status !== current.status) {
      await client.query(
        `INSERT INTO grievance_status_history
          (grievance_id, from_status, to_status, changed_by, changed_by_role, note)
         VALUES ($1, $2, $3, $4, $5, $6)`,
        [id, current.status, update.status, actor.userId, actor.role, update.reason || 'Status updated'],
      );
      if (update.status === 'RESOLVED') {
        await client.query(
          `INSERT INTO grievance_resolutions
            (grievance_id, resolved_by, resolved_by_role, details, resolved_at)
           VALUES ($1, $2, $3, $4, COALESCE($5::timestamptz, NOW()))`,
          [
            id,
            actor.userId,
            actor.role === 'citizen' ? 'admin' : actor.role,
            update.reason || 'The grievance was marked as resolved.',
            update.resolvedAt ?? null,
          ],
        );
      }
      if (update.status === 'RESOLVED' && update.reason) {
        await client.query(
          `INSERT INTO grievance_citizen_updates (grievance_id, message, is_public)
           VALUES ($1, $2, TRUE)`,
          [id, update.reason],
        );
      }
      if (update.status) {
        const resolved = update.status === 'RESOLVED';
        await insertNotification(client, {
          userId: currentRow.citizen_id,
          grievanceId: id,
          eventKey: `admin-status:${id}:${update.status}:${randomUUID()}`,
          type: resolved ? 'complaint_resolved' : 'status_updated',
          title: resolved ? 'Complaint marked resolved' : 'Complaint status updated',
          message: resolved
            ? update.reason || 'Your complaint was marked as resolved.'
            : `Your complaint status changed to ${update.status.replace(/_/g, ' ').toLowerCase()}.`,
        });
        if (resolved) {
          await insertNotification(client, {
            userId: currentRow.citizen_id,
            grievanceId: id,
            eventKey: `admin-feedback-requested:${id}:${randomUUID()}`,
            type: 'feedback_requested',
            title: 'Share resolution feedback',
            message: 'Please confirm the outcome and rate your resolution experience.',
          });
        }
      }
    }
    return selectGrievance(client, id);
  });
}

export async function persistGrievanceAnalysis(
  id: string,
  actor: { userId: string; role: UserRole; departmentId?: string },
  analysis: AIAnalysisResult,
  priority: PriorityBreakdown,
  departmentId?: string,
): Promise<GrievanceAnalysis | undefined> {
  const derivedPriorityLevel = priorityLevelFromScore(priority.score);
  if (priority.level !== derivedPriorityLevel) {
    throw new Error('Priority level must be derived from the priority score.');
  }

  return withDatabaseTransaction(async (client) => {
    const currentResult = await client.query<GrievanceRow>(
      `${grievanceSelect}
       WHERE g.id = $1
         AND ($2::text <> 'citizen' OR g.citizen_id = $3)
         AND ($2::text <> 'officer' OR g.assigned_officer_id = $3)
         AND ($2::text <> 'department_admin' OR g.department_id = $4)
       FOR UPDATE OF g`,
      [id, actor.role, actor.userId, actor.departmentId ?? null],
    );
    const current = currentResult.rows[0];
    if (!current) return undefined;

    const inserted = await client.query<AnalysisRow>(
      `INSERT INTO grievance_analyses (
        grievance_id, summary, category, subcategory, issue_type, extracted_location,
        extracted_duration, affected_population, urgency, impact, safety_risk, reasoning
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
      RETURNING *`,
      [
        id, analysis.summary, analysis.category, analysis.subcategory ?? null,
        analysis.issueType ?? null, analysis.location ?? null, analysis.duration ?? null,
        analysis.affectedPopulation ?? null, analysis.urgency, analysis.impact,
        analysis.safetyRisk, JSON.stringify(analysis.reasoning),
      ],
    );

    await client.query(
      `UPDATE grievances SET status = 'AI_ANALYZED', priority_score = $2,
        priority_level = $3, department_id = COALESCE($4, department_id), updated_at = NOW()
       WHERE id = $1`,
      [id, priority.score, derivedPriorityLevel, departmentId ?? null],
    );

    if (current.status !== 'AI_ANALYZED') {
      await client.query(
        `INSERT INTO grievance_status_history
          (grievance_id, from_status, to_status, changed_by, changed_by_role, note)
         VALUES ($1, $2, 'AI_ANALYZED', $3, $4, 'Automated analysis completed')`,
        [id, current.status, actor.userId, actor.role],
      );
    }
    await insertNotification(client, {
      userId: current.citizen_id,
      grievanceId: id,
      eventKey: `analysis:${id}:${inserted.rows[0].id}`,
      type: 'analysis_completed',
      title: 'Complaint analysis completed',
      message: 'AI analysis has completed and the complaint is ready for department review.',
    });
    const routedDepartmentId = departmentId ?? current.department_id;
    if (routedDepartmentId && routedDepartmentId !== current.department_id) {
      await insertNotification(client, {
        userId: current.citizen_id,
        grievanceId: id,
        eventKey: `analysis-department:${id}:${routedDepartmentId}:${inserted.rows[0].id}`,
        type: 'department_assigned',
        title: 'Department updated',
        message: 'Your complaint has been routed to the appropriate department.',
      });
      await notifyDepartmentOfficers(client, {
        grievanceId: id,
        departmentId: routedDepartmentId,
        type: 'department_assigned',
        title: 'Complaint routed to your department',
        message: `Complaint ${id} was routed to your department.`,
      });
      await notifyDepartmentAdministrators(client, routedDepartmentId, {
        grievanceId: id,
        type: 'department_assigned',
        title: 'Complaint routed to your department',
        message: `Complaint ${id} was routed to your department.`,
      });
    }
    return mapAnalysis(inserted.rows[0]);
  });
}
