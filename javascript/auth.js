const API_BASE_URL = 'https://employee-management-backend-h2w3.onrender.com/api';
let auth0Client = null;

const auth0Config = {
    domain: "dev-mlvc4obj0xoj262o.us.auth0.com",
    clientId: "msFAoItlh3wmSPTOfpTDkhFcwVuniIND",
    audience: "https://api.employeemanagement.com",
    redirectUri: window.location.origin + "/employee-management-frontend/index.html"
};

// Initialize Auth0 client
async function initializeAuth0() {
    try {
        // Check if auth0 is available
        if (typeof auth0 === 'undefined') {
            throw new Error("Auth0 SDK not loaded. Check the script import.");
        }

        auth0Client = await auth0.createAuth0Client({
            domain: auth0Config.domain,
            clientId: auth0Config.clientId,
            authorizationParams: {
                audience: auth0Config.audience,
                redirect_uri: auth0Config.redirectUri,
                scope: 'openid profile email read:employees write:employees'
            }
        });

        // Handle redirect from Auth0
        if (window.location.search.includes('code=')) {
            await auth0Client.handleRedirectCallback();
            window.history.replaceState({}, document.title, window.location.pathname);
        }

        return auth0Client;
    } catch (error) {
        console.error("Auth0 initialization error:", error);
        throw error;
    }
}

// Handle login and store user info
async function handleLogin(user) {
    const roles = user['https://api.employeemanagement.com/roles'] || [];
    localStorage.setItem('user', JSON.stringify({
        email: user.email,
        name: user.name,
        roles: roles
    }));

    // Only redirect if we're on the index page
    if (window.location.pathname.endsWith('index.html') || 
        window.location.pathname === '/employee-management-frontend/') {
        // Redirect based on role
        if (roles.includes('admin')) {
            window.location.href = 'employee-list.html';
        } else if (roles.includes('senior_project_manager')) {
            window.location.href = 'project-list.html';
        } else if (roles.includes('project_manager')) {
            window.location.href = 'team-list.html';
        } else if (roles.includes('team_manager')) {
            window.location.href = 'team-details.html';
        } else {
            window.location.href = 'profile.html';
        }
    }
}

// Role check helpers
function hasRole(role) {
    const user = JSON.parse(localStorage.getItem('user'));
    return user && user.roles && user.roles.includes(role);
}

function isAdmin() {
    return hasRole('admin');
}

function isSeniorProjectManager() {
    return hasRole('senior_project_manager');
}

function isProjectManager() {
    return hasRole('project_manager');
}

function isTeamManager() {
    return hasRole('team_manager');
}

// API request helper
async function makeRequest(endpoint, method = 'GET', body = null, contentType = 'application/json') {
    try {
        const token = await auth0Client.getTokenSilently();
        const headers = {
            'Authorization': `Bearer ${token}`
        };

        if (contentType) {
            headers['Content-Type'] = contentType;
        }

        const options = {
            method,
            headers
        };

        if (body) {
            options.body = contentType === 'application/json' ? JSON.stringify(body) : body;
        }

        const response = await fetch(`${API_BASE_URL}${endpoint}`, options);

        if (!response.ok) {
            let errorResponse;
            try {
                errorResponse = await response.json();
            } catch (e) {
                const text = await response.text();
                throw new Error(`HTTP ${response.status}: ${text}`);
            }
            throw new Error(errorResponse.message || `HTTP ${response.status}`);
        }

        return response.status !== 204 ? await response.json() : null;
    } catch (err) {
        console.error("API Request Error:", err);
        showMessage("API request failed: " + err.message, "error");
        throw err;
    }
}

// UI helpers
function showMessage(message, type) {
    const container = document.getElementById("messageContainer") || document.body;
    const alert = document.createElement("div");
    alert.className = `alert alert-${type === 'error' ? 'danger' : 'success'} alert-dismissible fade show`;
    alert.innerHTML = `
        ${message}
        <button type="button" class="btn-close" data-bs-dismiss="alert" aria-label="Close"></button>
    `;
    container.prepend(alert);

    if (type === 'success') {
        setTimeout(() => alert.remove(), 5000);
    }
}

function showLoading(show) {
    const loadingView = document.getElementById("loadingView");
    if (loadingView) {
        loadingView.style.display = show ? 'flex' : 'none';
    }
}

// Check authentication and redirect if not logged in
async function checkAuth() {
    try {
        if (!auth0Client) {
            await initializeAuth0();
        }
        
        const isAuthenticated = await auth0Client.isAuthenticated();
        if (!isAuthenticated) {
            await auth0Client.loginWithRedirect({
                authorizationParams: {
                    redirect_uri: window.location.href
                }
            });
            return false;
        }
        return true;
    } catch (error) {
        console.error("Authentication check failed:", error);
        throw error;
    }
}

// Logout
async function logout() {
    await auth0Client.logout({
        logoutParams: {
            returnTo: auth0Config.redirectUri
        }
    });
}

// Expose globally
window.auth0Client = auth0Client;
window.initializeAuth0 = initializeAuth0;
window.makeRequest = makeRequest;
window.showMessage = showMessage;
window.showLoading = showLoading;
window.checkAuth = checkAuth;
window.logout = logout;
window.isAdmin = isAdmin;
window.isSeniorProjectManager = isSeniorProjectManager;
window.isProjectManager = isProjectManager;
window.isTeamManager = isTeamManager;
