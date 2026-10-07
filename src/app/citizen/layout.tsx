'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import {
  Shield,
  LayoutDashboard,
  FileText,
  FolderOpen,
  Bell,
  User,
  LogOut,
  Menu,
  X,
  Headphones,
  ChevronDown,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { AIChatWidget } from '@/components/civic/ai-chat-drawer';
import { NotificationBell } from '@/components/civic/notification-bell';

const navItems = [
  { href: '/citizen/dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { href: '/citizen/submit', label: 'Submit Grievance', icon: FileText },
  { href: '/citizen/grievances', label: 'My Grievances', icon: FolderOpen },
  { href: '/citizen/notifications', label: 'Notifications', icon: Bell },
  { href: '/citizen/assistant', label: 'Support', icon: Headphones },
];

export default function CitizenLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [user, setUser] = useState<{ name: string; email: string } | null>(null);
  const [authLoading, setAuthLoading] = useState(true);

  useEffect(() => {
    const controller = new AbortController();
    async function verifyCitizen() {
      try {
        const response = await fetch('/api/auth/me', {
          cache: 'no-store',
          signal: controller.signal,
        });
        const result = await response.json();
        if (!response.ok || !result.user) {
          router.replace('/login');
          return;
        }
        if (result.user.role !== 'citizen') {
          router.replace(result.user.role === 'officer'
            ? '/officer/dashboard'
            : result.user.role === 'admin' || result.user.role === 'department_admin'
              ? '/admin/dashboard'
              : '/login');
          return;
        }
        setUser({ name: result.user.name, email: result.user.email });
      } catch (error) {
        if (!controller.signal.aborted) {
          console.error('Citizen portal authorization check failed:', error);
          router.replace('/login');
        }
      } finally {
        if (!controller.signal.aborted) setAuthLoading(false);
      }
    }
    void verifyCitizen();
    return () => controller.abort();
  }, [router]);

  const handleLogout = async () => {
    await fetch('/api/auth/logout', { method: 'POST' });
    router.push('/login');
  };

  if (authLoading) {
    return <div className="flex min-h-screen items-center justify-center bg-background" role="status">Checking your account…</div>;
  }
  if (!user) return null;

  return (
    <div className="min-h-screen bg-background">
      <header className="sticky top-0 z-40 border-b bg-background/90 backdrop-blur-sm">
        <div className="mx-auto flex max-w-7xl items-center justify-between gap-3 px-4 py-3 lg:px-6">
          <div className="flex items-center gap-3">
            <button
              type="button"
              className="inline-flex h-10 w-10 items-center justify-center rounded-md border border-border bg-card text-foreground lg:hidden"
              onClick={() => setMobileMenuOpen((value) => !value)}
              aria-label="Toggle navigation"
            >
              {mobileMenuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
            </button>

            <Link href="/citizen/dashboard" className="flex items-center gap-2.5">
              <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary text-primary-foreground">
                <Shield className="h-4 w-4" />
              </div>
              <div className="leading-none">
                <div className="text-base font-semibold tracking-tight text-foreground">Smart Grievance Management System</div>
              </div>
            </Link>
          </div>

          <nav className="hidden items-center gap-1 lg:flex">
            {navItems.map((item) => {
              const isActive = pathname === item.href || pathname.startsWith(item.href + '/');
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={cn(
                    'flex items-center gap-2 rounded-md px-3 py-2 text-sm font-medium transition-colors',
                    isActive
                      ? 'bg-primary/10 text-primary'
                      : 'text-muted-foreground hover:bg-muted hover:text-foreground',
                  )}
                >
                  <item.icon className="h-4 w-4" />
                  {item.label}
                </Link>
              );
            })}
          </nav>

          <div className="flex items-center gap-2">
            <NotificationBell href="/citizen/notifications" />
            <div className="relative hidden sm:block">
              <details className="group relative">
                <summary className="flex cursor-pointer list-none items-center gap-2 rounded-md border bg-card px-2.5 py-2 text-sm font-medium text-foreground">
                  <div className="flex h-7 w-7 items-center justify-center rounded-full bg-primary/10 text-xs font-semibold text-primary">
                    {user.name?.split(' ').map((name) => name[0]).join('').slice(0, 2) || 'U'}
                  </div>
                  <span className="max-w-28 truncate">{user.name}</span>
                  <ChevronDown className="h-4 w-4 text-muted-foreground" />
                </summary>
                <div className="absolute right-0 z-50 mt-2 w-64 rounded-lg border bg-popover p-3 shadow-sm">
                  <p className="truncate text-sm font-medium text-foreground">{user.name}</p>
                  <p className="truncate text-xs text-muted-foreground">{user.email}</p>
                  <div className="mt-3 border-t pt-3">
                    <button
                      type="button"
                      onClick={handleLogout}
                      className="flex w-full items-center gap-2 rounded-md px-2 py-2 text-sm text-foreground hover:bg-muted"
                    >
                      <LogOut className="h-4 w-4" />
                      Logout
                    </button>
                  </div>
                </div>
              </details>
            </div>
            <div className="flex items-center gap-2 sm:hidden">
              <Link href="/citizen/notifications" className="flex h-10 w-10 items-center justify-center rounded-md border bg-card text-foreground">
                <Bell className="h-4 w-4" />
              </Link>
              <button
                type="button"
                onClick={handleLogout}
                className="flex h-10 w-10 items-center justify-center rounded-md border bg-card text-foreground"
                aria-label="Logout"
              >
                <LogOut className="h-4 w-4" />
              </button>
            </div>
          </div>
        </div>

        {mobileMenuOpen && (
          <div className="border-t bg-card lg:hidden">
            <nav className="mx-auto flex max-w-7xl flex-col gap-1 px-4 py-3">
              {navItems.map((item) => {
                const isActive = pathname === item.href || pathname.startsWith(item.href + '/');
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    onClick={() => setMobileMenuOpen(false)}
                    className={cn(
                      'flex items-center gap-2 rounded-md px-3 py-2 text-sm font-medium',
                      isActive ? 'bg-primary/10 text-primary' : 'text-foreground hover:bg-muted',
                    )}
                  >
                    <item.icon className="h-4 w-4" />
                    {item.label}
                  </Link>
                );
              })}
            </nav>
          </div>
        )}
      </header>

      <main className="mx-auto max-w-7xl px-4 py-6 lg:px-6 lg:py-8">{children}</main>
      <AIChatWidget portalRole="citizen" userName={user?.name} />
    </div>
  );
}
