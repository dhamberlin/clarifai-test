const express = require('express')
const bodyParser = require('body-parser')
const morgan = require('morgan')
const fetch = require('node-fetch')

const API_KEY = require('./keys.js')

const app = express()

app.use(morgan('dev'))
app.use(bodyParser.json({limit: '50mb'}))
app.use(express.static(__dirname))


app.post('/image', (req, res) => {
  const url = 'https://api.clarifai.com/v2/models/aaa03c23b3724a16a56b629203edc62c/outputs'
  const headers = {
    Authorization: `Key ${API_KEY}`,
    'Content-Type': 'application/json'
  }
  const imageURL = 'https://i.pinimg.com/736x/63/0f/0e/630f0ef3f6f3126ca11f19f4a9b85243--dachshund-puppies-weenie-dogs.jpg'
  const base64Image = req.body.image
  // console.log(base64Image)
  const body = `{
    "inputs": [
      {
        "data": {
          "image": {
            "base64": "${base64Image}"
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
