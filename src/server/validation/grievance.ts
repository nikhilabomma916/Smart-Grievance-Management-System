import { z } from 'zod';

export const GRIEVANCE_STATUSES = [
  'SUBMITTED',
  'AI_ANALYZED',
  'ASSIGNED',
  'IN_PROGRESS',
  'AWAITING_INFORMATION',
  'RESOLVED',
  'CLOSED',
  'SLA_AT_RISK',
  'ESCALATED',
  'REOPENED',
] as const;

export const PRIORITY_LEVELS = ['CRITICAL', 'HIGH', 'MEDIUM', 'LOW'] as const;
export const URGENCY_LEVELS = ['CRITICAL', 'HIGH', 'MEDIUM', 'LOW'] as const;
export const IMPACT_LEVELS = ['HIGH', 'MEDIUM', 'LOW'] as const;
export const urgencyLevelSchema = z.enum(URGENCY_LEVELS);
export const impactLevelSchema = z.enum(IMPACT_LEVELS);
export const priorityLevelSchema = z.enum(PRIORITY_LEVELS);
export const grievanceAIDecisionValueSchema = z.enum(['ACCEPTED', 'MODIFIED', 'REJECTED']);

export const aiAnalysisResultSchema = z.object({
  summary: z.string().min(1).max(20_000),
  category: z.string().trim().min(1).max(80),
  subcategory: z.string().trim().max(120).optional(),
  issueType: z.string().trim().max(200).optional(),
  location: z.string().trim().max(300).optional(),
  duration: z.string().trim().max(200).optional(),
  affectedPopulation: z.string().trim().max(200).optional(),
  urgency: urgencyLevelSchema,
  impact: impactLevelSchema,
  safetyRisk: z.boolean(),
  reasoning: z.array(z.string().max(2000)).max(50),
});

export const grievanceRecommendationSchema = z.object({
  summary: z.string().trim().min(1).max(20_000),
  keyFindings: z.array(z.string().trim().min(1).max(2_000)).max(50),
  recommendedActions: z.array(z.union([
    z.string().trim().min(1).max(2_000),
    z.object({
      action: z.string().trim().min(1).max(2_000),
      department: z.string().trim().min(1).max(100),
    }).strict(),
  ])).max(50),
  suggestedCitizenResponse: z.string().trim().max(5_000).optional(),
  escalationRecommendation: z.string().trim().max(2_000).optional(),
  relevantKnowledge: z.array(z.string().trim().min(1).max(2_000)).max(50).optional(),
}).strict();

export const grievanceAIDecisionSchema = z.object({
  decision: grievanceAIDecisionValueSchema,
  finalRecommendation: grievanceRecommendationSchema.optional(),
  officerNote: z.string().trim().min(1).max(5_000).optional(),
}).strict().superRefine((value, context) => {
  if (value.decision === 'MODIFIED' && !value.finalRecommendation) {
    context.addIssue({
      code: 'custom',
      path: ['finalRecommendation'],
      message: 'A final recommendation is required for a modified decision.',
    });
  }
});

export const GRIEVANCE_CATEGORIES = [
  'cat-water-supply',
  'cat-sewerage',
  'cat-potholes',
  'cat-footpaths',
  'cat-garbage',
  'cat-public-toilets',
  'cat-streetlights',
  'cat-power',
  'cat-hazards',
  'cat-stray-animals',
  'cat-health',
  'cat-schools',
  'cat-transit',
] as const;

const locationSchema = z.object({
  address: z.string().trim().max(300).optional().default(''),
  area: z.string().trim().max(150).optional().default(''),
  ward: z.string().trim().max(100).optional().default(''),
  city: z.string().trim().min(1).max(100).optional().default('Bangalore'),
  latitude: z.number().finite().min(-90).max(90).optional(),
  longitude: z.number().finite().min(-180).max(180).optional(),
});

const locationUpdateSchema = z.object({
  address: z.string().trim().max(300).optional(),
  area: z.string().trim().max(150).optional(),
  ward: z.string().trim().max(100).optional(),
  city: z.string().trim().min(1).max(100).optional(),
  latitude: z.number().finite().min(-90).max(90).optional(),
  longitude: z.number().finite().min(-180).max(180).optional(),
});

function validateCoordinatePair(
  location: { latitude?: number; longitude?: number },
  context: z.RefinementCtx,
): void {
  if ((location.latitude === undefined) !== (location.longitude === undefined)) {
    context.addIssue({
      code: 'custom',
      message: 'Latitude and longitude must be provided together.',
      path: [location.latitude === undefined ? 'latitude' : 'longitude'],
    });
  }
}

const validatedLocationSchema = locationSchema.superRefine(validateCoordinatePair);
const validatedLocationUpdateSchema = locationUpdateSchema.superRefine(validateCoordinatePair);

const attachmentMetadataSchema = z.object({
  fileName: z.string().trim().min(1).max(255),
  fileType: z.string().trim().min(1).max(100),
  fileSize: z.number().int().min(0).max(20_000_000),
});

export const grievanceCreateSchema = z.object({
  title: z.string().trim().min(1).max(200),
  description: z.string().trim().min(1).max(20_000),
  categoryId: z.enum(GRIEVANCE_CATEGORIES),
  location: validatedLocationSchema.optional().default({
    address: '',
    area: '',
    ward: '',
    city: 'Bangalore',
  }),
  duration: z.string().trim().max(200).optional(),
  affectedCount: z.number().int().positive().optional(),
  previousComplaintId: z.string().trim().min(1).max(120).optional(),
  attachments: z.array(attachmentMetadataSchema).max(10).optional().default([]),
});

export const grievanceUpdateSchema = z.object({
  status: z.enum(GRIEVANCE_STATUSES).optional(),
  reason: z.string().trim().max(500).optional(),
  slaDeadline: z.iso.datetime({ offset: true }).nullable().optional(),
  resolvedAt: z.iso.datetime({ offset: true }).nullable().optional(),
  title: z.string().trim().min(1).max(200).optional(),
  description: z.string().trim().min(1).max(20_000).optional(),
  duration: z.string().trim().max(200).nullable().optional(),
  affectedCount: z.number().int().positive().nullable().optional(),
  location: validatedLocationUpdateSchema.optional(),
}).refine(
  (update) => Object.keys(update).some((key) => key !== 'reason'),
  'At least one supported field is required.',
);

export type GrievanceCreateInput = z.output<typeof grievanceCreateSchema>;
export type GrievanceUpdateInput = z.output<typeof grievanceUpdateSchema>;
