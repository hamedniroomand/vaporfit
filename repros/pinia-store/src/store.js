import { defineStore } from 'pinia'

export const useCounter = defineStore('counter', {
  state: () => ({ n: 0, name: 'Ada' }),
  getters: {
    label: state => state.name + ':' + state.n,
  },
  actions: {
    inc() {
      this.n += 1
    },
    reset() {
      this.n = 0
    },
  },
})
