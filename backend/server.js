const express = require('express');
const cors = require('cors');
const { initDb } = require('./db');
const cropsRouter = require('./routes/crops');
const readingsRouter = require('./routes/readings');

const app = express();
const PORT = 5001;

app.use(cors());
app.use(express.json());

app.use('/api/crops', cropsRouter);
app.use('/api/readings', readingsRouter);

// Fallback error handler so unexpected errors still return the required JSON shape
app.use((err, req, res, next) => {
  console.error(err);
  res.status(500).json({ error: 'Internal server error' });
});

initDb().then(() => {
  app.listen(PORT, () => {
    console.log(`Backend running at http://localhost:${PORT}`);
  });
});