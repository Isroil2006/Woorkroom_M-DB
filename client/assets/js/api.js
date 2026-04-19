// ─── API Configuration ──────────────────────────────────────────
// Base URL for the API
// In development, it uses localhost:5000
// In production (Vercel), you should set VITE_API_URL in environment variables
export const API_URL =
  import.meta.env.VITE_API_URL !== undefined
    ? import.meta.env.VITE_API_URL
    : import.meta.env.MODE === "production"
      ? ""
      : "http://localhost:5000";

// ─── Token Management ───────────────────────────────────────────
export const getToken = () => sessionStorage.getItem("token");

export const setToken = (token) => sessionStorage.setItem("token", token);

export const clearAuth = () => {
  sessionStorage.removeItem("token");
  cachedUser = null;
};

export const isAuthenticated = () => !!getToken();

// ─── Auth Headers ───────────────────────────────────────────────
export const getAuthHeaders = () => {
  const token = getToken();
  const headers = { "Content-Type": "application/json" };
  if (token) {
    headers["Authorization"] = `Bearer ${token}`;
  }
  return headers;
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
  const token = getToken();
  if (!token) return null;

  try {
    const res = await fetch(`${API_URL}/api/users/me`, {
      headers: getAuthHeaders(),
    });
    if (res.ok) {
      cachedUser = await res.json();
      return cachedUser;
    } else if (res.status === 401) {
      // Token yaroqsiz — tozalaymiz
      clearAuth();
      return null;
    }
  } catch (err) {
    console.error("Failed to fetch current user:", err);
  }
  return null;
};
