        const API_BASE_URL = 'https://employee-management-backend-h2w3.onrender.com/api';
        let auth0Client;
        let currentUserRoles = [];
        let isAdmin = false;
        let photoUploadModal;
        let currentUser = {};
        let employeesData = []; // Store the original employee data for sorting

        const auth0Config = {
            domain: "dev-mlvc4obj0xoj262o.us.auth0.com",
            clientId: "msFAoItlh3wmSPTOfpTDkhFcwVuniIND",
            audience: "https://api.employeemanagement.com",
            redirectUri: window.location.origin + "/index.html"
        };

        async function createAuth0ClientInstance() {
            return await window.auth0.createAuth0Client({
                domain: auth0Config.domain,
                clientId: auth0Config.clientId,
                authorizationParams: {
                    audience: auth0Config.audience,
                    redirect_uri: auth0Config.redirectUri,
                    scope: 'openid profile email read:employees write:employees'
                }
            });
        }
        
        async function initializeAuth0() {
            try {
                auth0Client = await createAuth0ClientInstance();
                console.log("Auth0 Client initialized:", auth0Client);
                
                // Handle redirect from Auth0
                if (window.location.search.includes('code=')) {				
                    await auth0Client.handleRedirectCallback();
                    window.history.replaceState({}, document.title, window.location.pathname);
                }

                const isAuthenticated = await auth0Client.isAuthenticated();
                if (!isAuthenticated) {
                    await auth0Client.loginWithRedirect();
                    return false;
                }
                
                // Get user info and roles
                const user = await auth0Client.getUser();
                currentUser = user;
                currentUserRoles = user['https://api.employeemanagement.com/roles'] || [];
                isAdmin = currentUserRoles.includes('admin');
                console.log("User roles:", currentUserRoles);
                
                // Update admin email link with user details
                if (currentUser.email) {
                    const subject = `Employee Record Modification Request (ID: ${currentUser.email})`;
                    const body = `Dear Admin,\n\nI would like to request modifications to my employee record.\n\nDetails:\nEmployee ID: ${currentUser.email}\nRequested Changes: \n\nThank you,\n${currentUser.name || 'Employee'}`;
                    document.getElementById('adminEmailLink').href = 
                        `mailto:charan123@gmail.com?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
                }
                
                return true;
            } catch (err) {
                console.error("Auth0 init error:", err);
                showMessage("Auth0 initialization failed. Please try again later.", "error");
                throw err;
            }
        }

        function updateRoleBasedUI() {
            const addEmployeeBtn = document.getElementById('add-employee-btn');
            if (addEmployeeBtn) {
                addEmployeeBtn.style.display = isAdmin ? 'inline-block' : 'none';
            }
            
            // Show contact admin info for non-admin users
            const contactAdminAlert = document.getElementById('contactAdminAlert');
            if (contactAdminAlert) {
                contactAdminAlert.classList.toggle('d-none', isAdmin);
            }
            
            // Show sort controls for admin users
            const sortControls = document.getElementById('sortControls');
            if (sortControls) {
                sortControls.classList.toggle('d-none', !isAdmin);
            }
        }

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
                    if (contentType === 'application/json') {
                        options.body = JSON.stringify(body);
                    } else {
                        options.body = body;
                    }
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

                if (response.status !== 204) {
                    return await response.json();
                }
            } catch (err) {
                console.error("API Request Error:", err);
                showMessage("API request failed: " + err.message, "error");
                throw err;
            }
        }

        async function loadEmployees() {
            try {
                showLoading(true);
                const data = await makeRequest('/employees');
                employeesData = data; // Store the original data for sorting
                
                if (!isAdmin) {
                    // For non-admin users, verify we only got their own record
                    const user = await auth0Client.getUser();
                    const userEmail = user.email;
                    
                    if (data.length !== 1 || 
                        (data[0].email !== userEmail && data[0].personalEmail !== userEmail)) {
                        console.error("Data access violation detected");
                        throw new Error("Access violation - retrieved incorrect employee data");
                    }
                }
                
                populateEmployeeTable(data);
            } catch (error) {
                if (error.message.includes("403") || error.message.includes("Forbidden")) {
                    showMessage("Access denied. Please contact support if you believe this is an error.", "error");
                    setTimeout(() => window.location.href = '/profile.html', 2000);
                } else {
                    showMessage("Failed to load data: " + error.message, "error");
                }
            } finally {
                showLoading(false);
            }
        }

        function sortEmployees() {
            const sortField = document.getElementById('sortField').value;
            const sortDirection = document.getElementById('sortDirection').value;
            
            const sortedEmployees = [...employeesData].sort((a, b) => {
                // Handle cases where fields might be null or undefined
                const aValue = a[sortField] || '';
                const bValue = b[sortField] || '';
                
                if (typeof aValue === 'string' && typeof bValue === 'string') {
                    return sortDirection === 'asc' 
                        ? aValue.localeCompare(bValue)
                        : bValue.localeCompare(aValue);
                } else {
                    return sortDirection === 'asc' 
                        ? aValue - bValue
                        : bValue - aValue;
                }
            });
            
            populateEmployeeTable(sortedEmployees);
        }

        function populateEmployeeTable(employees) {
            const tableBody = document.getElementById('employeeTableBody');
            if (!employees || employees.length === 0) {
                tableBody.innerHTML = `<tr><td colspan="7" class="text-center">No employees found</td></tr>`;
                return;
            }

            tableBody.innerHTML = employees.map(emp => {
                const isOwnRecord = currentUser.email && 
                                  (currentUser.email === emp.email || 
                                   currentUser.email === emp.personalEmail);                
                return `
                    <tr>
                        <td>
                            <div class="photo-upload-container">
                                <div class="employee-photo photo-loading">
                                    <div class="spinner-border spinner-border-sm" role="status">
                                        <span class="visually-hidden">Loading...</span>
                                    </div>
                                </div>
                                ${isAdmin ? `<div class="photo-upload-btn" onclick="openPhotoUploadModal(${emp.employeeId})">
                                    <i class="bi bi-camera"></i>
                                </div>` : ''}
                            </div>
                        </td>
                        <td>${emp.employeeId}</td>
                        <td>${emp.firstName} ${emp.lastName}</td>
                        <td>${emp.email || 'N/A'}</td>
                        <td>${emp.mobile || 'N/A'}</td>
                        <td>${emp.dob ? new Date(emp.dob).toLocaleDateString() : 'N/A'}</td>
                        <td class="action-buttons">
                            ${isAdmin ? `<a href="employee-form.html?id=${emp.employeeId}" class="btn btn-sm btn-outline-warning me-2" title="Edit">
                                <i class="bi bi-pencil"></i>
                            </a>` : ''}
                            ${isAdmin ? `<button onclick="deleteEmployee(${emp.employeeId})" class="btn btn-sm btn-outline-danger me-2" title="Delete">
                                <i class="bi bi-trash"></i>
                            </button>` : ''}
                            ${(isAdmin || isOwnRecord) ? `<button onclick="downloadEmployeePdf(${emp.employeeId})" class="btn btn-sm btn-outline-info" title="Download PDF">
                                <i class="bi bi-file-earmark-pdf"></i>
                            </button>` : '<button class="btn btn-sm btn-outline-secondary" disabled><i class="bi bi-file-earmark-pdf"></i></button>'}
                        </td>
                    </tr>
                `;
            }).join('');

            // Load photos after table is populated
            loadProfilePhotos(employees);
        }

        async function loadProfilePhotos(employees) {
            try {
                const token = await auth0Client.getTokenSilently();
                
                for (const emp of employees) {
                    const photoContainers = document.querySelectorAll(`.photo-upload-container`);
                    const currentContainer = photoContainers[employees.indexOf(emp)];
                    
                    if (!currentContainer) continue;
                    
                    try {
                        const response = await fetch(`${API_BASE_URL}/employees/${emp.employeeId}/profile-photo`, {
                            headers: {
                                'Authorization': `Bearer ${token}`
                            }
                        });
                        
                        if (response.ok) {
                            const blob = await response.blob();
                            const url = URL.createObjectURL(blob);
                            
                            currentContainer.innerHTML = `
                                <img src="${url}" 
                                     alt="Profile Photo" 
                                     class="employee-photo"
                                     onerror="handleImageError(this)">
                                ${isAdmin ? `<div class="photo-upload-btn" onclick="openPhotoUploadModal(${emp.employeeId})">
                                    <i class="bi bi-camera"></i>
                                </div>` : ''}
                            `;
                        } else {
                            handleImageError(currentContainer, emp.employeeId);
                        }
                    } catch (error) {
                        console.error(`Error loading photo for employee ${emp.employeeId}:`, error);
                        handleImageError(currentContainer, emp.employeeId);
                    }
                }
            } catch (error) {
                console.error("Error getting token for photo loading:", error);
                document.querySelectorAll('.photo-upload-container').forEach(container => {
                    const employeeId = container.querySelector('.photo-upload-btn')?.getAttribute('onclick')?.match(/\d+/)?.[0];
                    handleImageError(container, employeeId);
                });
            }
        }

        function handleImageError(container, employeeId) {
            container.innerHTML = `
                <img src="data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='50' height='50' viewBox='0 0 50 50'%3E%3Crect width='50' height='50' fill='%23ddd'/%3E%3Ctext x='50%' y='50%' font-family='Arial' font-size='10' text-anchor='middle' dominant-baseline='middle' fill='%23666'%3ENo Photo%3C/text%3E%3C/svg%3E" 
                     alt="Profile Photo" 
                     class="employee-photo">
                ${isAdmin && employeeId ? `<div class="photo-upload-btn" onclick="openPhotoUploadModal(${employeeId})">
                    <i class="bi bi-camera"></i>
                </div>` : ''}
            `;
        }

        function openPhotoUploadModal(employeeId) {
            document.getElementById('photoEmployeeId').value = employeeId;
            document.getElementById('photoFile').value = '';
            document.getElementById('photoPreview').classList.add('d-none');
            photoUploadModal.show();
        }

        async function uploadProfilePhoto() {
            const employeeId = document.getElementById('photoEmployeeId').value;
            const fileInput = document.getElementById('photoFile');
            const file = fileInput.files[0];
            
            if (!file) {
                showMessage("Please select a file first", "error");
                return;
            }
            
            // Check file size (2MB max)
            if (file.size > 2 * 1024 * 1024) {
                showMessage("File size exceeds 2MB limit", "error");
                return;
            }
            
            try {
                showLoading(true);
                const token = await auth0Client.getTokenSilently();
                
                const formData = new FormData();
                formData.append('file', file);
                
                const response = await fetch(`${API_BASE_URL}/employees/${employeeId}/profile-photo`, {
                    method: 'POST',
                    headers: {
                        'Authorization': `Bearer ${token}`
                    },
                    body: formData
                });
                
                if (!response.ok) {
                    throw new Error(await response.text());
                }
                
                photoUploadModal.hide();
                showMessage("Profile photo uploaded successfully!", "success");
                await loadEmployees();
            } catch (error) {
                console.error("Photo upload failed:", error);
                showMessage("Failed to upload photo: " + error.message, "error");
            } finally {
                showLoading(false);
            }
        }

        async function deleteEmployee(id) {
            if (!confirm("Are you sure you want to delete this employee?")) return;
            try {
                showLoading(true);
                await makeRequest(`/employees/${id}`, "DELETE");
                showMessage("Employee deleted successfully!", "success");
                await loadEmployees();
            } catch (err) {
                showMessage("Error deleting employee: " + err.message, "error");
            } finally {
                showLoading(false);
            }
        }

        async function downloadEmployeePdf(employeeId) {
            try {
                showLoading(true);
                const token = await auth0Client.getTokenSilently();
                
                const response = await fetch(`${API_BASE_URL}/employees/${employeeId}/pdf`, {
                    headers: {
                        'Authorization': `Bearer ${token}`
                    }
                });
                
                if (!response.ok) {
                    const errorData = await response.json();
                    throw new Error(errorData.message || `HTTP error! status: ${response.status}`);
                }
                
                const blob = await response.blob();
                const url = window.URL.createObjectURL(blob);
                const a = document.createElement('a');
                a.href = url;
                a.download = `employee_${employeeId}.pdf`;
                document.body.appendChild(a);
                a.click();
                window.URL.revokeObjectURL(url);
                a.remove();
                
                showMessage("PDF downloaded successfully!", "success");
            } catch (error) {
                console.error("Download failed:", error);
                showMessage("Failed to download PDF: " + error.message, "error");
                
                if (error.message.includes("access denied") || error.message.includes("own PDF")) {
                    setTimeout(() => window.location.reload(), 2000);
                }
            } finally {
                showLoading(false);
            }
        }

        function showMessage(message, type) {
            const container = document.getElementById("messageContainer");
            container.innerHTML = `
                <div class="alert alert-${type === 'error' ? 'danger' : 'success'} alert-dismissible fade show" role="alert">
                    ${message}
                    <button type="button" class="btn-close" data-bs-dismiss="alert" aria-label="Close"></button>
                </div>
            `;
        }

        function showLoading(show) {
            document.getElementById("loadingView").style.display = show ? 'flex' : 'none';
        }

        function setupPhotoPreview() {
            const fileInput = document.getElementById('photoFile');
            const preview = document.getElementById('photoPreview');
            
            fileInput.addEventListener('change', function() {
                const file = this.files[0];
                if (file) {
                    const reader = new FileReader();
                    
                    reader.onload = function(e) {
                        preview.src = e.target.result;
                        preview.classList.remove('d-none');
                    }
                    
                    reader.readAsDataURL(file);
                }
            });
        }

        async function initializePage() {
            showLoading(true);
            try {
                const isAuthInitialized = await initializeAuth0();
                if (!isAuthInitialized) return;
                
                photoUploadModal = new bootstrap.Modal(document.getElementById('photoUploadModal'));
                
                // Setup event listeners
                document.getElementById('uploadPhotoBtn').addEventListener('click', uploadProfilePhoto);
                document.getElementById('logout-button').addEventListener('click', () => {
                    auth0Client.logout({
                        logoutParams: {
                            returnTo: window.location.origin + "/employee-management-frontend/index.html"
                        }
                    });
                });
                
                // Setup sorting controls
                document.getElementById('applySort').addEventListener('click', sortEmployees);
                
                // Setup photo preview
                setupPhotoPreview();
                
                updateRoleBasedUI();
                await loadEmployees();
            } catch (error) {
                console.error("Page Initialization Error:", error);
                showMessage("Page initialization failed: " + error.message, "error");
            } finally {
                showLoading(false);
            }
        }

        document.addEventListener("DOMContentLoaded", initializePage);
        window.deleteEmployee = deleteEmployee;
        window.downloadEmployeePdf = downloadEmployeePdf;
        window.openPhotoUploadModal = openPhotoUploadModal;
    
