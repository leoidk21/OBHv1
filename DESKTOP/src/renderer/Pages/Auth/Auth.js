function getSupabaseClient() {
  // 1️⃣ Try preload-exposed client via electronAPI
  if (window.electronAPI?.supabase) {
    console.log("✅ Supabase client loaded via electronAPI");
    return window.electronAPI.supabase;
  }

  // 2️⃣ Try direct global client (from HTML)
  if (window.supabase && typeof window.supabase.auth?.signInWithPassword === "function") {
    console.log("✅ Supabase client loaded via direct exposure");
    return window.supabase;
  }

  // 3️⃣ Create one using preload config if possible
  if (window.supabaseConfig?.isConfigured && window.supabase?.createClient) {
    console.log("✅ Creating Supabase client from preload config...");
    const { createClient } = window.supabase;
    const client = createClient(window.supabaseConfig.url, window.supabaseConfig.anonKey);
    window.supabase = client; // make globally available
    return client;
  }

  console.error("❌ Supabase client not found — preload may not have exposed it.");
  alert("Error: Supabase not available. Please restart the app.");
  return null;
}

// ✅ Always initialize using this unified function
const supabase = getSupabaseClient();

if (!supabase) {
  throw new Error("Supabase client initialization failed");
}

// ============================================
// DOM READY EVENT
// ============================================
document.addEventListener("DOMContentLoaded", () => {
  const supabase = window.supabase;
  
  function showError(formId, message, focusId, type = "error") {
    const errorBox = document.querySelector(`#${formId} .errorBox`);
    if (!errorBox) {
      console.error("ErrorBox not found for form:", formId);
      alert(message);
      return;
    }

    errorBox.textContent = message;
    errorBox.classList.remove("error", "success");
    errorBox.classList.add("errorBox");

    if (type === "success") {
      errorBox.classList.add("success");
    } else {
      errorBox.classList.add("error");
    }

    errorBox.style.display = "block";

    if (type === "success") {
      setTimeout(() => {
        errorBox.style.display = "none";
        errorBox.classList.remove("success");
      }, 2000);
    }

    if (focusId) {
      const field = document.getElementById(focusId);
      if (field) field.focus();
    }
  }

  // ============================================
  // SIGNUP FORM
  // ============================================
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

      if (payload.password.length < 8) {
        showError("signupForm", "Password must be at least 8 characters long", "password");
        return;
      }

      try {
        // Step 1: Create user in Supabase Auth
        const { data: authData, error: authError } = await supabase.auth.signUp({
          email: payload.email,
          password: payload.password,
        });

        console.log("Signup response:", { authData, authError });

        if (authError) {
          console.error("Auth signup error:", authError);
          showError("signupForm", authError.message, "firstName");
          return;
        }

        if (!authData.user) {
          showError("signupForm", "Signup failed. Please try again.", "firstName");
          return;
        }

        console.log("Auth user created:", authData.user.id);

        // Step 2: Insert into admin_profiles as "pending"
        const { error: profileError } = await supabase
          .from("admin_profiles")
          .insert([
            {
              id: authData.user.id,
              first_name: payload.firstName,
              last_name: payload.lastName,
              phone: payload.phone,
              email: payload.email,
              role: "admin",
              status: "pending",
              created_at: new Date().toISOString(),
            },
          ]);

        if (profileError) {
          console.error("Profile creation error:", profileError);
          showError("signupForm", "Registration failed. Please contact support.", "firstName");
          return;
        }

        showError("signupForm", "✅ Registration successful! Please wait for super admin approval.", null, "success");

        setTimeout(() => {
          window.location.href = "./LoginPage.html";
        }, 3000);
      } catch (error) {
        console.error("Signup error:", error);
        showError("signupForm", "Network error: " + error.message, "firstName");
      }
    });
  }

  // ============================================
  // LOGIN FORM
  // ============================================
  const loginForm = document.getElementById("loginForm");
    if (loginForm) {
      console.log("Login form found");

      loginForm.addEventListener("submit", async (e) => {
        e.preventDefault();
        console.log("Login form submitted");

        const email = document.getElementById("email")?.value.trim();
        const password = document.getElementById("password")?.value;

        if (!email || !password) {
          showError("loginForm", "Please enter both email and password", "email");
          return;
        }

        try {
          // Step 1: Sign in with Supabase Auth
          const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
            email,
            password,
          });

          if (authError) {
            console.error("Sign in error:", authError);
            showError("loginForm", "Invalid email or password", "email");
            return;
          }

          const { user, session } = authData;
          if (!user) {
            showError("loginForm", "Login failed. Please try again.", "email");
            return;
          }

          console.log("✅ User authenticated:", user.id);

          // Step 2: Fetch admin profile
          const { data: profile, error: profileError } = await supabase
            .from("admin_profiles")
            .select("*")
            .eq("id", user.id)
            .single();

          if (profileError) {
            console.error("Profile query error:", profileError);
            await supabase.auth.signOut();
            showError("loginForm", "Admin profile not found. Please contact support.", "email");
            return;
          }

          console.log("🧾 Profile fetched:", profile);

          // Step 3: Check approval status (skip for superadmin)
          if (profile.role !== "superadmin" && profile.status !== "approved") {
            alert("Your admin account is still pending approval from the Super Admin.");
            await supabase.auth.signOut();
            return;
          }

          // Step 4: Store user info
          localStorage.setItem("token", session.access_token);
          localStorage.setItem("adminData", JSON.stringify(profile));

          showError("loginForm", "Login successful!", null, "success");

          // Step 5: Redirect based on role
          setTimeout(() => {
            if (profile.role === "superadmin") {
              window.location.href = "../../Pages/SuperAdmin.html";
            } else if (profile.role === "admin") {
              window.location.href = "../../Pages/LandingPage.html";
            } else {
              showError("loginForm", "Unauthorized role", null);
            }
          }, 1500);
        } catch (error) {
          console.error("Login error:", error);
          showError("loginForm", "Network error: " + error.message, "email");
        }
      });
  }

  // ============================================
  // LOGOUT
  // ============================================
  async function logout() {
    console.log("Logging out...");
    await supabase.auth.signOut();
    localStorage.removeItem("token");
    localStorage.removeItem("adminData");
    window.location.href = "Auth/LoginPage.html";
  }

  const logoutBtn = document.getElementById("logoutBtn");
  if (logoutBtn) {
    logoutBtn.addEventListener("click", logout);
  }

  // Load profile if on landing page
  if (typeof isLandingPage === 'function' && isLandingPage()) {
    console.log("On Admin Account Page - Loading profile...");
    if (typeof loadAdminProfile === 'function') {
      loadAdminProfile();
    }
  }
});

