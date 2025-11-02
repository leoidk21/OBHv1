console.log("GuestPage.js is loaded!");

class GuestController {
    constructor() {
        this.API_BASE = "https://vxukqznjkdtuytnkhldu.supabase.co/rest/v1";
        this.SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZ4dWtxem5qa2R0dXl0bmtobGR1Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2MTI0NDE4MCwiZXhwIjoyMDc2ODIwMTgwfQ.7hCf7BDqlVuNkzP1CcbORilAzMqOHhexP4Y7bsTPRJA";
        this.events = [];
        this.guests = [];
        this.selectedEventId = null;
        window.guestController = this;
        this.loadEventsForDropdown();
    }

    async getToken() {
        const token = localStorage.getItem('token') || 
                      sessionStorage.getItem('token');
        
        console.log("🔍 Token found:", token ? "YES" : "NO");
        return token;
    }

    showNotification(message, type = 'info') {
        console.log(`📢 ${type.toUpperCase()}: ${message}`);
        
        // Also show visual notification
        const notification = document.createElement('div');
        notification.className = `notification notification-${type}`;
        notification.textContent = message;
        notification.style.cssText = `
            position: fixed;
            top: 20px;
            right: 20px;
            padding: 15px 20px;
            background: ${type === 'error' ? '#f44336' : type === 'success' ? '#4CAF50' : '#2196F3'};
            color: white;
            border-radius: 4px;
            box-shadow: 0 2px 5px rgba(0,0,0,0.2);
            z-index: 10000;
            animation: slideIn 0.3s ease-out;
        `;

        document.body.appendChild(notification);

        setTimeout(() => {
            notification.style.animation = 'slideOut 0.3s ease-out';
            setTimeout(() => notification.remove(), 300);
        }, 3000);
    }

    async loadEventsForDropdown() {
        try {
            console.log("Loading events for dropdown...");
            
            // Use Supabase directly to get approved events
            const response = await fetch(`${this.API_BASE}/event_plans?status=eq.Approved&select=id,client_name,event_type`, {
                headers: {
                    'apikey': this.SUPABASE_ANON_KEY,
                    'Authorization': `Bearer ${this.SUPABASE_ANON_KEY}`,
                    'Content-Type': 'application/json'
                }
            });

            if (!response.ok) {
                throw new Error(`HTTP ${response.status}: ${await response.text()}`);
            }

            this.events = await response.json();
            console.log("Loaded events:", this.events);
            this.displayEventSelector();
            
            if (this.events.length > 0) {
                this.selectEvent(this.events[0].id);
            }

            this.showContent();
        } catch (error) {
            console.error("Failed to load events:", error);
            this.showNotification("Failed to load events", "error");
            this.showContent();
        }
    }

    showContent() {
        const guestContent = document.querySelector('.guest-content');
        if (guestContent) {
            setTimeout(() => {
                guestContent.classList.add('ready');
            }, 50);
        }
    }

    displayEventSelector() {
        const dropdownContainer = document.querySelector('.top-bar');
        if (!dropdownContainer || this.events.length === 0) return;

        dropdownContainer.innerHTML = '';
        
        const dropdown = document.createElement('div');
        dropdown.className = 'client-list-dropdown';
        dropdown.innerHTML = `
            <button class="dropdown-button">
                Select Client Event ▼
            </button>
            <div class="dropdown-menu">
                ${this.events.map(event => `
                    <div class="dropdown-item" data-event-id="${event.id}">
                        ${event.client_name} - ${event.event_type}
                    </div>
                `).join('')}
            </div>
        `;

        dropdownContainer.appendChild(dropdown);
        
        const dropdownButton = dropdown.querySelector('.dropdown-button');
        const dropdownMenu = dropdown.querySelector('.dropdown-menu');
        
        dropdownButton.addEventListener('click', (e) => {
            e.stopPropagation();
            dropdownMenu.style.display = dropdownMenu.style.display === 'block' ? 'none' : 'block';
        });

        dropdown.querySelectorAll('.dropdown-item').forEach(item => {
            item.addEventListener('click', (e) => {
                e.stopPropagation();
                const eventId = e.target.dataset.eventId;
                this.selectEvent(eventId);
                dropdownMenu.style.display = 'none';
            });
        });

        document.addEventListener('click', () => {
            dropdownMenu.style.display = 'none';
        });
    }

    async selectEvent(eventId) {
        this.selectedEventId = eventId;
        const selectedEvent = this.events.find(e => e.id == eventId);
        
        if (selectedEvent) {
            const dropdownButton = document.querySelector('.dropdown-button');
            if (dropdownButton) {
                dropdownButton.textContent = `${selectedEvent.client_name} ▼`;
            }

            await this.loadEventGuests(eventId);
        }
    }

    async loadEventGuests(eventId) {
        try {
            console.log(`Loading guests for event ${eventId}...`);
            
            // Use your actual table structure - note the column name is event_plan_id, not event_id
            const response = await fetch(`${this.API_BASE}/event_guests?event_plan_id=eq.${eventId}&select=*`, {
                headers: {
                    'apikey': this.SUPABASE_ANON_KEY,
                    'Authorization': `Bearer ${this.SUPABASE_ANON_KEY}`,
                    'Content-Type': 'application/json'
                }
            });

            if (!response.ok) {
                throw new Error(`HTTP ${response.status}: ${await response.text()}`);
            }
            
            const data = await response.json();
            this.guests = data || [];
            console.log(`Loaded ${this.guests.length} guests for event ${eventId}:`, this.guests);
            
            this.displayGuests();
            this.updateGuestStats();
            
        } catch (error) {
            console.error("Failed to load guests:", error);
            this.showNotification("Failed to load guest list: " + error.message, "error");
            
            // Show empty state
            this.guests = [];
            this.displayGuests();
            this.updateGuestStats();
        }
    }

