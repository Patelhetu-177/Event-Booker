"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/context/AuthContext";
import DashboardLayout from "@/components/dashboard-layout";
import { Role } from "@prisma/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Calendar, Clock, User, Eye, Edit, Trash2, Plus } from "lucide-react";
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

export default function OrganizerEventsPage() {
  const { user, loading, isAuthenticated, hasRole } = useAuth();
  const router = useRouter();
  const [events, setEvents] = useState<Event[]>([]);
  const [createModalOpen, setCreateModalOpen] = useState(false);
  const [loadingData, setLoadingData] = useState(true);
  const [error, setError] = useState<string | null>(null);

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
        setEvents(data.data.events);
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
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold">My Events</h1>
            <p className="text-muted-foreground">Manage all your events and track their performance</p>
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

        {loadingData ? (
          <div className="flex items-center justify-center py-8">
            <p>Loading events...</p>
          </div>
        ) : events.length === 0 ? (
          <Card>
            <CardContent className="flex flex-col items-center justify-center py-12">
              <Calendar className="h-12 w-12 text-muted-foreground mb-4" />
              <h3 className="text-lg font-semibold mb-2">No Events Yet</h3>
              <p className="text-muted-foreground text-center mb-4">
                Create your first event to start managing bookings and selling tickets.
              </p>
              <Button onClick={() => setCreateModalOpen(true)}>
                Create Your First Event
              </Button>
            </CardContent>
          </Card>
        ) : (
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            {events.map((event) => {
              const eventDate = formatEventDate(event.date);
              return (
                <Card key={event.id} className="overflow-hidden hover:shadow-lg transition-shadow">
                  <CardHeader className="pb-3">
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <CardTitle className="text-xl mb-2">{event.title}</CardTitle>
                        <div className="flex items-center text-sm text-muted-foreground mb-2">
                          <User className="h-4 w-4 mr-1" />
                          {event.organizer.name}
                        </div>
                      </div>
                      <Badge variant={eventDate.isUpcoming ? "default" : "secondary"}>
                        {eventDate.isUpcoming ? "Upcoming" : "Past"}
                      </Badge>
                    </div>
                  </CardHeader>
                  <CardContent className="pt-0">
                    <div className="space-y-3">
                      <p className="text-sm text-muted-foreground line-clamp-2">
                        {event.description || "No description available"}
                      </p>
                      
                      <div className="space-y-2">
                        <div className="flex items-center text-sm">
                          <Calendar className="h-4 w-4 mr-2 text-muted-foreground" />
                          <span>{eventDate.date}</span>
                        </div>
                        <div className="flex items-center text-sm">
                          <Clock className="h-4 w-4 mr-2 text-muted-foreground" />
                          <span>{eventDate.time}</span>
                        </div>
                      </div>

                      <div className="grid grid-cols-2 gap-4 pt-2">
                        <div className="text-center">
                          <p className="text-2xl font-bold">{event._count.tickets}</p>
                          <p className="text-xs text-muted-foreground">Tickets</p>
                        </div>
                        <div className="text-center">
                          <p className="text-2xl font-bold">{event._count.reservations}</p>
                          <p className="text-xs text-muted-foreground">Bookings</p>
                        </div>
                      </div>

                      <div className="flex gap-2 pt-4">
                        <Button 
                          variant="outline" 
                          size="sm" 
                          className="flex-1"
                          onClick={() => router.push(`/dashboard/organizer/events/${event.id}`)}
                        >
                          <Eye className="h-4 w-4 mr-1" />
                          View
                        </Button>
                        <Button variant="outline" size="sm">
                          <Edit className="h-4 w-4" />
                        </Button>
                        <Button variant="outline" size="sm">
                          <Trash2 className="h-4 w-4" />
                        </Button>
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
      </div>
    </DashboardLayout>
  );
}
