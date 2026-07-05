// tasks_responsive.js
// Handles mobile-specific transitions and logic for the Tasks page

export function initTasksResponsive() {
  const app = window.TasksAppState;
  if (!app) return;

  // Set up mobile back button listener
  const backBtn = document.getElementById("todo-mobile-back-btn");
  if (backBtn) {
    backBtn.onclick = (e) => {
      e.stopPropagation();
      app.setMobileProjectActive(false);
      app.renderView();
    };
  }
}
