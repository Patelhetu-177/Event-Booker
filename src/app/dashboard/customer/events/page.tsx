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
  const { user, loading: authLoading, isAuthenticated, hasRole, accessToken } = useAuth();
  const router = useRouter();
  const [events, setEvents] = useState<Event[]>([]);
  const [filteredEvents, setFilteredEvents] = useState<{
    current: Event[];
    upcoming: Event[];
    past: Event[];
  }>({ current: [], upcoming: [], past: [] });
  const [isPageLoading, setIsPageLoading] = useState(true);
  
  const getSafeEvents = useCallback(() => {
    return Array.isArray(events) ? events : [];
  }, [events]);

  const { isLoading: isToastLoading, withLoading } = useLoadingToast({
    loadingText: "Loading events...",
    successText: "Events loaded successfully!",
    errorText: "Failed to load events"
  });
  const [isRefreshing, setIsRefreshing] = useState(false);
    
  const isLoading = isPageLoading || isToastLoading;
  const [searchTerm, setSearchTerm] = useState("");
  const [error, setError] = useState<string | null>(null);

  const fetchEvents = useCallback(async () => {
    try {
      console.log('Fetching events...');
      const response = await withLoading(
        fetch('/api/events', {
          credentials: 'include',
          headers: accessToken ? {
            'Authorization': `Bearer ${accessToken}`,
          } : {}
        })
      );
      
      if (!response) throw new Error('No response from server');

      console.log('Response status:', response.status);

      if (!response.ok) {
        let errorData;
        try {
          errorData = await response.json();
          console.error('Error response from API:', errorData);
        } catch (e) {
          console.error('Failed to parse error response:', e);
        }
        throw new Error(errorData?.message || `Failed to fetch events: ${response.statusText}`);
      }

      const data = await response.json();
      console.log('Fetched events data:', data);

      const eventsArray = Array.isArray(data) ? data : (data.data || []);
      console.log('Setting events:', eventsArray);

      if (!Array.isArray(eventsArray)) {
        console.error('Unexpected events format:', eventsArray);
        throw new Error('Invalid events data format received from server');
      }

      setEvents(eventsArray);
    } catch (error) {
      console.error("Error in fetchEvents:", error);
    } finally {
      setIsRefreshing(false);
    }
  }, [accessToken, withLoading]);

  useEffect(() => {
    if (authLoading) return;
    
    if (!isAuthenticated || !hasRole([Role.Customer])) {
      router.push("/login");
      return;
    }
    
    if (events.length === 0) {
      fetchEvents().finally(() => setIsPageLoading(false));
    } else {
      setIsPageLoading(false);
    }
  }, [authLoading, isAuthenticated, hasRole, router, events.length, fetchEvents]);

  const handleRefresh = useCallback(() => {
    setIsRefreshing(true);
    fetchEvents().finally(() => setIsRefreshing(false));
  }, [fetchEvents]);

  useEffect(() => {
    const handleRefreshEvent = (e: CustomEvent) => {
      if (e.detail === 'refresh-events') {
        handleRefresh();
      }
    };

    (window as Window).addEventListener('refresh-events', handleRefreshEvent as EventListener);
    return () => {
      (window as Window).removeEventListener('refresh-events', handleRefreshEvent as EventListener);
    };
  }, [handleRefresh]);

  useEffect(() => {
    console.log('useEffect triggered, accessToken:', accessToken ? 'exists' : 'missing');
    if (accessToken) {
      console.log('Calling fetchEvents...');
      fetchEvents()
        .then(() => console.log('Fetch events completed'))
        .catch(err => {
          console.error('Error in fetchEvents:', err);
          setError(err.message);
        });
    } else {
      console.log('No access token, not fetching events');
    }
  }, [accessToken, fetchEvents]);

  const now = new Date();
  const oneDayInMs = 24 * 60 * 60 * 1000;

  const categorizeEvents = (events: Event[]) => {
    console.log('Categorizing events:', events);
    const current: Event[] = [];
    const upcoming: Event[] = [];
    const past: Event[] = [];

    const now = new Date();
    const oneDayInMs = 24 * 60 * 60 * 1000;

    // If no events, return empty categories
    if (!Array.isArray(events) || events.length === 0) {
      console.log('No events to categorize');
      return { current, upcoming, past };
    }

    events.forEach(event => {
      if (!event || !event.date) {
        console.warn('Invalid event data:', event);
        return;
      }

      try {
        const eventDate = new Date(event.date);
        console.log(`Event: ${event.title}, Date: ${eventDate}`);

        // If date is invalid, skip this event
        if (isNaN(eventDate.getTime())) {
          console.warn('Invalid date for event:', event);
          return;
        }

        const timeDiff = eventDate.getTime() - now.getTime();
        const isToday = eventDate.toDateString() === now.toDateString();
        const isCurrentEvent = timeDiff <= oneDayInMs && timeDiff >= 0;

        console.log(`  isToday: ${isToday}, isCurrentEvent: ${isCurrentEvent}, timeDiff: ${timeDiff}ms`);

        // For debugging, let's show all events in upcoming for now
        upcoming.push(event);
        /*
        if (isToday || isCurrentEvent) {
          console.log(`  -> Current event`);
          current.push(event);
        } else if (timeDiff > 0) {
          console.log(`  -> Upcoming event`);
          upcoming.push(event);
        } else {
          console.log(`  -> Past event`);
          past.push(event);
        }
        */
      } catch (error) {
        console.error('Error processing event:', error, event);
      }
    });

    const sortByDate = (a: Event, b: Event) =>
      new Date(a.date).getTime() - new Date(b.date).getTime();

    return {
      current: current.sort(sortByDate),
      upcoming: upcoming.sort(sortByDate),
      past: past.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
    };
  };

  useEffect(() => {
    try {
      const currentEvents = getSafeEvents();
      let filtered = [...currentEvents];

      if (searchTerm) {
        filtered = filtered.filter(event =>
          event?.title?.toLowerCase().includes(searchTerm.toLowerCase()) ||
          event?.description?.toLowerCase().includes(searchTerm.toLowerCase()) ||
          event?.organizer?.name?.toLowerCase().includes(searchTerm.toLowerCase())
        );
      }

      setFilteredEvents(categorizeEvents(filtered));
    } catch (error) {
      console.error('Error filtering events:', error);
      setFilteredEvents({ current: [], upcoming: [], past: [] });
    }
  }, [events, searchTerm, getSafeEvents]);

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
    console.log(`Rendering ${title}:`, events);

    return (
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-2xl font-semibold">{title}</h2>
          <span className="text-sm text-muted-foreground">
            {events.length} {events.length === 1 ? 'event' : 'events'}
          </span>
        </div>

        {events.length === 0 ? (
          <div className="text-center py-8 border rounded-lg bg-muted/20">
            <p className="text-muted-foreground">No {title.toLowerCase()} found</p>
          </div>
        ) : (
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            {events.map(event => renderEventCard(event))}
          </div>
        )}


      </div>
    );
  };


  if (isLoading) {
    return (
      <DashboardLayout>
        <div className="flex flex-col items-center justify-center min-h-[60vh] space-y-6">
          <div className="flex flex-col items-center space-y-4">
            <div className="h-12 w-12 border-4 border-primary border-t-transparent rounded-full animate-spin"></div>
            <div className="text-center space-y-1">
              <p className="text-lg font-medium">Loading Events</p>
              <p className="text-sm text-muted-foreground">Please wait while we load the latest events...</p>
            </div>
          </div>
          {process.env.NODE_ENV === 'development' && (
            <div className="mt-6 p-4 bg-muted/20 rounded-lg w-full max-w-md">
              <p className="text-sm font-medium mb-2 text-center">Loading State</p>
              <div className="grid grid-cols-2 gap-2 text-xs">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Auth Status:</span>
                  <span>{authLoading ? 'Checking...' : isAuthenticated ? 'Authenticated' : 'Not Authenticated'}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Role:</span>
                  <span>{user?.role || 'Unknown'}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Events Loaded:</span>
                  <span>{events.length}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Access Token:</span>
                  <span>{accessToken ? 'Yes' : 'No'}</span>
                </div>
              </div>
            </div>
          )}
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

          {isRefreshing && (
            <div className="flex justify-center py-12">
              <LoadingSpinner size="md" />
            </div>
          )}
        </div>
      </div>
    </DashboardLayout>
  );
}