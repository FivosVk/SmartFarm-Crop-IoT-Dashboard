const express = require('express');
const cors = require('cors');
const { initDb } = require('./db');
const cropsRouter = require('./routes/crops');
const readingsRouter = require('./routes/readings');

const app = express();
const PORT = process.env.PORT || 3001;

app.use(cors());
app.use(express.json());

app.use('/api/crops', cropsRouter);
app.use('/api/readings', readingsRouter);

// Catch-all for unknown routes
app.use((req, res) => {
  res.status(404).json({ error: 'Route not found' });
});

// Central error handler - guarantees the required { "error": "..." } JSON shape
// even for unexpected exceptions thrown inside route handlers.
// eslint-disable-next-line no-unused-vars
app.use((err, req, res, next) => {
  console.error(err);
  res.status(500).json({ error: 'Internal server error' });
});

initDb()
  .then(() => {
    app.listen(PORT, () => {
      console.log(`SmartFarm backend running at http://localhost:${PORT}`);
    });
  })
  .catch((err) => {
    console.error('Failed to initialise database:', err);
    process.exit(1);
  });

module.exports = app;