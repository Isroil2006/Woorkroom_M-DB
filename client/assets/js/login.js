import { API_URL, fetchCurrentUser } from "./api.js";
import { signInForm, signUpForm } from "../../pages/login/auth.js";
import { initResponsiveLogic } from "../../pages/login/login_responsive.js";

// Agar user allaqachon login qilgan bo'lsa, asosiy sahifaga o'tkazamiz
(async () => {
  const user = await fetchCurrentUser();
  if (user) {
    window.location.href = "/";
  }
})();

// Responsive logikani ishga tushirish
initResponsiveLogic();

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
  if (window.lockoutInterval) {
    clearInterval(window.lockoutInterval);
    window.lockoutInterval = null;
  }
  container.classList.add("blur_animation");

  // Start the background transition immediately
  if (mode === "signup") {
    wrapper.classList.add("signup-mode");
  } else {
    wrapper.classList.remove("signup-mode");
  }

  setTimeout(() => {
    // Update container sizes and content only after it has blurred out
    if (mode === "signup") {
      container.style.maxWidth = "680px";
      container.style.width = "100%";
    } else {
      container.style.maxWidth = "400px";
      container.style.width = "";
    }

    container.innerHTML = mode === "signup" ? signUpForm : signInForm;

    if (mode === "signup") {
      authBannerSignIn.classList.add("hidden");
      authBannerSignUp.classList.remove("hidden");
    } else {
      authBannerSignIn.classList.remove("hidden");
      authBannerSignUp.classList.add("hidden");
    }

    container.classList.remove("blur_animation");

    attachEvents();
  }, 400);
}

