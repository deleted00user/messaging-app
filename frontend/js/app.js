let currentChatUser = null;
let currentMessages = [];

async function initApp() {
    try {
        await loadConversations();
        
        setupSearch();
        
        setupMessageSending();
        
        setupThemeToggle();
        
    } catch (error) {
        console.error('Error initializing app:', error);
    }
}

async function loadConversations() {
    try {
        const conversations = await getConversations();
        const conversationsList = document.getElementById('conversations-list');
        
        conversationsList.innerHTML = '';
        
        if (conversations.length === 0) {
            conversationsList.innerHTML = '<p style="padding: 1rem; text-align: center; color: var(--text-secondary);">No conversations yet. Search for users to start chatting!</p>';
            return;
        }
        
        conversations.forEach(conv => {
            const item = document.createElement('div');
            item.className = 'conversation-item';
            item.dataset.userId = conv.user.id;
            
            const displayName = conv.user.display_name || conv.user.username;
            const time = new Date(conv.last_message_time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
            
            item.innerHTML = `
                <div class="conversation-username">${displayName}</div>
                <div class="conversation-preview">${conv.last_message}</div>
                <div class="conversation-time">${time}</div>
            `;
            
            item.addEventListener('click', () => openChat(conv.user));
            
            conversationsList.appendChild(item);
        });
    } catch (error) {
        console.error('Error loading conversations:', error);
    }
}

async function openChat(user) {
    currentChatUser = user;
    
    const displayName = user.display_name || user.username;
    document.getElementById('chat-username').textContent = displayName;
    
    document.querySelectorAll('.conversation-item').forEach(item => {
        item.classList.remove('active');
        if (item.dataset.userId == user.id) {
            item.classList.add('active');
        }
    });
    
    await loadMessages(user.id);
}

async function loadMessages(userId) {
    try {
        const messages = await getMessages(userId);
        currentMessages = messages;
        displayMessages(messages);
    } catch (error) {
        console.error('Error loading messages:', error);
    }
}

function displayMessages(messages) {
    const container = document.getElementById('messages-container');
    container.innerHTML = '';

    const reversedMessages = [...messages].reverse();
    
    reversedMessages.forEach(msg => {
        const messageEl = document.createElement('div');
        const isSent = msg.sender_id !== currentChatUser.id;
        messageEl.className = `message ${isSent ? 'sent' : 'received'}`;
        
        const time = new Date(msg.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
        const edited = msg.is_edited ? ' (edited)' : '';
        
        messageEl.innerHTML = `
            <div class="message-content">${msg.content}</div>
            <div class="message-time">${time}${edited}</div>
        `;
        
        container.appendChild(messageEl);
    });
    
    container.scrollTop = container.scrollHeight;
}

function setupMessageSending() {
    const input = document.getElementById('message-input');
    const sendBtn = document.getElementById('send-btn');
    
    const send = async () => {
        const content = input.value.trim();
        
        if (!content || !currentChatUser) return;
        
        try {
            await sendMessage(currentChatUser.id, content);
            input.value = '';
            
            await loadMessages(currentChatUser.id);
            
            await loadConversations();
        } catch (error) {
            console.error('Error sending message:', error);
            alert('Failed to send message');
        }
    };
    
    sendBtn.addEventListener('click', send);
    
    input.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') {
            send();
        }
    });
}

function setupSearch() {
    const searchInput = document.getElementById('search-input');
    let searchTimeout;
    
    searchInput.addEventListener('input', () => {
        clearTimeout(searchTimeout);
        
        searchTimeout = setTimeout(async () => {
            const query = searchInput.value.trim();
            
            if (!query) {
                loadConversations();
                return;
            }
            
            try {
                const users = await searchUsers(query);
                displaySearchResults(users);
            } catch (error) {
                console.error('Error searching users:', error);
            }
        }, 300);
    });
}

function displaySearchResults(users) {
    const conversationsList = document.getElementById('conversations-list');
    conversationsList.innerHTML = '';
    
    if (users.length === 0) {
        conversationsList.innerHTML = '<p style="padding: 1rem; text-align: center; color: var(--text-secondary);">No users found</p>';
        return;
    }
    
    users.forEach(user => {
        const item = document.createElement('div');
        item.className = 'conversation-item';
        item.dataset.userId = user.id;
        
        const displayName = user.display_name || user.username;
        
        item.innerHTML = `
            <div class="conversation-username">${displayName}</div>
            <div class="conversation-preview">@${user.username}</div>
        `;
        
        item.addEventListener('click', () => {
            openChat(user);
            document.getElementById('search-input').value = '';
            loadConversations();
        });
        
        conversationsList.appendChild(item);
    });
}

function setupThemeToggle() {
    const themeToggle = document.getElementById('theme-toggle');
    
    const savedTheme = localStorage.getItem('theme') || 'dark';
    if (savedTheme === 'light') {
        document.body.classList.add('light-theme');
        themeToggle.textContent = '☀️';
    }
    
    themeToggle.addEventListener('click', () => {
        document.body.classList.toggle('light-theme');
        
        if (document.body.classList.contains('light-theme')) {
            themeToggle.textContent = '☀️';
            localStorage.setItem('theme', 'light');
        } else {
            themeToggle.textContent = '🌙';
            localStorage.setItem('theme', 'dark');
        }
    });
}