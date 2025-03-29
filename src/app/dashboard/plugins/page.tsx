'use client';

import type React from 'react';

import { useState, useRef } from 'react';
import { handleSuccess } from '@/utils/successHandler';
import {
  Loader2,
  Upload,
  FileArchiveIcon as FileZip,
  CheckCircle2,
  AlertCircle,
  ArrowRight,
  Package,
  Download,
  Power,
  Trash2,
  Search,
  Filter,
  RefreshCw,
  PlusCircle,
  Settings,
} from 'lucide-react';
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
  CardFooter,
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { motion, AnimatePresence } from 'framer-motion';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Input } from '@/components/ui/input';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

// Mock data for installed plugins
const installedPlugins = [
  {
    id: '1',
    name: 'Data Visualizer',
    version: '1.2.0',
    description: 'Advanced data visualization tools with interactive charts and graphs',
    author: 'DataViz Inc.',
    isActive: true,
    hasUpdate: false,
    icon: '📊',
  },
  {
    id: '2',
    name: 'Content Editor Pro',
    version: '2.1.5',
    description: 'Enhanced content editing capabilities with markdown support',
    author: 'EditMaster',
    isActive: true,
    hasUpdate: true,
    icon: '✏️',
  },
  {
    id: '3',
    name: 'SEO Optimizer',
    version: '1.0.3',
    description: 'Optimize your content for search engines with real-time suggestions',
    author: 'SEO Tools Ltd',
    isActive: false,
    hasUpdate: false,
    icon: '🔍',
  },
];

// Mock data for marketplace plugins
const marketplacePlugins = [
  {
    id: '4',
    name: 'Social Media Integration',
    version: '3.0.1',
    description: 'Connect and share content directly to social media platforms',
    author: 'SocialConnect',
    downloads: '10.5k',
    rating: 4.7,
    icon: '🌐',
  },
  {
    id: '5',
    name: 'Advanced Analytics',
    version: '2.2.0',
    description: 'Comprehensive analytics dashboard with user behavior tracking',
    author: 'AnalyticsHub',
    downloads: '8.2k',
    rating: 4.5,
    icon: '📈',
  },
  {
    id: '6',
    name: 'Form Builder',
    version: '1.5.2',
    description: 'Drag and drop form builder with validation and submission handling',
    author: 'FormCraft',
    downloads: '15.3k',
    rating: 4.9,
    icon: '📝',
  },
];

