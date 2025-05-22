 const auth0Config = {
        domain: "dev-mlvc4obj0xoj262o.us.auth0.com",
        clientId: "msFAoItlh3wmSPTOfpTDkhFcwVuniIND", 
        audience: "https://api.employeemanagement.com",
        redirectUri: window.location.origin + "/employee-management-frontend/index.html",
        roleNamespace: "https://api.employeemanagement.com/roles"
    };

    // Theme management
    function initTheme() {
        const savedTheme = localStorage.getItem('theme') || 'light';
        document.documentElement.setAttribute('data-theme', savedTheme);
        
        const themeToggle = document.getElementById('theme-toggle');
        themeToggle.innerHTML = savedTheme === 'dark' 
            ? '<i class="fas fa-sun"></i>' 
            : '<i class="fas fa-moon"></i>';
            
        themeToggle.addEventListener('click', () => {
            const currentTheme = document.documentElement.getAttribute('data-theme');
            const newTheme = currentTheme === 'dark' ? 'light' : 'dark';
            
            document.documentElement.setAttribute('data-theme', newTheme);
            localStorage.setItem('theme', newTheme);
            
            themeToggle.innerHTML = newTheme === 'dark' 
                ? '<i class="fas fa-sun"></i>' 
                : '<i class="fas fa-moon"></i>';
        });
    }
    
    // Date and time management
    function updateDateTime() {
        const now = new Date();
        
        // Format date (shorter format)
        const dateOptions = { weekday: 'short', month: 'short', day: 'numeric' };
        document.getElementById('current-date').textContent = now.toLocaleDateString(undefined, dateOptions);
        
        // Format time (hours:minutes only)
        const timeOptions = { hour: '2-digit', minute: '2-digit' };
        document.getElementById('current-time').textContent = now.toLocaleTimeString(undefined, timeOptions);
    }
    
    // Personalized greeting based on time of day
    function updateGreeting(name) {
        const hour = new Date().getHours();
        let greeting;
        
        if (hour < 12) {
            greeting = `Good morning, ${name}!`;
        } else if (hour < 18) {
            greeting = `Good afternoon, ${name}!`;
        } else {
            greeting = `Good evening, ${name}!`;
        }
        
        document.getElementById('personal-greeting').textContent = greeting;
        document.getElementById('welcome-message').textContent = greeting;
        document.getElementById('welcome-message').style.display = 'block';
    }
    
    // Simulate weather data
    function initWeatherWidget() {
        const temps = [22, 24, 26, 23, 25];
        const randomTemp = temps[Math.floor(Math.random() * temps.length)];
        document.getElementById('weather-temp').textContent = `${randomTemp}°C`;
        document.getElementById('weather-widget').style.display = 'flex';
    }

    async function initApp() {
        initTheme();
        
        // Initialize date/time and update every minute
        updateDateTime();
        setInterval(updateDateTime, 60000);
        
        // Show date/time container
        document.getElementById('datetime-container').style.display = 'flex';
        
        // Initialize weather widget
        initWeatherWidget();
        
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
            updateGreeting(user.name || user.email.split('@')[0]);
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
            updateGreeting(user.name || user.email.split('@')[0]);
        }
    }

    function updateRoleUI(user, isAdmin) {
        const userName = user.name || user.email.split('@')[0];
        document.getElementById('user-name').textContent = userName;
        
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
