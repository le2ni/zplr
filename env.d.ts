/// <reference types="vite/client" />

declare module "monaco-editor/esm/vs/editor/edcore.main.js";

declare const __ZPLR_VERSION__: string;
declare const __ZPLR_COMMIT__: string;

declare module "*.vue" {
  import type { DefineComponent } from "vue";
  const component: DefineComponent<{}, {}, any>;
  export default component;
}
