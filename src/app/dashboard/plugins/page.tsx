'use client';

import type React from 'react';

import { useState, useRef, useEffect } from 'react';
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
import { usePlugins } from '@/context/PluginContext';

interface PluginRecord {
  pluginId?: string;
  _id?: string;
  id?: string;
  name: string;
  version: string;
  description: string;
  author: string;
  isActive?: boolean;
  hasUpdate?: boolean;
  icon: string;
}

interface MarketplacePlugin {
  id: string;
  name: string;
  version: string;
  description: string;
  author: string;
  downloads: string;
  rating: number;
  icon: string;
  type: string;
}

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
    type: 'social',
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
    type: 'chart',
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
    type: 'form',
  },
  {
    id: '7',
    name: 'Slider',
    version: '2.0.0',
    description: 'Create banners, cards, products, and content sliders.',
    author: 'OpenNext',
    downloads: '1.2k',
    rating: 4.8,
    icon: '🎠',
    type: 'slider',
  },
  {
    id: '8',
    name: 'Menu Redirect',
    version: '1.0.0',
    description: 'Add a header menu with configurable page links and redirect actions',
    author: 'OpenNext',
    downloads: '2.4k',
    rating: 4.8,
    icon: 'Menu',
    type: 'menu',
  },
  {
    id: '9',
    name: 'Contact Form Pro',
    version: '1.0.0',
    description: 'A beautiful contact section with Google Maps background and feedback form',
    author: 'OpenNext',
    downloads: '5.1k',
    rating: 4.9,
    icon: '📞',
    type: 'contact',
  },
];

