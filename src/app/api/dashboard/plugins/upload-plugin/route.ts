import { NextRequest, NextResponse } from 'next/server';
import { getUserDbConnection, getPluginModel } from '@/utils/db';
import { extractPluginZip } from '@/lib/plugins/extract';
import { getMaxPluginZipBytes } from '@/lib/plugins/uploadLimits';
import { installBackendPlugin, rollbackPluginInstall } from '@/lib/plugins/server/lifecycle';
import { registerPluginUserTypes, unregisterPluginUserTypes } from '@/lib/rbac/pluginUserTypes';
import {
  pendingDependenciesMessage,
  registerUploadDependencies,
} from '@/lib/cmsDependencies';
import { handleApiError } from '@/lib/api/response';
import { requireCapability } from '@/lib/rbac';
import { ApiError } from '@/lib/api/errors';

export async function POST(req: NextRequest) {
  try {
    await requireCapability('plugins.manage');
    const formData = await req.formData();
    const file = formData.get('file');

    if (!(file instanceof File)) {
      return NextResponse.json({ message: 'No file uploaded' }, { status: 400 });
    }

    if (!file.name.toLowerCase().endsWith('.zip')) {
      return NextResponse.json({ message: 'Only .zip plugin packages are supported' }, { status: 400 });
    }

    const maxPluginZipBytes = await getMaxPluginZipBytes();
    if (file.size > maxPluginZipBytes) {
      return NextResponse.json(
        {
          message: `Plugin package exceeds the ${Math.floor(maxPluginZipBytes / (1024 * 1024))}MB limit`,
        },
        { status: 400 }
      );
    }

    const arrayBuffer = await file.arrayBuffer();
    const extracted = await extractPluginZip(arrayBuffer);
    const dependencies = extracted.dependencies ?? [];
    const { status: depStatus, addedToPackageJson } = registerUploadDependencies(dependencies);
    const depsReady = depStatus.satisfied;
    const pendingDependencies = [
      ...new Set([...depStatus.missingInPackageJson, ...depStatus.notInstalled]),
    ];

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
        isActive: depsReady,
        icon: extracted.manifest.icon || '🧩',
        entryPoint: extracted.entryPoint,
        adminEntry: extracted.adminEntry,
        adminMount: extracted.adminMount,
        adminNav: extracted.adminNav,
        blockEntry: extracted.blockEntry,
        customElement: extracted.manifest.customElement,
        styles: extracted.styles,
        source: 'uploaded',
        hasBackend: extracted.hasBackend,
        serverEntry: extracted.serverEntry,
        apiPrefix: extracted.hasBackend ? `/api/plugins/${extracted.manifest.pluginId}` : undefined,
        permissions: extracted.permissions,
        featureCatalog: extracted.featureCatalog,
        migrations: extracted.migrations,
        dependencies,
        installHook: extracted.installHook,
        uninstallHook: extracted.uninstallHook,
      });

      if (extracted.userTypes.length > 0) {
        await registerPluginUserTypes(extracted.manifest.pluginId, extracted.userTypes);
      }
    } catch (dbError) {
      await unregisterPluginUserTypes(extracted.manifest.pluginId).catch(() => undefined);
      await rollbackPluginInstall(extracted.manifest.pluginId);
      throw dbError;
    }

    let backendResult = null;
    if (extracted.hasBackend && extracted.serverEntry && depsReady) {
      try {
        backendResult = await installBackendPlugin({
          pluginId: extracted.manifest.pluginId,
          serverEntry: extracted.serverEntry,
          migrations: extracted.migrations,
          permissions: extracted.permissions,
          installHook: extracted.installHook,
          uninstallHook: extracted.uninstallHook,
          dependencies,
          enableAfterInstall: true,
        });
      } catch (backendError) {
        await unregisterPluginUserTypes(extracted.manifest.pluginId).catch(() => undefined);
        await PluginModel.findOneAndDelete({ pluginId: extracted.manifest.pluginId });
        await rollbackPluginInstall(extracted.manifest.pluginId);
        throw backendError;
      }
    }

    const kindLabel = extracted.kind === 'system' ? 'system (dashboard)' : 'block (editor)';
    const backendLabel = extracted.hasBackend ? ' with backend APIs' : '';
    const pluginLabel = `Plugin "${extracted.manifest.pluginId}"`;
    const message = depsReady
      ? `Plugin extracted and installed as a ${kindLabel} plugin${backendLabel}`
      : pendingDependenciesMessage(pluginLabel, depStatus);

    return NextResponse.json(
      {
        plugin: newPlugin,
        kind: extracted.kind,
        hasBackend: extracted.hasBackend,
        backend: backendResult,
        requiresNpmInstall: !depsReady && dependencies.length > 0,
        pendingDependencies,
        addedToPackageJson,
        message,
      },
      { status: 201 }
    );
  } catch (error) {
    console.error('Plugin upload error:', error);
    if (error instanceof ApiError) {
      return handleApiError(error);
    }
    const message = error instanceof Error ? error.message : 'Internal server error';
    const status =
      message.includes('manifest.json') ||
      message.includes('package') ||
      message.includes('System plugin') ||
      message.includes('Block plugin') ||
      message.includes('entryPoint') ||
      message.includes('admin') ||
      message.includes('Backend plugin') ||
      message.includes('serverEntry') ||
      message.includes('api/roles') ||
      message.includes('userTypes')
        ? 400
        : 500;
    return NextResponse.json({ message }, { status });
  }
}
