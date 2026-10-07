import { CATEGORY_NAMES, DEPARTMENT_NAMES } from '@/lib/constants';
import { store } from '@/server/data/store';
import type { GrievanceAIRecommendationContent } from '@/lib/types';

export interface AIAnalysisResult {
  summary: string;
  category: string;
  subcategory?: string;
  issueType?: string;
  location?: string;
  duration?: string;
  affectedPopulation?: string;
  urgency: 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW';
  impact: 'HIGH' | 'MEDIUM' | 'LOW';
  safetyRisk: boolean;
  reasoning: string[];
}

export type AIResolutionResult = GrievanceAIRecommendationContent;

export interface RecommendedIssueOption {
  id: string;
  label: string;
  category: string;
  department: string;
  departmentName: string;
  confidence: number;
  urgency: 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW';
  title: string;
  description: string;
}

export interface PhotoLocation {
  latitude: number;
  longitude: number;
  address: string;
  area: string;
  ward: string;
  city: string;
}

export interface AIVisionResult {
  defectType: string;
  severity: 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW';
  confidence: number;
  suggestedCategory: string;
  suggestedTitle: string;
  suggestedDescription: string;
  safetyRisk: boolean;
  detectedTags: string[];
  suggestedUrgency: 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW';
  suggestedDepartment: string;
  suggestedDepartmentName: string;
  photoLocation: PhotoLocation;
  recommendedIssues: RecommendedIssueOption[];
}

export interface AIChatMessage {
  role: 'user' | 'assistant' | 'system';
  content: string;
  timestamp?: string;
  suggestedAction?: {
    type: 'DRAFT_GRIEVANCE' | 'CHECK_STATUS' | 'ESCALATE' | 'VIEW_INCIDENT';
    payload?: any;
    label: string;
  };
}

export interface AIService {
  analyzeGrievance(title: string, description: string, category: string, location?: string, duration?: string, affectedCount?: number): Promise<AIAnalysisResult>;
  generateResolution(grievance: any, analysis: any, knowledgeContext?: string[]): Promise<AIResolutionResult>;
  analyzeImage(imageInfo: { name?: string; base64?: string; dataUrl?: string }): Promise<AIVisionResult>;
  chat(messages: AIChatMessage[], userContext: { role: string; userId?: string; name?: string }): Promise<AIChatMessage>;
  isAvailable(): Promise<boolean>;
}

export class SmartHybridAIService implements AIService {
  async isAvailable(): Promise<boolean> {
    return true;
  }

