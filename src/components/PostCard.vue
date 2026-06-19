<template>
  <div class="post-card">
    <h2 class="post-card-title">
      <router-link :to="'/post/' + post.slug">{{ post.title }}</router-link>
    </h2>
    <div class="post-card-meta">
      <time :datetime="post.date">{{ formatDate(post.date) }}</time>
    </div>
    <p class="post-card-desc" v-if="post.description">{{ post.description }}</p>
    <div class="post-card-tags" v-if="tagList.length > 0">
      <TagBadge v-for="tag in tagList" :key="tag" :tag="tag" />
    </div>
  </div>
</template>

<script setup>
import { computed } from 'vue'
import TagBadge from './TagBadge.vue'

const props = defineProps({ post: Object })

const tagList = computed(() => {
  const tags = props.post.tags
  return Array.isArray(tags) ? tags : (tags ? [tags] : [])
})

function formatDate(dateStr) {
  const d = new Date(dateStr)
  return d.toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' })
}
</script>