function showError(inputId, message) {
  const inputField = document.getElementById(inputId);
  if (!inputField) return;
  const group = inputField.closest(".input-group");
  const errorText = group ? group.querySelector(".error-message") : null;
  inputField.classList.add("error-border");
  if (errorText) {
    errorText.innerText = message;
    errorText.style.opacity = "1";
  }
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
    const regPasswordInput = document.getElementById("reg-password");
    const valWrapper = document.getElementById("password-validation-wrapper");

    // Val-items references
    const valLength = document.getElementById("val-length");
    const valUppercase = document.getElementById("val-uppercase");
    const valNumber = document.getElementById("val-number");
    const valSpecial = document.getElementById("val-special");

    const updateValidationState = (el, isValid) => {
      if (!el) return;
      const icon = el.querySelector(".val-icon");
      if (isValid) {
        el.classList.remove("invalid");
        el.classList.add("valid");
        if (icon) icon.innerText = "✓";
      } else {
        el.classList.remove("valid");
        el.classList.add("invalid");
        if (icon) icon.innerText = "✕";
      }
    };

    const validatePassword = () => {
      if (!regPasswordInput) return false;
      const val = regPasswordInput.value;
      
      const isLengthValid = val.length >= 8;
      const isUppercaseValid = /[A-Z]/.test(val);
      const isNumberValid = /[0-9]/.test(val);
      const isSpecialValid = /[\.\-\_\+\@\#]/.test(val);

      updateValidationState(valLength, isLengthValid);
      updateValidationState(valUppercase, isUppercaseValid);
      updateValidationState(valNumber, isNumberValid);
      updateValidationState(valSpecial, isSpecialValid);

      return isLengthValid && isUppercaseValid && isNumberValid && isSpecialValid;
    };

    const generateSecurePassword = () => {
      const length = 12;
      const uppercase = "ABCDEFGHIJKLMNOPQRSTUVWXYZ";
      const lowercase = "abcdefghijklmnopqrstuvwxyz";
      const numbers = "0123456789";
      const specialChars = ".-_+@#";
      
      let passwordArray = [
        uppercase[Math.floor(Math.random() * uppercase.length)],
        lowercase[Math.floor(Math.random() * lowercase.length)],
        numbers[Math.floor(Math.random() * numbers.length)],
        specialChars[Math.floor(Math.random() * specialChars.length)]
      ];
      
      const allAllowedChars = uppercase + lowercase + numbers + specialChars;
      for (let i = passwordArray.length; i < length; i++) {
        passwordArray.push(allAllowedChars[Math.floor(Math.random() * allAllowedChars.length)]);
      }
      
      for (let i = passwordArray.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [passwordArray[i], passwordArray[j]] = [passwordArray[j], passwordArray[i]];
      }
      
      return passwordArray.join("");
    };

    if (regPasswordInput && valWrapper) {
      regPasswordInput.onfocus = () => {
        valWrapper.classList.remove("hidden-validation");
        validatePassword();
      };
      
      regPasswordInput.onblur = () => {
        if (regPasswordInput.value.length === 0 || validatePassword()) {
          valWrapper.classList.add("hidden-validation");
        }
      };

      regPasswordInput.oninput = () => {
        validatePassword();
      };

      const genPasswordBtn = document.getElementById("generate-reg-password");
      if (genPasswordBtn) {
        genPasswordBtn.onclick = (e) => {
          e.preventDefault();
          const generatedPass = generateSecurePassword();
          regPasswordInput.value = generatedPass;
          valWrapper.classList.remove("hidden-validation");
          validatePassword();
          
          regPasswordInput.classList.add("show-password");
          const toggleRegBtn = document.getElementById("toggle-reg-password");
          if (toggleRegBtn) {
            toggleRegBtn.innerHTML = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="24" height="24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="feather feather-eye"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"></path><circle cx="12" cy="12" r="3"></circle></svg>`;
          }
        };
      }
    }

    signupbtn.onclick = () => {
      clearErrors();

      const firstname = document.getElementById("reg-firstname").value.trim();
      const lastname = document.getElementById("reg-lastname").value.trim();
      const tel = document.getElementById("reg-tel").value.trim();
      const email = document.getElementById("reg-email").value.trim();
      const password = document.getElementById("reg-password").value; // keep raw spacing/casing
      let hasError = false;

      // Ism
      if (!firstname) {
        showError("reg-firstname", "Required field");
        hasError = true;
      } else if (firstname.length < 3) {
        showError("reg-firstname", "First name must be at least 3 characters");
        hasError = true;
      }

      // Familiya
      if (!lastname) {
        showError("reg-lastname", "Required field");
        hasError = true;
      } else if (lastname.length < 3) {
        showError("reg-lastname", "Last name must be at least 3 characters");
        hasError = true;
      }

      const username = firstname + " " + lastname;

      // Telefon raqami
      const telDigitsOnly = tel.replace(/\D/g, "");
      if (!tel || tel === "+998" || tel === "+998 " || telDigitsOnly.length <= 3) {
        showError("reg-tel", "Required field");
        hasError = true;
      } else if (tel.length < 17) {
        showError("reg-tel", "Enter complete mobile number");
        hasError = true;
      }

      // Email
      if (!email) {
        showError("reg-email", "Required field");
        hasError = true;
      } else if (!email.includes("@")) {
        showError("reg-email", "Enter a valid email address");
        hasError = true;
      }

      // Parol
      if (!password) {
        showError("reg-password", "Required field");
        hasError = true;
      } else if (!validatePassword()) {
        showError("reg-password", "Password does not meet validation requirements");
        if (valWrapper) {
          valWrapper.classList.remove("hidden-validation");
        }
        hasError = true;
      }

      if (hasError) return;

      signupbtn.classList.add("loading");

      const bodyData = {
        username,
        tel,
        email,
        password,
      };

      fetch(`${API_URL}/api/users/register`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(bodyData),
      })
        .then(async (res) => {
          const contentType = res.headers.get("content-type");
          if (contentType && contentType.includes("application/json")) {
            const data = await res.json();
            if (res.status === 400 && data.message === "Bu email band!") {
              showError("reg-email", "This email is already registered!");
            } else if (!res.ok) {
              alert(data.message || "An error occurred");
            } else {
              renderAuth("signin");
            }
          } else {
            const text = await res.text();
            console.error("Server error (not JSON):", text);
            alert("A server error occurred. Please try again later.");
          }
        })
        .catch((err) => console.error("Registration error:", err))
        .finally(() => {
          signupbtn.classList.remove("loading");
        });
    };
  }

  // ── LOGIN ──
  if (loginForm) {
    const startLockoutTimer = (lockUntilMs) => {
      const emailInput = document.getElementById("email");
      const passwordInput = document.getElementById("password");
      const signinBtn = document.querySelector(".signin-btn");

      if (!emailInput || !passwordInput || !signinBtn) return;

      emailInput.disabled = true;
      passwordInput.disabled = true;
      signinBtn.disabled = true;
      signinBtn.classList.add("disabled");

      if (window.lockoutInterval) clearInterval(window.lockoutInterval);

      const updateTimer = () => {
        const remainingMs = lockUntilMs - Date.now();
        if (remainingMs <= 0) {
          clearInterval(window.lockoutInterval);
          emailInput.disabled = false;
          passwordInput.disabled = false;
          signinBtn.disabled = false;
          signinBtn.classList.remove("disabled");
          clearErrors();
          return;
        }

        const totalSecs = Math.ceil(remainingMs / 1000);
        const mins = Math.floor(totalSecs / 60);
        const secs = totalSecs % 60;
        const formattedTime = `${String(mins).padStart(2, "0")}:${String(secs).padStart(2, "0")}`;

        showError("password", `Account locked. Try again in ${formattedTime}`);
      };

      updateTimer();
      window.lockoutInterval = setInterval(updateTimer, 1000);
    };

    signinbtn.onclick = () => {
      clearErrors();
      const email = document.getElementById("email").value.trim();
      const password = document.getElementById("password").value.trim();

      if (!email || !password) {
        showError("email", "Please enter email");
        showError("password", "Please enter password");
        return;
      }

      signinbtn.classList.add("loading");

      fetch(`${API_URL}/api/users/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include", // YANGI: Kuki yashash uchun shart
        body: JSON.stringify({ email, password }),
      })
        .then(async (res) => {
          const contentType = res.headers.get("content-type");
          if (contentType && contentType.includes("application/json")) {
            const data = await res.json();
            if (res.status === 401) {
              if (data.attemptsRemaining !== undefined) {
                showError("password", `Incorrect password. ${data.attemptsRemaining} attempts remaining.`);
              } else {
                showError("email", "Incorrect email or password");
                showError("password", "Incorrect email or password");
              }
            } else if (res.status === 403 && data.locked) {
              startLockoutTimer(data.lockUntil);
            } else if (res.status === 200) {
              window.location.href = "/";
            } else {
              alert(data.message || "An error occurred");
            }
          } else {

            const text = await res.text();
            console.error("Server error (not JSON):", text);
            alert("An error occurred during sign in. Please try again later.");
          }
        })
        .catch((err) => console.error("Login error:", err))
        .finally(() => {
          signinbtn.classList.remove("loading");
        });
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

  // ── Password Eye Toggles ──
  const toggleSigninBtn = document.getElementById("toggle-signin-password");
  const signinPasswordInput = document.getElementById("password");
  if (toggleSigninBtn && signinPasswordInput) {
    toggleSigninBtn.onclick = () => {
      const isPassword = signinPasswordInput.type === "password";
      signinPasswordInput.type = isPassword ? "text" : "password";
      toggleSigninBtn.innerHTML = isPassword
        ? `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="24" height="24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="feather feather-eye"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"></path><circle cx="12" cy="12" r="3"></circle></svg>`
        : `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="24" height="24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="feather feather-eye-off"><path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24"></path><line x1="1" y1="1" x2="23" y2="23"></line></svg>`;
    };
  }

  const toggleRegBtn = document.getElementById("toggle-reg-password");
  const regPasswordInput2 = document.getElementById("reg-password");
  if (toggleRegBtn && regPasswordInput2) {
    toggleRegBtn.onclick = () => {
      const isMasked = !regPasswordInput2.classList.contains("show-password");
      regPasswordInput2.classList.toggle("show-password");
      toggleRegBtn.innerHTML = isMasked
        ? `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="24" height="24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="feather feather-eye"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"></path><circle cx="12" cy="12" r="3"></circle></svg>`
        : `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="24" height="24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="feather feather-eye-off"><path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24"></path><line x1="1" y1="1" x2="23" y2="23"></line></svg>`;
    };
  }
}

renderAuth("signin");
