
"use client";

import { ReactNode, useState, useEffect } from "react";
import Link from "next/link";
import { useAuth } from "@/context/AuthContext";
import { usePathname, useRouter } from "next/navigation";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Role } from "@prisma/client";
import { Menu, X, LogOut, Loader2 } from "lucide-react";
import { LoadingSpinner, LoadingPage } from "@/components/ui/loading-spinner";
import { PageLoadingBar } from "@/components/ui/page-loading-bar";
import { useNavigationLoading } from "@/hooks/use-navigation-loading";

interface DashboardLayoutProps {
  children: ReactNode;
}

const adminNavItems = [
  { name: "Overview", href: "/dashboard/admin" },
  { name: "Manage Events", href: "/dashboard/admin/events" },
  { name: "Manage Users", href: "/dashboard/admin/users" },
  { name: "Reports", href: "/dashboard/admin/reports" },
];

const organizerNavItems = [
  { name: "Overview", href: "/dashboard/organizer" },
  { name: "My Events", href: "/dashboard/organizer/events" },
];

const customerNavItems = [
  { name: "Browse Events", href: "/dashboard/customer/events" },
  { name: "My Reservations", href: "/dashboard/customer/reservations" },
  { name: "Profile", href: "/dashboard/customer/profile" },
];

function useDashboardNavigation() {
  const { user, loading, logout } = useAuth();
  const router = useRouter();
  const pathname = usePathname();
  const [isMounted, setIsMounted] = useState(false);
  const isNavigating = useNavigationLoading();

  useEffect(() => {
    setIsMounted(true);
    return () => setIsMounted(false);
  }, []);

  useEffect(() => {
    if (!isMounted || loading) return;
    
    if (user) {
      const roleBasePath = user.role.toLowerCase();
      const targetPath = `/dashboard/${roleBasePath}`;
      
      if (!pathname.includes(roleBasePath)) {
        router.replace(targetPath);
      }
    }
  }, [user, loading, isMounted, pathname, router]);

  return { user, loading, isMounted, isNavigating };
}

