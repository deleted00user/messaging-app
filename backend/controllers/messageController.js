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
    try { 
        const currentUserId = req.user.userId;
        const otherUserId = req.params.userId;

        const page = parseInt(req.query.page) || 1;
        const limit = parseInt(req.query.limit) || 20;
        const offset = (page - 1) * limit;

        const messages = await pool.query(
            'SELECT * FROM messages WHERE (sender_id = $1 AND receiver_id = $2) OR (sender_id = $2 AND receiver_id = $1) ORDER BY created_at DESC LIMIT $3 OFFSET $4', [currentUserId, otherUserId, limit, offset]
        )
        return res.status(200).json(messages.rows)
    } catch (error) {
        res.status(500).json({ message: 'Error fetching messages', error });
    }
}

async function editMessage(req, res) {
    try {
        const messageId = req.params.id;
        const currentUserId = req.user.userId;
        const { content } = req.body;
        if(!content){
            return res.status(400).json({ message: 'Message content cannot be empty' });
        }
        const messageResult = await pool.query(
            'SELECT sender_id FROM messages WHERE id = $1', [messageId]
        );
        if(messageResult.rows.length === 0){
            return res.status(404).json({ message: 'Message not found' });
        }
        const senderId = messageResult.rows[0].sender_id;
        if(currentUserId !== senderId){
            return res.status(403).json({ message: 'You can only edit your own messages' });
        }
        const updatedMessage = await pool.query(
            'UPDATE messages SET content = $1, is_edited = true, updated_at = CURRENT_TIMESTAMP WHERE id = $2 RETURNING *',
            [content, messageId]
        );
        return res.status(200).json(updatedMessage.rows[0]);
    } catch (error) {
        res.status(500).json({ message: 'Error editing message', error });
    }
}

async function deleteMessage(req, res) {
    try { 
        const messageId = req.params.id;
        const currentUserId = req.user.userId;
        
        const message = await pool.query(
            'SELECT * FROM messages WHERE id = $1', [messageId]
        );
        if(message.rows.length === 0){
            return res.status(404).json({ message: 'No message found.' })
        };
        
        const messageOwner = message.rows[0].sender_id;
        if(currentUserId !== messageOwner){
            return res.status(403).json({ message: 'You can only delete your own messages' });
        }
        await pool.query('DELETE FROM messages WHERE id = $1', [messageId]);
        return res.status(200).json({ message: 'Message successfully deleted' });
    } catch (error) {
        res.status(500).json({ message: 'Error deleting message', error });
    }
}

async function getConversations(req, res) {
    try {
        const currentUserId = req.user.userId;

        // This query:
        // 1. Gets all messages involving current user
        // 2. Determines the "other" user in each conversation
        // 3. Groups by other user
        // 4. Gets the most recent message for each conversation
        // 5. Joins with users table to get user info
        // 6. Orders by most recent message first
        // It was a bit hard, used AI for that query not gonna lie ) 

        const result = await pool.query(`
            SELECT DISTINCT ON (other_user_id)
                u.id as user_id,
                u.username,
                u.display_name,
                u.profile_picture,
                m.content as last_message,
                m.created_at as last_message_time
            FROM (
                SELECT 
                    CASE 
                        WHEN sender_id = $1 THEN receiver_id
                        ELSE sender_id
                    END as other_user_id,
                    content,
                    created_at
                FROM messages
                WHERE sender_id = $1 OR receiver_id = $1
            ) m
            JOIN users u ON u.id = m.other_user_id
            ORDER BY other_user_id, m.created_at DESC
        `, [currentUserId]);
        
        const conversations = result.rows.map(row => ({
            user: {
                id: row.user_id,
                username: row.username,
                display_name: row.display_name,
                profile_picture: row.profile_picture
            },
            last_message: row.last_message.substring(0, 50) + (row.last_message.length > 50 ? '...' : ''),
            last_message_time: row.last_message_time
        }));
        
        return res.status(200).json(conversations);
        
    } catch (error) {
        res.status(500).json({ message: 'Error fetching conversations', error });
    }
}

module.exports = {
    sendMessage,
    getMessages,
    editMessage,
    deleteMessage,
    getConversations
}