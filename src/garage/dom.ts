export const $ = <T extends HTMLElement>(id: string) => document.getElementById(id) as T;

export const canvas = $<HTMLCanvasElement>('preview');
export const gridEl = $('grid');
export const tabsEl = $('tabs');
export const skinEl = $<HTMLSelectElement>('skin');
export const jobsEl = $('jobs');
export const reportEl = $('report');
