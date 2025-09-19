
"use client";

import { ReactNode } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/context/AuthContext";
import { Role } from "@prisma/client";

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

export default function DashboardLayout({ children }: DashboardLayoutProps) {
  const { user, logout, loading } = useAuth();
  const pathname = usePathname();

  if (loading) {
    return <div className="flex items-center justify-center min-h-screen">Loading...</div>;
  }

  if (!user) {
    return <div className="flex items-center justify-center min-h-screen">Please log in to view the dashboard.</div>;
  }

  let navItems: { name: string; href: string }[] = [];
  switch (user.role) {
    case Role.Admin:
      navItems = adminNavItems;
      break;
    case Role.Organizer:
      navItems = organizerNavItems;
      break;
    case Role.Customer:
      navItems = customerNavItems;
      break;
    default:
      navItems = [];
  }

  return (
    <div className="flex min-h-screen bg-gray-100 dark:bg-gray-950">
      <aside className="w-64 bg-white dark:bg-gray-900 shadow-md p-4 space-y-4">
        <div className="text-xl font-bold text-gray-800 dark:text-white">Event Booker</div>
        <nav className="space-y-2">
          {navItems.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "flex items-center gap-2 px-3 py-2 rounded-md text-sm font-medium transition-colors",
                pathname === item.href
                  ? "bg-blue-600 text-white"
                  : "text-gray-700 hover:bg-gray-200 dark:text-gray-300 dark:hover:bg-gray-800"
              )}
            >
              {item.name}
            </Link>
          ))}
        </nav>
        <div className="pt-4 border-t dark:border-gray-700">
          <p className="text-sm text-gray-500 dark:text-gray-400">Logged in as: {user.email} ({user.role})</p>
          <Button onClick={logout} className="mt-2 w-full" variant="destructive">
            Logout
          </Button>
        </div>
      </aside>

      <div className="flex flex-col flex-1">
        <header className="bg-white dark:bg-gray-900 shadow-sm p-4 flex items-center justify-between">
          <h1 className="text-2xl font-semibold text-gray-800 dark:text-white">Dashboard</h1>
        </header>
        <main className="flex-1 p-6 overflow-auto">{children}</main>
      </div>
    </div>
  );
}
