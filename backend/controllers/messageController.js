const pool = require('../db/pool');

async function sendMessage (req, res) {
    try {
        const senderId = req.user.userId;
        const { receiver_id, content } = req.body;

        if(!receiver_id || !content){
            return res.status(400).json({ message: 'No content or receiver'});
        }

        const receiver = await pool.query(
            'SELECT id FROM users WHERE id = $1', [receiver_id]
        );
        if(receiver.rows.length === 0){
            return res.status(400).json({ message: 'No receiver found' })
        };
        if(senderId === receiver_id){
            return res.status(400).json({ message: 'Message cannot be sent to yourself' })
        }
        const insert = await pool.query(
            'INSERT INTO messages (content, sender_id, receiver_id) VALUES ($1, $2, $3) RETURNING *', [content, senderId, receiver_id]
        )
        return res.status(201).json(insert.rows[0]);
    } catch (error) {
        res.status(500).json({ message: 'Error sending message', error });
    }
}

async function getMessages(req, res) {
    res.json({ message: 'Not implemented yet' });
}

async function editMessage(req, res) {
    res.json({ message: 'Not implemented yet' });
}

async function deleteMessage(req, res) {
    res.json({ message: 'Not implemented yet' });
}

module.exports = {
    sendMessage,
    getMessages,
    editMessage,
    deleteMessage
}