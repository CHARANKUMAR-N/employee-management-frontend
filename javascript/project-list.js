let projectModal;
        let projects = [];
        let seniorPms = [];

        async function loadProjects() {
            try {
                showLoading(true);
                const data = await makeRequest('/projects');
                projects = data;
                renderProjects();
            } catch (error) {
                console.error("Error loading projects:", error);
                showMessage("Failed to load projects: " + error.message, "error");
            } finally {
                showLoading(false);
            }
        }

        function renderProjects() {
            const tbody = document.getElementById('projectTableBody');
            tbody.innerHTML = projects.map(project => `
                <tr>
                    <td>${project.id}</td>
                    <td>${project.name}</td>
                    <td>${project.seniorProjectManagerName || 'Not assigned'}</td>
                    <td>${project.teamsCount}</td>  
                    <td class="action-buttons">
                        <button class="btn btn-sm btn-outline-primary me-1" 
                                onclick="editProject(${project.id})">
                            <i class="bi bi-pencil"></i>
                        </button>
                        <button class="btn btn-sm btn-outline-danger" 
                                onclick="deleteProject(${project.id})">
                            <i class="bi bi-trash"></i>
                        </button>
                    </td>
                </tr>
            `).join('');
        }

        async function loadSeniorPms() {
            try {
                showLoading(true);
                const data = await makeRequest('/employees?role=SENIOR_PROJECT_MANAGER');
                seniorPms = data;
                const select = document.getElementById('seniorPmSelect');
                select.innerHTML = '<option value="">Select Senior PM</option>' + 
                    data.map(emp => `
                        <option value="${emp.employeeId}">
                            ${emp.firstName} ${emp.lastName} (${emp.email})
                        </option>
                    `).join('');
            } catch (error) {
                console.error("Error loading senior PMs:", error);
                showMessage("Failed to load senior PMs: " + error.message, "error");
            } finally {
                showLoading(false);
            }
        }

        function openProjectModal(project = null) {
            const modalTitle = document.getElementById('projectModalTitle');
            const form = document.getElementById('projectForm');
            
            if (project) {
                modalTitle.textContent = 'Edit Project';
                document.getElementById('projectId').value = project.id;
                document.getElementById('projectName').value = project.name;
                if (project.seniorProjectManagerId) {
                    document.getElementById('seniorPmSelect').value = project.seniorProjectManagerId;
                }
            } else {
                modalTitle.textContent = 'Add Project';
                form.reset();
            }
            
            projectModal.show();
        }

        async function saveProject() {
            const projectId = document.getElementById('projectId').value;
            const projectName = document.getElementById('projectName').value;
            const seniorPmId = document.getElementById('seniorPmSelect').value;
            
            if (!projectName) {
                showMessage("Project name is required", "error");
                return;
            }
            
            const projectData = {
                name: projectName,
                seniorProjectManagerId: seniorPmId || null
            };
            
            try {
                showLoading(true);
                let response;
                if (projectId) {
                    response = await makeRequest(`/projects/${projectId}`, 'PUT', projectData);
                    showMessage("Project updated successfully", "success");
                } else {
                    response = await makeRequest('/projects', 'POST', projectData);
                    showMessage("Project created successfully", "success");
                }
                
                projectModal.hide();
                await loadProjects();
            } catch (error) {
                console.error("Error saving project:", error);
                showMessage("Failed to save project: " + error.message, "error");
            } finally {
                showLoading(false);
            }
        }

        async function editProject(id) {
            const project = projects.find(p => p.id === id);
            await loadSeniorPms();
            openProjectModal(project);
        }

        async function deleteProject(id) {
            if (!confirm("Are you sure you want to delete this project?")) return;
            
            try {
                showLoading(true);
                await makeRequest(`/projects/${id}`, 'DELETE');
                showMessage("Project deleted successfully", "success");
                await loadProjects();
            } catch (error) {
                console.error("Error deleting project:", error);
                showMessage("Failed to delete project: " + error.message, "error");
            } finally {
                showLoading(false);
            }
        }

        async function initializePage() {
    try {
        showLoading(true);
        
        // Initialize Auth0
        await initializeAuth0();
        
        // Check authentication
        const isAuthenticated = await checkAuth();
        if (!isAuthenticated) {
            // If not authenticated, redirect to login
            window.location.href = '/index.html';
            return;
        }

        // Get user data
        let user = JSON.parse(localStorage.getItem('user'));
        
        // If user data not in localStorage, fetch from Auth0
        if (!user) {
            user = await auth0Client.getUser();
            if (!user) {
                throw new Error("Failed to retrieve user information");
            }
            localStorage.setItem('user', JSON.stringify(user));
        }

        // Ensure user has roles
        if (!user.roles || user.roles.length === 0) {
            throw new Error("User has no assigned roles");
        }

        // Check if user has required role
        const hasRequiredRole = user.roles.includes('admin') || 
                              user.roles.includes('senior_project_manager');
        
        if (!hasRequiredRole) {
            // Redirect to appropriate page based on role
            if (user.roles.includes('team_leader')) {
                window.location.href = '/team-leader-dashboard.html';
            } else if (user.roles.includes('project_manager')) {
                window.location.href = '/project-manager-dashboard.html';
            } else {
                // Default redirect for other roles
                window.location.href = '/profile.html';
            }
            return;
        }

        // Initialize page components if user has proper role
        projectModal = new bootstrap.Modal(document.getElementById('projectModal'));
        
        // Set up event listeners
        document.getElementById('add-project-btn').addEventListener('click', async () => {
            await loadSeniorPms();
            openProjectModal();
        });
        
        document.getElementById('saveProjectBtn').addEventListener('click', saveProject);
        
        document.getElementById('logout-button').addEventListener('click', () => {
            auth0Client.logout({
                logoutParams: {
                    returnTo: window.location.origin + "/index.html"
                }
            });
        });
        
        // Load initial data
        await loadProjects();
        
    } catch (error) {
        console.error("Initialization error:", error);
        showMessage("Error: " + error.message, "error");
        
        // If there's an error with authentication or roles, redirect to appropriate page
        if (error.message.includes("User") || error.message.includes("role")) {
            window.location.href = '/index.html';
        }
    } finally {
        showLoading(false);
    }
}

        document.addEventListener('DOMContentLoaded', initializePage);
        window.editProject = editProject;
        window.deleteProject = deleteProject;
  
