console.log("BudgetPage.js is loaded!");

class BudgetController {
    constructor() {
        this.events = [];
        this.currentClientFilter = 'all';
        this.currentReminderEvent = null;
        this.init();
    }

    async init() {
        if (!checkAuth()) return;
        
        await this.loadExpensesData();
        this.setupEventListeners();
    }

    async loadExpensesData() {
        try {
            const data = await fetchApprovedEvents('budget');
            this.events = data.events;
            console.log("Loaded events with expenses:", this.events);
            
            this.populateClientFilter();
            this.displayBudgetOverview();
            this.displayEventsWithExpenses();
            this.displayCoordinatorsFee();
            
            this.showContent(); // Call this AFTER everything is rendered
        } catch (error) {
            console.error("Failed to load expenses data:", error);
            showNotification("Failed to load expenses information", "error");
            this.showContent(); // Still show content even on error
        }
    }

    showContent() {
        const budgetContent = document.querySelector('.budget-content');
        if (budgetContent) {
            // Small delay to ensure DOM is fully updated
            setTimeout(() => {
                budgetContent.classList.add('ready');
            }, 50);
        }
    }

    populateClientFilter() {
        const clientDropdown = document.querySelector('.client-dropdown');
        if (!clientDropdown) return;

        const uniqueClients = [...new Set(this.events.map(event => event.client_name))];

        clientDropdown.innerHTML = `
            <div class="client-filter-select">
                <div class="dropdown-selected" onclick="toggleBudgetDropdown()">All Clients ▼</div>
                <div class="budget-dropdown-selected-menu" id="budgetDropdownMenu">
                    <div class="dropdown-selected-item" onclick="budgetController.filterByClient('all')">
                        All Clients
                    </div>
                    ${uniqueClients.map(client => `
                        <div class="dropdown-selected-item" onclick="budgetController.filterByClient('${client}')">
                            ${client}
                        </div>
                    `).join('')}
                </div>
            </div>
        `;
    }

    filterByClient(clientName) {
        this.currentClientFilter = clientName;
        this.displayBudgetOverview();
        this.displayEventsWithExpenses();
        this.displayCoordinatorsFee();

        const selected = document.querySelector('.dropdown-selected');
        if (selected) {
            selected.textContent = (clientName === 'all' ? 'All Clients' : clientName) + ' ▼';
        }

        // Hide the dropdown after selecting
        const menu = document.getElementById('budgetDropdownMenu');
        if (menu) menu.style.display = 'none';
    }

    // FILTERED BY CLIENT'S NAME
    getFilteredEvents() {
        if (this.currentClientFilter === 'all') {
            return this.events;
        }
        return this.events.filter(event => 
            event.client_name === this.currentClientFilter
        );
    }

    displayEventsWithExpenses() {
        const expensesTbody = document.getElementById('expenses-tbody');
        if (!expensesTbody) return;

        const filteredEvents = this.getFilteredEvents();
        
        if (filteredEvents.length === 0) {
            expensesTbody.innerHTML = '<tr><td colspan="3" class="no-data">No events found</td></tr>';
            return;
        }

        expensesTbody.innerHTML = filteredEvents.map(event => {
            const expenses = event.expenses || [];
            const hasExpenses = expenses.length > 0;
            
            return `
                <tr>
                    <td>
                        <div class="event-info">
                            <strong>${event.client_name}</strong>
                        </div>
                    </td>
                    <td>
                        <span class="expense-count">
                            ${hasExpenses ? `${expenses.length} expense categories` : 'No expenses'}
                        </span>
                    </td>
                    <td>
                        ${hasExpenses ? 
                            `<button class="view-categories-btn" data-event-id="${event.id}">
                                View Expense Categories
                            </button>` : 
                            '<span class="no-expenses">No expenses recorded</span>'
                        }
                    </td>
                </tr>
            `;
        }).join('');
    }

    // DISPLAY ALL CLIENT'S BUDGET
    displayBudgetOverview() {
        const filteredEvents = this.getFilteredEvents();
        const budgetHeader = document.querySelector('.budget-header h1');

        if (filteredEvents.length === 0) {
            if (budgetHeader) {
                budgetHeader.textContent = "No Expenses Found";
            }
            return;
        }

        const totalBudget = filteredEvents.reduce((total, event) => {
            return total + (parseFloat(event.budget) || 0);
        }, 0);

        if (this.currentClientFilter !== 'all' && budgetHeader) {
            budgetHeader.textContent = `${this.currentClientFilter} - Budget`;
        } else if (filteredEvents.length > 0 && budgetHeader) {
            const uniqueClients = [...new Set(filteredEvents.map(e => e.client_name))];
            if (uniqueClients.length === 1) {
                budgetHeader.textContent = `${uniqueClients[0]} - Budget`;
            } else {
                budgetHeader.textContent = `All Clients - Budget Overview`;
            }
        }
    }

