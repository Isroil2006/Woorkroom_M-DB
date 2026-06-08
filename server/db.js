const mongoose = require("mongoose");
require("dotenv").config();

let cached = global.mongoose;

if (!cached) {
  cached = global.mongoose = { conn: null, promise: null };
}

async function dbConnect() {
  if (cached.conn) {
    return cached.conn;
  }

  if (!cached.promise) {
    const opts = {
      bufferCommands: true,
      maxPoolSize: 10, // Serverless uchun pool size kichraytiriladi (ulanishlar to'lib qolmasligi uchun)
      serverSelectionTimeoutMS: 10000,
    };

    cached.promise = mongoose.connect(process.env.MONGODB_URI, opts).then((mongoose) => {
      console.log("MongoDB ga muvaffaqiyatli ulandi (Serverless Cached)");
      return mongoose;
    });
  }
  
  try {
    cached.conn = await cached.promise;
  } catch (e) {
    cached.promise = null;
    throw e;
  }

  return cached.conn;
}

module.exports = dbConnect;
