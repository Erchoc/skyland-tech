/// <reference types="astro/client" />

declare global {
  interface Window {
    umami?: {
      track: (event: string, data?: Record<string, unknown>) => void;
    };
  }
}

export {};
