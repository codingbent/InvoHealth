const mongoose = require('mongoose');
const mongourl = "mongodb://localhost:27017/GMSC"; // Replace 'inotebook' with your database name

const connectToMongo = () => {
  mongoose.connect(mongourl)
    .then(() => {
      console.log('Connected to MongoDB');
    })
    .catch((err) => {
      console.error('Error connecting to MongoDB:', err);
    });
};

module.exports = connectToMongo;