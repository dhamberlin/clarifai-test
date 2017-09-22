const outputDiv = document.getElementById('outputDiv')

const models = ['general', 'apparel']

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
      const concepts = parsed[0].data.concepts
      console.log(parsed)
      const valuesForDisplay = concepts.map(({ name, value }) => ([ name, value ]))
      console.table(valuesForDisplay)
      dataOutputDiv.innerHTML = valuesForDisplay.map(tuple => tuple.join(': ')).join('<br>')
    })
  }
}

function getImage(e) {
  const capturedImage = e.target.files[0]
  console.log(capturedImage)
  // const base64Image = btoa(capturedImage)
  // sendImage(base64Image)

  const reader = new FileReader()
  const startTime = performance.now()
  reader.readAsDataURL(capturedImage)
  reader.onload = () => {
    const timeElapsed = performance.now() - startTime
    console.log(`Image converted in ${timeElapsed}ms`)
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

modelSelect.innerHTML = models.map(m => `<option value="${m}">${m}</option>`).join('\n')

imageCaptureEl.addEventListener('change', getImage)
// sendButtonEl.addEventListener('click', sendImage)
