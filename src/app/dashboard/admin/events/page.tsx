"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/context/AuthContext";
import DashboardLayout from "@/components/dashboard-layout";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Pencil, Trash2 } from "lucide-react";
import CreateEventModal from "@/components/CreateEventModal";
import EditEventModal from "@/components/EditEventModal";
import { LoadingSpinner } from "@/components/ui/loading-spinner";

interface Event {
  id: string;
  title: string;
  description: string;
  date: string;
  location: string;
  organizer: {
    name: string;
    email: string;
  };
}

export default function AdminEventsPage() {
  const { user, hasRole } = useAuth();
  const router = useRouter();
  const [events, setEvents] = useState<Event[]>([]);
  const [loading, setLoading] = useState(true);
  const [createModalOpen, setCreateModalOpen] = useState(false);
  const [editingEvent, setEditingEvent] = useState<Event | null>(null);

  const fetchEvents = useCallback(async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem("accessToken");
      const userId = localStorage.getItem("userId");
      const userRole = localStorage.getItem("userRole");
      
      if (!token || !userId || !userRole) {
        router.push("/login");
        return;
      }

      const response = await fetch("/api/events", {
        headers: {
          'Authorization': `Bearer ${token}`,
          'x-user-id': userId,
          'x-user-role': userRole,
          'Content-Type': 'application/json',
        },
      });
      
      if (response.ok) {
        const data = await response.json();
        setEvents(data.data || []);
      } else {
        const errorData = await response.json().catch(() => ({}));
        console.error("Failed to fetch events:", errorData.message || 'Unknown error');
        if (response.status === 401) {
          router.push("/login");
        }
      }
    } catch (error) {
      console.error("Error fetching events:", error);
    } finally {
      setLoading(false);
    }
  }, [router]);

  const deleteEvent = async (eventId: string, eventTitle: string) => {
    if (!confirm(`Are you sure you want to delete event "${eventTitle}"? This action cannot be undone.`)) {
      return;
    }

    try {
      const token = localStorage.getItem("accessToken");
      const userId = localStorage.getItem("userId");
      const userRole = localStorage.getItem("userRole");

      if (!token || !userId || !userRole) {
        router.push("/login");
        return;
      }

      const response = await fetch(`/api/events/${eventId}`, {
        method: "DELETE",
        headers: {
          'Authorization': `Bearer ${token}`,
          'x-user-id': userId,
          'x-user-role': userRole,
          'Content-Type': 'application/json',
        },
      });

      if (response.ok) {
        fetchEvents();
      } else {
        const errorData = await response.json().catch(() => ({}));
        console.error("Failed to delete event:", errorData.message || 'Unknown error');
        if (response.status === 401) {
          router.push("/login");
        } else {
          alert(`Failed to delete event: ${errorData.message || 'Please try again'}`);
        }
      }
    } catch (error) {
      console.error("Error deleting event:", error);
      alert("An error occurred while deleting the event. Please try again.");
    }
  };

  useEffect(() => {
    if (user && hasRole(["Admin"])) {
      fetchEvents();
    }
  }, [user, hasRole, fetchEvents]);

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
          <p className="text-muted-foreground">Loading events...</p>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <h1 className="text-3xl font-bold">Events Management</h1>
          <Button onClick={() => setCreateModalOpen(true)}>Create New Event</Button>
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-8">
            <p>Loading events...</p>
          </div>
        ) : (
          <div className="grid gap-4">
            {events.length === 0 ? (
              <Card>
                <CardContent className="flex items-center justify-center py-8">
                  <p className="text-muted-foreground">No events found.</p>
                </CardContent>
              </Card>
            ) : (
              events.map((event) => (
                <Card key={event.id}>
                  <CardHeader>
                    <CardTitle>{event.title}</CardTitle>
                    <CardDescription>
                      Organized by {event.organizer.name} ({event.organizer.email})
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <p className="text-sm text-muted-foreground mb-2">
                      {event.description}
                    </p>
                    <p className="text-sm">
                      <strong>Date:</strong> {new Date(event.date).toLocaleDateString()}
                    </p>
                    <div className="flex gap-2 mt-4">
                      <Button 
                        variant="outline" 
                        size="sm"
                        onClick={() => setEditingEvent({
                          ...event,
                          location: event.location || '' // Ensure location is always a string
                        })}
                        className="flex items-center gap-1"
                      >
                        <Pencil className="h-4 w-4" />
                        Edit
                      </Button>
                      <Button 
                        variant="destructive" 
                        size="sm"
                        onClick={() => deleteEvent(event.id, event.title)}
                        className="flex items-center gap-1"
                      >
                        <Trash2 className="h-4 w-4" />
                        Delete
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))
            )}
          </div>
        )}
      </div>

      <CreateEventModal
        open={createModalOpen}
        onOpenChange={setCreateModalOpen}
        onEventCreated={fetchEvents}
      />
      
      {editingEvent && (
        <EditEventModal
          open={!!editingEvent}
          onOpenChange={(open: boolean) => !open && setEditingEvent(null)}
          event={editingEvent}
          onEventUpdated={() => {
            fetchEvents();
            setEditingEvent(null);
          }}
        />
      )}
    </DashboardLayout>
  );
}
