require('dotenv').config();
const connectToMongo = require('./db');
const express = require('express');
const cors=require('cors');
connectToMongo();

const app = express()
const port = process.env.PORT||5001
app.use(express.json())
const cors = require("cors");
app.use(
  cors({
    origin: ["https://gmsc.vercel.app", "http://localhost:3000"], // allowed origins
    methods: ["GET", "POST", "PUT", "DELETE"],
    allowedHeaders: ["Content-Type", "Authorization"],
  })
);

app.use('/api/auth',require('./routes/auth'))

app.listen(port, () => {
  //console.log(`Example app listening on port http://localhost:${port}`)
})