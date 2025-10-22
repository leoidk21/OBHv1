console.log("ClientController.js is loaded!");

class ClientController {
    constructor() {
        this.clients = [];
        window.clientsController = this;
        this.loadClients();
    }

    async loadClients() {
        try {
            const data = await fetchApprovedEvents('clients');
            this.clients = data.events || [];
            this.displayClients();
            this.showContent();
        } catch (error) {
            showNotification("Failed to load clients", "error");
            this.showContent();
        }
    }

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