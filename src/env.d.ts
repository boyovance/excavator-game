import type { ExcavatorApi } from './api';

declare global {
  interface Window {
    api?: ExcavatorApi;
  }
}

export {};
