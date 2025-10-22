// LANDING PAGE CONTROLLER
if (window.__LandingPageModuleInstance) {
    console.log("LandingPageModule already loaded – reusing existing instance");
    window.LandingPageModule = window.__LandingPageModuleInstance;
} else {
    window.LandingPageModule = (function () {
        const API_BASE = "http://localhost:3000/api";
        let allEvents = [];
        let dashboardStats = null;
        let currentEventId = null;
        let isInitialized = false;

        // ============================================
        // AUTHENTICATION
        // ============================================
        function isAuthenticated() {
            const token = localStorage.getItem("token");
            return token !== null && token !== "";
        }

        function getAuthToken() {
            return localStorage.getItem("token");
        }

        // ============================================
        // INIT FUNCTION
        // ============================================
        function init() {
            // Check if we're on the right page
            const isLandingPage = document.body.getAttribute("data-page") === "LandingPage";
            
            if (!isLandingPage) {
                // Reset initialization state when not on landing page
                if (isInitialized) {
                    return;
                }
            }

            const landingContent = document.querySelector('.landing-content');
            if (landingContent) {
                landingContent.style.opacity = '0';
                landingContent.classList.remove('ready');
            }

            // If already initialized, just refresh the UI
            if (isInitialized) {
                refreshUI();
                showContent(); 
                return;
            }

            // Check authentication
            if (!isAuthenticated()) {
                console.warn("Not authenticated");
                return;
            }

            // Load data and setup UI
            loadCachedData();
            loadEvents();
            loadDashboardStats();
            isInitialized = true;
        }

        function showContent() {
            const landingContent = document.querySelector('.landing-content'); // Use your actual class name
            if (landingContent) {
                // Small delay to ensure DOM is fully updated
                setTimeout(() => {
                    landingContent.classList.add('ready');
                }, 50);
            }
        }

        function normalizeDate(d) {
            const dt = new Date(d);
            dt.setHours(0,0,0,0);
            return dt;
        }

        function refreshUI() {
            displayUpcomingEvents();
            displayPastEvents();
            updateDashboardCards(dashboardStats);
        }

        // ============================================
        // LOAD CACHED DATA
        // ============================================
        function loadCachedData() {
            let hasCachedData = false;

            // Try restore from Electron memory store first
            const storedEvents = window.store?.get("events");
            if (storedEvents && storedEvents.length > 0) {
                allEvents = storedEvents;
                hasCachedData = true;
            } else {
                // Fallback to localStorage
                const cachedEvents = localStorage.getItem("cachedEvents");
                if (cachedEvents) {
                    try {
                        allEvents = JSON.parse(cachedEvents);
                        hasCachedData = true;
                    } catch (error) {
                        console.error("Error parsing cached events:", error);
                    }
                }
            }

            const cachedStats = localStorage.getItem("cachedDashboardStats");
            if (cachedStats) {
                try {
                    dashboardStats = JSON.parse(cachedStats);
                    hasCachedData = true;
                } catch (error) {
                    console.error("Error parsing cached stats:", error);
                }
            }

            if (hasCachedData) {
                refreshUI();
                showContent(); 
            }

            return hasCachedData;
        }

        // ============================================
        // COMPUTE DASHBOARD STATS LOCALLY
        // ============================================
        function computeDashboardStatsLocally() {
            if (!Array.isArray(allEvents)) return {
                total_events: 0,
                pending_count: 0,
                approved_count: 0,
                completed_count: 0,
                upcoming_count: 0,
            };

            // Normalize today to midnight
            const today = new Date();
            today.setHours(0, 0, 0, 0);

            const total = allEvents.length;
            const pending = allEvents.filter(e => e.status === "Pending").length;
            const approved = allEvents.filter(e => e.status === "Approved").length;
            const completed = allEvents.filter(e => e.status === "Completed").length;

            // Upcoming = pending + approved with event_date >= today
            const upcoming = allEvents.filter(e => {
                const eventDate = new Date(e.event_date);
                eventDate.setHours(0, 0, 0, 0);
                return eventDate >= today && ["Pending", "Approved"].includes(e.status);
            }).length;

            return {
                total_events: total,
                pending_count: pending,
                approved_count: approved,
                completed_count: completed,
                upcoming_count: upcoming,
            };
        }

        // ============================================
        // IMPROVED FETCH ALL EVENTS
        // ============================================
        async function loadEvents(forceRefresh = false) {
            // Don't refetch if we already have events and not forcing refresh
            if (allEvents.length > 0 && !forceRefresh) {
                console.log("Using cached events, skipping API call");
                showContent();
                return;
            }

            try {
                const token = getAuthToken();
                if (!token) {
                    throw new Error("No authentication token found");
                }

                console.log("📡 Fetching events from API...");
                const response = await fetch(`${API_BASE}/admin/event-plans`, {
                    method: "GET",
                    headers: {
                        Authorization: `Bearer ${token}`,
                        "Content-Type": "application/json",
                        Accept: "application/json",
                    },
                });

                if (!response.ok) {
                    throw new Error(`HTTP ${response.status}: ${response.statusText}`);
                }

                const data = await response.json();

                if (!data.success) {
                    throw new Error(data.error || "Failed to fetch events");
                }

                allEvents = data.event_plans || [];

                // Save to localStorage for persistence
                localStorage.setItem("cachedEvents", JSON.stringify(allEvents));

                // Save to Electron memory store
                if (window.store) {
                    window.store.set("events", allEvents);
                }

                // Update UI
                refreshUI();
                await loadDashboardStats();

                showContent();

                console.log(`✅ Loaded ${allEvents.length} events from API`);
            } catch (error) {
                console.error("Error loading events:", error);
                showNotification("Failed to load events: " + error.message, "error");
                showContent();
            }
        }

        // ============================================
        // LOAD DASHBOARD STATS
        // ============================================
        async function loadDashboardStats(forceRefresh = false) {
            if (dashboardStats && !forceRefresh) {
                updateDashboardCards(dashboardStats);
                return;
            }

            try {
                const token = getAuthToken();
                const response = await fetch(
                    `${API_BASE}/admin/event-plans/stats/summary`,
                    {
                        headers: {
                            Authorization: `Bearer ${token}`,
                            "Content-Type": "application/json",
                        },
                    },
                );

                if (!response.ok) {
                    throw new Error("Failed to fetch statistics");
                }

                const data = await response.json();

                if (data.success && data.stats) {
                    dashboardStats = data.stats;
                } else {
                    dashboardStats = computeDashboardStatsLocally(); // fallback
                }
            } catch (error) {
                console.error("Error loading stats:", error);
            }

            localStorage.setItem("cachedDashboardStats", JSON.stringify(dashboardStats));
            updateDashboardCards(dashboardStats);
        }

        // ============================================
        // UPDATE DASHBOARD CARDS - FIXED
        // ============================================
        function updateDashboardCards(stats) {
            if (!stats) {
                console.warn("No stats provided to updateDashboardCards");
                return;
            }

            // Update total events
            const totalEventsEl = document.getElementById("total-events-count");
            if (totalEventsEl) {
                totalEventsEl.textContent = stats.total_events || 0;
            }

            // Update upcoming events
            const upcomingEventsEl = document.getElementById("upcoming-events-count");
            if (upcomingEventsEl) {
                upcomingEventsEl.textContent = stats.upcoming_count || 0;
            }

            // Update approved count
            const approvedEl = document.getElementById("approved-events-count");
            if (approvedEl) {
                approvedEl.textContent = stats.approved_count || 0;
            }

            // Update pending count
            const pendingEl = document.getElementById("pending-events-count");
            if (pendingEl) {
                pendingEl.textContent = stats.pending_count || 0;
            }
        }

        // ============================================
        // DISPLAY UPCOMING EVENTS - USING IDS
        // ============================================
        function displayUpcomingEvents() {
            const today = normalizeDate(new Date());

            const upcomingEvents = allEvents.filter((event) => {
                const eventDate = normalizeDate(event.event_date);
                return (event.status === "Pending" || event.status === "Approved") && eventDate >= today;
            });

            const tbody = document.getElementById("upcoming-events-tbody");
            if (!tbody) {
                console.error("Upcoming events table body not found");
                return;
            }

            if (upcomingEvents.length === 0) {
                tbody.innerHTML = `
                <tr>
                    <td colspan="5" style="text-align: center; padding: 2rem;">No upcoming events</td>
                </tr>`;
                return;
            }

            tbody.innerHTML = upcomingEvents.map(event => `
                <tr data-event-id="${event.id}">
                <td>${escapeHtml(event.client_name || "N/A")}</td>
                <td>${escapeHtml(event.event_type || "N/A")}</td>
                <td>${formatDate(event.event_date)}</td>
                <td><span class="status status-${event.status.toLowerCase()}">${event.status}</span></td>
                <td><button class="view-btn" onclick="LandingPageModule.viewEvent(${event.id})">View</button></td>
                </tr>
            `).join("");

            console.log(` Displayed ${upcomingEvents.length} upcoming events`);
        }

        // ============================================
        // DISPLAY PAST EVENTS (Auto-Complete old ones)
        // ============================================
        async function displayPastEvents() {
            const today = normalizeDate(new Date());

            // find events that are past-date and not yet Completed
            const outdated = allEvents.filter(event => {
                const eventDate = normalizeDate(event.event_date);
                return eventDate < today && (event.status === "Pending" || event.status === "Approved");
            });

            if (outdated.length > 0) {
                console.log(`Found ${outdated.length} outdated events — marking Completed...`);

                // Option A: update server in parallel
                const promises = outdated.map(ev => markEventAsCompleted(ev.id));
                const results = await Promise.all(promises);

                // Update local statuses for those that succeeded
                for (let i = 0; i < outdated.length; i++) {
                if (results[i]) {
                    const id = outdated[i].id;
                    const local = allEvents.find(e => e.id === id);
                    if (local) local.status = "Completed";
                } else {
                    // if server failed, we keep the local status unchanged
                }
                }

                // persist cache
                localStorage.setItem("cachedEvents", JSON.stringify(allEvents));
                if (window.store) window.store.set("events", allEvents);

                // refresh stats after server sync
                await loadDashboardStats(true);
            }

            // Now render all completed events
            const pastEvents = allEvents.filter(event => event.status === "Completed");

            const tbody = document.getElementById("past-events-tbody");
            if (!tbody) return;

            if (pastEvents.length === 0) {
                tbody.innerHTML = `
                <tr>
                    <td colspan="5" style="text-align: center; padding: 2rem;">No past events</td>
                </tr>`;
                return;
            }

            tbody.innerHTML = pastEvents.map(event => `
                <tr data-event-id="${event.id}">
                <td>${escapeHtml(event.client_name || "N/A")}</td>
                <td>${escapeHtml(event.event_type || "N/A")}</td>
                <td>${formatDate(event.event_date)}</td>
                <td><span class="status status-${event.status.toLowerCase()}">${event.status}</span></td>
                <td><button class="view-btn" onclick="LandingPageModule.viewEvent(${event.id})">View</button></td>
                </tr>
            `).join("");
        }
        
        // ============================================
        // MARK EVENT AS COMPLETED (PUT request)
        // ============================================
        async function markEventAsCompleted(eventId) {
            try {
            const token = getAuthToken();
            const response = await fetch(`${API_BASE}/admin/event-plans/review/${eventId}`, {
                method: "PUT",
                headers: {
                    Authorization: `Bearer ${token}`,
                    "Content-Type": "application/json",
                },
                body: JSON.stringify({
                    status: "Completed",
                    remarks: "Automatically marked as completed after event date"
                }),
            });

            if (!response.ok) {
                const text = await response.text().catch(()=>null);
                throw new Error(`HTTP ${response.status} ${text || ''}`);
            }

            console.log("Marking outdated:", outdated.map(e => e.client_name));

            const data = await response.json();
                if (data.success) {
                console.log(`Event ${eventId} marked as Completed (server)`);
                return true;
            } else {
                console.warn(`Server rejected completing event ${eventId}:`, data);
                return false;
            }
            } catch (err) {
                console.error("Error marking event completed:", err);
                return false;
            }
        }

        // ============================================
        // VIEW EVENT DETAILS
        // ============================================
        async function viewEvent(eventId) {
            try {
                console.log("Viewing event:", eventId);
                currentEventId = eventId;

                const token = getAuthToken();
                const response = await fetch(
                    `${API_BASE}/admin/event-plans/${eventId}`,
                    {
                        headers: {
                            Authorization: `Bearer ${token}`,
                            "Content-Type": "application/json",
                            Accept: "application/json",
                        },
                    },
                );

                if (!response.ok) {
                    throw new Error("Failed to fetch event details");
                }

                const data = await response.json();

                if (data.success && data.event) {
                    displayEventModal(data.event);
                }
            } catch (error) {
                console.error("Error viewing event:", error);
                showNotification("Failed to load event details", "error");
            }
        }

        // ============================================
        // DISPLAY EVENT IN MODAL
        // ============================================
        function displayEventModal(event) {
            const modal = document.getElementById("event-modal");
            const modalBody = modal.querySelector(".modal-body");

            if (!modalBody) return;

            // Parse event segments if it's a JSON string
            let segments = [];
            if (typeof event.event_segments === "string") {
                try {
                    segments = JSON.parse(event.event_segments);
                } catch (e) {
                    console.error("Failed to parse event segments:", e);
                }
            } else if (Array.isArray(event.event_segments)) {
                segments = event.event_segments;
            }

            modalBody.innerHTML = `
        <div class="event-details">
            <div class="detail-row">
                <strong>Client Name:</strong>
                <span>${escapeHtml(event.client_name)}</span>
            </div>
            <div class="detail-row">
                <strong>Partner Name:</strong>
                <span>${escapeHtml(event.partner_name || "N/A")}</span>
            </div>
            <div class="detail-row">
                <strong>Event Type:</strong>
                <span>${escapeHtml(event.event_type)}</span>
            </div>
            <div class="detail-row">
                <strong>Package:</strong>
                <span>${escapeHtml(event.package || "N/A")}</span>
            </div>
            <div class="detail-row">
                <strong>Event Date:</strong>
                <span>${formatDate(event.event_date)}</span>
            </div>
            <div class="detail-row">
                <strong>Guest Range:</strong>
                <span>${event.guest_count || 0} Pax</span>
            </div>
            
            <div class="detail-row">
                <strong>Submitted By:</strong>
                <span>${escapeHtml(event.user_name || "Unknown")} (${escapeHtml(event.user_email || "")})</span>
            </div>
            ${
                event.remarks
                    ? `

                <div class="detail-row last-row">
                    <strong>Remarks:</strong>
                    <span>${escapeHtml(event.remarks)}</span>
                    <span class="status status-${event.status.completed ? "completed" : event.status.toLowerCase()}">${event.status}</span>
                </div>
            `
                    : ""
            }
            
        </div>
    `;
            // <div class="detail-row status-row">
            //     <strong>Status:</strong>
            //     <span class="status status-${event.status.completed ? "completed" : event.status.toLowerCase()}">${event.status}</span>
            // </div>
            // <div class="detail-row">
            //     <strong>Budget:</strong>
            //     <span>₱${formatNumber(event.budget || 0)}</span>
            // </div>

            // Show/hide approve/reject buttons based on status
            const approveBtn = modal.querySelector(".approve");
            const rejectBtn = modal.querySelector(".reject");

            if (event.status === "Pending") {
                approveBtn.style.display = "inline-block";
                rejectBtn.style.display = "inline-block";
            } else {
                approveBtn.style.display = "none";
                rejectBtn.style.display = "none";
            }

            // Show modal
            modal.style.display = "flex";
        }

        // ============================================                     
        // APPROVE EVENT
        // ============================================
        async function approveEvent() {
            if (!currentEventId) return;

            try {
                const token = getAuthToken();
                const response = await fetch(
                    `${API_BASE}/admin/event-plans/review/${currentEventId}`,
                    {
                        method: "PUT",
                        headers: {
                            Authorization: `Bearer ${token}`,
                            "Content-Type": "application/json",
                            Accept: "application/json",
                        },
                        body: JSON.stringify({
                            status: "Approved",
                            remarks: "Approved by admin",
                        }),
                    },
                );

                if (!response.ok) {
                    throw new Error("Failed to approve event");
                }

                const data = await response.json();

                if (data.success) {
                    showNotification("Event approved successfully", "success");
                    
                    // Log the action for super admin monitoring
                    await logAdminAction('APPROVE_EVENT', 'Events', {
                        eventId: currentEventId,
                        action: 'approved',
                        remarks: "Approved by admin",
                        timestamp: new Date().toISOString()
                    });
                    
                    closeModal();
                    await loadEvents(true);
                    await loadDashboardStats(true);
                }
            } catch (error) {
                console.error("Error approving event:", error);
                showNotification("Failed to approve event", "error");
            }
        }

        // ============================================
        // REJECT EVENT
        // ============================================
        async function rejectEvent() {
            if (!currentEventId) return;

            try {
                const token = getAuthToken();
                const response = await fetch(
                    `${API_BASE}/admin/event-plans/review/${currentEventId}`,
                    {
                        method: "PUT",
                        headers: {
                            Authorization: `Bearer ${token}`,
                            "Content-Type": "application/json",
                            Accept: "application/json",
                        },
                        body: JSON.stringify({
                            status: "Rejected",
                            remarks: "Rejected by admin",
                        }),
                    },
                );

                if (!response.ok) {
                    throw new Error("Failed to reject event");
                }

                const data = await response.json();

                if (data.success) {
                    showNotification("Event rejected", "success");
                    
                    // Log the action for super admin monitoring
                    await logAdminAction('REJECT_EVENT', 'Events', {
                        eventId: currentEventId,
                        action: 'rejected',
                        remarks: "Rejected by admin",
                        timestamp: new Date().toISOString()
                    });
                    
                    closeModal();
                    loadEvents(true);
                    loadDashboardStats(true);
                }
            } catch (error) {
                console.error("Error rejecting event:", error);
                showNotification("Failed to reject event", "error");
            }
        }

        // ============================================
        // DELETE EVENT
        // ============================================
        async function deleteEvent(eventId) {
            try {
                const token = getAuthToken();
                if (!token) {
                    showNotification("You must be logged in", "error");
                    return;
                }

                const confirmDelete = confirm("Are you sure you want to delete this event?");
                if (!confirmDelete) return;

                const response = await fetch(`${API_BASE}/event-plans/${eventId}`, {
                    method: "DELETE",
                    headers: { 
                        Authorization: `Bearer ${token}`, 
                        "Content-Type": "application/json"
                    },
                });

                const data = await response.json();

                if (!response.ok) {
                    console.error("Failed to delete event:", data);
                    showNotification("Failed to delete event", "error");
                    return;
                }

                showNotification("Event deleted successfully", "success");

                // Force-refresh dashboard & events
                await loadEvents(true);
                await loadDashboardStats(true);
            } catch (error) {
                console.error("Error deleting event:", error);
                showNotification("Error deleting event", "error");
            }
        }

        // ============================================
        // REFRESH DATA
        // ============================================
        function refreshData() {
            loadEvents(true);
            loadDashboardStats(true);
        }

        // Helper function to log admin actions
        async function logAdminAction(action, targetPage, details = {}) {
            try {
                const token = getAuthToken();
                await fetch(`${API_BASE}/admin/log-action`, {
                    method: "POST",
                    headers: {
                        Authorization: `Bearer ${token}`,
                        "Content-Type": "application/json",
                    },
                    body: JSON.stringify({
                        action: action,
                        target_page: targetPage,
                        details: details
                    }),
                });
            } catch (error) {
                console.error("Failed to log action:", error);
            }
        }

        // ============================================
        // CLOSE MODAL
        // ============================================
        function closeModal() {
            const modal = document.getElementById("event-modal");
            if (modal) {
                modal.style.display = "none";
            }
        }

        // ============================================
        // UTILITY FUNCTIONS
        // ============================================
        function formatDate(dateString) {
            if (!dateString) return "N/A";
            const date = new Date(dateString);
            const options = { year: "numeric", month: "long", day: "numeric" };
            return date.toLocaleDateString("en-US", options);
        }
        
        function formatNumber(num) {
            return num.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ",");
        }

        function escapeHtml(text) {
            if (!text) return "";
            const div = document.createElement("div");
            div.textContent = text;
            return div.innerHTML;
        }

        function showNotification(message, type = "info") {
            const notification = document.createElement("div");
            notification.className = `notification notification-${type}`;
            notification.textContent = message;

            notification.style.cssText = `
                position: fixed;
                top: 20px;
                right: 20px;
                padding: 15px 20px;
                background: ${type === "error" ? "#f44336" : type === "success" ? "#4CAF50" : "#2196F3"};
                color: white;
                border-radius: 4px;
                box-shadow: 0 2px 5px rgba(0,0,0,0.2);
                z-index: 10000;
                animation: slideIn 0.3s ease-out;
            `;

            document.body.appendChild(notification);

            setTimeout(() => {
                notification.style.animation = "slideOut 0.3s ease-out";
                setTimeout(() => notification.remove(), 300);
            }, 3000);
        }

        // ============================================
        // PUBLIC API
        // ============================================
        return {
            init,
            viewEvent,
            approveEvent,
            rejectEvent,
            deleteEvent,
            loadEvents,
            closeModal,
            refreshUI,
            refreshData,
            loadDashboardStats,
            hasData: () => allEvents.length > 0,
            getEventCount: () => allEvents.length
        };
    })();

    window.__LandingPageModuleInstance = window.LandingPageModule;
}


