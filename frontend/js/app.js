let currentChatUser = null;
let currentMessages = [];
let messagePollingInterval = null;

function showToast(message, type = 'info') {
    const container = document.getElementById('toast-container');
    
    const toast = document.createElement('div');
    toast.className = `toast ${type}`;
    
    const icon = type === 'success' ? '✓' : type === 'error' ? '✕' : 'ℹ';
    
    toast.innerHTML = `
        <span style="font-size: 1.2rem;">${icon}</span>
        <span>${message}</span>
    `;
    
    container.appendChild(toast);
    
    setTimeout(() => {
        toast.classList.add('hiding');
        setTimeout(() => {
            toast.remove();
        }, 300);
    }, 3000);
}

async function initApp() {
    try {
        await loadConversations();
        setupSearch();
        setupMessageSending();
        setupThemeToggle();
        setupScrollButton();
        setupMobileBackButton();
        setupProfileModal();
        setupUserProfileModal();
    } catch (error) {
        console.error('Error initializing app:', error);
    }
}

async function loadConversations() {
    const conversationsList = document.getElementById('conversations-list');
    
    conversationsList.innerHTML = '<div class="loading-container"><div class="loading-spinner"></div> Loading conversations...</div>';
    
    try {
        const conversations = await getConversations();
        
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
        conversationsList.innerHTML = '<p style="padding: 1rem; text-align: center; color: var(--error);">Failed to load conversations</p>';
        showToast('Failed to load conversations', 'error');
    }
}

async function openChat(user) {
    showChatOnMobile();
    
    currentChatUser = user;
    
    const displayName = user.display_name || user.username;
    const chatUsername = document.getElementById('chat-username');
    chatUsername.textContent = displayName;
    
    chatUsername.style.cursor = 'pointer';
    chatUsername.onclick = () => showUserProfile(user.id);
    
    document.querySelectorAll('.conversation-item').forEach(item => {
        item.classList.remove('active');
        if (item.dataset.userId == user.id) {
            item.classList.add('active');
        }
    });
    
    await loadMessages(user.id);
    
    if (messagePollingInterval) {
        clearInterval(messagePollingInterval);
    }
    
    messagePollingInterval = setInterval(async () => {
        if (currentChatUser && currentChatUser.id === user.id) {
            const container = document.getElementById('messages-container');
            const wasAtBottom = isAtBottom(container);
            
            await loadMessages(user.id);
            
            if (wasAtBottom) {
                container.scrollTop = container.scrollHeight;
            }
        }
    }, 3000);
}

async function loadMessages(userId) {
    const container = document.getElementById('messages-container');
    
    if (currentMessages.length === 0) {
        container.innerHTML = '<div class="loading-container"><div class="loading-spinner"></div> Loading messages...</div>';
    }
    
    try {
        const messages = await getMessages(userId);
        currentMessages = messages;
        displayMessages(messages);
    } catch (error) {
        console.error('Error loading messages:', error);
        container.innerHTML = '<p style="padding: 1rem; text-align: center; color: var(--error);">Failed to load messages</p>';
    }
}

