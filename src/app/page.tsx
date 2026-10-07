import Link from 'next/link';
import {
  Shield,
  Zap,
  Search,
  Eye,
  Brain,
  BarChart3,
  ArrowRight,
  CheckCircle2,
  FileText,
  Users,
  Building2,
} from 'lucide-react';
import { Button } from '@/components/ui/button';

const steps = [
  { icon: FileText, title: 'Submit a Grievance', desc: 'Provide the details, location, and supporting information for review.' },
  { icon: Brain, title: 'AI-Assisted Analysis', desc: 'The system classifies and prioritizes the grievance based on urgency and context.' },
  { icon: Zap, title: 'Department Routing', desc: 'Each grievance is directed to the appropriate department and assigned officer.' },
  { icon: Users, title: 'Officer Review', desc: 'Assigned officers assess the grievance and determine the next action.' },
  { icon: Eye, title: 'Status Tracking', desc: 'Citizens can monitor progress and receive updates throughout the process.' },
];

const features = [
  { icon: Zap, title: 'Priority Assessment', desc: 'Grievances are evaluated based on urgency, impact, and service deadlines.' },
  { icon: Building2, title: 'Department Routing', desc: 'Submissions are assigned to the appropriate department and officer with minimal delay.' },
  { icon: Search, title: 'Possible Duplicate Grievance', desc: 'Related submissions are flagged to reduce duplication and improve service coordination.' },
  { icon: Eye, title: 'Transparent Status Tracking', desc: 'Citizens and officers can view current progress, actions, and timelines in one place.' },
  { icon: Brain, title: 'AI-Assisted Recommendations', desc: 'Operational staff receive structured guidance to support timely and consistent decisions.' },
  { icon: BarChart3, title: 'Service Analytics', desc: 'Departments can review recurring issues and monitor service performance.' },
];

