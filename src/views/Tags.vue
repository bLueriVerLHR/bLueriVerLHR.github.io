<template>
  <div class="tags-page">
    <h2>Tags</h2>
    <div class="tag-cloud">
      <button
        v-for="(posts, tag) in tagMap" :key="tag"
        :class="['tag-cloud-item', { active: selectedTags.has(tag) }]"
        @click="toggleTag(tag)"
      >{{ tag }} ({{ posts.length }})</button>
    </div>
    <div class="tag-filter-bar" v-if="selectedTags.size > 0">
      <span class="filter-label">Filtering:</span>
      <span v-for="tag in [...selectedTags]" :key="tag" class="tag-chip">
        {{ tag }}
        <button class="tag-chip-remove" @click="toggleTag(tag)">&times;</button>
      </span>
      <button class="tag-chip-clear" @click="selectedTags.clear(); updateUrl()">clear all</button>
    </div>
    <div class="post-list" v-if="filteredPosts.length > 0">
      <PostCard v-for="p in filteredPosts" :key="p.slug" :post="p" />
    </div>
    <p class="empty" v-else-if="selectedTags.size > 0">No posts matching all selected tags.</p>
  </div>
</template>

<script setup>
import { ref, computed, onMounted, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { loadTags } from '../utils/posts.js'
import PostCard from '../components/PostCard.vue'

const route = useRoute()
const router = useRouter()
const props = defineProps({ tag: String })
const tagMap = ref({})
const selectedTags = ref(new Set())
const initialized = ref(false)

const filteredPosts = computed(() => {
  const tags = [...selectedTags.value]
  if (tags.length === 0) return []
  const tagEntries = Object.entries(tagMap.value)
  const allPosts = []
  const seen = new Set()
  tagEntries.forEach(([t, posts]) => {
    if (tags.includes(t)) {
      posts.forEach(p => {
        if (!seen.has(p.slug)) {
          seen.add(p.slug)
          allPosts.push(p)
        }
      })
    }
  })
  return allPosts.filter(p => {
    const postTags = Array.isArray(p.tags) ? p.tags.map(t => t.trim()) : (p.tags ? [p.tags.trim()] : [])
    return tags.every(t => postTags.includes(t))
  })
})

function toggleTag(tag) {
  if (selectedTags.value.has(tag)) {
    selectedTags.value.delete(tag)
  } else {
    selectedTags.value.add(tag)
  }
  selectedTags.value = new Set(selectedTags.value)
  updateUrl()
}

function updateUrl() {
  const tags = [...selectedTags.value]
  if (tags.length === 0) {
    router.push('/tags')
  } else {
    router.push('/tags/' + tags.map(encodeURIComponent).join(','))
  }
}

function syncFromUrl() {
  if (props.tag) {
    const tags = props.tag.split(',').map(t => decodeURIComponent(t.trim())).filter(Boolean)
    selectedTags.value = new Set(tags)
  } else if (!initialized.value) {
    selectedTags.value = new Set()
  }
}

onMounted(async () => {
  tagMap.value = await loadTags()
  syncFromUrl()
  initialized.value = true
})

watch(() => props.tag, () => {
  syncFromUrl()
})
</script>
