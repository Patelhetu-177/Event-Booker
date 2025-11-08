"use client";

import DashboardLayout from "@/components/dashboard-layout";
import { useAuth } from "@/context/AuthContext";
import { useRouter } from "next/navigation";

// Define Role enum to match Prisma schema
const Role = {
  Admin: 'Admin',
  Organizer: 'Organizer',
  Customer: 'Customer'
} as const;

type Role = typeof Role[keyof typeof Role];
import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Calendar, Users, Ticket, DollarSign, Plus, Eye } from "lucide-react";
import CreateEventModal from "@/components/CreateEventModal";
import { getBaseUrl } from "@/lib/client-utils";
import { LoadingPage, LoadingSection, LoadingSpinner } from "@/components/ui/loading-spinner";

interface Event {
  id: string;
  title: string;
  description?: string;
  date: string;
  createdAt: string;
  _count: {
    tickets: number;
    reservations: number;
  };
  organizer: {
    name: string;
    email: string;
  };
}

interface RecentActivity {
  id: string;
  type: "reservation_made" | "payment_completed";
  description: string;
  timestamp: string;
}

interface EventPerformance {
  id: string;
  title: string;
  date: string;
  totalTickets: number;
  soldTickets: number;
  revenue: number;
  conversionRate: number;
}

interface OrganizerReportData {
  totalEvents: number;
  totalTickets: number;
  totalReservations: number;
  totalRevenue: number;
  recentActivity: RecentActivity[];
  eventPerformance: EventPerformance[];
  events: Event[];
}

