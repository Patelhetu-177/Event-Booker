"use client";

import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card,  CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import Navbar from "@/components/navbar";
import {
  Calendar,
  Users,
  Ticket,
  Zap,
  Globe,
  ArrowRight
} from "lucide-react";

export default function Home() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50">
      <Navbar />
      
      <section className="relative py-20 px-4 sm:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto">
          <div className="text-center">
            <h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold text-gray-900 mb-6">
              Create Amazing Events,
              <span className="text-blue-600 block">Sell Tickets Effortlessly</span>
            </h1>
            <p className="text-xl text-gray-600 mb-8 max-w-3xl mx-auto">
              The complete event management platform that helps you create, manage, and sell tickets
              for your events. From small meetups to large conferences, we&apos;ve got you covered.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center items-center">
              <Link href="/register">
                <Button size="lg" className="bg-blue-600 hover:bg-blue-700 text-white px-8 py-3 text-lg">
                  Get Started
                  <ArrowRight className="ml-2 h-5 w-5" />
                </Button>
              </Link>
              <Link href="/login">
                <Button variant="outline" size="lg" className="px-8 py-3 text-lg">
                  Sign In
                </Button>
              </Link>
            </div>

          </div>
        </div>
      </section>

      <section id="features" className="py-20 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-3xl sm:text-4xl font-bold text-gray-900 mb-4">
              Everything You Need to Manage Events
            </h2>
            <p className="text-xl text-gray-600 max-w-2xl mx-auto">
              Powerful features designed to make event management simple and efficient
            </p>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
            <Card className="hover:shadow-lg transition-shadow">
              <CardHeader>
                <Calendar className="h-10 w-10 text-blue-600 mb-4" />
                <CardTitle>Event Creation</CardTitle>
                <CardDescription>
                  Create beautiful event pages with rich descriptions, images, and scheduling
                </CardDescription>
              </CardHeader>
            </Card>

            <Card className="hover:shadow-lg transition-shadow">
              <CardHeader>
                <Ticket className="h-10 w-10 text-green-600 mb-4" />
                <CardTitle>Ticket Management</CardTitle>
                <CardDescription>
                  Flexible ticket types, pricing tiers, and inventory management with real-time updates
                </CardDescription>
              </CardHeader>
            </Card>

            <Card className="hover:shadow-lg transition-shadow">
              <CardHeader>
                <Users className="h-10 w-10 text-purple-600 mb-4" />
                <CardTitle>Attendee Management</CardTitle>
                <CardDescription>
                  Track registrations, manage attendee lists, and communicate with participants
                </CardDescription>
              </CardHeader>
            </Card>



            <Card className="hover:shadow-lg transition-shadow">
              <CardHeader>
                <Zap className="h-10 w-10 text-yellow-600 mb-4" />
                <CardTitle>Real-time Analytics</CardTitle>
                <CardDescription>
                  Comprehensive dashboards with sales tracking, attendee insights, and performance metrics
                </CardDescription>
              </CardHeader>
            </Card>

            <Card className="hover:shadow-lg transition-shadow">
              <CardHeader>
                <Globe className="h-10 w-10 text-indigo-600 mb-4" />
                <CardTitle>Multi-Platform</CardTitle>
                <CardDescription>
                  Responsive design that works perfectly on desktop, tablet, and mobile devices
                </CardDescription>
              </CardHeader>
            </Card>
          </div>
        </div>
      </section>

      <section id="how-it-works" className="py-20 bg-gray-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-3xl sm:text-4xl font-bold text-gray-900 mb-4">
              How It Works
            </h2>
            <p className="text-xl text-gray-600">
              Get started in minutes with our simple 3-step process
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-8">
            <div className="text-center">
              <div className="bg-blue-600 text-white rounded-full w-12 h-12 flex items-center justify-center text-xl font-bold mx-auto mb-4">
                1
              </div>
              <h3 className="text-xl font-semibold mb-4">Create Your Event</h3>
              <p className="text-gray-600">
                Set up your event details, add descriptions, images, and configure ticket types in minutes
              </p>
            </div>

            <div className="text-center">
              <div className="bg-green-600 text-white rounded-full w-12 h-12 flex items-center justify-center text-xl font-bold mx-auto mb-4">
                2
              </div>
              <h3 className="text-xl font-semibold mb-4">Promote & Sell</h3>
              <p className="text-gray-600">
                Share your event page and start selling tickets with our secure payment system
              </p>
            </div>

            <div className="text-center">
              <div className="bg-purple-600 text-white rounded-full w-12 h-12 flex items-center justify-center text-xl font-bold mx-auto mb-4">
                3
              </div>
              <h3 className="text-xl font-semibold mb-4">Manage & Track</h3>
              <p className="text-gray-600">
                Monitor sales, manage attendees, and track your event&apos;s success with detailed analytics
              </p>
            </div>
          </div>
        </div>
      </section>



      <section className="py-20 bg-blue-600">
        <div className="max-w-4xl mx-auto text-center px-4 sm:px-6 lg:px-8">
          <h2 className="text-3xl sm:text-4xl font-bold text-white mb-4">
            Ready to Create Your Next Event?
          </h2>
          <p className="text-xl text-blue-100 mb-8">
            Join thousands of event organizers who trust EventBooker to manage their events
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link href="/register">
              <Button size="lg" className="bg-white text-blue-600 hover:bg-gray-100 px-8 py-3 text-lg">
                Get Started Now
              </Button>
            </Link>
            <Link href="/login">
              <Button variant="outline" size="lg" className="border-white text-white hover:bg-white hover:text-blue-600 px-8 py-3 text-lg">
                Sign In
              </Button>
            </Link>
          </div>
        </div>
      </section>

      <footer className="bg-gradient-to-r from-gray-900 via-gray-800 to-gray-900 text-white py-16">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center space-y-8">
            <div>
              <div className="flex items-center justify-center space-x-3 mb-6">
                <Calendar className="h-10 w-10 text-blue-400" />
                <span className="text-3xl font-bold bg-gradient-to-r from-blue-400 to-purple-400 bg-clip-text text-transparent">
                  EventBooker
                </span>
              </div>
              <p className="text-xl text-gray-300 max-w-2xl mx-auto leading-relaxed">
                The complete event management platform for modern event organizers. 
                Create, manage, and sell tickets for your events effortlessly.
              </p>
            </div>

            <div className="bg-gray-800/50 rounded-2xl p-8 backdrop-blur-sm border border-gray-700">
              <h3 className="text-2xl font-semibold mb-6 text-white">Get In Touch</h3>
              <div className="flex flex-col sm:flex-row items-center justify-center gap-8">
                <div className="flex items-center space-x-3">
                  <div className="bg-blue-600 p-3 rounded-full">
                    <svg className="w-5 h-5 text-white" fill="currentColor" viewBox="0 0 20 20">
                      <path d="M2.003 5.884L10 9.882l7.997-3.998A2 2 0 0016 4H4a2 2 0 00-1.997 1.884z"></path>
                      <path d="M18 8.118l-8 4-8-4V14a2 2 0 002 2h12a2 2 0 002-2V8.118z"></path>
                    </svg>
                  </div>
                  <div>
                    <p className="text-sm text-gray-400">Email</p>
                    <a 
                      href="mailto:hetup9432@gmail.com" 
                      className="text-blue-400 hover:text-blue-300 transition-colors font-medium"
                    >
                      hetup9432@gmail.com
                    </a>
                  </div>
                </div>
                
                <div className="flex items-center space-x-3">
                  <div className="bg-blue-600 p-3 rounded-full">
                    <svg className="w-5 h-5 text-white" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M16.338 16.338H13.67V12.16c0-.995-.017-2.277-1.387-2.277-1.39 0-1.601 1.086-1.601 2.207v4.248H8.014v-8.59h2.559v1.174h.037c.356-.675 1.227-1.387 2.526-1.387 2.703 0 3.203 1.778 3.203 4.092v4.711zM5.005 6.575a1.548 1.548 0 11-.003-3.096 1.548 1.548 0 01.003 3.096zm-1.337 9.763H6.34v-8.59H3.667v8.59zM17.668 1H2.328C1.595 1 1 1.581 1 2.298v15.403C1 18.418 1.595 19 2.328 19h15.34c.734 0 1.332-.582 1.332-1.299V2.298C19 1.581 18.402 1 17.668 1z" clipRule="evenodd"></path>
                    </svg>
                  </div>
                  <div>
                    <p className="text-sm text-gray-400">LinkedIn</p>
                    <a 
                      href="https://www.linkedin.com/in/hetu-patel-61a8b1288/" 
                      target="_blank" 
                      rel="noopener noreferrer"
                      className="text-blue-400 hover:text-blue-300 transition-colors font-medium"
                    >
                      Connect with me
                    </a>
                  </div>
                </div>
              </div>
            </div>

            <div className="flex flex-wrap justify-center gap-8 text-gray-300">
              <Link href="#features" className="hover:text-blue-400 transition-colors font-medium">
                Features
              </Link>
              <Link href="#how-it-works" className="hover:text-blue-400 transition-colors font-medium">
                How It Works
              </Link>
              <Link href="/register" className="hover:text-blue-400 transition-colors font-medium">
                Get Started
              </Link>
              <Link href="/login" className="hover:text-blue-400 transition-colors font-medium">
                Sign In
              </Link>
            </div>

            <div className="border-t border-gray-700 pt-8">
              <p className="text-gray-400 text-sm">
                &copy; 2025 EventBooker. 
              </p>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
