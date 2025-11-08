"use client";

import DashboardLayout from "@/components/dashboard-layout";
import { useAuth } from "@/context/AuthContext";
import { useRouter } from "next/navigation";
import { LoadingSpinner } from "@/components/ui/loading-spinner";
import { Role } from "@prisma/client";
import { useEffect, useState, useCallback } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Search, User, Clock, Calendar, AlertCircle, RefreshCw } from "lucide-react";
import { getBaseUrl } from "@/lib/client-utils";
import { useLoadingToast } from "@/hooks/use-loading-toast";
import { LoadingButton } from "@/components/ui/loading-button";

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
  const { isLoading, withLoading } = useLoadingToast({
    loadingText: "Loading events...",
    successText: "Events loaded successfully!",
    errorText: "Failed to load events"
  });
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!loading && (!isAuthenticated || !hasRole([Role.Customer]))) {
      router.push("/login");
    }
  }, [loading, isAuthenticated, hasRole, router]);

  const fetchEvents = useCallback(async () => {
    if (!accessToken) return;

    try {
      const data = await withLoading(
        fetch(`${getBaseUrl()}/api/events`, {
          headers: {
            'Authorization': `Bearer ${accessToken}`,
          },
        })
          .then(async (response) => {
            const data = await response.json();
            if (!response.ok) {
              throw new Error(data.message || "Failed to fetch events");
            }
            return data;
          })
      );
      
      if (data) {
        setEvents(data);
      }
      return data;
    } catch (error) {
      console.error("Error in fetchEvents:", error);
      throw error;
    } finally {
      setIsRefreshing(false);
    }
  }, [accessToken]);

  useEffect(() => {
    const handleRefresh = (e: CustomEvent) => {
      if (e.detail === 'refresh-events') {
        setIsRefreshing(true);
        fetchEvents();
      }
    };

    (window as Window).addEventListener('refresh-events', handleRefresh as EventListener);
    return () => {
      (window as Window).removeEventListener('refresh-events', handleRefresh as EventListener);
    };
  }, [fetchEvents]);

  useEffect(() => {
    if (accessToken) {
      fetchEvents();
    }
  }, [accessToken, fetchEvents]);

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

  useEffect(() => {
    let filtered = [...events];

    if (searchTerm) {
      filtered = filtered.filter(event =>
        event.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
        event.description?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        event.organizer.name.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    setFilteredEvents(categorizeEvents(filtered));
  }, [events, searchTerm]); // Add all dependencies used inside the effect

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

  const handleRefresh = () => {
    setIsRefreshing(true);
    fetchEvents();
  };

  if (isLoading && !isRefreshing) {
    return (
      <DashboardLayout>
        <div className="flex flex-col items-center justify-center min-h-[400px] space-y-4">
          <p className="text-lg font-medium text-muted-foreground">Loading events...</p>
          <div className="h-1 w-48 bg-muted rounded-full overflow-hidden">
            <div className="h-full bg-primary animate-pulse" style={{
              width: '100%',
              animationDuration: '2s',
              animationTimingFunction: 'cubic-bezier(0.4, 0, 0.6, 1)',
              animationIterationCount: 'infinite'
            }} />
          </div>
        </div>
      </DashboardLayout>
    );
  }

  if (error) {
    return (
      <DashboardLayout>
        <div className="space-y-6">
          <div className="flex flex-col items-center justify-center min-h-[400px] text-center p-6">
            <AlertCircle className="h-12 w-12 text-red-500 mb-4" />
            <h2 className="text-xl font-semibold mb-2">Error Loading Events</h2>
            <p className="text-muted-foreground mb-4">{error}</p>
            <Button onClick={handleRefresh} disabled={isRefreshing}>
              {isRefreshing ? (
                <>
                  <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                  Refreshing...
                </>
              ) : (
                <>
                  <RefreshCw className="h-4 w-4 mr-2" />
                  Try Again
                </>
              )}
            </Button>
          </div>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <h1 className="text-3xl font-bold">Available Events</h1>
          <div className="flex items-center gap-2">
            <div className="relative w-full md:w-64">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-500" />
              <Input
                type="text"
                placeholder="Search events..."
                className="pl-10 w-full"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
            <LoadingButton
              variant="outline"
              size="icon"
              onClick={handleRefresh}
              isLoading={isRefreshing}
              title="Refresh events"
            >
              <RefreshCw className="h-4 w-4" />
            </LoadingButton>
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

          {isRefreshing ? (
            <div className="flex justify-center py-12">
              <LoadingSpinner size="md" />
            </div>
          ) : filteredEvents.current.length === 0 &&
            filteredEvents.upcoming.length === 0 &&
            filteredEvents.past.length === 0 ? (
            <div className="text-center py-12">
              <p className="text-muted-foreground">
                {searchTerm ? 'No events match your search.' : 'No events available at the moment.'}
              </p>
              <Button
                variant="ghost"
                className="mt-4"
                onClick={handleRefresh}
                disabled={isRefreshing}
              >
                {isRefreshing ? 'Refreshing...' : 'Refresh'}
              </Button>
            </div>
          ) : (
            <></>
          )}
        </div>
      </div>
    </DashboardLayout>
  );
}