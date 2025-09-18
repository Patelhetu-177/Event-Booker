"use client";

import { useState } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Menu, X, Calendar } from "lucide-react";

export default function Navbar() {
  const [isMenuOpen, setIsMenuOpen] = useState(false);

  const toggleMenu = () => {
    setIsMenuOpen(!isMenuOpen);
  };

  return (
    <nav className="bg-white shadow-lg sticky top-0 z-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-16">
          <Link href="/" className="flex items-center space-x-2">
            <Calendar className="h-8 w-8 text-blue-600" />
            <span className="text-xl font-bold text-gray-900">EventBooker</span>
          </Link>

          <div className="hidden md:flex items-center space-x-8">
            <Link
              href="#features"
              className="text-gray-700 hover:text-blue-600 px-3 py-2 rounded-md text-sm font-medium transition-colors"
            >
              Features
            </Link>
            <Link
              href="#how-it-works"
              className="text-gray-700 hover:text-blue-600 px-3 py-2 rounded-md text-sm font-medium transition-colors"
            >
              How It Works
            </Link>
            <Link
              href="#contact"
              className="text-gray-700 hover:text-blue-600 px-3 py-2 rounded-md text-sm font-medium transition-colors"
            >
              Contact
            </Link>
          </div>

          <div className="hidden md:flex items-center space-x-4">
            <Link href="/login">
              <Button variant="ghost" className="text-gray-700 hover:text-blue-600">
                Sign In
              </Button>
            </Link>
            <Link href="/register">
              <Button className="bg-blue-600 hover:bg-blue-700 text-white">
                Get Started
              </Button>
            </Link>
          </div>

          <div className="md:hidden">
            <Button
              variant="ghost"
              size="sm"
              onClick={toggleMenu}
              className="text-gray-700"
            >
              {isMenuOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
            </Button>
          </div>
        </div>

        {isMenuOpen && (
          <div className="md:hidden">
            <div className="px-2 pt-2 pb-3 space-y-1 sm:px-3 bg-white border-t">
              <Link
                href="#features"
                className="text-gray-700 hover:text-blue-600 block px-3 py-2 rounded-md text-base font-medium"
                onClick={toggleMenu}
              >
                Features
              </Link>
              <Link
                href="#how-it-works"
                className="text-gray-700 hover:text-blue-600 block px-3 py-2 rounded-md text-base font-medium"
                onClick={toggleMenu}
              >
                How It Works
              </Link>
              <Link
                href="#contact"
                className="text-gray-700 hover:text-blue-600 block px-3 py-2 rounded-md text-base font-medium"
                onClick={toggleMenu}
              >
                Contact
              </Link>
              <div className="pt-4 pb-3 border-t border-gray-200">
                <div className="flex flex-col space-y-2">
                  <Link href="/login" onClick={toggleMenu}>
                    <Button variant="ghost" className="w-full justify-start text-gray-700">
                      Sign In
                    </Button>
                  </Link>
                  <Link href="/register" onClick={toggleMenu}>
                    <Button className="w-full bg-blue-600 hover:bg-blue-700 text-white">
                      Get Started
                    </Button>
                  </Link>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </nav>
  );
}
