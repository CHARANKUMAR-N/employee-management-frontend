    const auth0Config = {
        domain: "dev-mlvc4obj0xoj262o.us.auth0.com",
        clientId: "msFAoItlh3wmSPTOfpTDkhFcwVuniIND", 
        audience: "https://api.employeemanagement.com",
        redirectUri: window.location.origin + "/employee-management-frontend/index.html",
        roleNamespace: "https://api.employeemanagement.com/roles"
    };

    async function initApp() {
        const auth0Client = await window.auth0.createAuth0Client({
            domain: auth0Config.domain,
            clientId: auth0Config.clientId,
            authorizationParams: {
                audience: auth0Config.audience,
                redirect_uri: auth0Config.redirectUri,
                scope: 'openid profile email'
            }
        });

        window.auth0 = auth0Client;

        const isAuthenticated = await auth0Client.isAuthenticated();
        updateUI(isAuthenticated);

        if (isAuthenticated) {
            const user = await auth0Client.getUser();
            const roles = user[auth0Config.roleNamespace] || [];
            updateRoleUI(user, roles.includes('admin'));
        }

        document.getElementById('login-button').addEventListener('click', () => {
            auth0Client.loginWithRedirect();
        });

        document.getElementById('logout-button').addEventListener('click', () => {
            auth0Client.logout({
                logoutParams: {
                    returnTo: auth0Config.redirectUri
                }
            });
        });

        if (window.location.search.includes('state=') && window.location.search.includes('code=')) {
            await auth0Client.handleRedirectCallback();
            window.history.replaceState({}, document.title, "/");
            updateUI(true);
            const user = await auth0Client.getUser();
            const roles = user[auth0Config.roleNamespace] || [];
            updateRoleUI(user, roles.includes('admin'));
        }
    }

    function updateRoleUI(user, isAdmin) {
        document.getElementById('user-name').textContent = user.name || user.email.split('@')[0];
        
        const badge = document.getElementById('role-badge');
        badge.innerHTML = isAdmin 
            ? '<i class="fas fa-shield-alt me-1"></i><span id="role-text">Admin</span>'
            : '<i class="fas fa-user me-1"></i><span id="role-text">User</span>';
        badge.className = isAdmin ? 'role-badge admin-badge' : 'role-badge user-badge';
        
        document.getElementById('add-employee-btn').style.display = isAdmin ? 'block' : 'none';
    }

    function updateUI(isAuthenticated) {
        document.getElementById('login-button').style.display = isAuthenticated ? 'none' : 'block';
        document.getElementById('logout-button').style.display = isAuthenticated ? 'block' : 'none';
        document.getElementById('authenticated-content').style.display = isAuthenticated ? 'block' : 'none';
    }

    document.addEventListener("DOMContentLoaded", initApp);
