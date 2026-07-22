import 'dotenv/config';
import { getUserDbConnection, getPluginModel } from '../src/utils/db';

async function main() {
  await getUserDbConnection();
  const Plugin = getPluginModel();
  const all = await Plugin.find({}).sort({ createdAt: -1 }).lean();
  console.log('Total plugins:', all.length);
  for (const p of all) {
    console.log(`- ${p.pluginId} | ${p.name} | active: ${p.isActive} | backend: ${p.hasBackend}`);
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
