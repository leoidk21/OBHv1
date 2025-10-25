console.log("SuperAdmin.js is loaded!");
const API_BASE = "http://localhost:3000/api";
let currentPage = 1;
let totalPages = 1;
let allAdmins = [];

// Check authentication and role
const token = localStorage.getItem("token");
if (!token) {
    window.location.href = "Auth/LoginPage.html";
}

async function getCurrentUser() {
    try {
        const response = await fetch(`${API_BASE}/admin/me`, {
            headers: {
                'Authorization': `Bearer ${localStorage.getItem('token')}`
            }
        });
        
        if (response.ok) {
            return await response.json();
        }
    } catch (error) {
        console.error('Error getting current user:', error);
    }
    return { email: '' };
}

// Load user info
async function loadUserInfo() {
    try {
        const response = await fetch(`${API_BASE}/admin/me`, {
            headers: { Authorization: `Bearer ${token}` },
        });

        if (!response.ok) throw new Error("Failed to fetch user");

        const user = await response.json();

        // Check if user is super admin
        if (user.role !== "super_admin") {
            alert("Access denied. Super Admin privileges required.");
            window.location.href = "LandingPage.html";
            return;
        }

        document.getElementById("userName").textContent =
            `${user.first_name} ${user.last_name}`;
        document.getElementById("userEmail").textContent = user.email;
        
        return user; // Return user data
    } catch (error) {
        console.error("Error loading user:", error);
        localStorage.removeItem("token");
        window.location.href = "Auth/LoginPage.html";
    }
}

// Load logs
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
            headers: { Authorization: `Bearer ${token}` },
        });

        if (!response.ok) throw new Error("Failed to fetch logs");

        const data = await response.json();
        displayLogs(data.logs);
        updatePagination(data.pagination);
        currentPage = data.pagination.page;
        totalPages = data.pagination.totalPages;
    } catch (error) {
        console.error("Error loading logs:", error);
        document.getElementById("logsTableBody").innerHTML =
            '<tr><td colspan="6" style="text-align: center; color: red;">Error loading logs</td></tr>';
    }
}

// Display logs
function displayLogs(logs) {
    const tbody = document.getElementById("logsTableBody");

    if (logs.length === 0) {
        tbody.innerHTML = '<tr><td colspan="6" style="text-align: center;">No logs found</td></tr>';
        return;
    }

    tbody.innerHTML = logs.map((log) => {
        const date = new Date(log.timestamp).toLocaleString();
        const actionClass = getActionClass(log.action);
        
        // Parse details for better display
        let displayDetails = 'No details';
        try {
            const details = typeof log.details === 'string' ? JSON.parse(log.details) : log.details;
            
            if (log.action.includes('APPROVE_EVENT') || log.action.includes('REJECT_EVENT')) {
                displayDetails = `
                    Event: ${details.eventName || 'N/A'}<br>
                    Type: ${details.eventType || 'N/A'}<br>
                    Client: ${details.clientName || 'N/A'}<br>
                    Remarks: ${details.remarks || 'No remarks'}
                `;
            } else {
                displayDetails = JSON.stringify(details, null, 2);
            }
        } catch (e) {
            displayDetails = log.details || 'No details';
        }

        return `
            <tr>
                <td>${date}</td>
                <td>${log.first_name} ${log.last_name}<br><small>${log.email}</small></td>
                <td><span class="badge ${actionClass}">${log.action}</span></td>
                <td>${log.target_page}</td>
                <td>${log.ip_address || "N/A"}</td>
                <td><button class="btn-small btn-primary" onclick='showEventDetails(${JSON.stringify(log.details)})'>View Details</button></td>
            </tr>
        `;
    }).join("");
}

// Show details modal
function showEventDetails(details) {
    try {
        const parsedDetails = typeof details === 'string' ? JSON.parse(details) : details;
        
        if (parsedDetails.eventId) {
            let message = `Event ID: ${parsedDetails.eventId}\n`;
            if (parsedDetails.eventName) message += `Event Name: ${parsedDetails.eventName}\n`;
            if (parsedDetails.eventType) message += `Event Type: ${parsedDetails.eventType}\n`;
            if (parsedDetails.clientName) message += `Client: ${parsedDetails.clientName}\n`;
            if (parsedDetails.remarks) message += `Remarks: ${parsedDetails.remarks}\n`;
            if (parsedDetails.timestamp) message += `Time: ${new Date(parsedDetails.timestamp).toLocaleString()}`;
            
            alert(message);
        } else {
            alert(JSON.stringify(parsedDetails, null, 2));
        }
    } catch (e) {
        alert(details);
    }
}

