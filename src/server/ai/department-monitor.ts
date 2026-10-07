import { store } from '@/server/data/store';
import { Grievance } from '@/lib/types';
import { CATEGORY_NAMES, DEPARTMENT_NAMES } from '@/lib/constants';

export interface MisroutingAlert {
  grievanceId: string;
  title: string;
  categoryId: string;
  categoryName: string;
  assignedDepartmentId: string;
  assignedDepartmentName: string;
  correctDepartmentId: string;
  correctDepartmentName: string;
  reason: string;
  detectedAt: string;
  severity: 'CRITICAL' | 'HIGH' | 'MEDIUM';
}

const CATEGORY_TO_DEPT_MAP: Record<string, string> = {
  'cat-water-supply': 'dept-water',
  'cat-sewerage': 'dept-water',
  'cat-potholes': 'dept-roads',
  'cat-footpaths': 'dept-roads',
  'cat-garbage': 'dept-sanitation',
  'cat-public-toilets': 'dept-sanitation',
  'cat-streetlights': 'dept-electrical',
  'cat-power': 'dept-electrical',
  'cat-hazards': 'dept-safety',
  'cat-stray-animals': 'dept-safety',
  'cat-health': 'dept-health',
  'cat-schools': 'dept-edu',
  'cat-transit': 'dept-roads',
};

// Seed a couple of misrouted complaints in mock store so officers and admins immediately see the AI Misrouting Detector in action!
export function checkDepartmentMisrouting(grievances: Grievance[]): {
  totalAudited: number;
  correctlyRoutedCount: number;
  misroutedCount: number;
  alerts: MisroutingAlert[];
} {
  const alerts: MisroutingAlert[] = [];
  let correctlyRoutedCount = 0;

  for (const g of grievances) {
    const text = `${g.title} ${g.description}`.toLowerCase();
    
    // Determine correct department ID based on category and text content
    let expectedDeptId = CATEGORY_TO_DEPT_MAP[g.categoryId];

    if (text.includes('pothole') || text.includes('crater') || text.includes('road')) {
      expectedDeptId = 'dept-roads';
    } else if (text.includes('wire') || text.includes('spark') || text.includes('shock') || text.includes('electric')) {
      expectedDeptId = 'dept-safety';
    } else if (text.includes('water') || text.includes('pipe') || text.includes('leak') || text.includes('tanker')) {
      expectedDeptId = 'dept-water';
    } else if (text.includes('garbage') || text.includes('waste') || text.includes('trash') || text.includes('dump')) {
      expectedDeptId = 'dept-sanitation';
    }

    if (!expectedDeptId) expectedDeptId = 'dept-water';

    const currentDeptId = g.departmentId || 'dept-water';

    if (currentDeptId !== expectedDeptId) {
      alerts.push({
        grievanceId: g.id,
        title: g.title,
        categoryId: g.categoryId,
        categoryName: CATEGORY_NAMES[g.categoryId] || g.categoryId,
        assignedDepartmentId: currentDeptId,
        assignedDepartmentName: DEPARTMENT_NAMES[currentDeptId] || currentDeptId,
        correctDepartmentId: expectedDeptId,
        correctDepartmentName: DEPARTMENT_NAMES[expectedDeptId] || expectedDeptId,
        reason: `Complaint content describes ${CATEGORY_NAMES[g.categoryId] || 'this issue type'}, but was mistakenly dispatched to ${DEPARTMENT_NAMES[currentDeptId] || currentDeptId} instead of ${DEPARTMENT_NAMES[expectedDeptId] || expectedDeptId}.`,
        detectedAt: new Date().toISOString(),
        severity: (g.priorityLevel || g.priority) === 'CRITICAL' ? 'CRITICAL' : 'HIGH'
      });
    } else {
      correctlyRoutedCount++;
    }
  }

  return {
    totalAudited: grievances.length,
    correctlyRoutedCount,
    misroutedCount: alerts.length,
    alerts
  };
}

export function rerouteGrievance(grievanceId: string, targetDepartmentId: string): boolean {
  const grievance = store.grievances.find(g => g.id === grievanceId);
  if (!grievance) return false;

  grievance.departmentId = targetDepartmentId;
  grievance.updatedAt = new Date().toISOString();

  // Add audit log
  store.auditLogs.unshift({
    id: `log-reroute-${Date.now()}`,
    action: 'UPDATE',
    entityType: 'GRIEVANCE',
    entityId: grievanceId,
    actorId: 'system-ai-monitor',
    actorName: 'AI Department Misrouting Engine',
    actorRole: 'admin',
    details: { message: `Auto-rerouted ticket #${grievanceId} to ${DEPARTMENT_NAMES[targetDepartmentId] || targetDepartmentId}` },
    timestamp: new Date().toISOString()
  });

  return true;
}
