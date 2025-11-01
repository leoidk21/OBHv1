console.log("SuperAdmin.js is loaded!");

console.log("🔍 DEBUG - Available objects:");
console.log("- window.electronAPI:", window.electronAPI ? "EXISTS" : "MISSING");
console.log("- window.supabase:", window.supabase ? "EXISTS" : "MISSING");
console.log("- window.supabaseConfig:", window.supabaseConfig ? "EXISTS" : "MISSING");

// Global Supabase client variable
let supabase = null;

// Add CSS styles
const additionalCSS = `
.action-badge {
    padding: 2px 8px;
    border-radius: 4px;
    font-size: 12px;
    font-weight: bold;
}

.action-approve { background-color: #d4edda; color: #155724; }
.action-reject { background-color: #f8d7da; color: #721c24; }
.action-reminder { background-color: #fff3cd; color: #856404; }
.action-login { background-color: #cce7ff; color: #004085; }
.action-logout { background-color: #e2e3e5; color: #383d41; }
.action-create { background-color: #d1ecf1; color: #0c5460; }
.action-update { background-color: #e2e3e5; color: #383d41; }
.action-delete { background-color: #f5c6cb; color: #721c24; }
.action-unknown { background-color: #e9ecef; color: #495057; }

.log-details {
    display: flex;
    flex-direction: column;
    gap: 10px;
}

.detail-row {
    display: flex;
    border-bottom: 1px solid #eee;
    padding: 8px 0;
}

.detail-row label {
    font-weight: bold;
    min-width: 120px;
}

.log-details-json {
    background: #f5f5f5;
    padding: 10px;
    border-radius: 4px;
    max-height: 200px;
    overflow-y: auto;
    white-space: pre-wrap;
    font-family: monospace;
}

.pagination-info {
    margin-bottom: 10px;
    color: #666;
}

.pagination-controls {
    display: flex;
    gap: 5px;
    flex-wrap: wrap;
}

.modal-overlay {
    position: fixed;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
    background: rgba(0, 0, 0, 0.5);
    display: flex;
    align-items: center;
    justify-content: center;
    z-index: 1000;
}

.modal-content {
    background: white;
    border-radius: 8px;
    box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
    max-width: 90%;
    max-height: 90%;
    overflow: auto;
    width: 600px;
}

.modal-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 16px 20px;
    border-bottom: 1px solid #eee;
}

.modal-header h3 {
    margin: 0;
    flex: 1;
}

.modal-close {
    background: none;
    border: none;
    font-size: 24px;
    cursor: pointer;
    color: #666;
    padding: 0;
    width: 30px;
    height: 30px;
    display: flex;
    align-items: center;
    justify-content: center;
}

.modal-body {
    padding: 20px;
}

.modal-footer {
    padding: 16px 20px;
    border-top: 1px solid #eee;
    text-align: right;
}

.event-details-grid {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 10px;
    margin-top: 10px;
}

.event-detail-item {
    padding: 8px;
    background: #f8f9fa;
    border-radius: 4px;
}

.event-detail-label {
    font-weight: bold;
    color: #495057;
    font-size: 12px;
}

.event-detail-value {
    color: #212529;
    margin-top: 4px;
}
`;

// Inject CSS
const style = document.createElement('style');
style.textContent = additionalCSS;
document.head.appendChild(style);

/**
 * Wait for Supabase to be available
 */
