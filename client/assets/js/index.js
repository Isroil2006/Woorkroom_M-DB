import "../../components/component.js";
import "../../pages/pages.js";
import { isAuthenticated } from "./api.js";

if (!isAuthenticated()) {
  window.location.href = "login.html";
}
