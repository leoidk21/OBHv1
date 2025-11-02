if (typeof window.API_BASE === "undefined") {
  window.API_BASE = "http://localhost:3000/api";

  window.fetchApprovedEvents = async function(endpoint) {
    try {
      const token = localStorage.getItem("token");
      const response = await fetch(`${API_BASE}/event-plans/approved/${endpoint}`, {
        headers: { Authorization: `bearer ${token}` }
      });
      if (!response.ok) throw new Error(`Failed to load ${endpoint}`);
      return await response.json();
    } catch (error) {
      console.error(`Failed to load ${endpoint}: ${error.message}`);
      throw error;
    }
  };

  window.checkAuth = function() {
    const token = localStorage.getItem("token");
    if (!token) {
      window.location.href = "Auth/LoginPage.html";
      return false;
    }
    return true;
  };
}
