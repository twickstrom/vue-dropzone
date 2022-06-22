<template>
  <div
    :id="id"
    ref="dropzoneElement"
    :class="{ 'vue-dropzone dropzone': includeStyling }"
  >
    <div
      v-if="useCustomSlot"
      class="dz-message"
    >
      <slot>Drop files here to upload</slot>
    </div>
  </div>
</template>

<script>
import Dropzone from "dropzone"
import awsEndpoint from '../services/urlsigner'

export default {
  props: {
    id: {
      type: String,
      required: true,
      default: 'dropzone'
    },
    options: {
      type: Object,
      required: true
    },
    includeStyling: {
      type: Boolean,
      default: true,
      required: false
    },
    awss3: {
      type: Object,
      required: false,
      default: null
    },
    destroyDropzone: {
      type: Boolean,
      default: true,
      required: false
    },
    duplicateCheck: {
      type: Boolean,
      default: false,
      required: false
    },
    useCustomSlot: {
      type: Boolean,
      default: false,
      required: false
    }
  },
  emits: [
    'vdropzone-thumbnail',
    'vdropzone-duplicate-file',
    'vdropzone-file-added',
    'vdropzone-files-added',
    'vdropzone-removed-file',
    'vdropzone-success',
    'vdropzone-error',
    'vdropzone-s3-upload-success',
    'vdropzone-s3-upload-error',
    'vdropzone-success-multiple',
    'vdropzone-error-multiple',
    'vdropzone-sending',
    'vdropzone-sending-multiple',
    'vdropzone-complete',
    'vdropzone-complete-multiple',
    'vdropzone-canceled',
    'vdropzone-canceled-multiple',
    'vdropzone-max-files-reached',
    'vdropzone-max-files-exceeded',
    'vdropzone-processing',
    'vdropzone-processing-multiple',
    'vdropzone-upload-progress',
    'vdropzone-total-upload-progress',
    'vdropzone-reset',
    'vdropzone-queue-complete',
    'vdropzone-drop',
    'vdropzone-drag-start',
    'vdropzone-drag-end',
    'vdropzone-drag-enter',
    'vdropzone-drag-over',
    'vdropzone-drag-leave',
    'vdropzone-mounted',
    'vdropzone-file-added-manually',
  ],
  data () {
    return {
      aws: null,
      isS3: false,
      isS3OverridesServerPropagation: false,
      wasQueueAutoProcess: true,
      files: [],
      dropzoneSettings: {
        thumbnailWidth: 200,
        thumbnailHeight: 200
      }
    }
  },
  watch: {
    options: {
      handler () {
        this.updateSettings()
      },
      deep: true,
    },
    awss3: {
      handler () {
        this.updateAWSSettings()
      },
      deep: true,
    }
  },
  beforeMount () {
    this.updateSettings()
    this.updateAWSSettings()
  },
  mounted () {
    if (this.$isServer && this.hasBeenMounted) {
      return
    }
    this.hasBeenMounted = true

    this.dropzone = new Dropzone(
      this.$refs.dropzoneElement,
      this.dropzoneSettings
    )

    this.dropzone.on('thumbnail', (file, dataUrl) => {
      this.$emit('vdropzone-thumbnail', file, dataUrl)
    })

    this.dropzone.on('addedfile', (file) => {
      if (this.duplicateCheck && this.dropzone.getQueuedFiles().length) {
        this.getQueuedFiles().forEach(existingFile => {
          if (
            existingFile.name === file.name &&
            existingFile.size === file.size &&
            existingFile.lastModifiedDate.toString() === file.lastModifiedDate.toString() &&
            existingFile.dataUrl === file.dataUrl
          ) {
            this.removeFile(file)
            this.$emit('vdropzone-duplicate-file', file)
          }
        })
      }

      this.$emit('vdropzone-file-added', file)

      if (this.isS3 && this.wasQueueAutoProcess && !file.manuallyAdded) {
        this.getSignedAndUploadToS3(file)
      }
    })

    this.dropzone.on('addedfiles', (files) => {
      this.$emit('vdropzone-files-added', files)
    })

    this.dropzone.on('removedfile', (file) => {
      this.$emit('vdropzone-removed-file', file)
      if (file.manuallyAdded && this.dropzone.options.maxFiles !== null)
        this.dropzone.options.maxFiles++
    })

    this.dropzone.on('success', (file, response) => {
      this.$emit('vdropzone-success', file, response)
      if (this.isS3) {
        if (this.isS3OverridesServerPropagation) {
          let xmlResponse = new window.DOMParser().parseFromString(
            response,
            'text/xml'
          )
          let s3ObjectLocation = xmlResponse.firstChild.children[0].innerHTML
          this.$emit('vdropzone-s3-upload-success', s3ObjectLocation)
        }
        if (this.wasQueueAutoProcess) {
          this.setOption('autoProcessQueue', false)
        }
      }
    })

    this.dropzone.on('successmultiple', (file, response) => {
      this.$emit('vdropzone-success-multiple', file, response)
    })

    this.dropzone.on('error', (file, message, xhr) => {
      this.$emit('vdropzone-error', file, message, xhr)
      if (this.isS3) this.$emit('vdropzone-s3-upload-error')
    })

    this.dropzone.on('errormultiple', (files, message, xhr) => {
      this.$emit('vdropzone-error-multiple', files, message, xhr)
    })

    this.dropzone.on('sending', (file, xhr, formData) => {
      if (this.isS3) {
        if (this.isS3OverridesServerPropagation) {
          let signature = file.s3Signature
          Object.keys(signature).forEach(function (key) {
            formData.append(key, signature[key])
          })
        } else {
          formData.append('s3ObjectLocation', file.s3ObjectLocation)
        }
      }
      this.$emit('vdropzone-sending', file, xhr, formData)
    })

    this.dropzone.on('sendingmultiple', (file, xhr, formData) => {
      this.$emit('vdropzone-sending-multiple', file, xhr, formData)
    })

    this.dropzone.on('complete', (file) => {
      this.$emit('vdropzone-complete', file)
    })

    this.dropzone.on('completemultiple', (files) => {
      this.$emit('vdropzone-complete-multiple', files)
    })

    this.dropzone.on('canceled', (file) => {
      this.$emit('vdropzone-canceled', file)
    })

    this.dropzone.on('canceledmultiple', (files) => {
      this.$emit('vdropzone-canceled-multiple', files)
    })

    this.dropzone.on('maxfilesreached', (files) => {
      this.$emit('vdropzone-max-files-reached', files)
    })

    this.dropzone.on('maxfilesexceeded', (file) => {
      this.$emit('vdropzone-max-files-exceeded', file)
    })

    this.dropzone.on('processing', (file) => {
      this.$emit('vdropzone-processing', file)
    })

    this.dropzone.on('processingmultiple', (files) => {
      this.$emit('vdropzone-processing-multiple', files)
    })

    this.dropzone.on('uploadprogress', (file, progress, bytesSent) => {
      this.$emit('vdropzone-upload-progress', file, progress, bytesSent)
    })

    this.dropzone.on('totaluploadprogress', (totaluploadprogress, totalBytes, totalBytesSent) => {
      this.$emit(
        'vdropzone-total-upload-progress',
        totaluploadprogress,
        totalBytes,
        totalBytesSent
      )
    })

    this.dropzone.on('reset', () => {
      this.$emit('vdropzone-reset')
    })

    this.dropzone.on('queuecomplete', () => {
      this.$emit('vdropzone-queue-complete')
    })

    this.dropzone.on('drop', (event) => {
      this.$emit('vdropzone-drop', event)
    })

    this.dropzone.on('dragstart', (event) => {
      this.$emit('vdropzone-drag-start', event)
    })

    this.dropzone.on('dragend', (event) => {
      this.$emit('vdropzone-drag-end', event)
    })

    this.dropzone.on('dragenter', (event) => {
      this.$emit('vdropzone-drag-enter', event)
    })

    this.dropzone.on('dragover', (event) => {
      this.$emit('vdropzone-drag-over', event)
    })

    this.dropzone.on('dragleave', (event) => {
      this.$emit('vdropzone-drag-leave', event)
    })

    this.$emit('vdropzone-mounted')
  },
  beforeUnmount () {
    if (this.destroyDropzone) {
      this.dropzone.destroy()
    }
  },
  methods: {
    updateAWSSettings () {
      if (this.awss3 !== null) {
        this.aws = {...this.awss3}
        this.dropzoneSettings['autoProcessQueue'] = false
        this.isS3 = true
        this.isS3OverridesServerPropagation = this.aws.sendFileToServer === false
        if (this.options.autoProcessQueue !== undefined) {
          this.wasQueueAutoProcess = this.options.autoProcessQueue
        }

        if (this.isS3OverridesServerPropagation) {
          this.dropzoneSettings['url'] = files => files[0].s3Url
        }
      }
    },
    updateSettings () {
      this.dropzoneSettings = Object.assign(this.dropzoneSettings, this.options)
    },
    manuallyAddFile: function (file, fileUrl) {
      file.manuallyAdded = true
      this.dropzone.emit('addedfile', file)
      let containsImageFileType = false
      if (
        fileUrl.indexOf('.svg') > -1 ||
        fileUrl.indexOf('.png') > -1 ||
        fileUrl.indexOf('.jpg') > -1 ||
        fileUrl.indexOf('.jpeg') > -1 ||
        fileUrl.indexOf('.gif') > -1 ||
        fileUrl.indexOf('.webp') > -1
      )
        containsImageFileType = true
      if (
        this.dropzone.options.createImageThumbnails &&
        containsImageFileType &&
        file.size <= this.dropzone.options.maxThumbnailFilesize * 1024 * 1024
      ) {
        fileUrl && this.dropzone.emit('thumbnail', file, fileUrl)

        let thumbnails = file.previewElement.querySelectorAll(
          '[data-dz-thumbnail]'
        )
        for (let i = 0; i < thumbnails.length; i++) {
          thumbnails[i].style.width =
            this.dropzoneSettings.thumbnailWidth + 'px'
          thumbnails[i].style.height =
            this.dropzoneSettings.thumbnailHeight + 'px'
          thumbnails[i].style['object-fit'] = 'contain'
        }
      }
      this.dropzone.emit('complete', file)
      if (this.dropzone.options.maxFiles) this.dropzone.options.maxFiles--
      this.dropzone.files.push(file)
      this.$emit('vdropzone-file-added-manually', file)
    },
    setOption: function (option, value) {
      this.dropzone.options[option] = value
    },
    removeAllFiles: function (bool) {
      this.dropzone.removeAllFiles(bool)
    },
    processQueue: function () {
      let dropzoneEle = this.dropzone
      if (this.isS3 && !this.wasQueueAutoProcess) {
        this.getQueuedFiles().forEach(file => {
          this.getSignedAndUploadToS3(file)
        })
      } else {
        this.dropzone.processQueue()
      }
      this.dropzone.on('success', function () {
        dropzoneEle.options.autoProcessQueue = true
      })
      this.dropzone.on('queuecomplete', function () {
        dropzoneEle.options.autoProcessQueue = false
      })
    },
    init: function () {
      return this.dropzone.init()
    },
    destroy: function () {
      return this.dropzone.destroy()
    },
    updateTotalUploadProgress: function () {
      return this.dropzone.updateTotalUploadProgress()
    },
    getFallbackForm: function () {
      return this.dropzone.getFallbackForm()
    },
    getExistingFallback: function () {
      return this.dropzone.getExistingFallback()
    },
    setupEventListeners: function () {
      return this.dropzone.setupEventListeners()
    },
    removeEventListeners: function () {
      return this.dropzone.removeEventListeners()
    },
    disable: function () {
      return this.dropzone.disable()
    },
    enable: function () {
      return this.dropzone.enable()
    },
    filesize: function (size) {
      return this.dropzone.filesize(size)
    },
    accept: function (file, done) {
      return this.dropzone.accept(file, done)
    },
    addFile: function (file) {
      return this.dropzone.addFile(file)
    },
    removeFile: function (file) {
      this.dropzone.removeFile(file)
    },
    getAcceptedFiles: function () {
      return this.dropzone.getAcceptedFiles()
    },
    getRejectedFiles: function () {
      return this.dropzone.getRejectedFiles()
    },
    getFilesWithStatus: function () {
      return this.dropzone.getFilesWithStatus()
    },
    getQueuedFiles: function () {
      return this.dropzone.getQueuedFiles()
    },
    getUploadingFiles: function () {
      return this.dropzone.getUploadingFiles()
    },
    getAddedFiles: function () {
      return this.dropzone.getAddedFiles()
    },
    getActiveFiles: function () {
      return this.dropzone.getActiveFiles()
    },
    getSignedAndUploadToS3 (file) {
      let promise = awsEndpoint.sendFile(
        file,
        this.aws,
        this.isS3OverridesServerPropagation
      )
      if (!this.isS3OverridesServerPropagation) {
        promise.then(response => {
          if (response.success) {
            file.s3ObjectLocation = response.message
            setTimeout(() => this.dropzone.processFile(file))
            this.$emit('vdropzone-s3-upload-success', response.message)
          } else {
            if ('undefined' !== typeof response.message) {
              this.$emit('vdropzone-s3-upload-error', response.message)
            } else {
              this.$emit(
                'vdropzone-s3-upload-error',
                'Network Error : Could not send request to AWS. (Maybe CORS error)'
              )
            }
          }
        })
      } else {
        promise.then(() => {
          setTimeout(() => this.dropzone.processFile(file))
        })
      }
      promise.catch(error => {
        alert(error)
      })
    },
    setAWSSigningURL (location) {
      if (this.isS3 && this.aws) {
        this.aws.signingURL = location
      }
    }
  }
}
</script>

