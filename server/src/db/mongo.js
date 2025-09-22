// src/db/mongo.js
// require('dotenv').config(); 
const mongoose = require('mongoose');

const connectMongo = async (uri) => {
  try {
    console.log('⏳ Connecting to MongoDB ',);
    await mongoose.connect(uri);
    console.log('✅ MongoDB connected successfully');
  } catch (err) {
    console.error('❌ MongoDB connection error:', err);
    process.exit(1);
  }
};

mongoose.connection.on('disconnected', () => {
  console.warn('⚠️ MongoDB disconnected');
});

mongoose.connection.on('reconnected', () => {
  console.log('🔄 MongoDB reconnected');
});

mongoose.connection.on('error', (err) => {
  console.error('❌ MongoDB error after initial connection:', err);
});



module.exports = connectMongo;



// require('dotenv').config(); 
// (async () => {
//   try {
//     await connectMongo(process.env.MONGO_URI);        // wait for Mongo
//     // app.listen(3000, () => console.log('🚀 Server running on port 3000'));
//   } catch (err) {
//     console.error('❌ Failed to start server:', err);
//     process.exit(1);
//   }
// })();
// // 
// // 
// console.log(process.env.MONGO_URI);