export default function PluginManagementPage() {
  const [file, setFile] = useState<File | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [uploadStatus, setUploadStatus] = useState<'idle' | 'success' | 'error'>('idle');
  const [searchTerm, setSearchTerm] = useState('');
  const [activePlugins, setActivePlugins] = useState<Record<string, boolean>>({});
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);
  const [editingPlugin, setEditingPlugin] = useState<PluginRecord | MarketplacePlugin | null>(null);
  const [installedPluginsList, setInstalledPluginsList] = useState<PluginRecord[]>([]);
  const [marketplacePluginsList, setMarketplacePluginsList] = useState(marketplacePlugins);
  const [activeTab, setActiveTab] = useState('upload');
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { refreshPlugins } = usePlugins();

  // Fetch installed plugins on mount
  const fetchPlugins = async () => {
    try {
      const response = await fetch('/api/dashboard/plugins/get-plugins');
      const data = await response.json();
      if (response.ok) {
        setInstalledPluginsList(data.plugins || []);
        const activeStates = (data.plugins || []).reduce(
          (acc: Record<string, boolean>, plugin: PluginRecord) => {
            if (plugin.pluginId) acc[plugin.pluginId] = !!plugin.isActive;
            return acc;
          },
          {}
        );
        setActivePlugins(activeStates);
      }
    } catch (error) {
      console.error('Failed to fetch plugins:', error);
    }
  };

  useEffect(() => {
    fetchPlugins();
  }, []);

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

    const progressInterval = setInterval(() => {
      setUploadProgress((prev) => {
        if (prev >= 95) {
          clearInterval(progressInterval);
          return 95;
        }
        return prev + 5;
      });
    }, 100);

    try {
      const formData = new FormData();
      formData.append('file', file);

      const response = await fetch('/api/dashboard/plugins/upload-plugin', {
        method: 'POST',
        body: formData,
      });

      const data = await response.json();

      clearInterval(progressInterval);
      setUploadProgress(100);

      if (response.ok) {
        setUploadStatus('success');
        handleSuccess(true, null, data.message || 'Plugin uploaded successfully');
        await fetchPlugins();
        await refreshPlugins();
        setTimeout(() => {
          setFile(null);
          setUploadProgress(0);
        }, 1500);
      } else {
        throw new Error(data.message);
      }
    } catch (error: unknown) {
      clearInterval(progressInterval);
      setUploadProgress(0);
      setUploadStatus('error');
      const message = error instanceof Error ? error.message : 'Plugin upload error';
      handleSuccess(false, null, message);
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

  const togglePluginStatus = async (pluginId: string) => {
    const newStatus = !activePlugins[pluginId];
    try {
      const response = await fetch('/api/dashboard/plugins/toggle-plugin', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ pluginId, isActive: newStatus }),
      });

      if (response.ok) {
        setActivePlugins((prev) => ({
          ...prev,
          [pluginId]: newStatus,
        }));
        handleSuccess(true, null, `Plugin ${newStatus ? 'enabled' : 'disabled'} successfully`);
        await refreshPlugins();
      }
    } catch {
      handleSuccess(false, null, 'Failed to toggle plugin status');
    }
  };

  const deletePlugin = async (pluginId: string) => {
    try {
      const response = await fetch(`/api/dashboard/plugins/remove-plugin?pluginId=${pluginId}`, {
        method: 'DELETE',
      });

      if (response.ok) {
        setInstalledPluginsList((prev) => prev.filter((plugin) => plugin.pluginId !== pluginId));
        handleSuccess(true, null, 'Plugin removed successfully');
        await refreshPlugins();
      }
    } catch {
      handleSuccess(false, null, 'Failed to remove plugin');
    }
    setConfirmDeleteId(null);
  };

  const installPlugin = async (id: string) => {
    const pluginToInstall = marketplacePluginsList.find((plugin) => plugin.id === id);
    if (!pluginToInstall) return;

    if (installedPluginsList.some((plugin) => plugin.name === pluginToInstall.name)) {
      handleSuccess(false, null, 'Plugin already installed');
      return;
    }

    try {
      const response = await fetch('/api/dashboard/plugins/install-plugin', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...pluginToInstall,
          pluginId: `market-${pluginToInstall.id}`,
        }),
      });

      if (response.ok) {
        handleSuccess(true, null, 'Plugin installed successfully');
        await fetchPlugins();
        await refreshPlugins();
      }
    } catch {
      handleSuccess(false, null, 'Failed to install plugin');
    }
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

  const handleUpdatePlugin = async () => {
    if (!editingPlugin) return;

    // Check if it's a marketplace plugin (not yet installed)
    const isMarketplace = !('pluginId' in editingPlugin) || !editingPlugin.pluginId;

    if (isMarketplace) {
      const marketplaceEdit = editingPlugin as MarketplacePlugin;
      setMarketplacePluginsList((prev) =>
        prev.map((p) => (p.id === marketplaceEdit.id ? { ...p, ...marketplaceEdit } : p))
      );
      handleSuccess(true, null, 'Marketplace plugin updated locally');
      setEditingPlugin(null);
      return;
    }

    const installedEdit = editingPlugin as PluginRecord;
    try {
      const response = await fetch('/api/dashboard/plugins/update-plugin', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          pluginId: installedEdit.pluginId,
          name: installedEdit.name,
          description: installedEdit.description,
          version: installedEdit.version,
          icon: installedEdit.icon,
        }),
      });

      const data = await response.json();

      if (response.ok) {
        handleSuccess(true, null, 'Plugin metadata updated successfully');
        setEditingPlugin(null);
        await fetchPlugins();
        await refreshPlugins();
      } else {
        throw new Error(data.message);
      }
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : 'Failed to update plugin';
      handleSuccess(false, null, message);
    }
  };

  const filteredInstalledPlugins = installedPluginsList.filter(
    (plugin) =>
      plugin.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      plugin.description.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const filteredMarketplacePlugins = marketplacePluginsList.filter(
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

        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
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
                  <Button onClick={() => setActiveTab('marketplace')}>
                    Browse Marketplace
                  </Button>
                </CardContent>
              </Card>
            ) : (
              <div className="grid gap-4">
                {filteredInstalledPlugins.map((plugin) => {
                  const pId = plugin.pluginId || plugin._id || plugin.id || '';
                  return (
                    <Card key={pId} className="border overflow-hidden">
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
                                    <Badge variant={activePlugins[pId] ? 'default' : 'outline'}>
                                      {activePlugins[pId] ? 'Active' : 'Inactive'}
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
                                id={`plugin-status-${pId}`}
                                checked={activePlugins[pId] || false}
                                onCheckedChange={() => togglePluginStatus(pId)}
                              />
                              <Label htmlFor={`plugin-status-${pId}`}>
                                {activePlugins[pId] ? 'Enabled' : 'Disabled'}
                              </Label>
                            </div>
                            <div className="flex gap-2">
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => setEditingPlugin(plugin)}
                              >
                                <Settings className="w-4 h-4 mr-2" />
                                Edit
                              </Button>
                              {plugin.hasUpdate && (
                                <Button
                                  variant="outline"
                                  size="sm"
                                  onClick={() => updatePlugin(pId)}
                                >
                                  <RefreshCw className="w-4 h-4 mr-2" />
                                  Update
                                </Button>
                              )}
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => setConfirmDeleteId(pId)}
                              >
                                <Trash2 className="w-4 h-4 mr-2" />
                                Remove
                              </Button>
                            </div>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  );
                })}
              </div>
            )}
          </TabsContent>

          <TabsContent value="marketplace" className="mt-0">
            <div className="grid gap-4">
              {filteredMarketplacePlugins.map((plugin, index) => {
                const pId = plugin.id || `market-${index}`;
                return (
                  <Card key={pId} className="border overflow-hidden">
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
                                        key={`star-${pId}-${i}`}
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
                        <div className="bg-muted/30 p-6 flex flex-col items-center justify-center gap-2 border-t md:border-t-0 md:border-l">
                          <Button onClick={() => installPlugin(plugin.id)} className="w-full">
                            <Download className="w-4 h-4 mr-2" />
                            Install
                          </Button>
                          <Button
                            variant="outline"
                            onClick={() => setEditingPlugin(plugin)}
                            className="w-full"
                          >
                            <Settings className="w-4 h-4 mr-2" />
                            Edit
                          </Button>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
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
              <Button size="lg" className="group" asChild>
                <a
                  href="https://github.com/OpenNextCMS/openext"
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  Developer Portal
                  <ArrowRight className="ml-2 w-4 h-4 transition-transform group-hover:translate-x-1" />
                </a>
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

      {/* Edit Plugin Metadata Dialog */}
      <Dialog open={!!editingPlugin} onOpenChange={(open) => !open && setEditingPlugin(null)}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>Edit Plugin Metadata</DialogTitle>
            <DialogDescription>
              Update the display information for this plugin.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label htmlFor="edit-name">Plugin Name</Label>
              <Input
                id="edit-name"
                value={editingPlugin?.name || ''}
                onChange={(e) =>
                  editingPlugin && setEditingPlugin({ ...editingPlugin, name: e.target.value })
                }
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="edit-version">Version</Label>
              <Input
                id="edit-version"
                value={editingPlugin?.version || ''}
                onChange={(e) =>
                  editingPlugin && setEditingPlugin({ ...editingPlugin, version: e.target.value })
                }
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="edit-icon">Icon (Emoji)</Label>
              <Input
                id="edit-icon"
                value={editingPlugin?.icon || ''}
                onChange={(e) =>
                  editingPlugin && setEditingPlugin({ ...editingPlugin, icon: e.target.value })
                }
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="edit-description">Description</Label>
              <Input
                id="edit-description"
                value={editingPlugin?.description || ''}
                onChange={(e) =>
                  editingPlugin &&
                  setEditingPlugin({ ...editingPlugin, description: e.target.value })
                }
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditingPlugin(null)}>
              Cancel
            </Button>
            <Button onClick={handleUpdatePlugin}>Save Changes</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