function getActionClass(action) {
    if (action.includes('APPROVE')) return 'badge-success';
    if (action.includes('REJECT')) return 'badge-danger';
    if (action.includes('CREATE')) return 'badge-create';
    if (action.includes('UPDATE')) return 'badge-update';
    if (action.includes('DELETE')) return 'badge-delete';
    return 'badge-view';
}

// Update pagination
function updatePagination(pagination) {
    const container = document.getElementById("pagination");
    const { page, totalPages } = pagination;

    let html = `
    <button ${page === 1 ? "disabled" : ""} onclick="loadLogs(${page - 1})">Previous</button>
    <span class="current-page">Page ${page} of ${totalPages}</span>
    <button ${page === totalPages ? "disabled" : ""} onclick="loadLogs(${page + 1})">Next</button>
    `;

    container.innerHTML = html;
}

// Load admins list
async function loadAdmins() {
    try {
        const response = await fetch(`${API_BASE}/superadmin/admins`, {
            headers: { Authorization: `Bearer ${token}` },
        });

        if (!response.ok) throw new Error("Failed to fetch admins");

        const data = await response.json();
        allAdmins = data.admins;
        
        // Get current user email and pass it to displayAdmins
        const currentUser = await getCurrentUser();
        displayAdmins(data.admins, currentUser.email);
        populateAdminFilter(data.admins);
    } catch (error) {
        console.error("Error loading admins:", error);
    }
}   

