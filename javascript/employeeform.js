        // Global counters for dynamic fields
        let educationCount = 0;
        let certificationCount = 0;
        let skillCount = 0;
        let documentCount = 0;
        let experienceCount = 0;

       const API_BASE_URL = 'https://employee-management-backend-h2w3.onrender.com/api';
       
      //auth0Client: Will hold our authentication client instance
        let auth0Client; 
       //auth0Config: Configuration for Auth0 authentication service
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
                    scope: "openid profile email employee:read employee:write"
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
                return true;
            } catch (err) {
                console.error("Auth0 init error:", err);
                showMessage("Auth0 initialization failed. Please try again later.", "error");
                throw err;
            }
        }

        async function makeRequest(endpoint, method = 'GET', body = null) {
            try {
                const token = await auth0Client.getTokenSilently();
                const response = await fetch(`${API_BASE_URL}${endpoint}`, {
                    method,
                    headers: {
                        'Content-Type': 'application/json',
                        'Authorization': `Bearer ${token}`
                    },
                    body: body ? JSON.stringify(body) : null
                });

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

        // Handle photo upload
        function setupPhotoUpload() {
            const photoInput = document.getElementById('profilePhotoInput');
            const photoPreview = document.getElementById('profilePhotoPreview');
            const removePhotoBtn = document.getElementById('removePhotoBtn');
            const hasProfilePhoto = document.getElementById('hasProfilePhoto');
            
            photoInput.addEventListener('change', function(e) {
                if (this.files && this.files[0]) {
                    const file = this.files[0];
                    
                    // Validate file type and size
                    if (!file.type.match('image.*')) {
                        showMessage('Please select an image file (JPEG, PNG, etc.)', 'error');
                        return;
                    }
                    
                    if (file.size > 2 * 1024 * 1024) { // 2MB limit
                        showMessage('Image size should be less than 2MB', 'error');
                        return;
                    }
                    
                    const reader = new FileReader();
                    reader.onload = function(e) {
                        photoPreview.src = e.target.result;
                        removePhotoBtn.style.display = 'block';
                        hasProfilePhoto.value = 'true';
                    };
                    reader.readAsDataURL(file);
                }
            });
            
           
        }
        
        
     // Handle photo removal
async function handlePhotoRemoval(employeeId) {
    try {
        showLoading(true);
        
        // First delete the actual photo
        await makeRequest(`/employees/${employeeId}/profile-photo`, 'DELETE');
        
        // Then update the employee data to remove the photo reference
        const employeeData = collectFormData();
        employeeData.removeProfilePhoto = true;
        await makeRequest(`/employees/${employeeId}`, 'PUT', employeeData);
        
        // Update UI
        resetProfilePhotoPreview();
        showMessage('Profile photo removed successfully!', 'success');
    } catch (error) {
        console.error('Error removing profile photo:', error);
        showMessage('Error removing profile photo: ' + error.message, 'error');
    } finally {
        showLoading(false);
    }
}

function resetProfilePhotoPreview() {
    document.getElementById('profilePhotoPreview').src = "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='200' height='200' viewBox='0 0 200 200'%3E%3Crect width='200' height='200' fill='%23ddd'/%3E%3Ctext x='50%' y='50%' font-family='Arial' font-size='16' text-anchor='middle' dominant-baseline='middle' fill='%23666'%3ENo Photo%3C/text%3E%3C/svg%3E";
    document.getElementById('removePhotoBtn').style.display = 'none';
    document.getElementById('hasProfilePhoto').value = 'false';
    document.getElementById('profilePhotoInput').value = '';
}

        // Update the remove photo button event listener
        removePhotoBtn.addEventListener('click', function() {
            const employeeId = document.getElementById('employeeId').value;
            if (employeeId) {
                // If editing an existing employee, make API call to remove photo
                handlePhotoRemoval(employeeId);
            } else {
                // If creating new employee, just clear the preview
                photoPreview.src = "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='200' height='200' viewBox='0 0 200 200'%3E%3Crect width='200' height='200' fill='%23ddd'/%3E%3Ctext x='50%' y='50%' font-family='Arial' font-size='16' text-anchor='middle' dominant-baseline='middle' fill='%23666'%3ENo Photo%3C/text%3E%3C/svg%3E";
                photoInput.value = '';
                removePhotoBtn.style.display = 'none';
                hasProfilePhoto.value = 'false';
            }
        });

        // Load existing photo if editing
        async function loadProfilePhoto(employeeId) {
            try {
                const token = await auth0Client.getTokenSilently();
                const response = await fetch(`${API_BASE_URL}/employees/${employeeId}/profile-photo`, {
                    headers: {
                        'Authorization': `Bearer ${token}`
                    }
                });
                
                if (response.ok) {
                    const blob = await response.blob();
                    const url = URL.createObjectURL(blob);
                    document.getElementById('profilePhotoPreview').src = url;
                    document.getElementById('removePhotoBtn').style.display = 'block';
                    document.getElementById('hasProfilePhoto').value = 'true';
                }
            } catch (error) {
                console.error('Error loading profile photo:', error);
            }
        }

        // Load employee data if we're editing an existing employee
        async function loadEmployeeDataIfEditing() {
            const urlParams = new URLSearchParams(window.location.search);
            const employeeId = urlParams.get('id');

            if (employeeId) {
                try {
                    showLoading(true);
                    const employee = await makeRequest(`/employees/${employeeId}`);
                    populateForm(employee);
                    
                    // Load profile photo if exists
                    await loadProfilePhoto(employeeId);
                } catch (error) {
                    showMessage('Error loading employee data: ' + error.message, 'error');
                } finally {
                    showLoading(false);
                }
            }
        }

        // Populate form with employee data
        function populateForm(employee) {
            document.getElementById('employeeId').value = employee.employeeId || '';
            document.getElementById('firstName').value = employee.firstName || '';
            document.getElementById('lastName').value = employee.lastName || '';
            document.getElementById('gender').value = employee.gender || '';
            document.getElementById('dob').value = employee.dob ? formatDateForInput(employee.dob) : '';
            document.getElementById('email').value = employee.email || '';
            document.getElementById('personalEmail').value = employee.personalEmail || '';
            document.getElementById('fatherName').value = employee.fatherName || '';
            document.getElementById('mobile').value = employee.mobile || '';

            // Address
            document.getElementById('presentStreet').value = employee.presentStreet || '';
            document.getElementById('presentCity').value = employee.presentCity || '';
            document.getElementById('presentState').value = employee.presentState || '';
            document.getElementById('presentZip').value = employee.presentZip || '';
            document.getElementById('permanentStreet').value = employee.permanentStreet || '';
            document.getElementById('permanentCity').value = employee.permanentCity || '';
            document.getElementById('permanentState').value = employee.permanentState || '';
            document.getElementById('permanentZip').value = employee.permanentZip || '';

            // Education
            if (employee.educationList && employee.educationList.length > 0) {
                employee.educationList.forEach(edu => {
                    addEducation(edu);
                });
            }

            // Certifications
            if (employee.certifications && employee.certifications.length > 0) {
                employee.certifications.forEach(cert => {
                    addCertification(cert);
                });
            }

            // Skills
            if (employee.skills && employee.skills.length > 0) {
                employee.skills.forEach(skill => {
                    addSkill(skill);
                });
            }
            
            // Experience
            if (employee.experiences && employee.experiences.length > 0) {
                employee.experiences.forEach(exp => {
                    addExperience(exp);
                });
            }
            
            if (employee.documents && employee.documents.length > 0) {
                employee.documents.forEach(doc => {
                    addDocument(doc);
                });
            }

        }

        // Format date for input field (yyyy-mm-dd)
        function formatDateForInput(dateString) {
            if (!dateString) return '';
            const date = new Date(dateString);
            if (isNaN(date.getTime())) return '';
            const year = date.getFullYear();
            const month = String(date.getMonth() + 1).padStart(2, '0');
            const day = String(date.getDate()).padStart(2, '0');
            return `${year}-${month}-${day}`;
        }

        // Setup "Same as Present Address" checkbox
        function setupSameAsPresentAddress() {
            document.getElementById('sameAsPresent').addEventListener('change', function() {
                if (this.checked) {
                    document.getElementById('permanentStreet').value = document.getElementById('presentStreet').value;
                    document.getElementById('permanentCity').value = document.getElementById('presentCity').value;
                    document.getElementById('permanentState').value = document.getElementById('presentState').value;
                    document.getElementById('permanentZip').value = document.getElementById('presentZip').value;
                }
            });
        }

// Form submission handler
async function handleFormSubmit(e) {
    e.preventDefault();
    
    try {
        showLoading(true);
        const employeeId = document.getElementById('employeeId').value;
        const employeeData = collectFormData();
        const photoInput = document.getElementById('profilePhotoInput');
        const isNewPhoto = photoInput.files.length > 0;

        // Remove photo and document data from the main payload
        delete employeeData.profilePhoto;
        delete employeeData.documents;
        delete employeeData.documentFiles;
        delete employeeData.documentTypes;

        if (employeeId) {
            // Update existing employee
            await makeRequest(`/employees/${employeeId}`, 'PUT', employeeData);
            
            // Handle photo separately
            if (isNewPhoto) {
                await uploadProfilePhoto(employeeId, photoInput.files[0]);
            }
            
            // Handle document uploads
            await uploadDocuments(employeeId);
        } else {
            // Create new employee first without photo
            const response = await makeRequest('/employees', 'POST', employeeData);
            const newEmployeeId = response.employeeId;
            
            // Then handle photo upload if exists
            if (isNewPhoto) {
                await uploadProfilePhoto(newEmployeeId, photoInput.files[0]);
            }
            
            // Handle document uploads
            await uploadDocuments(newEmployeeId);
        }

        showMessage('Employee saved successfully!', 'success');
        setTimeout(() => window.location.href = 'employee-list.html', 1500);
    } catch (error) {
        console.error('Form submission error:', error);
        showMessage('Error saving employee: ' + error.message, 'error');
    } finally {
        showLoading(false);
    }
}
        
async function uploadDocument(employeeId, file, documentType) {
    try {
        const token = await auth0Client.getTokenSilently();
        const formData = new FormData();
        formData.append('file', file);
        formData.append('documentType', documentType);

        const response = await fetch(`${API_BASE_URL}/employees/${employeeId}/documents`, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${token}`
            },
            body: formData
        });

        if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.message || 'Failed to upload document');
        }

        return await response.json();
    } catch (error) {
        console.error('Error uploading document:', error);
        throw error;
    }
}

async function uploadDocuments(employeeId) {
    const documentRows = document.querySelectorAll('#documentContainer .dynamic-row');
    for (const row of documentRows) {
        const fileInput = row.querySelector('input[type="file"]');
        const documentId = row.querySelector('input[name$=".documentId"]')?.value;
        
        // Only upload if new file selected or it's a new document
        if (fileInput.files.length > 0 && (!documentId || documentId === "0")) {
            const documentType = row.querySelector('select[name$=".documentType"]').value;
            try {
                await uploadDocument(employeeId, fileInput.files[0], documentType);
            } catch (error) {
                console.error('Error uploading document:', error);
                showMessage(`Error uploading document: ${error.message}`, 'error');
                throw error; // Stop further processing
            }
        }
    }
}

async function deleteMarkedDocuments() {
    if (window.documentsToDelete && window.documentsToDelete.length > 0) {
        for (const docId of window.documentsToDelete) {
            try {
                await makeRequest(`/employees/${getEmployeeId()}/documents/${docId}`, 'DELETE');
            } catch (error) {
                console.error(`Error deleting document ${docId}:`, error);
                throw error;
            }
        }
    }
}



 // Helper function to upload profile photo
  async function uploadProfilePhoto(employeeId, file) {
    if (!file) return;

    const formData = new FormData();
    formData.append('file', file);

    try {
        const token = await auth0Client.getTokenSilently();
        const response = await fetch(`${API_BASE_URL}/employees/${employeeId}/profile-photo`, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${token}`
            },
            body: formData
        });

        if (!response.ok) {
            throw new Error('Failed to upload profile photo');
        }
        
        return await response.json();
    } catch (error) {
        console.error('Error uploading profile photo:', error);
        throw error;
    }
}
        
        
        //document download
        async function downloadDocument(documentId, fileName) {
    try {
        showLoading(true);
        const token = await auth0Client.getTokenSilently();
        const response = await fetch(`${API_BASE_URL}/employees/${getEmployeeId()}/documents/${documentId}`, {
            headers: {
                'Authorization': `Bearer ${token}`
            }
        });
        
        if (response.ok) {
            const blob = await response.blob();
            const url = window.URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = fileName || 'document';
            document.body.appendChild(a);
            a.click();
            window.URL.revokeObjectURL(url);
            a.remove();
        } else {
            throw new Error('Failed to download document');
        }
    } catch (error) {
        console.error('Error downloading document:', error);
        showMessage('Error downloading document: ' + error.message, 'error');
    } finally {
        showLoading(false);
    }
}