  async analyzeImage(imageInfo: { name?: string; base64?: string; dataUrl?: string }): Promise<AIVisionResult> {
    const rawText = (imageInfo.name || imageInfo.dataUrl || '').toLowerCase();
    
    // Default simulated / extracted EXIF Photo Location
    const defaultPhotoLocation: PhotoLocation = {
      latitude: 12.9716,
      longitude: 77.5946,
      address: '100ft Main Road, Indiranagar',
      area: 'Indiranagar Zone 3',
      ward: 'Ward 12',
      city: 'Bangalore'
    };

    if (rawText.includes('wire') || rawText.includes('electric') || rawText.includes('spark') || rawText.includes('transformer') || rawText.includes('pole')) {
      return {
        defectType: 'Fallen Live High-Tension Wire / Electrical Hazard',
        severity: 'CRITICAL',
        confidence: 0.96,
        suggestedCategory: 'cat-hazards',
        suggestedDepartment: 'dept-safety',
        suggestedDepartmentName: 'Electrical & Public Safety Department',
        suggestedTitle: 'Dangerous Snapped Live Electric Wire on Public Way',
        suggestedDescription: 'High-tension electrical wire has fallen onto the pedestrian pathway. High risk of fatal electrocution and sparking observed. Urgent isolation and repair needed.',
        safetyRisk: true,
        detectedTags: ['High Voltage', 'Live Wire', 'Immediate Hazard', 'Public Safety'],
        suggestedUrgency: 'CRITICAL',
        photoLocation: {
          ...defaultPhotoLocation,
          address: '4th Cross, 8th Main Road, Ward 8',
          area: 'Malleshwaram Zonal Circle',
          ward: 'Ward 8'
        },
        recommendedIssues: [
          {
            id: 'opt-wire-1',
            label: 'Snapped Live High-Tension Wire',
            category: 'cat-hazards',
            department: 'dept-safety',
            departmentName: 'Electrical & Public Safety Department',
            confidence: 0.96,
            urgency: 'CRITICAL',
            title: 'Dangerous Snapped Live Electric Wire on Public Way',
            description: 'High-tension electrical wire has fallen onto the pedestrian pathway. High risk of fatal electrocution and sparking observed.'
          },
          {
            id: 'opt-wire-2',
            label: 'Open Transformer Box Spoilage',
            category: 'cat-power',
            department: 'dept-electrical',
            departmentName: 'Electrical Department',
            confidence: 0.88,
            urgency: 'HIGH',
            title: 'Uncovered High Voltage Junction Box',
            description: 'Street-level electrical junction box left open without protective casing.'
          }
        ]
      };
    } else if (rawText.includes('pothole') || rawText.includes('crater') || rawText.includes('road') || rawText.includes('asphalt')) {
      return {
        defectType: 'Severe Road Crater & Structural Asphalt Damage',
        severity: 'HIGH',
        confidence: 0.94,
        suggestedCategory: 'cat-potholes',
        suggestedDepartment: 'dept-roads',
        suggestedDepartmentName: 'Roads & Infrastructure Department',
        suggestedTitle: 'Deep Road Pothole Causing Traffic & Vehicle Hazards',
        suggestedDescription: 'Substantial crater/pothole in the roadway measuring approx 2-3 feet wide and 6+ inches deep. Poses immediate danger of two-wheeler skidding and severe vehicular rim damage.',
        safetyRisk: true,
        detectedTags: ['Road Damage', 'Asphalt Cavity', 'Traffic Hazard', 'Monsoon Deterioration'],
        suggestedUrgency: 'HIGH',
        photoLocation: {
          ...defaultPhotoLocation,
          address: '100ft Ring Road, Junction 4',
          area: 'Indiranagar Sector 2',
          ward: 'Ward 12'
        },
        recommendedIssues: [
          {
            id: 'opt-pothole-1',
            label: 'Deep Road Crater / Pothole Damage',
            category: 'cat-potholes',
            department: 'dept-roads',
            departmentName: 'Roads & Infrastructure Department',
            confidence: 0.94,
            urgency: 'HIGH',
            title: 'Deep Road Pothole Causing Traffic & Vehicle Hazards',
            description: 'Substantial crater/pothole in the roadway measuring approx 2-3 feet wide and 6+ inches deep.'
          },
          {
            id: 'opt-pothole-2',
            label: 'Broken Footpath & Curb Collapse',
            category: 'cat-footpaths',
            department: 'dept-roads',
            departmentName: 'Roads & Infrastructure Department',
            confidence: 0.86,
            urgency: 'MEDIUM',
            title: 'Pedestrian Walkway Structural Deterioration',
            description: 'Concrete pavers broken and displaced, creating tripping risk for pedestrians.'
          }
        ]
      };
    } else if (rawText.includes('garbage') || rawText.includes('waste') || rawText.includes('dump') || rawText.includes('trash') || rawText.includes('overflow')) {
      return {
        defectType: 'Uncontrolled Solid Waste Overflow & Dump Accumulation',
        severity: 'MEDIUM',
        confidence: 0.92,
        suggestedCategory: 'cat-garbage',
        suggestedDepartment: 'dept-sanitation',
        suggestedDepartmentName: 'Sanitation & Solid Waste Management',
        suggestedTitle: 'Overflowing Garbage Dump and Secondary Waste Spillage',
        suggestedDescription: 'Community collection bin is overflowing with rotten organic and non-biodegradable waste spilled onto public street. Severe foul odor, stray animal scavenging, and sanitary health risk.',
        safetyRisk: false,
        detectedTags: ['Solid Waste', 'Sanitation Hazard', 'Bin Overflow', 'Vector Breeding Risk'],
        suggestedUrgency: 'MEDIUM',
        photoLocation: {
          ...defaultPhotoLocation,
          address: '7th Main Market Road, Ward 7',
          area: 'Koramanagala 4th Block',
          ward: 'Ward 7'
        },
        recommendedIssues: [
          {
            id: 'opt-garbage-1',
            label: 'Overflowing Community Garbage Dump',
            category: 'cat-garbage',
            department: 'dept-sanitation',
            departmentName: 'Sanitation & Solid Waste Management',
            confidence: 0.92,
            urgency: 'MEDIUM',
            title: 'Overflowing Garbage Dump and Secondary Waste Spillage',
            description: 'Community collection bin is overflowing with rotten organic waste spilled onto public street.'
          },
          {
            id: 'opt-garbage-2',
            label: 'Illegal Debris Dumping & Health Risk',
            category: 'cat-health',
            department: 'dept-sanitation',
            departmentName: 'Sanitation & Health Department',
            confidence: 0.84,
            urgency: 'MEDIUM',
            title: 'Unsanitary Waste Accumulation & Mosquito Breeding',
            description: 'Stagnant uncollected trash creating odor and pest infestation in residential alley.'
          }
        ]
      };
    } else if (rawText.includes('water') || rawText.includes('pipe') || rawText.includes('leak') || rawText.includes('sewage') || rawText.includes('drain')) {
      return {
        defectType: 'Municipal Water Main Rupture / Pipeline Leakage',
        severity: 'HIGH',
        confidence: 0.95,
        suggestedCategory: 'cat-water-supply',
        suggestedDepartment: 'dept-water',
        suggestedDepartmentName: 'Water Supply & Sewerage Department',
        suggestedTitle: 'Underground Water Pipeline Burst with Severe Road Inundation',
        suggestedDescription: 'Drinking water transmission line has ruptured causing thousands of liters of clean water wastage per hour and local localized street flooding. Immediate shutoff valve operation required.',
        safetyRisk: false,
        detectedTags: ['Pipeline Burst', 'Freshwater Wastage', 'Pressure Drop', 'Utility Disruption'],
        suggestedUrgency: 'HIGH',
        photoLocation: {
          ...defaultPhotoLocation,
          address: '12th Cross Water Tank Road',
          area: 'HSR Layout Sector 1',
          ward: 'Ward 15'
        },
        recommendedIssues: [
          {
            id: 'opt-water-1',
            label: 'Ruptured Municipal Water Transmission Line',
            category: 'cat-water-supply',
            department: 'dept-water',
            departmentName: 'Water Supply & Sewerage Department',
            confidence: 0.95,
            urgency: 'HIGH',
            title: 'Underground Water Pipeline Burst with Severe Road Inundation',
            description: 'Drinking water transmission line has ruptured causing thousands of liters of clean water wastage.'
          },
          {
            id: 'opt-water-2',
            label: 'Underground Sewage Drain Overflow',
            category: 'cat-sewerage',
            department: 'dept-water',
            departmentName: 'Water Supply & Sewerage Department',
            confidence: 0.87,
            urgency: 'HIGH',
            title: 'Blocked Drainage Main Causing Foul Sewerage Spillage',
            description: 'Stagnant blackwater overflow from main manhole onto public thoroughfare.'
          }
        ]
      };
    }

    // Default Fallback
    return {
      defectType: 'Civic Infrastructure Defect Detected',
      severity: 'MEDIUM',
      confidence: 0.89,
      suggestedCategory: 'cat-potholes',
      suggestedDepartment: 'dept-roads',
      suggestedDepartmentName: 'Roads & Infrastructure Department',
      suggestedTitle: 'Civic Infrastructure Issue Requiring Field Repairs',
      suggestedDescription: 'Visual inspection shows public infrastructure defect requiring municipal team dispatch.',
      safetyRisk: false,
      detectedTags: ['Defect Detected', 'Field Inspection'],
      suggestedUrgency: 'MEDIUM',
      photoLocation: defaultPhotoLocation,
      recommendedIssues: [
        {
          id: 'opt-gen-1',
          label: 'General Civic Road & Infrastructure Damage',
          category: 'cat-potholes',
          department: 'dept-roads',
          departmentName: 'Roads & Infrastructure Department',
          confidence: 0.89,
          urgency: 'MEDIUM',
          title: 'Civic Infrastructure Issue Requiring Field Repairs',
          description: 'Visual evidence indicates road surface or public fixture defect requiring repair.'
        }
      ]
    };
  }

