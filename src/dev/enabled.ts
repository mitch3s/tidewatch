/**
 * Developer tools (URL flags now, god mode in Milestone 5) exist only in dev
 * builds: `npm run dev`, or a build made with VITE_GOD_MODE=1. In a release
 * build this is `false` at compile time, so the code is stripped out.
 */
export const DEV_TOOLS: boolean = import.meta.env.DEV || import.meta.env.VITE_GOD_MODE === '1';
