
"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/context/AuthContext";
import DashboardLayout from "@/components/dashboard-layout";
const Role = {
  Admin: 'Admin',
  Organizer: 'Organizer',
  Customer: 'Customer'
} as const;
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Calendar, Clock, User,Plus } from "lucide-react";
import CreateEventModal from "@/components/CreateEventModal";
import { getBaseUrl } from "@/lib/client-utils";

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

type UpdateEventPayload = {
  title: string;
  description?: string;
  date: string; 
};

export default function OrganizerEventsPage() {
  const { user, loading, isAuthenticated, hasRole } = useAuth();
  const router = useRouter();
  const [events, setEvents] = useState<Event[]>([]);
  const [createModalOpen, setCreateModalOpen] = useState(false);
  const [loadingData, setLoadingData] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [editingEvent, setEditingEvent] = useState<Event | null>(null);

  useEffect(() => {
    if (!loading && (!isAuthenticated || !hasRole([Role.Admin, Role.Organizer]))) {
      router.push("/login");
    }
  }, [loading, isAuthenticated, hasRole, router]);

  const fetchEvents = async () => {
    try {
      setLoadingData(true);
      const token = localStorage.getItem("accessToken");
      const response = await fetch(`${getBaseUrl()}/api/organizer/reports`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      
      if (response.ok) {
        const data = await response.json();
        setEvents(data.data?.events || []);
        setError(null);
      } else {
        const errorData = await response.json();
        setError(errorData.message || "Failed to fetch events");
      }
    } catch (err) {
      console.error("Error fetching events:", err);
      setError("An error occurred while fetching events");
    } finally {
      setLoadingData(false);
    }
  };

  const handleUpdateEvent = async (eventData: UpdateEventPayload) => {
    try {
      const token = localStorage.getItem("accessToken");
      const response = await fetch(`${getBaseUrl()}/api/events/${editingEvent?.id}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(eventData),
      });

      if (response.ok) {
        fetchEvents();
        setEditingEvent(null);
        setError(null);
      } else {
        const errorData = await response.json();
        setError(errorData.message || "Failed to update event");
      }
    } catch (err) {
      console.error("Error updating event:", err);
      setError("An error occurred while updating the event");
    }
  };

  useEffect(() => {
    if (isAuthenticated) {
      fetchEvents();
    }
  }, [isAuthenticated]);

  const formatEventDate = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const isUpcoming = date > now;
    
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
      }),
      isUpcoming
    };
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

  return (
    <DashboardLayout>
      <div className="space-y-4 md:space-y-6">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="space-y-1">
            <h1 className="text-2xl font-bold sm:text-3xl">My Events</h1>
            <p className="text-sm text-muted-foreground sm:text-base">Manage all your events and track their performance</p>
          </div>
          <Button onClick={() => setCreateModalOpen(true)} className="w-full sm:w-auto">
            <Plus className="h-4 w-4 mr-2" />
            Create Event
          </Button>
        </div>

        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded text-sm sm:text-base">
            {error}
          </div>
        )}

        {loadingData ? (
          <div className="flex items-center justify-center py-8">
            <p>Loading events...</p>
          </div>
        ) : events.length === 0 ? (
          <Card className="shadow-sm">
            <CardContent className="flex flex-col items-center justify-center p-6 sm:py-12">
              <Calendar className="h-10 w-10 sm:h-12 sm:w-12 text-muted-foreground mb-3 sm:mb-4" />
              <h3 className="text-lg font-semibold mb-2 text-center">No Events Yet</h3>
              <p className="text-muted-foreground text-center mb-4 text-sm sm:text-base max-w-md mx-auto">
                Create your first event to start managing bookings and selling tickets.
              </p>
              <Button onClick={() => setCreateModalOpen(true)} className="w-full sm:w-auto">
                Create Your First Event
              </Button>
            </CardContent>
          </Card>
        ) : (
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {events.map((event) => {
              const eventDate = formatEventDate(event.date);
              return (
                <Card key={event.id} className="overflow-hidden hover:shadow-lg transition-shadow h-full flex flex-col">
                  <CardHeader className="pb-3">
                    <div className="flex items-start justify-between">
                      <div className="flex-1 min-w-0">
                        <CardTitle className="text-lg sm:text-xl mb-2 truncate">{event.title}</CardTitle>
                        <div className="flex items-center text-xs sm:text-sm text-muted-foreground mb-2">
                          <User className="h-3 w-3 sm:h-4 sm:w-4 mr-1 flex-shrink-0" />
                          <span className="truncate">{event.organizer.name}</span>
                        </div>
                      </div>
                      <Badge variant={eventDate.isUpcoming ? "default" : "secondary"} className="flex-shrink-0 ml-2">
                        {eventDate.isUpcoming ? "Upcoming" : "Past"}
                      </Badge>
                    </div>
                  </CardHeader>
                  <CardContent className="pt-0 flex-1 flex flex-col">
                    <div className="space-y-3 sm:space-y-4 flex-1">
                      <p className="text-xs sm:text-sm text-muted-foreground line-clamp-2 sm:line-clamp-3">
                        {event.description || "No description available"}
                      </p>
                      
                      <div className="space-y-1.5 sm:space-y-2">
                        <div className="flex items-center text-xs sm:text-sm">
                          <Calendar className="h-3.5 w-3.5 sm:h-4 sm:w-4 mr-2 text-muted-foreground flex-shrink-0" />
                          <span className="truncate">{eventDate.date}</span>
                        </div>
                        <div className="flex items-center text-xs sm:text-sm">
                          <Clock className="h-3.5 w-3.5 sm:h-4 sm:w-4 mr-2 text-muted-foreground flex-shrink-0" />
                          <span>{eventDate.time}</span>
                        </div>
                      </div>

                      <div className="grid grid-cols-2 gap-2 sm:gap-4 pt-1 sm:pt-2">
                        <div className="text-center p-2 bg-muted/20 rounded">
                          <p className="text-xl sm:text-2xl font-bold">{event._count.tickets}</p>
                          <p className="text-xs text-muted-foreground">Tickets</p>
                        </div>
                        <div className="text-center p-2 bg-muted/20 rounded">
                          <p className="text-xl sm:text-2xl font-bold">{event._count.reservations}</p>
                          <p className="text-xs text-muted-foreground">Bookings</p>
                        </div>
                      </div>

                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}

        <CreateEventModal
          open={createModalOpen}
          onOpenChange={setCreateModalOpen}
          onEventCreated={fetchEvents}
        />
        
        <CreateEventModal
          open={!!editingEvent}
          onOpenChange={(open) => !open && setEditingEvent(null)}
          onEventCreated={fetchEvents}
          editingEvent={editingEvent}
          onEventUpdated={handleUpdateEvent}
        />
      </div>
    </DashboardLayout>
  );
}