// ============================================
// SIMPLIFIED HELPER FUNCTIONS
// ============================================
function isLandingPage() {
  return document.body.dataset.page === "LandingPage";
}

async function loadAdminProfile() {
  console.log("Loading admin profile...");

  try {
    // First try to use stored data for immediate display
    const storedAdmin = localStorage.getItem("adminData");
    if (storedAdmin) {
      updateProfileElements(JSON.parse(storedAdmin));
    }

    // Then verify session is still valid
    const { data: { session }, error: sessionError } = await supabase.auth.getSession();
    
    if (sessionError || !session) {
      console.error("Session error:", sessionError);
      return handleLogout("Session expired. Please login again.");
    }

    console.log("Session valid, user:", session.user.email);

    // For superadmin, we can rely on stored data since RLS is disabled
    if (storedAdmin) {
      const adminData = JSON.parse(storedAdmin);
      if (adminData.role === 'superadmin') {
        console.log("✅ Superadmin - using stored data");
        return; // Don't need to refetch for superadmin
      }
    }

    // For regular admins, fetch fresh profile data
    const { data: profileData, error: profileError } = await supabase
      .from('admin_profiles')
      .select('*')
      .eq('id', session.user.id)
      .single();

    if (profileError || !profileData) {
      console.warn("Profile fetch failed:", profileError);
      // Don't logout immediately, use stored data
      return;
    }

    // Update stored data with fresh info
    const freshAdminData = {
      id: profileData.id,
      first_name: profileData.first_name,
      last_name: profileData.last_name,
      email: profileData.email || session.user.email,
      phone: profileData.phone,
      role: profileData.role,
      status: profileData.status
    };

    updateProfileElements(freshAdminData);
    localStorage.setItem("adminData", JSON.stringify(freshAdminData));

  } catch (error) {
    console.error("Profile load error:", error);
    // Don't logout on errors, rely on stored data
  }
}

