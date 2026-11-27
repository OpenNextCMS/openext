import semver from 'semver';
import { EXTENSION_SDK_VERSION, type ExtensionCapability } from '@/lib/extensions/constants';
import type { ExtensionDiagnostic, ExtensionValidationStatus } from '@/lib/extensions/errors';
import type { ExtensionManifest } from '@/lib/extensions/schema';
import type { StoredExtension, TargetPluginInfo } from '@/lib/extensions/types';

export interface CompatibilityIssue extends ExtensionDiagnostic {
  status: ExtensionValidationStatus;
}

function issue(
  status: ExtensionValidationStatus,
  code: string,
  message: string
): CompatibilityIssue {
  return { status, code, message };
}

export function sdkRangesCompatible(
  extensionRange: string,
  hostRange: string,
  sdkVersion = EXTENSION_SDK_VERSION
): boolean {
  if (!semver.validRange(extensionRange) || !semver.validRange(hostRange)) return false;
  if (!semver.valid(sdkVersion)) return false;
  if (!semver.satisfies(sdkVersion, extensionRange, { includePrerelease: true })) return false;
  if (!semver.satisfies(sdkVersion, hostRange, { includePrerelease: true })) return false;
  return semver.intersects(extensionRange, hostRange, { includePrerelease: true });
}

export function assessCms(manifest: ExtensionManifest, cmsVersion: string): CompatibilityIssue[] {
  const coerced = semver.valid(cmsVersion) ?? semver.valid(semver.coerce(cmsVersion) ?? '');
  if (!coerced || !semver.satisfies(coerced, manifest.compatibility.cms, { includePrerelease: true })) {
    return [
      issue(
        'invalid_package',
        'unsupported_cms',
        `Extension requires CMS ${manifest.compatibility.cms}, but this CMS is ${cmsVersion}.`
      ),
    ];
  }
  return [];
}

export function assessTarget(
  manifest: ExtensionManifest,
  target: TargetPluginInfo | null
): CompatibilityIssue[] {
  if (!target) {
    return [
      issue(
        'missing_target_plugin',
        'missing_target_plugin',
        `Target plugin "${manifest.target.pluginId}" is not installed.`
      ),
    ];
  }

  const pluginVersion = semver.valid(target.version) ?? semver.valid(semver.coerce(target.version) ?? '');
  if (!pluginVersion || !semver.satisfies(pluginVersion, manifest.target.version, { includePrerelease: true })) {
    return [
      issue(
        'incompatible_target_version',
        'incompatible_target_version',
        `Target plugin "${target.pluginId}" is version ${target.version}, which does not satisfy ${manifest.target.version}.`
      ),
    ];
  }

  if (!target.host) {
    return [
      issue(
        'unsupported_sdk',
        'host_not_registered',
        `Target plugin "${target.pluginId}" has not registered an extension host. Enable the plugin and export extensionHost before installing extensions for it.`
      ),
    ];
  }

  if (!sdkRangesCompatible(manifest.compatibility.extensionSdk, target.host.sdkVersion)) {
    return [
      issue(
        'unsupported_sdk',
        'unsupported_sdk',
        `Extension SDK range ${manifest.compatibility.extensionSdk} is not compatible with host range ${target.host.sdkVersion} (runtime SDK ${EXTENSION_SDK_VERSION}).`
      ),
    ];
  }

  const missing = manifest.capabilities.filter(
    (capability) => !target.host?.capabilities.includes(capability)
  );
  if (missing.length > 0) {
    return [
      issue(
        'unsupported_sdk',
        'unsupported_capability',
        `Target plugin "${target.pluginId}" does not support: ${missing.join(', ')}.`
      ),
    ];
  }

  return [];
}

export function dependencyMap(extensions: StoredExtension[]): Map<string, string[]> {
  const graph = new Map<string, string[]>();
  for (const extension of extensions) {
    if (extension.status === 'uninstalled') continue;
    graph.set(
      extension.extensionId,
      extension.dependencies.map((dependency) => dependency.id)
    );
  }
  return graph;
}

export function detectCycle(start: string, graph: Map<string, string[]>): string[] | null {
  const visiting = new Set<string>();
  const visited = new Set<string>();
  const stack: string[] = [];

  function walk(id: string): string[] | null {
    if (visiting.has(id)) {
      const index = stack.indexOf(id);
      return [...stack.slice(index), id];
    }
    if (visited.has(id)) return null;
    visiting.add(id);
    stack.push(id);
    for (const next of graph.get(id) ?? []) {
      const cycle = walk(next);
      if (cycle) return cycle;
    }
    stack.pop();
    visiting.delete(id);
    visited.add(id);
    return null;
  }

  return walk(start);
}

export function assessDependencies(
  manifest: ExtensionManifest,
  extensions: StoredExtension[],
  options: { requireEnabled: boolean }
): CompatibilityIssue[] {
  const issues: CompatibilityIssue[] = [];
  const active = extensions.filter(
    (extension) => extension.extensionId !== manifest.id && extension.status !== 'uninstalled'
  );
  const byId = new Map(active.map((extension) => [extension.extensionId, extension]));

  if (manifest.dependencies.some((dependency) => dependency.id === manifest.id)) {
    issues.push(
      issue('missing_dependency', 'circular_dependency', 'An extension cannot depend on itself.')
    );
  }

  for (const dependency of manifest.dependencies) {
    const installed = byId.get(dependency.id);
    if (!installed || installed.status === 'failed') {
      issues.push(
        issue(
          'missing_dependency',
          'missing_dependency',
          `Required extension "${dependency.id}" (${dependency.version}) is not installed.`
        )
      );
      continue;
    }
    const installedVersion =
      semver.valid(installed.version) ?? semver.valid(semver.coerce(installed.version) ?? '');
    if (
      !installedVersion ||
      !semver.satisfies(installedVersion, dependency.version, { includePrerelease: true })
    ) {
      issues.push(
        issue(
          'missing_dependency',
          'dependency_version',
          `Extension "${dependency.id}" is ${installed.version}, which does not satisfy ${dependency.version}.`
        )
      );
      continue;
    }
    if (options.requireEnabled && installed.status !== 'enabled') {
      issues.push(
        issue(
          'missing_dependency',
          'dependency_disabled',
          `Required extension "${dependency.id}" is ${installed.status}. Enable it before enabling this extension.`
        )
      );
    }
  }

  const graph = dependencyMap(active);
  graph.set(
    manifest.id,
    manifest.dependencies.map((dependency) => dependency.id)
  );
  const cycle = detectCycle(manifest.id, graph);
  if (cycle) {
    issues.push(
      issue(
        'missing_dependency',
        'circular_dependency',
        `Circular extension dependency: ${cycle.join(' → ')}.`
      )
    );
  }

  return issues;
}

export function dependentsOf(extensionId: string, extensions: StoredExtension[]): StoredExtension[] {
  return extensions.filter(
    (extension) =>
      extension.status !== 'uninstalled' &&
      extension.extensionId !== extensionId &&
      extension.dependencies.some((dependency) => dependency.id === extensionId)
  );
}

export function enabledDependents(extensionId: string, extensions: StoredExtension[]): StoredExtension[] {
  return dependentsOf(extensionId, extensions).filter((extension) => extension.status === 'enabled');
}

export function missingCapabilities(
  requested: ExtensionCapability[],
  supported: ExtensionCapability[]
): ExtensionCapability[] {
  return requested.filter((capability) => !supported.includes(capability));
}
