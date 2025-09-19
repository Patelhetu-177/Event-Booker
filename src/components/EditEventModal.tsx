"use client";

import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "./ui/textarea";
import { useToast } from "@/components/ui/toast";
import { Loader2, Calendar, MapPin } from "lucide-react";

interface Event {
  id: string;
  title: string;
  description: string;
  date: string;
  location: string;
}

interface EditEventModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  event: Event | null;
  onEventUpdated: () => void;
}

export default function EditEventModal({ open, onOpenChange, event, onEventUpdated }: EditEventModalProps) {
  const { toast } = useToast();
  const [formData, setFormData] = useState<Omit<Event, 'id'>>({ 
    title: '', 
    description: '', 
    date: new Date().toISOString().slice(0, 16),
    location: '' 
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  useEffect(() => {
    if (event) {
        try {
        const eventDate = new Date(event.date);
        const localDateString = eventDate.toISOString().slice(0, 16);
        
        setFormData({
          title: event.title,
          description: event.description,
          date: localDateString,
          location: event.location || ''
        });
      } catch (error) {
        console.error('Error setting initial form data:', error);
      }
    }
    setErrors({});
  }, [event, open]);

  const formatDateForServer = (dateString: string): string => {
    try {
      const date = new Date(dateString);
      if (isNaN(date.getTime())) {
        throw new Error('Invalid date');
      }
      return date.toISOString();
    } catch (error) {
      console.error('Error formatting date:', error);
      return dateString; 
    }
  };

  const validateForm = () => {
    const newErrors: Record<string, string> = {};
    
    if (!formData.title.trim()) {
      newErrors.title = 'Title is required';
    }
    
    if (!formData.description.trim()) {
      newErrors.description = 'Description is required';
    }
    
    if (!formData.date) {
      newErrors.date = 'Date and time are required';
    } else {
      try {
        const date = new Date(formData.date);
        if (isNaN(date.getTime())) {
          newErrors.date = 'Invalid date format';
        } else if (date < new Date()) {
          newErrors.date = 'Event date cannot be in the past';
        }
      } catch  {
        newErrors.date = 'Invalid date format';
      }
    }
    
    if (!formData.location.trim()) {
      newErrors.location = 'Location is required';
    }
    
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!event) return;
    
    setErrors({});
    
    if (!validateForm()) {
      return;
    }

    try {
      setIsSubmitting(true);
      const token = localStorage.getItem("accessToken");
      const userId = localStorage.getItem("userId");
      const userRole = localStorage.getItem("userRole");

      if (!token || !userId || !userRole) {
        throw new Error("Your session has expired. Please log in again.");
      }

      const formattedDate = formData.date ? formatDateForServer(formData.date) : '';
      
      const payload = {
        ...formData,
        date: formattedDate,
        location: formData.location || ''
      };

      const response = await fetch(`/api/events/${event.id}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${token}`,
          "x-user-id": userId,
          "x-user-role": userRole
        },
        body: JSON.stringify(payload),
      });

      const responseData = await response.json();

      if (!response.ok) {
        if (response.status === 401) {
          throw new Error("Your session has expired. Please log in again.");
        } else if (response.status === 403) {
          throw new Error("You don't have permission to update this event.");
        } else if (response.status === 404) {
          throw new Error("Event not found. It may have been deleted.");
        } else {
          if (responseData?.errors) {
            const serverErrors = responseData.errors;
            const fieldErrors: Record<string, string> = {};
            
            if (Array.isArray(serverErrors)) {
              serverErrors.forEach((error) => {
                const field = error.path?.[0] || 'general';
                const message = error.message || 'Invalid input';
                fieldErrors[field] = message;
              });
            } else if (typeof serverErrors === 'object') {
              Object.entries(serverErrors).forEach(([field, error]) => {
                const formFieldName = field.includes('_') 
                  ? field.split('_').map((word, i) => 
                      i === 0 ? word : word.charAt(0).toUpperCase() + word.slice(1)
                    ).join('')
                  : field;
                  
                fieldErrors[formFieldName] = Array.isArray(error) 
                  ? error.join(' ') 
                  : String(error);
              });
            }
            
            if (Object.keys(fieldErrors).length > 0) {
              setErrors(fieldErrors);
              return;
            }
          }
          throw new Error(responseData.message || "Failed to update event. Please try again.");
        }
      }

      if (response.ok) {
        setErrors({});
        
        toast({
          title: "Success",
          description: responseData?.message || "Event has been updated successfully.",
          variant: "default",
        });

        onEventUpdated();
        onOpenChange(false);
        return;
      }
      
      console.warn("Unexpected response format:", responseData);
    } catch (error) {
      console.error("Error updating event:", error);
      
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "An unexpected error occurred. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
    
    if (errors[name]) {
      setErrors(prev => ({
        ...prev,
        [name]: ''
      }));
    }
  };

  return (
    <Dialog open={open} onOpenChange={(isOpen) => {
      if (!isOpen && isSubmitting) return;
      onOpenChange(isOpen);
    }}>
      <DialogContent className="sm:max-w-[90vw] md:max-w-2xl max-h-[90vh] overflow-y-auto p-0">
        <div className="p-6">
          <DialogHeader>
            <DialogTitle className="text-2xl font-bold text-gray-900 dark:text-white">
              Edit Event
            </DialogTitle>
            <DialogDescription className="text-gray-500 dark:text-gray-400">
              Update the event details below. All fields are required.
            </DialogDescription>
          </DialogHeader>
          
          <form onSubmit={handleSubmit} className="mt-6 space-y-6">
            <div className="space-y-6">
              {/* Title */}
              <div className="space-y-2">
                <Label htmlFor="title" className="text-sm font-medium text-gray-700 dark:text-gray-300">
                  Event Title <span className="text-red-500">*</span>
                </Label>
                <div className="relative">
                  <Input
                    id="title"
                    name="title"
                    value={formData.title}
                    onChange={handleChange}
                    placeholder="Enter event title"
                    className={`w-full ${errors.title ? 'border-red-500 pr-10' : ''}`}
                    disabled={isSubmitting}
                  />
                  {errors.title && (
                    <span className="absolute right-3 top-1/2 -translate-y-1/2 text-red-500">
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                        <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                      </svg>
                    </span>
                  )}
                </div>
                {errors.title && (
                  <p className="text-sm text-red-500 mt-1">{errors.title}</p>
                )}
              </div>

              {/* Description */}
              <div className="space-y-2">
                <Label htmlFor="description" className="text-sm font-medium text-gray-700 dark:text-gray-300">
                  Description <span className="text-red-500">*</span>
                </Label>
                <div className="relative">
                  <Textarea
                    id="description"
                    name="description"
                    value={formData.description}
                    onChange={handleChange}
                    placeholder="Enter event description"
                    className={`min-h-[120px] ${errors.description ? 'border-red-500 pr-10' : ''}`}
                    disabled={isSubmitting}
                  />
                  {errors.description && (
                    <span className="absolute right-3 top-3 text-red-500">
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                        <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                      </svg>
                    </span>
                  )}
                </div>
                {errors.description && (
                  <p className="text-sm text-red-500 mt-1">{errors.description}</p>
                )}
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Date & Time */}
                <div className="space-y-2">
                  <Label htmlFor="date" className="text-sm font-medium text-gray-700 dark:text-gray-300 flex items-center gap-2">
                    <Calendar className="h-4 w-4 text-gray-500" />
                    <span>Date & Time <span className="text-red-500">*</span></span>
                  </Label>
                  <div className="relative">
                    <Input
                      id="date"
                      name="date"
                      type="datetime-local"
                      value={formData.date}
                      onChange={handleChange}
                      className={`w-full ${errors.date ? 'border-red-500 pr-10' : ''}`}
                      disabled={isSubmitting}
                    />
                    {errors.date && (
                      <span className="absolute right-3 top-1/2 -translate-y-1/2 text-red-500">
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                          <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                        </svg>
                      </span>
                    )}
                  </div>
                  {errors.date && (
                    <p className="text-sm text-red-500 mt-1">{errors.date}</p>
                  )}
                </div>

                {/* Location */}
                <div className="space-y-2">
                  <Label htmlFor="location" className="text-sm font-medium text-gray-700 dark:text-gray-300 flex items-center gap-2">
                    <MapPin className="h-4 w-4 text-gray-500" />
                    <span>Location <span className="text-red-500">*</span></span>
                  </Label>
                  <div className="relative">
                    <Input
                      id="location"
                      name="location"
                      value={formData.location}
                      onChange={handleChange}
                      placeholder="Enter event location"
                      className={`w-full ${errors.location ? 'border-red-500 pr-10' : ''}`}
                      disabled={isSubmitting}
                    />
                    {errors.location && (
                      <span className="absolute right-3 top-1/2 -translate-y-1/2 text-red-500">
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                          <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                        </svg>
                      </span>
                    )}
                  </div>
                  {errors.location && (
                    <p className="text-sm text-red-500 mt-1">{errors.location}</p>
                  )}
                </div>
              </div>
            </div>
            
            <div className="flex flex-col-reverse sm:flex-row justify-end gap-3 pt-6 border-t border-gray-200 dark:border-gray-700">
              <Button 
                type="button"
                variant="outline"
                onClick={() => onOpenChange(false)}
                disabled={isSubmitting}
                className="w-full sm:w-24"
              >
                Cancel
              </Button>
              <Button 
                type="submit" 
                disabled={isSubmitting}
                className="w-full sm:w-32 bg-blue-600 hover:bg-blue-700 text-white"
              >
                {isSubmitting ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Saving...
                  </>
                ) : (
                  'Save Changes'
                )}
              </Button>
            </div>
          </form>
        </div>
      </DialogContent>
    </Dialog>
  );
}
