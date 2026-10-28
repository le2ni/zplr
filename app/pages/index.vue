<script setup lang="ts">
await navigateTo("/editor", { redirectCode: 302, replace: true });
</script>

<template>
  <p><NuxtLink to="/editor">Open the ZPL editor</NuxtLink></p>
</template>
