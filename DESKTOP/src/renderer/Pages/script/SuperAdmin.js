console.log("SuperAdmin.js is loaded!");
const API_BASE = "http://localhost:3000/api";
let currentPage = 1;
let totalPages = 1;
let allAdmins = [];

// Enhanced authentication check
async function checkAuth() {
    const token = localStorage.getItem("token");
    const adminData = localStorage.getItem("adminData");
    
    if (!token) {
        console.log("No token found, redirecting to login");
        window.location.href = "Auth/LoginPage.html";
        return false;
    }

    try {
        // Verify the token is still valid
        const { createClient } = window.supabase;
        const supabase = createClient('https://vxukqznjkdtuytnkhldu.supabase.co', 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZ4dWtxem5qa2R0dXl0bmtobGR1Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2MTI0NDE4MCwiZXhwIjoyMDc2ODIwMTgwfQ.7hCf7BDqlVuNkzP1CcbORilAzMqOHhexP4Y7bsTPRJA');
        
        const { data: { session }, error } = await supabase.auth.getSession();
        
        if (error || !session) {
            console.error("Invalid session:", error);
            localStorage.removeItem("token");
            localStorage.removeItem("adminData");
            window.location.href = "Auth/LoginPage.html";
            return false;
        }

        // Check if user is superadmin using stored data first (faster)
        if (adminData) {
            const admin = JSON.parse(adminData);
            if (admin.role === 'superadmin' || admin.role === 'super_admin') {
                console.log("✅ Superadmin verified via stored data");
                return true;
            }
        }

        // Fallback: Verify via API
        const user = await getCurrentUser();
        if (user && (user.role === 'superadmin' || user.role === 'super_admin')) {
            console.log("✅ Superadmin verified via API");
            return true;
        }

        console.error("User is not superadmin, redirecting");
        window.location.href = "LandingPage.html";
        return false;

    } catch (error) {
        console.error("Auth check failed:", error);
        localStorage.removeItem("token");
        localStorage.removeItem("adminData");
        window.location.href = "Auth/LoginPage.html";
        return false;
    }
}

// Enhanced getCurrentUser with better error handling
async function getCurrentUser() {
    try {
        const response = await fetch(`${API_BASE}/admin/me`, {
            headers: {
                'Authorization': `Bearer ${localStorage.getItem('token')}`
            }
        });
        
        if (response.ok) {
            return await response.json();
        } else if (response.status === 401) {
            // Token expired or invalid
            localStorage.removeItem("token");
            localStorage.removeItem("adminData");
            window.location.href = "Auth/LoginPage.html";
            return null;
        }
    } catch (error) {
        console.error('Error getting current user:', error);
        // Don't redirect on network errors, use stored data instead
    }
    
    // Fallback to stored data
    const storedAdmin = localStorage.getItem("adminData");
    return storedAdmin ? JSON.parse(storedAdmin) : { email: '', role: '' };
}

// Enhanced loadUserInfo
async function loadUserInfo() {
    try {
        // Use stored data first for immediate UI update
        const storedAdmin = localStorage.getItem("adminData");
        if (storedAdmin) {
            const user = JSON.parse(storedAdmin);
            updateUserUI(user);
        }

        // Then try to fetch fresh data
        const response = await fetch(`${API_BASE}/admin/me`, {
            headers: { Authorization: `Bearer ${localStorage.getItem('token')}` },
        });

        if (!response.ok) {
            if (response.status === 401) {
                throw new Error("Authentication failed");
            }
            throw new Error("Failed to fetch user");
        }

        const user = await response.json();

        // Check if user is super admin (support both naming conventions)
        if (user.role !== "super_admin" && user.role !== "superadmin") {
            alert("Access denied. Super Admin privileges required.");
            window.location.href = "LandingPage.html";
            return;
        }

        updateUserUI(user);
        return user;
        
    } catch (error) {
        console.error("Error loading user:", error);
        
        // Only redirect if it's an auth error, otherwise use stored data
        if (error.message === "Authentication failed") {
            localStorage.removeItem("token");
            localStorage.removeItem("adminData");
            window.location.href = "Auth/LoginPage.html";
        }
        // For other errors, continue with stored data
    }
}

function updateUserUI(user) {
    document.getElementById("userName").textContent = `${user.first_name} ${user.last_name}`;
    document.getElementById("userEmail").textContent = user.email;
}

// Enhanced loadLogs with better error handling
async function loadLogs(page = 1) {
    try {
        const adminFilter = document.getElementById("filterAdmin").value;
        const pageFilter = document.getElementById("filterPage").value;
        const dateFrom = document.getElementById("filterDateFrom").value;
        const dateTo = document.getElementById("filterDateTo").value;

        let url = `${API_BASE}/superadmin/logs?page=${page}&limit=3`;
        if (adminFilter) url += `&admin_id=${adminFilter}`;
        if (pageFilter) url += `&target_page=${pageFilter}`;
        if (dateFrom) url += `&date_from=${dateFrom}`;
        if (dateTo) url += `&date_to=${dateTo}`;

        const response = await fetch(url, {
            headers: { Authorization: `Bearer ${localStorage.getItem('token')}` },
        });

        if (!response.ok) {
            if (response.status === 401) {
                throw new Error("Authentication failed");
            }
            throw new Error("Failed to fetch logs");
        }

        const data = await response.json();
        displayLogs(data.logs);
        updatePagination(data.pagination);
        currentPage = data.pagination.page;
        totalPages = data.pagination.totalPages;
    } catch (error) {
        console.error("Error loading logs:", error);
        
        if (error.message === "Authentication failed") {
            handleAuthError();
        } else {
            document.getElementById("logsTableBody").innerHTML =
                '<tr><td colspan="6" style="text-align: center; color: red;">Error loading logs</td></tr>';
        }
    }
}

// Enhanced loadAdmins with better error handling
async function loadAdmins() {
    try {
        const response = await fetch(`${API_BASE}/superadmin/admins`, {
            headers: { Authorization: `Bearer ${localStorage.getItem('token')}` },
        });

        if (!response.ok) {
            if (response.status === 401) {
                throw new Error("Authentication failed");
            }
            throw new Error("Failed to fetch admins");
        }

        const data = await response.json();
        allAdmins = data.admins;
        
        // Get current user email and pass it to displayAdmins
        const currentUser = await getCurrentUser();
        displayAdmins(data.admins, currentUser.email);
        populateAdminFilter(data.admins);
    } catch (error) {
        console.error("Error loading admins:", error);
        
        if (error.message === "Authentication failed") {
            handleAuthError();
        }
    }
}

// Enhanced approveAdmin function
async function approveAdmin(adminId, decision) {
    try {
        console.log(`Approving admin ${adminId} with decision: ${decision}`);
        
        const response = await fetch(`${API_BASE}/superadmin/admins/${adminId}/approve`, {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${localStorage.getItem('token')}`
            },
            body: JSON.stringify({ decision })
        });

        const data = await response.json();
        
        if (response.ok) {
            console.log('Approval successful:', data);
            loadAdmins();
        } else {
            if (response.status === 401) {
                throw new Error("Authentication failed");
            }
            console.error('Approval failed:', data);
            alert(`Failed to update admin status: ${data.error}`);
        }
    } catch (error) {
        console.error('Error:', error);
        
        if (error.message === "Authentication failed") {
            handleAuthError();
        } else {
            alert('Error updating admin status');
        }
    }
}

// Enhanced loadStats with better error handling
async function loadStats() {
    try {
        const response = await fetch(`${API_BASE}/superadmin/logs/summary`, {
            headers: { Authorization: `Bearer ${localStorage.getItem('token')}` },
        });

        if (!response.ok) {
            if (response.status === 401) {
                throw new Error("Authentication failed");
            }
            throw new Error("Failed to fetch stats");
        }

        const data = await response.json();

        // Calculate stats
        const totalLogs = data.summary.byPage.reduce(
            (sum, item) => sum + parseInt(item.count),
            0,
        );
        const activeAdmins = data.summary.byAdmin.filter(
            (a) => a.action_count > 0,
        ).length;
        const mostActivePage = data.summary.byPage[0]?.target_page || "-";

        document.getElementById("totalLogs").textContent = totalLogs;
        document.getElementById("activeAdmins").textContent = activeAdmins;
        document.getElementById("mostActivePage").textContent = mostActivePage;

        // For today's actions, you'd need to pass date filters
        document.getElementById("todayActions").textContent = totalLogs;
    } catch (error) {
        console.error("Error loading stats:", error);
        // Don't handle auth error here as it's non-critical
    }
}

// Helper function for auth errors
function handleAuthError() {
    console.log("Authentication error, redirecting to login");
    localStorage.removeItem("token");
    localStorage.removeItem("adminData");
    window.location.href = "Auth/LoginPage.html";
}

// Display admins - FIXED: Use consistent role naming
function displayAdmins(admins, currentUserEmail) {
    const tbody = document.getElementById("adminsTableBody");
    
    if (!tbody) {
        console.error("adminsTableBody element not found!");
        return;
    }

    console.log("Current user email:", currentUserEmail);
    console.log("Displaying admins:", admins);

    tbody.innerHTML = admins
        .map((admin) => {
            // Support both role naming conventions
            const isSuperAdmin = admin.role === "super_admin" || admin.role === "superadmin";
            const roleClass = isSuperAdmin ? "role-super-admin" : "role-admin";
            const roleDisplay = isSuperAdmin ? "Super Admin" : "Admin";
            
            const createdDate = new Date(admin.created_at).toLocaleDateString();
            
            const status = admin.status?.toLowerCase() || 'pending';
            
            // Don't show action buttons for the current super admin
            const isCurrentUser = admin.email === currentUserEmail;
            
            return `
        <tr>
            <td>${admin.first_name} ${admin.last_name}</td>
            <td>${admin.email}</td>
            <td>${admin.phone || "N/A"}</td>
            <td><span class="role-badge ${roleClass}">${roleDisplay}</span></td>
            <td>${createdDate}</td>
            <td class="action-buttons">
                ${isCurrentUser 
                    ? `<span class="badge badge-primary">Current User</span>`
                    : status === 'pending'
                    ? `
                    <button class="btn-small btn-success" onclick="approveAdmin('${admin.id}', 'approve')">Approve</button>
                    <button class="btn-small btn-danger" onclick="approveAdmin('${admin.id}', 'reject')">Reject</button>
                    `
                    : status === 'approved'
                    ? `<span class="badge badge-success">Approved</span>`
                    : status === 'rejected'
                    ? `<span class="badge badge-danger">Rejected</span>`
                    : `<span class="badge badge-secondary">${status}</span>`
                }
            </td>
        </tr>
        `;
        })
        .join("");
}

// Rest of your existing functions remain the same (displayLogs, showEventDetails, getActionClass, updatePagination, populateAdminFilter, changeRole, deleteAdmin, applyFilters, resetFilters, exportLogs, initializeQRDownload, downloadQRCode, etc.)

// Enhanced initialization
async function initializeSuperAdmin() {
    console.log("Initializing Super Admin...");
    
    // Check authentication first
    const isAuthenticated = await checkAuth();
    if (!isAuthenticated) {
        return;
    }

    // Load all data
    await loadUserInfo();
    await loadLogs();
    await loadAdmins();
    await loadStats();
    restoreLastTab();

    console.log("Super Admin initialized successfully!");
}

// Enhanced logout
function setupLogout() {
    const logoutBtn = document.getElementById("logoutBtn");
    if (logoutBtn) {
        logoutBtn.addEventListener("click", (e) => {
            e.preventDefault();
            if (confirm("Are you sure you want to logout?")) {
                localStorage.removeItem("token");
                localStorage.removeItem("adminData");
                window.location.href = "Auth/LoginPage.html";
            }
        });
    }
}

// Initialize when DOM is ready
document.addEventListener('DOMContentLoaded', function() {
    console.log('DOM loaded, initializing Super Admin...');
    initializeSuperAdmin();
    setupLogout();
    
    // Your existing tab switching and other DOM-related code here
    document.querySelectorAll(".menu-item[data-tab]").forEach((item) => {
        item.addEventListener("click", (e) => {
            e.preventDefault();
            const tabName = item.dataset.tab;

            // Update active menu item
            document.querySelectorAll(".menu-item").forEach((m) => m.classList.remove("active"));
            item.classList.add("active");

            // Show corresponding tab
            document.querySelectorAll(".tab-content").forEach((tab) => tab.classList.remove("active"));
            document.getElementById(`${tabName}Tab`).classList.add("active");

            // Update page title
            const titles = {
                logs: "Admin Task Logs",
                admins: "Manage Administrators",
                qr: "",
                gallery: "",
                notifications: "",
            };
            document.getElementById("pageTitle").textContent = titles[tabName];

            // Load data for specific tabs
            if (tabName === "admins") loadAdmins();
            if (tabName === "qr") initializeQRDownload();

            // Hide statsGrid only when on account tab
            const statsGrid = document.getElementById("statsGrid");
            if (statsGrid) {
                const hideTabs = ["qr", "gallery", "notifications"];
                statsGrid.style.display = hideTabs.includes(tabName) ? "none" : "grid";
            }
        });
    });

    // Your existing gallery and QR code functionality...
});

// Keep all your existing gallery and file handling functions exactly as they are
// ======== Gallery ======== //
const fileInput = document.getElementById("fileInput");
const previewList = document.getElementById("previewList");
const previewHeader = document.querySelector(".preview-header");
const totalSizeEl = document.getElementById("totalSize");
const uploadBox = document.querySelector(".upload-box");

let selectedFiles = [];

// Handle file input change
fileInput.addEventListener("change", handleFiles);
// fileInput.addEventListener('change', handleFiles);
// → Fires when files are selected via the file input.
// Drag & drop listeners (dragover, dragleave, drop)
// → Change styles to indicate a drop zone.
// → On drop, filters only images/videos, assigns them to fileInput.files, and passes them to handleFiles().
// Drag and drop functionality
uploadBox.addEventListener("dragover", (e) => {
    e.preventDefault();
    uploadBox.style.borderColor = "#007bff";
    uploadBox.style.backgroundColor = "#f0f8ff";
});

uploadBox.addEventListener("dragleave", (e) => {
    e.preventDefault();
    uploadBox.style.borderColor = "#ddd";
    uploadBox.style.backgroundColor = "#f9f9f9";
});

uploadBox.addEventListener("drop", (e) => {
    e.preventDefault();
    uploadBox.style.borderColor = "#ddd";
    uploadBox.style.backgroundColor = "#f9f9f9";

    const files = Array.from(e.dataTransfer.files);
    const imageFiles = files.filter(
        (file) =>
            file.type.startsWith("image/") || file.type.startsWith("video/"),
    );

    if (imageFiles.length > 0) {
        fileInput.files = e.dataTransfer.files;
        handleFiles({ target: { files: imageFiles } });
    }
});

// ======== HANDLE FILE SELECTION ======== //
// Takes new files, checks if they are images or videos.
// Adds them to selectedFiles.
// Calls createThumbnail() for preview.
// Updates header and total size display.
function handleFiles(e) {
    const files = Array.from(e.target.files);

    files.forEach((file) => {
        if (file.type.startsWith("image/") || file.type.startsWith("video/")) {
            selectedFiles.push(file);
            createThumbnail(file);
        }
    });

    updatePreviewHeader();
    updateTotalSize();
}

// ======== CREATING THUMBNAILS ======== //
// Uses FileReader to read the file as a base64 data URL.
// Builds a small preview:
// If image → shows <img>.
// If video → shows <video> with play icon.
// Adds:
// File name (truncated if long).
// File size.
// A remove button (×).
// Click on the thumbnail opens a modal view (viewMedia()).
function createThumbnail(file) {
    const reader = new FileReader();

    reader.onload = (e) => {
        const thumbnailItem = document.createElement("div");
        thumbnailItem.className = "thumbnail-item";
        thumbnailItem.dataset.filename = file.name;

        const isVideo = file.type.startsWith("video/");

        thumbnailItem.innerHTML = `
        <div class="thumbnail-wrapper">
            ${
                isVideo
                    ? `<video src="${e.target.result}" class="thumbnail-img"></video>
            <div class="video-icon">▶</div>`
                    : `<img src="${e.target.result}" alt="${file.name}" class="thumbnail-img">`
            }
            <button class="remove-btn" onclick="removeFile('${file.name}')">&times;</button>
        </div>
        <div class="thumbnail-name">${truncateFilename(file.name)}</div>
        <div class="thumbnail-size">${formatFileSize(file.size)}</div>
        `;

        // Add click event to view full image/video
        const thumbnailImg = thumbnailItem.querySelector(".thumbnail-img");
        thumbnailImg.addEventListener("click", () =>
            viewMedia(e.target.result, file.name, isVideo),
        );

        previewList.appendChild(thumbnailItem);
    };

    reader.readAsDataURL(file);
}

// ======== VIEWING MEDIA MODALS ======== //
// Creates a modal overlay containing the full image or video.
// Can close by:
// Clicking outside or on ×.
// Pressing Escape.
function viewMedia(src, filename, isVideo) {
    // Create modal overlay
    const modal = document.createElement("div");
    modal.className = "media-modal";
    modal.innerHTML = `
    <div class="modal-content">
      <button class="modal-close">&times;</button>
      <div class="modal-media-wrapper">
        ${
            isVideo
                ? `<video src="${src}" controls class="modal-media"></video>`
                : `<img src="${src}" alt="${filename}" class="modal-media">`
        }
      </div>
      <div class="modal-filename">${filename}</div>
    </div>
  `;

    document.body.appendChild(modal);

    // Close modal on click
    modal.addEventListener("click", (e) => {
        if (e.target === modal || e.target.className === "modal-close") {
            document.body.removeChild(modal);
        }
    });

    // Close on Escape key
    document.addEventListener("keydown", function closeOnEsc(e) {
        if (e.key === "Escape") {
            if (document.body.contains(modal)) {
                document.body.removeChild(modal);
            }
            document.removeEventListener("keydown", closeOnEsc);
        }
    });
}
// ======== REMOVING FILES ======== //
// Removes the file from selectedFiles.
// Removes its thumbnail from the DOM.
// Updates UI accordingly.
function removeFile(filename) {
    selectedFiles = selectedFiles.filter((file) => file.name !== filename);

    const thumbnailItem = previewList.querySelector(
        `[data-filename="${filename}"]`,
    );
    if (thumbnailItem) {
        thumbnailItem.remove();
    }

    updatePreviewHeader();
    updateTotalSize();

    // Reset file input if no files left
    if (selectedFiles.length === 0) {
        fileInput.value = "";
    }
}

// ======== UPDATING UI ======== //
// Shows how many files are selected.
function updatePreviewHeader() {
    const count = selectedFiles.length;
    previewHeader.textContent =
        count === 0
            ? "No files selected"
            : `${count} file${count > 1 ? "s" : ""} selected`;
}

// Shows total file size of all selected.
function updateTotalSize() {
    const totalBytes = selectedFiles.reduce((sum, file) => sum + file.size, 0);
    totalSizeEl.textContent =
        selectedFiles.length > 0
            ? `Total size: ${formatFileSize(totalBytes)}`
            : "";
}

// Converts bytes → KB/MB/GB.
function formatFileSize(bytes) {
    if (bytes === 0) return "0 Bytes";
    const k = 1024;
    const sizes = ["Bytes", "KB", "MB", "GB"];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return Math.round((bytes / Math.pow(k, i)) * 100) / 100 + " " + sizes[i];
}

// Cuts long file names with ....
function truncateFilename(name, maxLength = 20) {
    if (name.length <= maxLength) return name;
    const extension = name.split(".").pop();
    const nameWithoutExt = name.slice(0, name.lastIndexOf("."));
    const truncated = nameWithoutExt.slice(0, maxLength - extension.length - 4);
    return `${truncated}...${extension}`;
}

// ======== REMOVING FILES ======== //
// When clicked:
// Validates that files are selected.
// Validates that a client/event name is entered.
// (Currently just console.log + alert) → In real app, you’d send files to a backend server here.
document.querySelector(".send-btn").addEventListener("click", () => {
    const clientName = document.querySelector(".client-input").value.trim();

    if (selectedFiles.length === 0) {
        alert("Please select files to upload");
        return;
    }

    if (!clientName) {
        alert("Please enter an event or client name");
        return;
    }

    // Here you would implement the actual upload logic
    console.log("Sending files:", selectedFiles);
    console.log("Client name:", clientName);
    alert(`Ready to send ${selectedFiles.length} file(s) to "${clientName}"`);
});

