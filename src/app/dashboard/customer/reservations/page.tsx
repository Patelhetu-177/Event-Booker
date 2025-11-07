"use client";

import { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/context/AuthContext";
import DashboardLayout from "@/components/dashboard-layout";
import { Role, ReservationStatus, TicketStatus, PaymentStatus } from "@prisma/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Calendar, Clock, Ticket, AlertCircle, CheckCircle } from "lucide-react";
import { getBaseUrl } from "@/lib/client-utils";

interface Reservation {
  id: string;
  status: ReservationStatus;
  createdAt: string;
  quantity: number;
  ticket: {
    id: string;
    price: number;
    status: TicketStatus;
    event: {
      id: string;
      title: string;
      date: string;
    };
  };
  payment?: {
    id: string;
    amount: number;
    status: PaymentStatus;
  };
  ticketNumber?: string;
}

export default function CustomerReservationsPage() {
  const { user, loading, isAuthenticated, hasRole, accessToken } = useAuth();
  const router = useRouter();
  const [reservations, setReservations] = useState<Reservation[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [loadingAction, setLoadingAction] = useState<boolean>(false);

  useEffect(() => {
    if (!loading && (!isAuthenticated || !hasRole([Role.Customer]))) {
      router.push("/login");
    }
  }, [loading, isAuthenticated, hasRole, router]);

  interface ReservationResponse {
    id: string;
    status: ReservationStatus;
    createdAt: string;
    quantity?: number;
    ticket: {
      id: string;
      price: number;
      status: TicketStatus;
      event: {
        id: string;
        title: string;
        date: string;
      };
    };
    payment?: {
      id: string;
      amount: number;
      status: PaymentStatus;
    };
  }

  const fetchReservations = useCallback(async () => {
    if (!accessToken) return;

    try {
      const response = await fetch(`${getBaseUrl()}/api/reservations`, {
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      });
      const data = await response.json();

      if (!response.ok) {
        setError(data.message || "Failed to fetch reservations");
        return;
      }

      const processedReservations = (data.data || [] as ReservationResponse[]).map((reservation: ReservationResponse) => ({
        ...reservation,
        quantity: reservation.quantity || 1,
        ticketNumber: `TKT-${reservation.id.slice(0, 8).toUpperCase()}`
      }));

      setReservations(processedReservations);
    } catch (error) {
      console.error("Error fetching reservations:", error);
      const errorMessage = error instanceof Error ? error.message : "An unexpected error occurred while fetching reservations.";
      setError(errorMessage);
    }
  }, [accessToken]);

  useEffect(() => {
    if (isAuthenticated) {
      fetchReservations();
    }
  }, [isAuthenticated, accessToken, fetchReservations]);

  const handleCancelReservation = async (reservationId: string, eventId: string) => {
    if (!accessToken) return;

    const reservation = reservations.find(r => r.id === reservationId);
    if (!reservation) return;

    const ticketWord = reservation.quantity > 1 ? 'tickets' : 'ticket';
    if (!confirm(`Are you sure you want to cancel this reservation of ${reservation.quantity} ${ticketWord}? This will make the ${ticketWord} available for others.`)) {
      return;
    }

    try {
      setLoadingAction(true);

      const response = await fetch(`${getBaseUrl()}/api/reservations/${reservationId}`, {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${accessToken}`,
          'x-quantity': reservation.quantity.toString()
        }
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || 'Failed to cancel reservation');
      }

      await fetchReservations();

      const eventResponse = await fetch(`${getBaseUrl()}/api/events/${eventId}`, {
        headers: {
          'Authorization': `Bearer ${accessToken}`
        }
      });

      if (!eventResponse.ok) {
        throw new Error('Failed to refresh event data');
      }

      alert(`Successfully cancelled ${reservation.quantity} ${ticketWord}. They are now available for others.`);
    } catch (error) {
      console.error('Error cancelling reservation:', error);
      const errorMessage = error instanceof Error ? error.message : 'Failed to cancel reservation';
      alert(errorMessage);
    } finally {
      setLoadingAction(false);
    }
  };

  const handleMakePayment = async (reservationId: string, price: number, quantity: number) => {
    const totalAmount = price * quantity;
    if (!accessToken || !user) {
      setError("You must be logged in to make a payment.");
      return;
    }
    setLoadingAction(true);
    setError(null);

    try {
      setReservations(prevReservations =>
        prevReservations.map(reservation =>
          reservation.id === reservationId
            ? {
                ...reservation,
                status: 'Pending' as const,
                payment: {
                  ...(reservation.payment || { id: `temp-${Date.now()}`, amount: totalAmount }),
                  status: 'Pending' as const
                }
              }
            : reservation
        )
      );

      const response = await fetch(`${getBaseUrl()}/api/payments`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${accessToken}`,
          "x-user-id": user.id,
          "x-user-role": user.role,
        },
        body: JSON.stringify({
          reservationId,
          amount: price, // Price per ticket
          quantity,     // Number of tickets
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || "Payment failed");
      }

      // Update the UI to reflect the payment
      setReservations(prevReservations =>
        prevReservations.map(reservation => {
          if (reservation.id === reservationId) {
            return {
              ...reservation,
              status: 'Confirmed',
              payment: {
                id: data.data.id,
                amount: totalAmount,
                status: 'Completed' as const
              },
              ticket: {
                ...reservation.ticket,
                status: 'Booked' as const
              },
              quantity: quantity
            };
          }
          return reservation;
        })
      );

      alert(`Payment of $${totalAmount.toFixed(2)} for ${quantity} ticket(s) was successful!`);
    } catch (error) {
      console.error("Payment error:", error);
      const errorMessage = error instanceof Error ? error.message : "An unexpected error occurred during payment. Please try again.";
      setError(errorMessage);
      
      // Update UI to show payment failure
      setReservations(prevReservations =>
        prevReservations.map(reservation =>
          reservation.id === reservationId
            ? {
                ...reservation,
                status: 'Pending',
                payment: {
                  ...(reservation.payment || { id: `temp-${Date.now()}`, amount: price * quantity }),
                  status: 'Failed' as const
                }
              }
            : reservation
        )
      );
    } finally {
      setLoadingAction(false);
    }
  };

  if (loading || !user || !hasRole([Role.Customer])) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center min-h-screen-minus-header">
          <p>Loading reservations or unauthorized...</p>
        </div>
      </DashboardLayout>
    );
  }

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

  const getPaymentBadge = (status: PaymentStatus) => {
    switch (status) {
      case PaymentStatus.Completed:
        return <Badge variant="default" className="bg-green-100 text-green-800">Paid</Badge>;
      case PaymentStatus.Failed:
        return <Badge variant="destructive">Failed</Badge>;
      case PaymentStatus.Pending:
        return <Badge variant="outline">Pending</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  const formatEventDate = (dateString: string) => {
    const date = new Date(dateString);
    return {
      date: date.toLocaleDateString('en-US', {
        weekday: 'short',
        year: 'numeric',
        month: 'short',
        day: 'numeric'
      }),
      time: date.toLocaleTimeString('en-US', {
        hour: '2-digit',
        minute: '2-digit'
      })
    };
  };

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold">My Reservations</h1>
            <p className="text-muted-foreground">Manage your event bookings and payments</p>
          </div>
        </div>

        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded flex items-center gap-2">
            <AlertCircle className="h-4 w-4" />
            {error}
          </div>
        )}

        {reservations.length === 0 && !error ? (
          <Card>
            <CardContent className="flex flex-col items-center justify-center py-12">
              <Ticket className="h-12 w-12 text-muted-foreground mb-4" />
              <h3 className="text-lg font-semibold mb-2">No Reservations Found</h3>
              <p className="text-muted-foreground text-center mb-4">
                You haven&apos;t made any reservations yet. Browse events to book your first ticket!
              </p>
              <Button onClick={() => router.push("/dashboard/customer/events")}>
                Browse Events
              </Button>
            </CardContent>
          </Card>
        ) : (
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            {reservations.map((reservation) => {
              const eventDate = formatEventDate(reservation.ticket.event.date);
              // Show pay button if reservation is pending or payment is pending/failed
              const needsPayment = reservation.status === ReservationStatus.Pending ||
                (reservation.payment && reservation.payment.status === PaymentStatus.Failed);

              // Allow cancellation for pending or confirmed reservations that aren't already cancelled
              const canCancel = (reservation.status === ReservationStatus.Pending ||
                reservation.status === ReservationStatus.Confirmed) &&
                !loadingAction;

              return (
                <Card key={reservation.id} className="overflow-hidden">
                  <CardHeader className="pb-3">
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <CardTitle className="text-lg mb-1">{reservation.ticket.event.title}</CardTitle>
                        <div className="flex items-center gap-2 mb-2">
                          {getStatusBadge(reservation.status)}
                          {reservation.payment && getPaymentBadge(reservation.payment.status)}
                        </div>
                      </div>
                    </div>
                  </CardHeader>

                  <CardContent className="space-y-4">
                    <div className="space-y-2">
                      <div className="flex items-center gap-2 text-sm">
                        <Calendar className="h-4 w-4 text-muted-foreground" />
                        <span>{eventDate.date}</span>
                      </div>
                      <div className="flex items-center gap-2 text-sm">
                        <Clock className="h-4 w-4 text-muted-foreground" />
                        <span>{eventDate.time}</span>
                      </div>
                      <div className="flex items-center justify-between text-sm">
                        <div className="flex items-center gap-2">
                          <Ticket className="h-4 w-4 text-muted-foreground" />
                          <span>{reservation.quantity} × ${reservation.ticket.price.toFixed(2)}</span>
                        </div>
                        <span className="font-medium">${(reservation.quantity * reservation.ticket.price).toFixed(2)}</span>
                      </div>
                      <div className="text-xs text-muted-foreground">
                        Ticket #: {reservation.ticketNumber}
                      </div>
                    </div>

                    {reservation.payment?.amount !== undefined && (
                      <div className="p-3 bg-muted rounded-lg">
                        <div className="flex items-center justify-between text-sm">
                          <span>Payment:</span>
                          <span className="font-medium">${reservation.payment.amount.toFixed(2)}</span>
                        </div>
                      </div>
                    )}

                    <div className="flex gap-2">
                      {needsPayment && (
                        <Button
                          onClick={() => handleMakePayment(
                            reservation.id,
                            reservation.ticket.price,
                            reservation.quantity
                          )}
                          disabled={loadingAction}
                          className="flex-1"
                          size="sm"
                          variant="default"
                        >
                          {loadingAction ? "Processing..." : `Pay $${(reservation.ticket.price * reservation.quantity).toFixed(2)}`}
                        </Button>
                      )}

                      {canCancel && (
                        <Button
                          onClick={() => handleCancelReservation(reservation.id, reservation.ticket.event.id)}
                          disabled={loadingAction}
                          variant={needsPayment ? "outline" : "default"}
                          size="sm"
                          className={needsPayment ? "flex-none" : "flex-1"}
                        >
                          {loadingAction ? "Cancelling..." : "Cancel"}
                        </Button>
                      )}
                    </div>

                    {reservation.status === ReservationStatus.Cancelled && (
                      <div className="flex items-center gap-2 text-sm text-muted-foreground">
                        <AlertCircle className="h-4 w-4" />
                        <span>This reservation has been cancelled</span>
                      </div>
                    )}

                    {reservation.payment?.status === PaymentStatus.Completed && (
                      <div className="flex items-center gap-2 text-sm text-green-600">
                        <CheckCircle className="h-4 w-4" />
                        <span>Payment completed successfully</span>
                      </div>
                    )}
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}