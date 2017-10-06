function getOrientationCallback(file, callback) {
  var reader = new FileReader();
  reader.onload = function(e) {

    var view = new DataView(e.target.result);
    if (view.getUint16(0, false) != 0xFFD8) return callback(-2);
    var length = view.byteLength, offset = 2;
    while (offset < length) {
      var marker = view.getUint16(offset, false);
      offset += 2;
      if (marker == 0xFFE1) {
        if (view.getUint32(offset += 2, false) != 0x45786966) return callback(-1);
        var little = view.getUint16(offset += 6, false) == 0x4949;
        offset += view.getUint32(offset + 4, little);
        var tags = view.getUint16(offset, little);
        offset += 2;
        for (var i = 0; i < tags; i++)
          if (view.getUint16(offset + (i * 12), little) == 0x0112)
            return callback(view.getUint16(offset + (i * 12) + 8, little));
      }
      else if ((marker & 0xFF00) != 0xFF00) break;
      else offset += view.getUint16(offset, false);
    }
    return callback(-1);
  };
  reader.readAsArrayBuffer(file);
}

// Check EXIF of uploaded pic for orientation data
// Resolves to -2 if image is not jpeg
// Resolves to -1 if orientation is not defined
const getOrientation = (upload) =>
  new Promise((resolve, reject) => {
    if (orientaionSelectEl.value === '0') resolve(false)
    metrics.orientationStart = performance.now()
    const reader = new FileReader()
    reader.onload = (e) => {
      const view = new DataView(e.target.result)
      if (view.getUint16(0, false) !== 0xFFD8) {
        metrics.orientationFinish = performance.now()
        resolve(-2) // not jpeg
      }
      const length = view.byteLength
      let offset = 2
      while (offset < length) {
        const marker = view.getUint16(offset, false)
        offset += 2
        if (marker === 0xFFE1) {
          if (view.getUint32(offset += 2, false) !== 0x45786966) {
            metrics.orientationFinish = performance.now()
            resolve(-1)
          }
          let little = view.getUint16(offset += 6, false) === 0x4949
          offset += view.getUint32(offset + 4, little)
          const tags = view.getUint16(offset, little)
          offset += 2
          for (let i = 0; i < tags; i++) {
            if(view.getUint16(offset + (i * 12), little) === 0x0112) {
              const orientation = view.getUint16(offset + (i * 12) + 8, little)
              metrics.orientationFinish = performance.now()
              return resolve(orientation)
            }
          }
        } else if ((marker & 0xFF00) !== 0xFF00) {
          break
        } else {
          offset += view.getUint16(offset, false)
        }
      }
      metrics.orientationFinish = performance.now()
      resolve(-1) // orientation not defined
    }

    reader.readAsArrayBuffer(upload)
  })

const outputDiv = document.getElementById('outputDiv')

const models = ['general', 'apparel', 'color']

// temp helper function to check file sizes
const getFileSize = base64String =>
  Math.round((base64String.length * 6) / 8 / 1024)

let metrics = {} // performance guage, delete later

const getImageWithCompression = () => {
  metrics.startTime = performance.now()
  if (imageCaptureEl.files && imageCaptureEl.files[0]) {
    const upload = imageCaptureEl.files[0]
    const preppedImage = prepareImageForCompression(upload)
    const orientation = getOrientation(upload)
    Promise.all([preppedImage, orientation])
      .then(([img, orientation]) => compressImage(img, orientation))
      .then(compressedImage => sendImage(compressedImage.split(',')[1]))
      .then(() => {
        metrics.finish = performance.now()
      })
  } else {
    // user tried to upload a photo but something went wrong
    // or they cancelled the upload
  }
}

const prepareImageForCompression = upload =>
  new Promise((resolve, reject) => {
    const start = performance.now()
    const reader = new FileReader()
    reader.onload = (pic) => {
      const img = new Image()
      img.onload = () => {
        metrics.prepTime = performance.now() - start
        resolve(img)
      }
      img.src = pic.target.result
      metrics.originalBase64 = img.src
    }
    reader.readAsDataURL(upload)
  })

const compressImage = (image, orientation) => {
  metrics.orientation = orientation
  console.log(orientation)
  const start = performance.now()

  // Tweak these values to balance filesize vs quality
  const MAX_WIDTH = 450
  const MAX_HEIGHT = 630

  // Resize image
  if (image.width > MAX_WIDTH) {
    const resizeRatio = MAX_WIDTH / image.width
    image.width *= resizeRatio
    image.height *= resizeRatio
  }
  if (image.height > MAX_HEIGHT) {
    const resizeRatio = MAX_HEIGHT / image.height
    image.width *= resizeRatio
    image.height *= resizeRatio
  }

  const canvas = document.createElement('canvas')
  canvas.width = image.width
  canvas.height = image.height
  const ctx = canvas.getContext('2d')
  ctx.drawImage(image, 0, 0, image.width, image.height)

  // rotateImage(canvas, ctx, orientation)

  const compressed = canvas.toDataURL('image/jpeg', 0.8)
  const finish = performance.now()
  metrics.compressionTime = finish - start
  metrics.finalBase64 = compressed
  return compressed
}

