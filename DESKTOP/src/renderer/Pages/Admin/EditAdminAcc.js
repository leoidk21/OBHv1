document.addEventListener("DOMContentLoaded", () => {
  console.log("EditAdminAcc.js is loaded!");

  // Function to initialize modal
  function initializeModal() {
    const modal = document.getElementById("editProfileModal");
    const editButtons = document.querySelectorAll(".edit-btn");
    const cancelBtn = document.getElementById("cancelBtn");
    const editProfileForm = document.getElementById("editProfileForm");

    if (modal && editButtons.length > 0) {
      editButtons.forEach((btn) => {
        btn.addEventListener("click", (e) => {
          e.preventDefault();
          modal.classList.add("show");

          // Get values from profile card spans
          const name = document.getElementById("profile-account-name").textContent.trim();
          const email = document.getElementById("profile-email").textContent.trim();
          const phone = document.getElementById("profile-phone").textContent.trim();

          // Fill modal form inputs
          document.getElementById("editName").value = name;
          document.getElementById("editEmail").value = email;
          document.getElementById("editPhone").value = phone;
        });
      });

      if (cancelBtn) {
        cancelBtn.addEventListener("click", () => {
          modal.classList.remove("show");
        });
      }

      // Handle form submission
      if (editProfileForm) {
        editProfileForm.addEventListener("submit", async (e) => {
          e.preventDefault(); // Prevent default form submission

          const token = localStorage.getItem("token");
          const name = document.getElementById("editName").value;
          const email = document.getElementById("editEmail").value;
          const phone = document.getElementById("editPhone").value;

          // Split name into first and last name if needed
          const nameParts = name.split(" ");
          const first_name = nameParts[0] || "";
          const last_name = nameParts.slice(1).join(" ") || "";

            try {
              console.log("Sending update request with data:", { first_name, last_name, email, phone });

              const res = await fetch("http://localhost:3000/api/admin/me", {
                method: "PUT",
                headers: {
                  "Content-Type": "application/json",
                  Authorization: `Bearer ${token}`,
                },
                body: JSON.stringify({ first_name, last_name, email, phone }),
              });

            console.log("Response status:", res.status);
            console.log("Response headers:", res.headers);

            // Check if response is ok first
            if (!res.ok) {
              const errorText = await res.text();
              console.error("HTTP Error:", res.status, errorText);
              throw new Error(`HTTP ${res.status}: ${errorText}`);
            }

            // Check if response has content
            const responseText = await res.text();
            console.log("Raw response:", responseText);

            if (!responseText) {
              throw new Error("Empty response from server");
            }

            const data = JSON.parse(responseText);
            console.log("Parsed response:", data);

            if (data.success) {
              alert("Profile updated!");
              console.log("Updated admin:", data.admin);
              
              // Update the profile display with new values
              const nameElements = document.querySelectorAll("#profile-account-name");
              nameElements.forEach(el => el.textContent = name);
              
              const emailElements = document.querySelectorAll("#profile-email");
              emailElements.forEach(el => el.textContent = email);
              
              const phoneElements = document.querySelectorAll("#profile-phone");
              phoneElements.forEach(el => el.textContent = phone);
              
              // Close modal
              modal.classList.remove("show");
            } else {
              alert("Update failed: " + (data.error || "unknown error"));
            }
          } catch (err) {
            console.error("Full error:", err);
            alert("Error updating profile: " + err.message);
          }
        });
      }

      window.addEventListener("click", (e) => {
        if (e.target === modal) {
          modal.classList.remove("show");
        }
      });

      console.log("Modal initialized successfully!");
      return true;
    }
    return false;
  }

  // Try to initialize immediately
  if (!initializeModal()) {
    console.log("Elements not found, waiting for loadComponents...");

    setTimeout(() => {
      if (!initializeModal()) {
        console.log("Still not found after delay, trying MutationObserver...");

        const observer = new MutationObserver(() => {
          if (initializeModal()) {
            observer.disconnect();
          }
        });

        observer.observe(document.body, {
          childList: true,
          subtree: true
        });
      }
    }, 1000);
  }
});