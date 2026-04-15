import { signInForm, signUpForm } from "../../pages/login/auth.js";

const wrapper = document.querySelector(".auth-wrapper");
const container = document.getElementById("auth-container");
const authBannerSignIn = document.querySelector(".auth-banner-content-signin");
const authBannerSignUp = document.querySelector(".auth-banner-content-signup");

// ─── Bank hisob raqami generatsiya ─────────────────────────────
const BANK_CODE = "2020"; // O'zbekiston bank kodi (misol)

function generateAccountNumber(userId) {
  const userIdPart = String(userId).padStart(6, "0");
  const randomPart = Array.from({ length: 10 }, () =>
    Math.floor(Math.random() * 10),
  ).join("");
  return BANK_CODE + userIdPart + randomPart; // 4 + 6 + 10 = 20 ta raqam
}

// ─── Render ─────────────────────────────────────────────────────
function renderAuth(mode) {
  container.classList.add("blur_animation");
  authBannerSignIn.classList.add("blur_animation");
  authBannerSignUp.classList.add("blur_animation");

  if (mode === "signup") {
    wrapper.classList.add("signup-mode");
  } else {
    wrapper.classList.remove("signup-mode");
  }

  setTimeout(() => {
    container.innerHTML = mode === "signup" ? signUpForm : signInForm;

    if (mode === "signup") {
      authBannerSignIn.classList.add("hidden");
      authBannerSignUp.classList.remove("hidden");
    } else {
      authBannerSignIn.classList.remove("hidden");
      authBannerSignUp.classList.add("hidden");
    }

    container.classList.remove("blur_animation");
    authBannerSignIn.classList.remove("blur_animation");
    authBannerSignUp.classList.remove("blur_animation");

    attachEvents();
  }, 400);
}

function showError(inputId, message) {
  const inputField = document.getElementById(inputId);
  const errorText = inputField.nextElementSibling;
  inputField.classList.add("error-border");
  errorText.innerText = message;
  errorText.style.opacity = "1";
}

function clearErrors() {
  const inputs = document.querySelectorAll(".input");
  const errors = document.querySelectorAll(".error-message");
  inputs.forEach((input) => input.classList.remove("error-border"));
  errors.forEach((error) => {
    error.innerText = "";
    error.style.opacity = "0";
  });
}

function attachEvents() {
  const toSignUp = document.getElementById("switch-to-signup");
  const toSignIn = document.getElementById("switch-to-signin");
  const signinbtn = document.querySelector(".signin-btn");
  const signupbtn = document.querySelector(".signup-btn");
  const loginForm = document.getElementById("login-form");
  const registerForm = document.getElementById("register-form");

  if (toSignUp) toSignUp.onclick = () => renderAuth("signup");
  if (toSignIn) toSignIn.onclick = () => renderAuth("signin");

  // ── REGISTER ──
  if (registerForm) {
    signupbtn.onclick = () => {
      clearErrors();

      const username = document.getElementById("reg-username").value.trim();
      const tel = document.getElementById("reg-tel").value.trim();
      const email = document.getElementById("reg-email").value.trim();
      const password = document.getElementById("reg-password").value.trim();
      let hasError = false;

      if (username.length < 3) {
        showError("reg-username", "Username kamida 3 ta harf bo'lsin");
        hasError = true;
      }
      if (!tel.includes("+998") || tel.length < 13) {
        showError("reg-tel", "Telefon raqamini to'liq kiriting");
        hasError = true;
      }
      if (!email.includes("@")) {
        showError("reg-email", "Haqiqiy email kiriting");
        hasError = true;
      }
      if (password.length < 6) {
        showError("reg-password", "Parol kamida 6 belgidan iborat bo'lsin");
        hasError = true;
      }
      if (hasError) return;

      const bodyData = {
        username,
        tel,
        email,
        password,
      };

      fetch("http://localhost:5000/api/users/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(bodyData),
      })
        .then(async (res) => {
          const data = await res.json();
          if (res.status === 400 && data.message === "Bu email band!") {
            showError("reg-email", "Bu email band!");
          } else if (res.status !== 201) {
            alert(data.message || "Xatolik yuz berdi");
          } else {
            renderAuth("signin");
          }
        })
        .catch((err) => console.error("Register xatosi:", err));
    };
  }

  // ── LOGIN ──
  if (loginForm) {
    signinbtn.onclick = () => {
      clearErrors();
      const email = document.getElementById("email").value.trim();
      const password = document.getElementById("password").value.trim();

      if (!email || !password) {
        showError("email", "Emailni kiriting");
        showError("password", "Parolni kiriting");
        return;
      }

      fetch("http://localhost:5000/api/users/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      })
        .then(async (res) => {
          const data = await res.json();
          if (res.status === 401) {
            showError("email", "Email yoki parol xato");
            showError("password", "Email yoki parol xato");
          } else if (res.status === 200) {
            localStorage.setItem("isLoggedIn", "true");
            localStorage.setItem("currentUser", JSON.stringify(data));
            window.location.href = "index.html";
          } else {
            alert(data.message || "Xatolik yuz berdi");
          }
        })
        .catch((err) => console.error("Login xatosi:", err));
    };
  }

  // ── Tel format ──
  const telInput = document.getElementById("reg-tel");
  if (telInput) {
    telInput.onfocus = () => {
      if (!telInput.value) telInput.value = "+998 ";
    };
    telInput.oninput = () => {
      let value = telInput.value.replace(/\D/g, "");
      if (value.length < 3) {
        telInput.value = "+998 ";
        return;
      }
      let fmt = "+998 ";
      if (value.length > 3) fmt += value.substring(3, 5);
      if (value.length > 5) fmt += " " + value.substring(5, 8);
      if (value.length > 8) fmt += " " + value.substring(8, 10);
      if (value.length > 10) fmt += " " + value.substring(10, 12);
      telInput.value = fmt;
    };
  }
}

renderAuth("signin");
