const express = require('express')
const bodyParser = require('body-parser')
const morgan = require('morgan')
const fetch = require('node-fetch')

const API_KEY = require('./keys.js')

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
  let { model, image } = req.body
  // model = 'apparel'
  const url = `https://api.clarifai.com/v2/models/${models[model]}/outputs`
  const headers = {
    Authorization: `Key ${API_KEY}`,
    'Content-Type': 'application/json'
  }
  const imageURL = 'https://i.pinimg.com/736x/63/0f/0e/630f0ef3f6f3126ca11f19f4a9b85243--dachshund-puppies-weenie-dogs.jpg'
  // console.log(base64Image)
  const body = `{
    "inputs": [
      {
        "data": {
          "image": {
            "base64": "${image}"
          }
        }
      }
    ]
  }`
  const options = {
    method: 'POST',
    headers,
    body
  }
  fetch(url, options)
    .then(response => response.json())
    .then(parsed => parsed.outputs)
    .then(outputs => res.send(outputs))
    .catch(err => console.error(err))
  // res.send({ message: 'activated' })
})

const port = process.env.PORT || 8080
app.listen(port, () => console.log(`listening on ${port}`))
