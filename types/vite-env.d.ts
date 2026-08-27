/// <reference types="vite/client" />

// Vite's `?raw` suffix imports a file's contents as a string. Used by
// `components/foundations/foundations.story.tsx` to read `styles/theme.css`
// so the Foundations gallery stays in sync with the token file automatically.
declare module "*?raw" {
    const content: string;
    export default content;
}
