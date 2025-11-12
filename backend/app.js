const express = require('express');
const app = express();
const cors = require('cors');
require('dotenv').config();
const port = process.env.PORT || 3000;
const authenticateToken = require('./middleware/authMiddleware');

app.use(express.json())
app.use(cors({
    origin: '*', 
    credentials: true
}));

const authRoutes = require('./routes/authRoutes');
app.use('/api/auth', authRoutes);
const userRoutes = require('./routes/userRoutes');
app.use('/api/users', userRoutes);
const messageRoutes = require('./routes/messageRoutes');
app.use('/api/messages', messageRoutes);

app.listen(port, () => {
    console.log(`Running on http://localhost:${port}`)
});