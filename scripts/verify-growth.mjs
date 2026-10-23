import { runUiCheck } from './lib/launch.mjs';

await runUiCheck({ label: 'growth', prefix: 'exc-growth-ui-', artifacts: 'growth', script: 'verify-growth.cjs',
  outputEnv: 'EXCAVATOR_GROWTH_OUTPUT', demoEnv: 'EXCAVATOR_GROWTH_DEMO' });