export default function OrganizerDashboardPage() {
  const { user, loading: authLoading, isAuthenticated, hasRole } = useAuth();
  const router = useRouter();
  const [reportData, setReportData] = useState<OrganizerReportData | null>(null);
  const [createModalOpen, setCreateModalOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchReportData = async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem("accessToken");
      const response = await fetch(`${getBaseUrl()}/api/organizer/reports`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      
      if (response.ok) {
        const data = await response.json();
        console.log("Organizer dashboard data:", data.data);
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

  useEffect(() => {
    if (!authLoading && (!isAuthenticated || !hasRole([Role.Admin, Role.Organizer]))) {
      router.push("/login");
    }
  }, [authLoading, isAuthenticated, hasRole, router]);

  useEffect(() => {
    if (isAuthenticated) {
      fetchReportData();
    }
  }, [isAuthenticated]);

  if (loading) {
    return (
      <DashboardLayout>
        <div className="flex flex-col items-center justify-center min-h-[60vh]">
          <div className="mb-4">
            <LoadingSpinner size="md" />
          </div>
          <p className="text-muted-foreground">Loading dashboard...</p>
        </div>
      </DashboardLayout>
    );
  }

  if (authLoading || !isAuthenticated || !hasRole([Role.Admin, Role.Organizer])) {
    return (
      <DashboardLayout>
        <LoadingSection />
      </DashboardLayout>
    );
  }

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

  const getActivityIcon = (type: string) => {
    switch (type) {
      case "reservation_made":
        return "🎫";
      case "payment_completed":
        return "💰";
      default:
        return "📊";
    }
  };

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold">Organizer Dashboard</h1>
            <p className="text-muted-foreground">Welcome back, {user?.name}! Manage your events and track performance.</p>
          </div>
          <Button onClick={() => setCreateModalOpen(true)}>
            <Plus className="h-4 w-4 mr-2" />
            Create Event
          </Button>
        </div>

        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded">
            {error}
          </div>
        )}

        {loading ? (
          <div className="flex items-center justify-center py-8">
            <p>Loading dashboard data...</p>
          </div>
        ) : reportData && reportData.events && reportData.recentActivity ? (
          <>
            <div className="grid gap-4 md:grid-cols-4">
              <Card>
                <CardContent className="p-6">
                  <div className="flex items-center">
                    <Calendar className="h-4 w-4 text-muted-foreground" />
                    <div className="ml-2">
                      <p className="text-sm font-medium">Total Events</p>
                      <p className="text-2xl font-bold">{reportData.totalEvents}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
              
              <Card>
                <CardContent className="p-6">
                  <div className="flex items-center">
                    <Ticket className="h-4 w-4 text-muted-foreground" />
                    <div className="ml-2">
                      <p className="text-sm font-medium">Total Tickets</p>
                      <p className="text-2xl font-bold">{reportData.totalTickets}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
              
              <Card>
                <CardContent className="p-6">
                  <div className="flex items-center">
                    <Users className="h-4 w-4 text-muted-foreground" />
                    <div className="ml-2">
                      <p className="text-sm font-medium">Reservations</p>
                      <p className="text-2xl font-bold">{reportData.totalReservations}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
              
              <Card>
                <CardContent className="p-6">
                  <div className="flex items-center">
                    <DollarSign className="h-4 w-4 text-muted-foreground" />
                    <div className="ml-2">
                      <p className="text-sm font-medium">Revenue</p>
                      <p className="text-2xl font-bold">${reportData.totalRevenue.toFixed(2)}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>

            <div className="grid gap-6 md:grid-cols-2">
              <Card>
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <div>
                      <CardTitle>My Events</CardTitle>
                      <CardDescription>Your created events</CardDescription>
                    </div>
                    {reportData.events && reportData.events.length > 0 && (
                      <Button 
                        variant="outline" 
                        size="sm"
                        onClick={() => router.push("/dashboard/organizer/events")}
                      >
                        View All
                      </Button>
                    )}
                  </div>
                </CardHeader>
                <CardContent>
                  {!reportData.events || reportData.events.length === 0 ? (
                    <div className="text-center py-6">
                      <Calendar className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                      <h3 className="text-lg font-semibold mb-2">No Events Yet</h3>
                      <p className="text-muted-foreground mb-4">Create your first event to start managing bookings.</p>
                      <Button onClick={() => setCreateModalOpen(true)}>Create Your First Event</Button>
                    </div>
                  ) : (
                    <div className="space-y-4">
                      {(reportData.events || []).slice(0, 5).map((event) => (
                        <div key={event.id} className="flex items-center justify-between p-3 border rounded">
                          <div>
                            <h3 className="font-semibold">{event.title}</h3>
                            <p className="text-sm text-muted-foreground">
                              {new Date(event.date).toLocaleDateString()}
                            </p>
                          </div>
                          <Button 
                            variant="outline" 
                            size="sm"
                            onClick={() => router.push(`/dashboard/organizer/events/${event.id}`)}
                          >
                            <Eye className="h-4 w-4" />
                          </Button>
                        </div>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Recent Activity</CardTitle>
                  <CardDescription>Latest bookings and payments</CardDescription>
                </CardHeader>
                <CardContent>
                  {!reportData.recentActivity || reportData.recentActivity.length === 0 ? (
                    <p className="text-sm text-muted-foreground">No recent activity</p>
                  ) : (
                    <div className="space-y-4">
                      {(reportData.recentActivity || []).slice(0, 5).map((activity) => (
                        <div key={activity.id} className="flex items-center space-x-4">
                          <span className="text-2xl">{getActivityIcon(activity.type)}</span>
                          <div className="flex-1">
                            <p className="text-sm">{activity.description}</p>
                            <p className="text-xs text-muted-foreground">
                              {formatTimeAgo(activity.timestamp)}
                            </p>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>
          </>
        ) : (
          <Card>
            <CardContent className="flex items-center justify-center py-8">
              <p className="text-muted-foreground">Unable to load dashboard data.</p>
            </CardContent>
          </Card>
        )}

        <CreateEventModal
          open={createModalOpen}
          onOpenChange={setCreateModalOpen}
          onEventCreated={fetchReportData}
        />
      </div>
    </DashboardLayout>
  );
}
