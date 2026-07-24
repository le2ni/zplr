<template>
  <Suspense>
    <EditorWorkspace />
    <template #fallback>
      <EditorLoadingShell />
    </template>
  </Suspense>
</template>

<script setup lang="ts">
import { defineAsyncComponent } from "vue";

const EditorWorkspace = defineAsyncComponent(
  () => import("../../web/components/EditorWorkspace.vue"),
);
</script>
