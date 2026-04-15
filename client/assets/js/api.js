// Base URL for the API
// In development, it uses localhost:5000
// In production (Vercel), you should set VITE_API_URL in environment variables
export const API_URL = import.meta.env.VITE_API_URL || "http://localhost:5000";