function getEmployeeId() {
    return document.getElementById('employeeId').value;
}

        // Collect all form data into an object
        function collectFormData() {
            const form = document.getElementById('employeeForm');
            const formData = new FormData(form);

            const employeeData = {
                employeeId: formData.get('employeeId') || null,
                firstName: formData.get('firstName'),
                lastName: formData.get('lastName'),
                gender: formData.get('gender'),
                dob: formData.get('dob'),
                email: formData.get('email'),
                personalEmail: formData.get('personalEmail'),
                fatherName: formData.get('fatherName'),
                mobile: formData.get('mobile'),
                presentStreet: formData.get('presentStreet'),
                presentCity: formData.get('presentCity'),
                presentState: formData.get('presentState'),
                presentZip: formData.get('presentZip'),
                permanentStreet: formData.get('permanentStreet'),
                permanentCity: formData.get('permanentCity'),
                permanentState: formData.get('permanentState'),
                permanentZip: formData.get('permanentZip'),
                educationList: [],
                certifications: [],
                skills: [],
                experiences: [],
            
            documentsToDelete: window.documentsToDelete || [],
            documents: [],
            documentFiles: [],
            documentTypes: []

            };
            
            const photoInput = document.getElementById('profilePhotoInput');
            if (photoInput.files.length > 0) {
                employeeData.profilePhoto = {
                    fileName: photoInput.files[0].name,
                    fileType: photoInput.files[0].type,
                    fileSize: photoInput.files[0].size
                    // Note: We don't include the actual data here - it will be handled separately
                };
            }
            
            const documentRows = document.querySelectorAll('#documentContainer .dynamic-row');
            documentRows.forEach(row => {
                const documentId = row.querySelector('input[name$=".documentId"]')?.value;
                const documentType = row.querySelector('select[name$=".documentType"]').value;
                
                if (documentId && documentId !== "0") {
                    employeeData.documents.push({
                        documentId: parseInt(documentId),
                        documentType: documentType,
                        version: row.querySelector('input[name$=".version"]')?.value || 0
                    });
                }
            });
            
            
         // Collect document files and types
            const documentFileInputs = document.querySelectorAll('input[name^="documentFiles"]');
            documentFileInputs.forEach(input => {
                if (input.files.length > 0) {
                    employeeData.documentFiles.push(input.files[0]);
                    
                    // Find the corresponding document type
                    const row = input.closest('.dynamic-row');
                    const documentType = row.querySelector('select[name$=".documentType"]').value;
                    employeeData.documentTypes.push(documentType);
                }
            });

            // Collect education data
            const educationRows = document.querySelectorAll('#educationContainer .dynamic-row');
            educationRows.forEach(row => {
                const educationId = row.querySelector('input[name$=".educationId"]')?.value;
                employeeData.educationList.push({
                    educationId: educationId && educationId !== "0" ? parseInt(educationId) : null,
                    educationName: row.querySelector('input[name$=".educationName"]').value,
                    college: row.querySelector('input[name$=".college"]').value,
                    year: row.querySelector('input[name$=".year"]').value,
                    percentage: row.querySelector('input[name$=".percentage"]').value,
                    version: row.querySelector('input[name$=".version"]')?.value || 0
                });
            });

            // Collect certification data
            const certificationRows = document.querySelectorAll('#certificationContainer .dynamic-row');
            certificationRows.forEach(row => {
                const certificationId = row.querySelector('input[name$=".certificationId"]')?.value;
                employeeData.certifications.push({
                    certificationId: certificationId && certificationId !== "0" ? parseInt(certificationId) : null,
                    name: row.querySelector('input[name$=".name"]').value,
                    organization: row.querySelector('input[name$=".organization"]').value,
                    date: row.querySelector('input[name$=".date"]').value,
                    version: row.querySelector('input[name$=".version"]')?.value || 0
                });
            });
            
         // Collect experience data
            const experienceRows = document.querySelectorAll('#experienceContainer .dynamic-row');
            experienceRows.forEach(row => {
                const experienceId = row.querySelector('input[name$=".experienceId"]')?.value;
                employeeData.experiences.push({
                    experienceId: experienceId && experienceId !== "0" ? parseInt(experienceId) : null,
                    level: row.querySelector('select[name$=".level"]').value,
                    jobRole: row.querySelector('input[name$=".jobRole"]').value,
                    version: row.querySelector('input[name$=".version"]')?.value || 0
                });
            });


            // Collect skill data
            const skillRows = document.querySelectorAll('#skillContainer .dynamic-row');
            skillRows.forEach(row => {
                const skillId = row.querySelector('input[name$=".skillId"]')?.value;
                employeeData.skills.push({
                    skillId: skillId && skillId !== "0" ? parseInt(skillId) : null,
                    skill: row.querySelector('input[name$=".skill"]').value,
                    version: row.querySelector('input[name$=".version"]')?.value || 0
                });
            });

            return employeeData;
        }
        

        // Validate the entire form
        function validateForm() {
            let isValid = true;

            // Validate required fields
            const requiredFields = document.querySelectorAll('#employeeForm [required]');
            requiredFields.forEach(field => {
                const formControl = field.closest('.form-control');
                if (field.value.trim() === '') {
                    setErrorFor(formControl, 'This field is required');
                    isValid = false;
                } else {
                    setSuccessFor(formControl);
                }
            });

            // Validate date of birth (age >= 18)
            const dob = document.getElementById('dob');
            if (dob.value) {
                const today = new Date();
                const birthDate = new Date(dob.value);
                let age = today.getFullYear() - birthDate.getFullYear();
                const monthDiff = today.getMonth() - birthDate.getMonth();
                if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
                    age--;
                }

                const formControl = dob.closest('.form-control');
                if (age < 18) {
                    setErrorFor(formControl, 'Employee must be at least 18 years old');
                    isValid = false;
                } else {
                    setSuccessFor(formControl);
                }
            }

            // Validate personal email is different from work email
            const email = document.getElementById('email').value;
            const personalEmail = document.getElementById('personalEmail').value;
            if (email && personalEmail && email === personalEmail) {
                setErrorFor(document.getElementById('personalEmail').closest('.form-control'),
                'Personal email must be different from work email');
                isValid = false;
            }

            // Validate mobile number (10 digits)
            const mobile = document.getElementById('mobile').value;
            if (mobile && !/^\d{10}$/.test(mobile)) {
                setErrorFor(document.getElementById('mobile').closest('.form-control'),
                'Mobile number must be 10 digits');
                isValid = false;
            }

            // Validate dynamic fields
            const educationRows = document.querySelectorAll('#educationContainer .dynamic-row');
            educationRows.forEach(row => {
                const inputs = row.querySelectorAll('input[required]');
                inputs.forEach(input => {
                    if (input.value.trim() === '') {
                        setErrorFor(input.closest('.form-control'), 'This field is required');
                        isValid = false;
                    } else {
                        setSuccessFor(input.closest('.form-control'));
                    }
                });
            });

            const certificationRows = document.querySelectorAll('#certificationContainer .dynamic-row');
            certificationRows.forEach(row => {
                const inputs = row.querySelectorAll('input[required]');
                inputs.forEach(input => {
                    if (input.value.trim() === '') {
                        setErrorFor(input.closest('.form-control'), 'This field is required');
                        isValid = false;
                    } else {
                        setSuccessFor(input.closest('.form-control'));
                    }
                });
            });

            const skillRows = document.querySelectorAll('#skillContainer .dynamic-row');
            skillRows.forEach(row => {
                const inputs = row.querySelectorAll('input[required]');
                inputs.forEach(input => {
                    if (input.value.trim() === '') {
                        setErrorFor(input.closest('.form-control'), 'This field is required');
                        isValid = false;
                    } else {
                        setSuccessFor(input.closest('.form-control'));
                    }
                });
            });

            if (!isValid) {
                const firstError = document.querySelector('.error');
                if (firstError) {
                    firstError.scrollIntoView({ behavior: 'smooth', block: 'center' });
                }
            }

            return isValid;
        }

        // Setup form validation
        function setupValidation() {
            // Validate on blur for initial fields
            document.querySelectorAll('#employeeForm input[required]:not([name^="educationList"]), #employeeForm select[required]').forEach(input => {
                input.addEventListener('blur', function() {
                    const formControl = this.closest('.form-control');
                    if (this.value.trim() === '') {
                        setErrorFor(formControl, 'This field is required');
                    } else {
                        setSuccessFor(formControl);
                    }
                });
            });

            // Special validation for date of birth
            const dob = document.getElementById('dob');
            if (dob) {
                dob.addEventListener('change', function() {
                    const today = new Date();
                    const birthDate = new Date(this.value);
                    let age = today.getFullYear() - birthDate.getFullYear();
                    const monthDiff = today.getMonth() - birthDate.getMonth();
                    if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
                        age--;
                    }

                    const formControl = this.closest('.form-control');
                    if (age < 18) {
                        setErrorFor(formControl, 'Employee must be at least 18 years old');
                    } else {
                        setSuccessFor(formControl);
                    }
                });
            }

            // Special validation for personal email
            const personalEmailInput = document.getElementById('personalEmail');
            const emailInput = document.getElementById('email');
            if (personalEmailInput && emailInput) {
                personalEmailInput.addEventListener('input', function() {
                    const email = emailInput.value;
                    const personalEmail = this.value;
                    const formControl = this.closest('.form-control');

                    if (email && personalEmail && email === personalEmail) {
                        setErrorFor(formControl, 'Personal email must be different from work email');
                    } else {
                        setSuccessFor(formControl);
                    }
                });
            }

            // Special validation for mobile number
            const mobileInput = document.getElementById('mobile');
            if (mobileInput) {
                mobileInput.addEventListener('input', function() {
                    const formControl = this.closest('.form-control');
                    if (!/^\d{10}$/.test(this.value)) {
                        setErrorFor(formControl, 'Mobile number must be 10 digits');
                    } else {
                        setSuccessFor(formControl);
                    }
                });
            }
        }

        // Set error state for a form control
        function setErrorFor(inputElement, message) {
            if (!inputElement) {
                console.error('Input element not found');
                return;
            }

            const formControl = inputElement.closest('.form-control');
            if (!formControl) {
                console.error('Form control not found for input:', inputElement);
                return;
            }

            const small = formControl.querySelector('small');
            if (small) {
                formControl.classList.remove('success');
                formControl.classList.add('error');
                small.textContent = message;
            }
        }

        // Set success state for a form control
        function setSuccessFor(inputElement) {
            const formControl = inputElement.closest('.form-control');
            formControl.classList.remove('error');
            formControl.classList.add('success');
        }

        // Show message to user
        function showMessage(message, type) {
            const messageContainer = document.getElementById('messageContainer');
            messageContainer.innerHTML = `
                <div class="alert alert-${type === 'error' ? 'danger' : 'success'} alert-dismissible fade show" role="alert">
                    ${message}
                    <button type="button" class="btn-close" data-bs-dismiss="alert" aria-label="Close"></button>
                </div>
            `;

            // Scroll to the message
            messageContainer.scrollIntoView({ behavior: 'smooth', block: 'center' });

            // Auto-hide success messages after 5 seconds
            if (type === 'success') {
                setTimeout(() => {
                    messageContainer.innerHTML = '';
                }, 5000);
            }
        }

        function showLoading(show) {
            document.getElementById('loadingView').style.display = show ? 'flex' : 'none';
        }

        // Dynamic field functions
        function addEducation(education = null) {
            const educationDiv = document.createElement("div");
            educationDiv.className = "dynamic-row";
            educationDiv.innerHTML = `
                <input type="hidden" name="educationList[${educationCount}].educationId" value="${education?.educationId || 0}" />
                <input type="hidden" name="educationList[${educationCount}].version" 
                    value="${education?.version || 0}" />
                <div class="row g-3">
                    <div class="col-md-4">
                        <div class="form-control">
                            <label class="form-label required-field">Education Name</label>
                            <input type="text" class="form-control" name="educationList[${educationCount}].educationName"
                                value="${education?.educationName || ''}" required>
                            <small>Education name is required</small>
                        </div>
                    </div>
                    <div class="col-md-4">
                        <div class="form-control">
                            <label class="form-label required-field">College</label>
                            <input type="text" class="form-control" name="educationList[${educationCount}].college"
                                value="${education?.college || ''}" required>
                            <small>College is required</small>
                        </div>
                    </div>
                    <div class="col-md-2">
                        <div class="form-control">
                            <label class="form-label required-field">Year</label>
                            <input type="text" class="form-control" name="educationList[${educationCount}].year"
                                value="${education?.year || ''}" required>
                            <small>Year is required</small>
                        </div>
                    </div>
                    <div class="col-md-2">
                        <div class="form-control">
                            <label class="form-label required-field">Percentage</label>
                            <input type="text" class="form-control" name="educationList[${educationCount}].percentage"
                                value="${education?.percentage || ''}" required>
                            <small>Percentage is required</small>
                        </div>
                    </div>
                </div>
                <button type="button" class="remove-btn" onclick="removeEducation(this)">Remove</button>
            `;
            document.getElementById("educationContainer").appendChild(educationDiv);
            setupValidationForNewElements(educationDiv);
            educationCount++;
        }

        function removeEducation(button) {
            button.parentElement.remove();
        }
        
        function addCertification(certification = null) {
        	const certificationDiv = document.createElement("div");
        	certificationDiv.className = "dynamic-row";
        	certificationDiv.innerHTML = `
        	<input type="hidden" name="certifications[${certificationCount}].certificationId"
        	value="${certification?.certificationId || 0}" />
        	 <input type="hidden" name="certifications[${certificationCount}].version" 
        	value="${certification?.certificationId || 0}" />
        	<div class="row g-3">
        	<div class="col-md-4">
        	<div class="form-control">
        	<label class="form-label required-field">Certification Name</label>
        	<input type="text" class="form-control" name="certifications[${certificationCount}].name"
        	value="${certification?.name || ''}" required>
        	<small>Certification name is required</small>
        	</div>
        	</div>
        	<div class="col-md-4">
        	<div class="form-control">
        	<label class="form-label required-field">Organization</label>
        	<input type="text" class="form-control" name="certifications[${certificationCount}].organization"
        	value="${certification?.organization || ''}" required>
        	<small>Organization is required</small>
        	</div>
        	</div>
        	<div class="col-md-3">
        	<div class="form-control">
        	<label class="form-label required-field">Date</label>
        	<input type="date" class="form-control" name="certifications[${certificationCount}].date"
        	value="${certification?.date ? formatDateForInput(certification.date) : ''}" required>
        	<small>Date is required</small>
        	</div>
        	</div>
        	</div>
        	<button type="button" class="remove-btn" onclick="removeCertification(this)">Remove</button>
        	`;
        	document.getElementById("certificationContainer").appendChild(certificationDiv);
        	setupValidationForNewElements(certificationDiv);
        	certificationCount++;
        	}

        	function removeCertification(button) {
        	button.parentElement.remove();
        	}

        	function addSkill(skill = null) {
        	const skillDiv = document.createElement("div");
        	skillDiv.className = "dynamic-row";
        	skillDiv.innerHTML = `
        	<input type="hidden" name="skills[${skillCount}].skillId" 
        	value="${skill?.skillId || 0}" />
        	<input type="hidden" name="skills[${skillCount}].version" 
        	value="${skill?.version || 0}" />
        	<div class="row g-3">
        	<div class="col-md-10">
        	<div class="form-control">
        	<label class="form-label required-field">Skill</label>
        	<input type="text" class="form-control" name="skills[${skillCount}].skill"
        	value="${skill?.skill || ''}" required>
        	<small>Skill is required</small>
        	</div>
        	</div>
        	</div>
        	<button type="button" class="remove-btn" onclick="removeSkill(this)">Remove</button>
        	`;
        	document.getElementById("skillContainer").appendChild(skillDiv);
        	setupValidationForNewElements(skillDiv);
        	skillCount++;
        	}

        	function removeSkill(button) {
        	button.parentElement.remove();
        	}
        	
        	
        	function addExperience(experience = null) {
        	    const experienceDiv = document.createElement("div");
        	    experienceDiv.className = "dynamic-row";
        	    experienceDiv.innerHTML = `
        	        <input type="hidden" name="experiences[${experienceCount}].experienceId" 
        	            value="${experience?.experienceId || 0}" />
        	        <input type="hidden" name="experiences[${experienceCount}].version" 
        	            value="${experience?.version || 0}" />
        	        <div class="row g-3">
        	            <div class="col-md-3">
        	                <div class="form-control">
        	                    <label class="form-label required-field">Level</label>
        	                    <select class="form-select" name="experiences[${experienceCount}].level" required>
        	                        <option value="">Select Level</option>
        	                        <option value="Level1" ${experience?.level === 'Level1' ? 'selected' : ''}>Level1</option>
        	                        <option value="Level2" ${experience?.level === 'Level2' ? 'selected' : ''}>Level2</option>
        	                        <option value="Level3" ${experience?.level === 'Level3' ? 'selected' : ''}>Level3</option>
        	                        <option value="Level4" ${experience?.level === 'Level4' ? 'selected' : ''}>Level4</option>
        	                        <option value="Level5" ${experience?.level === 'Level5' ? 'selected' : ''}>Level5</option>
        	                    </select>
        	                    <small>Level is required</small>
        	                </div>
        	            </div>
        	            <div class="col-md-7">
        	                <div class="form-control">
        	                    <label class="form-label required-field">Job Role</label>
        	                    <input type="text" class="form-control" name="experiences[${experienceCount}].jobRole"
        	                        value="${experience?.jobRole || ''}" required>
        	                    <small>Job role is required</small>
        	                </div>
        	            </div>
        	        </div>
        	        <button type="button" class="remove-btn" onclick="removeExperience(this)">Remove</button>
        	    `;
        	    document.getElementById("experienceContainer").appendChild(experienceDiv);
        	    setupValidationForNewElements(experienceDiv);
        	    experienceCount++;
        	}

        	function removeExperience(button) {
        	    button.parentElement.remove();
        	}

        	

        	function addDocument(documentData = null) {
        	    const documentDiv = document.createElement("div");
        	    documentDiv.className = "dynamic-row";
        	    documentDiv.innerHTML = `
        	        <input type="hidden" name="documents[${documentCount}].documentId" 
        	            value="${documentData?.documentId || 0}" />
        	        <input type="hidden" name="documents[${documentCount}].version" 
        	            value="${documentData?.version || 0}" />
        	        <div class="row g-3">
        	            <div class="col-md-4">
        	                <div class="form-control">
        	                    <label class="form-label required-field">Document Type</label>
        	                    <select class="form-select" name="documents[${documentCount}].documentType" required>
        	                        <option value="">Select Type</option>
        	                        <option value="RESUME" ${documentData?.documentType === 'RESUME' ? 'selected' : ''}>Resume</option>
        	                        <option value="CERTIFICATE" ${documentData?.documentType === 'CERTIFICATE' ? 'selected' : ''}>Certificate</option>
        	                        <option value="ID_PROOF" ${documentData?.documentType === 'ID_PROOF' ? 'selected' : ''}>ID Proof</option>
        	                        <option value="OTHER" ${documentData?.documentType === 'OTHER' ? 'selected' : ''}>Other</option>
        	                    </select>
        	                    <small>Document type is required</small>
        	                </div>
        	            </div>
        	            <div class="col-md-5">
        	                <div class="form-control">
        	                    <label class="form-label ${documentData ? '' : 'required-field'}">Document File</label>
        	                    <input type="file" class="form-control form-control-file" 
        	                        name="documentFiles[${documentCount}]" 
        	                        accept=".pdf,.doc,.docx,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
        	                        ${documentData ? '' : 'required'}>
        	                    <small>PDF or Word document (max 5MB)</small>
        	                    ${documentData ? `
        	                        <div class="document-file-info">
        	                            Current file: ${documentData.fileName}
        	                        </div>
        	                    ` : ''}
        	                </div>
        	            </div>
        	            <div class="col-md-3">
        	                <div class="document-actions">
        	                    ${documentData ? `
        	                        <button type="button" class="btn btn-primary" 
        	                            onclick="downloadDocument(${documentData.documentId}, '${documentData.fileName}'); return false;">
        	                            <i class="bi bi-download"></i> Download
        	                        </button>
        	                    ` : ''}
        	                    <button type="button" class="btn btn-danger" onclick="removeDocument(this)">
        	                        <i class="bi bi-trash"></i> Remove
        	                    </button>
        	                </div>
        	            </div>
        	        </div>
        	    `;
        	    document.getElementById("documentContainer").appendChild(documentDiv);
        	    setupValidationForNewElements(documentDiv);
        	    documentCount++;
        	}
        	
        	
        	function removeDocument(button) {
        	    const row = button.closest('.dynamic-row');
        	    const documentIdInput = row.querySelector('input[name$=".documentId"]');
        	    
        	    if (documentIdInput && documentIdInput.value !== "0") {
        	        // If this is an existing document, add to deletion list
        	        if (!window.documentsToDelete) {
        	            window.documentsToDelete = [];
        	        }
        	        window.documentsToDelete.push(parseInt(documentIdInput.value));
        	    }
        	    
        	    row.remove();
        	}

        	// Setup validation for dynamically added elements
        	function setupValidationForNewElements(parentElement) {
        	parentElement.querySelectorAll('input[required], select[required]').forEach(input => {
        	input.addEventListener('blur', function() {
        	const formControl = this.closest('.form-control');
        	if (this.value.trim() === '') {
        	setErrorFor(formControl, 'This field is required');
        	} else {
        	setSuccessFor(formControl);
        	}
        	});
        	});
        	}

        	async function initializePage() {
        	    showLoading(true);
        	    try {
        	        const isAuthInitialized = await initializeAuth0();
        	        if (!isAuthInitialized) return;
        	        
        	        // Set form title based on whether we're adding or editing
        	        const urlParams = new URLSearchParams(window.location.search);
        	        if (urlParams.has('id')) {
        	            document.getElementById('formTitle').textContent = 'Edit Employee';
        	        }
        	        
        	        // Initialize form components
        	        setupValidation();
        	        setupPhotoUpload();
        	        await loadEmployeeDataIfEditing();
        	        setupSameAsPresentAddress();
        	        
        	        // Add initial empty fields if this is a new employee
        	        if (!urlParams.has('id')) {
        	            addEducation();
        	            addCertification();
        	            addSkill();
        	            // Don't add empty document by default - let user add as needed
        	        }
        	        
        	        // Setup form submission
        	        document.getElementById('employeeForm').addEventListener('submit', handleFormSubmit);
        	        
        	        // Setup logout button if it exists
        	        const logoutButton = document.getElementById('logout-button');
        	        if (logoutButton) {
        	            logoutButton.addEventListener('click', () => {
        	                auth0Client.logout({
        	                    logoutParams: {
        	                        returnTo: window.location.origin + "/employee-management-frontend/index.html"
        	                    }
        	                });
        	            });
        	        }
        	    } catch (error) {
        	        console.error('Page initialization error:', error);
        	        showMessage('Error initializing page: ' + error.message, 'error');
        	    } finally {
        	        showLoading(false);
        	    }
        	}

        	// Make these functions available globally
        	window.addEducation = addEducation;
        	window.removeEducation = removeEducation;
        	window.addCertification = addCertification;
        	window.removeCertification = removeCertification;
        	window.addSkill = addSkill;
        	window.removeSkill = removeSkill;
        	window.addExperience = addExperience;
        	window.removeExperience = removeExperience;


        	// Start the application when DOM is loaded
        	document.addEventListener("DOMContentLoaded", initializePage);
        	
