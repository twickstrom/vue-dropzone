import vueDropzone from './components/vue-dropzone.vue'

export default vueDropzone

export default {
  install: (app, options) => {
    app.component('vue-dropzone', vueDropzone);
  }
}
