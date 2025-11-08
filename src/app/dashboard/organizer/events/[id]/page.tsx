"use client";

import { useEffect, useState } from "react";
import { useRouter, useParams } from "next/navigation";
import { useAuth } from "@/context/AuthContext";
import DashboardLayout from "@/components/dashboard-layout";
import { Role, TicketStatus, ReservationStatus } from "@prisma/client";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Calendar, Clock, User, ArrowLeft, Ticket as TicketIcon, Plus } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { getBaseUrl } from "@/lib/client-utils";

interface EventDetail {
  id: string;
  title: string;
  description?: string;
  date: string;
  createdAt: string;
  organizer: { id: string; name: string; email: string };
  Ticket: Ticket[]; // Changed from tickets: Ticket[]
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
  const [showTicketModal, setShowTicketModal] = useState(false);
  const [ticketTiers, setTicketTiers] = useState<Array<{ price: string; count: string }>>([
    { price: "", count: "1" },
  ]);
  const [creatingTicket, setCreatingTicket] = useState(false);

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

  const handleCreateTicket = async () => {
    // Validate tiers
    const parsed = ticketTiers.map((t, idx) => {
      const priceNum = parseFloat(t.price);
      const countNum = parseInt(t.count, 10);
      return { idx, priceNum, countNum, raw: t };
    });
    for (const p of parsed) {
      if (!p.raw.price || isNaN(p.priceNum) || p.priceNum <= 0) {
        setError(`Please enter a valid price for row ${p.idx + 1}`);
        return;
      }
      if (!p.raw.count || isNaN(p.countNum) || p.countNum <= 0) {
        setError(`Please enter a valid quantity (1 or more) for row ${p.idx + 1}`);
        return;
      }
    }

    const ticketsPayload = parsed.map((p) => ({ price: p.priceNum, count: p.countNum }));

    try {
      setCreatingTicket(true);
      const response = await fetch(`${getBaseUrl()}/api/tickets`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${accessToken}`,
        },
        body: JSON.stringify({
          eventId: id,
          tickets: ticketsPayload,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        setError(data.message || "Failed to create tickets");
        return;
      }

      try {
        const evRes = await fetch(`${getBaseUrl()}/api/events/${id}`, {
          headers: { Authorization: `Bearer ${accessToken}` },
        });
        const evData = await evRes.json();
        if (evRes.ok) {
          setEvent(evData.data);
        }
      } catch (e) {
        console.log(e)
      }

      setTicketTiers([{ price: "", count: "1" }]);
      setShowTicketModal(false);
      setError(null);
    } catch (err) {
      console.error("Error creating tickets:", err);
      setError("An unexpected error occurred while creating tickets.");
    } finally {
      setCreatingTicket(false);
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
  const availableTickets = (event.Ticket || []).filter(ticket => ticket.status === TicketStatus.Available);
  const totalRevenue = (event.reservations || [])
    .filter(res => res.payment?.status === "Completed")
    .reduce((sum, res) => sum + (res.payment?.amount || 0), 0);

  return (
    <DashboardLayout>
      <div className="space-y-4 sm:space-y-6 px-2 sm:px-0">
        <Button
          variant="outline"
          onClick={() => router.push("/dashboard/organizer")}
          className="flex items-center gap-2 text-sm sm:text-base w-full sm:w-auto justify-center sm:justify-start"
          size="sm"
        >
          <ArrowLeft className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
          Back to Dashboard
        </Button>

        <div className="grid gap-4 sm:gap-6 lg:grid-cols-3">
          <div className="lg:col-span-2 space-y-4 sm:space-y-6">
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
              <CardContent className="space-y-4 p-4 sm:p-6 pt-0">
                <p className="text-muted-foreground leading-relaxed text-sm sm:text-base">
                  {event.description || "No description available for this event."}
                </p>

                <div className="grid gap-3 sm:grid-cols-2">
                  <div className="flex items-center gap-2">
                    <Calendar className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                    <span className="text-sm truncate">{eventDate.date}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Clock className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                    <span className="text-sm">{eventDate.time}</span>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Event Tickets</CardTitle>
                <CardDescription>All tickets available for this event</CardDescription>
              </CardHeader>
              <CardContent>
                {event.Ticket.length === 0 ? (
                  <div className="text-center py-6">
                    <TicketIcon className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                    <h3 className="text-lg font-semibold mb-2">No Tickets Yet</h3>
                    <p className="text-muted-foreground mb-4">Create tickets for customers to book.</p>
                    <Button onClick={() => setShowTicketModal(true)}>
                      <Plus className="h-4 w-4 mr-2" />
                      Add First Ticket
                    </Button>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {event.Ticket.map((ticket, index) => (
                      <div key={ticket.id} className="flex items-center justify-between p-3 border rounded">
                        <div className="min-w-0">
                          <p className="font-medium text-sm sm:text-base truncate">Ticket #{index + 1}</p>
                          <p className="text-xs sm:text-sm text-muted-foreground">
                            {new Date(ticket.createdAt).toLocaleDateString()}
                          </p>
                        </div>
                        <div className="text-right ml-2">
                          <p className="font-medium text-sm sm:text-base">${ticket.price.toFixed(2)}</p>
                          <Badge 
                            variant={ticket.status === TicketStatus.Available ? "default" : "secondary"}
                            className="text-xs"
                          >
                            {ticket.status}
                          </Badge>
                        </div>
                      </div>
                    ))}
                    <Button
                      onClick={() => setShowTicketModal(true)}
                      variant="outline"
                      className="w-full text-sm sm:text-base"
                      size="sm"
                    >
                      <Plus className="h-3.5 w-3.5 sm:h-4 sm:w-4 mr-1.5" />
                      Add More Tickets
                    </Button>
                  </div>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Recent Reservations</CardTitle>
                <CardDescription>Latest bookings for this event</CardDescription>
              </CardHeader>
              <CardContent>
                {(!event.reservations || event.reservations.length === 0) ? (
                  <p className="text-sm text-muted-foreground">No reservations yet.</p>
                ) : (
                  <div className="space-y-3">
                    {event.reservations.slice(0, 5).map((reservation) => (
                      <div key={reservation.id} className="flex items-start justify-between p-3 border rounded text-sm">
                        <div className="min-w-0 pr-2">
                          <p className="font-medium truncate">{reservation.user.name}</p>
                          <p className="text-muted-foreground text-xs truncate">{reservation.user.email}</p>
                          <p className="text-xs text-muted-foreground">
                            {new Date(reservation.createdAt).toLocaleDateString()}
                          </p>
                        </div>
                        <div className="text-right flex-shrink-0 ml-2">
                          <p className="font-medium">${reservation.ticket.price.toFixed(2)}</p>
                          <div className="mt-1">
                            {getStatusBadge(reservation.status)}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          <div className="space-y-4 sm:space-y-6">
            <Card>
              <CardHeader className="p-4 sm:p-6 pb-2 sm:pb-6">
                <CardTitle className="flex items-center gap-2 text-lg sm:text-xl">
                  <TicketIcon className="h-4 w-4 sm:h-5 sm:w-5" />
                  Event Stats
                </CardTitle>
              </CardHeader>
              <CardContent className="p-4 sm:p-6 pt-0 space-y-3 sm:space-y-4 text-sm sm:text-base">
                <div className="flex items-center justify-between py-2 border-b">
                  <span className="text-muted-foreground">Total Tickets</span>
                  <span className="font-medium">{event.Ticket.length}</span>
                </div>
                <div className="flex items-center justify-between py-2 border-b">
                  <span className="text-muted-foreground">Available</span>
                  <span className="font-medium">{availableTickets.length}</span>
                </div>
                <div className="flex items-center justify-between py-2 border-b">
                  <span className="text-muted-foreground">Reservations</span>
                  <span className="font-medium">{(event.reservations || []).length}</span>
                </div>
                <div className="flex items-center justify-between py-2">
                  <span className="text-muted-foreground">Revenue</span>
                  <span className="font-medium">${totalRevenue.toFixed(2)}</span>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="p-4 sm:p-6 pb-2 sm:pb-6">
                <CardTitle className="text-lg sm:text-xl">Quick Actions</CardTitle>
              </CardHeader>
              <CardContent className="p-4 sm:p-6 pt-0 space-y-2">
                <Button 
                  className="w-full text-sm sm:text-base" 
                  variant="outline"
                  size="sm"
                >
                  Edit Event
                </Button>
                <Button
                  className="w-full text-sm sm:text-base"
                  variant="outline"
                  size="sm"
                  onClick={() => setShowTicketModal(true)}
                >
                  <Plus className="h-3.5 w-3.5 sm:h-4 sm:w-4 mr-1.5" />
                  Add Tickets
                </Button>
              </CardContent>
            </Card>
          </div>
        </div>

        <Dialog open={showTicketModal} onOpenChange={setShowTicketModal}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Add Tickets</DialogTitle>
              <DialogDescription>
                Create a new ticket for this event. Customers will be able to reserve and purchase this ticket.
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4 p-6 pt-0">
              {error && (
                <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded">
                  {error}
                </div>
              )}
              <div className="space-y-3">
                {ticketTiers.map((tier, idx) => (
                  <div key={idx} className="grid grid-cols-5 gap-2 sm:gap-3 items-end">
                    <div className="col-span-3 sm:col-span-2 space-y-1 sm:space-y-2">
                      <Label htmlFor={`price-${idx}`} className="text-xs sm:text-sm">Price ($)</Label>
                      <Input
                        id={`price-${idx}`}
                        type="number"
                        step="0.01"
                        min="0"
                        placeholder="25.00"
                        value={tier.price}
                        onChange={(e) => {
                          const v = e.target.value;
                          setTicketTiers((prev) => prev.map((t, i) => (i === idx ? { ...t, price: v } : t)));
                        }}
                        disabled={creatingTicket}
                        className="h-9 sm:h-10 text-sm"
                      />
                    </div>
                    <div className="col-span-1 sm:col-span-2 space-y-1 sm:space-y-2">
                      <Label htmlFor={`count-${idx}`} className="text-xs sm:text-sm">Qty</Label>
                      <Input
                        id={`count-${idx}`}
                        type="number"
                        min="1"
                        step="1"
                        placeholder="50"
                        value={tier.count}
                        onChange={(e) => {
                          const v = e.target.value;
                          setTicketTiers((prev) => prev.map((t, i) => (i === idx ? { ...t, count: v } : t)));
                        }}
                        disabled={creatingTicket}
                        className="h-9 sm:h-10 text-sm"
                      />
                    </div>
                    <div className="col-span-1 flex gap-1 sm:gap-2 justify-end">
                      <Button
                        type="button"
                        variant="outline"
                        size="icon"
                        className="h-9 w-9 sm:h-10 sm:w-10"
                        onClick={() => setTicketTiers((prev) => [...prev, { price: "", count: "1" }])}
                        disabled={creatingTicket}
                      >
                        <Plus className="h-4 w-4" />
                      </Button>
                      {ticketTiers.length > 1 && (
                        <Button
                          type="button"
                          variant="outline"
                          size="icon"
                          className="h-9 w-9 sm:h-10 sm:w-10"
                          onClick={() => setTicketTiers((prev) => prev.filter((_, i) => i !== idx))}
                          disabled={creatingTicket}
                        >
                          <span className="h-4 w-4">−</span>
                        </Button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
              <div className="flex justify-end space-x-2 pt-4">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => {
                    setShowTicketModal(false);
                    setTicketTiers([{ price: "", count: "1" }]);
                    setError(null);
                  }}
                  disabled={creatingTicket}
                >
                  Cancel
                </Button>
                <Button
                  onClick={handleCreateTicket}
                  disabled={creatingTicket || ticketTiers.length === 0}
                >
                  <Plus className="h-4 w-4 mr-2" />
                  {creatingTicket ? "Creating..." : "Create Tickets"}
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </div>
    </DashboardLayout>
  );
}