    displayGuests() {
        const guestsTbody = document.querySelector('.table tbody');
        if (!guestsTbody) {
            console.error("Guest table not found");
            return;
        }

        if (this.guests.length === 0) {
            guestsTbody.innerHTML = '<tr><td colspan="2" class="no-data">No guests found for this event</td></tr>';
            return;
        }

        guestsTbody.innerHTML = this.guests.map(guest => {
            const status = this.getGuestStatus(guest.status);
            const respondedInfo = guest.responded_at ? 
                `<br><small>Responded: ${this.formatDate(guest.responded_at)}</small>` : '';
            
            return `
                <tr>
                    <td>
                        ${this.escapeHtml(guest.guest_name || 'Unnamed Guest')}
                        ${guest.mobile_guest ? `<br><small>${this.escapeHtml(guest.mobile_guest)}</small>` : ''}
                        ${respondedInfo}
                    </td>
                    <td><span class="status ${status.class}">${status.text}</span></td>
                </tr>
            `;
        }).join('');
    }

    searchGuests(query) {
        const searchTerm = query.toLowerCase().trim();

        const filtered = this.guests.filter(guest =>
            guest.guest_name && guest.guest_name.toLowerCase().includes(searchTerm)
        );

        const guestsTbody = document.querySelector('.table tbody');
        if (!guestsTbody) return;

        if (filtered.length === 0) {
            guestsTbody.innerHTML = `
                <tr><td colspan="2" class="no-data">No guests found matching "${query}"</td></tr>
            `;
            return;
        }

        guestsTbody.innerHTML = filtered.map(guest => {
            const status = this.getGuestStatus(guest.status);
            const respondedInfo = guest.responded_at ? 
                `<br><small>Responded: ${this.formatDate(guest.responded_at)}</small>` : '';
            
            return `
                <tr>
                    <td>
                        ${this.escapeHtml(guest.guest_name || 'Unnamed Guest')}
                        ${guest.mobile_guest ? `<br><small>${this.escapeHtml(guest.mobile_guest)}</small>` : ''}
                        ${respondedInfo}
                    </td>
                    <td><span class="status ${status.class}">${status.text}</span></td>
                </tr>
            `;
        }).join('');
    }

    getGuestStatus(status) {
        const statusMap = {
            'Confirmed': { class: 'guest-status-going', text: 'Going' },
            'Accepted': { class: 'guest-status-going', text: 'Going' },
            'Declined': { class: 'guest-status-declined', text: 'Declined' },
            'Pending': { class: 'guest-status-pending', text: 'Pending' }
        };
        
        return statusMap[status] || { class: 'guest-status-pending', text: 'Pending' };
    }

    updateGuestStats() {
        if (!this.guests || this.guests.length === 0) {
            ['going', 'pending', 'declined'].forEach(type => {
                const element = document.querySelector(`.card.${type} h2`);
                if (element) element.textContent = '0';
            });
            const header = document.querySelector('.guest-content h1');
            if (header) header.textContent = '0 Guests';
            return;
        }

        const goingCount = this.guests.filter(g => 
            g.status === 'Confirmed' || g.status === 'Accepted'
        ).length;
        
        const pendingCount = this.guests.filter(g => 
            !g.status || g.status === 'Pending'
        ).length;
        
        const declinedCount = this.guests.filter(g => 
            g.status === 'Declined'
        ).length;

        const goingElement = document.querySelector('.card.going h2');
        const pendingElement = document.querySelector('.card.pending h2');
        const declinedElement = document.querySelector('.card.declined h2');
        const headerElement = document.querySelector('.guest-content h1');

        if (goingElement) goingElement.textContent = goingCount;
        if (pendingElement) pendingElement.textContent = pendingCount;
        if (declinedElement) declinedElement.textContent = declinedCount;
        if (headerElement) headerElement.textContent = `${this.guests.length} Guests`;
    }

    formatDate(dateString) {
        if (!dateString) return '';
        const date = new Date(dateString);
        return date.toLocaleDateString('en-US', {
            year: 'numeric',
            month: 'short',
            day: 'numeric'
        });
    }

    escapeHtml(text) {
        if (!text) return "";
        const div = document.createElement("div");
        div.textContent = text;
        return div.innerHTML;
    }
}

// Initialize controller
const guestController = new GuestController();

function initGuestPage() {
    console.log("Initializing Guest Page...");
    
    if (window.guestController) {
        window.guestController = null;
    }
    
    // Create new instance
    window.guestController = new GuestController();
}

// Add search functionality
document.addEventListener('DOMContentLoaded', function() {
    const searchInput = document.querySelector('.search-bar input');
    if (searchInput) {
        searchInput.addEventListener('input', function(e) {
            if (window.guestController) {
                window.guestController.searchGuests(e.target.value);
            }
        });
    }
});

// Initialize immediately if script is loaded standalone
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initGuestPage);
} else {
    initGuestPage();
}