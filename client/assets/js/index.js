import "../../components/component.js";
import "../../pages/pages.js";
import { fetchCurrentUser } from "./api.js";

(async () => {
  const urlParams = new URLSearchParams(window.location.search);
  if (urlParams.has("receiptData")) {
    return;
  }
  const user = await fetchCurrentUser();
  if (!user) {
    window.location.href = "login.html";
  }
})();


