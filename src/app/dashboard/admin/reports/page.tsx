"use client";

import { useEffect, useState } from "react";
import { useAuth } from "@/context/AuthContext";
import DashboardLayout from "@/components/dashboard-layout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { getBaseUrl } from "@/lib/client-utils";
import { LoadingSpinner } from "@/components/ui/loading-spinner";

interface ReportData {
  totalUsers: number;
  totalEvents: number;
  totalReservations: number;
  totalTickets: number;
  totalRevenue: number;
  recentActivity: {
    id: string;
    type: "user_registered" | "event_created" | "reservation_made" | "payment_completed";
    description: string;
    timestamp: string;
  }[];
  usersByRole: {
    role: string;
    count: number;
  }[];
}

export default function AdminReportsPage() {
  const { user, hasRole } = useAuth();
  const [reportData, setReportData] = useState<ReportData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchReportData = async () => {
      try {
        const token = localStorage.getItem("accessToken");
        const response = await fetch(`${getBaseUrl()}/api/admin/reports`, {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        });

        if (response.ok) {
          const data = await response.json();
          setReportData(data.data);
          setError(null);
        } else {
          const errorData = await response.json();
          setError(errorData.message || "Failed to fetch report data");
        }
      } catch (err) {
        console.error("Error fetching report data:", err);
        setError("An error occurred while fetching report data");
      } finally {
        setLoading(false);
      }
    };

    if (user && hasRole(["Admin"])) {
      fetchReportData();
    }
  }, [user, hasRole]);

  const getActivityIcon = (type: string) => {
    switch (type) {
      case "user_registered":
        return "👤";
      case "event_created":
        return "📅";
      case "reservation_made":
        return "🎫";
      case "payment_completed":
        return "💰";
      default:
        return "📊";
    }
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "USD",
    }).format(amount);
  };

  const formatTimeAgo = (timestamp: string) => {
    const now = new Date();
    const time = new Date(timestamp);
    const diffInMinutes = Math.floor((now.getTime() - time.getTime()) / (1000 * 60));
    
    if (diffInMinutes < 60) {
      return `${diffInMinutes} minutes ago`;
    } else if (diffInMinutes < 1440) {
      return `${Math.floor(diffInMinutes / 60)} hours ago`;
    } else {
      return `${Math.floor(diffInMinutes / 1440)} days ago`;
    }
  };

  if (!user || !hasRole(["Admin"])) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center min-h-screen-minus-header">
          <p>Access denied. Admin privileges required.</p>
        </div>
      </DashboardLayout>
    );
  }

  if (loading) {
    return (
      <DashboardLayout>
        <div className="flex flex-col items-center justify-center min-h-[60vh]">
          <div className="mb-4">
            <LoadingSpinner size="md" />
          </div>
          <p className="text-muted-foreground">Loading reports...</p>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <h1 className="text-3xl font-bold">Reports & Analytics</h1>

        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded">
            {error}
          </div>
        )}

        {loading ? (
          <div className="flex items-center justify-center py-8">
            <p>Loading reports...</p>
          </div>
        ) : reportData ? (
          <>
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-5">
              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Total Users</CardTitle>
                  <span className="text-2xl">👥</span>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{reportData.totalUsers}</div>
                  <p className="text-xs text-muted-foreground">
                    Registered users
                  </p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Total Events</CardTitle>
                  <span className="text-2xl">📅</span>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{reportData.totalEvents}</div>
                  <p className="text-xs text-muted-foreground">
                    Events created
                  </p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Total Tickets</CardTitle>
                  <span className="text-2xl">🎟️</span>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{reportData.totalTickets}</div>
                  <p className="text-xs text-muted-foreground">
                    Tickets available
                  </p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Reservations</CardTitle>
                  <span className="text-2xl">🎫</span>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{reportData.totalReservations}</div>
                  <p className="text-xs text-muted-foreground">
                    Tickets booked
                  </p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Total Revenue</CardTitle>
                  <span className="text-2xl">💰</span>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{formatCurrency(reportData.totalRevenue)}</div>
                  <p className="text-xs text-muted-foreground">
                    From completed payments
                  </p>
                </CardContent>
              </Card>
            </div>

            <div className="grid gap-6 md:grid-cols-2">
              <Card>
                <CardHeader>
                  <CardTitle>Recent Activity</CardTitle>
                  <CardDescription>
                    Latest activities across the platform
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {reportData.recentActivity.length === 0 ? (
                      <p className="text-sm text-muted-foreground">No recent activity</p>
                    ) : (
                      reportData.recentActivity.map((activity) => (
                        <div key={activity.id} className="flex items-center space-x-4">
                          <span className="text-2xl">{getActivityIcon(activity.type)}</span>
                          <div className="flex-1">
                            <p className="text-sm">{activity.description}</p>
                            <p className="text-xs text-muted-foreground">
                              {formatTimeAgo(activity.timestamp)}
                            </p>
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>User Distribution</CardTitle>
                  <CardDescription>
                    Users by role across the platform
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {reportData.usersByRole.length === 0 ? (
                      <p className="text-sm text-muted-foreground">No user data available</p>
                    ) : (
                      reportData.usersByRole.map((roleData) => (
                        <div key={roleData.role} className="flex items-center justify-between">
                          <div className="flex items-center space-x-2">
                            <span className="text-sm font-medium">{roleData.role}</span>
                          </div>
                          <div className="flex items-center space-x-2">
                            <div className="text-sm font-bold">{roleData.count}</div>
                            <div className="text-xs text-muted-foreground">
                              ({((roleData.count / reportData.totalUsers) * 100).toFixed(1)}%)
                            </div>
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                </CardContent>
              </Card>
            </div>
          </>
        ) : (
          <Card>
            <CardContent className="flex items-center justify-center py-8">
              <p className="text-muted-foreground">Unable to load report data.</p>
            </CardContent>
          </Card>
        )}
      </div>
    </DashboardLayout>
  );
}
