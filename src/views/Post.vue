<template>
  <div class="post-page" v-if="post">
    <article class="post-article">
      <header class="post-header">
        <h1 class="post-title">{{ post.title }}</h1>
        <div class="post-meta">
          <time :datetime="post.date">{{ formatDate(post.date) }}</time>
          &middot;
          <span class="post-authors">{{ authorList }}</span>
          <span v-if="post.draft" class="draft-label">DRAFT</span>
        </div>
      </header>
      <div class="post-layout" v-if="toc.length > 0">
        <section class="post-body" ref="bodyRef" v-html="post.html"></section>
        <aside class="toc-sidebar">
          <nav class="toc" ref="tocRef">
            <strong>Table of contents:</strong>
            <ul>
              <li v-for="h in toc" :key="h.id" :style="{ paddingLeft: (h.level - 2) * 14 + 'px' }">
                <a :href="'#' + h.id" :class="{ active: activeId === h.id }" @click.prevent="scrollTo(h.id)">{{ h.text }}</a>
              </li>
            </ul>
          </nav>
        </aside>
      </div>
      <div v-else class="post-layout">
        <section class="post-body" v-html="post.html"></section>
      </div>
      <div class="post-tags" v-if="tagList.length > 0">
        <TagBadge v-for="tag in tagList" :key="tag" :tag="tag" />
      </div>
    </article>
  </div>
  <div class="post-not-found" v-else-if="!loading">
    <h2>Post not found</h2>
    <router-link to="/">← Back to home</router-link>
  </div>
  <div class="loading" v-else>Loading...</div>
</template>

<script setup>
import { ref, computed, onMounted, onUnmounted, watch, nextTick } from 'vue'
import { loadPost, extractToc } from '../utils/posts.js'
import TagBadge from '../components/TagBadge.vue'

const props = defineProps({ slug: String })
const post = ref(null)
const loading = ref(true)
const activeId = ref('')
const bodyRef = ref(null)
const tocRef = ref(null)

const tagList = computed(() => {
  if (!post.value) return []
  const tags = post.value.tags
  return Array.isArray(tags) ? tags : (tags ? [tags] : [])
})

const authorList = computed(() => {
  if (!post.value) return ''
  const authors = post.value.authors
  return Array.isArray(authors) ? authors.join(', ') : (authors || '')
})

const toc = computed(() => {
  if (!post.value) return []
  return extractToc(post.value.html)
})

function formatDate(dateStr) {
  const d = new Date(dateStr)
  return d.toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' })
}

function scrollTo(id) {
  const el = document.getElementById(id)
  if (el) {
    el.scrollIntoView({ behavior: 'smooth', block: 'start' })
  }
}

function onBodyClick(e) {
  const link = e.target.closest('a[href^="#"]')
  if (!link) return
  const id = link.getAttribute('href').slice(1)
  if (id) scrollTo(id)
  e.preventDefault()
}

let observer = null

function observeHeadings() {
  if (!bodyRef.value) return
  const headings = bodyRef.value.querySelectorAll('h2[id], h3[id], h4[id]')
  if (headings.length === 0) return

  observer = new IntersectionObserver(entries => {
    for (const entry of entries) {
      if (entry.isIntersecting) {
        activeId.value = entry.target.id
        break
      }
    }
  }, { rootMargin: '-10% 0px -70% 0px', threshold: 0 })

  headings.forEach(h => observer.observe(h))
}

async function fetchPost() {
  loading.value = true
  post.value = await loadPost(props.slug)
  loading.value = false
  await nextTick()
  observeHeadings()
  if (bodyRef.value) {
    bodyRef.value.addEventListener('click', onBodyClick)
  }
}

onMounted(fetchPost)
watch(() => props.slug, fetchPost)
onUnmounted(() => {
  if (observer) observer.disconnect()
  if (bodyRef.value) {
    bodyRef.value.removeEventListener('click', onBodyClick)
  }
})
</script>
