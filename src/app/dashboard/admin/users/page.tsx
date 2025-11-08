"use client";

import { useEffect, useState } from "react";
import { useAuth } from "@/context/AuthContext";
import DashboardLayout from "@/components/dashboard-layout";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import CreateUserModal from "@/components/CreateUserModal";
import EditUserModal from "@/components/EditUserModal";
import { LoadingSpinner } from "@/components/ui/loading-spinner";

interface User {
  id: string;
  name: string;
  email: string;
  role: "Admin" | "Organizer" | "Customer";
  createdAt: string;
}

export default function AdminUsersPage() {
  const { user, hasRole } = useAuth();
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [createModalOpen, setCreateModalOpen] = useState(false);
  const [editingUser, setEditingUser] = useState<User | null>(null);

  const fetchUsers = async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem("accessToken");
      const response = await fetch("/api/users", {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });
      
      if (response.ok) {
        const data = await response.json();
        setUsers(data.data);
      } else {
        console.error("Failed to fetch users");
      }
    } catch (error) {
      console.error("Error fetching users:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (user && hasRole(["Admin"])) {
      fetchUsers();
    }
  }, [user, hasRole]);

  const deleteUser = async (userId: string, userName: string) => {
    if (!confirm(`Are you sure you want to delete user "${userName}"? This action cannot be undone.`)) {
      return;
    }

    try {
      const token = localStorage.getItem("accessToken");
      const response = await fetch(`/api/users/${userId}`, {
        method: "DELETE",
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (response.ok) {
        fetchUsers();
      } else {
        const data = await response.json();
        alert(`Failed to delete user: ${data.message}`);
      }
    } catch (error) {
      console.error("Error deleting user:", error);
      alert("An error occurred while deleting the user");
    }
  };

  const getRoleBadgeClasses = (role: string) => {
    switch (role) {
      case "Admin":
        return "bg-red-100 text-red-800 border border-red-200";
      case "Organizer":
        return "bg-blue-100 text-blue-800 border border-blue-200";
      case "Customer":
        return "bg-green-100 text-green-800 border border-green-200";
      default:
        return "bg-gray-100 text-gray-800 border border-gray-200";
    }
  };

  if (!user || !hasRole(["Admin"])) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center min-h-screen-minus-header">
          <p>Access denied. Admin privileges required.</p>
        </div>
      </DashboardLayout>
    );
  }

  if (loading) {
    return (
      <DashboardLayout>
        <div className="flex flex-col items-center justify-center min-h-[60vh]">
          <div className="mb-4">
            <LoadingSpinner size="md" />
          </div>
          <p className="text-muted-foreground">Loading users...</p>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <h1 className="text-3xl font-bold">Users Management</h1>
          <Button onClick={() => setCreateModalOpen(true)}>Create New User</Button>
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-8">
            <p>Loading users...</p>
          </div>
        ) : (
          <div className="grid gap-4">
            {users.length === 0 ? (
              <Card>
                <CardContent className="flex items-center justify-center py-8">
                  <p className="text-muted-foreground">No users found.</p>
                </CardContent>
              </Card>
            ) : (
              users.map((userData) => (
                <Card key={userData.id}>
                  <CardHeader>
                    <div className="flex items-center justify-between">
                      <div>
                        <CardTitle>{userData.name}</CardTitle>
                        <CardDescription>{userData.email}</CardDescription>
                      </div>
                      <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold ${getRoleBadgeClasses(userData.role)}`}>
                        {userData.role}
                      </span>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <p className="text-sm text-muted-foreground mb-4">
                      <strong>Joined:</strong> {new Date(userData.createdAt).toLocaleDateString()}
                    </p>
                    <div className="flex gap-2">
                      <Button 
                        variant="outline" 
                        size="sm"
                        onClick={() => setEditingUser(userData)}
                      >
                        Edit
                      </Button>
                      <Button 
                        variant="destructive" 
                        size="sm"
                        onClick={() => deleteUser(userData.id, userData.name)}
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

      <CreateUserModal
        open={createModalOpen}
        onOpenChange={setCreateModalOpen}
        onUserCreated={fetchUsers}
      />
      
      <EditUserModal
        open={!!editingUser}
        onOpenChange={(open) => !open && setEditingUser(null)}
        user={editingUser}
        onUserUpdated={() => {
          fetchUsers();
          setEditingUser(null);
        }}
      />
    </DashboardLayout>
  );
}
