<template>
  <header class="site-header sticky top-0 z-40">
    <nav class="mx-auto flex h-16 max-w-[90rem] items-center gap-6 px-5 sm:px-7 lg:px-10" aria-label="Primary navigation">
      <NuxtLink :to="homeUrl" class="site-wordmark flex shrink-0 items-center gap-2.5" aria-label="ZPLr home">
        <img :src="logoUrl" class="h-8 w-auto dark:invert" alt="" />
        <span class="text-sm font-black tracking-[-0.04em]">ZPLr</span>
        <span class="hidden font-mono text-[9px] tracking-[0.14em] uppercase sm:inline">Label systems</span>
      </NuxtLink>

      <div class="mx-auto hidden items-center gap-7 text-xs font-extrabold tracking-[0.08em] uppercase md:flex">
        <NuxtLink :to="`${homeUrl}#features`" class="site-nav-link">Workflow</NuxtLink>
        <NuxtLink :to="`${homeUrl}#designer`" class="site-nav-link">Designer</NuxtLink>
        <NuxtLink :to="`${homeUrl}#library`" class="site-nav-link">Library</NuxtLink>
        <NuxtLink to="/zpl-commands" class="site-nav-link">Commands</NuxtLink>
      </div>

      <div class="ml-auto flex items-center gap-2">
        <a
          href="https://github.com/le2ni/zplr"
          target="_blank"
          rel="noreferrer"
          class="site-header-link hidden h-9 items-center gap-2 px-3 text-sm font-bold sm:inline-flex"
        >
          <IconGithub class="size-4" aria-hidden="true" />
          GitHub
        </a>
        <NuxtLink to="/editor" class="site-header-cta inline-flex h-9 items-center px-3.5 text-sm font-black">
          Open Editor
          <IconArrowRight class="ml-1.5 size-4" aria-hidden="true" />
        </NuxtLink>
      </div>
    </nav>
  </header>
</template>

<script setup lang="ts">
import { IconArrowRight, IconGithub } from "@iconify-prerendered/vue-mdi";
import logoUrl from "../../web/assets/logo.svg";
const config = useRuntimeConfig();
const homeUrl = computed(() => config.public.hasLandingPage ? "/" : `${config.public.siteUrl}/`);
</script>

<style scoped>
.site-header {
  --site-header-ink: rgb(24 24 27);
  --site-header-muted: rgb(82 82 91);
  --site-header-rule: rgb(228 228 231);
  border-bottom: 1px solid var(--site-header-rule);
  background: rgb(255 255 255 / 0.92);
  box-shadow: 0 1px 0 rgb(24 24 27 / 0.02);
  color: var(--site-header-ink);
  backdrop-filter: blur(16px);
}

.site-wordmark > span:last-child {
  border-left: 1px solid var(--site-header-rule);
  padding-left: 0.65rem;
  color: var(--site-header-muted);
}

.site-nav-link {
  position: relative;
}

.site-nav-link::after {
  position: absolute;
  right: 0;
  bottom: -0.35rem;
  left: 0;
  height: 2px;
  background: var(--site-header-ink);
  content: "";
  transform: scaleX(0);
  transform-origin: right;
  transition: transform 180ms ease;
}

.site-nav-link:hover::after,
.site-nav-link:focus-visible::after {
  transform: scaleX(1);
  transform-origin: left;
}

.site-header-link {
  color: var(--site-header-muted);
  transition:
    color 150ms ease,
    background-color 150ms ease;
}

.site-header-link:hover {
  background: rgb(24 24 27 / 0.07);
  color: var(--site-header-ink);
}

.site-header-cta {
  border: 1px solid var(--site-header-ink);
  border-radius: 0.55rem;
  background: var(--site-header-ink);
  color: white;
  transition:
    background-color 150ms ease,
    color 150ms ease,
    transform 150ms ease;
}

.site-header-cta:hover {
  background: rgb(39 39 42);
  color: white;
  transform: translateY(-1px);
}

.site-wordmark:focus-visible,
.site-nav-link:focus-visible,
.site-header-link:focus-visible,
.site-header-cta:focus-visible {
  outline: 3px solid rgb(37 99 235);
  outline-offset: 3px;
}

@media (prefers-color-scheme: dark) {
  .site-header {
    --site-header-ink: rgb(244 244 245);
    --site-header-muted: rgb(161 161 170);
    --site-header-rule: rgb(255 255 255 / 0.1);
    background: rgb(9 9 11 / 0.92);
  }

  .site-header-link:hover {
    background: rgb(255 255 255 / 0.08);
  }

  .site-header-cta {
    color: rgb(24 24 27);
  }

  .site-header-cta:hover {
    background: rgb(228 228 231);
    color: rgb(24 24 27);
  }
}
</style>