  async analyzeGrievance(title: string, description: string, category: string, location?: string, duration?: string, affectedCount?: number): Promise<AIAnalysisResult> {
    const text = `${title} ${description}`.toLowerCase();
    
    let resolvedCategory = category;
    if (text.includes('water') || text.includes('pipe') || text.includes('leak') || text.includes('tanker')) resolvedCategory = 'cat-water-supply';
    else if (text.includes('pothole') || text.includes('road') || text.includes('asphalt') || text.includes('crater')) resolvedCategory = 'cat-potholes';
    else if (text.includes('garbage') || text.includes('waste') || text.includes('trash') || text.includes('dump')) resolvedCategory = 'cat-garbage';
    else if (text.includes('wire') || text.includes('shock') || text.includes('hazard') || text.includes('manhole')) resolvedCategory = 'cat-hazards';
    else if (text.includes('streetlight') || text.includes('dark') || text.includes('lamp') || text.includes('power')) resolvedCategory = 'cat-streetlights';

    let urgency: 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW' = 'MEDIUM';
    if (text.match(/safety|danger|emergency|accident|live wire|collapse|open manhole|sparking/i)) urgency = 'CRITICAL';
    else if (text.match(/no water for|flooding|burst|crater|high tension/i)) urgency = 'HIGH';
    else if (text.match(/delay|slow|smell|streetlight|pothole/i)) urgency = 'MEDIUM';
    else urgency = 'LOW';

    let impact: 'HIGH' | 'MEDIUM' | 'LOW' = 'MEDIUM';
    if (affectedCount && affectedCount > 50) impact = 'HIGH';
    else if (text.match(/entire ward|colony|residents|hundreds|community|all houses/i)) impact = 'HIGH';
    else if (text.match(/multiple|few|neighbors/i)) impact = 'MEDIUM';
    else impact = 'LOW';

    const safetyRisk = urgency === 'CRITICAL' || text.match(/danger|hazard|accident|risk|shock|electrocution/i) !== null;

    const reasoning = [
      `Semantic classification: ${CATEGORY_NAMES[resolvedCategory] || resolvedCategory}`,
      `Calculated urgency: ${urgency} based on keyword sensitivity and impact indicators`,
      safetyRisk ? 'SAFETY RISK: Flagged for accelerated human officer assignment' : 'Standard SLA timeline applies',
      `Impact scope: ${impact} impact with estimated community population footprint`
    ];

    return {
      summary: `Category: ${CATEGORY_NAMES[resolvedCategory] || resolvedCategory}. ${urgency} urgency. ${impact} impact. ${safetyRisk ? 'Safety risk identified' : 'No safety risk identified'}.`,
      category: resolvedCategory,
      subcategory: 'Public Municipal Infrastructure',
      issueType: title,
      location: location || 'Bangalore City Jurisdiction',
      duration: duration || 'Recent',
      affectedPopulation: impact === 'HIGH' ? '100+ Citizens' : impact === 'MEDIUM' ? '20-50 Citizens' : 'Local Property',
      urgency,
      impact,
      safetyRisk,
      reasoning
    };
  }

