import { API_URL, getCurrentUser, getAuthHeaders, setCurrentUser } from "../../assets/js/api.js";
import { profileTranslations } from "./translations.js";
import { getCurrentLang, createTranslationHelper } from "../../assets/js/i18n.js";

const t = createTranslationHelper(profileTranslations);

// ───── Helpers ────────────────────────────────────────────
function calcCompletion(user) {
  const fields = ["username", "email", "tel", "gender", "age", "position", "level", "avatar"];
  const filled = fields.filter((f) => user[f] && user[f] !== "").length;
  return Math.round((filled / fields.length) * 100);
}

function infoChip(label, value) {
  const display = value && value !== "" ? value : `<span class="up-empty">${t("not_specified")}</span>`;
  return `<div class="up-info-chip">
        <span class="up-chip-label">${label}</span>
        <span class="up-chip-value">${display}</span>
    </div>`;
}

// ───── Main render ────────────────────────────────────────
export async function userProfileRender() {
  const content = document.querySelector(".content");
  const loggedInInfo = getCurrentUser();
  if (!loggedInInfo) return;

  // 1️⃣ Show Loading State immediately
  content.innerHTML = `
    <div class="up-root">
        <div class="up-header">
            <h2>${t("my_profile")}</h2>
        </div>
        <div class="up-body loading">
             <aside class="up-aside">
                <div class="up-card up-avatar-card">
                    <div class="up-skeleton up-skeleton-avatar"></div>
                    <div class="up-skeleton up-skeleton-text" style="margin-top:10px"></div>
                    <div class="up-skeleton up-skeleton-text" style="width:100px; height:12px; margin-top:5px"></div>
                </div>
                <div class="up-card up-chips-card" style="gap:15px; padding:20px 28px">
                    <div class="up-skeleton up-skeleton-text" style="width:100%"></div>
                    <div class="up-skeleton up-skeleton-text" style="width:100%"></div>
                    <div class="up-skeleton up-skeleton-text" style="width:100%"></div>
                </div>
             </aside>
             <main class="up-main">
                <div class="up-card up-form-card">
                    <div class="up-skeleton up-skeleton-title"></div>
                    <div class="up-form-grid">
                        <div class="up-skeleton up-skeleton-input"></div>
                        <div class="up-skeleton up-skeleton-input"></div>
                        <div class="up-skeleton up-skeleton-input"></div>
                        <div class="up-skeleton up-skeleton-input"></div>
                        <div class="up-skeleton up-skeleton-input"></div>
                        <div class="up-skeleton up-skeleton-input"></div>
                        <div class="up-skeleton up-skeleton-input"></div>
                        <div class="up-skeleton up-skeleton-input"></div>
                    </div>
                </div>
             </main>
        </div>
    </div>`;

  // 2️⃣ Fetch data
  let user = loggedInInfo;
  try {
    const uId = loggedInInfo.userId || loggedInInfo._id;
    const res = await fetch(`${API_URL}/api/users/${uId}`, {
      headers: getAuthHeaders(),
      credentials: "include",
    });
    if (res.ok) {
      user = await res.json();
    }
  } catch (err) {
    console.error("Failed to fetch user data:", err);
  }

  // Fetch avatar from backend
  // Fetch avatar from backend
  let userAvatar =
    user.avatar || (user.gender === "Male" ? "/assets/images/user-avatar-male.png" : user.gender === "Female" ? "/assets/images/user-avatar-female.png" : "/assets/images/User-avatar.png");

  try {
    const uId = user.userId || user._id;
    const res = await fetch(`${API_URL}/api/user-photos/${uId}?type=image`, {
      headers: getAuthHeaders(),
      credentials: "include",
    });
    if (res.ok) {
      const file = await res.json();
      if (file && file.fileData) userAvatar = file.fileData;
    }
  } catch (err) {
    console.error("Failed to fetch avatar:", err);
  }

  const completion = calcCompletion({ ...user, avatar: userAvatar });

  content.innerHTML = `
    <div class="up-root">

        <!-- ── Header ── -->
        <div class="up-header">
            <h2>${t("my_profile")}</h2>

        </div>

        <!-- ── Body ── -->
        <div class="up-body">

            <!-- LEFT PANEL -->
            <aside class="up-aside">

                <!-- Avatar card -->
                <div class="up-card up-avatar-card">
                    <div class="up-avatar-wrap">
                        <img class="up-avatar-img" src="${userAvatar}" alt="avatar"/>
                        <button class="up-avatar-edit-btn" id="up-avatar-btn">
                            <svg width="14" height="14" viewBox="0 0 24 24" fill="none">
                                <path fill-rule="evenodd" clip-rule="evenodd"
                                    d="M15.8787 2.87868L7.29289 11.4645C7.10536 11.652 7 11.9064 7 12.1716V16.1716C7 16.7239 7.44772 17.1716 8 17.1716H12C12.2652 17.1716 12.5196 17.0662 12.7071 16.8787L21.2929 8.29289C22.4645 7.12132 22.4645 5.22183 21.2929 4.05025L20.1213 2.87868C18.9497 1.70711 17.0503 1.70711 15.8787 2.87868Z"
                                    fill="currentColor"/>
                            </svg>
                        </button>
                        <input type="file" id="up-avatar-input" accept="image/*" style="display:none"/>
                    </div>
                    <p class="up-avatar-name">${user.username || "—"}</p>
                    <p class="up-avatar-pos">${user.position || ""}</p>

                    <!-- completion bar -->
                    <div class="up-completion">
                        <div class="up-completion-top">
                            <span>${t("profile_completion")}</span>
                            <span class="up-completion-pct">${completion}%</span>
                        </div>
                        <div class="up-completion-bar">
                            <div class="up-completion-fill" style="width:${completion}%"></div>
                        </div>
                    </div>
                </div>

                <!-- Quick info chips -->
                <div class="up-card up-chips-card">
                    ${infoChip(t("gender"), user.gender)}
                    ${infoChip(t("age"), user.age)}
                    ${infoChip(t("level"), user.level)}
                    ${infoChip(t("position"), user.position)}
                </div>

            </aside>

            <!-- RIGHT PANEL -->
            <main class="up-main">

                <div class="up-card up-form-card">
                    <div class="up-form-card-header">
                        <h3>${t("personal_info")}</h3>
                        <button class="up-edit-btn" id="up-edit-btn">
                            <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
                                <path fill-rule="evenodd" clip-rule="evenodd"
                                    d="M15.8787 2.87868L7.29289 11.4645C7.10536 11.652 7 11.9064 7 12.1716V16.1716C7 16.7239 7.44772 17.1716 8 17.1716H12C12.2652 17.1716 12.5196 17.0662 12.7071 16.8787L21.2929 8.29289C22.4645 7.12132 22.4645 5.22183 21.2929 4.05025L20.1213 2.87868C18.9497 1.70711 17.0503 1.70711 15.8787 2.87868ZM11.0308 4.17157C11.0308 3.61929 10.5831 3.17157 10.0308 3.17157H6L5.78311 3.17619C3.12231 3.28975 1 5.48282 1 8.17157V18.1716L1.00462 18.3885C1.11818 21.0493 3.31125 23.1716 6 23.1716H16L16.2169 23.167C18.8777 23.0534 21 20.8603 21 18.1716V13.2533C21 12.701 20.5523 12.2533 20 12.2533C19.4477 12.2533 19 12.701 19 13.2533V18.1716L18.9949 18.3478C18.9037 19.9227 17.5977 21.1716 16 21.1716H6L5.82373 21.1665C4.24892 21.0752 3 19.7693 3 18.1716V8.17157L3.00509 7.9953C3.09634 6.42049 4.40232 5.17157 6 5.17157H10.0308C10.5831 5.17157 11.0308 4.72385 11.0308 4.17157Z"
                                    fill="currentColor"/>
                            </svg>
                            ${t("edit_profile")}
                        </button>
                    </div>

                    <div class="up-form-grid">
                        <div class="up-form-group">
                            <label>${t("full_name")}</label>
                            <input class="up-input input" id="up-username" type="text"
                                value="${user.username || ""}" disabled/>
                        </div>
                        <div class="up-form-group">
                            <label>${t("email_address")}</label>
                            <input class="up-input input" id="up-email" type="email"
                                value="${user.email || ""}" disabled/>
                        </div>
                        <div class="up-form-group">
                            <label>${t("mobile_number")}</label>
                            <input class="up-input input" id="up-tel" type="tel"
                                value="${user.tel || ""}" disabled/>
                        </div>
                        <div class="up-form-group">
                            <label id="up-pwd-label">${t("password")}</label>
                            <input class="up-input input" id="up-password" type="password"
                                value="" placeholder="********" disabled/>
                        </div>
                        <div class="up-form-group">
                            <label>${t("gender")}</label>
                            <select class="up-input up-select input" id="up-gender" disabled>
                                <option value="" disabled ${!user.gender ? "selected" : ""}>${t("select_gender")}</option>
                                <option value="Male"   ${user.gender === "Male" ? "selected" : ""}>${t("male")}</option>
                                <option value="Female" ${user.gender === "Female" ? "selected" : ""}>${t("female")}</option>
                            </select>
                        </div>
                        <div class="up-form-group">
                            <label>${t("age")}</label>
                            <input class="up-input input" id="up-age" type="number"
                                value="${user.age || ""}" disabled/>
                        </div>
                        <div class="up-form-group">
                            <label>${t("position")}</label>
                            <input class="up-input input" id="up-position" type="text"
                                value="${user.position || ""}" disabled/>
                        </div>
                        <div class="up-form-group">
                            <label>${t("level")}</label>
                            <input class="up-input input" id="up-level" type="text"
                                value="${user.level || ""}" disabled/>
                        </div>
                    </div>

                    <div class="up-form-footer">
                        <button class="up-save-btn hidden" id="up-save-btn">${t("save_changes")}</button>
                        <button class="up-cancel-btn hidden" id="up-cancel-btn">${t("cancel")}</button>
                    </div>
                </div>

            </main>
        </div>
    </div>`;

  // ── DOM refs ──────────────────────────────────────────
  const editBtn = document.getElementById("up-edit-btn");
  const saveBtn = document.getElementById("up-save-btn");
  const cancelBtn = document.getElementById("up-cancel-btn");
  const avatarBtn = document.getElementById("up-avatar-btn");
  const avatarInput = document.getElementById("up-avatar-input");

  const allInputs = document.querySelectorAll(".up-input");

  let originalValues = {};

  // ── Edit ─────────────────────────────────────────────
  editBtn.onclick = () => {
    allInputs.forEach((inp) => {
      originalValues[inp.id] = inp.value;
      inp.disabled = false;
    });
    const pwdInput = document.getElementById("up-password");
    pwdInput.placeholder = t("new_password");
    document.getElementById("up-pwd-label").innerText = t("change_password");

    saveBtn.classList.remove("hidden");
    cancelBtn.classList.remove("hidden");
    editBtn.style.display = "none";
  };

  // ── Cancel ───────────────────────────────────────────
  cancelBtn.onclick = () => {
    allInputs.forEach((inp) => {
      inp.value = originalValues[inp.id] ?? inp.value;
      inp.disabled = true;
    });
    const pwdInput = document.getElementById("up-password");
    pwdInput.value = "";
    pwdInput.placeholder = "********";
    document.getElementById("up-pwd-label").innerText = t("password");

    saveBtn.classList.add("hidden");
    cancelBtn.classList.add("hidden");
    editBtn.style.display = "";
  };

  // ── Save ─────────────────────────────────────────────
  saveBtn.onclick = async () => {
    const uId = user.userId || user._id;
    const passwordVal = document.getElementById("up-password").value;
    const data = {
      username: document.getElementById("up-username").value,
      email: document.getElementById("up-email").value,
      tel: document.getElementById("up-tel").value,
      gender: document.getElementById("up-gender").value,
      age: document.getElementById("up-age").value,
      position: document.getElementById("up-position").value,
      level: document.getElementById("up-level").value,
    };

    if (passwordVal) {
      data.password = passwordVal;
    }

    try {
      const res = await fetch(`${API_URL}/api/users/${uId}`, {
        method: "PUT",
        headers: getAuthHeaders(),
        credentials: "include",
        body: JSON.stringify(data),
      });

      if (res.ok) {
        const updatedUser = await res.json();
        setCurrentUser(updatedUser);

        saveBtn.textContent = t("saved");
        saveBtn.classList.add("up-saved");
        allInputs.forEach((inp) => (inp.disabled = true));

        setTimeout(() => {
          saveBtn.classList.remove("up-saved");
          saveBtn.textContent = t("save_changes");
          saveBtn.classList.add("hidden");
          cancelBtn.classList.add("hidden");
          editBtn.style.display = "";
          window.location.reload();
        }, 1400);
      } else {
        const err = await res.json();
        alert(err.message || "Error updating profile");
      }
    } catch (err) {
      console.error(err);
      alert("Connection error");
    }
  };

  // ── Avatar upload ─────────────────────────────────────
  avatarBtn.onclick = () => avatarInput.click();
  avatarInput.onchange = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = async (ev) => {
      const base64 = ev.target.result;
      const uId = user.userId || user._id;

      try {
        const res = await fetch(`${API_URL}/api/user-photos/upload`, {
          method: "POST",
          headers: getAuthHeaders(),
          credentials: "include",
          body: JSON.stringify({
            userId: uId,
            fileType: "image",
            fileData: base64,
          }),
        });

        if (res.ok) {
          document.querySelector(".up-avatar-img").src = base64;

          // Update cache and Sidebar
          const updatedUser = { ...user, avatar: base64 };
          setCurrentUser(updatedUser);

          const sideAvatar = document.querySelector(".nav-user-avatar");
          if (sideAvatar) sideAvatar.src = base64;
        } else {
          alert("Failed to upload avatar");
        }
      } catch (err) {
        console.error(err);
        alert("Upload error");
      }
    };
    reader.readAsDataURL(file);
  };
}

// ── Nav button logic removed (handled by navigation.js) ──