function displayMessages(messages) {
    const container = document.getElementById('messages-container');
    
    const wasAtBottom = isAtBottom(container);
    
    container.innerHTML = '';
    
    if (messages.length === 0) {
        const displayName = currentChatUser.display_name || currentChatUser.username;
        container.innerHTML = `
            <div style="
                display: flex;
                flex-direction: column;
                align-items: center;
                justify-content: center;
                height: 100%;
                color: var(--text-secondary);
                text-align: center;
                padding: 2rem;
            ">
                <div style="font-size: 3rem; margin-bottom: 1rem;">💬</div>
                <h3 style="margin-bottom: 0.5rem; color: var(--text-primary);">No messages yet</h3>
                <p>Start the conversation with ${displayName}!</p>
            </div>
            <button id="scroll-to-bottom">↓</button>
        `;
        return;
    }
    
    const reversedMessages = [...messages].reverse();
    
    let lastDate = null;
    
    reversedMessages.forEach(msg => {
        const messageDate = new Date(msg.created_at);
        const dateString = formatDateDivider(messageDate);
        
        if (dateString !== lastDate) {
            const divider = document.createElement('div');
            divider.className = 'date-divider';
            divider.innerHTML = `<span>${dateString}</span>`;
            container.appendChild(divider);
            lastDate = dateString;
        }
        
        const messageEl = document.createElement('div');
        const isSent = msg.sender_id !== currentChatUser.id;
        messageEl.className = `message ${isSent ? 'sent' : 'received'}`;
        messageEl.dataset.messageId = msg.id;
        
        const time = new Date(msg.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
        const edited = msg.is_edited ? ' (edited)' : '';
        
        messageEl.innerHTML = `
            <div class="message-content">${escapeHtml(msg.content)}</div>
            <div class="message-time">${time}${edited}</div>
        `;
    

        if (isSent) {
            messageEl.addEventListener('contextmenu', (e) => {
                e.preventDefault();
                showContextMenu(e.clientX, e.clientY, msg);
            });
            
            let longPressTimer;
            messageEl.addEventListener('touchstart', (e) => {
                longPressTimer = setTimeout(() => {
                    const touch = e.touches[0];
                    showContextMenu(touch.clientX, touch.clientY, msg);
                }, 500);
            });
            
            messageEl.addEventListener('touchend', () => {
                clearTimeout(longPressTimer);
            });
            
            messageEl.addEventListener('touchmove', () => {
                clearTimeout(longPressTimer);
            });
        }
        
        container.appendChild(messageEl);
    });
    
    const scrollBtn = document.createElement('button');
    scrollBtn.id = 'scroll-to-bottom';
    scrollBtn.textContent = '↓';
    container.appendChild(scrollBtn);
    
    if (wasAtBottom) {
        scrollToBottom(false);
    }
    
    setupScrollButton();
}

function formatDateDivider(date) {
    const today = new Date();
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);
    
    const dateOnly = new Date(date.getFullYear(), date.getMonth(), date.getDate());
    const todayOnly = new Date(today.getFullYear(), today.getMonth(), today.getDate());
    const yesterdayOnly = new Date(yesterday.getFullYear(), yesterday.getMonth(), yesterday.getDate());
    
    if (dateOnly.getTime() === todayOnly.getTime()) {
        return 'Today';
    } else if (dateOnly.getTime() === yesterdayOnly.getTime()) {
        return 'Yesterday';
    } else {
        return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
    }
}

function isAtBottom(container) {
    const threshold = 100; 
    return container.scrollHeight - container.scrollTop - container.clientHeight < threshold;
}

function scrollToBottom(smooth = true) {
    const container = document.getElementById('messages-container');
    if (smooth) {
        container.scrollTo({
            top: container.scrollHeight,
            behavior: 'smooth'
        });
    } else {
        container.scrollTop = container.scrollHeight;
    }
}

function setupScrollButton() {
    const container = document.getElementById('messages-container');
    const scrollBtn = document.getElementById('scroll-to-bottom');
    
    if (!scrollBtn) return;
    
    container.addEventListener('scroll', () => {
        if (isAtBottom(container)) {
            scrollBtn.classList.remove('show');
        } else {
            scrollBtn.classList.add('show');
        }
    });
    
    scrollBtn.addEventListener('click', () => {
        scrollToBottom(true);
    });
}

function setupMobileBackButton() {
    const backBtn = document.getElementById('mobile-back-btn');
    const sidebar = document.getElementById('sidebar');
    const chatArea = document.getElementById('chat-area');
    
    backBtn.addEventListener('click', () => {
        if (window.innerWidth <= 768) {
            sidebar.style.display = 'flex';
            chatArea.style.display = 'none';
        }
    });
}

function showChatOnMobile() {
    if (window.innerWidth <= 768) {
        const sidebar = document.getElementById('sidebar');
        const chatArea = document.getElementById('chat-area');
        
        sidebar.style.display = 'none';
        chatArea.style.display = 'flex';
    }
}

