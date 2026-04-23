// ─── API Configuration ──────────────────────────────────────────
export const API_URL =
  import.meta.env.VITE_API_URL !== undefined
    ? import.meta.env.VITE_API_URL
    : import.meta.env.MODE === "production"
      ? ""
      : "http://localhost:5000";

// ─── Token Management (Endi kuki bilan ishlaymiz) ──────────────────
export const clearAuth = async () => {
  try {
    await fetch(`${API_URL}/api/users/logout`, { method: "POST", credentials: "include" });
  } catch (err) {
    console.error("Logout error:", err);
  }
  localStorage.removeItem("currentUser");
  cachedUser = null;
};

// Autentifikatsiyani tekshirish uchun user ma'lumoti bormi-yo'qligiga qaraymiz
export const isAuthenticated = () => !!cachedUser;

// ─── Auth Headers ───────────────────────────────────────────────
export const getAuthHeaders = () => {
  return { "Content-Type": "application/json" };
};

// ─── Current User Cache ─────────────────────────────────────────
let cachedUser = null;

export const getCurrentUser = () => {
  return cachedUser;
};

export const setCurrentUser = (user) => {
  cachedUser = user;
};

export const fetchCurrentUser = async () => {
  try {
    const res = await fetch(`${API_URL}/api/users/me`, {
      method: "GET",
      headers: getAuthHeaders(),
      credentials: "include", // Kukini yuborish uchun shart
    });
    if (res.ok) {
      cachedUser = await res.json();
      return cachedUser;
    } else if (res.status === 401) {
      cachedUser = null;
      return null;
    }
  } catch (err) {
    console.error("Failed to fetch current user:", err);
  }
  return null;
};

