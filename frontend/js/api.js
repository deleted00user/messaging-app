const API_BASE_URL = 'http://localhost:3000/api';

function getToken() {
    return localStorage.getItem('token');
}

function saveToken(token) {
    localStorage.setItem('token', token);
}

function removeToken() {
    localStorage.removeItem('token');
}

async function apiCall(endpoint, method = 'GET', body = null) {
    const headers = {
        'Content-Type': 'application/json'
    };

    const token = getToken();
    if (token) {
        headers['Authorization'] = `Bearer ${token}`;
    }

    const options = {
        method,
        headers
    };

    if (body) {
        options.body = JSON.stringify(body);
    }

    const response = await fetch(`${API_BASE_URL}${endpoint}`, options);
    const data = await response.json();

    if (!response.ok) {
        throw new Error(data.message || 'Something went wrong');
    }

    return data;
}

async function register(username, email, password) {
    return await apiCall('/auth/register', 'POST', { username, email, password });
}

async function login(identifier, password) {
    return await apiCall('/auth/login', 'POST', { 
        username: identifier, 
        email: identifier, 
        password 
    });
}

async function getMyProfile() {
    return await apiCall('/users/me');
}

async function searchUsers(query) {
    return await apiCall(`/users/search?q=${encodeURIComponent(query)}`);
}

async function sendMessage(receiverId, content) {
    return await apiCall('/messages', 'POST', { receiver_id: receiverId, content });
}

async function getMessages(userId, page = 1, limit = 20) {
    return await apiCall(`/messages/${userId}?page=${page}&limit=${limit}`);
}

async function getConversations() {
    return await apiCall('/messages/conversations');
}

async function editMessage(messageId, content) {
    return await apiCall(`/messages/${messageId}`, 'PUT', { content });
}

async function deleteMessage(messageId) {
    return await apiCall(`/messages/${messageId}`, 'DELETE');
}