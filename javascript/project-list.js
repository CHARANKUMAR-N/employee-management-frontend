
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
                await initializeAuth0();
                const isAuthenticated = await checkAuth();
                if (!isAuthenticated) return;
                
                if (!isAdmin() && !isSeniorProjectManager()) {
                    showMessage("You don't have permission to access this page", "error");
                    window.location.href = "profile.html";
                    return;
                }

                projectModal = new bootstrap.Modal(document.getElementById('projectModal'));
                
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
                
                await loadProjects();
            } catch (error) {
                console.error("Initialization error:", error);
                showMessage("Initialization failed: " + error.message, "error");
            }
        }

        document.addEventListener('DOMContentLoaded', initializePage);
        window.editProject = editProject;
        window.deleteProject = deleteProject;
  
