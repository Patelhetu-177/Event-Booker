"use client";

import DashboardLayout from "@/components/dashboard-layout";
import { useAuth } from "@/context/AuthContext";
import { useRouter } from "next/navigation";
import { Role } from "@prisma/client";
import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Search, User, Clock, Calendar } from "lucide-react";
import { getBaseUrl } from "@/lib/client-utils";

interface Event {
  id: string;
  title: string;
  description?: string;
  date: string;
  organizer: { id: string; name: string; email: string };
  _count?: {
    tickets: number;
  };
}

export default function CustomerEventsPage() {
  const { user, loading, isAuthenticated, hasRole, accessToken } = useAuth();
  const router = useRouter();
  const [events, setEvents] = useState<Event[]>([]);
  const [filteredEvents, setFilteredEvents] = useState<{
    current: Event[];
    upcoming: Event[];
    past: Event[];
  }>({ current: [], upcoming: [], past: [] });
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState("");

  useEffect(() => {
    if (!loading && (!isAuthenticated || !hasRole([Role.Customer]))) {
      router.push("/login");
    }
  }, [loading, isAuthenticated, hasRole, router]);

  useEffect(() => {
    const fetchEvents = async () => {
      if (!accessToken) return;

      try {
        const response = await fetch(`${getBaseUrl()}/api/events`, {
          headers: {
            Authorization: `Bearer ${accessToken}`,
          },
        });
        const data = await response.json();

        if (!response.ok) {
          setError(data.message || "Failed to fetch events");
          return;
        }
        setEvents(data.data || []);
      } catch (err) {
        console.error("Error fetching events:", err);
        setError("An unexpected error occurred while fetching events.");
      }
    };

    if (isAuthenticated) {
      fetchEvents();
    }
  }, [isAuthenticated, accessToken]);

  useEffect(() => {
    const now = new Date();
    const oneDayInMs = 24 * 60 * 60 * 1000; // 24 hours in milliseconds
    
    const categorizeEvents = (events: Event[]) => {
      const current: Event[] = [];
      const upcoming: Event[] = [];
      const past: Event[] = [];

      events.forEach(event => {
        const eventDate = new Date(event.date);
        const timeDiff = eventDate.getTime() - now.getTime();
        const isToday = eventDate.toDateString() === now.toDateString();
        const isCurrentEvent = timeDiff <= oneDayInMs && timeDiff >= 0;
        
        if (isToday || isCurrentEvent) {
          current.push(event);
        } else if (timeDiff > 0) {
          upcoming.push(event);
        } else {
          past.push(event);
        }
      });

      // Sort events by date
      const sortByDate = (a: Event, b: Event) => 
        new Date(a.date).getTime() - new Date(b.date).getTime();
      
      return {
        current: current.sort(sortByDate),
        upcoming: upcoming.sort(sortByDate),
        past: past.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
      };
    };

    let filtered = [...events];
    
    if (searchTerm) {
      filtered = filtered.filter(event =>
        event.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
        event.description?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        event.organizer.name.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    setFilteredEvents(categorizeEvents(filtered));
  }, [events, searchTerm]);

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

  const renderEventCard = (event: Event) => {
    const eventDate = formatEventDate(event.date);
    
    return (
      <Card key={event.id} className="overflow-hidden hover:shadow-lg transition-shadow h-full">
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

            <Button 
              className="w-full mt-4" 
              onClick={() => router.push(`/dashboard/customer/events/${event.id}`)}
              disabled={!eventDate.isUpcoming}
            >
              {eventDate.isUpcoming ? "View & Book Tickets" : "View Event"}
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  };

  const renderEventSection = (title: string, events: Event[]) => {
    if (events.length === 0) return null;
    
    return (
      <div className="space-y-4">
        <h2 className="text-2xl font-semibold">{title}</h2>
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {events.map(event => renderEventCard(event))}
        </div>
      </div>
    );
  };

  if (loading || !user || !hasRole([Role.Customer])) {
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
      <div className="space-y-8">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold">Events</h1>
            <p className="text-muted-foreground">Browse and book tickets for upcoming events</p>
          </div>
          <Button onClick={() => router.push("/dashboard/customer/reservations")}>
            My Reservations
          </Button>
        </div>

        <div className="flex flex-col sm:flex-row gap-4">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              type="search"
              placeholder="Search events..."
              className="pl-9"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
        </div>

        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded">
            {error}
          </div>
        )}

        <div className="space-y-12">
          {renderEventSection("Happening Now", filteredEvents.current)}
          {renderEventSection("Upcoming Events", filteredEvents.upcoming)}
          {renderEventSection("Past Events", filteredEvents.past)}
          
          {Object.values(filteredEvents).every(arr => arr.length === 0) && searchTerm && (
            <div className="text-center py-12">
              <p className="text-muted-foreground">No events found. Try adjusting your search.</p>
            </div>
          )}
        </div>
      </div>
    </DashboardLayout>
  );
}