export default function PluginManagementPage() {
  const [file, setFile] = useState<File | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [uploadStatus, setUploadStatus] = useState<'idle' | 'success' | 'error'>('idle');
  const [searchTerm, setSearchTerm] = useState('');
  const [activePlugins, setActivePlugins] = useState(
    installedPlugins.reduce(
      (acc, plugin) => {
        acc[plugin.id] = plugin.isActive;
        return acc;
      },
      {} as Record<string, boolean>
    )
  );
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);
  const [installedPluginsList, setInstalledPluginsList] = useState(installedPlugins);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files?.length) {
      setFile(e.target.files[0]);
      setUploadStatus('idle');
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = () => {
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    if (e.dataTransfer.files?.length) {
      setFile(e.dataTransfer.files[0]);
      setUploadStatus('idle');
    }
  };

  const handleUpload = async () => {
    if (!file) return;

    setIsLoading(true);
    setUploadProgress(0);

    // Simulate progress for better UX
    const progressInterval = setInterval(() => {
      setUploadProgress((prev) => {
        if (prev >= 95) {
          clearInterval(progressInterval);
          return 95;
        }
        return prev + 5;
      });
    }, 200);

    try {
      // Extract ZIP file and validate plugin structure
      const formData = new FormData();
      formData.append('file', file);

      // Simulate API call
      await new Promise((resolve) => setTimeout(resolve, 2000));

      clearInterval(progressInterval);
      setUploadProgress(100);

      // Simulate successful upload
      setUploadStatus('success');
      handleSuccess(true, null, 'Plugin uploaded successfully');

      // Add the new plugin to installed plugins (in a real app, this would come from the API)
      const newPlugin = {
        id: `new-${Date.now()}`,
        name: file.name.replace('.zip', ''),
        version: '1.0.0',
        description: 'Custom plugin uploaded by user',
        author: 'You',
        isActive: true,
        hasUpdate: false,
        icon: '🧩',
      };

      setTimeout(() => {
        setInstalledPluginsList([newPlugin, ...installedPluginsList]);
        setActivePlugins({ ...activePlugins, [newPlugin.id]: true });
        setFile(null);
        setUploadProgress(0);
      }, 1000);
    } catch (error) {
      clearInterval(progressInterval);
      setUploadProgress(0);
      setUploadStatus('error');
      handleSuccess(false, null, 'Plugin upload error');
      return error;
    } finally {
      setIsLoading(false);
    }
  };

  const resetUpload = () => {
    setFile(null);
    setUploadProgress(0);
    setUploadStatus('idle');
  };

  const triggerFileInput = () => {
    fileInputRef.current?.click();
  };

  const togglePluginStatus = (id: string) => {
    setActivePlugins((prev) => ({
      ...prev,
      [id]: !prev[id],
    }));

    handleSuccess(true, null, `Plugin ${activePlugins[id] ? 'disabled' : 'enabled'} successfully`);
  };

  const deletePlugin = (id: string) => {
    setInstalledPluginsList((prev) => prev.filter((plugin) => plugin.id !== id));
    handleSuccess(true, null, 'Plugin deleted successfully');
    setConfirmDeleteId(null);
  };

  const installPlugin = (id: string) => {
    const pluginToInstall = marketplacePlugins.find((plugin) => plugin.id === id);
    if (!pluginToInstall) return;

    // Check if already installed
    if (installedPluginsList.some((plugin) => plugin.name === pluginToInstall.name)) {
      handleSuccess(false, null, 'Plugin already installed');
      return;
    }

    // Convert marketplace plugin to installed plugin
    const newInstalledPlugin = {
      ...pluginToInstall,
      isActive: true,
      hasUpdate: false,
    };

    setInstalledPluginsList((prev) => [newInstalledPlugin, ...prev]);
    setActivePlugins((prev) => ({
      ...prev,
      [id]: true,
    }));

    handleSuccess(true, null, 'Plugin installed successfully');
  };

  const updatePlugin = (id: string) => {
    setInstalledPluginsList((prev) =>
      prev.map((plugin) =>
        plugin.id === id
          ? {
              ...plugin,
              version: `${Number.parseInt(plugin.version.split('.')[0]) + 1}.0.0`,
              hasUpdate: false,
            }
          : plugin
      )
    );

    handleSuccess(true, null, 'Plugin updated successfully');
  };

  const filteredInstalledPlugins = installedPluginsList.filter(
    (plugin) =>
      plugin.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      plugin.description.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const filteredMarketplacePlugins = marketplacePlugins.filter(
    (plugin) =>
      plugin.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      plugin.description.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="container mx-auto py-12 px-4">
      <div className="max-w-6xl mx-auto">
        <div className="text-center mb-12">
          <h1 className="text-4xl font-bold tracking-tight mb-3">Plugin Management</h1>
          <p className="text-muted-foreground max-w-2xl mx-auto">
            Extend your workspace functionality with plugins. Install from the marketplace or upload
            custom plugins.
          </p>
        </div>

        <Tabs defaultValue="upload" className="w-full">
          <TabsList className="grid w-full grid-cols-3 mb-8 h-auto">
            <TabsTrigger value="upload" className="text-base py-3">
              <Upload className="w-4 h-4 mr-2" />
              Upload Plugin
            </TabsTrigger>
            <TabsTrigger value="installed" className="text-base py-3">
              <Package className="w-4 h-4 mr-2" />
              Installed Plugins
            </TabsTrigger>
            <TabsTrigger value="marketplace" className="text-base py-3">
              <Download className="w-4 h-4 mr-2" />
              Plugin Marketplace
            </TabsTrigger>
          </TabsList>

          <div className="mb-6 flex flex-col sm:flex-row gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
              <Input
                placeholder="Search plugins..."
                className="pl-10"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" className="gap-2">
                  <Filter className="h-4 w-4" />
                  Filter
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent>
                <DropdownMenuItem>All Plugins</DropdownMenuItem>
                <DropdownMenuItem>Active Plugins</DropdownMenuItem>
                <DropdownMenuItem>Inactive Plugins</DropdownMenuItem>
                <DropdownMenuItem>Updates Available</DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>

          <TabsContent value="installed" className="mt-0">
            {filteredInstalledPlugins.length === 0 ? (
              <Card className="border-2 p-8 text-center">
                <CardContent className="pt-6">
                  <div className="mx-auto w-16 h-16 rounded-full bg-muted flex items-center justify-center mb-4">
                    <Package className="w-8 h-8 text-muted-foreground" />
                  </div>
                  <h3 className="text-xl font-medium mb-2">No plugins installed</h3>
                  <p className="text-muted-foreground mb-6">
                    You haven&apos;t installed any plugins yet. Browse the marketplace to find
                    plugins or upload your own.
                  </p>
                  <Button asChild>
                    <TabsTrigger value="marketplace">Browse Marketplace</TabsTrigger>
                  </Button>
                </CardContent>
              </Card>
            ) : (
              <div className="grid gap-4">
                {filteredInstalledPlugins.map((plugin) => (
                  <Card key={plugin.id} className="border overflow-hidden">
                    <CardContent className="p-0">
                      <div className="flex flex-col md:flex-row">
                        <div className="p-6 flex-1">
                          <div className="flex items-start gap-4">
                            <div className="w-12 h-12 rounded-lg bg-primary/10 flex items-center justify-center text-2xl">
                              {plugin.icon}
                            </div>
                            <div className="flex-1">
                              <div className="flex items-center justify-between">
                                <div className="flex items-center gap-2">
                                  <h3 className="text-lg font-semibold">{plugin.name}</h3>
                                  <Badge variant={activePlugins[plugin.id] ? 'default' : 'outline'}>
                                    {activePlugins[plugin.id] ? 'Active' : 'Inactive'}
                                  </Badge>
                                  {plugin.hasUpdate && (
                                    <Badge variant="secondary">Update Available</Badge>
                                  )}
                                </div>
                              </div>
                              <p className="text-sm text-muted-foreground mt-1">
                                Version {plugin.version} • By {plugin.author}
                              </p>
                              <p className="mt-2">{plugin.description}</p>
                            </div>
                          </div>
                        </div>
                        <div className="bg-muted/30 p-6 flex flex-row md:flex-col items-center justify-between gap-4 border-t md:border-t-0 md:border-l">
                          <div className="flex items-center gap-2">
                            <Switch
                              id={`plugin-status-${plugin.id}`}
                              checked={activePlugins[plugin.id]}
                              onCheckedChange={() => togglePluginStatus(plugin.id)}
                            />
                            <Label htmlFor={`plugin-status-${plugin.id}`}>
                              {activePlugins[plugin.id] ? 'Enabled' : 'Disabled'}
                            </Label>
                          </div>
                          <div className="flex gap-2">
                            {plugin.hasUpdate && (
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => updatePlugin(plugin.id)}
                              >
                                <RefreshCw className="w-4 h-4 mr-2" />
                                Update
                              </Button>
                            )}
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => setConfirmDeleteId(plugin.id)}
                            >
                              <Trash2 className="w-4 h-4 mr-2" />
                              Remove
                            </Button>
                          </div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </TabsContent>

          <TabsContent value="marketplace" className="mt-0">
            <div className="grid gap-4">
              {filteredMarketplacePlugins.map((plugin) => (
                <Card key={plugin.id} className="border overflow-hidden">
                  <CardContent className="p-0">
                    <div className="flex flex-col md:flex-row">
                      <div className="p-6 flex-1">
                        <div className="flex items-start gap-4">
                          <div className="w-12 h-12 rounded-lg bg-primary/10 flex items-center justify-center text-2xl">
                            {plugin.icon}
                          </div>
                          <div className="flex-1">
                            <div className="flex items-center justify-between">
                              <h3 className="text-lg font-semibold">{plugin.name}</h3>
                            </div>
                            <p className="text-sm text-muted-foreground mt-1">
                              Version {plugin.version} • By {plugin.author}
                            </p>
                            <p className="mt-2">{plugin.description}</p>
                            <div className="flex items-center gap-4 mt-2">
                              <div className="flex items-center">
                                <Download className="w-4 h-4 mr-1 text-muted-foreground" />
                                <span className="text-sm text-muted-foreground">
                                  {plugin.downloads}
                                </span>
                              </div>
                              <div className="flex items-center">
                                <div className="flex">
                                  {Array.from({ length: 5 }).map((_, i) => (
                                    <svg
                                      key={i}
                                      className={`w-4 h-4 ${
                                        i < Math.floor(plugin.rating)
                                          ? 'text-yellow-400 fill-yellow-400'
                                          : 'text-gray-300 fill-gray-300'
                                      }`}
                                      xmlns="http://www.w3.org/2000/svg"
                                      viewBox="0 0 24 24"
                                    >
                                      <path d="M12 17.27L18.18 21l-1.64-7.03L22 9.24l-7.19-.61L12 2 9.19 8.63 2 9.24l5.46 4.73L5.82 21z" />
                                    </svg>
                                  ))}
                                </div>
                                <span className="text-sm text-muted-foreground ml-1">
                                  {plugin.rating}
                                </span>
                              </div>
                            </div>
                          </div>
                        </div>
                      </div>
                      <div className="bg-muted/30 p-6 flex items-center justify-center border-t md:border-t-0 md:border-l">
                        <Button onClick={() => installPlugin(plugin.id)}>
                          <Download className="w-4 h-4 mr-2" />
                          Install
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </TabsContent>

          <TabsContent value="upload" className="mt-0">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
              <Card className="overflow-hidden border-2">
                <CardHeader className="pb-3">
                  <CardTitle className="flex items-center text-xl">
                    <FileZip className="w-5 h-5 mr-2 text-primary" />
                    Plugin Upload
                  </CardTitle>
                  <CardDescription>
                    Upload a .zip file containing your custom plugin
                  </CardDescription>
                </CardHeader>

                <CardContent className="pb-0">
                  <div
                    className={`relative rounded-lg p-8 transition-all duration-300 ease-in-out ${
                      isDragging
                        ? 'bg-primary/10 border-2 border-dashed border-primary'
                        : file
                          ? 'bg-success/10 border-2 border-dashed border-success'
                          : 'bg-muted/30 border-2 border-dashed border-muted-foreground/30 hover:border-primary/50 hover:bg-muted/50'
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
                          <h3 className="text-lg font-medium mb-2">
                            Drop your plugin package here
                          </h3>
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
                            className={`w-16 h-16 rounded-full flex items-center justify-center mb-4 ${
                              uploadStatus === 'success'
                                ? 'bg-success/20'
                                : uploadStatus === 'error'
                                  ? 'bg-destructive/20'
                                  : 'bg-primary/10'
                            }`}
                          >
                            {uploadStatus === 'success' ? (
                              <CheckCircle2 className="w-8 h-8 text-success" />
                            ) : uploadStatus === 'error' ? (
                              <AlertCircle className="w-8 h-8 text-destructive" />
                            ) : (
                              <FileZip className="w-8 h-8 text-primary" />
                            )}
                          </div>
                          <h3 className="text-lg font-medium mb-1">{file.name}</h3>
                          <p className="text-sm text-muted-foreground">
                            {(file.size / 1024).toFixed(2)} KB
                          </p>

                          {uploadProgress > 0 && (
                            <div className="w-full mt-4">
                              <Progress value={uploadProgress} className="h-2" />
                              <p className="text-xs text-right mt-1 text-muted-foreground">
                                {uploadProgress}%
                              </p>
                            </div>
                          )}

                          {uploadStatus === 'success' && (
                            <p className="text-sm text-success mt-2 flex items-center">
                              <CheckCircle2 className="w-4 h-4 mr-1" />
                              Upload successful
                            </p>
                          )}

                          {uploadStatus === 'error' && (
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
                      <Button
                        variant="outline"
                        onClick={resetUpload}
                        disabled={isLoading}
                        className="flex-1"
                      >
                        Reset
                      </Button>
                      <Button
                        onClick={handleUpload}
                        disabled={isLoading || uploadStatus === 'success'}
                        className="flex-1"
                      >
                        {isLoading ? (
                          <>
                            <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                            Uploading...
                          </>
                        ) : uploadStatus === 'success' ? (
                          <>
                            <CheckCircle2 className="w-4 h-4 mr-2" />
                            Uploaded
                          </>
                        ) : (
                          <>
                            <Upload className="w-4 h-4 mr-2" />
                            Upload Plugin
                          </>
                        )}
                      </Button>
                    </div>
                  ) : (
                    <Button onClick={triggerFileInput} className="w-full">
                      <Upload className="w-4 h-4 mr-2" />
                      Select Plugin Package
                    </Button>
                  )}
                </CardFooter>
              </Card>

              <Card className="bg-gradient-to-br from-primary/5 to-primary/10 border-2">
                <CardContent className="flex flex-col justify-center h-full p-8">
                  <div className="space-y-6">
                    <div className="flex items-center">
                      <div className="w-12 h-12 rounded-full bg-primary/20 flex items-center justify-center mr-4">
                        <Settings className="w-6 h-6 text-primary" />
                      </div>
                      <div>
                        <h3 className="text-xl font-semibold">Extend Your Workspace</h3>
                        <p className="text-muted-foreground">
                          Add new features and functionality with plugins
                        </p>
                      </div>
                    </div>

                    <ul className="space-y-4">
                      {[
                        {
                          icon: <PlusCircle className="w-5 h-5 text-primary" />,
                          text: 'Add custom functionality to your workspace',
                        },
                        {
                          icon: <Power className="w-5 h-5 text-primary" />,
                          text: 'Enable or disable plugins as needed',
                        },
                        {
                          icon: <RefreshCw className="w-5 h-5 text-primary" />,
                          text: 'Keep plugins updated with the latest features',
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
                        Plugins are securely sandboxed and reviewed for safety before being added to
                        the marketplace.
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>
        </Tabs>

        <Card className="mt-8 border-2 bg-gradient-to-r from-primary/5 via-background to-primary/5">
          <CardContent className="flex flex-col md:flex-row items-center justify-between p-8">
            <div className="flex-1">
              <h2 className="text-3xl font-bold tracking-tight mb-2">Become a Plugin Developer</h2>
              <p className="text-muted-foreground max-w-xl">
                Create and share your custom plugins with the community. Build tools that help
                others enhance their workflow.
              </p>
            </div>
            <div className="mt-6 md:mt-0">
              <Button size="lg" className="group">
                Developer Portal
                <ArrowRight className="ml-2 w-4 h-4 transition-transform group-hover:translate-x-1" />
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Delete Confirmation Dialog */}
      <Dialog open={!!confirmDeleteId} onOpenChange={(open) => !open && setConfirmDeleteId(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Confirm Plugin Removal</DialogTitle>
            <DialogDescription>
              Are you sure you want to remove this plugin? This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="flex flex-col sm:flex-row gap-2 sm:justify-end">
            <Button variant="outline" onClick={() => setConfirmDeleteId(null)}>
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={() => confirmDeleteId && deletePlugin(confirmDeleteId)}
            >
              <Trash2 className="w-4 h-4 mr-2" />
              Remove Plugin
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
