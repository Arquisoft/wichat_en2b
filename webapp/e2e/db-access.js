const mongoose = require('mongoose');

async function startMemoryDB() {

   //await mongoose.connect(process.env.MONGODB_URI);
//
   // console.log("✅ Connected to MongoMemoryServer using URI:", process.env.MONGODB_URI);
}

async function stopMemoryDB() {
    //await mongoose.disconnect();

    //console.log("🛑 MongoMemoryServer stopped");
}

module.exports = {
    startMemoryDB,
    stopMemoryDB
};
