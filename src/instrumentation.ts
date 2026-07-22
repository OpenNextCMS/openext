export async function register() {
  if (process.env.NEXT_RUNTIME === 'nodejs') {
    const { bootstrapBackendPlugins } = await import('@/lib/plugins/server/bootstrap');
    await bootstrapBackendPlugins();
  }
}
