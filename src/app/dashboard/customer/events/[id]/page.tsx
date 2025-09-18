"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/context/AuthContext";
import DashboardLayout from "@/components/dashboard-layout";
import { Role, TicketStatus } from "@prisma/client";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Calendar, Clock, User, ArrowLeft, Ticket as TicketIcon } from "lucide-react";
import { getBaseUrl } from "@/lib/client-utils";

interface EventDetail {
  id: string;
  title: string;
  description?: string;
  date: string;
  organizer: { id: string; name: string; email: string };
  tickets: Ticket[];
}

interface Ticket {
  id: string;
  price: number;
  status: TicketStatus;
}

export default function EventDetailsPage({ params }: { params: { id: string } }) {
  const { id } = params;
  const { user, loading, isAuthenticated, hasRole, accessToken } = useAuth();
  const router = useRouter();
  const [event, setEvent] = useState<EventDetail | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loadingAction, setLoadingAction] = useState<boolean>(false);

  useEffect(() => {
    if (!loading && (!isAuthenticated || !hasRole([Role.Customer]))) {
      router.push("/login");
    }
  }, [loading, isAuthenticated, hasRole, router]);

  useEffect(() => {
    const fetchEvent = async () => {
      if (!accessToken) return;

      try {
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
      } catch (err) {
        console.error("Error fetching event details:", err);
        setError("An unexpected error occurred while fetching event details.");
      }
    };

    if (isAuthenticated && id) {
      fetchEvent();
    }
  }, [isAuthenticated, accessToken, id]);

  const handleReserveTicket = async (ticketId: string) => {
    if (!accessToken || !user) {
      setError("You must be logged in to reserve a ticket.");
      return;
    }
    setLoadingAction(true);
    setError(null);

    try {
      const response = await fetch(`${getBaseUrl()}/api/reservations`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${accessToken}`,
        },
        body: JSON.stringify({ ticketId }),
      });

      const data = await response.json();

      if (!response.ok) {
        setError(data.message || "Failed to reserve ticket");
        return;
      }

      alert("Ticket reserved successfully! Redirecting to your reservations.");
      router.push("/dashboard/customer/reservations");
    } catch (err) {
      console.error("Reservation error:", err);
      setError("An unexpected error occurred while reserving the ticket.");
    } finally {
      setLoadingAction(false);
    }
  };

  if (loading || !user || !hasRole([Role.Customer]) || !event) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center min-h-screen-minus-header">
          <p>Loading event details or unauthorized...</p>
        </div>
      </DashboardLayout>
    );
  }

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

  const eventDate = formatEventDate(event.date);
  const availableTickets = event.tickets.filter(ticket => ticket.status === TicketStatus.Available);

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <Button 
          variant="outline" 
          onClick={() => router.push("/dashboard/customer/events")} 
          className="flex items-center gap-2"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to Events
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
          </div>

          <div className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <TicketIcon className="h-5 w-5" />
                  Available Tickets
                </CardTitle>
                <CardDescription>
                  {availableTickets.length} of {event.tickets.length} tickets available
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {error && (
                  <div className="bg-red-50 border border-red-200 text-red-700 px-3 py-2 rounded text-sm">
                    {error}
                  </div>
                )}

                {event.tickets.length === 0 ? (
                  <div className="text-center py-6">
                    <TicketIcon className="h-8 w-8 text-muted-foreground mx-auto mb-2" />
                    <p className="text-sm text-muted-foreground">No tickets available for this event</p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {event.tickets.map((ticket, index) => (
                      <Card key={ticket.id} className={`${ticket.status !== TicketStatus.Available ? "opacity-60" : ""}`}>
                        <CardContent className="p-4">
                          <div className="flex items-center justify-between mb-3">
                            <div>
                              <p className="font-semibold">${ticket.price.toFixed(2)}</p>
                              <p className="text-sm text-muted-foreground">Ticket #{index + 1}</p>
                            </div>
                            <Badge 
                              variant={ticket.status === TicketStatus.Available ? "default" : "secondary"}
                            >
                              {ticket.status}
                            </Badge>
                          </div>
                          
                          {ticket.status === TicketStatus.Available && eventDate.isUpcoming ? (
                            <Button 
                              onClick={() => handleReserveTicket(ticket.id)} 
                              disabled={loadingAction}
                              className="w-full"
                            >
                              {loadingAction ? "Reserving..." : "Reserve Ticket"}
                            </Button>
                          ) : (
                            <Button disabled className="w-full">
                              {!eventDate.isUpcoming ? "Event Passed" : "Not Available"}
                            </Button>
                          )}
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}