function showContextMenu(x, y, message) {
    const existingMenu = document.querySelector('.context-menu');
    if (existingMenu) {
        existingMenu.remove();
    }
    
    const menu = document.createElement('div');
    menu.className = 'context-menu';
    
    menu.innerHTML = `
        <div class="context-menu-item edit-item">
            <span>✏️</span>
            <span>Edit</span>
        </div>
        <div class="context-menu-item delete-item delete">
            <span>🗑️</span>
            <span>Delete</span>
        </div>
    `;
    
    menu.style.left = `${x}px`;
    menu.style.top = `${y}px`;
    
    document.body.appendChild(menu);
    
    const rect = menu.getBoundingClientRect();
    if (rect.right > window.innerWidth) {
        menu.style.left = `${x - rect.width}px`;
    }
    if (rect.bottom > window.innerHeight) {
        menu.style.top = `${y - rect.height}px`;
    }
    
    menu.querySelector('.edit-item').addEventListener('click', () => {
        menu.remove();
        startEditingMessage(message);
    });
    
    menu.querySelector('.delete-item').addEventListener('click', () => {
        menu.remove();
        confirmDeleteMessage(message);
    });
    
    setTimeout(() => {
        document.addEventListener('click', closeContextMenu);
    }, 0);
}

function closeContextMenu() {
    const menu = document.querySelector('.context-menu');
    if (menu) {
        menu.remove();
    }
    document.removeEventListener('click', closeContextMenu);
}

function startEditingMessage(message) {
    const messageEl = document.querySelector(`[data-message-id="${message.id}"]`);
    if (!messageEl) return;
    
    messageEl.classList.add('editing');
    
    const contentEl = messageEl.querySelector('.message-content');
    const originalContent = contentEl.textContent;
    
    contentEl.contentEditable = true;
    contentEl.focus();
    
    const range = document.createRange();
    range.selectNodeContents(contentEl);
    const selection = window.getSelection();
    selection.removeAllRanges();
    selection.addRange(range);
    
    const actionsDiv = document.createElement('div');
    actionsDiv.className = 'edit-actions';
    actionsDiv.innerHTML = `
        <button class="save-btn">Save</button>
        <button class="cancel-btn">Cancel</button>
    `;
    
    messageEl.appendChild(actionsDiv);
    
    actionsDiv.querySelector('.save-btn').addEventListener('click', async () => {
        const newContent = contentEl.textContent.trim();
        
        if (!newContent) {
            showToast('Message cannot be empty', 'error');
            return;
        }
        
        if (newContent === originalContent) {
            cancelEdit();
            return;
        }
        
        try {
            await editMessage(message.id, newContent);
            await loadMessages(currentChatUser.id);
            await loadConversations();
            showToast('Message edited!', 'success');
        } catch (error) {
            console.error('Error editing message:', error);
            showToast('Failed to edit message', 'error');
            contentEl.textContent = originalContent;
            cancelEdit();
        }
    });
    
    actionsDiv.querySelector('.cancel-btn').addEventListener('click', () => {
        contentEl.textContent = originalContent;
        cancelEdit();
    });
    
    function cancelEdit() {
        messageEl.classList.remove('editing');
        contentEl.contentEditable = false;
        actionsDiv.remove();
    }
}

function confirmDeleteMessage(message) {
    const confirmed = confirm('Are you sure you want to delete this message?');
    
    if (confirmed) {
        deleteMessageHandler(message);
    }
}

async function deleteMessageHandler(message) {
    try {
        await deleteMessage(message.id);
        await loadMessages(currentChatUser.id);
        await loadConversations();
        showToast('Message deleted!', 'success');
    } catch (error) {
        console.error('Error deleting message:', error);
        showToast('Failed to delete message', 'error');
    }
}

function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

