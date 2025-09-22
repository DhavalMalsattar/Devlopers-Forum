const app = require('./app');
const { initDBConnections } = require('./db');
const config = require('./config');
const dotenv = require('dotenv');

// dotenv.config({ path: path.resolve(__dirname, '../.env') });
// dotenv.config();
// dotenv.config({ path: path.resolve(process.cwd(), '.env') });

console.log('MONGO_URI:', process.env.MONGO_URI);

async function start() {
  await initDBConnections();
  const port = config.PORT || 5000;
  app.listen(port, () => console.log(`Server listening on ${port}`));
}

start().catch(err => {
  console.error('Failed to start', err);
  process.exit(1);
});