  async generateResolution(grievance: any, analysis: any, knowledgeContext?: string[]): Promise<AIResolutionResult> {
    const urgency = analysis?.urgency;
    const impact = analysis?.impact;
    const safetyRisk = analysis?.safetyRisk === true;
    const priorityLevel = grievance?.priorityLevel || grievance?.priority;
    const priorityText = priorityLevel
      ? `Overall priority: ${priorityLevel}${Number.isInteger(grievance?.priorityScore) ? ` (${grievance.priorityScore})` : ''}.`
      : 'Overall priority is unavailable.';
    const catName = CATEGORY_NAMES[grievance?.categoryId] || grievance?.category || 'Civic Services';
    const departmentId = grievance?.departmentId;
    const departmentName = DEPARTMENT_NAMES[departmentId] || 'assigned department';
    const findings = [
      `Category: ${catName}.`,
      urgency ? `${urgency} urgency.` : 'Urgency is unavailable.',
      impact ? `${impact} impact.` : 'Impact is unavailable.',
      `Safety risk: ${safetyRisk ? 'identified' : 'not identified'}.`,
      priorityText,
    ];
    const recommendedActions = safetyRisk
      ? [
          { action: 'Verify the reported hazard and secure the immediate area if the risk is confirmed.', department: departmentName },
          { action: 'Record inspection findings and the corrective action taken in the grievance.', department: departmentName },
        ]
      : [
          { action: 'Inspect the reported issue at the submitted location and confirm the cause.', department: departmentName },
          { action: 'Record inspection findings and the corrective action taken in the grievance.', department: departmentName },
        ];

    return {
      summary: `Suggested officer actions for the ${catName} grievance. Verify the facts on site and use professional judgment before acting.`,
      keyFindings: findings,
      recommendedActions,
      suggestedCitizenResponse: `Your grievance regarding "${grievance?.title || 'the reported civic issue'}" has been assigned for officer review. We will update you after the reported issue has been assessed.`,
      ...(safetyRisk || urgency === 'CRITICAL' || priorityLevel === 'CRITICAL'
        ? { escalationRecommendation: 'Consider escalation for accelerated human review based on the recorded safety risk, urgency, or overall priority.' }
        : {}),
      ...(knowledgeContext?.length ? { relevantKnowledge: knowledgeContext.slice(0, 10) } : {}),
    };
  }

