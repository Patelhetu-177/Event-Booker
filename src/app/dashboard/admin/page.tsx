"use client";

import DashboardLayout from "@/components/dashboard-layout";
import { useAuth } from "@/context/AuthContext";
import { useRouter } from "next/navigation";
import { Role } from "@prisma/client";
import { useEffect } from "react";

export default function AdminDashboardPage() {
  const { user, loading, isAuthenticated, hasRole } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!loading && (!isAuthenticated || !hasRole([Role.Admin]))) {
      router.push("/login");
    }
  }, [loading, isAuthenticated, hasRole, router]);

  if (loading || !user || !hasRole([Role.Admin])) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center min-h-screen-minus-header">
          <p>Loading or unauthorized...</p>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <h2 className="text-3xl font-bold mb-6">Admin Dashboard</h2>
      <p>Welcome, Admin {user.name}! Here you can manage users, events, and view reports.</p>
    </DashboardLayout>
  );
}
