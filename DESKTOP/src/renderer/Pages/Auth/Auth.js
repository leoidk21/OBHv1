  const API_BASE = "http://localhost:3000/api";

  console.log("Auth.js is loaded!");

  document.addEventListener("DOMContentLoaded", () => {
    function showError(formId, message, focusId, type = "error") {
      const errorBox = document.querySelector(`#${formId} .errorBox`);
      if (!errorBox) return;

      // Set text
      errorBox.textContent = message;

      // Clean previous state, ensure base class
      errorBox.classList.remove("error", "success");
      errorBox.classList.add("errorBox");

      // Apply requested style
      if (type === "success") {
        errorBox.classList.add("success");
      } else {
        errorBox.classList.add("error");
      }

      // Show box
      errorBox.style.display = "block";

      // If success, auto-hide after 2s (optional)
      if (type === "success") {
        setTimeout(() => {
          errorBox.style.display = "none";
          errorBox.classList.remove("success");
        }, 2000);
      }

      // Focus back to a field if provided
      if (focusId) {
        const field = document.getElementById(focusId);
        if (field) field.focus();
      }
    }

    // SIGNUP FORM
    const signupForm = document.getElementById("signupForm");
    if (signupForm) {
      console.log("Signup form found");

      signupForm.addEventListener("submit", async (e) => {
        e.preventDefault();
        console.log("Signup form submitted");

        const payload = {
          firstName: document.getElementById("firstName")?.value.trim(),
          lastName: document.getElementById("lastName")?.value.trim(),
          email: document.getElementById("email")?.value.trim(),
          phone: document.getElementById("phone")?.value.trim(),
          password: document.getElementById("password")?.value,
        };

        console.log("Signup payload:", payload);

        try {
          const res = await fetch(`${API_BASE}/auth/signup`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(payload),
          });

          const data = await res.json();
          console.log("Signup response:", data);

          if (res.ok) {
            localStorage.setItem("token", data.token);
            localStorage.setItem("adminData", JSON.stringify(data.admin));
            // show success inline
            showError("signupForm", "Signup successful! Please login now.", null, "success");
            setTimeout(() => {
              window.location.href = "./LoginPage.html";
            }, 1200);
          } else {
            showError("signupForm", data.error || "Registration failed", "firstName");
          }
        } catch (error) {
          console.error("Signup network error:", error);
          showError("signupForm", "Network error. Please try again.");
        }
      });
    }

    // LOGIN FORM
    const loginForm = document.getElementById("loginForm");
    if (loginForm) {
      console.log("Login form found");

      loginForm.addEventListener("submit", async (e) => {
        e.preventDefault();
        console.log("Login form submitted");

        const payload = {
          email: document.getElementById("email")?.value.trim(),
          password: document.getElementById("password")?.value,
        };

        try {
          const res = await fetch(`${API_BASE}/auth/login`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(payload),
          });

          const data = await res.json();
          console.log("Login response:", data);

          if (res.ok) {
            localStorage.setItem("token", data.token);
            localStorage.setItem("adminData", JSON.stringify(data.admin));
            showError("loginForm", "Login successful!", null, "success");
            
            setTimeout(() => {
              if (data.admin.role === "super_admin") {
                window.location.href = "../../Pages/SuperAdmin.html";
              } else if (data.admin.role === "admin") {
                window.location.href = "../../Pages/LandingPage.html";
              } else {
                showError("loginForm", "Unauthorized role", null);
              }
            }, 1000);

          } else {
            showError("loginForm", data.error || "Login failed", "email");
          }
        } catch (error) {
            console.error("Login network error:", error);
            showError("loginForm", "Network error. Please try again.", "email");
        }
      });
    }

    // LOGOUT BUTTON (optional)
    const logoutBtn = document.getElementById("logoutBtn");
    if (logoutBtn) {
      logoutBtn.addEventListener("click", logout);
    }

    // ADMIN PROFILE PAGE
    if (isLandingPage()) {
      console.log("On Admin Account Page - Loading profile...");
      loadAdminProfile();
    }
  });

  // Helper: Check if on AdminAccountPage
  function isLandingPage() {
    return document.body.dataset.page === "LandingPage";
  }

  // Load admin profile
  function loadAdminProfile() {
    console.log("Loading admin profile...");

    const storedAdmin = localStorage.getItem("adminData");
    if (storedAdmin) {
      updateProfileElements(JSON.parse(storedAdmin));
    }

    const token = localStorage.getItem("token");
    if (!token) {
      return handleLogout("No token found. Please login.");
    }

    fetch(`${API_BASE}/admin/me`, {
      method: "GET",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
    })
      .then((res) => {
        if (res.status === 401) throw new Error("Unauthorized");
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        return res.json();
      })
      .then((data) => {
        updateProfileElements(data);
        localStorage.setItem("adminData", JSON.stringify(data));
      })
      .catch((err) => {
        console.error("Profile fetch failed:", err.message);
        handleLogout("Session expired. Please login again.");
      });
  }

  // Update profile UI
  function updateProfileElements(data) {
    const fullName = `${data.first_name} ${data.last_name}`;
    document.querySelectorAll("#profile-account-name")
      .forEach(el => el.textContent = fullName);

    document.querySelectorAll("#profile-email")
      .forEach(el => el.textContent = data.email);

    document.querySelectorAll("#profile-phone")
      .forEach(el => {
        if (data.phone) {
          let phone = data.phone.replace(/\D/g, ""); // strip non-digits
          if (phone.startsWith("0")) {
            phone = phone.substring(1); // drop leading 0
          }
          el.textContent = `+63 ${phone.replace(/(\d{3})(\d{3})(\d{4})/, "$1 $2 $3")}`;
        } else {
          el.textContent = "Not provided";
        }
    });

    const roleText = data.role.replace("_", " ").toUpperCase();
    document.querySelectorAll("#profile-role", ".role-text")
      .forEach(el => el.textContent = roleText);

    console.log("UI updated successfully!");
  }

  // Logout
  function handleLogout(message) {
    localStorage.removeItem("token");
    localStorage.removeItem("adminData");

    // Show inline error if login form exists
    if (document.getElementById("loginForm")) {
      showError("loginForm", message, null, "error");
    } else {
      alert(message);
    }

    window.location.href = "Auth/LoginPage.html";
  }