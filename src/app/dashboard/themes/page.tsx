"use client"

import type React from "react"

import { useState, useRef } from "react"
import { handleSuccess } from "@/utils/successHandler"
import {
    Loader2,
    Upload,
    FileArchiveIcon as FileZip,
    CheckCircle2,
    AlertCircle,
    ArrowRight,
    Palette,
    Paintbrush,
    Layers,
    Sparkles,
} from "lucide-react"
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Progress } from "@/components/ui/progress"
import { motion, AnimatePresence } from "framer-motion"
import { Badge } from "@/components/ui/badge"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"

export default function AddThemePage() {
    const [file, setFile] = useState<File | null>(null)
    const [isLoading, setIsLoading] = useState(false)
    const [isDragging, setIsDragging] = useState(false)
    const [uploadProgress, setUploadProgress] = useState(0)
    const [uploadStatus, setUploadStatus] = useState<"idle" | "success" | "error">("idle")
    const fileInputRef = useRef<HTMLInputElement>(null)

    const backendUrl = process.env.NEXT_PUBLIC_BACKEND_URL || "http://localhost:3000"

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files?.length) {
            setFile(e.target.files[0])
            setUploadStatus("idle")
        }
    }

    const handleDragOver = (e: React.DragEvent) => {
        e.preventDefault()
        setIsDragging(true)
    }

    const handleDragLeave = () => {
        setIsDragging(false)
    }

    const handleDrop = (e: React.DragEvent) => {
        e.preventDefault()
        setIsDragging(false)
        if (e.dataTransfer.files?.length) {
            setFile(e.dataTransfer.files[0])
            setUploadStatus("idle")
        }
    }

    const handleUpload = async () => {
        if (!file) return

        const formData = new FormData()
        formData.append("file", file)

        setIsLoading(true)
        setUploadProgress(0)

        // Simulate progress for better UX
        const progressInterval = setInterval(() => {
            setUploadProgress((prev) => {
                if (prev >= 95) {
                    clearInterval(progressInterval)
                    return 95
                }
                return prev + 5
            })
        }, 200)

        try {
            const res = await fetch(`${backendUrl}/api/themes/upload`, {
                method: "POST",
                body: formData,
            })

            clearInterval(progressInterval)
            setUploadProgress(100)

            const data = await res.json()

            if (data.success) {
                setUploadStatus("success")
                handleSuccess(true, null, "Theme uploaded successfully")
                setTimeout(() => {
                    setFile(null)
                    setUploadProgress(0)
                }, 2000)
            } else {
                setUploadStatus("error")
                handleSuccess(false, null, "Failed to upload theme")
            }
        } catch (error) {
            clearInterval(progressInterval)
            setUploadProgress(0)
            setUploadStatus("error")
            handleSuccess(false, null, "Theme upload error")
        } finally {
            setIsLoading(false)
        }
    }

    const resetUpload = () => {
        setFile(null)
        setUploadProgress(0)
        setUploadStatus("idle")
    }

    const triggerFileInput = () => {
        fileInputRef.current?.click()
    }

    return (
        <div className="container mx-auto py-12 px-4">
            <div className="max-w-6xl mx-auto">
                <div className="text-center mb-12">
                    <h1 className="text-4xl font-bold tracking-tight mb-3">Theme Manager</h1>
                    <p className="text-muted-foreground max-w-2xl mx-auto">
                        Upload custom themes to personalize your experience. Themes are applied instantly across your entire
                        workspace.
                    </p>
                </div>

                <Tabs defaultValue="upload" className="w-full">
                    <TabsList className="grid w-full grid-cols-2 mb-8">
                        <TabsTrigger value="upload" className="text-base py-3">
                            <Upload className="w-4 h-4 mr-2" />
                            Upload Theme
                        </TabsTrigger>
                        <TabsTrigger value="design" className="text-base py-3">
                            <Paintbrush className="w-4 h-4 mr-2" />
                            Design Guidelines
                        </TabsTrigger>
                    </TabsList>

                    <TabsContent value="upload" className="mt-0">
                        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                            <Card className="overflow-hidden border-2">
                                <CardHeader className="pb-3">
                                    <CardTitle className="flex items-center text-xl">
                                        <FileZip className="w-5 h-5 mr-2 text-primary" />
                                        Theme Package Upload
                                    </CardTitle>
                                    <CardDescription>Upload a .zip file containing your custom theme</CardDescription>
                                </CardHeader>

                                <CardContent className="pb-0">
                                    <div
                                        className={`relative rounded-lg p-8 transition-all duration-300 ease-in-out ${isDragging
                                            ? "bg-primary/10 border-2 border-dashed border-primary"
                                            : file
                                                ? "bg-success/10 border-2 border-dashed border-success"
                                                : "bg-muted/30 border-2 border-dashed border-muted-foreground/30 hover:border-primary/50 hover:bg-muted/50"
                                            }`}
                                        onDragOver={handleDragOver}
                                        onDragLeave={handleDragLeave}
                                        onDrop={handleDrop}
                                        onClick={!file ? triggerFileInput : undefined}
                                    >
                                        <input
                                            ref={fileInputRef}
                                            type="file"
                                            accept=".zip"
                                            onChange={handleFileChange}
                                            className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                                        />

                                        <AnimatePresence mode="wait">
                                            {!file ? (
                                                <motion.div
                                                    key="upload-prompt"
                                                    initial={{ opacity: 0, y: 10 }}
                                                    animate={{ opacity: 1, y: 0 }}
                                                    exit={{ opacity: 0, y: -10 }}
                                                    className="flex flex-col items-center justify-center py-4"
                                                >
                                                    <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center mb-4">
                                                        <Upload className="w-8 h-8 text-primary" />
                                                    </div>
                                                    <h3 className="text-lg font-medium mb-2">Drop your theme package here</h3>
                                                    <p className="text-sm text-muted-foreground text-center max-w-xs">
                                                        Drag and drop your .zip file here or click to browse your files
                                                    </p>
                                                    <Badge variant="outline" className="mt-4">
                                                        .zip files only
                                                    </Badge>
                                                </motion.div>
                                            ) : (
                                                <motion.div
                                                    key="file-selected"
                                                    initial={{ opacity: 0, y: 10 }}
                                                    animate={{ opacity: 1, y: 0 }}
                                                    exit={{ opacity: 0, y: -10 }}
                                                    className="flex flex-col items-center justify-center py-4"
                                                >
                                                    <div
                                                        className={`w-16 h-16 rounded-full flex items-center justify-center mb-4 ${uploadStatus === "success"
                                                            ? "bg-success/20"
                                                            : uploadStatus === "error"
                                                                ? "bg-destructive/20"
                                                                : "bg-primary/10"
                                                            }`}
                                                    >
                                                        {uploadStatus === "success" ? (
                                                            <CheckCircle2 className="w-8 h-8 text-success" />
                                                        ) : uploadStatus === "error" ? (
                                                            <AlertCircle className="w-8 h-8 text-destructive" />
                                                        ) : (
                                                            <FileZip className="w-8 h-8 text-primary" />
                                                        )}
                                                    </div>
                                                    <h3 className="text-lg font-medium mb-1">{file.name}</h3>
                                                    <p className="text-sm text-muted-foreground">{(file.size / 1024).toFixed(2)} KB</p>

                                                    {uploadProgress > 0 && (
                                                        <div className="w-full mt-4">
                                                            <Progress value={uploadProgress} className="h-2" />
                                                            <p className="text-xs text-right mt-1 text-muted-foreground">{uploadProgress}%</p>
                                                        </div>
                                                    )}

                                                    {uploadStatus === "success" && (
                                                        <p className="text-sm text-success mt-2 flex items-center">
                                                            <CheckCircle2 className="w-4 h-4 mr-1" />
                                                            Upload successful
                                                        </p>
                                                    )}

                                                    {uploadStatus === "error" && (
                                                        <p className="text-sm text-destructive mt-2 flex items-center">
                                                            <AlertCircle className="w-4 h-4 mr-1" />
                                                            Upload failed
                                                        </p>
                                                    )}
                                                </motion.div>
                                            )}
                                        </AnimatePresence>
                                    </div>
                                </CardContent>

                                <CardFooter className="flex justify-between pt-6">
                                    {file ? (
                                        <div className="flex w-full gap-3">
                                            <Button variant="outline" onClick={resetUpload} disabled={isLoading} className="flex-1">
                                                Reset
                                            </Button>
                                            <Button
                                                onClick={handleUpload}
                                                disabled={isLoading || uploadStatus === "success"}
                                                className="flex-1"
                                            >
                                                {isLoading ? (
                                                    <>
                                                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                                                        Uploading...
                                                    </>
                                                ) : uploadStatus === "success" ? (
                                                    <>
                                                        <CheckCircle2 className="w-4 h-4 mr-2" />
                                                        Uploaded
                                                    </>
                                                ) : (
                                                    <>
                                                        <Upload className="w-4 h-4 mr-2" />
                                                        Upload Theme
                                                    </>
                                                )}
                                            </Button>
                                        </div>
                                    ) : (
                                        <Button onClick={triggerFileInput} className="w-full">
                                            <Upload className="w-4 h-4 mr-2" />
                                            Select Theme Package
                                        </Button>
                                    )}
                                </CardFooter>
                            </Card>

                            <Card className="bg-gradient-to-br from-primary/5 to-primary/10 border-2">
                                <CardContent className="flex flex-col justify-center h-full p-8">
                                    <div className="space-y-6">
                                        <div className="flex items-center">
                                            <div className="w-12 h-12 rounded-full bg-primary/20 flex items-center justify-center mr-4">
                                                <Palette className="w-6 h-6 text-primary" />
                                            </div>
                                            <div>
                                                <h3 className="text-xl font-semibold">Customize Your Experience</h3>
                                                <p className="text-muted-foreground">Personalize the look and feel of your workspace</p>
                                            </div>
                                        </div>

                                        <ul className="space-y-4">
                                            {[
                                                {
                                                    icon: <Layers className="w-5 h-5 text-primary" />,
                                                    text: "Complete UI transformation with custom themes",
                                                },
                                                {
                                                    icon: <Sparkles className="w-5 h-5 text-primary" />,
                                                    text: "Instantly apply changes across your entire workspace",
                                                },
                                                {
                                                    icon: <ArrowRight className="w-5 h-5 text-primary" />,
                                                    text: "Switch between multiple themes with ease",
                                                },
                                            ].map((item, index) => (
                                                <li key={index} className="flex items-start">
                                                    <div className="mr-3 mt-0.5">{item.icon}</div>
                                                    <span>{item.text}</span>
                                                </li>
                                            ))}
                                        </ul>

                                        <div className="pt-4">
                                            <p className="text-sm font-medium">
                                                Design with ease and transform your workspace with just a few clicks.
                                            </p>
                                        </div>
                                    </div>
                                </CardContent>
                            </Card>
                        </div>
                    </TabsContent>

                    <TabsContent value="design" className="mt-0">
                        <Card className="border-2">
                            <CardHeader>
                                <CardTitle className="flex items-center">
                                    <Paintbrush className="w-5 h-5 mr-2 text-primary" />
                                    Theme Design Guidelines
                                </CardTitle>
                                <CardDescription>Learn how to create custom themes for your workspace</CardDescription>
                            </CardHeader>
                            <CardContent>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                                    <div className="space-y-4">
                                        <h3 className="text-lg font-semibold">Getting Started</h3>
                                        <p className="text-muted-foreground">
                                            Creating a custom theme is easy. Follow these steps to get started:
                                        </p>
                                        <ol className="space-y-2 list-decimal list-inside">
                                            <li>Create a new folder for your theme</li>
                                            <li>Add your custom CSS and assets</li>
                                            <li>Package everything into a .zip file</li>
                                            <li>Upload your theme using the theme manager</li>
                                        </ol>
                                        <p className="text-sm text-muted-foreground mt-4">
                                            For more detailed instructions, check out our{" "}
                                            <a href="#" className="text-primary hover:underline">
                                                documentation
                                            </a>
                                            .
                                        </p>
                                    </div>

                                    <div className="space-y-4">
                                        <h3 className="text-lg font-semibold">Theme Structure</h3>
                                        <div className="bg-muted p-4 rounded-md font-mono text-sm">
                                            <pre className="whitespace-pre-wrap">
                                                {`theme/
                                                    ├── theme.json
                                                    ├── styles/
                                                    │   ├── main.css
                                                    │   └── variables.css
                                                    └── assets/
                                                        ├── fonts/
                                                        └── images/`}
                                            </pre>
                                        </div>
                                        <p className="text-sm text-muted-foreground">
                                            Your theme must include a theme.json file with metadata about your theme.
                                        </p>
                                    </div>
                                </div>
                            </CardContent>
                            <CardFooter className="flex justify-end border-t bg-muted/20 p-4">
                                <Button variant="outline" className="mr-2">
                                    Download Template
                                </Button>
                                <Button>View Full Documentation</Button>
                            </CardFooter>
                        </Card>
                    </TabsContent>
                </Tabs>

                <Card className="mt-8 border-2 bg-gradient-to-r from-primary/5 via-background to-primary/5">
                    <CardContent className="flex flex-col md:flex-row items-center justify-between p-8">
                        <div className="flex-1">
                            <h2 className="text-3xl font-bold tracking-tight mb-2">Become a Theme Designer</h2>
                            <p className="text-muted-foreground max-w-xl">
                                Create and share your custom themes with the community. Showcase your design skills and help others
                                personalize their experience.
                            </p>
                        </div>
                        <div className="mt-6 md:mt-0">
                            <Button size="lg" className="group">
                                Get Started
                                <ArrowRight className="ml-2 w-4 h-4 transition-transform group-hover:translate-x-1" />
                            </Button>
                        </div>
                    </CardContent>
                </Card>
            </div>
        </div>
    )
}
