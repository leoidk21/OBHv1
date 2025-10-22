console.log("GuestPage.js is loaded!");

class GuestController {
    constructor() {
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
        
        const colors = {
            error: 'red',
            success: 'green', 
            warning: 'orange',
            info: 'blue'
        };
        
        console.log(`%c${message}`, `color: ${colors[type] || 'black'}; font-weight: bold;`);
    }

    async loadEventsForDropdown() {
        try {
            console.log("Loading events for dropdown...");
            const data = await fetchApprovedEvents('guests');
            this.events = data.events || [];
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
        const budgetContent = document.querySelector('.guest-content');
        if (budgetContent) {
            // Small delay to ensure DOM is fully updated
            setTimeout(() => {
                budgetContent.classList.add('ready');
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
            const token = await this.getToken();
            
            if (!token) {
                console.error('No token found');
                this.showNotification('Please login first', 'error');
                return;
            }

            const apiUrl = `${API_BASE}/event-plans/approved/events/guests/${eventId}`;
            console.log("API URL:", apiUrl);
            console.log("Token length:", token.length);
            
            const response = await fetch(apiUrl, {
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                }
            });
            
            console.log("Response status:", response.status);
            console.log("Response ok:", response.ok);
            
            if (!response.ok) {
                const errorText = await response.text();
                throw new Error(`HTTP ${response.status}: ${errorText}`);
            }
            
            const data = await response.json();
            this.guests = data.guests || [];
            console.log(`Loaded ${this.guests.length} guests`);
            
            this.displayGuests();
            this.updateGuestStats();
            
        } catch (error) {
            console.error("Failed to load guests:", error);
            this.showNotification("Failed to load guest list", "error");
        }
    }

    displayGuests() {
        const guestsTbody = document.querySelector('.table tbody');
        if (!guestsTbody) {
            console.error("Guest table not found");
            return;
        }

        if (this.guests.length === 0) {
            guestsTbody.innerHTML = '<tr><td colspan="2" class="no-data">No guests found</td></tr>';
            return;
        }

        guestsTbody.innerHTML = this.guests.map(guest => {
            const status = this.getGuestStatus(guest.status);
            return `
                <tr>
                    <td>${guest.guest_name}</td>
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
                <tr><td colspan="2" class="no-data">No guests found</td></tr>
            `;
            return;
        }

        guestsTbody.innerHTML = filtered.map(guest => {
            const status = this.getGuestStatus(guest.status);
            return `
                <tr>
                    <td>${guest.guest_name}</td>
                    <td><span class="status ${status.class}">${status.text}</span></td>
                </tr>
            `;
        }).join('');
    }

    getGuestStatus(status) {
        if (status === 'Confirmed' || status === 'Accepted') {
            return { class: 'guest-status-going', text: 'Going' };
        } else if (status === 'Declined') {
            return { class: 'guest-status-declined', text: 'Declined' };
        }
        return { class: 'guest-status-pending', text: 'Pending' };
    }

    updateGuestStats() {
        if (!this.guests || this.guests.length === 0) {
            ['going', 'pending', 'declined'].forEach(type => {
                const element = document.querySelector(`.card.${type} h2`);
                if (element) element.textContent = '0';
            });
            const header = document.querySelector('.guest-content h1');
            if (header) header.textContent = '0 number of guests';
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

        document.querySelector('.card.going h2').textContent = goingCount;
        document.querySelector('.card.pending h2').textContent = pendingCount;
        document.querySelector('.card.declined h2').textContent = declinedCount;
        document.querySelector('.guest-content h1').textContent = 
            `${this.guests.length} number of guests`;
    }
}

// Initialize controller
const guestController = new GuestController();

function initGuestPage() {
    console.log("Initializing Budget Page...");
    
    if (window.guestController) {
        window.guestController = null;
    }
    
    // Create new instance
    window.guestController = new GuestController();
}

// Initialize immediately if script is loaded standalone
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initGuestPage);
} else {
    initGuestPage();
}