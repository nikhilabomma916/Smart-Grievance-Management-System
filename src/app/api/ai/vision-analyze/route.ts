import { NextRequest } from 'next/server';
import { aiService } from '@/server/ai/ai-service';
import { aiMonitoring } from '@/server/ai/monitoring-service';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { name, base64, dataUrl, sampleId } = body;

    // Use sample or provided image data
    let imageName = name || sampleId || 'civic-defect.jpg';
    if (sampleId) {
      if (sampleId === 'pothole') imageName = 'severe_pothole_asphalt_crater.jpg';
      else if (sampleId === 'wire') imageName = 'live_wire_sparking_hazard.jpg';
      else if (sampleId === 'garbage') imageName = 'overflowing_garbage_dump_spill.jpg';
      else if (sampleId === 'water') imageName = 'burst_water_pipeline_flooding.jpg';
      else if (sampleId === 'streetlight') imageName = 'dark_broken_streetlight_pole.jpg';
    }

    const visionResult = await aiService.analyzeImage({
      name: imageName,
      base64,
      dataUrl
    });

    // Record AI Telemetry Event
    aiMonitoring.addEvent({
      type: visionResult.safetyRisk ? 'SAFETY_ESCALATION' : 'TRIAGE',
      title: `AI Vision Detected: ${visionResult.defectType}`,
      description: `Confidence ${Math.round(visionResult.confidence * 100)}% — Auto-mapped to ${visionResult.suggestedDepartment} with ${visionResult.suggestedUrgency} priority.`,
      severity: visionResult.suggestedUrgency,
      meta: { detectedTags: visionResult.detectedTags }
    });

    return Response.json({
      success: true,
      vision: visionResult,
      imagePreview: dataUrl || (sampleId ? `/samples/${sampleId}.jpg` : undefined)
    });
  } catch (error: any) {
    return Response.json({ error: error.message || 'Failed to analyze image' }, { status: 500 });
  }
}
