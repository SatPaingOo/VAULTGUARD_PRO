/**
 * App version – single source of truth from package.json via Vite define.
 * Use this everywhere in the app (PDF, UI, etc.) so version is updated in one place.
 */
export const APP_VERSION: string =
  typeof __APP_VERSION__ !== 'undefined' ? __APP_VERSION__ : '0.0.0';