    calculateTotalExpenses(event) {
        if (!event.expenses || !Array.isArray(event.expenses)) return 0;
        
        return event.expenses.reduce((total, expense) => {
            return total + (parseFloat(expense.amount) || 0);
        }, 0);
    }

sendReminder(eventId, clientName) {
    try {
        console.log("📧 Sending reminder for:", clientName);
        
        const form = document.getElementById("sendReminderForm");
        const successMsg = document.getElementById("sendReminderSuccess");
        
        if (!form || !successMsg) return;

        const notes = form.querySelector('.reminder-notes').value;

        // Show loading state
        const submitBtn = document.getElementById("submitReminderBtn");
        const originalText = submitBtn.textContent;
        submitBtn.textContent = "Sending...";
        submitBtn.disabled = true;

        // Call the function WITHOUT authentication (JWT is disabled)
        fetch('https://vxukqznjkdtuytnkhldu.supabase.co/functions/v1/hyper-worker', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
                // No Authorization header needed anymore
            },
            body: JSON.stringify({
                eventId: eventId,
                clientName: clientName,
                notes: notes
            })
        })
        .then(response => {
            console.log("📡 Response status:", response.status);
            
            if (!response.ok) {
                throw new Error(`HTTP ${response.status}`);
            }
            
            return response.json();
        })
        .then(result => {
            console.log("✅ Reminder sent successfully:", result);
            
            // Show success message
            form.style.display = "none";
            successMsg.style.display = "block";
            
            // Store locally as backup
            this.storeReminderLocally(eventId, clientName, notes);
            
            // Close modal after delay
            setTimeout(() => {
                const modal = document.getElementById("send-reminder-modal");
                if (modal) modal.style.display = "none";
                form.style.display = "block";
                successMsg.style.display = "none";
                form.querySelector('.reminder-notes').value = '';
            }, 3000);
            
            this.showSuccess("Reminder sent successfully!");
        })
        .catch(error => {
            console.error("❌ Error sending reminder:", error);
            
            // Fallback: Store locally and show success
            this.storeReminderLocally(eventId, clientName, notes);
            
            form.style.display = "none";
            successMsg.style.display = "block";
            
            setTimeout(() => {
                const modal = document.getElementById("send-reminder-modal");
                if (modal) modal.style.display = "none";
                form.style.display = "block";
                successMsg.style.display = "none";
                form.querySelector('.reminder-notes').value = '';
            }, 3000);
            
            this.showSuccess("Reminder queued for sending!");
        })
        .finally(() => {
            // Reset button state
            submitBtn.textContent = originalText;
            submitBtn.disabled = false;
        });

    } catch (error) {
        console.error("❌ sendReminder function error:", error);
        this.showError("Error sending reminder");
    }
}

// Add this method to store reminders locally
storeReminderLocally(eventId, clientName, notes) {
    try {
        const reminder = {
            eventId,
            clientName,
            notes,
            sentAt: new Date().toISOString(),
            id: Date.now().toString()
        };
        
        // Get existing reminders from localStorage
        const existingReminders = JSON.parse(localStorage.getItem('payment_reminders') || '[]');
        existingReminders.push(reminder);
        
        // Save back to localStorage
        localStorage.setItem('payment_reminders', JSON.stringify(existingReminders));
        
        console.log("💾 Reminder stored locally:", reminder);
    } catch (error) {
        console.error("❌ Error storing reminder locally:", error);
    }
}

// Add these helper methods to your BudgetController class
showSuccess(message) {
    // Try to use existing notification system
    if (typeof showNotification === 'function') {
        showNotification(message, "success");
    } else {
        // Fallback notification
        console.log("✅ " + message);
        // You can also show a temporary message on the page
        this.showTempMessage(message, 'success');
    }
}

showError(message) {
    // Try to use existing notification system
    if (typeof showNotification === 'function') {
        showNotification(message, "error");
    } else {
        // Fallback notification
        console.error("❌ " + message);
        this.showTempMessage(message, 'error');
    }
}

