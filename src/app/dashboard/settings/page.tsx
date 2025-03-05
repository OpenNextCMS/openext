"use client"

import type React from "react"

import { useState, useEffect } from "react"
import { useForm, Controller } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import * as z from "zod"
import { languageNames, translations } from "../../../../public/locales/translations"
import Cookies from "js-cookie"
import moment from "moment-timezone"
import { toast } from "sonner"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Button } from "@/components/ui/button"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Separator } from "@/components/ui/separator"
import { Switch } from "@/components/ui/switch"
import { AlertCircle, Check, Globe, Info, Upload } from "lucide-react"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"

const formSchema = z.object({
  siteTitle: z.string().min(1, "Site title is required"),
  tagline: z.string().optional(),
  siteIcon: z.string().optional(),
  language: z.string().min(2, "Language is required"),
  timeZone: z.string().min(2, "Time zone is required"),
  dateFormat: z.string().min(2, "Date format is required"),
  timeFormat: z.string().min(2, "Time format is required"),
  activeTheme: z.string().optional(),
  enableDarkMode: z.boolean().optional(),
})

const languages = Object.entries(languageNames).map(([code, name]) => ({
  value: code,
  label: name,
}))

const timeZones = moment.tz.names()

export default function SettingsPage() {
  const {
    control,
    register,
    handleSubmit,
    setValue,
    watch,
    formState: { errors, isDirty },
  } = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      siteTitle: "",
      tagline: "",
      siteIcon: "",
      language: "en",
      timeZone: "UTC",
      dateFormat: "MMMM D, YYYY",
      timeFormat: "h:mm a",
      activeTheme: "default",
      enableDarkMode: false,
    },
  })
  const siteIcon = watch("siteIcon")

  const [t, setT] = useState(translations.en)
  const [themes, setThemes] = useState<{ name: string; isActive: boolean }[]>([])
  const [now, setNow] = useState(new Date())
  const [isLoading, setIsLoading] = useState(false)

  useEffect(() => {
    const interval = setInterval(() => setNow(new Date()), 1000)
    return () => clearInterval(interval)
  }, [])

  useEffect(() => {
    const langFromCookie = Cookies.get("selectedLanguage") || "en"
    setT(translations[langFromCookie as keyof typeof translations])
  }, [])

  useEffect(() => {
    const backendUrl = process.env.NEXT_PUBLIC_BACKEND_URL || "http://localhost:3000"
    const fetchSettingsData = async () => {
      try {
        setIsLoading(true)
        const response = await fetch(`${backendUrl}/api/settings`)
        const result = await response.json()
        if (result.success && result.data.settings) {
          setValue("siteTitle", result.data.settings.siteTitle || "My Website")
          setValue("tagline", result.data.settings.tagline || "")
          setValue("siteIcon", result.data.settings.siteIcon || "")
          setValue("language", result.data.settings.language || "en")
          setValue("timeZone", result.data.settings.timeZone || "UTC")
          setValue("dateFormat", result.data.settings.dateFormat || "MMMM D, YYYY")
          setValue("timeFormat", result.data.settings.timeFormat || "h:mm a")
          setValue("enableDarkMode", result.data.settings.enableDarkMode || false)
          const settingsThemes = result.data.settings.themes || []
          const uniqueThemes = Array.from(new Set(settingsThemes.map((theme) => theme.name))).map(
            (name) => settingsThemes.find((theme) => theme.name === name) as { name: string; isActive: boolean },
          )
          uniqueThemes.sort((a, b) => (b.isActive ? 1 : 0) - (a.isActive ? 1 : 0))
          setThemes(uniqueThemes)
          if (uniqueThemes.length > 0 && uniqueThemes[0].isActive) {
            setValue("activeTheme", uniqueThemes[0].name)
          } else {
            setValue("activeTheme", "default")
          }
        }
      } catch (error) {
        console.error("Error fetching settings:", error)
        toast.error("Failed to load settings")
      } finally {
        setIsLoading(false)
      }
    }

    const storedLanguage = Cookies.get("selectedLanguage")
    if (storedLanguage) {
      setValue("language", storedLanguage)
    }

    fetchSettingsData()
  }, [setValue])

  const handleSiteIconChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const backendUrl = process.env.NEXT_PUBLIC_BACKEND_URL || "http://localhost:3000"
    const file = e.target.files?.[0]
    if (!file) return
    const formData = new FormData()
    formData.append("file", file)
    try {
      const res = await fetch(`${backendUrl}/api/siteicon`, {
        method: "POST",
        body: formData,
      })
      const result = await res.json()
      if (result.success && result.fileName) {
        setValue("siteIcon", result.fileName, { shouldDirty: true })
        toast.success("Site icon uploaded successfully")
      } else {
        toast.error("Failed to upload site icon")
      }
    } catch (error) {
      console.error("SiteIcon upload error:", error)
      toast.error("Site icon upload error")
    }
  }

  const dateFormats = [
    { label: moment(now).format("MMMM D, YYYY"), value: "MMMM D, YYYY" },
    { label: moment(now).format("YYYY-MM-DD"), value: "YYYY-MM-DD" },
    { label: moment(now).format("MM/DD/YYYY"), value: "MM/DD/YYYY" },
    { label: moment(now).format("DD/MM/YYYY"), value: "DD/MM/YYYY" },
  ]

  const timeFormats = [
    { label: moment(now).format("h:mm a"), value: "h:mm a" },
    { label: moment(now).format("h:mm A"), value: "h:mm A" },
    { label: moment(now).format("HH:mm"), value: "HH:mm" },
  ]

  const onSubmit = async (values: z.infer<typeof formSchema>) => {
    setIsLoading(true)
    const backendUrl = process.env.NEXT_PUBLIC_BACKEND_URL || "http://localhost:3000"

    try {
      const response = await fetch(`${backendUrl}/api/settings`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(values),
      })

      const result = await response.json()

      if (result.success) {
        Cookies.set("selectedLanguage", values.language, { expires: 7 })
        toast.success("Settings updated successfully")
        // Optionally reload or update state here
      } else {
        toast.error("Failed to save settings: " + result.message)
      }
    } catch (error) {
      console.error("Error saving settings:", error)
      toast.error("Error saving settings")
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)}>
      <Card>
        <CardHeader>
          <CardTitle>{t.profileSettings.title}</CardTitle>
          <CardDescription>{t.profileSettings.subtitle}</CardDescription>
        </CardHeader>
        <CardContent>
          <Tabs defaultValue="site-info">
            <TabsList className="grid w-full grid-cols-3">
              <TabsTrigger value="site-info">Site Information</TabsTrigger>
              <TabsTrigger value="localization">Localization</TabsTrigger>
              <TabsTrigger value="appearance">Appearance</TabsTrigger>
            </TabsList>
            <TabsContent value="site-info" className="space-y-6">
              <div className="space-y-4">
                <div>
                  <Label htmlFor="siteTitle">{t.profileSettings.siteTitle}</Label>
                  <Input
                    id="siteTitle"
                    {...register("siteTitle")}
                    placeholder={t.profileSettings.siteTitlePlaceholder}
                  />
                  {errors.siteTitle && <p className="text-sm text-destructive mt-1">{errors.siteTitle.message}</p>}
                </div>
                <div>
                  <Label htmlFor="tagline">{t.profileSettings.tagline}</Label>
                  <Input id="tagline" {...register("tagline")} placeholder={t.profileSettings.taglinePlaceholder} />
                </div>
                <div>
                  <Label>{t.profileSettings.siteIcon}</Label>
                  <div className="flex items-center space-x-4 mt-2">
                    <div className="w-16 h-16 border rounded-lg overflow-hidden flex items-center justify-center bg-secondary">
                      {siteIcon ? (
                        <img src={`/siteicon/${siteIcon}`} alt="Site Icon" className="w-full h-full object-cover" />
                      ) : (
                        <Globe className="text-muted-foreground" />
                      )}
                    </div>
                    <div>
                      <Input
                        id="site-icon-upload"
                        type="file"
                        onChange={handleSiteIconChange}
                        className="my-2"
                        accept="image/*"
                      />
                      <Label
                        htmlFor="site-icon-upload"
                        className="inline-flex items-center justify-center rounded-md text-sm font-medium ring-offset-background transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 bg-secondary text-secondary-foreground hover:bg-secondary/80 h-10 px-4 py-2 cursor-pointer"
                      >
                        <Upload className="mr-2 h-4 w-4" />
                        {siteIcon ? "Change Icon" : "Upload Icon"}
                      </Label>
                    </div>
                  </div>
                  <p className="text-sm text-muted-foreground mt-2">
                    Recommended size: 512×512 pixels. Supported formats: JPG, PNG, GIF (max 2MB)
                  </p>
                </div>
              </div>
            </TabsContent>
            <TabsContent value="localization" className="space-y-6">
              <div className="space-y-4">
                <div>
                  <Label htmlFor="language">{t.profileSettings.language}</Label>
                  <Controller
                    name="language"
                    control={control}
                    render={({ field }) => (
                      <Select onValueChange={field.onChange} value={field.value}>
                        <SelectTrigger>
                          <SelectValue placeholder="Select language" />
                        </SelectTrigger>
                        <SelectContent>
                          {languages.map((lang) => (
                            <SelectItem key={lang.value} value={lang.value}>
                              {lang.label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    )}
                  />
                </div>
                <div>
                  <Label htmlFor="timeZone">{t.profileSettings.timeZone}</Label>
                  <Controller
                    name="timeZone"
                    control={control}
                    render={({ field }) => (
                      <Select onValueChange={field.onChange} value={field.value}>
                        <SelectTrigger>
                          <SelectValue placeholder="Select time zone" />
                        </SelectTrigger>
                        <SelectContent>
                          {timeZones.map((zone) => (
                            <SelectItem key={zone} value={zone}>
                              {zone}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    )}
                  />
                </div>
                <div>
                  <Label htmlFor="dateFormat">{t.profileSettings.dateFormat}</Label>
                  <Controller
                    name="dateFormat"
                    control={control}
                    render={({ field }) => (
                      <Select onValueChange={field.onChange} value={field.value}>
                        <SelectTrigger>
                          <SelectValue placeholder="Select date format" />
                        </SelectTrigger>
                        <SelectContent>
                          {dateFormats.map((format) => (
                            <SelectItem key={format.value} value={format.value}>
                              {format.label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    )}
                  />
                </div>
                <div>
                  <Label htmlFor="timeFormat">{t.profileSettings.timeFormat}</Label>
                  <Controller
                    name="timeFormat"
                    control={control}
                    render={({ field }) => (
                      <Select onValueChange={field.onChange} value={field.value}>
                        <SelectTrigger>
                          <SelectValue placeholder="Select time format" />
                        </SelectTrigger>
                        <SelectContent>
                          {timeFormats.map((format) => (
                            <SelectItem key={format.value} value={format.value}>
                              {format.label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    )}
                  />
                </div>
              </div>
            </TabsContent>
            <TabsContent value="appearance" className="space-y-6">
              <div className="space-y-4">
                <div>
                  <Label htmlFor="activeTheme">Active Theme</Label>
                  <Controller
                    name="activeTheme"
                    control={control}
                    render={({ field }) => (
                      <Select onValueChange={field.onChange} value={field.value}>
                        <SelectTrigger>
                          <SelectValue placeholder="Select a theme" />
                        </SelectTrigger>
                        <SelectContent>
                          {!themes.some((theme) => theme.isActive) && (
                            <SelectItem value="default">Select a theme</SelectItem>
                          )}
                          {themes.map((theme) => (
                            <SelectItem key={theme.name} value={theme.name}>
                              {theme.name} {theme.isActive ? "(Active)" : ""}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    )}
                  />
                </div>
                <div className="flex items-center space-x-2">
                  <Controller
                    name="enableDarkMode"
                    control={control}
                    render={({ field }) => (
                      <Switch checked={field.value} onCheckedChange={field.onChange} id="dark-mode" />
                    )}
                  />
                  <Label htmlFor="dark-mode">Enable Dark Mode</Label>
                </div>
              </div>
            </TabsContent>
          </Tabs>
        </CardContent>
        <Separator className="my-4" />
        <CardFooter className="flex justify-between">
          <Alert variant="default" className="w-2/3">
            <Info className="h-4 w-4" />
            <AlertTitle>Heads up!</AlertTitle>
            <AlertDescription>Changing some settings may require a page reload to take effect.</AlertDescription>
          </Alert>
          <Button type="submit" disabled={!isDirty || isLoading}>
            {isLoading ? (
              <>
                <AlertCircle className="mr-2 h-4 w-4 animate-spin" />
                Saving...
              </>
            ) : (
              <>
                <Check className="mr-2 h-4 w-4" />
                {t.profileSettings.saveChanges}
              </>
            )}
          </Button>
        </CardFooter>
      </Card>
    </form>
  )
}

