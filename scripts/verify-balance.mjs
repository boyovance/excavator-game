import { runUiCheck } from './lib/launch.mjs';

// The sandbox page has no save or local service, so it needs neither default settings nor the debug admin route.
await runUiCheck({ label: 'economy', prefix: 'exc-balance-ui-', artifacts: 'balance', script: 'verify-balance.cjs',
  outputEnv: 'EXCAVATOR_BALANCE_OUTPUT', demoEnv: 'EXCAVATOR_BALANCE_DEMO', settings: null, debug: false });
