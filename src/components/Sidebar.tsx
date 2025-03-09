'use client';

const backendUrl = process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:3000';

import { useRouter, usePathname } from "next/navigation"
import { useEffect, useState } from "react"
import {
  LayoutDashboard,
  FileText,
  LogOut,
  ChevronDown,
  List,
  PlusCircle,
  Palette,
  User,
  Settings,
  Menu,
  X,
} from "lucide-react"
import { handleSuccess } from "@/utils/successHandler"
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible"
import { Button } from "@/components/ui/button"
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip"
import { cn } from "@/lib/utils"

const navItems = [
  {
    label: "Dashboard",
    icon: LayoutDashboard,
    path: "/dashboard",
    links: [],
  },
  {
    label: "Pages",
    icon: FileText,
    links: [
      { label: "All Pages", icon: List, path: "/pages" },
      { label: "Add Pages", icon: PlusCircle, path: "/GrapeJSEditor" },
    ],
  },
  {
    label: "Themes",
    icon: Palette,
    links: [{ label: "Add Themes", icon: PlusCircle, path: "/dashboard/themes" }],
  },
  {
    label: "User",
    icon: User,
    links: [
      { label: "Add User", icon: PlusCircle, path: "/dashboard/users/addUsers" },
      { label: "Users", icon: List, path: "/dashboard/users/allUsers" },
    ],
  },
]

