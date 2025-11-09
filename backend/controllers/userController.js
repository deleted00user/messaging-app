const pool = require('../db/pool');

async function getMyProfile (req, res) {
    try {
        const userId = req.user.userId;
        const result = await pool.query(
            'SELECT * FROM users WHERE id = $1', [userId]
        );
        if(result.rows.length === 0){
            res.json({ message: 'No user found' })
        };
        const user = result.rows[0];
        delete user.password;
        return res.status(200).json(user)

    } catch (error) {
        res.status(500).json({ message: 'Error fetching profile', error });
    }
}

async function updateMyProfile (req, res) {
    try {
        const userId = req.user.userId;
        const { display_name, bio } = req.body;

        const user = await pool.query(
            'UPDATE users SET display_name = $1, bio = $2, updated_at = CURRENT_TIMESTAMP WHERE id = $3 RETURNING *' , [ display_name, bio, userId]
        );
        const updated = user.rows[0];
        delete updated.password;
        return res.status(200).json(updated)

    } catch (error) {
        res.status(500).json({ message: 'Error updating profile', error });
    }
}

async function getUserProfile (req, res) {
    try {
        const userId = req.params.id;
        const userData = await pool.query(
            'SELECT id, username, display_name, bio, profile_picture FROM users WHERE id = $1', [userId]
        );
        if(userData.rows.length === 0){
            return res.status(404).json({ message: 'User not found' })
        };
        return res.status(200).json(userData.rows[0]);
    } catch (error) {
        res.status(500).json({ message: 'Error getting user profile', error})
    };
} 

async function searchUsers (req, res) {
    try {
        const q = req.query.q;
        if(!q){
            const noQCase = await pool.query(
                'SELECT username, display_name, profile_picture FROM users LIMIT 20'
            );
            return res.json(noQCase.rows)
        }
        
        const pattern = `%${q}%`;
        const users = await pool.query(
            'SELECT id, username, display_name, bio, profile_picture FROM users WHERE username ILIKE $1 OR display_name ILIKE $1 LIMIT 20', [pattern]
        )
        return res.status(200).json(users.rows);
    } catch (error) {
        res.status(500).json({ message: 'Error searching users', error });
    }
}

module.exports = {
    getMyProfile,
    updateMyProfile,
    getUserProfile,
    searchUsers
}