function updateProfileElements(data) {
  console.log("Updating UI with profile data:", data);

  const fullName = `${data.first_name} ${data.last_name}`;
  document.querySelectorAll("#profile-account-name")
    .forEach(el => el.textContent = fullName);

  document.querySelectorAll("#profile-email")
    .forEach(el => el.textContent = data.email);

  document.querySelectorAll("#profile-phone")
    .forEach(el => {
      if (data.phone) {
        let phone = data.phone.replace(/\D/g, "");
        if (phone.startsWith("0")) {
          phone = phone.substring(1);
        }
        el.textContent = `+63 ${phone.replace(/(\d{3})(\d{3})(\d{4})/, "$1 $2 $3")}`;
      } else {
        el.textContent = "Not provided";
      }
  });

  let roleText = data.role;
  if (roleText === 'superadmin') {
    roleText = 'SUPER ADMIN';
  } else if (roleText === 'admin') {
    roleText = 'ADMIN';
  } else {
    roleText = roleText.replace("_", " ").toUpperCase();
  }

  document.querySelectorAll("#profile-role, .role-text")
    .forEach(el => el.textContent = roleText);

  console.log("✅ UI updated successfully!");
}

async function handleLogout(message) {
  console.log("Handling logout:", message);
  
  await supabase.auth.signOut();
  localStorage.removeItem("token");
  localStorage.removeItem("adminData");

  if (document.getElementById("loginForm")) {
    const errorBox = document.querySelector("#loginForm .errorBox");
    if (errorBox) {
      errorBox.textContent = message;
      errorBox.classList.add("error");
      errorBox.style.display = "block";
    }
  } else {
    alert(message);
  }

  setTimeout(() => {
    window.location.href = "Auth/LoginPage.html";
  }, 1000);
}

// ============================================
// SIMPLIFIED SESSION CHECK
// ============================================
window.addEventListener('load', async () => {
  // Define public pages that don't need authentication
  const publicPages = ['LoginPage.html', 'SignupPage.html', 'index.html'];
  const currentPage = window.location.pathname.split('/').pop();
  
  console.log("Page loaded:", currentPage);
  
  // Skip session check for public pages
  if (publicPages.includes(currentPage)) {
    console.log("Public page, skipping session check");
    return;
  }

  // Skip if on auth folder pages
  if (window.location.pathname.includes('/Auth/')) {
    console.log("Auth page, skipping session check");
    return;
  }

  // Only check session on protected pages
  if (supabase) {
    console.log("Protected page - checking session...");
    
    try {
      const { data: { session }, error } = await supabase.auth.getSession();
      
      if (error) {
        console.error("Session check error:", error);
        return;
      }
      
      if (!session) {
        console.log("No session found, redirecting to login");
        localStorage.removeItem("token");
        localStorage.removeItem("adminData");
        window.location.href = "/Auth/LoginPage.html";
        return;
      }
      
      console.log("✅ Session valid:", session.user.email);
      
      // For superadmin pages, don't do strict profile validation
      if (window.location.pathname.includes('SuperAdmin')) {
        console.log("SuperAdmin page - relaxed validation");
        return;
      }
      
    } catch (err) {
      console.error("Session check failed:", err);
    }
  }
});