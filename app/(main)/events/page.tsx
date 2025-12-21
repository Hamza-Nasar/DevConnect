"use client";

import { useState, useEffect } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import {
  Calendar,
  Plus,
  Search,
  MapPin,
  Clock,
  Users,
  CheckCircle,
  X,
  Filter,
  Grid3x3,
  List,
  TrendingUp,
  Star,
  Share2,
  Bell,
} from "lucide-react";
import Navbar from "@/components/navbar/Navbar";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Avatar } from "@/components/ui/avatar";
import { formatTimeAgo, formatNumber } from "@/lib/utils";
import { motion } from "framer-motion";
import toast from "react-hot-toast";

interface Event {
  id: string;
  title: string;
  description: string;
  date: string;
  time: string;
  location?: string;
  online?: boolean;
  image?: string;
  organizer: {
    id: string;
    name?: string;
    avatar?: string;
  };
  attendeesCount: number;
  maxAttendees?: number;
  isAttending?: boolean;
  category: string;
  tags: string[];
  createdAt: string;
}

export default function EventsPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [events, setEvents] = useState<Event[]>([]);
  const [myEvents, setMyEvents] = useState<Event[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [viewMode, setViewMode] = useState<"grid" | "list">("grid");
  const [activeTab, setActiveTab] = useState("upcoming");
  const [filter, setFilter] = useState("all");

  useEffect(() => {
    if (status === "unauthenticated") {
      router.push("/login");
    }
  }, [status, router]);

  useEffect(() => {
    fetchEvents();
    fetchMyEvents();
  }, [filter]);

  const fetchEvents = async () => {
    try {
      const res = await fetch(`/api/events?filter=${filter}`);
      if (res.ok) {
        const data = await res.json();
        setEvents(data.events || []);
      }
    } catch (error) {
      console.error("Error fetching events:", error);
    }
  };

  const fetchMyEvents = async () => {
    try {
      const res = await fetch("/api/events/my");
      if (res.ok) {
        const data = await res.json();
        setMyEvents(data.events || []);
      }
    } catch (error) {
      console.error("Error fetching my events:", error);
    }
  };

  const handleRSVP = async (eventId: string, attending: boolean) => {
    try {
      const res = await fetch("/api/events/rsvp", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ eventId, attending }),
      });

      if (res.ok) {
        toast.success(attending ? "RSVP confirmed!" : "RSVP cancelled");
        fetchEvents();
        fetchMyEvents();
      }
    } catch (error) {
      console.error("Error RSVPing:", error);
      toast.error("Failed to RSVP");
    }
  };

  if (status === "loading") {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    );
  }

  const filteredEvents = events.filter(
    (event) =>
      event.title?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      event.description?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      event.location?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const displayEvents = activeTab === "my" ? myEvents : filteredEvents;

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <div className="pt-16 lg:pl-72 xl:pl-80">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          {/* Header */}
          <div className="mb-8">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h1 className="text-3xl font-bold text-foreground mb-2 flex items-center gap-2">
                  <Calendar className="h-8 w-8 text-purple-400" />
                  Events
                </h1>
                <p className="text-muted-foreground">
                  Discover and join developer events near you
                </p>
              </div>
              <div className="flex items-center gap-2">
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => setViewMode(viewMode === "grid" ? "list" : "grid")}
                >
                  {viewMode === "grid" ? <List className="h-5 w-5" /> : <Grid3x3 className="h-5 w-5" />}
                </Button>
                <Button variant="primary" size="sm">
                  <Plus className="h-4 w-4 mr-2" />
                  Create Event
                </Button>
              </div>
            </div>

            {/* Search and Filters */}
            <div className="flex items-center gap-4 mb-4">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-muted-foreground" />
                <Input
                  type="text"
                  placeholder="Search events..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10 bg-secondary/50 border-input"
                />
              </div>
              <select
                value={filter}
                onChange={(e) => setFilter(e.target.value)}
                className="px-4 py-2 bg-secondary/50 border border-input rounded-lg text-foreground"
              >
                <option value="all">All Events</option>
                <option value="upcoming">Upcoming</option>
                <option value="today">Today</option>
                <option value="thisWeek">This Week</option>
                <option value="online">Online</option>
              </select>
            </div>

            {/* Tabs */}
            <div className="flex gap-2 mb-6">
              <button
                onClick={() => setActiveTab("upcoming")}
                className={`px-4 py-2 rounded-lg font-medium transition ${activeTab === "upcoming"
                  ? "bg-primary text-primary-foreground"
                  : "bg-secondary/50 text-muted-foreground hover:text-foreground"
                  }`}
              >
                Upcoming
              </button>
              <button
                onClick={() => setActiveTab("my")}
                className={`px-4 py-2 rounded-lg font-medium transition ${activeTab === "my"
                  ? "bg-primary text-primary-foreground"
                  : "bg-secondary/50 text-muted-foreground hover:text-foreground"
                  }`}
              >
                My Events
              </button>
            </div>
          </div>

          {/* Events Grid */}
          <div
            className={
              viewMode === "grid"
                ? "grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6"
                : "space-y-4"
            }
          >
            {displayEvents.length === 0 ? (
              <div className="text-center py-12 text-muted-foreground col-span-full">
                <Calendar className="h-12 w-12 mx-auto mb-4 opacity-50" />
                <p>No events found</p>
              </div>
            ) : (
              displayEvents.map((event) => (
                <motion.div
                  key={event.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.3 }}
                >
                  <Card variant="elevated" hover className="cursor-pointer overflow-hidden">
                    {event.image && (
                      <div className="h-48 bg-gradient-to-r from-purple-600 to-blue-600 relative">
                        <img
                          src={event.image}
                          alt={event.title}
                          className="w-full h-full object-cover"
                        />
                        <div className="absolute top-4 right-4">
                          {event.isAttending ? (
                            <Badge variant="success" className="flex items-center gap-1">
                              <CheckCircle className="h-3 w-3" />
                              Attending
                            </Badge>
                          ) : (
                            <Badge variant="outline" className="bg-background/80 backdrop-blur-sm">Available</Badge>
                          )}
                        </div>
                      </div>
                    )}
                    <div className="p-6">
                      <div className="flex items-start justify-between mb-3">
                        <div className="flex-1">
                          <h3 className="font-bold text-foreground text-lg mb-1">
                            {event.title}
                          </h3>
                          <div className="flex items-center gap-2 text-sm text-muted-foreground mb-2">
                            <Clock className="h-4 w-4" />
                            <span>
                              {new Date(event.date).toLocaleDateString()} at {event.time}
                            </span>
                          </div>
                          {event.location && (
                            <div className="flex items-center gap-2 text-sm text-muted-foreground mb-2">
                              <MapPin className="h-4 w-4" />
                              <span>{event.location}</span>
                            </div>
                          )}
                          {event.online && (
                            <Badge variant="info" className="text-xs">
                              Online Event
                            </Badge>
                          )}
                        </div>
                      </div>

                      <p className="text-sm text-muted-foreground mb-4 line-clamp-2">
                        {event.description}
                      </p>

                      <div className="flex items-center justify-between mb-4">
                        <div className="flex items-center gap-4 text-sm text-muted-foreground">
                          <span className="flex items-center gap-1">
                            <Users className="h-4 w-4" />
                            {formatNumber(event.attendeesCount)}
                            {event.maxAttendees && ` / ${event.maxAttendees}`}
                          </span>
                          <span className="flex items-center gap-1">
                            <Star className="h-4 w-4" />
                            {event.category}
                          </span>
                        </div>
                      </div>

                      <div className="flex items-center gap-2">
                        <Button
                          variant={event.isAttending ? "outline" : "primary"}
                          size="sm"
                          className="flex-1"
                          onClick={() => handleRSVP(event.id, !event.isAttending)}
                        >
                          {event.isAttending ? (
                            <>
                              <X className="h-4 w-4 mr-2" />
                              Cancel RSVP
                            </>
                          ) : (
                            <>
                              <CheckCircle className="h-4 w-4 mr-2" />
                              RSVP
                            </>
                          )}
                        </Button>
                        <Button variant="ghost" size="icon">
                          <Share2 className="h-4 w-4" />
                        </Button>
                        <Button variant="ghost" size="icon">
                          <Bell className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  </Card>
                </motion.div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
}


