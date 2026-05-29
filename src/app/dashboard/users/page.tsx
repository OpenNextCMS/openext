'use client';

import { useState, useEffect, useCallback } from 'react';
import type React from 'react';
import {
  PlusCircle,
  Loader2,
  UserPlus,
  Users,
  Search,
  RefreshCw,
  CheckCircle,
  XCircle,
  Edit,
  UserCog,
} from 'lucide-react';
import { toast } from 'sonner';

import { Tabs, TabsContent } from '@/components/ui/tabs';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';

interface UserData {
  _id: string;
  username: string;
  email: string;
  password: string;
  role: string;
  phoneNumber: string;
  active: boolean;
}

interface Role {
  name: string;
  value: number;
}

export default function UserManagementDashboard() {
  // Add User Form State
  const [userData, setUserData] = useState<UserData>({
    _id: '',
    username: '',
    email: '',
    password: '',
    role: '',
    phoneNumber: '',
    active: false,
  });

  // User List State
  const [users, setUsers] = useState<UserData[]>([]);
  const [roles, setRoles] = useState<Role[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [selectedUser, setSelectedUser] = useState<UserData | null>(null);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [editForm, setEditForm] = useState({
    username: '',
    email: '',
    phoneNumber: '',
    role: 0,
  });
  const [activeTab, setActiveTab] = useState('user-list');
  const [filteredUsers, setFilteredUsers] = useState<UserData[]>([]);

  const backendUrl = process.env.NEXT_PUBLIC_BACKEND_URL || '';

  // Fetch roles for both components
  useEffect(() => {
    const fetchRoles = async () => {
      setIsLoading(true);
      try {
        const res = await fetch(`${backendUrl}/api/get-role`, { credentials: 'include' });
        if (res.ok) {
          const data = await res.json();
          setRoles(data.roles || []);
        }
      } catch (error) {
        console.error('Failed to fetch roles:', error);
        toast.error('Failed to load roles');
      } finally {
        setIsLoading(false);
      }
    };
    fetchRoles();
  }, [backendUrl]);

  const fetchUsers = useCallback(async () => {
    setIsLoading(true);
    try {
      const response = await fetch(`${backendUrl}/api/sub-users/get-users`);
      if (!response.ok) throw new Error('Failed to fetch users');
      const data = await response.json();
      setUsers(data.users || []);
      setFilteredUsers(data.users || []);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch users');
      toast.error('Failed to load users');
    } finally {
      setIsLoading(false);
    }
  }, [backendUrl]); // Depend only on `backendUrl`

  useEffect(() => {
    fetchUsers();
  }, [fetchUsers]);

  // Filter users based on search term
  useEffect(() => {
    if (searchTerm.trim() === '') {
      setFilteredUsers(users);
    } else {
      const filtered = users.filter(
        (user) =>
          user.username.toLowerCase().includes(searchTerm.toLowerCase()) ||
          user.email.toLowerCase().includes(searchTerm.toLowerCase())
      );
      setFilteredUsers(filtered);
    }
  }, [searchTerm, users]);

  // Add User Form Handlers
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setUserData((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    try {
      const { _id, ...dataToSubmit } = userData;
      console.log(_id);
      const res = await fetch(`${backendUrl}/api/sub-users/add-users`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(dataToSubmit),
      });
      if (res.ok) {
        await res.json();
        setUserData({
          _id: '',
          username: '',
          email: '',
          password: '',
          role: '',
          phoneNumber: '',
          active: false,
        });
        toast.success('User added successfully');
        // Switch to user list tab and refresh the list
        setActiveTab('user-list');
        fetchUsers();
      } else {
        console.error('Failed to add user');
        toast.error('Failed to add user');
      }
    } catch (error) {
      console.error('Error adding user:', error);
      toast.error('Error adding user');
    } finally {
      setIsSubmitting(false);
    }
  };

  // User List Handlers
  const handleUserUpdate = async (userId: string, updates: { role?: number; active?: boolean }) => {
    try {
      const response = await fetch(`${backendUrl}/api/sub-users/update-users/${userId}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(updates),
      });

      if (!response.ok) throw new Error('Failed to update user');

      toast.success('User updated successfully');
      fetchUsers();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update user');
      toast.error('Failed to update user');
    }
  };

  const openEditModal = (user: UserData) => {
    setSelectedUser(user);
    setEditForm({
      username: user.username,
      email: user.email,
      phoneNumber: user.phoneNumber || '',
      role: Number(user.role),
    });
    setIsEditModalOpen(true);
  };

  const handleEditSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedUser) return;

    try {
      const response = await fetch(`${backendUrl}/api/sub-users/update-users/${selectedUser._id}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(editForm),
      });

      if (!response.ok) throw new Error('Failed to update user');

      setIsEditModalOpen(false);
      toast.success('User updated successfully');
      fetchUsers();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update user');
      toast.error('Failed to update user');
    }
  };

  const getRoleBadgeStyles = (roleName: string) => {
    switch (roleName.toLowerCase()) {
      case 'admin':
        return 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-300';
      case 'editor':
        return 'bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-300';
      case 'user':
        return 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300';
      default:
        return 'bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-300';
    }
  };

  return (
    <div className="container mx-auto py-8 px-4">
      <div className="flex flex-col md:flex-row md:items-center md:justify-between mb-8">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">User Management</h1>
          <p className="text-muted-foreground mt-1">Add, view, and manage user accounts</p>
        </div>
        <div className="mt-4 md:mt-0">
          <Button
            variant={activeTab === 'add-user' ? 'default' : 'outline'}
            onClick={() => setActiveTab('add-user')}
            className="mr-2"
          >
            <UserPlus className="mr-2 h-4 w-4" />
            Add User
          </Button>
          <Button
            variant={activeTab === 'user-list' ? 'default' : 'outline'}
            onClick={() => setActiveTab('user-list')}
          >
            <Users className="mr-2 h-4 w-4" />
            User List
          </Button>
        </div>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsContent value="add-user" className="mt-0">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <UserPlus className="h-5 w-5 text-primary mr-2" />
                Add New User
              </CardTitle>
              <CardDescription>
                Create a new user account with specific role and permissions
              </CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="username">Username</Label>
                    <Input
                      id="username"
                      type="text"
                      name="username"
                      value={userData.username}
                      onChange={handleInputChange}
                      placeholder="johndoe"
                      required
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="phoneNumber">Phone Number</Label>
                    <Input
                      id="phoneNumber"
                      type="tel"
                      name="phoneNumber"
                      value={userData.phoneNumber}
                      onChange={handleInputChange}
                      placeholder="+1 (555) 123-4567"
                      required
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="email">Email</Label>
                    <Input
                      id="email"
                      type="email"
                      name="email"
                      value={userData.email}
                      onChange={handleInputChange}
                      placeholder="john.doe@example.com"
                      required
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="password">Password</Label>
                    <Input
                      id="password"
                      type="password"
                      name="password"
                      value={userData.password}
                      onChange={handleInputChange}
                      placeholder="••••••••"
                      required
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="role">Role</Label>
                    <Select
                      name="role"
                      value={userData.role}
                      onValueChange={(value) => setUserData((prev) => ({ ...prev, role: value }))}
                      disabled={isLoading}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select Role" />
                      </SelectTrigger>
                      <SelectContent>
                        {roles.map((role) => (
                          <SelectItem key={role.value} value={role.value.toString()}>
                            {role.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    {isLoading && (
                      <div className="flex items-center text-sm text-muted-foreground mt-1">
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Loading roles...
                      </div>
                    )}
                  </div>
                </div>

                <Button type="submit" className="w-full" disabled={isSubmitting}>
                  {isSubmitting ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Adding User...
                    </>
                  ) : (
                    <>
                      <PlusCircle className="mr-2 h-4 w-4" />
                      Add User
                    </>
                  )}
                </Button>
              </form>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="user-list" className="mt-0">
          <Card>
            <CardHeader>
              <div className="flex flex-col md:flex-row md:items-center md:justify-between">
                <div className="flex items-center">
                  <CardTitle className="flex items-center">
                    <Users className="h-5 w-5 text-primary mr-2" />
                    User List
                  </CardTitle>
                  <Badge variant="outline" className="ml-2">
                    {filteredUsers.length} users
                  </Badge>
                </div>
                <div className="flex items-center mt-4 md:mt-0 space-x-2">
                  <div className="relative">
                    <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                    <Input
                      type="search"
                      placeholder="Search users..."
                      className="pl-8 w-full md:w-[250px]"
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                    />
                  </div>
                  <Button variant="outline" size="icon" onClick={fetchUsers} title="Refresh">
                    <RefreshCw className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              {isLoading ? (
                <div className="flex justify-center items-center py-8">
                  <Loader2 className="h-8 w-8 animate-spin text-primary" />
                  <span className="ml-2 text-muted-foreground">Loading users...</span>
                </div>
              ) : error ? (
                <div className="bg-destructive/10 p-4 rounded-lg text-center">
                  <h3 className="text-destructive font-medium text-lg mb-2">Error loading users</h3>
                  <p className="text-destructive/90 mb-4">{error}</p>
                  <Button onClick={fetchUsers} variant="destructive">
                    <RefreshCw className="mr-2 h-4 w-4" />
                    Retry
                  </Button>
                </div>
              ) : (
                <div className="rounded-md border overflow-hidden">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>User</TableHead>
                        <TableHead>Contact</TableHead>
                        <TableHead>Role</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead className="text-right">Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {filteredUsers.length > 0 ? (
                        filteredUsers.map((user) => (
                          <TableRow key={user._id}>
                            <TableCell>
                              <div className="flex items-center gap-3">
                                <Avatar>
                                  <AvatarFallback className="bg-primary text-primary-foreground">
                                    {user.username.charAt(0).toUpperCase()}
                                  </AvatarFallback>
                                </Avatar>
                                <div>
                                  <div className="font-medium">{user.username}</div>
                                  <div className="text-sm text-muted-foreground">
                                    @{user.username}
                                  </div>
                                </div>
                              </div>
                            </TableCell>
                            <TableCell>
                              <div className="text-sm">{user.email}</div>
                              {user.phoneNumber && (
                                <div className="text-sm text-muted-foreground">
                                  {user.phoneNumber}
                                </div>
                              )}
                            </TableCell>
                            <TableCell>
                              <Badge
                                className={getRoleBadgeStyles(
                                  roles.find((role) => role.value === Number(user.role))?.name ||
                                    'user'
                                )}
                              >
                                {roles.find((role) => role.value === Number(user.role))?.name ||
                                  user.role}
                              </Badge>
                            </TableCell>
                            <TableCell>
                              <Badge variant={user.active ? 'default' : 'destructive'}>
                                {user.active ? (
                                  <span className="flex items-center">
                                    <CheckCircle className="mr-1 h-3 w-3" />
                                    Active
                                  </span>
                                ) : (
                                  <span className="flex items-center">
                                    <XCircle className="mr-1 h-3 w-3" />
                                    Inactive
                                  </span>
                                )}
                              </Badge>
                            </TableCell>
                            <TableCell className="text-right">
                              {user.role == '0' ? (
                                <div></div>
                              ) : (
                                <div className="flex justify-end gap-2">
                                  <Button
                                    onClick={() => openEditModal(user)}
                                    variant="outline"
                                    size="sm"
                                  >
                                    <Edit className="h-3.5 w-3.5 mr-1" />
                                    Edit
                                  </Button>
                                  <Button
                                    onClick={() =>
                                      handleUserUpdate(user._id, { active: !user.active })
                                    }
                                    variant={user.active ? 'destructive' : 'default'}
                                    size="sm"
                                  >
                                    {user.active ? (
                                      <>
                                        <XCircle className="h-3.5 w-3.5 mr-1" />
                                        Deactivate
                                      </>
                                    ) : (
                                      <>
                                        <CheckCircle className="h-3.5 w-3.5 mr-1" />
                                        Activate
                                      </>
                                    )}
                                  </Button>
                                </div>
                              )}
                            </TableCell>
                          </TableRow>
                        ))
                      ) : (
                        <TableRow>
                          <TableCell colSpan={5} className="h-24 text-center">
                            <div className="flex flex-col items-center justify-center text-muted-foreground">
                              <UserCog className="h-8 w-8 mb-2" />
                              {searchTerm ? (
                                <>
                                  <p>No users match your search</p>
                                  <Button
                                    variant="link"
                                    onClick={() => setSearchTerm('')}
                                    className="h-auto p-0 mt-1"
                                  >
                                    Clear search
                                  </Button>
                                </>
                              ) : (
                                <p>No users found</p>
                              )}
                            </div>
                          </TableCell>
                        </TableRow>
                      )}
                    </TableBody>
                  </Table>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      <Dialog open={isEditModalOpen} onOpenChange={setIsEditModalOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center">
              <Edit className="h-5 w-5 mr-2 text-primary" />
              Edit User
            </DialogTitle>
          </DialogHeader>
          <form onSubmit={handleEditSubmit}>
            <div className="space-y-4 py-2">
              <div className="space-y-2">
                <Label htmlFor="edit-username">Username</Label>
                <Input
                  id="edit-username"
                  value={editForm.username}
                  onChange={(e) => setEditForm({ ...editForm, username: e.target.value })}
                  disabled
                />
                <p className="text-xs text-muted-foreground">Username cannot be changed</p>
              </div>
              <div className="space-y-2">
                <Label htmlFor="edit-email">Email</Label>
                <Input
                  id="edit-email"
                  type="email"
                  value={editForm.email}
                  onChange={(e) => setEditForm({ ...editForm, email: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="edit-phone">Phone Number</Label>
                <Input
                  id="edit-phone"
                  type="tel"
                  value={editForm.phoneNumber}
                  onChange={(e) => setEditForm({ ...editForm, phoneNumber: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="edit-role">Role</Label>
                <Select
                  value={editForm.role.toString()}
                  onValueChange={(value) => setEditForm({ ...editForm, role: Number(value) })}
                >
                  <SelectTrigger id="edit-role">
                    <SelectValue placeholder="Select Role" />
                  </SelectTrigger>
                  <SelectContent>
                    {roles.map((role) => (
                      <SelectItem key={role.value} value={role.value.toString()}>
                        {role.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <DialogFooter className="mt-4">
              <Button type="button" variant="outline" onClick={() => setIsEditModalOpen(false)}>
                Cancel
              </Button>
              <Button type="submit">Save Changes</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