function waitForSupabase(timeout = 5000) {
  return new Promise((resolve, reject) => {
    const startTime = Date.now();
    
    const checkSupabase = () => {
      // Check if Supabase is already initialized
      if (window.supabase && typeof window.supabase.auth !== "undefined") {
        console.log("✅ Supabase found and ready");
        resolve(window.supabase);
        return;
      }
      
      // Check if we can create a client
      if (window.supabaseConfig?.url && window.supabaseConfig?.anonKey) {
        console.log("Creating Supabase client from config...");
        try {
          const client = window.supabase.createClient(
            window.supabaseConfig.url,
            window.supabaseConfig.anonKey
          );
          window.supabase = client;
          console.log("✅ Supabase client created successfully");
          resolve(client);
          return;
        } catch (error) {
          console.error("Error creating Supabase client:", error);
        }
      }
      
      // Check if we've exceeded timeout
      if (Date.now() - startTime > timeout) {
        reject(new Error("Supabase initialization timeout"));
        return;
      }
      
      // Try again in 100ms
      setTimeout(checkSupabase, 100);
    };
    
    checkSupabase();
  });
}

/**
 * Get Supabase client instance
 */
function getSupabase() {
  console.log("Getting Supabase client...");

  // Method 1: Try electronAPI first
  if (window.electronAPI?.supabase) {
    console.log("Using Supabase from electronAPI");
    return window.electronAPI.supabase;
  }

  // Method 2: Try existing window.supabase client
  if (window.supabase && typeof window.supabase.auth !== "undefined") {
    console.log("Using existing window.supabase client");
    return window.supabase;
  }

  // Method 3: Create new Supabase client safely
  if (window.supabaseConfig?.url && window.supabaseConfig?.anonKey) {
    console.log("Config found — creating Supabase client...");

    if (window.supabase && typeof window.supabase.createClient === "function") {
      const client = window.supabase.createClient(
        window.supabaseConfig.url,
        window.supabaseConfig.anonKey
      );
      console.log("✅ Supabase client created successfully");
      return client;
    }

    // Optional fallback if preload provides one
    if (window.electronAPI?.createSupabaseClient) {
      console.log("Creating client via electronAPI fallback");
      return window.electronAPI.createSupabaseClient(
        window.supabaseConfig.url,
        window.supabaseConfig.anonKey
      );
    }
  }

  console.error("❌ Supabase not available in SuperAdmin");
  return null;
}

/**
 * Check authentication status
 */
