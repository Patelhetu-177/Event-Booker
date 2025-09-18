"use client";

import { useEffect, useState } from "react";
import { useAuth } from "@/context/AuthContext";
import DashboardLayout from "@/components/dashboard-layout";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import CreateEventModal from "@/components/CreateEventModal";

interface Event {
  id: string;
  title: string;
  description: string;
  date: string;
  organizer: {
    name: string;
    email: string;
  };
}

export default function AdminEventsPage() {
  const { user, hasRole } = useAuth();
  const [events, setEvents] = useState<Event[]>([]);
  const [loading, setLoading] = useState(true);
  const [createModalOpen, setCreateModalOpen] = useState(false);

  const fetchEvents = async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem("accessToken");
      const response = await fetch("/api/events", {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });
      
      if (response.ok) {
        const data = await response.json();
        setEvents(data.data);
      } else {
        console.error("Failed to fetch events");
      }
    } catch (error) {
      console.error("Error fetching events:", error);
    } finally {
      setLoading(false);
    }
  };

  const deleteEvent = async (eventId: string, eventTitle: string) => {
    if (!confirm(`Are you sure you want to delete event "${eventTitle}"? This action cannot be undone.`)) {
      return;
    }

    try {
      const token = localStorage.getItem("accessToken");
      const response = await fetch(`/api/events/${eventId}`, {
        method: "DELETE",
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (response.ok) {
        fetchEvents();
      } else {
        const data = await response.json();
        alert(`Failed to delete event: ${data.message}`);
      }
    } catch (error) {
      console.error("Error deleting event:", error);
      alert("An error occurred while deleting the event");
    }
  };

  useEffect(() => {
    if (user && hasRole(["Admin"])) {
      fetchEvents();
    }
  }, [user, hasRole]);

  if (!user || !hasRole(["Admin"])) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center min-h-screen-minus-header">
          <p>Access denied. Admin privileges required.</p>
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
                      <Button variant="outline" size="sm">
                        Edit
                      </Button>
                      <Button 
                        variant="destructive" 
                        size="sm"
                        onClick={() => deleteEvent(event.id, event.title)}
                      >
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
    </DashboardLayout>
  );
}
