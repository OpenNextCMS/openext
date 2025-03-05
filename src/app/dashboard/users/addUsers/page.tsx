'use client'

import { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { User, Mail, Lock, Phone } from "lucide-react";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Separator } from "@/components/ui/separator";
import { toast } from "sonner";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";

const userSchema = z.object({
  username: z.string().min(2).max(50),
  name: z.string().min(2).max(50),
  email: z.string().email(),
  password: z.string().min(8).optional().or(z.literal("")),
  role: z.string().min(1),
  phoneNumber: z.string().min(10).max(15)
});

export default function UserManagement() {
  const {
    register,
    handleSubmit,
    formState: { errors, isDirty },
    setValue
  } = useForm({
    resolver: zodResolver(userSchema),
    defaultValues: { username: "", name: "", email: "", password: "", role: "", phoneNumber: "" }
  });

  const [users, setUsers] = useState([]);
  const [roles, setRoles] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const backendUrl = process.env.NEXT_PUBLIC_BACKEND_URL || "http://localhost:3000";

  useEffect(() => {
    const fetchRoles = async () => {
      try {
        const res = await fetch(`${backendUrl}/api/get-role`);
        const data = await res.json();
        setRoles(data.roles || []);
      } catch (error) {
        toast.error("Error fetching roles");
      }
    };

    fetchRoles();
  }, [backendUrl]);

  const onSubmit = async (values) => {
    setIsLoading(true);
    try {
      const response = await fetch(`${backendUrl}/api/add-user`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(values)
      });
      const result = await response.json();
      if (result.success) {
        toast.success("User added successfully");
      } else {
        toast.error("Failed to add user");
      }
    } catch (error) {
      toast.error("Error saving user data");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)}>
      <Card>
        <CardHeader>
          <CardTitle>User Management</CardTitle>
          <CardDescription>Manage users and roles</CardDescription>
        </CardHeader>
        <CardContent>
          <Tabs defaultValue="userInfo">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="userInfo">User Info</TabsTrigger>
              <TabsTrigger value="roles">Roles</TabsTrigger>
            </TabsList>
            <TabsContent value="userInfo" className="space-y-6">
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="username">Username</Label>
                  <Input id="username" {...register("username")} />
                  {errors.username && <p className="text-sm text-destructive">{errors.username.message}</p>}
                </div>
                <div className="space-y-2">
                  <Label htmlFor="name">Name</Label>
                  <Input id="name" {...register("name")} />
                  {errors.name && <p className="text-sm text-destructive">{errors.name.message}</p>}
                </div>
                <div className="space-y-2">
                  <Label htmlFor="email">Email</Label>
                  <Input id="email" {...register("email")} />
                  {errors.email && <p className="text-sm text-destructive">{errors.email.message}</p>}
                </div>
                <div className="space-y-2">
                  <Label htmlFor="password">Password</Label>
                  <Input id="password" type="password" {...register("password")} />
                  {errors.password && <p className="text-sm text-destructive">{errors.password.message}</p>}
                </div>
              </div>
            </TabsContent>
            <TabsContent value="roles" className="space-y-6">
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="role">Role</Label>
                  <Input id="role" {...register("role")} />
                  {errors.role && <p className="text-sm text-destructive">{errors.role.message}</p>}
                </div>
                <div className="space-y-2">
                  <Label htmlFor="phoneNumber">Phone Number</Label>
                  <Input id="phoneNumber" {...register("phoneNumber")} />
                  {errors.phoneNumber && <p className="text-sm text-destructive">{errors.phoneNumber.message}</p>}
                </div>
              </div>
            </TabsContent>
          </Tabs>
        </CardContent>
        <Separator className="my-4" />
        <CardFooter className="flex justify-between">
          <Alert variant="default" className="w-2/3">
            <User className="h-4 w-4" />
            <AlertTitle>User Management</AlertTitle>
            <AlertDescription>Manage users and roles effectively.</AlertDescription>
          </Alert>
          <Button type="submit" disabled={!isDirty || isLoading}>
            {isLoading ? "Saving..." : "Save User"}
          </Button>
        </CardFooter>
      </Card>
    </form>
  );
}
