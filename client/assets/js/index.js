import "../../components/component.js";
import "../../pages/pages.js";

if (
  localStorage.getItem("isLoggedIn") !== "true" ||
  !localStorage.getItem("currentUser")
) {
  window.location.href = "login.html";
}

window.addEventListener("DOMContentLoaded", () => {
  // Boshqa global initlar shu yerda bo'lishi mumkin
});

