import { createRouter, createWebHashHistory } from 'vue-router'
import Home from '../views/Home.vue'
import Post from '../views/Post.vue'
import Tags from '../views/Tags.vue'

const routes = [
  { path: '/', name: 'home', component: Home },
  { path: '/posts', name: 'posts', component: Home },
  { path: '/post/:slug', name: 'post', component: Post, props: true },
  { path: '/tags', name: 'tags', component: Tags },
  { path: '/tags/:tag', name: 'tag', component: Tags, props: true },
  { path: '/:pathMatch(.*)*', redirect: '/' }
]

const router = createRouter({
  history: createWebHashHistory(),
  routes
})

export default router
