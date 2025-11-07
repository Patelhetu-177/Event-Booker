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
  _count?: {
    reservations: number;
  };
  reservations?: Array<{
    id: string;
    status: string;
  }>;
}


export default function EventDetailsPage({ params }: { params: Promise<{ id: string }> }) {
  const [id, setId] = useState<string>("");
  
  useEffect(() => {
    params.then(p => setId(p.id));
  }, [params]);
  const { user, loading, isAuthenticated, hasRole, accessToken } = useAuth();
  const router = useRouter();
  const [event, setEvent] = useState<EventDetail | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loadingAction, setLoadingAction] = useState<boolean>(false);
  const [selectedTickets, setSelectedTickets] = useState<Record<string, number>>({});
  const [isReserving, setIsReserving] = useState(false);

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

  const handleQuantityChange = (ticketId: string, quantity: number) => {
    setSelectedTickets(prev => ({
      ...prev,
      [ticketId]: Math.max(0, quantity) // Ensure quantity is not negative
    }));
  };

  const handleReserveTickets = async () => {
    if (!accessToken || !user) {
      setError("You must be logged in to reserve tickets.");
      return;
    }

    // Filter out tickets with 0 quantity
    const ticketsToReserve = Object.entries(selectedTickets)
      .filter(([, quantity]) => quantity > 0)
      .map(([ticketId, quantity]) => ({
        ticketId,
        quantity
      }));

    if (ticketsToReserve.length === 0) {
      setError("Please select at least one ticket to reserve.");
      return;
    }

    setLoadingAction(true);
    setError(null);
    setIsReserving(true);

    try {
      const response = await fetch(`${getBaseUrl()}/api/reservations`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${accessToken}`,
          "x-user-id": user.id,
          "x-user-role": user.role,
        },
        body: JSON.stringify({ tickets: ticketsToReserve }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || "Failed to reserve tickets");
      }

      // Redirect to payment page with reservation details
      const reservationIds = data.data.map((r: { id: string }) => r.id);
      const totalAmount = data.data.reduce(
        (sum: number, r: { ticket: { price: number } }) => sum + r.ticket.price, 
        0
      );
      
      // Store reservation details in session storage for the payment page
      sessionStorage.setItem('pendingPayment', JSON.stringify({
        reservationIds,
        totalAmount,
        eventId: id
      }));

      // Redirect to payment page
      router.push(`/dashboard/customer/reservations?amount=${totalAmount}&eventId=${id}`);
    } catch (error) {
      console.error("Error reserving tickets:", error);
      const errorMessage = error instanceof Error ? error.message : "An unexpected error occurred while reserving the tickets.";
      setError(errorMessage);
    } finally {
      setLoadingAction(false);
      setIsReserving(false);
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

  // Get available tickets (status is Available and not already reserved by the user)
  const availableTickets = event?.tickets?.filter(ticket => {
    // Check if ticket is available
    const isAvailable = ticket.status === TicketStatus.Available;
    
    // Check if user already has a reservation for this ticket
    const userHasReservation = ticket.reservations?.some(
      r => r.status === 'PENDING' || r.status === 'CONFIRMED'
    );
    
    return isAvailable && !userHasReservation;
  }) || [];

  // Calculate total price
  const totalPrice = availableTickets.reduce((sum: number, ticket) => {
    const quantity = selectedTickets[ticket.id] || 0;
    return sum + (ticket.price * quantity);
  }, 0);

  // Check if any tickets are selected
  const hasSelectedTickets = Object.values(selectedTickets).some(qty => qty > 0);

  // Group tickets by price
  const ticketsByPrice = availableTickets.reduce((acc, ticket) => {
    const priceKey = ticket.price.toString();
    if (!acc[priceKey]) {
      acc[priceKey] = [];
    }
    acc[priceKey].push(ticket);
    return acc;
  }, {} as Record<string, typeof availableTickets>);

  // Render ticket cards
  const renderTickets = () => {
    if (!availableTickets.length) {
      return <p className="text-gray-500">No tickets available for this event.</p>;
    }

    return (
      <div className="space-y-4">
        {Object.entries(ticketsByPrice).map(([price, tickets]) => {
          const availableQuantity = tickets.length;
          const selectedQuantity = tickets.reduce(
            (sum, ticket) => sum + (selectedTickets[ticket.id] || 0), 0
          );
          // Use first ticket for price display
          
          return (
            <Card key={`price-${price}`} className="p-4">
              <div className="flex justify-between items-center">
                <div>
                  <h4 className="text-lg font-semibold">${parseFloat(price).toFixed(2)}</h4>
                  <p className="text-sm text-gray-500">
                    {selectedQuantity} of {availableQuantity} tickets available
                  </p>
                </div>
                <div className="flex items-center space-x-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      const ticketId = tickets[selectedQuantity - 1]?.id;
                      if (ticketId) {
                        handleQuantityChange(ticketId, (selectedTickets[ticketId] || 0) - 1);
                      }
                    }}
                    disabled={selectedQuantity <= 0}
                  >
                    -
                  </Button>
                  <span className="w-8 text-center">{selectedQuantity}</span>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      const availableTicket = tickets.find(t => !selectedTickets[t.id] || selectedTickets[t.id] === 0);
                      if (availableTicket) {
                        handleQuantityChange(availableTicket.id, 1);
                      }
                    }}
                    disabled={selectedQuantity >= availableQuantity}
                  >
                    +
                  </Button>
                </div>
              </div>
            </Card>
          );
        })}

        {hasSelectedTickets && (
          <div className="mt-6 p-4 bg-gray-50 rounded-lg">
            <div className="flex justify-between items-center mb-4">
              <span className="font-semibold">Total</span>
              <span className="text-lg font-bold">${totalPrice.toFixed(2)}</span>
            </div>
            <Button 
              onClick={handleReserveTickets}
              disabled={loadingAction || isReserving}
              className="w-full"
            >
              {isReserving ? "Processing..." : `Reserve ${Object.values(selectedTickets).reduce((a, b) => a + b, 0)} Tickets`}
            </Button>
          </div>
        )}
      </div>
    );
  };

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
                {renderTickets()}
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}
