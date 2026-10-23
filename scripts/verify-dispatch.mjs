import { runUiCheck } from './lib/launch.mjs';

await runUiCheck({ label: 'dispatch', prefix: 'exc-dispatch-', artifacts: 'dispatch', script: 'verify-dispatch.cjs',
  outputEnv: 'EXCAVATOR_DISPATCH_OUTPUT', demoEnv: 'EXCAVATOR_DISPATCH_DEMO' });
