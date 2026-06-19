<template>
  <router-link :to="'/tags/' + encodeURIComponent(tag)" class="tag-badge">{{ tag }}</router-link>
</template>

<script setup>
defineProps({ tag: String })
</script>
