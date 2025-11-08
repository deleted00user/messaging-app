const pool = require('../db/pool');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');

async function register (req, res) {
    try {
        const { username, email, password } = req.body;
        if(!username || !email || !password){
            return res.status(400).json({ message: "Fill all the fields" });
        }
        if(!email.match(/^[\w-\.]+@([\w-]+\.)+[\w-]{2,4}$/g)){
            return res.status(400).json({ message: 'Invalid email format' });
        }
        if(password.length < 8){
            return res.status(400).json({ message: 'Password needs to be at least 8 characters'})
        }
        const user = await pool.query(
            'SELECT * FROM users WHERE username = $1', [username]
        )
        const userEmail = await pool.query(
            'SELECT * FROM users WHERE email = $1', [email]
        )
        if(user.rows.length > 0 || userEmail.rows.length > 0){
            return res.status(400).json({ message: 'User already exists' })
        }
        const hashedPassword = await bcrypt.hash(password, 10);
        const newUser = await pool.query(
            'INSERT INTO users (username, email, password) VALUES ($1, $2, $3) RETURNING id',
            [ username, email, hashedPassword]
        );
        const userId = newUser.rows[0].id;;
        const token = jwt.sign({ userId: userId }, process.env.JWT_SECRET, { expiresIn : '7d' });
        return res.status(201).json({ 
            message: 'User created successfully',
            token,
            user: {
                id: userId,
                username,
                email
                }
        });
    } catch (error) {
        res.status(500).json({ message: "Error creating new user", error: error })
    }
}

async function login (req, res) {
    try{ 
        const { username, email, password } = req.body;
        if(!username && !email){
            return res.status(400).json({ message: "Input username or email "});
        }
        if(!password){
            return res.status(400).json({ message: "Input password" });
        }
        const user = await pool.query(
            'SELECT * FROM users WHERE username = $1 OR email = $2', [username, email]
        )
        if(user.rows.length === 0){
            return res.status(400).json({ message: "User doesn't exist"})
        }
        const passMatch = await bcrypt.compare(password, user.rows[0].password);
        if(!passMatch){
            return res.status(400).json({ message: 'Incorrect password '})
        }
        const userId = user.rows[0].id;
        const token = jwt.sign({ userId }, process.env.JWT_SECRET, { expiresIn: '7d' });
        return res.status(200).json({
            message: 'Login successful',
            token,
            user: {
                id: user.rows[0].id,
                username: user.rows[0].username,
                email: user.rows[0].email,
                display_name: user.rows[0].display_name,
                profile_picture: user.rows[0].profile_picture
            }
        });
    } catch (error) {
        res.status(500).json({ message: "Error logging in", error: error })
    }
}  

module.exports = {
    register, 
    login
}