export default function LandingPage() {
  return (
    <div className="flex min-h-screen flex-col">
      <header className="sticky top-0 z-50 border-b bg-white/80 backdrop-blur-md">
        <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
          <Link href="/" className="flex items-center gap-2.5">
            <div className="flex size-9 items-center justify-center rounded-lg bg-primary">
              <Shield className="size-5 text-primary-foreground" />
            </div>
            <div>
              <span className="text-lg font-bold tracking-tight text-foreground">Smart Grievance Management System</span>
            </div>
          </Link>
          <nav className="hidden items-center gap-6 md:flex">
            <Link href="#how-it-works" className="text-sm font-medium text-muted-foreground transition-colors hover:text-foreground">How It Works</Link>
            <Link href="#features" className="text-sm font-medium text-muted-foreground transition-colors hover:text-foreground">Features</Link>
            <Link href="/login" className="text-sm font-medium text-muted-foreground transition-colors hover:text-foreground">Sign In</Link>
            <Link href="/register">
              <Button size="sm">Create Account</Button>
            </Link>
          </nav>
          <Link href="/login" className="md:hidden">
            <Button size="sm" variant="outline">Sign In</Button>
          </Link>
        </div>
      </header>

      <section className="relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-primary/5 via-transparent to-primary/3" />
        <div className="absolute -top-24 -right-24 size-96 rounded-full bg-primary/5 blur-3xl" />
        <div className="absolute -bottom-24 -left-24 size-96 rounded-full bg-primary/5 blur-3xl" />
        <div className="relative mx-auto max-w-7xl px-4 py-20 sm:px-6 sm:py-28 lg:px-8 lg:py-36">
          <div className="mx-auto max-w-3xl text-center">
            <div className="mb-6 inline-flex items-center gap-2 rounded-full border bg-white/80 px-4 py-1.5 text-sm font-medium text-muted-foreground shadow-sm backdrop-blur-sm">
              <Brain className="size-4 text-primary" />
              AI-Assisted Grievance Management
            </div>
            <h1 className="text-4xl font-bold tracking-tight text-foreground sm:text-5xl lg:text-6xl">
              Track civic concerns with clarity and accountability.
            </h1>
            <p className="mx-auto mt-6 max-w-2xl text-lg text-muted-foreground sm:text-xl">
              The Smart Grievance Management System enables residents to submit grievances, monitor progress,
              and support timely action by the appropriate department.
            </p>
            <div className="mt-10 flex flex-col items-center justify-center gap-4 sm:flex-row">
              <Link href="/register">
                <Button size="lg" className="h-12 gap-2 px-8 text-base font-semibold shadow-lg shadow-primary/20">
                  <FileText className="size-5" />
                  Submit Grievance
                  <ArrowRight className="size-4" />
                </Button>
              </Link>
              <Link href="/login">
                <Button variant="outline" size="lg" className="h-12 gap-2 px-8 text-base font-semibold">
                  <Search className="size-5" />
                  Track Grievance
                </Button>
              </Link>
            </div>
            <div className="mt-12 flex items-center justify-center gap-8 text-sm text-muted-foreground">
              <div className="flex items-center gap-1.5">
                <CheckCircle2 className="size-4 text-emerald-500" />
                <span>Transparent tracking</span>
              </div>
              <div className="flex items-center gap-1.5">
                <CheckCircle2 className="size-4 text-emerald-500" />
                <span>AI-Assisted analysis</span>
              </div>
              <div className="flex items-center gap-1.5">
                <CheckCircle2 className="size-4 text-emerald-500" />
                <span>Department accountability</span>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section id="how-it-works" className="border-t bg-white py-20 sm:py-24">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="mx-auto max-w-2xl text-center">
            <h2 className="text-3xl font-bold tracking-tight sm:text-4xl">How It Works</h2>
            <p className="mt-4 text-lg text-muted-foreground">
              A clear process from submission to resolution.
            </p>
          </div>
          <div className="relative mt-16">
            <div className="absolute top-12 right-0 left-0 hidden h-0.5 bg-gradient-to-r from-transparent via-primary/20 to-transparent lg:block" />
            <div className="grid grid-cols-1 gap-8 sm:grid-cols-2 lg:grid-cols-5">
              {steps.map((step, i) => (
                <div key={step.title} className="group relative flex flex-col items-center text-center">
                  <div className="relative z-10 mb-4 flex size-20 items-center justify-center rounded-2xl border bg-white shadow-sm transition-all group-hover:shadow-md group-hover:shadow-primary/10">
                    <step.icon className="size-8 text-primary" />
                    <span className="absolute -top-2 -right-2 flex size-6 items-center justify-center rounded-full bg-primary text-xs font-bold text-primary-foreground">{i + 1}</span>
                  </div>
                  <h3 className="font-semibold">{step.title}</h3>
                  <p className="mt-1.5 text-sm text-muted-foreground">{step.desc}</p>
                  {i < steps.length - 1 && (
                    <ArrowRight className="mt-4 size-5 text-muted-foreground/40 lg:hidden" />
                  )}
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      <section id="features" className="border-t py-20 sm:py-24">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="mx-auto max-w-2xl text-center">
            <h2 className="text-3xl font-bold tracking-tight sm:text-4xl">Platform Features</h2>
            <p className="mt-4 text-lg text-muted-foreground">
              A structured system to improve governance, accountability, and public response.
            </p>
          </div>
          <div className="mt-16 grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {features.map((f) => (
              <div key={f.title} className="group rounded-xl border bg-card p-6 shadow-sm transition-all hover:shadow-md hover:shadow-primary/5">
                <div className="mb-4 flex size-12 items-center justify-center rounded-lg bg-primary/10 text-primary transition-colors group-hover:bg-primary group-hover:text-primary-foreground">
                  <f.icon className="size-6" />
                </div>
                <h3 className="text-lg font-semibold">{f.title}</h3>
                <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{f.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="border-t bg-primary/5 py-16">
        <div className="mx-auto max-w-4xl px-4 text-center sm:px-6 lg:px-8">
          <Shield className="mx-auto mb-4 size-10 text-primary" />
          <h2 className="text-2xl font-bold">Responsible AI</h2>
          <p className="mx-auto mt-4 max-w-2xl text-muted-foreground">
            AI supports authorized officers and departments in reviewing grievances. Final decisions remain
            with human officials, and prioritization is based on service impact, urgency, and public need.
          </p>
        </div>
      </section>

      <section className="border-t py-20 sm:py-24">
        <div className="mx-auto max-w-3xl px-4 text-center sm:px-6 lg:px-8">
          <h2 className="text-3xl font-bold tracking-tight sm:text-4xl">Ready to file a grievance?</h2>
          <p className="mt-4 text-lg text-muted-foreground">
            Submit your concern and monitor the response through a transparent, accountable workflow.
          </p>
          <div className="mt-8 flex flex-col items-center justify-center gap-4 sm:flex-row">
            <Link href="/register">
              <Button size="lg" className="h-12 gap-2 px-8 text-base font-semibold">
                Create Account
                <ArrowRight className="size-4" />
              </Button>
            </Link>
            <Link href="/login">
              <Button variant="outline" size="lg" className="h-12 px-8 text-base font-semibold">
                Sign In
              </Button>
            </Link>
          </div>
        </div>
      </section>

      <footer className="border-t bg-card py-10">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col items-center justify-between gap-4 sm:flex-row">
            <div className="flex items-center gap-2">
              <Shield className="size-5 text-primary" />
              <span className="font-semibold">Smart Grievance Management System</span>
            </div>
            <p className="text-sm text-muted-foreground">
              A civic service platform for secure, transparent grievance handling.
            </p>
            <p className="text-xs text-muted-foreground">
              Public service workflow
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
}