<style>
.vue-dropzone {
  border: 2px solid #e5e5e5;
  font-family: "Arial", sans-serif;
  letter-spacing: 0.2px;
  color: #777;
  transition: 0.2s linear;
}

.vue-dropzone:hover {
  background-color: #f6f6f6;
}

.vue-dropzone > i {
  color: #ccc;
}

.vue-dropzone > .dz-preview .dz-image {
  border-radius: 0;
  width: 100%;
  height: 100%;
}

.vue-dropzone > .dz-preview .dz-image img:not([src]) {
  width: 200px;
  height: 200px;
}

.vue-dropzone > .dz-preview .dz-image:hover img {
  transform: none;
  -webkit-filter: none;
}

.vue-dropzone > .dz-preview .dz-details {
  bottom: 0;
  top: 0;
  color: white;
  background-color: rgba(33, 150, 243, 0.8);
  transition: opacity 0.2s linear;
  text-align: left;
}

.vue-dropzone > .dz-preview .dz-details .dz-filename {
  overflow: hidden;
}

.vue-dropzone > .dz-preview .dz-details .dz-filename span,
.vue-dropzone > .dz-preview .dz-details .dz-size span {
  background-color: transparent;
}

.vue-dropzone > .dz-preview .dz-details .dz-filename:not(:hover) span {
  border: none;
}

