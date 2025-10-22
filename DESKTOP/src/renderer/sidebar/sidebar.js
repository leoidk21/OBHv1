// Add this to your Sidebar.html or include in each page's script
// This dynamically shows/hides menu items based on role
console.log("Sidebar.js is loaded!");

async function initializeSidebar() {
  const token = localStorage.getItem('token');
  
  if (!token) {
    window.location.href = 'Auth/LoginPage.html';
    return;
  }

  try {
    // Fetch current user info
    const response = await fetch('http://localhost:3000/api/admin/me', {
      headers: {
        'Authorization': `Bearer ${token}`
      }
    });

    if (!response.ok) {
      throw new Error('Unauthorized');
    }

    const user = await response.json();
    
    // Update user info in sidebar
    document.getElementById('userName').textContent = `${user.first_name} ${user.last_name}`;
    document.getElementById('userEmail').textContent = user.email;

    // Show/hide menu items based on role
    if (user.role === 'super_admin') {
      // Super Admin sees all menu items
      showSuperAdminMenu();
    } else {
      // Regular admin sees limited menu
      showAdminMenu();
    }

  } catch (error) {
    console.error('Error initializing sidebar:', error);
    localStorage.removeItem('token');
    window.location.href = 'Auth/LoginPage.html';
  }
}

function showSuperAdminMenu() {
  // Add super admin specific menu items if they don't exist
  const menu = document.querySelector('.menu');
  
  // Check if super admin link already exists
  if (!document.getElementById('superAdminLink')) {
    const superAdminLink = document.createElement('a');
    superAdminLink.href = 'SuperAdmin.html';
    superAdminLink.className = 'menu-item';
    superAdminLink.id = 'superAdminLink';
    superAdminLink.innerHTML = '<span class="icon">⚡</span> Super Admin';
    
    // Insert after the first menu item (usually Dashboard)
    const firstMenuItem = menu.querySelector('.menu-item');
    firstMenuItem.parentNode.insertBefore(superAdminLink, firstMenuItem.nextSibling);
  }

  // Ensure all menu items are visible
  document.querySelectorAll('.menu-item').forEach(item => {
    item.style.display = 'flex';
  });
}

function showAdminMenu() {
  // Hide super admin specific items
  const superAdminLink = document.getElementById('superAdminLink');
  if (superAdminLink) {
    superAdminLink.style.display = 'none';
  }

  // Regular admins can see: Dashboard, Events, Schedule, Guests, Budget, Account, Clients
  // But NOT: Gallery, Notification, QR Code (these are super admin only based on your requirements)
  
  const restrictedPages = ['Gallery', 'Notification', 'QR Code'];
  
  document.querySelectorAll('.menu-item').forEach(item => {
    const itemText = item.textContent.trim();
    if (restrictedPages.some(page => itemText.includes(page))) {
      item.style.display = 'none';
    }
  });
}

// Initialize sidebar when DOM is loaded
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initializeSidebar);
} else {
  initializeSidebar();
}

// Logout functionality
document.getElementById('logoutBtn')?.addEventListener('click', (e) => {
  e.preventDefault();
  if (confirm('Are you sure you want to logout?')) {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    window.location.href = 'Auth/LoginPage.html';
  }
});