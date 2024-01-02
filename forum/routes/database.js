const { MongoClient } = require('mongodb');
require('dotenv').config();
const url = `mongodb+srv://nyah309:${process.env.MONGODB_PW}@cluster0.emzshpb.mongodb.net/?retryWrites=true&w=majority`;
let connectDB = new MongoClient(url).connect();

module.exports = connectDB;