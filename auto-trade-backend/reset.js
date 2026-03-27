const mongoose = require('mongoose');

async function reset() {
  await mongoose.connect('mongodb://localhost:27017/astratrade_nest');
  await mongoose.connection.db.collection('autotradecontrols').deleteMany({});
  await mongoose.connection.db.collection('tradestates').deleteMany({});
  console.log('Reset complete');
  process.exit(0);
}

reset();