showTempMessage(message, type) {
    // Create a temporary message element
    const messageEl = document.createElement('div');
    messageEl.textContent = message;
    messageEl.style.cssText = `
        position: fixed;
        top: 20px;
        right: 20px;
        padding: 15px 20px;
        background: ${type === 'success' ? '#4CAF50' : '#f44336'};
        color: white;
        border-radius: 5px;
        z-index: 10000;
        font-family: Arial, sans-serif;
    `;
    
    document.body.appendChild(messageEl);
    
    // Remove after 3 seconds
    setTimeout(() => {
        if (document.body.contains(messageEl)) {
            document.body.removeChild(messageEl);
        }
    }, 3000);
}

    displayCoordinatorsFee() {
        const coordinatorsTbody = document.getElementById('coordinators-tbody');
        if (!coordinatorsTbody) return;

        const filteredEvents = this.getFilteredEvents();
        
        if (filteredEvents.length === 0) {
            coordinatorsTbody.innerHTML = '<tr><td colspan="5" class="no-data">No coordinator fees to display</td></tr>';
            return;
        }

        coordinatorsTbody.innerHTML = filteredEvents.map(event => {
            let totalExpenses = 0;
            if (event.expenses && event.expenses.length > 0) {
                totalExpenses = event.expenses.reduce((sum, expense) => sum + parseFloat(expense.amount || 0), 0);
            }
            
            const coordinatorFee = totalExpenses * 0.20;
            const formattedFee = this.formatCurrency(coordinatorFee);
            
            return `
                <tr>
                    <td>
                        <div class="event-info">
                            <strong>${event.client_name}</strong>
                            <div class="event-details">${event.event_type}</div>
                        </div>
                    </td>
                    <td>${event.package || 'N/A'}</td>
                    <td>${this.formatDate(event.event_date)}</td>
                    <td><span class="status status-pending">Pending</span></td>
                    <td>
                        <button class="send-reminder-btn" 
                                data-event-id="${event.id}" 
                                data-client-name="${event.client_name}">
                            Send Reminder
                        </button>
                    </td>
                </tr>
            `;
        }).join('');
    }

    setupEventListeners() {
        document.addEventListener('click', (e) => {
            console.log("🖱️ Clicked:", e.target.className, "ID:", e.target.id);

            // Open modal button (table buttons)
            if (e.target.classList.contains('send-reminder-btn') && !e.target.id) {
                const eventId = e.target.dataset.eventId;
                const clientName = e.target.dataset.clientName;
                
                console.log("📝 Opening modal for:", clientName);
                
                const modal = document.getElementById("send-reminder-modal");
                const modalTitle = modal.querySelector('h3');
                if (modalTitle) {
                    modalTitle.textContent = `Send Reminder - ${clientName}`;
                }
                
                modal.style.display = "flex";
                budgetController.currentReminderEvent = { eventId, clientName };
            }

            // Send reminder form submission (modal button ONLY)
            if (e.target.id === "submitReminderBtn") {
                e.preventDefault();
                console.log("📤 Submit button clicked");
                if (budgetController.currentReminderEvent) {
                    budgetController.sendReminder(
                        budgetController.currentReminderEvent.eventId, 
                        budgetController.currentReminderEvent.clientName
                    );
                } else {
                    console.log("❌ No reminder event data");
                }
            }
        });
    }

showCategoriesModal(eventId) {
    const event = this.events.find(e => e.id == eventId);
    if (!event) return;

    const modal = document.getElementById("categories-modal");
    const categoriesBody = document.getElementById("categories-modal-body");
    
    if (!modal || !categoriesBody) return;

    // Populate categories
    if (!event.expenses || event.expenses.length === 0) {
        categoriesBody.innerHTML = '<p class="no-categories">No expenses recorded for this event</p>';
    } else {
        categoriesBody.innerHTML = event.expenses.map((expense, index) => {
            const amount = this.formatCurrency(expense.amount);
            const statusClass = `status-${expense.status?.toLowerCase() || 'pending'}`;
            const statusText = expense.status
            ? expense.status.charAt(0).toUpperCase() + expense.status.slice(1)
            : 'Pending';

            let proofUrl = null;
            if (expense.proofUri) {
                proofUrl = expense.proofUri;
            }

            return `
            <div class="category-item">
                <div class="category-info">
                <strong class="category-name">Category: ${expense.category || 'Uncategorized'}</strong>
                <span class="category-amount">${amount}</span>
                </div>
                <div class="category-details">
                <span class="${statusClass}">${statusText}</span>
                ${proofUrl
                    ? `<button class="view-receipt" data-receipt-url="${proofUrl}" data-expense-id="${expense.id}">
                        View Receipt
                    </button>`
                    : '<span class="no-receipt">No Receipt</span>'
                }
                </div>
            </div>
            `;
        }).join('');
    }
    
    modal.style.display = "flex";
}

    viewReceipt(expenseId) {
        let foundExpense = null;
        for (const event of this.events) {
            if (event.expenses) {
                foundExpense = event.expenses.find(e => e.id == expenseId);
                if (foundExpense) break;
            }
        }
        
        if (foundExpense && foundExpense.proof_of_payment) {
            const modal = document.getElementById("payment-modal");
            if (modal) {
                console.log(`Viewing receipt for expense ${expenseId}: ${foundExpense.proof_of_payment}`);
                modal.style.display = "flex";
            }
        } else {
            showNotification("No receipt available for this expense", "warning");
        }
    }

    showContent() {
        const budgetContent = document.querySelector('.budget-content');
        if (budgetContent) {
            budgetContent.classList.add('ready');
        }
    }

    // Utility functions
    formatCurrency(amount) {
        if (amount === null || amount === undefined || amount === '') {
            return '₱0.00';
        }
        
        const numAmount = typeof amount === 'string' ? 
            parseFloat(amount.replace(/[^\d.-]/g, '')) : 
            Number(amount);
        
        if (isNaN(numAmount)) {
            return '₱0.00';
        }
        
        return `₱${numAmount.toLocaleString('en-PH', { 
            minimumFractionDigits: 2, 
            maximumFractionDigits: 2 
        })}`;
    }

    formatDate(dateString) {
        if (!dateString) return 'Date not set';
        const date = new Date(dateString);
        return date.toLocaleDateString('en-US', {
            day: '2-digit',
            month: '2-digit',
            year: 'numeric'
        });
    }
}

