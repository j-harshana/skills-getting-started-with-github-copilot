document.addEventListener("DOMContentLoaded", () => {
  const activitiesList = document.getElementById("activities-list");
  const activitySelect = document.getElementById("activity");
  const signupForm = document.getElementById("signup-form");
  const messageDiv = document.getElementById("message");

  // small helper to avoid injecting raw HTML from API fields
  function escapeHtml(str) {
    const div = document.createElement("div");
    div.textContent = String(str);
    return div.innerHTML;
  }

  // Function to fetch activities from API
  async function fetchActivities() {
    try {
      const response = await fetch("/activities");
      const activities = await response.json();

      // Clear loading message
      activitiesList.innerHTML = "";

      // Populate activities list
      Object.entries(activities).forEach(([name, details]) => {
        const activityCard = document.createElement("div");
        activityCard.className = "activity-card";

        const spotsLeft = details.max_participants - details.participants.length;

        // Basic info
        activityCard.innerHTML = `
          <h4>${escapeHtml(name)}</h4>
          <p>${escapeHtml(details.description)}</p>
          <p><strong>Schedule:</strong> ${escapeHtml(details.schedule)}</p>
          <p><strong>Availability:</strong> ${spotsLeft} spots left</p>
        `;

        // Participants section
        const participantsDiv = document.createElement("div");
        participantsDiv.className = "participants-section";

        const participantsTitle = document.createElement("h5");
        participantsTitle.textContent = "Participants";
        participantsDiv.appendChild(participantsTitle);

        if (details.participants && details.participants.length > 0) {
          const ul = document.createElement("ul");
          ul.className = "participants-list";

          details.participants.forEach((p) => {
            const li = document.createElement("li");
            li.className = "participant-item";
            li.dataset.email = p;
            li.dataset.activity = name;

            const avatar = document.createElement("span");
            avatar.className = "avatar";
            const initials = (p || "")
              .split(/\s+/)
              .slice(0, 2)
              .map(s => (s[0] || ""))
              .join("")
              .toUpperCase();
            avatar.textContent = initials || "?";

            const nameSpan = document.createElement("span");
            nameSpan.className = "participant-name";
            nameSpan.textContent = p;

            // actions container (delete button)
            const actions = document.createElement("span");
            actions.className = "participant-actions";

            const deleteBtn = document.createElement("button");
            deleteBtn.type = "button";
            deleteBtn.className = "participant-delete";
            deleteBtn.title = "Unregister participant";
            // simple trash unicode icon — avoids adding image assets
            deleteBtn.innerHTML = "&#128465;";

            deleteBtn.addEventListener("click", async (e) => {
              e.stopPropagation();
              const activityName = li.dataset.activity;
              const email = li.dataset.email;

              // optimistic UI: remove immediately
              li.remove();

              try {
                const resp = await fetch(`/activities/${encodeURIComponent(activityName)}/unregister?email=${encodeURIComponent(email)}`, {
                  method: "POST",
                });

                if (!resp.ok) {
                  // if failed, re-fetch activities to restore state and show error
                  await fetchActivities();
                  const err = await resp.json().catch(() => ({}));
                  alert(err.detail || "Failed to unregister participant");
                }
              } catch (err) {
                // on network error, re-fetch to restore and notify
                await fetchActivities();
                console.error("Error unregistering participant:", err);
                alert("Network error while unregistering participant");
              }
            });

            actions.appendChild(deleteBtn);
            li.appendChild(actions);

            li.appendChild(avatar);
            li.appendChild(nameSpan);
            ul.appendChild(li);
          });

          participantsDiv.appendChild(ul);
        } else {
          const none = document.createElement("p");
          none.className = "no-participants";
          none.textContent = "No participants yet";
          participantsDiv.appendChild(none);
        }

        activityCard.appendChild(participantsDiv);
        activitiesList.appendChild(activityCard);

        // Add option to select dropdown
        const option = document.createElement("option");
        option.value = name;
        option.textContent = name;
        activitySelect.appendChild(option);
      });
    } catch (error) {
      activitiesList.innerHTML = "<p>Failed to load activities. Please try again later.</p>";
      console.error("Error fetching activities:", error);
    }
  }

  // Handle form submission
  signupForm.addEventListener("submit", async (event) => {
    event.preventDefault();

    const email = document.getElementById("email").value;
    const activity = document.getElementById("activity").value;

    try {
      const response = await fetch(
        `/activities/${encodeURIComponent(activity)}/signup?email=${encodeURIComponent(email)}`,
        {
          method: "POST",
        }
      );

      const result = await response.json();

      if (response.ok) {
        messageDiv.textContent = result.message;
        messageDiv.className = "success";
        signupForm.reset();
      } else {
        messageDiv.textContent = result.detail || "An error occurred";
        messageDiv.className = "error";
      }

      messageDiv.classList.remove("hidden");

      // Hide message after 5 seconds
      setTimeout(() => {
        messageDiv.classList.add("hidden");
      }, 5000);
    } catch (error) {
      messageDiv.textContent = "Failed to sign up. Please try again.";
      messageDiv.className = "error";
      messageDiv.classList.remove("hidden");
      console.error("Error signing up:", error);
    }
  });

  // Initialize app
  fetchActivities();
});
