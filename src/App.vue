<template>
  <div class="app" :class="theme">
    <header class="site-header">
      <div class="header-inner">
        <router-link to="/" class="site-title">bLueriVer</router-link>
        <span class="site-subtitle">#code #life #acgn</span>
        <nav class="site-nav">
          <router-link to="/">Home</router-link>
          <router-link to="/posts">Posts</router-link>
          <router-link to="/tags">Tags</router-link>
          <a :href="githubUrl" target="_blank" rel="noopener">GitHub</a>
        </nav>
        <button class="theme-toggle" @click="toggleTheme" :aria-label="'Switch to ' + (theme === 'dark' ? 'light' : 'dark') + ' mode'">
          {{ theme === 'dark' ? '☀' : '☾' }}
        </button>
      </div>
    </header>
    <main class="site-main">
      <router-view />
    </main>
    <footer class="site-footer">
      <p>&copy; {{ year }} bLueriVer &middot; Powered by Vue.js</p>
    </footer>
  </div>
</template>

<script setup>
import { ref, computed, onMounted, watch } from 'vue'

const githubUrl = 'https://github.com/bLueriVerLHR'
const theme = ref('auto')
const year = computed(() => new Date().getFullYear())

function getPreferredTheme() {
  if (typeof window === 'undefined') return 'light'
  return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light'
}

function applyTheme(t) {
  if (t === 'auto') {
    document.documentElement.setAttribute('data-theme', getPreferredTheme())
  } else {
    document.documentElement.setAttribute('data-theme', t)
  }
}

function toggleTheme() {
  const prefs = ['auto', 'light', 'dark']
  const idx = prefs.indexOf(theme.value)
  theme.value = prefs[(idx + 1) % prefs.length]
}

watch(theme, applyTheme)

onMounted(() => {
  const saved = localStorage.getItem('theme')
  theme.value = saved || 'auto'
  applyTheme(theme.value)
})
</script>
