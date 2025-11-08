const express = require('express');
const app = express();
const cors = require('cors');
require('dotenv').config();
const port = process.env.PORT || 3000;

app.use(express.json())
app.use(cors());

const authRoutes = require('./routes/authRoutes');
app.use('/api/auth', authRoutes);

app.listen(port, () => {
    console.log(`Running on http://localhost:${port}`)
});