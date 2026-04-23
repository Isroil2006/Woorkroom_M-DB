import "../../components/component.js";
import "../../pages/pages.js";
import { fetchCurrentUser } from "./api.js";

(async () => {
  const user = await fetchCurrentUser();
  if (!user) {
    window.location.href = "login.html";
  }
})();

