const express = require('express');
const cookieParser = require('cookie-parser');
const { initDBConnections } = require('./db'); // from src/db/index.js
const sessionAuth = require('./middlewares/sessionAuth').sessionAuth;
const rateLimiter = require('./middlewares/rateLimiter');
const errorHandler = require('./middlewares/errorHandler'); // custom error handler
const cors = require('cors');
const helmet = require('helmet');
const app = express();



initDBConnections().catch(err => {
  console.error('Failed to initialize database connections', err);
    process.exit(1);
});

app.use(helmet());
app.use(cors({ origin: true, credentials: true }));
app.use(express.json({ limit: '1mb' }));
app.use(cookieParser());
// app.use(requestLogger);           // implement simple logger if you want
app.use(sessionAuth);  
app.use(rateLimiter({ max: 200 })); // global read limit or tune



// routes
app.use('/api/v1/auth', require('./routes/auth'));
app.use('/api/v1/boards', require('./routes/boards'));  
app.use('/api/v1/threads', require('./routes/threads'));
app.use('/api/v1/threads', require('./routes/comments')); // comments router expects /:threadId endpoints
app.use('/api/v1/tags', require('./routes/tags'));



// error handling
app.use(errorHandler);  

module.exports = app;
