import { NextRequest, NextResponse } from 'next/server';
import { getUserDbConnection, getPluginModel } from '@/utils/db';
import { extractPluginZip } from '@/lib/plugins/extract';
import { MAX_PLUGIN_ZIP_BYTES } from '@/lib/plugins/storage';
import {
  installBackendPlugin,
  rollbackPluginInstall,
} from '@/lib/plugins/server/lifecycle';

export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData();
    const file = formData.get('file');

    if (!(file instanceof File)) {
      return NextResponse.json({ message: 'No file uploaded' }, { status: 400 });
    }

    if (!file.name.toLowerCase().endsWith('.zip')) {
      return NextResponse.json({ message: 'Only .zip plugin packages are supported' }, { status: 400 });
    }

    if (file.size > MAX_PLUGIN_ZIP_BYTES) {
      return NextResponse.json(
        { message: `Plugin package exceeds the ${Math.floor(MAX_PLUGIN_ZIP_BYTES / (1024 * 1024))}MB limit` },
        { status: 400 }
      );
    }

    const arrayBuffer = await file.arrayBuffer();
    const extracted = await extractPluginZip(arrayBuffer);

    await getUserDbConnection();
    const PluginModel = getPluginModel();

    const existingPlugin = await PluginModel.findOne({ pluginId: extracted.manifest.pluginId });
    if (existingPlugin) {
      await rollbackPluginInstall(extracted.manifest.pluginId);
      return NextResponse.json(
        { message: `Plugin "${extracted.manifest.pluginId}" is already installed` },
        { status: 409 }
      );
    }

    let newPlugin;
    try {
      newPlugin = await PluginModel.create({
        pluginId: extracted.manifest.pluginId,
        name: extracted.manifest.name,
        version: extracted.manifest.version,
        description: extracted.manifest.description || 'Custom plugin uploaded by user',
        author: extracted.manifest.author || 'Unknown',
        type: extracted.manifest.type || extracted.kind,
        kind: extracted.kind,
        isActive: true,
        icon: extracted.manifest.icon || '🧩',
        entryPoint: extracted.entryPoint,
        adminEntry: extracted.adminEntry,
        blockEntry: extracted.blockEntry,
        customElement: extracted.manifest.customElement,
        styles: extracted.styles,
        source: 'uploaded',
        hasBackend: extracted.hasBackend,
        serverEntry: extracted.serverEntry,
        apiPrefix: extracted.hasBackend ? `/api/plugins/${extracted.manifest.pluginId}` : undefined,
        permissions: extracted.permissions,
        dependencies: extracted.dependencies,
        installHook: extracted.installHook,
        uninstallHook: extracted.uninstallHook,
      });
    } catch (dbError) {
      await rollbackPluginInstall(extracted.manifest.pluginId);
      throw dbError;
    }

    let backendResult = null;
    if (extracted.hasBackend && extracted.serverEntry) {
      try {
        backendResult = await installBackendPlugin({
          pluginId: extracted.manifest.pluginId,
          serverEntry: extracted.serverEntry,
          migrations: extracted.migrations,
          permissions: extracted.permissions,
          installHook: extracted.installHook,
          uninstallHook: extracted.uninstallHook,
          dependencies: extracted.dependencies,
          enableAfterInstall: true,
        });
      } catch (backendError) {
        await PluginModel.findOneAndDelete({ pluginId: extracted.manifest.pluginId });
        await rollbackPluginInstall(extracted.manifest.pluginId);
        throw backendError;
      }
    }

    const kindLabel = extracted.kind === 'system' ? 'system (dashboard)' : 'block (editor)';
    const backendLabel = extracted.hasBackend ? ' with backend APIs' : '';
    return NextResponse.json(
      {
        plugin: newPlugin,
        kind: extracted.kind,
        hasBackend: extracted.hasBackend,
        backend: backendResult,
        message: `Plugin extracted and installed as a ${kindLabel} plugin${backendLabel}`,
      },
      { status: 201 }
    );
  } catch (error) {
    console.error('Plugin upload error:', error);
    const message = error instanceof Error ? error.message : 'Internal server error';
    const status =
      message.includes('manifest.json') ||
      message.includes('package') ||
      message.includes('System plugin') ||
      message.includes('Block plugin') ||
      message.includes('entryPoint') ||
      message.includes('admin') ||
      message.includes('Backend plugin') ||
      message.includes('serverEntry')
        ? 400
        : 500;
    return NextResponse.json({ message }, { status });
  }
}
