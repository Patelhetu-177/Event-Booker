"use client";

import { createContext, useContext, useState, useEffect, ReactNode, useCallback } from "react";
import { useRouter } from "next/navigation";
import { getBaseUrl } from "@/lib/client-utils";
import { Role } from "@prisma/client";

interface User {
  id: string;
  name: string;
  email: string;
  role: Role;
  createdAt: string;
  updatedAt: string;
}

interface AuthContextType {
  user: User | null;
  accessToken: string | null;
  login: (email: string, password: string) => Promise<boolean>;
  logout: () => Promise<void>;
  isAuthenticated: boolean;
  hasRole: (roles: Role[]) => boolean;
  loading: boolean;
  isInitialized: boolean;
  getToken: () => string | null;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [accessToken, setAccessToken] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [isInitialized, setIsInitialized] = useState(false); // Added
  const router = useRouter();

  const isAuthenticated = !!user && !!accessToken;

  const decodeAccessToken = (token: string | null): User | null => {
    if (!token) {
      return null;
    }
    try {
      const parts = token.split(".");
      if (parts.length !== 3) {
        console.error("Invalid access token format: token does not have 3 parts.");
        return null;
      }
      const payloadBase64 = parts[1];
      if (!payloadBase64) {
        console.error("Invalid access token format: missing payload.");
        return null;
      }
      const decodedPayload = JSON.parse(atob(payloadBase64));
      return {
        id: decodedPayload.userId,
        name: decodedPayload.name || "",
        email: decodedPayload.email,
        role: decodedPayload.role,
        createdAt: decodedPayload.createdAt || new Date().toISOString(),
        updatedAt: decodedPayload.updatedAt || new Date().toISOString(),
      };
    } catch (error) {
      console.error("Failed to decode access token:", error);
      return null;
    }
  };

  const refreshAccessToken = useCallback(async () => {
    try {
      const response = await fetch(`${getBaseUrl()}/api/auth/refresh`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
      });

      if (response.ok) {
        const data = await response.json();
        
        setAccessToken(data.data.accessToken);
        localStorage.setItem("accessToken", data.data.accessToken);
        const decodedUser = decodeAccessToken(data.data.accessToken);
        if (decodedUser) {
          setUser(decodedUser);
          return true;
        } else {
          console.error("Refreshed token is malformed.");
          setAccessToken(null);
          setUser(null);
          localStorage.removeItem("accessToken");
          return false;
        }
      } else {
        console.error("Failed to refresh token");
        setAccessToken(null);
        setUser(null);
        localStorage.removeItem("accessToken");
        return false;
      }
    } catch (error) {
      console.error("Error refreshing token:", error);
      setAccessToken(null);
      setUser(null);
      localStorage.removeItem("accessToken");
      return false;
    }
  }, []); 

  useEffect(() => {
    const initializeAuth = async () => {
      const storedAccessToken = localStorage.getItem("accessToken");
      console.log("initializeAuth: Starting. Stored token:", storedAccessToken);
      if (storedAccessToken) {
        setAccessToken(storedAccessToken);
        const decodedUser = decodeAccessToken(storedAccessToken);
        if (decodedUser) {
          if (!localStorage.getItem("userId") || !localStorage.getItem("userRole")) {
            localStorage.setItem("userId", decodedUser.id);
            localStorage.setItem("userRole", decodedUser.role);
          }
          setUser(decodedUser);
          console.log("initializeAuth: Decoded user, setting state:", decodedUser);
        } else {
          console.error("initializeAuth: Decoded user is null, attempting refresh.");
          localStorage.removeItem("accessToken");
          localStorage.removeItem("userId");
          localStorage.removeItem("userRole");
          await refreshAccessToken();
        }
      } else {
        console.log("initializeAuth: No stored token. Not attempting refresh on load.");
        localStorage.removeItem("userId");
        localStorage.removeItem("userRole");
      }
      console.log("initializeAuth: Setting loading to false, initialized to true.");
      setLoading(false);
      setIsInitialized(true);
    };

    initializeAuth();
    console.log("AuthContext useEffect initializeAuth triggered.");
  }, [refreshAccessToken]);

  useEffect(() => {
    // Only run on client-side
    if (typeof window === 'undefined') return;

    const handleRouteChange = () => {
      const currentPath = window.location.pathname;
      console.log("Route Protection: isInitialized:", isInitialized, "loading:", loading, "isAuthenticated:", isAuthenticated, "user:", user?.email, "currentPath:", currentPath);
      
      if (!loading && isInitialized) {
        const isProtected = currentPath.startsWith("/dashboard");
        const isAuthPage = currentPath === "/login" || currentPath === "/register";

        if (isAuthenticated && isAuthPage) {
          console.log("Route Protection: Authenticated on auth page, redirecting to /dashboard");
          router.replace("/dashboard");
        } else if (!isAuthenticated && isProtected) {
          console.log("Route Protection: Unauthenticated on protected page, redirecting to /login");
          const loginUrl = new URL("/login", window.location.origin);
          loginUrl.searchParams.set("redirect", currentPath);
          router.replace(loginUrl.pathname + loginUrl.search);
        }
      }
    };

    // Initial check
    handleRouteChange();

    // Set up route change listener
    window.addEventListener('popstate', handleRouteChange);
    
    // Cleanup
    return () => {
      window.removeEventListener('popstate', handleRouteChange);
    };
  }, [isAuthenticated, loading, router, isInitialized, user]);

  const login = async (email: string, password: string): Promise<boolean> => {
    setLoading(true);
    try {
      const response = await fetch(`${getBaseUrl()}/api/auth/login`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ email, password }),
      });

      const data = await response.json();

      if (response.ok) {
        const { accessToken } = data.data;
        setAccessToken(accessToken);
        localStorage.setItem("accessToken", accessToken);
        
        const decodedUser = decodeAccessToken(accessToken);
        if (decodedUser) {
          localStorage.setItem("userId", decodedUser.id);
          localStorage.setItem("userRole", decodedUser.role);
          
          setUser(decodedUser);
          setLoading(false);
          return true;
        } else {
          console.error("Login failed: malformed access token received. Clearing state.");
          localStorage.removeItem("accessToken");
          localStorage.removeItem("userId");
          localStorage.removeItem("userRole");
          setAccessToken(null);
          setUser(null);
          setLoading(false);
          return false;
        }
      } else {
        console.error("Login failed:", data.message);
        localStorage.removeItem("accessToken");
        setAccessToken(null);
        setUser(null);
        setLoading(false);
        return false;
      }
    } catch (error) {
      console.error("Login error in catch block:", error);
      localStorage.removeItem("accessToken");
      setAccessToken(null);
      setUser(null);
      setLoading(false);
      return false;
    }
  };

  const logout = async () => {
    try {
      await fetch(`${getBaseUrl()}/api/auth/logout`, {
        method: "POST",
        credentials: "include",
      });
    } catch (error) {
      console.error("Logout error:", error);
    } finally {
      setAccessToken(null);
      setUser(null);
      localStorage.removeItem("accessToken");
      localStorage.removeItem("userId");
      localStorage.removeItem("userRole");
      router.push("/login");
    }
  };

  const hasRole = useCallback((roles: Role[]): boolean => {
    if (!user) return false;
    return roles.includes(user.role);
  }, [user]);

  const getToken = useCallback((): string | null => {
    return accessToken;
  }, [accessToken]);

  const value = {
    user,
    accessToken,
    login,
    logout,
    isAuthenticated,
    hasRole,
    loading,
    isInitialized,
    getToken,
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}

