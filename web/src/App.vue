<script setup lang="ts">
import { RouterLink, RouterView } from 'vue-router'
</script>

<template>
  <header class="site-header">
    <nav>
      <RouterLink :to="{ name: 'day' }" class="brand">予約管理</RouterLink>
      <RouterLink :to="{ name: 'day' }">一覧</RouterLink>
      <RouterLink :to="{ name: 'new' }">新しい予約</RouterLink>
    </nav>
  </header>
  <main>
    <RouterView />
  </main>
</template>