function setupMessageSending() {
    const input = document.getElementById('message-input');
    const sendBtn = document.getElementById('send-btn');
    
    const send = async () => {
        const content = input.value.trim();
        
        if (!content || !currentChatUser) return;
        
        sendBtn.classList.add('loading');
        sendBtn.textContent = 'Sending...';
        
        try {
            await sendMessage(currentChatUser.id, content);
            input.value = '';
            
            await loadMessages(currentChatUser.id);
            await loadConversations();
            
            showToast('Message sent!', 'success');
        } catch (error) {
            console.error('Error sending message:', error);
            showToast('Failed to send message', 'error');
        } finally {
            sendBtn.classList.remove('loading');
            sendBtn.textContent = 'Send';
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

function setupProfileModal() {
    const profileBtn = document.getElementById('profile-btn');
    const modal = document.getElementById('profile-modal');
    const closeBtn = document.getElementById('close-profile-modal');
    const editBtn = document.getElementById('edit-profile-btn');
    const saveBtn = document.getElementById('save-profile-btn');
    const cancelBtn = document.getElementById('cancel-edit-btn');
    const profileView = document.getElementById('profile-view');
    const profileForm = document.getElementById('profile-edit-form');
    
    profileBtn.addEventListener('click', async () => {
        await loadProfile();
        modal.classList.add('show');
    });
    
    closeBtn.addEventListener('click', () => {
        modal.classList.remove('show');
        showViewMode();
    });
    
    modal.addEventListener('click', (e) => {
        if (e.target === modal) {
            modal.classList.remove('show');
            showViewMode();
        }
    });
    
    editBtn.addEventListener('click', () => {
        showEditMode();
    });
    
    cancelBtn.addEventListener('click', () => {
        showViewMode();
    });
    
    profileForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        await saveProfile();
    });
    
    saveBtn.addEventListener('click', async () => {
        await saveProfile();
    });
    
    function showViewMode() {
        profileView.style.display = 'block';
        profileForm.classList.remove('show');
        editBtn.style.display = 'block';
        saveBtn.style.display = 'none';
        cancelBtn.style.display = 'none';
    }
    
    function showEditMode() {
        profileView.style.display = 'none';
        profileForm.classList.add('show');
        editBtn.style.display = 'none';
        saveBtn.style.display = 'block';
        cancelBtn.style.display = 'block';
    }
}

async function loadProfile() {
    try {
        const profile = await getMyProfile();
        
        document.getElementById('profile-avatar').textContent = profile.username.charAt(0).toUpperCase();
        
        document.getElementById('view-username').textContent = profile.username;
        document.getElementById('view-email').textContent = profile.email;
        document.getElementById('view-display-name').textContent = profile.display_name || 'Not set';
        document.getElementById('view-bio').textContent = profile.bio || 'Not set';
        
        document.getElementById('edit-display-name').value = profile.display_name || '';
        document.getElementById('edit-bio').value = profile.bio || '';
        
    } catch (error) {
        console.error('Error loading profile:', error);
        showToast('Failed to load profile', 'error');
    }
}

async function saveProfile() {
    const displayName = document.getElementById('edit-display-name').value.trim();
    const bio = document.getElementById('edit-bio').value.trim();
    
    try {
        await apiCall('/users/me', 'PUT', {
            display_name: displayName || null,
            bio: bio || null
        });
        
        showToast('Profile updated!', 'success');
        await loadProfile();
        
        document.getElementById('profile-view').style.display = 'block';
        document.getElementById('profile-edit-form').classList.remove('show');
        document.getElementById('edit-profile-btn').style.display = 'block';
        document.getElementById('save-profile-btn').style.display = 'none';
        document.getElementById('cancel-edit-btn').style.display = 'none';
        
    } catch (error) {
        console.error('Error saving profile:', error);
        showToast('Failed to update profile', 'error');
    }
}

function setupUserProfileModal() {
    const modal = document.getElementById('user-profile-modal');
    const closeBtn = document.getElementById('close-user-profile-modal');
    const closeBottomBtn = document.getElementById('close-user-profile-btn');
    
    closeBtn.addEventListener('click', () => {
        modal.classList.remove('show');
    });
    
    closeBottomBtn.addEventListener('click', () => {
        modal.classList.remove('show');
    });
    
    modal.addEventListener('click', (e) => {
        if (e.target === modal) {
            modal.classList.remove('show');
        }
    });
}

async function showUserProfile(userId) {
    try {
        const user = await apiCall(`/users/${userId}`);
        
        const modal = document.getElementById('user-profile-modal');
        
        document.getElementById('user-profile-avatar').textContent = user.username.charAt(0).toUpperCase();
        
        document.getElementById('user-view-username').textContent = user.username;
        document.getElementById('user-view-display-name').textContent = user.display_name || 'Not set';
        document.getElementById('user-view-bio').textContent = user.bio || 'Not set';
        
        modal.classList.add('show');
        
    } catch (error) {
        console.error('Error loading user profile:', error);
        showToast('Failed to load user profile', 'error');
    }
}