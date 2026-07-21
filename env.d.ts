/// <reference types="vite/client" />

declare const __ZPLR_VERSION__: string;
declare const __ZPLR_COMMIT__: string;

declare module "*.vue" {
  import type { DefineComponent } from "vue";
  const component: DefineComponent<{}, {}, any>;
  export default component;
}
