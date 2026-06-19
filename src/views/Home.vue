<template>
  <div class="home">
    <div class="post-list">
      <PostCard v-for="p in paginatedPosts" :key="p.slug" :post="p" />
    </div>
    <div class="pagination" v-if="totalPages > 1">
      <button :disabled="page <= 1" @click="page--">&laquo; Prev</button>
      <span class="page-info">{{ page }} / {{ totalPages }}</span>
      <button :disabled="page >= totalPages" @click="page++">Next &raquo;</button>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import { loadPosts } from '../utils/posts.js'
import PostCard from '../components/PostCard.vue'

const posts = ref([])
const page = ref(1)
const pageSize = 5

onMounted(async () => {
  posts.value = await loadPosts()
})

const totalPages = computed(() => Math.max(1, Math.ceil(posts.value.length / pageSize)))

const paginatedPosts = computed(() => {
  const start = (page.value - 1) * pageSize
  return posts.value.slice(start, start + pageSize)
})
</script>