.vue-dropzone > .dz-preview .dz-details .dz-filename:hover span {
  background-color: transparent;
  border: none;
}

.vue-dropzone > .dz-preview .dz-progress .dz-upload {
  background: #cccccc;
}

.vue-dropzone > .dz-preview .dz-remove {
  position: absolute;
  z-index: 30;
  color: white;
  margin-left: 15px;
  padding: 10px;
  top: inherit;
  bottom: 15px;
  border: 2px white solid;
  text-decoration: none;
  text-transform: uppercase;
  font-size: 0.8rem;
  font-weight: 800;
  letter-spacing: 1.1px;
  opacity: 0;
}

.vue-dropzone > .dz-preview:hover .dz-remove {
  opacity: 1;
}

.vue-dropzone > .dz-preview .dz-success-mark,
.vue-dropzone > .dz-preview .dz-error-mark {
  margin-left: auto;
  margin-top: auto;
  width: 100%;
  top: 35%;
  left: 0;
}

.vue-dropzone > .dz-preview .dz-success-mark svg,
.vue-dropzone > .dz-preview .dz-error-mark svg {
  margin-left: auto;
  margin-right: auto;
}

.vue-dropzone > .dz-preview .dz-error-message {
  margin-left: auto;
  margin-right: auto;
  left: 0;
  width: 100%;
  text-align: center;
}

.vue-dropzone > .dz-preview .dz-error-message:after {
  display: none;
}
</style>