const rotateImage = (canvas, ctx, orientation) => {
  if (!orientation) return
  const width = canvas.width
  const height = canvas.height
  if (orientation > 8) {
    canvas.width = height
    canvas.height = width
  }

  switch (orientation) {
    case 2:
      // horizontal flip
      ctx.translate(width, 0)
      ctx.scale(-1, 1)
      break
    case 3:
      // 180° rotate left
      ctx.translate(width, height)
      ctx.rotate(Math.PI)
      break
    case 4:
      // vertical flip
      ctx.translate(0, height)
      ctx.scale(1, -1)
      break
    case 5:
      // vertical flip + 90 rotate right
      ctx.rotate(0.5 * Math.PI)
      ctx.scale(1, -1)
      break
    case 6:
      // 90° rotate right
      ctx.rotate(0.5 * Math.PI)
      ctx.translate(0, -height)
      break
    case 7:
      // horizontal flip + 90 rotate right
      ctx.rotate(0.5 * Math.PI)
      ctx.translate(width, -height)
      ctx.scale(-1, 1)
      break
    case 8:
      // 90° rotate left
      ctx.rotate(-0.5 * Math.PI)
      ctx.translate(-width, 0)
      break
  }
}

function sendImage(base64Image) {
  const model = modelSelectEl.value
  if (typeof base64Image === 'object') {
    getImage({ target: imageCaptureEl })
  } else {
    fetch('/image', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json'},
      body: `{
        "image":"${base64Image}",
        "model":"${model}"
      }`
    })
    .then(response => response.json())
    .then(parsed => {
      metrics.totalTime = performance.now() - metrics.startTime
      const concepts = parsed[0].data.concepts
      console.log(parsed)
      const valuesForDisplay = concepts.map(({ name, value }) => ([ name, value ]))
      console.table(valuesForDisplay)
      performanceDiv.innerHTML = (
        `<p>Total time: ${('' + metrics.totalTime).substring(0, 8)}</p>
        <p>Original file size: ${getFileSize(metrics.originalBase64)}kb</p>
        ${metrics.finalBase64 ?
          `<p>Compressed file size: ${getFileSize(metrics.finalBase64)}kb</p>
          <p>Prep time: ${('' + metrics.prepTime).substring(0, 8)}ms</p>
          <p>Compression time: ${('' + metrics.compressionTime).substring(0, 8)}ms</p>`
          : ''}
        ${metrics.orientationFinish ?
          `<p>getOrientation runtime: ${('' + (metrics.orientationFinish - metrics.orientationStart)).substring(0, 8)}ms</p>
          <p>Orienation value: ${metrics.orientation}</p>`
        : ''}`
      )
      dataOutputDiv.innerHTML = valuesForDisplay.map(tuple => tuple.join(': ')).join('<br>')
      console.log('Total time: ', performance.now() - metrics.startTime, 'ms')
      compressedImgTag.src = metrics.finalBase64 || metrics.originalBase64
      metrics = {}
      imageCapture.value = null;
    })
  }
}

function getImage(e) {
  metrics.startTime = performance.now()
  const capturedImage = e.target.files[0]

  const reader = new FileReader()
  const startTime = performance.now()
  reader.readAsDataURL(capturedImage)
  reader.onload = () => {
    const timeElapsed = performance.now() - startTime
    metrics.originalBase64 = reader.result
    sendImage(reader.result.split(',')[1])
  }
  reader.onerror = (err) => {
    console.error(err)
  }
}

// const sendButtonEl = document.getElementById('sendButton')
const imageCaptureEl = document.getElementById('imageCapture')
const dataOutputDiv = document.getElementById('output')
const modelSelectEl = document.getElementById('modelSelect')
const compressionSelectEl = document.getElementById('compressionSelect')
const performanceDiv = document.getElementById('performance')
const compressedImgTag = document.getElementById('compressed')
const orientaionSelectEl = document.getElementById('orientationSelect')

modelSelect.innerHTML = models.map(m => `<option value="${m}" ${m === 'general' && 'selected'}>${m} model</option>`).join('\n')

imageCaptureEl.addEventListener('change', (e) => {
  if (imageCaptureEl.files && imageCaptureEl.files[0]) {
    performanceDiv.innerHTML = 'Loading...'
    dataOutputDiv.innerHTML = ''
    compressionSelectEl.value === 'Use compression' ? getImageWithCompression() : getImage(e)
  }
})
