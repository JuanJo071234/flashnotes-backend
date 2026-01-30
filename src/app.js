const express = require('express');
const cors = require('cors');

const notesRoutes = require('./routes/notes.routes');

const app = express();

app.use(cors());
app.use(express.json());

app.use('/api/notes', notesRoutes);

app.get('/api/health', (req, res) => {
    res.json({ status: 'OK' });
});

module.exports = app;
