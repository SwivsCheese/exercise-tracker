const express = require('express');
const app = express();
const cors = require('cors');
require('dotenv').config();
const { MongoClient } = require('mongodb');
const bodyParser = require('body-parser');

const client = new MongoClient(process.env.URI);
const db = client.db("exercisetracker");
const lastDB = db.collection("names");
const firstDB = db.collection("exercise");

const mongoose = require('mongoose');
mongoose.connect(process.env.URI);

const userSchema = new mongoose.Schema({
  _id: String,
  username: String
});

const exerciseSchema = new mongoose.Schema({
  user_id: {type: String, required: true},
  description: String,
  duration: Number,
  date: {
    type: Date,
    require: false
  }
});

const logSchema = new mongoose.Schema({
  username: String,
  count: Number,
  _id: String,
  log: [{
    description: String,
    duration: Number,
    date: String,
  }]
});

let userModel = mongoose.model("user", userSchema);
let exerciseModel = mongoose.model("exercise", exerciseSchema);
let logModel = mongoose.model("logs", logSchema);

app.use(cors());
app.use(express.static('public'));
app.use(bodyParser.urlencoded({ extended: true }));
app.get('/', (req, res) => {
  res.sendFile(__dirname + '/views/index.html')
});

app.post('/api/users', async (req, res) => {
  const usedName = req.body.username;

  const objName = await userModel.create({
    _id: null,
    username: usedName
  });

  const item = await lastDB.insertOne(objName);
  console.log(item);
  res.json({username: req.body.username, _id: objName._id});
  //note: I didn't think this would work.
});
app.get('/api/users', async (req, res) => {
  const thisthing = await lastDB.findOne(req.objName);
  res.json([{username: thisthing.username, _id: thisthing._id}])
});
app.post('/api/users/:_id/exercises', async (req, res) => {
  const usedId = req.params._id;
  const usedDesc = req.body.description;
  const usedDur = req.body.duration;
  let usedDate = req.body.date;
  try{
    const user = await lastDB.findOne({_id: usedId});
    if (!user){
      res.send("can't find user");
    }
    else{
      const exerciseName = await exerciseModel.create({
        user_id: user._id,
        description: usedDesc,
        duration: usedDur,
        date: usedDate ? new Date(usedDate) : new Date()
      });
      const itemer = await firstDB.insertOne(exerciseName);
      console.log(itemer);
      res.json({
        _id: user._id,
        username: user.username,
        description: usedDesc, 
        duration: Number(usedDur), 
        date: new Date(usedDate).toDateString()
        });
      }
  }
  catch(err){
    console.log(err)
  }
});
app.get('/api/users/:_id/logs', async (req, res) => {
  const {from, to, limit} = req.query;
  const yo = req.params._id;
  const user = await lastDB.findOne({_id: yo});
  const lastone = await exerciseModel.find({user_id: yo})
  if(!user){
    res.send("can't find user...");
    console.log("can't find")
    return;
  }
  let dated = {}
  if (from){
    dated['$gte'] = new Date(from);
  }
  if (to){
    dated['$lte'] = new Date(to);
  }
  let filter = {
    user_id: yo
  }
  if (from || to){
    filter.date = dated;
  }

  const finalThing = await exerciseModel.find(filter).limit(+limit ?? 500);

  const logger = finalThing.map(e => ({
    description: e.description,
    duration: e.duration,
    date: e.date.toDateString()
  }));
  
  res.json({username: user.username,
            count: lastone.length,
            _id: user._id,
            log: logger});
  
});
const listener = app.listen(process.env.PORT || 3000, () => {
  console.log('Your app is listening on port ' + listener.address().port)
})
