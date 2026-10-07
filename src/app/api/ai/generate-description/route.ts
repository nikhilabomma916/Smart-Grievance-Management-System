import { NextRequest } from 'next/server';
import { CATEGORY_NAMES } from '@/lib/constants';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { keywords, categoryId, issueTitle } = body;

    const raw = (keywords || issueTitle || '').toLowerCase();

    let generatedDescription = '';
    const categoryName = CATEGORY_NAMES[categoryId] || 'Municipal Civic Defect';

    if (raw.includes('wire') || raw.includes('electric') || raw.includes('spark') || raw.includes('shock') || raw.includes('pole')) {
      generatedDescription = `EXECUTIVE COMPLAINT REPORT:\n\nDetailed observation: High-voltage electrical wire/junction hazard detected on the public thoroughfare. Live sparking and exposed cabling pose an immediate threat of electrocution to pedestrians, children, and passing traffic. Immediate isolation, circuit shutdown, and emergency field repair crew dispatch required.`;
    } else if (raw.includes('pothole') || raw.includes('crater') || raw.includes('road') || raw.includes('asphalt')) {
      generatedDescription = `EXECUTIVE COMPLAINT REPORT:\n\nDetailed observation: Severe road asphalt crater and structural degradation observed on main transit lane. Measurements indicate deep cavity causing severe vehicular rim impact, traffic congestion, and critical skidding hazards for two-wheelers. Immediate cold-mix asphalt filling and road resurfacing requested.`;
    } else if (raw.includes('garbage') || raw.includes('waste') || raw.includes('trash') || raw.includes('dump') || raw.includes('clean')) {
      generatedDescription = `EXECUTIVE COMPLAINT REPORT:\n\nDetailed observation: Uncollected solid waste accumulation and secondary garbage bin overflow observed. Rotten organic matter and plastic debris spill onto the public street, emitting severe foul odor and attracting vector pests/stray animals. Immediate compactor truck deployment and sanitation clearance requested.`;
    } else if (raw.includes('water') || raw.includes('pipe') || raw.includes('leak') || raw.includes('tank') || raw.includes('burst')) {
      generatedDescription = `EXECUTIVE COMPLAINT REPORT:\n\nDetailed observation: Major underground municipal drinking water main rupture detected. Thousands of liters of clean water are escaping per hour, causing localized street flooding and severe water pressure drops in surrounding residential blocks. Emergency main valve shutoff and line restoration needed.`;
    } else {
      generatedDescription = `EXECUTIVE COMPLAINT REPORT:\n\nDetailed observation: Civic infrastructure defect (${keywords || categoryName}) observed on site. Localized public inconvenience and utility disruption noted. Rapid field inspection and corrective maintenance by the respective municipal department requested.`;
    }

    return Response.json({
      success: true,
      description: generatedDescription,
      keywords: keywords || ''
    });
  } catch (error: any) {
    return Response.json({ error: error.message || 'Failed to generate description' }, { status: 500 });
  }
}
