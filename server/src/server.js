const app = require('./app');
const { initDBConnections } = require('./db');
const config = require('./config');

async function start() {
  await initDBConnections();
  const port = config.PORT || 5000;
  app.listen(port, () => console.log(`Server listening on ${port}`));
}

start().catch(err => {
  console.error('Failed to start', err);
  process.exit(1);
});
