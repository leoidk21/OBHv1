class ClientController {
    constructor() {
        this.API_BASE = "https://vxukqznjkdtuytnkhldu.supabase.co/rest/v1";
        this.SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZ4dWtxem5qa2R0dXl0bmtobGR1Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2MTI0NDE4MCwiZXhwIjoyMDc2ODIwMTgwfQ.7hCf7BDqlVuNkzP1CcbORilAzMqOHhexP4Y7bsTPRJA";
        this.clients = [];
        window.clientsController = this;
        this.loadClients();
    }

    async loadClients() {
        try {
            // Use direct Supabase call
            const response = await fetch(`${this.API_BASE}/event_plans?status=eq.Approved&select=*`, {
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
            this.clients = data || [];
            this.displayClients();
            this.showContent();
        } catch (error) {
            console.error("Failed to load clients:", error);
            showNotification("Failed to load clients", "error");
            this.showContent();
        }
    }

    // ... all other ClientController methods remain the same
    showContent() {
        const clientsContent = document.querySelector('.clients-content');
        if (clientsContent) {
            setTimeout(() => {
                clientsContent.classList.add('ready');
            }, 50);
        }
    }

    displayClients() {
        const clientsTbody = document.getElementById('clients-tbody');
        if (!clientsTbody) return;

        clientsTbody.innerHTML = this.clients.map(client => `
            <tr>
                <td>${client.client_name}</td>
                <td>${client.client_email || 'Not provided'}</td>
                <td>${client.event_type}</td>
                <td>${this.formatDate(client.submitted_at)}</td>
            </tr>
        `).join('');
    }

    // FIXED search method
    searchClients(query) {
        const searchTerm = query.toLowerCase().trim();

        // Filter clients by name
        const filtered = this.clients.filter(client =>
            client.client_name && client.client_name.toLowerCase().includes(searchTerm)
        );

        const clientsTbody = document.getElementById('clients-tbody');
        if (!clientsTbody) return;

        if (filtered.length === 0) {
            clientsTbody.innerHTML = `
                <tr><td colspan="5" class="no-data">No clients found</td></tr>
            `;
            return;
        }

        clientsTbody.innerHTML = filtered.map(client => `
            <tr>
                <td>${client.client_name}</td>
                <td>${client.client_email || 'Not provided'}</td>
                <td>${client.client_phone || 'Not provided'}</td>
                <td>${client.event_type}</td>
                <td>${this.formatDate(client.submitted_at)}</td>
            </tr>
        `).join('');
    }

    formatDate(dateString) {
        if (!dateString) return 'Date not set';
        const date = new Date(dateString);
        return date.toLocaleDateString('en-US', {
            year: 'numeric',
            month: 'short',
            day: 'numeric'
        });
    }
}

const clientsController = new ClientController();

function initClientPage() {
    console.log("Initializing Client Page...");
    
    if (window.clientsController) {
        window.clientsController = null;
    }

    window.clientsController = new ClientController();
}

if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initClientPage);
} else {
    initClientPage();
}