// Display admins
// Display admins
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
            const roleClass = admin.role === "super_admin" ? "role-super-admin" : "role-admin";
            const createdDate = new Date(admin.created_at).toLocaleDateString();
            
            const status = admin.status?.toLowerCase() || 'pending';
            
            // Don't show action buttons for the current super admin
            const isCurrentUser = admin.email === currentUserEmail;
            
            return `
        <tr>
            <td>${admin.first_name} ${admin.last_name}</td>
            <td>${admin.email}</td>
            <td>${admin.phone || "N/A"}</td>
            <td><span class="role-badge ${roleClass}">${admin.role}</span></td>
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
            // Refresh the admin list
            loadAdmins(); // Changed from fetchAdmins() to loadAdmins()
        } else {
            console.error('Approval failed:', data);
            alert(`Failed to update admin status: ${data.error}`);
        }
    } catch (error) {
        console.error('Error:', error);
        alert('Error updating admin status');
    }
}

// Populate admin filter
function populateAdminFilter(admins) {
    const select = document.getElementById("filterAdmin");
    select.innerHTML =
        '<option value="">All Admins</option>' +
        admins
            .map(
                (admin) =>
                    `<option value="${admin.id}">${admin.first_name} ${admin.last_name}</option>`,
            )
            .join("");
}

// Change admin role
async function changeRole(adminId, currentRole) {
    const newRole = currentRole === "admin" ? "super_admin" : "admin";

    if (!confirm(`Change role to ${newRole}?`)) return;

    try {
        const response = await fetch(
            `${API_BASE}/superadmin/admins/${adminId}/role`,
            {
                method: "PUT",
                headers: {
                    Authorization: `Bearer ${token}`,
                    "Content-Type": "application/json",
                },
                body: JSON.stringify({ role: newRole }),
            },
        );

        if (!response.ok) throw new Error("Failed to update role");

        alert("Role updated successfully");
        loadAdmins();
    } catch (error) {
        console.error("Error updating role:", error);
        alert("Failed to update role");
    }
}

// Delete admin
async function deleteAdmin(adminId) {
    if (!confirm("Are you sure you want to delete this admin?")) return;

    try {
        const response = await fetch(
            `${API_BASE}/superadmin/admins/${adminId}`,
            {
                method: "DELETE",
                headers: { Authorization: `Bearer ${token}` },
            },
        );

        if (!response.ok) throw new Error("Failed to delete admin");

        alert("Admin deleted successfully");
        loadAdmins();
    } catch (error) {
        console.error("Error deleting admin:", error);
        alert("Failed to delete admin");
    }
}

// Load statistics
async function loadStats() {
    try {
        const response = await fetch(`${API_BASE}/superadmin/logs/summary`, {
            headers: { Authorization: `Bearer ${token}` },
        });

        if (!response.ok) throw new Error("Failed to fetch stats");

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
    }
}

// Apply filters
function applyFilters() {
    loadLogs(1);
}

// Reset filters
function resetFilters() {
    document.getElementById("filterAdmin").value = "";
    document.getElementById("filterPage").value = "";
    document.getElementById("filterDateFrom").value = "";
    document.getElementById("filterDateTo").value = "";
    loadLogs(1);
}

// Export logs to CSV
function exportLogs() {
    alert("Export functionality - implement CSV generation");
}

function initializeQRDownload() {
    console.log('Initializing QR download...');
    
    // Use event delegation for the download button
    document.addEventListener('click', function(e) {
        if (e.target && (e.target.id === 'downloadBtn' || e.target.classList.contains('download-btn'))) {
            console.log('Download button clicked');
            e.preventDefault();
            e.stopPropagation();
            downloadQRCode();
            return false;
        }
    });
    
    // Also try to find and attach directly when QR tab becomes active
    const downloadBtn = document.getElementById('downloadBtn');
    if (downloadBtn) {
        console.log('Found download button directly');
        downloadBtn.addEventListener('click', downloadQRCode);
    }
}

// Tab switching
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
        if (tabName === "qr") initializeQRDownload(); // Initialize QR download when QR tab is active

        // Hide statsGrid only when on account tab
        const statsGrid = document.getElementById("statsGrid");
        if (statsGrid) {
            const hideTabs = ["qr", "gallery", "notifications"];
            statsGrid.style.display = hideTabs.includes(tabName) ? "none" : "grid";
        }
    });
});

document.addEventListener('DOMContentLoaded', function() {
    console.log('Initializing QR download...');
});

// Your existing downloadQRCode function (keep this as is)
function downloadQRCode() {
    console.log('downloadQRCode function called');
    const qrImage = document.querySelector('.qrCode img');
    const notification = document.getElementById('notification');
    
    if (!qrImage) {
        console.error('QR image not found!');
        alert('QR code image not found');
        return;
    }

    console.log('QR image found:', qrImage.src);

    // Create a temporary canvas to draw the QR code
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    const img = new Image();
    
    img.crossOrigin = "Anonymous";
    
    img.onload = function() {
        canvas.width = img.width;
        canvas.height = img.height;
        ctx.drawImage(img, 0, 0);
        
        const link = document.createElement('a');
        link.download = 'qr-code.png';
        link.href = canvas.toDataURL('image/png');
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        
        // Show success notification if it exists
        if (notification) {
            showNotification(notification);
        } else {
            alert('QR code downloaded successfully!');
        }
        
        console.log('QR code downloaded successfully');
    };
    
    img.onerror = function() {
        console.error('Error loading image, trying without CORS');
        img.crossOrigin = null;
        img.src = qrImage.src + '?t=' + new Date().getTime();
    };
    
    img.src = qrImage.src;
}

function showNotification(notification) {
    notification.classList.add('show');
    setTimeout(function() {
        notification.classList.remove('show');
    }, 3000);
}

function restoreLastTab() {
    const defaultTab = "logs"; 
    const tabElement = document.querySelector(`[data-tab="${defaultTab}"]`);

    if (tabElement) {
        tabElement.click();
    }
}

// Handle dashboard link (only attach ONCE)
const dashboardLink = document.getElementById("dashboardLink");
if (dashboardLink) {
    dashboardLink.addEventListener("click", function (e) {
        e.preventDefault();
        if (confirm("Do you want to go to the dashboard?")) {
            window.location.href = this.href;
        }
    });
}

// Logout
document.getElementById("logoutBtn").addEventListener("click", (e) => {
    e.preventDefault();
    if (confirm("Are you sure you want to logout?")) {
        localStorage.removeItem("token");
        window.location.href = "Auth/LoginPage.html";
    }
});

// Initialize
loadUserInfo();
loadLogs();
loadAdmins();
loadStats();
restoreLastTab();

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

