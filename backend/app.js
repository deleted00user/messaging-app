const express = require('express');
const app = express();
const cors = require('cors');
require('dotenv').config();
const port = process.env.PORT || 3000;
const authenticateToken = require('./middleware/authMiddleware');

app.use(express.json())
app.use(cors());

const authRoutes = require('./routes/authRoutes');
app.use('/api/auth', authRoutes);

app.get('/api/test-auth', authenticateToken, (req, res) => {
    res.json({ 
        message: 'You are authenticated!', 
        userId: req.user.userId 
    });
});

app.listen(port, () => {
    console.log(`Running on http://localhost:${port}`)
});