import { runUiCheck } from './lib/launch.mjs';

await runUiCheck({ label: 'catalog', prefix: 'exc-catalog-ui-', artifacts: 'catalog', script: 'verify-catalog.cjs',
  outputEnv: 'EXCAVATOR_CATALOG_OUTPUT', demoEnv: 'EXCAVATOR_CATALOG_DEMO' });