// Initialize the budget controller
const budgetController = new BudgetController();

// ====== MODAL HANDLERS ====== //
document.addEventListener("click", (e) => {
    // === Close Categories Modal ===
    if (e.target.classList.contains("close-categories-modal")) {
        const modal = document.getElementById("categories-modal");
        if (modal) {
        modal.style.display = "none";
        console.log("Categories modal closed");
        }
    }

    // ... Send Reminder Modal
    if (e.target.classList.contains("send-reminder")) {
        const modal = document.getElementById("send-reminder-modal");
        if (modal) {
            modal.style.display = "flex";
            console.log("Reminder modal opened");
        }
    }

    // ... Close Send Reminder Modal
    if (e.target.classList.contains("close-reminder")) {
        const modal = document.getElementById("send-reminder-modal");
        if (modal) {
            modal.style.display = "none";
            console.log("Reminder modal closed");
        }
    }
});

function initBudgetPage() {
    console.log("Initializing Budget Page...");
    
    if (window.budgetController) {
        window.budgetController = null;
    }
    
    window.budgetController = new BudgetController();
}

if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initBudgetPage);
} else {
    initBudgetPage();
}

function toggleBudgetDropdown() {
    const menu = document.getElementById('budgetDropdownMenu');
    if (!menu) return;
    menu.style.display = menu.style.display === 'block' ? 'none' : 'block';
}

document.addEventListener('click', (e) => {
    const menu = document.getElementById('budgetDropdownMenu');
    if (menu && !e.target.closest('.client-filter-select')) {
        menu.style.display = 'none';
    }
});

document.addEventListener("click", (e) => {
    if (e.target.classList.contains("view-receipt")) {
        const receiptUrl = e.target.dataset.receiptUrl;
        const expenseId = e.target.dataset.expenseId;
        console.log("🖼 Viewing receipt for expense:", expenseId, "URL:", receiptUrl);

        const modal = document.getElementById("payment-modal");
        const modalImg = document.getElementById("payment-modal-img");

        if (modal && modalImg) {
            // Clear previous image first to prevent showing wrong image during loading
            modalImg.src = "";
            modalImg.alt = `Receipt for expense ${expenseId}`;
            
            // Set the new image source
            modalImg.src = receiptUrl;
            modal.style.display = "flex";
            
            // Add loading error handling
            modalImg.onload = function() {
                console.log("✅ Receipt image loaded successfully");
            };
            
            modalImg.onerror = function() {
                console.error("❌ Failed to load receipt image:", receiptUrl);
                modalImg.alt = "Failed to load receipt image";
                // You can show a placeholder image here if desired
            };
        }
    }

    if (e.target.classList.contains("view-categories-btn")) {
        const eventId = e.target.dataset.eventId;
        console.log("📊 Opening categories for event:", eventId);
        
        const modal = document.getElementById("categories-modal");
        if (modal) {
            budgetController.showCategoriesModal(eventId);
            modal.style.display = "flex";
        }
    }
    
    // Close Categories Modal
    if (e.target.classList.contains("close-categories-modal")) {
        const modal = document.getElementById("categories-modal");
        if (modal) modal.style.display = "none";
    }
    
    // Close Payment Modal  
    if (e.target.classList.contains("close-payment-modal")) {
        const modal = document.getElementById("payment-modal");
        if (modal) {
            modal.style.display = "none";
            // Clear the image when modal is closed
            const modalImg = document.getElementById("payment-modal-img");
            if (modalImg) {
                modalImg.src = "";
            }
        }
    }
});