// ============================================
// AUTO-INITIALIZATION
// ============================================

(function initializeLandingPage() {
    if (window.__LandingPageAutoInit) return;
    window.__LandingPageAutoInit = true;

    const observer = new MutationObserver((mutations) => {
        mutations.forEach((mutation) => {
            if (mutation.type === 'attributes' && mutation.attributeName === 'data-page') {
                const currentPage = document.body.getAttribute('data-page');
                if (currentPage === 'LandingPage' && window.LandingPageModule) {
                    console.log('🎯 Landing Page detected - refreshing events');
                    
                    // ADD THIS: Hide content during refresh
                    const landingContent = document.querySelector('.landing-content');
                    if (landingContent) {
                        landingContent.style.opacity = '0';
                        landingContent.classList.remove('ready');
                    }
                    
                    setTimeout(() => {
                        window.LandingPageModule.loadEvents(true);
                        window.LandingPageModule.loadDashboardStats(true);
                    }, 300);
                }
            }
        });
    });

    observer.observe(document.body, {
        attributes: true,
        attributeFilter: ['data-page']
    });

    const isLandingPage = document.body.getAttribute("data-page") === "LandingPage";
    if (isLandingPage && window.LandingPageModule) {
        
        // ADD THIS: Hide content initially
        const landingContent = document.querySelector('.landing-content');
        if (landingContent) {
            landingContent.style.opacity = '0';
            landingContent.classList.remove('ready');
        }
        
        if (document.readyState === "loading") {
            document.addEventListener("DOMContentLoaded", () => {
                window.LandingPageModule.init();
            });
        } else {
            window.LandingPageModule.init();
        }
    }
})();