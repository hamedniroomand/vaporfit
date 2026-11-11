<script setup>
import { useI18n } from 'vue-i18n'

const { t, locale } = useI18n()

function useEnglish() {
  locale.value = 'en'
}

function useFrench() {
  locale.value = 'fr'
}
</script>

<template>
  <p class="text">{{ t('hello') }}</p>
  <p class="locale">{{ locale }}</p>
  <button class="en" type="button" @click="useEnglish">English</button>
  <button class="fr" type="button" @click="useFrench">French</button>
</template>
