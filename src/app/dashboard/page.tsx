"use client"

import { useEffect, useState } from "react"
import { translations } from "../../../public/locales/translations"
import Cookies from "js-cookie"
import { useRouter } from "next/navigation"
import { handleError } from "@/utils/errorHandler"
import {
  Activity,
  BarChart3,
  Calendar,
  Clock,
  Database,
  FileText,
  LayoutDashboard,
  Settings,
  Users,
} from "lucide-react"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Progress } from "@/components/ui/progress"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { Skeleton } from "@/components/ui/skeleton"
import { CartesianGrid, Line, LineChart, ResponsiveContainer, XAxis, YAxis } from "recharts"
import { ChartContainer, ChartTooltip, ChartTooltipContent } from "@/components/ui/chart"

export default function DashboardPage() {
  const [t, setT] = useState(translations.en)
  const [error, setError] = useState("")
  const [loading, setLoading] = useState(true)
  const [dbStatus, setDbStatus] = useState({
    masterDbConnected: false,
    userDbConnected: false,
    pageDbConnected: false,
  })
  const router = useRouter()

  // Mock data for charts and stats
  const activityData = [
    { day: "Mon", visits: 45, engagement: 30 },
    { day: "Tue", visits: 52, engagement: 42 },
    { day: "Wed", visits: 48, engagement: 35 },
    { day: "Thu", visits: 61, engagement: 55 },
    { day: "Fri", visits: 55, engagement: 40 },
    { day: "Sat", visits: 33, engagement: 22 },
    { day: "Sun", visits: 40, engagement: 30 },
  ]

  const stats = {
    totalUsers: 1248,
    activeUsers: 815,
    totalPages: 324,
    completionRate: 78,
    lastUpdated: new Date().toLocaleString(),
  }

  useEffect(() => {
    const langFromCookie = Cookies.get("selectedLanguage") || "en"
    setT(translations[langFromCookie as keyof typeof translations])

    const message = Cookies.get("message")
    if (message) {
      handleError(null, message)
      Cookies.remove("message")
    }
  }, [])

  const backendUrl = process.env.NEXT_PUBLIC_BACKEND_URL || "http://localhost:3000"

  const clearAllCookies = async () => {
    try {
      const response = await fetch(`${backendUrl}/api/clear-cookies`, {
        method: "POST",
      })
      if (!response.ok) {
        console.error("Failed to clear cookies")
      }
    } catch (error) {
      console.error("Error clearing cookies:", error)
    }
  }

  useEffect(() => {
    const checkDbAndRedirect = async () => {
      try {
        setLoading(true)
        const apiUrl = backendUrl === 'http://localhost:3000' ? '/api/verify-connection' : '/api/api-sync';
        const response = await fetch(`http://localhost:3000${apiUrl}`);

        if (!response.ok) {
          const errorText = await response.text()
          throw new Error(`Failed to fetch database connection status: ${errorText}`)
        }

        const data = await response.json()
        setDbStatus(data)

        if (!data.masterDbConnected || !data.userDbConnected || !data.pageDbConnected) {
          handleError(null, "Database Connection not Established")
          await clearAllCookies()
          router.push("/language")
        }
      } catch (error) {
        handleError(error, "Error checking database connections")
        await clearAllCookies()
        router.push("/language")
      } finally {
        setLoading(false)
      }
    }

    checkDbAndRedirect()
  }, [router, backendUrl])

  if (loading) {
    return <DashboardSkeleton />
  }

  return (
    <div className="flex min-h-screen bg-background ">
      {/* Main Content */}
      <div className="flex-1 w-auto overflow-hidden">
        <div className="flex justify-between items-center z-10 bg-background border-b border-border p-4">
          <h1 className="text-2xl font-bold">{t.dashboard.welcome}</h1>
          <div className="flex items-center gap-4">
            <Button variant="outline" size="sm" className="hidden md:flex gap-2">
              <Clock className="h-4 w-4" />
              {new Date().toLocaleDateString()}
            </Button>
            <Button variant="outline" size="icon" className="md:hidden">
              <LayoutDashboard className="h-4 w-4" />
            </Button>
          </div>
        </div>

        <main className="p-4 md:p-6">
          {error && (
            <Alert variant="destructive" className="mb-6">
              <AlertTitle>Error</AlertTitle>
              <AlertDescription dangerouslySetInnerHTML={{ __html: error }} />
            </Alert>
          )}

          <div className="mb-6">
            <p className="text-muted-foreground">{t.dashboard.selectOption}</p>
          </div>

          <Tabs defaultValue="overview" className="mb-8">
            <TabsList>
              <TabsTrigger value="overview">Overview</TabsTrigger>
              <TabsTrigger value="analytics">Analytics</TabsTrigger>
              <TabsTrigger value="reports">Reports</TabsTrigger>
            </TabsList>
            <TabsContent value="overview" className="space-y-6">
              {/* Stats Cards Grid */}
              <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-4">
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm font-medium">Total Users</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold">{stats.totalUsers.toLocaleString()}</div>
                    <p className="text-xs text-muted-foreground mt-1">+12% from last month</p>
                  </CardContent>
                </Card>
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm font-medium">Active Users</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold">{stats.activeUsers.toLocaleString()}</div>
                    <p className="text-xs text-muted-foreground mt-1">
                      {Math.round((stats.activeUsers / stats.totalUsers) * 100)}% of total users
                    </p>
                  </CardContent>
                </Card>
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm font-medium">Total Pages</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold">{stats.totalPages.toLocaleString()}</div>
                    <p className="text-xs text-muted-foreground mt-1">+8 new pages today</p>
                  </CardContent>
                </Card>
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm font-medium">Completion Rate</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold">{stats.completionRate}%</div>
                    <Progress value={stats.completionRate} className="h-2 mt-2" />
                  </CardContent>
                </Card>
              </div>

              {/* Activity Chart */}
              <Card>
                <CardHeader>
                  <CardTitle>Weekly Activity</CardTitle>
                  <CardDescription>User visits and engagement over the past week</CardDescription>
                </CardHeader>
                <CardContent className="pt-2">
                  <div className="h-auto">
                    <ChartContainer
                      config={{
                        visits: {
                          label: "Visits",
                          color: "hsl(var(--chart-1))",
                        },
                        engagement: {
                          label: "Engagement",
                          color: "hsl(var(--chart-2))",
                        },
                      }}
                    >
                      <ResponsiveContainer width="100%" height="100%">
                        <LineChart data={activityData} margin={{ top: 5, right: 10, left: 10, bottom: 0 }}>
                          <XAxis dataKey="day" tickLine={false} axisLine={false} tick={{ fontSize: 12 }} />
                          <YAxis tickLine={false} axisLine={false} tick={{ fontSize: 12 }} width={30} />
                          <CartesianGrid strokeDasharray="3 3" vertical={false} />
                          <ChartTooltip content={<ChartTooltipContent />} />
                          <Line
                            type="monotone"
                            dataKey="visits"
                            stroke="hsl(var(--chart-1))"
                            strokeWidth={2}
                            dot={{ r: 4 }}
                            activeDot={{ r: 6 }}
                          />
                          <Line
                            type="monotone"
                            dataKey="engagement"
                            stroke="hsl(var(--chart-2))"
                            strokeWidth={2}
                            dot={{ r: 4 }}
                            activeDot={{ r: 6 }}
                          />
                        </LineChart>
                      </ResponsiveContainer>
                    </ChartContainer>
                  </div>
                </CardContent>
                <CardFooter className="border-t pt-4 text-xs text-muted-foreground">
                  Last updated: {stats.lastUpdated}
                </CardFooter>
              </Card>

              {/* Recent Activity and Quick Actions */}
              <div className="grid md:grid-cols-2 gap-6">
                <Card>
                  <CardHeader>
                    <CardTitle>Recent Activity</CardTitle>
                    <CardDescription>Latest user actions</CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    {[1, 2, 3, 4].map((_, i) => (
                      <div key={i} className="flex items-start gap-4 pb-4 border-b last:border-0 last:pb-0">
                        <div className="bg-primary/10 p-2 rounded-full">
                          <Activity className="h-4 w-4 text-primary" />
                        </div>
                        <div>
                          <p className="text-sm font-medium">User updated their profile</p>
                          <p className="text-xs text-muted-foreground">2 hours ago</p>
                        </div>
                      </div>
                    ))}
                  </CardContent>
                  <CardFooter>
                    <Button variant="ghost" size="sm" className="ml-auto">
                      View all activity
                    </Button>
                  </CardFooter>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle>Quick Actions</CardTitle>
                    <CardDescription>Frequently used tools</CardDescription>
                  </CardHeader>
                  <CardContent className="grid grid-cols-2 gap-4">
                    {[
                      { icon: Users, label: "Manage Users" },
                      { icon: FileText, label: "Create Page" },
                      { icon: BarChart3, label: "View Reports" },
                      { icon: Settings, label: "System Settings" },
                    ].map((action, i) => (
                      <Button key={i} variant="outline" className="h-24 flex flex-col gap-2">
                        <action.icon className="h-6 w-6" />
                        <span>{action.label}</span>
                      </Button>
                    ))}
                  </CardContent>
                </Card>
              </div>
            </TabsContent>

            <TabsContent value="analytics">
              <Card>
                <CardHeader>
                  <CardTitle>Analytics Dashboard</CardTitle>
                  <CardDescription>Detailed metrics and performance data</CardDescription>
                </CardHeader>
                <CardContent>
                  <p className="text-muted-foreground">Analytics content will be displayed here.</p>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="reports">
              <Card>
                <CardHeader>
                  <CardTitle>Reports</CardTitle>
                  <CardDescription>Generate and view system reports</CardDescription>
                </CardHeader>
                <CardContent>
                  <p className="text-muted-foreground">Reports content will be displayed here.</p>
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </main>
        <footer className="border-t border-border p-4 text-xs text-muted-foreground flex justify-between items-center">
          <div className="flex gap-2">
            <div>
              <span>Master DB:</span>
              <span className={dbStatus.masterDbConnected ? "text-green-500" : "text-red-500"}>
                {dbStatus.masterDbConnected ? "Connected" : "Disconnected"}
              </span>
            </div>
            <div>
              <span>User DB:</span>
              <span className={dbStatus.userDbConnected ? "text-green-500" : "text-red-500"}>
                {dbStatus.userDbConnected ? "Connected" : "Disconnected"}
              </span>
            </div>
            <div>
              <span>Page DB:</span>
              <span className={dbStatus.pageDbConnected ? "text-green-500" : "text-red-500"}>
                {dbStatus.pageDbConnected ? "Connected" : "Disconnected"}
              </span>
            </div>
          </div>
          <div className="flex gap-2">
            <div>
              <span>V 1.0.0</span>
            </div>
            <div>
              <span>Powered By: </span>
              <a href="https://aviraltrendzpvtltd.com" className="text-blue-600">https://aviraltrendzpvtltd.com</a>
            </div>
          </div>
        </footer>
      </div>
    </div>
  )
}

