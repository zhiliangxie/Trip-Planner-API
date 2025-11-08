import { buildApp } from './app';
import { config } from './config/env';

async function start() {
  const app = await buildApp();
  await app.listen({ port: config.port, host: '0.0.0.0' });
  console.log(`Server listening on port ${config.port}`);
}

start().catch((err) => {
  console.error(err);
  process.exit(1);
});
