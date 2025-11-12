document.getElementById('show-login').addEventListener('click', () => {
    document.getElementById('login-form').style.display = 'block';
    document.getElementById('register-form').style.display = 'none';
    document.getElementById('show-login').classList.add('active');
    document.getElementById('show-register').classList.remove('active');
});

document.getElementById('show-register').addEventListener('click', () => {
    document.getElementById('login-form').style.display = 'none';
    document.getElementById('register-form').style.display = 'block';
    document.getElementById('show-register').classList.add('active');
    document.getElementById('show-login').classList.remove('active');
});

document.getElementById('login-form').addEventListener('submit', async (e) => {
    e.preventDefault();
    
    const identifier = document.getElementById('login-identifier').value;
    const password = document.getElementById('login-password').value;
    const errorEl = document.getElementById('login-error');
    
    try {
        const data = await login(identifier, password);
        saveToken(data.token);
        
        document.getElementById('auth-container').style.display = 'none';
        document.getElementById('app-container').style.display = 'grid';
        
        showToast('Login successful!', 'success');
        
        initApp();
    } catch (error) {
        errorEl.textContent = error.message;
        showToast(error.message, 'error');
    }
});

document.getElementById('register-form').addEventListener('submit', async (e) => {
    e.preventDefault();
    
    const username = document.getElementById('register-username').value;
    const email = document.getElementById('register-email').value;
    const password = document.getElementById('register-password').value;
    const errorEl = document.getElementById('register-error');
    
    try {
        const data = await register(username, email, password);
        saveToken(data.token);
        
        document.getElementById('auth-container').style.display = 'none';
        document.getElementById('app-container').style.display = 'grid';
        
        showToast('Registration successful!', 'success');
        
        initApp();
    } catch (error) {
        errorEl.textContent = error.message;
        showToast(error.message, 'error');
    }
});

document.getElementById('logout-btn').addEventListener('click', () => {
    if (window.messagePollingInterval) {
        clearInterval(window.messagePollingInterval);
    }
    
    removeToken();
    document.getElementById('auth-container').style.display = 'flex';
    document.getElementById('app-container').style.display = 'none';
    
    showToast('Logged out successfully', 'info');
});

window.addEventListener('DOMContentLoaded', () => {
    const token = getToken();
    if (token) {
        document.getElementById('auth-container').style.display = 'none';
        document.getElementById('app-container').style.display = 'grid';
        initApp();
    }
});