export default function Sidebar() {
  const [isCollapsed, setIsCollapsed] = useState(false)
  const [openDropdown, setOpenDropdown] = useState<string | null>(null)
  const [isMobile, setIsMobile] = useState(false)
  const [isMobileOpen, setIsMobileOpen] = useState(false)
  const router = useRouter()
  const pathname = usePathname()

  useEffect(() => {
    // Check if we're on mobile and set initial state
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 1024)
      if (window.innerWidth < 1024) {
        setIsCollapsed(true)
      }
    }

    checkMobile()
    window.addEventListener("resize", checkMobile)

    // Initialize open dropdown based on current path
    const currentSection = navItems.find(
      (item) => item.links.some((link) => pathname === link.path) || pathname === item.path,
    )
    if (currentSection) {
      setOpenDropdown(currentSection.label)
    }

    return () => window.removeEventListener("resize", checkMobile)
  }, [pathname])

  const toggleDropdown = (label: string) => {
    setOpenDropdown(openDropdown === label ? null : label)
  }

  const handleLogout = async () => {
    try {
      // Call API to remove the token
      const response = await fetch(`${backendUrl}/api/logout`, { method: 'GET' });

      if (response.ok) {
        handleSuccess(true, null, "Logout Successful")
        router.push("/login")
      } else {
        console.error("Logout failed")
      }
    } catch (error) {
      console.error("Logout error:", error)
    }
  }

  const isActive = (path: string) => pathname === path
  const isSectionActive = (label: string) => {
    const section = navItems.find((item) => item.label === label)
    return section?.path === pathname || section?.links.some((link) => link.path === pathname)
  }

  // Mobile overlay for the sidebar
  const MobileOverlay = () => (
    <>
      {isMobile && isMobileOpen && (
        <div className="fixed inset-0 bg-black/50 z-40 lg:hidden" onClick={() => setIsMobileOpen(false)} />
      )}
    </>
  )

  return (
    <TooltipProvider>
      <MobileOverlay />

      {/* Mobile Toggle Button */}
      <Button
        variant="outline"
        size="icon"
        className="fixed top-4 left-4 z-50 lg:hidden"
        onClick={() => setIsMobileOpen(!isMobileOpen)}
      >
        {isMobileOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
      </Button>

      <div
        className={cn(
          "h-screen border-r bg-card fixed top-0 left-0 z-50 transition-all duration-300 ease-in-out",
          isCollapsed ? "w-[70px]" : "w-64",
          isMobile ? (isMobileOpen ? "translate-x-0" : "-translate-x-full") : "translate-x-0",
        )}
      >
        <div className="flex flex-col h-full">
          {/* Header */}
          <div className="p-4 flex items-center justify-between border-b">
            {!isCollapsed && (
              <h2
                className="text-lg font-bold text-foreground cursor-pointer truncate"
                onClick={() => router.push("/dashboard")}
              >
                Admin Dashboard
              </h2>
            )}
            {!isMobile && (
              <Button
                variant="ghost"
                size="icon"
                onClick={() => setIsCollapsed(!isCollapsed)}
                className="text-muted-foreground hover:text-foreground"
              >
                {isCollapsed ? <Menu className="h-4 w-4" /> : <X className="h-4 w-4" />}
              </Button>
            )}
          </div>

          {/* Navigation */}
          <nav className="flex-1 overflow-y-auto py-4 px-3">
            <div className="space-y-1">
              <TooltipProvider delayDuration={0}>
                {navItems.map((item) => (
                  <div key={item.label} className="mb-1">
                    {item.links.length > 0 ? (
                      <Collapsible
                        open={openDropdown === item.label && !isCollapsed}
                        onOpenChange={() => !isCollapsed && toggleDropdown(item.label)}
                      >
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <CollapsibleTrigger asChild>
                              <Button
                                variant={isSectionActive(item.label) ? "secondary" : "ghost"}
                                className={cn(
                                  "w-full justify-start",
                                  isCollapsed ? "px-2" : "px-3",
                                  isSectionActive(item.label) && "font-medium",
                                )}
                              >
                                <item.icon
                                  className={cn(
                                    "h-5 w-5",
                                    isCollapsed ? "mx-auto" : "mr-2",
                                    isSectionActive(item.label) ? "text-primary" : "text-muted-foreground",
                                  )}
                                />
                                {!isCollapsed && (
                                  <>
                                    <span className="flex-1 text-left">{item.label}</span>
                                    <ChevronDown
                                      className={cn(
                                        "h-4 w-4 transition-transform text-muted-foreground",
                                        openDropdown === item.label && "transform rotate-180",
                                      )}
                                    />
                                  </>
                                )}
                              </Button>
                            </CollapsibleTrigger>
                          </TooltipTrigger>
                          {isCollapsed && <TooltipContent side="right">{item.label}</TooltipContent>}
                        </Tooltip>

                        <CollapsibleContent className="pl-9 pr-2 py-1 space-y-1">
                          {item.links.map((link) => (
                            <Button
                              key={link.label}
                              variant={isActive(link.path) ? "secondary" : "ghost"}
                              size="sm"
                              className={cn("w-full justify-start h-9", isActive(link.path) && "font-medium")}
                              onClick={() => router.push(link.path)}
                            >
                              <link.icon
                                className={cn(
                                  "h-4 w-4 mr-2",
                                  isActive(link.path) ? "text-primary" : "text-muted-foreground",
                                )}
                              />
                              <span>{link.label}</span>
                            </Button>
                          ))}
                        </CollapsibleContent>
                      </Collapsible>
                    ) : (
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <Button
                            variant={isActive(item.path!) ? "secondary" : "ghost"}
                            className={cn(
                              "w-full justify-start",
                              isCollapsed ? "px-2" : "px-3",
                              isActive(item.path!) && "font-medium",
                            )}
                            onClick={() => router.push(item.path!)}
                          >
                            <item.icon
                              className={cn(
                                "h-5 w-5",
                                isCollapsed ? "mx-auto" : "mr-2",
                                isActive(item.path!) ? "text-primary" : "text-muted-foreground",
                              )}
                            />
                            {!isCollapsed && <span>{item.label}</span>}
                          </Button>
                        </TooltipTrigger>
                        {isCollapsed && <TooltipContent side="right">{item.label}</TooltipContent>}
                      </Tooltip>
                    )}
                  </div>
                ))}

                {/* Settings */}
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      variant={isActive("/dashboard/settings") ? "secondary" : "ghost"}
                      className={cn(
                        "w-full justify-start",
                        isCollapsed ? "px-2" : "px-3",
                        isActive("/dashboard/settings") && "font-medium",
                      )}
                      onClick={() => router.push("/dashboard/settings")}
                    >
                      <Settings
                        className={cn(
                          "h-5 w-5",
                          isCollapsed ? "mx-auto" : "mr-2",
                          isActive("/dashboard/settings") ? "text-primary" : "text-muted-foreground",
                        )}
                      />
                      {!isCollapsed && <span>Settings</span>}
                    </Button>
                  </TooltipTrigger>
                  {isCollapsed && <TooltipContent side="right">Settings</TooltipContent>}
                </Tooltip>
              </TooltipProvider>
            </div>
          </nav>

          {/* Footer with Logout */}
          <div className="p-4 border-t mt-auto">
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="ghost"
                  className={cn(
                    "w-full justify-start text-destructive hover:text-destructive hover:bg-destructive/10",
                    isCollapsed ? "px-2" : "px-3",
                  )}
                  onClick={handleLogout}
                >
                  <LogOut className={cn("h-5 w-5", isCollapsed ? "mx-auto" : "mr-2")} />
                  {!isCollapsed && <span className="font-medium">Logout</span>}
                </Button>
              </TooltipTrigger>
              {isCollapsed && <TooltipContent side="right">Logout</TooltipContent>}
            </Tooltip>
          </div>
        </div>
      </div>

      {/* Content margin to account for sidebar */}
      <div
        className={cn(
          "transition-all duration-300 ease-in-out",
          isCollapsed ? "lg:ml-[70px]" : "lg:ml-64",
          isMobile ? "ml-0" : "",
        )}
      />
    </TooltipProvider>
  )
}