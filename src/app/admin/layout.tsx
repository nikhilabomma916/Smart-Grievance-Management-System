'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import {
  LayoutDashboard,
  FolderOpen,
  Building2,
  Users,
  BarChart3,
  Clock3,
  FileText,
  Bell,
  Shield,
  Menu,
  LogOut,
  ChevronDown,
  User,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { AIChatWidget } from '@/components/civic/ai-chat-drawer';
import { NotificationBell } from '@/components/civic/notification-bell';

const adminNavItems = [
  { title: 'Dashboard', href: '/admin/dashboard', icon: LayoutDashboard },
  { title: 'Grievances', href: '/admin/grievances', icon: FolderOpen },
  { title: 'Officers', href: '/admin/officers', icon: Users },
  { title: 'Department Performance', href: '/admin/departments', icon: Building2 },
  { title: 'SLA Monitoring', href: '/admin/sla', icon: Clock3 },
  { title: 'Analytics', href: '/admin/analytics', icon: BarChart3 },
  { title: 'Audit Logs', href: '/admin/audit', icon: FileText },
];

const departmentAdminPages = [
  '/admin/dashboard',
  '/admin/grievances',
  '/admin/departments',
  '/admin/analytics',
  '/admin/audit',
];

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const [mobileMenuOpen, setMobileMenuOpen] = React.useState(false);
  const [authLoading, setAuthLoading] = useState(true);
  const [adminRole, setAdminRole] = useState<'admin' | 'department_admin' | null>(null);

  useEffect(() => {
    async function verifyAdministrator() {
      try {
        const response = await fetch('/api/auth/me');
        const result = await response.json();
        const role = result.user?.role;
        if (!response.ok || (role !== 'admin' && role !== 'department_admin')) {
          router.replace(role === 'officer' ? '/officer/dashboard' : '/login');
          return;
        }
        setAdminRole(role);
      } catch (error) {
        console.error('Admin authorization check failed:', error);
        router.replace('/login');
      } finally {
        setAuthLoading(false);
      }
    }
    void verifyAdministrator();
  }, [router]);

  useEffect(() => {
    if (
      adminRole === 'department_admin' &&
      !departmentAdminPages.some((href) => pathname === href || pathname?.startsWith(`${href}/`))
    ) {
      router.replace('/admin/dashboard');
    }
  }, [adminRole, pathname, router]);

  const handleLogout = async () => {
    await fetch('/api/auth/logout', { method: 'POST' });
    router.push('/login');
  };

  if (authLoading) {
    return <div className="flex h-screen items-center justify-center">Loading admin portal…</div>;
  }
  if (!adminRole) return null;

  const pageAllowed = adminRole === 'admin' || departmentAdminPages.some(
    (href) => pathname === href || pathname?.startsWith(`${href}/`),
  );
  if (!pageAllowed) return null;

  const visibleNavItems = adminRole === 'admin'
    ? adminNavItems
    : adminNavItems.filter((item) => departmentAdminPages.some((href) => item.href === href));

  const portalName = adminRole === 'admin' ? 'System Admin' : 'Department Admin';

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
              <Menu className="h-5 w-5" />
            </button>

            <Link href="/admin/dashboard" className="flex items-center gap-2.5">
              <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary text-primary-foreground">
                <Shield className="h-4 w-4" />
              </div>
              <div className="leading-none">
                <div className="text-base font-semibold tracking-tight text-foreground">Smart Grievance Management System</div>
              </div>
            </Link>
          </div>

          <nav className="hidden items-center gap-1 lg:flex">
            {visibleNavItems.map((item) => {
              const isActive = pathname === item.href || pathname.startsWith(`${item.href}/`);
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={cn(
                    'flex items-center gap-2 rounded-md px-3 py-2 text-sm font-medium transition-colors',
                    isActive ? 'bg-primary/10 text-primary' : 'text-muted-foreground hover:bg-muted hover:text-foreground',
                  )}
                >
                  <item.icon className="h-4 w-4" />
                  {item.title}
                </Link>
              );
            })}
          </nav>

          <div className="flex items-center gap-2">
            <NotificationBell href="/admin/notifications" />
            <div className="relative hidden sm:block">
              <details className="group relative">
                <summary className="flex cursor-pointer list-none items-center gap-2 rounded-md border bg-card px-2.5 py-2 text-sm font-medium text-foreground">
                  <div className="flex h-7 w-7 items-center justify-center rounded-full bg-primary/10 text-xs font-semibold text-primary">
                    {portalName.slice(0, 2).toUpperCase()}
                  </div>
                  <span className="max-w-28 truncate">{portalName}</span>
                  <ChevronDown className="h-4 w-4 text-muted-foreground" />
                </summary>
                <div className="absolute right-0 z-50 mt-2 w-64 rounded-lg border bg-popover p-3 shadow-sm">
                  <p className="truncate text-sm font-medium text-foreground">{portalName}</p>
                  <p className="truncate text-xs text-muted-foreground">{adminRole === 'admin' ? 'System administration' : 'Department administration'}</p>
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
              <Link href="/admin/notifications" className="flex h-10 w-10 items-center justify-center rounded-md border bg-card text-foreground">
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
              {visibleNavItems.map((item) => {
                const isActive = pathname === item.href || pathname.startsWith(`${item.href}/`);
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
                    {item.title}
                  </Link>
                );
              })}
            </nav>
          </div>
        )}
      </header>

      <main className="mx-auto max-w-7xl px-4 py-6 lg:px-6 lg:py-8">{children}</main>
      {adminRole === 'admin' && <AIChatWidget portalRole="admin" userName={portalName} />}
    </div>
  );
}
