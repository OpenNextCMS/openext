import assert from 'assert';
import {
  parsePluginManifest,
  resolvePluginKind,
} from '../src/lib/plugins/manifest';

function testBlockExplicit() {
  const manifest = parsePluginManifest({
    id: 'hello-block',
    name: 'Hello Block',
    version: '1.0.0',
    kind: 'block',
    entryPoint: 'index.js',
  });
  const resolved = resolvePluginKind(manifest, ['index.js', 'styles.css']);
  assert.strictEqual(resolved.kind, 'block');
  assert.strictEqual(resolved.entryPoint, 'index.js');
  console.log('ok: block explicit');
}

function testSystemFromFolder() {
  const manifest = parsePluginManifest({
    id: 'my-crm',
    name: 'My CRM',
    version: '1.0.0',
  });
  const resolved = resolvePluginKind(manifest, ['admin/index.html', 'admin/app.js']);
  assert.strictEqual(resolved.kind, 'system');
  assert.strictEqual(resolved.adminEntry, 'admin/index.html');
  assert.strictEqual(resolved.blockEntry, undefined);
  console.log('ok: system from admin/ folder');
}

function testSystemWithBlock() {
  const manifest = parsePluginManifest({
    id: 'crm-plus',
    name: 'CRM Plus',
    version: '1.0.0',
    kind: 'system',
  });
  const resolved = resolvePluginKind(manifest, [
    'admin/index.html',
    'block/index.js',
    'block/styles.css',
  ]);
  assert.strictEqual(resolved.kind, 'system');
  assert.strictEqual(resolved.adminEntry, 'admin/index.html');
  assert.strictEqual(resolved.blockEntry, 'block/index.js');
  console.log('ok: system with optional block/');
}

function testTypeAsKind() {
  const manifest = parsePluginManifest({
    id: 'sys-type',
    name: 'Sys Type',
    version: '1.0.0',
    type: 'system',
    adminEntry: 'admin/index.html',
  });
  const resolved = resolvePluginKind(manifest, ['admin/index.html']);
  assert.strictEqual(resolved.kind, 'system');
  assert.strictEqual(resolved.type, 'system');
  console.log('ok: type used as kind');
}

testBlockExplicit();
testSystemFromFolder();
testSystemWithBlock();
testTypeAsKind();
console.log('All plugin kind tests passed');