  async chat(messages: AIChatMessage[], userContext: { role: string; userId?: string; name?: string }): Promise<AIChatMessage> {
    const lastUserMsg = messages.filter(m => m.role === 'user').slice(-1)[0]?.content || '';
    const text = lastUserMsg.toLowerCase();

    if (userContext.role === 'citizen') {
      if (text.includes('status') || text.includes('track') || text.includes('grv')) {
        const found = store.grievances.find(g => text.includes(g.id.toLowerCase())) || store.grievances[0];
        return {
          role: 'assistant',
          content: `Here is the live status for **${found ? found.id : 'your recent grievance'}**:\n\n- **Title**: ${found?.title}\n- **Status**: \`${found?.status}\`\n- **Priority**: ${found?.priorityLevel || 'HIGH'}\n- **Assigned Dept**: ${DEPARTMENT_NAMES[found?.departmentId || 'dept-water'] || 'Municipal Services'}\n- **Last Updated**: ${new Date(found?.updatedAt || Date.now()).toLocaleDateString()}\n\nWould you like me to ping the assigned officer for an update?`,
          suggestedAction: {
            type: 'CHECK_STATUS',
            label: `View Grievance ${found?.id}`,
            payload: { grievanceId: found?.id }
          }
        };
      }

      if (text.includes('wire') || text.includes('pothole') || text.includes('water') || text.includes('garbage') || text.includes('broken') || text.includes('report') || text.includes('complaint')) {
        let detectedCat = 'cat-hazards';
        let suggestedTitle = 'Reported Civic Issue';
        if (text.includes('water')) { detectedCat = 'cat-water-supply'; suggestedTitle = 'Water supply disruption in my locality'; }
        else if (text.includes('pothole')) { detectedCat = 'cat-potholes'; suggestedTitle = 'Deep road potholes causing accident risks'; }
        else if (text.includes('garbage')) { detectedCat = 'cat-garbage'; suggestedTitle = 'Uncollected overflowing garbage dump'; }
        else if (text.includes('wire') || text.includes('shock')) { detectedCat = 'cat-hazards'; suggestedTitle = 'Emergency: Snapped electrical wire on road'; }

        return {
          role: 'assistant',
          content: `I've prepared a draft grievance for you based on our conversation:\n\n- **Issue Category**: ${CATEGORY_NAMES[detectedCat]}\n- **Suggested Title**: ${suggestedTitle}\n- **Urgency**: ${text.includes('wire') ? 'CRITICAL (4hr SLA)' : 'HIGH'}\n\nYou can attach photos on the submission form to auto-detect location and category!`,
          suggestedAction: {
            type: 'DRAFT_GRIEVANCE',
            label: 'Open Pre-filled Submission Form',
            payload: { categoryId: detectedCat, title: suggestedTitle, description: lastUserMsg }
          }
        };
      }

      return {
        role: 'assistant',
        content: `Namaste ${userContext.name || 'Citizen'}! I am **Atharva AI Civic Mitra**, your municipal assistant.\n\nI can help you with:\n1. **Drafting & Submitting a Grievance** (with photo location detection)\n2. **Checking complaint status & condition**\n3. **City SLAs and Escalation rules**\n\nHow may I assist your neighborhood today?`
      };
    }

    return {
      role: 'assistant',
      content: `Hello Officer ${userContext.name || ''}! I am your **CivicResolve Copilot**.\n\nI can help you:\n- Analyze zonal complaint clusters and recurring anomalies\n- Recommend resolution plans and draft citizen responses\n- Flag tickets approaching SLA breach risk\n\nWhat would you like to investigate?`
    };
  }
}

export const aiService = new SmartHybridAIService();

export async function createAIService(): Promise<AIService> {
  return aiService;
}
