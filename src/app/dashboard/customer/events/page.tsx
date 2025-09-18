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
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Calendar, Clock, Search, Filter, User } from "lucide-react";
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
  const [filteredEvents, setFilteredEvents] = useState<Event[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [filterBy, setFilterBy] = useState("all");

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
        setEvents(data.data);
        setFilteredEvents(data.data);
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
    let filtered = events;

    if (searchTerm) {
      filtered = filtered.filter(event =>
        event.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
        event.description?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        event.organizer.name.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    const now = new Date();
    if (filterBy === "upcoming") {
      filtered = filtered.filter(event => new Date(event.date) > now);
    } else if (filterBy === "past") {
      filtered = filtered.filter(event => new Date(event.date) <= now);
    }

    setFilteredEvents(filtered);
  }, [events, searchTerm, filterBy]);

  if (loading || !user || !hasRole([Role.Customer])) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center min-h-screen-minus-header">
          <p>Loading or unauthorized...</p>
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

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold">Browse Events</h1>
            <p className="text-muted-foreground">Discover and book tickets for amazing events</p>
          </div>
        </div>

        <div className="flex flex-col sm:flex-row gap-4">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
            <Input
              placeholder="Search events, organizers..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10"
            />
          </div>
          <div className="flex items-center gap-2">
            <Filter className="h-4 w-4 text-muted-foreground" />
            <Select value={filterBy} onValueChange={setFilterBy}>
              <SelectTrigger className="w-[150px]">
                <SelectValue placeholder="Filter by" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Events</SelectItem>
                <SelectItem value="upcoming">Upcoming</SelectItem>
                <SelectItem value="past">Past Events</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded">
            {error}
          </div>
        )}

        {filteredEvents.length === 0 && events.length > 0 ? (
          <Card>
            <CardContent className="flex flex-col items-center justify-center py-12">
              <Search className="h-12 w-12 text-muted-foreground mb-4" />
              <h3 className="text-lg font-semibold mb-2">No Events Found</h3>
              <p className="text-muted-foreground text-center">
                No events match your search criteria. Try adjusting your filters or search terms.
              </p>
              <Button 
                variant="outline" 
                className="mt-4"
                onClick={() => {
                  setSearchTerm("");
                  setFilterBy("all");
                }}
              >
                Clear Filters
              </Button>
            </CardContent>
          </Card>
        ) : events.length === 0 && !error ? (
          <Card>
            <CardContent className="flex flex-col items-center justify-center py-12">
              <Calendar className="h-12 w-12 text-muted-foreground mb-4" />
              <h3 className="text-lg font-semibold mb-2">No Events Available</h3>
              <p className="text-muted-foreground text-center">
                There are currently no events to display. Check back later for new events!
              </p>
            </CardContent>
          </Card>
        ) : (
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            {filteredEvents.map((event) => {
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
            })}
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}
