const express = require('express')
const bodyParser = require('body-parser')
const morgan = require('morgan')
const fetch = require('node-fetch')
const API_KEY = process.env.key || require('./keys.js')

const app = express()

app.use(morgan('dev'))
app.use(bodyParser.json({limit: '50mb'}))
app.use(express.static(__dirname))

const models = {
  general: 'aaa03c23b3724a16a56b629203edc62c',
  apparel: 'e0be3b9d6a454f0493ac3a30784001ff',
  celebrity: 'e466caa0619f444ab97497640cefc4dc',
  color: 'eeed0b6733a644cea07cf4c60f87ebb7'
}

app.post('/image', (req, res) => {
  const { model, image } = req.body
  const url = `https://api.clarifai.com/v2/models/${models[model]}/outputs`
  const method = 'POST'
  const headers = {
    Authorization: `Key ${API_KEY}`,
    'Content-Type': 'application/json'
  }
  const body = `{
    "inputs": [
      {
        "data": {
          "image": { "base64": "${image}" }
        }
      }
    ]
  }`
  const options = { method, headers, body }
  fetch(url, options)
    .then(response => response.json())
    .then(parsed => parsed.outputs)
    .then(outputs => res.send(outputs))
    .catch(err => console.error(err))
})

app.get('/rotate', (req, res) => {
  res.sendFile(__dirname + '/rotate.html')
})

const port = process.env.PORT || 8080
app.listen(port, () => console.log(`listening on ${port}`))
