"use client";

import { useEffect, useState } from "react";
import { useRouter, useParams } from "next/navigation";
import { useAuth } from "@/context/AuthContext";
import DashboardLayout from "@/components/dashboard-layout";
import { Role, TicketStatus, ReservationStatus } from "@prisma/client";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Calendar, Clock, User, ArrowLeft, Ticket as TicketIcon, Eye } from "lucide-react";
import { getBaseUrl } from "@/lib/client-utils";

interface EventDetail {
  id: string;
  title: string;
  description?: string;
  date: string;
  createdAt: string;
  organizer: { id: string; name: string; email: string };
  tickets: Ticket[];
  reservations: Reservation[];
}

interface Ticket {
  id: string;
  price: number;
  status: TicketStatus;
  createdAt: string;
}

interface Reservation {
  id: string;
  status: ReservationStatus;
  createdAt: string;
  user: {
    name: string;
    email: string;
  };
  ticket: {
    price: number;
  };
  payment?: {
    amount: number;
    status: string;
  };
}

export default function OrganizerEventDetailsPage() {
  const params = useParams();
  const id = params?.id as string;
  const { user, loading, isAuthenticated, hasRole, accessToken } = useAuth();
  const router = useRouter();
  const [event, setEvent] = useState<EventDetail | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loadingData, setLoadingData] = useState(true);

  useEffect(() => {
    if (!loading && (!isAuthenticated || !hasRole([Role.Admin, Role.Organizer]))) {
      router.push("/login");
    }
  }, [loading, isAuthenticated, hasRole, router]);

  useEffect(() => {
    const fetchEvent = async () => {
      if (!accessToken || !id) return;

      try {
        setLoadingData(true);
        const response = await fetch(`${getBaseUrl()}/api/events/${id}`, {
          headers: {
            Authorization: `Bearer ${accessToken}`,
          },
        });
        const data = await response.json();

        if (!response.ok) {
          setError(data.message || "Failed to fetch event details");
          return;
        }
        setEvent(data.data);
        setError(null);
      } catch (err) {
        console.error("Error fetching event details:", err);
        setError("An unexpected error occurred while fetching event details.");
      } finally {
        setLoadingData(false);
      }
    };

    if (isAuthenticated && id) {
      fetchEvent();
    }
  }, [isAuthenticated, accessToken, id]);

  const formatEventDate = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const isUpcoming = date > now;
    
    return {
      date: date.toLocaleDateString('en-US', { 
        weekday: 'long', 
        year: 'numeric', 
        month: 'long', 
        day: 'numeric' 
      }),
      time: date.toLocaleTimeString('en-US', { 
        hour: '2-digit', 
        minute: '2-digit' 
      }),
      isUpcoming
    };
  };

  const getStatusBadge = (status: ReservationStatus) => {
    switch (status) {
      case ReservationStatus.Confirmed:
        return <Badge variant="default">Confirmed</Badge>;
      case ReservationStatus.Cancelled:
        return <Badge variant="secondary">Cancelled</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  if (loading || !user || !hasRole([Role.Admin, Role.Organizer])) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center min-h-screen-minus-header">
          <p>Loading or unauthorized...</p>
        </div>
      </DashboardLayout>
    );
  }

  if (loadingData) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center min-h-screen-minus-header">
          <p>Loading event details...</p>
        </div>
      </DashboardLayout>
    );
  }

  if (error || !event) {
    return (
      <DashboardLayout>
        <div className="space-y-6">
          <Button 
            variant="outline" 
            onClick={() => router.push("/dashboard/organizer")} 
            className="flex items-center gap-2"
          >
            <ArrowLeft className="h-4 w-4" />
            Back to Dashboard
          </Button>
          <Card>
            <CardContent className="flex items-center justify-center py-8">
              <p className="text-muted-foreground">{error || "Event not found"}</p>
            </CardContent>
          </Card>
        </div>
      </DashboardLayout>
    );
  }

  const eventDate = formatEventDate(event.date);
  const availableTickets = event.tickets.filter(ticket => ticket.status === TicketStatus.Available);
  const totalRevenue = event.reservations
    .filter(res => res.payment?.status === "Completed")
    .reduce((sum, res) => sum + (res.payment?.amount || 0), 0);

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <Button 
          variant="outline" 
          onClick={() => router.push("/dashboard/organizer")} 
          className="flex items-center gap-2"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to Dashboard
        </Button>

        <div className="grid gap-6 lg:grid-cols-3">
          <div className="lg:col-span-2 space-y-6">
            <Card>
              <CardHeader>
                <div className="flex items-start justify-between">
                  <div>
                    <CardTitle className="text-3xl mb-2">{event.title}</CardTitle>
                    <div className="flex items-center gap-2 text-muted-foreground">
                      <User className="h-4 w-4" />
                      <span>Organized by {event.organizer.name}</span>
                    </div>
                  </div>
                  <Badge variant={eventDate.isUpcoming ? "default" : "secondary"}>
                    {eventDate.isUpcoming ? "Upcoming" : "Past Event"}
                  </Badge>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                <p className="text-muted-foreground leading-relaxed">
                  {event.description || "No description available for this event."}
                </p>
                
                <div className="grid gap-3 sm:grid-cols-2">
                  <div className="flex items-center gap-2">
                    <Calendar className="h-4 w-4 text-muted-foreground" />
                    <span className="text-sm">{eventDate.date}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Clock className="h-4 w-4 text-muted-foreground" />
                    <span className="text-sm">{eventDate.time}</span>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Recent Reservations</CardTitle>
                <CardDescription>Latest bookings for this event</CardDescription>
              </CardHeader>
              <CardContent>
                {event.reservations.length === 0 ? (
                  <p className="text-sm text-muted-foreground">No reservations yet.</p>
                ) : (
                  <div className="space-y-4">
                    {event.reservations.slice(0, 10).map((reservation) => (
                      <div key={reservation.id} className="flex items-center justify-between p-3 border rounded">
                        <div>
                          <p className="font-medium">{reservation.user.name}</p>
                          <p className="text-sm text-muted-foreground">{reservation.user.email}</p>
                          <p className="text-xs text-muted-foreground">
                            {new Date(reservation.createdAt).toLocaleDateString()}
                          </p>
                        </div>
                        <div className="text-right">
                          <p className="font-medium">${reservation.ticket.price.toFixed(2)}</p>
                          {getStatusBadge(reservation.status)}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          <div className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <TicketIcon className="h-5 w-5" />
                  Event Statistics
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">Total Tickets</span>
                  <span className="font-medium">{event.tickets.length}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">Available</span>
                  <span className="font-medium">{availableTickets.length}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">Reservations</span>
                  <span className="font-medium">{event.reservations.length}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">Revenue</span>
                  <span className="font-medium">${totalRevenue.toFixed(2)}</span>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Quick Actions</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                <Button className="w-full" variant="outline">
                  <Eye className="h-4 w-4 mr-2" />
                  View Public Page
                </Button>
                <Button className="w-full" variant="outline">
                  Edit Event
                </Button>
                <Button className="w-full" variant="outline">
                  Manage Tickets
                </Button>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}
