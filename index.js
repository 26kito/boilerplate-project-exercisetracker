const express = require('express')
const app = express()
const cors = require('cors')
const { MongoClient, ObjectId } = require('mongodb')
const bodyParser = require('body-parser')
require('dotenv').config()

const client = new MongoClient(process.env.MONGO_URI)
const db = client.db('exercise_tracker')

app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));
app.use(cors())
app.use(express.static('public'))
app.get('/', (req, res) => {
  res.sendFile(__dirname + '/views/index.html')
});

// get all user
app.get('/api/users', async (req, res) => {
  const users = db.collection('users')
  const getUser = await users.find({}).toArray()

  return res.json(getUser)
})

// insert user
app.post('/api/users', async (req, res) => {
  const users = db.collection('users')
  const usnInput = req.body.username
  const checkUsnavailability = await users.findOne({ username: usnInput })

  if (!checkUsnavailability && usnInput) {
    users.insertOne({ username: usnInput })

    const getUser = await users.findOne({ username: usnInput })

    return res.json({
      username: getUser.username,
      id: getUser._id
    })
  }

  res.json({
    message: 'Failed to create user!'
  })
})

// insert exercise
app.post('/api/users/:_id/exercises', async (req, res) => {
  const users = db.collection('users')
  const exercises = db.collection('exercises')
  const id = req.params._id
  const { description, duration, date } = req.body

  const user = await users.findOne({ _id: new ObjectId(id) })

  const insertExercise = await exercises.insertOne({
    user_id: user._id,
    description: description,
    duration: +duration,
    date: date ? new Date(date) : new Date(),
  })

  const getExercise = await exercises.findOne({ _id: new ObjectId(insertExercise.insertedId), user_id: user._id })

  return res.json({
    _id: user._id,
    username: user.username,
    date: new Date(getExercise.date).toDateString(),
    duration: getExercise.duration,
    description: getExercise.description
  })
})

app.get('/api/users/:_id/logs', async (req, res) => {
  const users = db.collection('users')
  const exercises = db.collection('exercises')
  const id = req.params._id
  const { from, to, limit } = req.query

  const user = await users.findOne({ _id: new ObjectId(id) })

  if (!user) {
    return res.json({
      message: 'Failed!'
    })
  }

  let dateObj = {}

  if (from) {
    dateObj['$gte'] = new Date(from)
  }

  if (to) {
    dateObj['$lte'] = new Date(to)
  }

  let filter = {
    user_id: new ObjectId(id)
  }

  const getExercise = await exercises.find(filter).limit(+limit ?? 500).toArray()

  const log = getExercise.map(data => ({
    description: data.description,
    duration: data.duration,
    date: data.date.toDateString()
  }))

  return res.json({
    _id: id,
    username: user.username,
    count: getExercise.length,
    log: [log]
  })
})

const listener = app.listen(process.env.PORT || 3000, () => {
  console.log('Your app is listening on port ' + listener.address().port)
})
