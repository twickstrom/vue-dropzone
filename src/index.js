import vueDropzone from './components/vue-dropzone.vue'

export default {
  install: (app, options) => {
    app.component('vue-dropzone', vueDropzone)
  }
}
