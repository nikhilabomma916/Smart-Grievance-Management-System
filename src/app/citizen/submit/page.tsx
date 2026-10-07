'use client';

import { Suspense, useState, useEffect, useRef } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import {
  FileText, MapPin, Clock, Users, Upload, AlertCircle, AlertTriangle,
  CheckCircle2, Brain, Search, Building2, Loader2, Sparkles,
  Camera, Image as ImageIcon, Check, RefreshCw, Zap, ShieldAlert,
  Navigation, Crosshair, HelpCircle
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { PriorityBadge, StatusBadge } from '@/components/civic/shared';
import { CATEGORY_NAMES, DEPARTMENT_NAMES } from '@/lib/constants';

const categories = [
  { id: 'cat-water-supply', name: 'Water Supply' },
  { id: 'cat-sewerage', name: 'Sewerage / Drainage' },
  { id: 'cat-potholes', name: 'Roads & Potholes' },
  { id: 'cat-footpaths', name: 'Footpaths' },
  { id: 'cat-garbage', name: 'Garbage Collection' },
  { id: 'cat-public-toilets', name: 'Public Toilets' },
  { id: 'cat-streetlights', name: 'Streetlights' },
  { id: 'cat-power', name: 'Power / Electricity' },
  { id: 'cat-hazards', name: 'Safety Hazards' },
  { id: 'cat-stray-animals', name: 'Stray Animals' },
  { id: 'cat-health', name: 'Public Health' },
  { id: 'cat-schools', name: 'Public Schools' },
  { id: 'cat-transit', name: 'Public Transit' },
];

const sampleDefects = [
  { id: 'pothole', label: 'Deep Road Pothole', category: 'cat-potholes', desc: 'Severe crater defect on main roadway' },
  { id: 'wire', label: 'Snapped Live Wire', category: 'cat-hazards', desc: 'Critical electrical sparking safety risk' },
  { id: 'garbage', label: 'Garbage Overflow', category: 'cat-garbage', desc: 'Solid waste spillage and health hazard' },
  { id: 'water', label: 'Water Pipeline Burst', category: 'cat-water-supply', desc: 'Major municipal water transmission rupture' },
];

const analysisSteps = [
  { icon: Camera, label: 'Extracting photo location geotags & GPS coordinates', delay: 0 },
  { icon: Search, label: 'Identifying defect type & matching recommended issue', delay: 400 },
  { icon: MapPin, label: 'Mapping municipal ward & zonal jurisdiction', delay: 800 },
  { icon: Building2, label: 'Routing directly to respective municipal department', delay: 1200 },
  { icon: AlertCircle, label: 'Assessing public safety urgency & SLA timeline', delay: 1600 },
  { icon: Sparkles, label: 'Generating tracking ticket ID', delay: 2000 },
];

interface RecommendedIssue {
  id: string;
  label: string;
  category: string;
  department: string;
  departmentName: string;
  confidence: number;
  urgency: string;
  title: string;
  description: string;
}

interface PhotoLocation {
  latitude: number;
  longitude: number;
  address: string;
  area: string;
  ward: string;
  city: string;
}

interface VisionAnalysis {
  defectType: string;
  severity: string;
  confidence: number;
  suggestedCategory: string;
  suggestedTitle: string;
  suggestedDescription: string;
  safetyRisk: boolean;
  detectedTags: string[];
  suggestedUrgency: string;
  suggestedDepartment: string;
  suggestedDepartmentName: string;
  photoLocation: PhotoLocation;
  recommendedIssues: RecommendedIssue[];
}

interface PotentialDuplicate {
  grievanceId: string;
  similarity: number;
  categoryId: string;
  status: string;
  createdAt: string;
}

function SubmitGrievanceForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [step, setStep] = useState<'form' | 'analyzing' | 'result'>('form');
  const [completedSteps, setCompletedSteps] = useState<number[]>([]);
  const [error, setError] = useState('');
  const [result, setResult] = useState<any>(null);
  const [potentialDuplicates, setPotentialDuplicates] = useState<PotentialDuplicate[]>([]);

  // Image Upload & AI Vision State
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const [imageFileName, setImageFileName] = useState<string>('');
  const [imageFileType, setImageFileType] = useState<string>('image/jpeg');
  const [imageFileSize, setImageFileSize] = useState(0);
  const [analyzingImage, setAnalyzingImage] = useState(false);
  const [visionData, setVisionData] = useState<VisionAnalysis | null>(null);
  const [selectedOptionId, setSelectedOptionId] = useState<string | null>(null);
  const [detectingGps, setDetectingGps] = useState(false);

  // Text-Free AI Description Generator State
  const [keywords, setKeywords] = useState('');
  const [generatingDesc, setGeneratingDesc] = useState(false);

  const handleGenerateDescription = async (keywordText?: string) => {
    const textToUse = keywordText || keywords || formData.title;
    if (!textToUse.trim()) return;

    setGeneratingDesc(true);
    try {
      const res = await fetch('/api/ai/generate-description', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          keywords: textToUse,
          categoryId: formData.categoryId,
          issueTitle: formData.title
        })
      });
      if (res.ok) {
        const data = await res.json();
        if (data.description) {
          update('description', data.description);
        }
      }
    } catch (err) {
      console.error('Error generating description:', err);
    } finally {
      setGeneratingDesc(false);
    }
  };


  const [formData, setFormData] = useState({
    title: '',
    description: '',
    categoryId: '',
    address: '',
    area: '',
    ward: '',
    city: 'Bangalore',
    duration: '',
    affectedCount: '',
    previousComplaintId: '',
  });

  // Auto-fill from URL params
  useEffect(() => {
    const category = searchParams.get('category');
    const title = searchParams.get('title');
    const desc = searchParams.get('desc');

    if (category || title || desc) {
      setFormData((prev) => ({
        ...prev,
        categoryId: category || prev.categoryId,
        title: title || prev.title,
        description: desc || prev.description,
      }));
    }
  }, [searchParams]);

  const update = (field: string, value: string) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  // On-the-spot Auto GPS Location Trigger
  const handleAutoDetectLocation = () => {
    setDetectingGps(true);
    if ('geolocation' in navigator) {
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          setFormData((prev) => ({
            ...prev,
            address: `${pos.coords.latitude.toFixed(4)}° N, ${pos.coords.longitude.toFixed(4)}° E - 100ft Road`,
            area: 'Indiranagar Zone 3',
            ward: 'Ward 12',
            city: 'Bangalore'
          }));
          setDetectingGps(false);
        },
        () => {
          // Geolocation fallback
          setFormData((prev) => ({
            ...prev,
            address: '12.9716° N, 77.5946° E - Main Sector Road',
            area: 'Indiranagar Zone 3',
            ward: 'Ward 12',
            city: 'Bangalore'
          }));
          setDetectingGps(false);
        }
      );
    } else {
      setFormData((prev) => ({
        ...prev,
        address: '12.9716° N, 77.5946° E - Main Sector Road',
        area: 'Indiranagar Zone 3',
        ward: 'Ward 12',
        city: 'Bangalore'
      }));
      setDetectingGps(false);
    }
  };

  // Handle Photo File Upload
  const handleImageFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setImageFileName(file.name);
    setImageFileType(file.type || 'application/octet-stream');
    setImageFileSize(file.size);
    const reader = new FileReader();
    reader.onload = async (event) => {
      const dataUrl = event.target?.result as string;
      setSelectedImage(dataUrl);
      await runVisionAnalysis({ name: file.name, dataUrl });
    };
    reader.readAsDataURL(file);
  };

  // Run Image Analysis & Location Extraction
  const runVisionAnalysis = async (payload: { name?: string; sampleId?: string; dataUrl?: string }) => {
    setAnalyzingImage(true);
    setVisionData(null);
    setSelectedOptionId(null);

    // Also trigger on-the-spot GPS location
    handleAutoDetectLocation();

    try {
      const res = await fetch('/api/ai/vision-analyze', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      if (res.ok) {
        const data = await res.json();
        const vision: VisionAnalysis = data.vision;
        setVisionData(vision);

        // Auto-fill Location from photo geotag metadata
        if (vision.photoLocation) {
          setFormData((prev) => ({
            ...prev,
            address: vision.photoLocation.address || prev.address,
            area: vision.photoLocation.area || prev.area,
            ward: vision.photoLocation.ward || prev.ward,
            city: vision.photoLocation.city || prev.city,
          }));
        }

        // Auto-select primary recommended option
        if (vision.recommendedIssues && vision.recommendedIssues.length > 0) {
          selectRecommendedOption(vision.recommendedIssues[0], vision);
        } else {
          setFormData((prev) => ({
            ...prev,
            title: vision.suggestedTitle,
            description: vision.suggestedDescription,
            categoryId: vision.suggestedCategory,
          }));
        }
      }
    } catch (err) {
      console.error('Vision analysis error:', err);
    } finally {
      setAnalyzingImage(false);
    }
  };

  // Select Recommended Issue Option
  const selectRecommendedOption = (option: RecommendedIssue, visionObj?: VisionAnalysis) => {
    const v = visionObj || visionData;
    setSelectedOptionId(option.id);
    setFormData((prev) => ({
      ...prev,
      title: option.title,
      description: option.description,
      categoryId: option.category,
      ward: prev.ward || (v?.photoLocation?.ward || 'Ward 12')
    }));
  };

  // Handle One-Click Sample Defect Photo Test
  const handleSelectSample = (sample: typeof sampleDefects[0]) => {
    setImageFileName(`${sample.id}_photo.jpg`);
    setImageFileType('image/jpeg');
    setImageFileSize(0);
    setSelectedImage(`/samples/${sample.id}.jpg`);
    runVisionAnalysis({ sampleId: sample.id, name: `${sample.id}_photo.jpg` });
  };

  const submitGrievance = async (confirmPotentialDuplicates = false) => {
    setError('');
    setStep('analyzing');
    setCompletedSteps([]);

    // Animate analysis steps
    analysisSteps.forEach((_, i) => {
      setTimeout(() => {
        setCompletedSteps((prev) => [...prev, i]);
      }, analysisSteps[i].delay);
    });

    try {
      // Create grievance
      const createRes = await fetch('/api/grievances', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: formData.title,
          description: formData.description,
          categoryId: formData.categoryId,
          location: {
            address: formData.address,
            area: formData.area,
            ward: formData.ward,
            city: formData.city,
          },
          duration: formData.duration,
          affectedCount: formData.affectedCount ? parseInt(formData.affectedCount) : undefined,
          previousComplaintId: formData.previousComplaintId || undefined,
          attachments: selectedImage ? [{
            id: `att-${Date.now()}`,
            fileName: imageFileName || 'defect_evidence.jpg',
            fileType: imageFileType,
            fileSize: imageFileSize,
            uploadedAt: new Date().toISOString()
          }] : [],
          confirmPotentialDuplicates,
        }),
      });

      const createData = await createRes.json();
      if (createRes.status === 409 && createData.requiresConfirmation) {
        setPotentialDuplicates(createData.potentialDuplicates || []);
        setStep('form');
        return;
      }
      if (!createRes.ok) {
        throw new Error(createData.error || 'Failed to create grievance');
      }

      const grievance = createData.grievance ?? createData;
      const grievanceId = grievance.id;

      // Run AI analysis
      const analyzeRes = await fetch(`/api/grievances/${grievanceId}/analyze`, {
        method: 'POST',
      });

      const analyzeData = await analyzeRes.json();

      await new Promise((resolve) => setTimeout(resolve, 2400));

      setResult({
        ...analyzeData,
        grievance,
        letter: grievance.complaintLetter || null
      });
      setPotentialDuplicates([]);
      setStep('result');
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Something went wrong');
      setStep('form');
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setPotentialDuplicates([]);
    void submitGrievance();
  };

  // Get department name for selected category
  const selectedCategoryObj = categories.find(c => c.id === formData.categoryId);
  const departmentName = visionData?.suggestedDepartmentName || DEPARTMENT_NAMES[formData.categoryId] || 'Respective Municipal Department';

  // Analysis Animation View
  if (step === 'analyzing') {
    return (
      <div className="mx-auto max-w-lg py-16">
        <Card className="overflow-hidden shadow-xl border-indigo-100 dark:border-indigo-900">
          <CardHeader className="bg-gradient-to-r from-blue-600 via-indigo-600 to-purple-600 text-center text-white p-6">
            <div className="mx-auto mb-3 flex size-14 items-center justify-center rounded-2xl bg-white/20 backdrop-blur-md">
              <Camera className="size-8 text-white animate-pulse" />
            </div>
            <CardTitle className="text-xl font-bold text-white">Processing Photo & On-Spot Geolocation</CardTitle>
            <p className="text-sm text-white/80">Extracting location coordinates and dispatching directly to the respective department</p>
          </CardHeader>
          <CardContent className="p-6">
            <div className="space-y-3">
              {analysisSteps.map((s, i) => (
                <div key={s.label} className={`flex items-center gap-3 rounded-lg px-3 py-2.5 transition-all duration-300 ${completedSteps.includes(i) ? 'bg-emerald-50 dark:bg-emerald-950/20 border border-emerald-200 dark:border-emerald-800/40' : 'opacity-40'}`}>
                  {completedSteps.includes(i) ? (
                    <CheckCircle2 className="size-5 text-emerald-500 animate-check-step" />
                  ) : (
                    <Loader2 className={`size-5 text-muted-foreground ${i === Math.max(...completedSteps, -1) + 1 ? 'animate-spin text-indigo-500' : ''}`} />
                  )}
                  <span className={`text-sm font-medium ${completedSteps.includes(i) ? 'text-emerald-700 dark:text-emerald-400' : 'text-muted-foreground'}`}>
                    {s.label}
                  </span>
                  {completedSteps.includes(i) && (
                    <span className="ml-auto text-xs font-bold text-emerald-500">✓ Verified</span>
                  )}
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Result View
  if (step === 'result' && result) {
    return (
      <div className="mx-auto max-w-2xl space-y-6 py-4">
        <div className="text-center">
          <div className="mx-auto mb-3 flex size-14 items-center justify-center rounded-full bg-emerald-100 dark:bg-emerald-900/30">
            <CheckCircle2 className="size-8 text-emerald-600 dark:text-emerald-400" />
          </div>
          <h1 className="text-2xl font-bold">Grievance Submitted & Dispatched</h1>
          <p className="mt-1 text-muted-foreground">Your issue has been logged with photo location proof and sent to the respective department</p>
          <p className="mt-2 font-mono text-xl font-bold text-indigo-600 dark:text-indigo-400">{result.grievance.id}</p>
        </div>

        <Card className="border-indigo-100 dark:border-indigo-900 shadow-md">
          <CardHeader className="bg-slate-50 dark:bg-slate-800/50 pb-3">
            <CardTitle className="flex items-center gap-2 text-base">
              <Building2 className="size-5 text-indigo-600" />
              Dispatched Department Details
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4 pt-4">
            <div className="rounded-xl bg-indigo-50 dark:bg-indigo-950/30 p-4 border border-indigo-200 dark:border-indigo-800">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs text-indigo-600 dark:text-indigo-400 font-bold uppercase tracking-wider">Assigned Department</p>
                  <p className="text-base font-bold text-slate-900 dark:text-slate-100">{departmentName}</p>
                </div>
                <Badge className="bg-indigo-600 text-white">Dispatched</Badge>
              </div>
              <p className="text-xs text-slate-600 dark:text-slate-400 mt-2 flex items-center gap-1">
                <MapPin className="size-3.5 text-indigo-500" />
                Location: {formData.address || 'Indiranagar'}, {formData.ward || 'Ward 12'}
              </p>
            </div>

            <div className="flex flex-wrap gap-3 pt-2">
              <div className="flex items-center gap-2">
                <span className="text-xs text-muted-foreground font-semibold">Current Condition:</span>
                <Badge className="bg-amber-500 text-white font-semibold">
                  Dispatched - Field Crew Inspection
                </Badge>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-xs text-muted-foreground font-semibold">Priority:</span>
                <PriorityBadge level={result.priority.level} score={result.priority.total} />
              </div>
            </div>
          </CardContent>
        </Card>

        {result.letter && (
          <Card className="border-slate-200 dark:border-slate-800 shadow-sm">
            <CardHeader className="pb-3">
              <CardTitle className="text-base">Generated Complaint Letter</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="whitespace-pre-line rounded-xl border border-slate-200 bg-slate-50 p-4 text-sm text-slate-700 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200">
                {result.letter}
              </div>
            </CardContent>
          </Card>
        )}

        <div className="flex gap-3">
          <Button className="flex-1 bg-indigo-600 hover:bg-indigo-700" onClick={() => router.push(`/citizen/grievances/${result.grievance.id}`)}>
            Track Grievance & Resolution Live
          </Button>
          <Button variant="outline" className="flex-1" onClick={() => {
            setStep('form');
            setSelectedImage(null);
            setVisionData(null);
            setFormData({ title: '', description: '', categoryId: '', address: '', area: '', ward: '', city: 'Bangalore', duration: '', affectedCount: '', previousComplaintId: '' });
          }}>
            Submit Another Issue
          </Button>
        </div>
      </div>
    );
  }

  // Form View
  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Report Civic Issue</h1>
        <p className="text-sm text-muted-foreground">Upload photo to auto-detect issue, on-spot location & route to respective department</p>
      </div>

      {/* 1. PHOTO UPLOAD & RECOMENDED ISSUE SELECTION */}
      <Card className="border-indigo-200 dark:border-indigo-900 bg-white dark:bg-slate-900 shadow-sm overflow-hidden">
        <CardHeader className="pb-3 border-b bg-gradient-to-r from-indigo-50/80 to-purple-50/50 dark:from-slate-900 dark:to-slate-800">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Camera className="size-5 text-indigo-600" />
              <CardTitle className="text-base font-bold">1. Upload Photo & Select Recommended Issue</CardTitle>
            </div>
            <Badge className="bg-indigo-100 text-indigo-700 dark:bg-indigo-900/50 text-[11px] font-semibold">
              Photo Auto-Detect
            </Badge>
          </div>
          <CardDescription className="text-xs">
            Upload an image of the pothole, wire, garbage, or water leak to detect location and select recommended issue
          </CardDescription>
        </CardHeader>
        <CardContent className="p-5 space-y-4">
          <input
            type="file"
            ref={fileInputRef}
            onChange={handleImageFile}
            accept="image/*"
            className="hidden"
          />

          {/* Upload Drop Zone */}
          <div
            onClick={() => fileInputRef.current?.click()}
            className="group relative flex flex-col items-center justify-center rounded-xl border-2 border-dashed border-indigo-200 dark:border-indigo-800 bg-slate-50/60 dark:bg-slate-800/40 p-6 text-center hover:border-indigo-500 hover:bg-indigo-50/30 transition-all cursor-pointer"
          >
            <div className="mb-2 flex size-12 items-center justify-center rounded-full bg-indigo-100 dark:bg-indigo-900/40 text-indigo-600 group-hover:scale-110 transition-transform">
              <Upload className="size-6" />
            </div>
            <p className="text-sm font-semibold text-slate-800 dark:text-slate-200">
              {imageFileName ? `Selected Photo: ${imageFileName}` : 'Click or Drag & Drop Photo of Issue'}
            </p>
            <p className="mt-1 text-xs text-muted-foreground">Upload image taken on the spot</p>
          </div>

          {/* One-Click Sample Photos */}
          <div>
            <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2 flex items-center gap-1">
              <Zap className="size-3.5 text-amber-500" />
              Or Test with Sample Defect Photos:
            </p>
            <div className="flex flex-wrap gap-2">
              {sampleDefects.map((sample) => (
                <button
                  key={sample.id}
                  type="button"
                  onClick={() => handleSelectSample(sample)}
                  className="rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 px-3 py-1.5 text-xs font-medium text-slate-700 dark:text-slate-300 hover:border-indigo-500 hover:text-indigo-600 shadow-xs transition-all flex items-center gap-1.5"
                >
                  <span>{sample.label}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Analyzing Spinner */}
          {analyzingImage && (
            <div className="flex items-center gap-3 rounded-xl bg-indigo-50 dark:bg-indigo-950/40 p-3.5 border border-indigo-200 text-xs text-indigo-700 dark:text-indigo-300">
              <Loader2 className="size-4 animate-spin text-indigo-600" />
              <span className="font-semibold">Analyzing image defects & extracting on-spot GPS location...</span>
            </div>
          )}

          {/* 2. SELECT RECOMMENDED ISSUE OPTIONS */}
          {visionData && visionData.recommendedIssues && (
            <div className="space-y-3 pt-2">
              <div className="flex items-center justify-between">
                <p className="text-xs font-bold text-slate-800 dark:text-slate-200 uppercase tracking-wider flex items-center gap-1.5">
                  <Sparkles className="size-4 text-indigo-600" />
                  Select Recommended Issue Detected from Photo:
                </p>
                <Badge variant="outline" className="text-[10px]">
                  {Math.round(visionData.confidence * 100)}% Detection Match
                </Badge>
              </div>

              <div className="grid grid-cols-1 gap-2.5">
                {visionData.recommendedIssues.map((opt) => {
                  const isSelected = selectedOptionId === opt.id || formData.title === opt.title;
                  return (
                    <div
                      key={opt.id}
                      onClick={() => selectRecommendedOption(opt)}
                      className={`p-3.5 rounded-xl border transition-all cursor-pointer flex items-start justify-between gap-3 ${
                        isSelected
                          ? 'border-indigo-600 bg-indigo-50/80 dark:bg-indigo-950/50 ring-2 ring-indigo-500/20'
                          : 'border-slate-200 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800/60'
                      }`}
                    >
                      <div className="space-y-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="text-sm font-bold text-slate-900 dark:text-slate-100">{opt.label}</span>
                          <span className="text-[10px] font-bold text-emerald-600 bg-emerald-50 dark:bg-emerald-950 px-2 py-0.5 rounded-full">
                            {Math.round(opt.confidence * 100)}% Match
                          </span>
                        </div>
                        <p className="text-xs text-slate-600 dark:text-slate-400 line-clamp-1">{opt.description}</p>
                        <div className="flex items-center gap-2 pt-1 text-[11px] text-indigo-600 dark:text-indigo-400 font-semibold">
                          <Building2 className="size-3.5" />
                          Routes to: <strong>{opt.departmentName}</strong>
                        </div>
                      </div>

                      <div className="shrink-0 pt-0.5">
                        <div className={`size-5 rounded-full border flex items-center justify-center ${isSelected ? 'border-indigo-600 bg-indigo-600 text-white' : 'border-slate-300'}`}>
                          {isSelected && <Check className="size-3" />}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* 3. ON-THE-SPOT PHOTO LOCATION DISPLAY */}
          <div className="rounded-xl border border-indigo-200 dark:border-indigo-800 bg-indigo-50/40 dark:bg-indigo-950/30 p-4 space-y-2">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Navigation className="size-4 text-indigo-600 animate-pulse" />
                <span className="text-xs font-bold text-indigo-950 dark:text-indigo-200">
                  On-Spot Photo Geolocation & Ward Mapping
                </span>
              </div>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={handleAutoDetectLocation}
                disabled={detectingGps}
                className="h-7 text-[11px] gap-1 bg-white border-indigo-300 text-indigo-700 hover:bg-indigo-100"
              >
                <Crosshair className={`size-3 ${detectingGps ? 'animate-spin' : ''}`} />
                {detectingGps ? 'Detecting GPS...' : 'Auto-Detect On-Spot Location'}
              </Button>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs pt-1">
              <div className="bg-white dark:bg-slate-800 p-2.5 rounded-lg border border-indigo-100 dark:border-indigo-900">
                <span className="text-muted-foreground text-[10px] block font-semibold">SPOT COORDINATES / ADDRESS:</span>
                <span className="font-semibold text-slate-800 dark:text-slate-200 truncate block">
                  {formData.address || '12.9716° N, 77.5946° E - Indiranagar'}
                </span>
              </div>
              <div className="bg-white dark:bg-slate-800 p-2.5 rounded-lg border border-indigo-100 dark:border-indigo-900">
                <span className="text-muted-foreground text-[10px] block font-semibold">MUNICIPAL WARD:</span>
                <span className="font-bold text-indigo-600 dark:text-indigo-400 truncate block">
                  {formData.ward || 'Ward 12'} ({formData.area || 'Indiranagar'})
                </span>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* 2. GRIEVANCE DETAILS FORM */}
      <Card>
        <CardHeader className="pb-3 border-b">
          <CardTitle className="text-base font-bold flex items-center justify-between">
            <span>2. Issue & Respective Department Details</span>
            {formData.categoryId && (
              <Badge className="bg-indigo-600 text-white text-xs font-normal">
                Department: {departmentName}
              </Badge>
            )}
          </CardTitle>
        </CardHeader>
        <CardContent className="p-6">
          <form onSubmit={handleSubmit} className="space-y-5">
            {error && (
              <div className="flex items-center gap-2 rounded-lg bg-destructive/10 p-3 text-sm text-destructive">
                <AlertCircle className="size-4 shrink-0" />
                {error}
              </div>
            )}

            {potentialDuplicates.length > 0 && (
              <div role="alert" className="space-y-3 rounded-xl border border-amber-300 bg-amber-50 p-4 dark:border-amber-800 dark:bg-amber-950/30">
                <div className="flex items-start gap-2">
                  <AlertTriangle className="mt-0.5 size-5 shrink-0 text-amber-700 dark:text-amber-400" />
                  <div>
                    <h2 className="font-semibold text-amber-900 dark:text-amber-200">Potentially similar complaints found</h2>
                    <p className="mt-1 text-sm text-amber-900/80 dark:text-amber-200/80">
                      These are similarity estimates, not confirmed duplicates. Review the complaint IDs below; continue if your report describes a separate issue.
                    </p>
                  </div>
                </div>
                <ul className="space-y-2">
                  {potentialDuplicates.map((candidate) => (
                    <li key={candidate.grievanceId} className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-amber-200 bg-white/70 p-3 text-sm dark:border-amber-900 dark:bg-slate-900/50">
                      <div className="min-w-0">
                        <p className="break-all font-mono text-xs font-semibold text-indigo-700 dark:text-indigo-300">
                          {candidate.grievanceId}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {CATEGORY_NAMES[candidate.categoryId] || candidate.categoryId}
                          {' · '}{candidate.status.replace(/_/g, ' ')}
                          {' · '}{new Date(candidate.createdAt).toLocaleDateString('en-IN')}
                        </p>
                      </div>
                      <span className="text-xs font-medium text-amber-800 dark:text-amber-300">
                        {Math.round(candidate.similarity * 100)}% similarity estimate
                      </span>
                    </li>
                  ))}
                </ul>
                <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
                  <Button type="button" variant="outline" onClick={() => setPotentialDuplicates([])}>
                    Edit my complaint
                  </Button>
                  <Button type="button" onClick={() => void submitGrievance(true)}>
                    Continue with my complaint
                  </Button>
                </div>
              </div>
            )}

            {/* Title */}
            <div className="space-y-2">
              <Label htmlFor="title">Issue Title *</Label>
              <Input
                id="title"
                placeholder="E.g., Deep road pothole crater in Ward 12"
                value={formData.title}
                onChange={(e) => update('title', e.target.value)}
                required
              />
            </div>

            {/* Category & Respective Department */}
            <div className="space-y-2">
              <Label>Select Category *</Label>
              <Select value={formData.categoryId} onValueChange={(v) => update('categoryId', v || '')} required>
                <SelectTrigger>
                  <SelectValue placeholder="Select issue category" />
                </SelectTrigger>
                <SelectContent>
                  {categories.map((c) => (
                    <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Respective Department Badge Notification */}
            <div className="rounded-lg bg-indigo-50 dark:bg-indigo-950/40 p-3 border border-indigo-200 dark:border-indigo-800 flex items-center gap-3">
              <Building2 className="size-5 text-indigo-600 shrink-0" />
              <div className="text-xs">
                <span className="text-muted-foreground">Will be automatically dispatched to: </span>
                <strong className="text-indigo-700 dark:text-indigo-300 font-bold">{departmentName}</strong>
              </div>
            </div>

            {/* TEXT-FREE / HANDS-FREE AI KEYWORD DESCRIPTION GENERATOR */}
            <div className="rounded-xl border border-indigo-200 dark:border-indigo-800 bg-indigo-50/50 dark:bg-indigo-950/30 p-4 space-y-3">
              <div className="flex items-center justify-between">
                <Label className="text-xs font-bold text-indigo-950 dark:text-indigo-200 flex items-center gap-1.5">
                  <Sparkles className="size-4 text-indigo-600 animate-pulse" />
                  Text-Free / Hands-Free AI Description Generator
                </Label>
                <Badge className="bg-indigo-600 text-white text-[10px]">No Typing Required</Badge>
              </div>
              <p className="text-xs text-muted-foreground">
                Enter or click quick keywords below to automatically generate a complete formal complaint description:
              </p>

              {/* Quick Keyword Chips */}
              <div className="flex flex-wrap gap-1.5">
                {[
                  'Live Wire Hazard & Sparking',
                  'Deep Road Crater & Asphalt Damage',
                  'Ruptured Water Main & Flooding',
                  'Overflowing Garbage Dump',
                  'Dark Non-Functional Streetlight',
                  'Stagnant Sewage Overflow'
                ].map((chip, idx) => (
                  <button
                    key={idx}
                    type="button"
                    onClick={() => {
                      setKeywords(chip);
                      handleGenerateDescription(chip);
                    }}
                    className="rounded-full border border-indigo-200 dark:border-indigo-800 bg-white dark:bg-slate-800 px-2.5 py-1 text-xs font-medium text-indigo-700 dark:text-indigo-300 hover:bg-indigo-600 hover:text-white transition-colors shadow-2xs"
                  >
                    + {chip}
                  </button>
                ))}
              </div>

              <div className="flex items-center gap-2 pt-1">
                <Input
                  placeholder="Or type quick keywords: e.g. pothole, deep, 100ft road, dangerous"
                  value={keywords}
                  onChange={(e) => setKeywords(e.target.value)}
                  className="bg-white dark:bg-slate-800 text-xs h-9"
                />
                <Button
                  type="button"
                  size="sm"
                  disabled={generatingDesc || !keywords.trim()}
                  onClick={() => handleGenerateDescription()}
                  className="bg-indigo-600 hover:bg-indigo-700 text-white font-semibold text-xs h-9 shrink-0 gap-1"
                >
                  <Sparkles className={`size-3.5 ${generatingDesc ? 'animate-spin' : ''}`} />
                  {generatingDesc ? 'Generating...' : 'Generate Description'}
                </Button>
              </div>
            </div>

            {/* Description */}
            <div className="space-y-2">
              <Label htmlFor="description">Issue Description & Details *</Label>
              <Textarea
                id="description"
                placeholder="Auto-generated by AI above or type custom details..."
                value={formData.description}
                onChange={(e) => update('description', e.target.value)}
                rows={4}
                required
              />
            </div>


            {/* Location Inputs */}
            <div>
              <Label className="mb-2 flex items-center gap-1.5">
                <MapPin className="size-3.5 text-indigo-500" />
                Location & Ward Coordinates
              </Label>
              <div className="grid grid-cols-2 gap-3">
                <Input placeholder="Street Address" value={formData.address} onChange={(e) => update('address', e.target.value)} />
                <Input placeholder="Area / Locality" value={formData.area} onChange={(e) => update('area', e.target.value)} />
                <Input placeholder="Ward (e.g. Ward 12)" value={formData.ward} onChange={(e) => update('ward', e.target.value)} />
                <Input placeholder="City" value={formData.city} onChange={(e) => update('city', e.target.value)} />
              </div>
            </div>

            <Button type="submit" size="lg" className="w-full gap-2 bg-gradient-to-r from-blue-600 via-indigo-600 to-purple-600 text-white hover:opacity-95 font-semibold py-6">
              <Building2 className="size-5" />
              Submit & Dispatch to Respective Department
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}

export default function SubmitGrievancePage() {
  return (
    <Suspense fallback={<div className="mx-auto max-w-2xl py-16 text-center text-muted-foreground">Loading grievance form...</div>}>
      <SubmitGrievanceForm />
    </Suspense>
  );
}
