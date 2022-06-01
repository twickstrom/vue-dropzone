# vue-dropzone

**Drop in replacement of vue2-dropzone that supports vue3**

A Vue component for file uploads, powered by [Dropzone.js](http://www.dropzonejs.com/). [Check out the demo](https://rowanwins.github.io/vue-dropzone/docs/dist/index.html).

---

![](https://i.imgur.com/kUbjks1.gif)

## Development

``` bash
# install your dependencies
npm install

# install vue-dropzone
npm install vue2-dropzone-vue3

(or with yarn)

yarn add vue2-dropzone-vue3
```

## Usage

```javascript
<template>
  <vue-dropzone
    ref="myVueDropzone" 
    id="dropzone" 
    :options="dropzoneOptions"
  />
</template>  
<script>
import vueDropzone from 'vue2-dropzone-vue3'

export default {
  components: {
    vueDropzone,
  },
  data () {
    return {
      dropzoneOptions: {
        url: 'https://httpbin.org/post',
        thumbnailWidth: 150,
        maxFilesize: 0.5,
        headers: { "My-Awesome-Header": "header value" }
      }
    }
  }
  ...
}
```

[![Donate](https://img.shields.io/badge/Donate-PayPal-green.svg)](https://www.paypal.com/donate/?hosted_button_id=TU39WLXAJQTR4)
[![NPM](https://img.shields.io/npm/v/vue2-dropzone-vue3)](https://www.npmjs.com/package/vue2-dropzone-vue3)
[![vue3](https://img.shields.io/badge/vue-3.x-brightgreen.svg)](https://vuejs.org/)
[![NPM Downloads](https://img.shields.io/npm/dm/vue2-dropzone-vue3)](https://www.npmjs.com/package/vue2-dropzone-vue3)
[![Reputation](https://img.shields.io/stackexchange/stackoverflow/r/787796)](https://stackoverflow.com/users/787796/tim-wickstrom)