export default function DashboardLayout({ children }: DashboardLayoutProps) {
  const pathname = usePathname();
  const { user, loading, isMounted, isNavigating } = useDashboardNavigation();
  const { logout } = useAuth();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isLoggingOut, setIsLoggingOut] = useState(false);
  const [prevPath, setPrevPath] = useState(pathname);
  
  // Track previous path for loading state
  useEffect(() => {
    setPrevPath(pathname);
  }, [pathname]);
  
  const showPageLoading = isNavigating && pathname !== prevPath;

  if (loading || !isMounted) {
    return <LoadingPage />;
  }

  if (!user) {
    return (
      <div className="flex min-h-screen items-center justify-center p-4">
        <div className="text-center">
          <p className="mb-4 text-lg text-muted-foreground">Please log in to view the dashboard.</p>
          <Button asChild>
            <Link href="/login">Go to Login</Link>
          </Button>
        </div>
      </div>
    );
  }

  const navItems = (() => {
    switch (user.role) {
      case Role.Admin:
        return adminNavItems;
      case Role.Organizer:
        return organizerNavItems;
      case Role.Customer:
        return customerNavItems;
      default:
        return [];
    }
  })();

  const handleLogout = async () => {
    try {
      setIsLoggingOut(true);
      await logout();
    } catch (error) {
      console.error('Logout error:', error);
    } finally {
      setIsLoggingOut(false);
    }
  };

  const renderSidebar = (isMobile = false) => (
    <aside
      className={cn(
        "fixed inset-y-0 left-0 z-40 w-64 transform bg-white shadow-lg transition-transform duration-300 ease-in-out dark:bg-gray-900",
        isMobile
          ? isMobileMenuOpen
            ? "translate-x-0 lg:hidden"
            : "-translate-x-full lg:hidden"
          : "hidden lg:block"
      )}
    >
      <div className="flex h-full flex-col overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-gray-200 px-6 py-4 dark:border-gray-800">
          <h1 className="text-xl font-bold">
            <span className="bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
              Event
            </span>
            <span className="bg-gradient-to-r from-purple-600 to-pink-600 bg-clip-text text-transparent">
              Sphere
            </span>
          </h1>
          {isMobile && (
            <button
              onClick={() => setIsMobileMenuOpen(false)}
              className="rounded-md p-1 text-gray-500 hover:bg-gray-100 hover:text-gray-700 dark:text-gray-400 dark:hover:bg-gray-800 dark:hover:text-gray-200"
            >
              <X className="h-6 w-6" />
            </button>
          )}
        </div>

        {/* Navigation */}
        <nav className="flex-1 space-y-1 px-4 py-4">
          {navItems.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "group flex items-center gap-3 rounded-md px-3 py-2.5 text-sm font-medium transition-colors",
                pathname === item.href
                  ? "bg-blue-50 text-blue-700 dark:bg-blue-900/50 dark:text-blue-100"
                  : "text-gray-700 hover:bg-gray-100 dark:text-gray-300 dark:hover:bg-gray-800"
              )}
              onClick={() => setIsMobileMenuOpen(false)}
            >
              <span className="h-5 w-1 rounded-full bg-transparent group-hover:bg-blue-200 dark:group-hover:bg-blue-800" />
              {item.name}
            </Link>
          ))}
        </nav>

        {/* User Profile */}
        <div className="border-t border-gray-200 p-4 dark:border-gray-800">
          <div className="mb-3 flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-gradient-to-r from-blue-500 to-purple-500 text-white">
              {user.name?.[0]?.toUpperCase() || user.email[0].toUpperCase()}
            </div>
            <div className="min-w-0">
              <p className="truncate text-sm font-medium text-gray-900 dark:text-white">
                {user.name || user.email}
              </p>
              <p className="truncate text-xs text-gray-500 dark:text-gray-400">
                {user.role}
              </p>
            </div>
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={handleLogout}
            disabled={isLoggingOut}
            className="text-red-500 hover:bg-red-50 hover:text-red-600"
          >
            {isLoggingOut ? (
              <>
                <LoadingSpinner size="sm" className="h-4 w-4 mr-2" />
                Logging out...
              </>
            ) : (
              <>
                <LogOut className="h-4 w-4 mr-2" />
                Logout
              </>
            )}
          </Button>
        </div>
      </div>
    </aside>
  );

  return (
    <div className="flex h-screen bg-gray-50 relative">
      {showPageLoading && <PageLoadingBar />}
      {/* Mobile menu button */}
      <button
        onClick={() => setIsMobileMenuOpen(true)}
        className="fixed left-4 top-4 z-50 rounded-md bg-white p-2 shadow-md lg:hidden"
        aria-label="Toggle menu"
      >
        <Menu className="h-6 w-6" />
      </button>

      {/* Desktop Sidebar */}
      {renderSidebar()}

      {/* Mobile Sidebar Overlay */}
      {isMobileMenuOpen && (
        <div
          className="fixed inset-0 z-30 bg-black/50 lg:hidden"
          onClick={() => setIsMobileMenuOpen(false)}
        />
      )}

      {/* Mobile Sidebar */}
      {renderSidebar(true)}

      {/* Main Content */}
      <div className="flex flex-1 flex-col lg:pl-64">
        <header className="sticky top-0 z-10 flex h-16 items-center justify-between border-b border-gray-200 bg-white px-4 shadow-sm dark:border-gray-800 dark:bg-gray-900 lg:px-6">
          <div className="lg:hidden">
            <button
              onClick={() => setIsMobileMenuOpen(true)}
              className="rounded-md p-2 text-gray-500 hover:bg-gray-100 hover:text-gray-700 dark:text-gray-400 dark:hover:bg-gray-800 dark:hover:text-gray-200"
            >
              <Menu className="h-5 w-5" />
            </button>
          </div>
          <div className="flex-1 lg:flex lg:justify-end">
            <div className="flex items-center gap-2">
              <span className="hidden text-sm text-gray-500 dark:text-gray-400 md:inline-block">
                Welcome back,{' '}
                <span className="font-medium text-gray-900 dark:text-white">
                  {user.name || user.email.split('@')[0]}
                </span>
              </span>
              <div className="hidden h-8 w-8 items-center justify-center rounded-full bg-gradient-to-r from-blue-500 to-purple-500 text-xs font-medium text-white">
                {user.name?.[0]?.toUpperCase() || user.email[0].toUpperCase()}
              </div>
            </div>
          </div>
        </header>
        <main className="flex-1 p-4 sm:p-6">
          <div className="mx-auto max-w-7xl">
            {children}
          </div>
        </main>
      </div>
    </div>
  );
}