function DashboardSkeleton() {
  return (
    <div className="flex min-h-screen bg-background">
      {/* Sidebar Skeleton */}
      <div className="hidden md:flex w-64 flex-col bg-card border-r border-border">
        <div className="p-4 border-b border-border">
          <Skeleton className="h-8 w-40" />
        </div>
        <div className="flex-1 p-4 space-y-2">
          {Array(6)
            .fill(0)
            .map((_, i) => (
              <Skeleton key={i} className="h-10 w-full" />
            ))}
        </div>
        <div className="p-4 border-t border-border">
          <Skeleton className="h-6 w-40 mb-4" />
          <div className="space-y-2">
            {Array(3)
              .fill(0)
              .map((_, i) => (
                <Skeleton key={i} className="h-4 w-full" />
              ))}
          </div>
        </div>
      </div>

      {/* Main Content Skeleton */}
      <div className="flex-1 overflow-auto">
        <header className="sticky top-0 z-10 bg-background border-b border-border p-4">
          <div className="flex justify-between items-center">
            <Skeleton className="h-8 w-48" />
            <Skeleton className="h-8 w-32" />
          </div>
        </header>

        <main className="p-4 md:p-6">
          <Skeleton className="h-6 w-full max-w-md mb-6" />

          <div className="mb-8">
            <Skeleton className="h-10 w-64 mb-4" />
          </div>

          {/* Stats Cards Skeleton */}
          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
            {Array(4)
              .fill(0)
              .map((_, i) => (
                <div key={i} className="bg-card border rounded-lg p-4">
                  <Skeleton className="h-5 w-24 mb-2" />
                  <Skeleton className="h-8 w-16 mb-1" />
                  <Skeleton className="h-4 w-32" />
                </div>
              ))}
          </div>

          {/* Chart Skeleton */}
          <div className="bg-card border rounded-lg p-4 mb-6">
            <Skeleton className="h-6 w-48 mb-2" />
            <Skeleton className="h-4 w-64 mb-4" />
            <Skeleton className="h-[300px] w-full" />
          </div>

          {/* Bottom Cards Skeleton */}
          <div className="grid md:grid-cols-2 gap-6">
            <div className="bg-card border rounded-lg p-4">
              <Skeleton className="h-6 w-40 mb-2" />
              <Skeleton className="h-4 w-56 mb-4" />
              {Array(4)
                .fill(0)
                .map((_, i) => (
                  <div key={i} className="flex gap-4 mb-4">
                    <Skeleton className="h-10 w-10 rounded-full" />
                    <div className="flex-1">
                      <Skeleton className="h-4 w-full mb-2" />
                      <Skeleton className="h-3 w-24" />
                    </div>
                  </div>
                ))}
            </div>
            <div className="bg-card border rounded-lg p-4">
              <Skeleton className="h-6 w-40 mb-2" />
              <Skeleton className="h-4 w-56 mb-4" />
              <div className="grid grid-cols-2 gap-4">
                {Array(4)
                  .fill(0)
                  .map((_, i) => (
                    <Skeleton key={i} className="h-24 w-full" />
                  ))}
              </div>
            </div>
          </div>
        </main>
      </div>
    </div>
  )
}

