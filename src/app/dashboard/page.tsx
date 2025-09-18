"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/context/AuthContext";
import DashboardLayout from "@/components/dashboard-layout";
import { Role } from "@prisma/client";

export default function DashboardPage() {
  const { user, loading, isAuthenticated, isInitialized } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!loading && isInitialized && !isAuthenticated) {
      router.push("/login");
    } else if (!loading && isInitialized && user) {
      switch (user.role) {
        case Role.Admin:
          router.push("/dashboard/admin");
          break;
        case Role.Organizer:
          router.push("/dashboard/organizer");
          break;
        case Role.Customer:
          router.push("/dashboard/customer/events");
          break;
        default:
          router.push("/login");
      }
    }
  }, [loading, isInitialized, isAuthenticated, user, router]);

  if (loading || !isInitialized) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center min-h-screen-minus-header">
          <p>Loading dashboard...</p>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="flex items-center justify-center min-h-screen-minus-header">
        <p>Redirecting to your dashboard...</p>
      </div>
    </DashboardLayout>
  );
}