async function checkAuth() {
    const token = localStorage.getItem("token");
    const adminData = localStorage.getItem("adminData");
    
    if (!token) {
        console.log("No token found, redirecting to login");
        window.location.href = "Auth/LoginPage.html";
        return false;
    }

    try {
        // Verify session
        const { data: { session }, error } = await supabase.auth.getSession();
        
        if (error || !session) {
            console.error("Invalid session:", error);
            localStorage.removeItem("token");
            localStorage.removeItem("adminData");
            window.location.href = "Auth/LoginPage.html";
            return false;
        }

        // Normalize role checking (support multiple naming conventions)
        let userRole = null;
        
        // Check stored data first
        if (adminData) {
            const admin = JSON.parse(adminData);
            userRole = admin.role?.toLowerCase();
            if (['superadmin', 'super_admin'].includes(userRole)) {
                console.log("✅ Superadmin verified via stored data");
                return true;
            }
        }

        // Fallback: Verify via API
        const user = await getCurrentUser();
        if (user) {
            userRole = user.role?.toLowerCase();
            if (['superadmin', 'super_admin'].includes(userRole)) {
                console.log("✅ Superadmin verified via API");
                return true;
            }
        }

        console.error("User is not superadmin, redirecting. Role:", userRole);
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

/**
 * Get current user profile
 */
async function getCurrentUser() {
    try {
        const { data: { session } } = await supabase.auth.getSession();
        if (!session) return null;

        const { data: profile, error } = await supabase
            .from('admin_profiles')
            .select('*')
            .eq('id', session.user.id)
            .single();

        if (error) return null;
        
        // Normalize role name
        if (profile.role) {
            profile.role = profile.role.toLowerCase();
        }
        return profile;
        
    } catch (error) {
        console.error('Error getting current user:', error);
        return null;
    }
}

/**
 * Load user information
 */
async function loadUserInfo() {
    try {
        // Use stored data first
        const storedAdmin = localStorage.getItem("adminData");
        if (storedAdmin) {
            const user = JSON.parse(storedAdmin);
            updateUserUI(user);
        }

        // Get fresh data from Supabase
        const { data: { session } } = await supabase.auth.getSession();
        if (!session) throw new Error("No session");

        const { data: profile, error } = await supabase
            .from('admin_profiles')
            .select('*')
            .eq('id', session.user.id)
            .single();

        if (error) throw error;

        // Check if super admin
        const userRole = profile.role?.toLowerCase();
        if (!['superadmin', 'super_admin'].includes(userRole)) {
            alert("Access denied. Super Admin privileges required.");
            window.location.href = "LandingPage.html";
            return;
        }

        updateUserUI(profile);
        return profile;
        
    } catch (error) {
        console.error("Error loading user:", error);
    }
}

/**
 * Update user UI elements
 */
function updateUserUI(user) {
    const userNameEl = document.getElementById("userName");
    const userEmailEl = document.getElementById("userEmail");
    
    if (userNameEl) {
        userNameEl.textContent = `${user.first_name} ${user.last_name}`;
    }
    if (userEmailEl) {
        userEmailEl.textContent = user.email;
    }
}

/**
 * Load admin logs
 */
async function loadLogs(page = 1, limit = 20) {
    try {
        console.log("📊 Loading admin logs...");
        
        const adminFilter = document.getElementById("filterAdmin")?.value;
        const pageFilter = document.getElementById("filterPage")?.value;
        const dateFrom = document.getElementById("filterDateFrom")?.value;
        const dateTo = document.getElementById("filterDateTo")?.value;
        const actionFilter = document.getElementById("filterAction")?.value;

        // Build query
        let query = supabase
            .from('admin_logs')
            .select(`
                id,
                admin_id,
                action,
                target_page,
                details,
                ip_address,
                timestamp,
                admin_profiles!fk_admin_logs_admin_profiles (
                    first_name,
                    last_name,
                    email,
                    role
                )
            `, { count: 'exact' })
            .order('timestamp', { ascending: false });

        // Apply filters
        if (adminFilter) {
            query = query.eq('admin_id', adminFilter);
        }
        if (pageFilter) {
            query = query.eq('target_page', pageFilter);
        }
        if (actionFilter) {
            query = query.eq('action', actionFilter);
        }
        if (dateFrom) {
            query = query.gte('timestamp', `${dateFrom}T00:00:00Z`);
        }
        if (dateTo) {
            query = query.lte('timestamp', `${dateTo}T23:59:59Z`);
        }

        // Add pagination
        const from = (page - 1) * limit;
        const to = from + limit - 1;
        query = query.range(from, to);

        const { data: logs, error, count } = await query;

        if (error) {
            console.error("❌ Error loading logs:", error);
            throw error;
        }

        console.log(`✅ Loaded ${logs?.length || 0} logs (Total: ${count})`);
        displayLogs(logs || []);
        updateLogsPagination(page, Math.ceil(count / limit), count);
        
    } catch (error) {
        console.error("❌ Fatal error loading logs:", error);
        const tbody = document.getElementById("logsTableBody");
        if (tbody) {
            tbody.innerHTML = `
                <tr>
                    <td colspan="7" style="text-align: center; color: red;">
                        Error loading logs: ${error.message}
                        <br>
                        <button onclick="loadLogs()" style="margin-top: 10px;">Retry</button>
                    </td>
                </tr>
            `;
        }
    }
}

/**
 * Format action display text
 */
function formatActionText(action, details) {
    const actionMap = {
        'approve': 'Approves an Event',
        'reject': 'Rejects an Event', 
        'reminder': 'Sends a Reminder',
        'login': 'Logs In',
        'logout': 'Logs Out',
        'create': 'Creates an Event',
        'update': 'Updates an Event',
        'delete': 'Deletes an Event'
    };
    
    return actionMap[action] || action;
}

/**
 * Format event details for display
 */
function formatEventDetails(details) {
    if (!details || typeof details !== 'object') {
        return 'No event details available';
    }
    
    // Remove test data if present
    const cleanDetails = { ...details };
    delete cleanDetails.test;
    
    if (Object.keys(cleanDetails).length === 0) {
        return 'No event details available';
    }
    
    let formattedDetails = '';
    
    // Format common event fields
    if (cleanDetails.event_name) {
        formattedDetails += `Event: ${cleanDetails.event_name}\n`;
    }
    if (cleanDetails.event_id) {
        formattedDetails += `Event ID: ${cleanDetails.event_id}\n`;
    }
    if (cleanDetails.client_name) {
        formattedDetails += `Client: ${cleanDetails.client_name}\n`;
    }
    if (cleanDetails.event_date) {
        formattedDetails += `Date: ${cleanDetails.event_date}\n`;
    }
    if (cleanDetails.reason) {
        formattedDetails += `Reason: ${cleanDetails.reason}\n`;
    }
    if (cleanDetails.reminder_type) {
        formattedDetails += `Reminder Type: ${cleanDetails.reminder_type}\n`;
    }
    
    // If no common fields found, show the raw details
    if (!formattedDetails) {
        return JSON.stringify(cleanDetails, null, 2);
    }
    
    return formattedDetails.trim();
}

/**
 * Display logs in table
 */
function displayLogs(logs) {
    const tbody = document.getElementById("logsTableBody");
    if (!tbody) {
        console.error("❌ logsTableBody element not found!");
        return;
    }

    if (logs.length === 0) {
        tbody.innerHTML = `
            <tr>
                <td colspan="7" style="text-align: center;">
                    📝 No logs found
                    <br>
                    <small>Try performing some actions or adjusting filters</small>
                </td>
            </tr>
        `;
        return;
    }

    tbody.innerHTML = logs.map(log => {
        // Handle admin information
        let adminName = 'Unknown Admin';
        let adminRole = 'Unknown';
        
        if (log.admin_profiles) {
            adminName = `${log.admin_profiles.first_name} ${log.admin_profiles.last_name}`;
            adminRole = log.admin_profiles.role || 'Unknown';
        } else if (log.admin_id) {
            adminName = `Admin ID: ${log.admin_id}`;
        }
        
        const timestamp = new Date(log.timestamp).toLocaleString();
        const actionText = formatActionText(log.action, log.details);
        const eventDetails = formatEventDetails(log.details);
        
        // Add role-based styling
        const roleClass = adminRole.includes('super') ? 'role-super-admin' : 'role-admin';
        
        return `
            <tr>
                <td>${timestamp}</td>
                <td>
                    <div>${adminName}</div>
                    <small class="role-badge ${roleClass}">${adminRole}</small>
                </td>
                <td><span class="action-badge action-${log.action?.toLowerCase() || 'unknown'}">${actionText}</span></td>
                <td>${log.target_page || 'N/A'}</td>
                <td>${log.ip_address || 'N/A'}</td>
                <td title="${eventDetails.replace(/"/g, '&quot;')}">
                    ${eventDetails.substring(0, 50)}${eventDetails.length > 50 ? '...' : ''}
                </td>
                <td>
                    <button class="btn-small btn-info" onclick="viewLogDetails('${log.id}')">View Details</button>
                </td>
            </tr>
        `;
    }).join('');
}

/**
 * View Detailed Log Information
 */
async function viewLogDetails(logId) {
    try {
        const { data: log, error } = await supabase
            .from('admin_logs')
            .select(`
                *,
                admin_profiles!fk_admin_logs_admin_profiles (
                    first_name,
                    last_name,
                    email,
                    role,
                    phone
                )
            `)
            .eq('id', logId)
            .single();

        if (error) throw error;

        // Format the details for display
        const formattedDetails = formatEventDetails(log.details);
        const actionText = formatActionText(log.action, log.details);

        // Create modal for detailed view
        const modal = document.createElement('div');
        modal.className = 'modal-overlay';
        modal.innerHTML = `
            <div class="modal-content">
                <div class="modal-header">
                    <h3>Event Action Details</h3>
                    <button class="modal-close" onclick="this.closest('.modal-overlay').remove()">&times;</button>
                </div>
                <div class="modal-body">
                    <div class="log-details">
                        <div class="detail-row">
                            <label>Timestamp:</label>
                            <span>${new Date(log.timestamp).toLocaleString()}</span>
                        </div>
                        <div class="detail-row">
                            <label>Admin:</label>
                            <span>${log.admin_profiles ? `${log.admin_profiles.first_name} ${log.admin_profiles.last_name}` : 'Unknown'}</span>
                        </div>
                        <div class="detail-row">
                            <label>Email:</label>
                            <span>${log.admin_profiles?.email || 'N/A'}</span>
                        </div>
                        <div class="detail-row">
                            <label>Role:</label>
                            <span class="role-badge ${log.admin_profiles?.role?.includes('super') ? 'role-super-admin' : 'role-admin'}">
                                ${log.admin_profiles?.role || 'Unknown'}
                            </span>
                        </div>
                        <div class="detail-row">
                            <label>Action:</label>
                            <span class="action-badge action-${log.action?.toLowerCase() || 'unknown'}">${actionText}</span>
                        </div>
                        <div class="detail-row">
                            <label>Page:</label>
                            <span>${log.target_page || 'N/A'}</span>
                        </div>
                        <div class="detail-row">
                            <label>IP Address:</label>
                            <span>${log.ip_address || 'N/A'}</span>
                        </div>
                        <div class="detail-row">
                            <label>Event Details:</label>
                            <div style="flex: 1;">
                                <pre class="log-details-json">${formattedDetails}</pre>
                            </div>
                        </div>
                    </div>
                </div>
                <div class="modal-footer">
                    <button class="btn btn-secondary" onclick="this.closest('.modal-overlay').remove()">Close</button>
                </div>
            </div>
        `;

        document.body.appendChild(modal);

    } catch (error) {
        console.error('Error loading log details:', error);
        alert('Error loading log details');
    }
}

function updateLogsPagination(currentPage, totalPages, totalItems) {
    const paginationEl = document.getElementById('logsPagination');
    if (!paginationEl) return;

    let paginationHTML = `
        <div class="pagination-info">
            Showing page ${currentPage} of ${totalPages} (${totalItems} total logs)
        </div>
        <div class="pagination-controls">
    `;

    // Previous button
    if (currentPage > 1) {
        paginationHTML += `<button class="btn-small" onclick="loadLogs(${currentPage - 1})">Previous</button>`;
    }

    // Page numbers
    for (let i = 1; i <= totalPages; i++) {
        if (i === currentPage) {
            paginationHTML += `<button class="btn-small btn-primary" disabled>${i}</button>`;
        } else {
            paginationHTML += `<button class="btn-small" onclick="loadLogs(${i})">${i}</button>`;
        }
    }

    // Next button
    if (currentPage < totalPages) {
        paginationHTML += `<button class="btn-small" onclick="loadLogs(${currentPage + 1})">Next</button>`;
    }

    paginationHTML += `</div>`;
    paginationEl.innerHTML = paginationHTML;
}

function setupLogsFilters() {
    // Admin filter
    const adminFilter = document.getElementById('filterAdmin');
    if (adminFilter) {
        adminFilter.addEventListener('change', () => loadLogs(1));
    }

    // Page filter
    const pageFilter = document.getElementById('filterPage');
    if (pageFilter) {
        pageFilter.addEventListener('change', () => loadLogs(1));
    }

    // Action filter - Updated with new action types
    const actionFilter = document.getElementById('filterAction');
    if (actionFilter) {
        // Populate action filter with event-related actions
        const actions = [
            { value: '', text: 'All Actions' },
            { value: 'approve', text: 'Approves Event' },
            { value: 'reject', text: 'Rejects Event' },
            { value: 'reminder', text: 'Sends Reminder' },
            { value: 'create', text: 'Creates Event' },
            { value: 'update', text: 'Updates Event' },
            { value: 'delete', text: 'Deletes Event' },
            { value: 'login', text: 'Login' },
            { value: 'logout', text: 'Logout' }
        ];
        
        actionFilter.innerHTML = actions.map(action => 
            `<option value="${action.value}">${action.text}</option>`
        ).join('');
        
        actionFilter.addEventListener('change', () => loadLogs(1));
    }

    // Date filters
    const dateFrom = document.getElementById('filterDateFrom');
    const dateTo = document.getElementById('filterDateTo');
    
    if (dateFrom) {
        dateFrom.addEventListener('change', () => loadLogs(1));
    }
    if (dateTo) {
        dateTo.addEventListener('change', () => loadLogs(1));
    }

    // Reset filters
    const resetFilters = document.getElementById('resetFilters');
    if (resetFilters) {
        resetFilters.addEventListener('click', () => {
            document.getElementById('filterAdmin').value = '';
            document.getElementById('filterPage').value = '';
            document.getElementById('filterAction').value = '';
            document.getElementById('filterDateFrom').value = '';
            document.getElementById('filterDateTo').value = '';
            loadLogs(1);
        });
    }

    // Export logs
    const exportLogs = document.getElementById('exportLogs');
    if (exportLogs) {
        exportLogs.addEventListener('click', exportLogsToCSV);
    }
}

async function exportLogsToCSV() {
    try {
        const { data: logs, error } = await supabase
            .from('admin_logs')
            .select(`
                timestamp,
                action,
                target_page,
                ip_address,
                details,
                admin_profiles!fk_admin_logs_admin_profiles (
                    first_name,
                    last_name,
                    email,
                    role
                )
            `)
            .order('timestamp', { ascending: false });

        if (error) throw error;

        const csvHeaders = ['Timestamp', 'Admin Name', 'Admin Email', 'Role', 'Action', 'Page', 'IP Address', 'Event Details'];
        const csvRows = logs.map(log => [
            new Date(log.timestamp).toLocaleString(),
            log.admin_profiles ? `${log.admin_profiles.first_name} ${log.admin_profiles.last_name}` : 'Unknown',
            log.admin_profiles?.email || 'N/A',
            log.admin_profiles?.role || 'Unknown',
            formatActionText(log.action, log.details),
            log.target_page || 'N/A',
            log.ip_address || 'N/A',
            formatEventDetails(log.details)
        ]);

        const csvContent = [csvHeaders, ...csvRows]
            .map(row => row.map(field => `"${field}"`).join(','))
            .join('\n');

        const blob = new Blob([csvContent], { type: 'text/csv' });
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `admin-logs-${new Date().toISOString().split('T')[0]}.csv`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        window.URL.revokeObjectURL(url);

    } catch (error) {
        console.error('Error exporting logs:', error);
        alert('Error exporting logs');
    }
}

/**
 * Load administrators
 */
async function loadAdmins() {
    try {
        console.log("📊 Loading admins from Supabase...");
        
        const { data: admins, error } = await supabase
            .from('admin_profiles')
            .select('id, first_name, last_name, email, phone, role, status, created_at')
            .order('created_at', { ascending: false });

        if (error) throw error;

        console.log("✅ Admins loaded:", admins?.length);
        displayAdmins(admins || []);
        
    } catch (error) {
        console.error("Error loading admins:", error);
        const tbody = document.getElementById("adminsTableBody");
        if (tbody) {
            tbody.innerHTML = '<tr><td colspan="6" style="text-align: center; color: red;">Error loading admins</td></tr>';
        }
    }
}

/**
 * Display administrators in table
 */
function displayAdmins(admins) {
    const tbody = document.getElementById("adminsTableBody");
    
    if (!tbody) {
        console.error("adminsTableBody element not found!");
        return;
    }

    if (admins.length === 0) {
        tbody.innerHTML = '<tr><td colspan="6" style="text-align: center;">No administrators found</td></tr>';
        return;
    }

    console.log("Displaying admins:", admins.length);

    tbody.innerHTML = admins.map((admin) => {
        const isSuperAdmin = admin.role === "superadmin" || admin.role === "super_admin";
        const roleClass = isSuperAdmin ? "role-super-admin" : "role-admin";
        const roleDisplay = isSuperAdmin ? "Super Admin" : "Admin";
        
        const createdDate = new Date(admin.created_at).toLocaleDateString();
        const status = admin.status?.toLowerCase() || 'pending';
        
        return `
            <tr>
                <td>${admin.first_name} ${admin.last_name}</td>
                <td>${admin.email}</td>
                <td>${admin.phone || "N/A"}</td>
                <td><span class="role-badge ${roleClass}">${roleDisplay}</span></td>
                <td>${createdDate}</td>
                <td class="action-buttons">
                    ${status === 'pending'
                        ? `
                        <button class="btn-small btn-success" onclick="approveAdmin('${admin.id}', 'approve')">Approve</button>
                        <button class="btn-small btn-danger" onclick="approveAdmin('${admin.id}', 'reject')">Reject</button>
                        `
                        : `<span class="badge badge-${status === 'approved' ? 'success' : 'danger'}">${status}</span>`
                    }
                </td>
            </tr>
        `;
    }).join("");
}

/**
 * Approve or reject admin
 */
async function approveAdmin(adminId, decision) {
    try {
        console.log(`Approving admin ${adminId} with decision: ${decision}`);
        
        const status = decision === 'approve' ? 'approved' : 'rejected';
        
        const { data, error } = await supabase
            .from('admin_profiles')
            .update({ status: status })
            .eq('id', adminId);

        if (error) throw error;

        console.log(`✅ Admin ${adminId} ${status}`);
        
        // Show success message
        alert(`Admin ${status} successfully`);
        
        // Reload the list
        loadAdmins();
        
    } catch (error) {
        console.error('Error approving admin:', error);
        alert('Error updating admin status');
    }
}

/**
 * Load statistics
 */
async function loadStats() {
    try {
        // Get logs count
        const { count: totalLogs } = await supabase
            .from('admin_logs')
            .select('*', { count: 'exact', head: true });

        // Get active admins count
        const { data: activeAdmins } = await supabase
            .from('admin_logs')
            .select('admin_id')
            .not('admin_id', 'is', null);

        const uniqueAdmins = new Set(activeAdmins?.map(log => log.admin_id) || []);
        
        // Get today's actions
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        
        const { count: todayCount } = await supabase
            .from('admin_logs')
            .select('*', { count: 'exact', head: true })
            .gte('timestamp', today.toISOString());
        
        // Get most active page
        const { data: pageStats } = await supabase
            .from('admin_logs')
            .select('target_page');

        const pageCounts = {};
        pageStats?.forEach(log => {
            if (log.target_page) {
                pageCounts[log.target_page] = (pageCounts[log.target_page] || 0) + 1;
            }
        });
        
        const mostActivePage = Object.keys(pageCounts).length > 0
            ? Object.keys(pageCounts).reduce((a, b) => pageCounts[a] > pageCounts[b] ? a : b)
            : "-";

        // Update UI
        const totalLogsEl = document.getElementById("totalLogs");
        const activeAdminsEl = document.getElementById("activeAdmins");
        const todayActionsEl = document.getElementById("todayActions");
        const mostActivePageEl = document.getElementById("mostActivePage");
        
        if (totalLogsEl) totalLogsEl.textContent = totalLogs || 0;
        if (activeAdminsEl) activeAdminsEl.textContent = uniqueAdmins.size;
        if (todayActionsEl) todayActionsEl.textContent = todayCount || 0;
        if (mostActivePageEl) mostActivePageEl.textContent = mostActivePage;
        
    } catch (error) {
        console.error("Error loading stats:", error);
    }
}

/**
 * Setup logout functionality
 */
function setupLogout() {
    const logoutBtn = document.getElementById("logoutBtn");
    if (logoutBtn) {
        logoutBtn.addEventListener("click", async (e) => {
            e.preventDefault();
            if (confirm("Are you sure you want to logout?")) {
                try {
                    await supabase.auth.signOut();
                    localStorage.removeItem("token");
                    localStorage.removeItem("adminData");
                    window.location.href = "Auth/LoginPage.html";
                } catch (error) {
                    console.error("Logout error:", error);
                    // Force logout even if there's an error
                    localStorage.removeItem("token");
                    localStorage.removeItem("adminData");
                    window.location.href = "Auth/LoginPage.html";
                }
            }
        });
    }
}

/**
 * Setup tab navigation
 */
function setupTabs() {
    document.querySelectorAll(".menu-item[data-tab]").forEach((item) => {
        item.addEventListener("click", (e) => {
            e.preventDefault();
            const tabName = item.dataset.tab;

            // Update active menu item
            document.querySelectorAll(".menu-item").forEach((m) => m.classList.remove("active"));
            item.classList.add("active");

            // Show corresponding tab
            document.querySelectorAll(".tab-content").forEach((tab) => tab.classList.remove("active"));
            const targetTab = document.getElementById(`${tabName}Tab`);
            if (targetTab) {
                targetTab.classList.add("active");
            }

            // Update page title
            const titles = {
                logs: "Admin Task Logs",
                admins: "Manage Administrators",
                qr: "QR Code Generator",
                gallery: "Gallery Management",
            };
            
            const pageTitleEl = document.getElementById("pageTitle");
            if (pageTitleEl && titles[tabName]) {
                pageTitleEl.textContent = titles[tabName];
            }

            // Load data for specific tabs
            if (tabName === "logs") {
                loadLogs();
                setupLogsFilters(); // Setup filters when logs tab is opened
            }
            if (tabName === "admins") loadAdmins();

            // Hide statsGrid for certain tabs
            const statsGrid = document.getElementById("statsGrid");
            if (statsGrid) {
                const hideTabs = ["qr", "gallery"];
                statsGrid.style.display = hideTabs.includes(tabName) ? "none" : "grid";
            }
        });
    });
}

/**
 * Initialize Super Admin Dashboard
 */
async function initializeSuperAdmin() {
    console.log("🚀 Initializing Super Admin...");
    
    try {
        // Wait for Supabase to be ready
        supabase = await waitForSupabase();
        console.log("✅ Supabase client ready");
        
        // Check authentication
        const isAuthenticated = await checkAuth();
        if (!isAuthenticated) {
            console.log("❌ Authentication failed");
            return;
        }

        console.log("✅ Authentication successful, loading data...");
        
        // Load user info
        await loadUserInfo();
        
        // Load initial data
        await Promise.all([
            loadLogs(),
            loadStats()
        ]);
        
        // Setup UI interactions
        setupLogout();
        setupTabs();
        
        console.log("🎉 Super Admin initialized successfully!");
        
    } catch (error) {
        console.error("❌ Initialization failed:", error);
        window.location.href = "Auth/LoginPage.html";
    }
}

// Make functions globally accessible
window.approveAdmin = approveAdmin;
window.loadLogs = loadLogs;
window.viewLogDetails = viewLogDetails;
window.exportLogsToCSV = exportLogsToCSV;

// Initialize when DOM is ready
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initializeSuperAdmin);
} else {
    initializeSuperAdmin();
}