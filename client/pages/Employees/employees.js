// employees.js
import { API_URL, getCurrentUser, getAuthHeaders } from "../../assets/js/api.js";
import { openPermissionsModal, getPermissions, applyPermissions, checkPermission } from "./permission.js";
import { translations } from "../Employees/translations.js";

import { getCurrentLang, createTranslationHelper } from "../../assets/js/i18n.js";

const t = createTranslationHelper(translations);
import { initEmployeesResponsive } from "./employees_responsive.js";

export const EmployeesPage = () => `
    <div class="employees-page">
        <div class="employees-header">
            <h2 id="employee-count-title">${t("employees")}</h2>
            <div class="employees-header-right">
                <div class="emp-count-badge" id="emp-count-badge" title="Total Employees">
                    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
                        <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"></path>
                        <circle cx="9" cy="7" r="4"></circle>
                        <path d="M22 21v-2a4 4 0 0 0-3-3.87"></path>
                        <path d="M16 3.13a4 4 0 0 1 0 7.75"></path>
                    </svg>
                    <span id="emp-badge-count">0</span>
                </div>
                <button class="btn add-employee-btn">${t("add_employees")}</button>
            </div>
        </div>
        <div id="employees-list"></div>
        <div class="employees-footer">
            <div class="rows-per-page-container" id="rows-per-page-container">
                <button class="rows-selector-btn" id="rows-selector-btn">
                    <span>${t("show")}: <span id="current-rows-val">10</span></span>
                    <svg class="chevron" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round">
                        <polyline points="6 9 12 15 18 9"></polyline>
                    </svg>
                </button>
                <div class="emp-rows-dropdown" id="emp-rows-dropdown">
                    <div class="emp-rows-option active" data-val="10">10</div>
                    <div class="emp-rows-option" data-val="15">15</div>
                    <div class="emp-rows-option" data-val="20">20</div>
                    <div class="emp-rows-option" data-val="25">25</div>
                    <div class="emp-rows-option" data-val="30">30</div>
                </div>
            </div>
            <div class="pagination" id="pagination"></div>
        </div>
    </div>

    <div class="modal" id="employeeModal" style="display:none;">
        <div class="modal-content">
            <div class="modal-header">
                <h3 id="modalTitle">${t("add_employees")}</h3>
            </div>
            
            <div class="modal-layout">
                <aside class="modal-aside">
                    <div class="avatar-upload-wrapper">
                        <div class="avatar-preview">
                            <img id="modal-avatar-img" src="./assets/images/User-avatar.png" alt="Preview" class="image-loaded"/>
                        </div>
                        <label for="avatar-input" class="upload-label">${t("change_photo")}</label>
                        <input type="file" id="avatar-input" accept="image/*" style="display:none;"/>
                    </div>
                    <div id="modal-aside-info" style="width: 100%; display: flex; flex-direction: column; gap: 10px;">
                        <!-- Quick info or skeletons will go here -->
                    </div>
                </aside>

                <main class="modal-main modal-body">
                    <div class="modal-form-grid" id="modal-form-content">
                        <div class="form-group">
                            <label>${t("full_name")}</label>
                            <input class="input" id="emp-username" placeholder="${t("full_name")}"/>
                        </div>
                        <div class="form-group">
                            <label>${t("email_address")}</label>
                            <input class="input" id="emp-email" placeholder="${t("email_address")}"/>
                        </div>
                        <div class="form-group">
                            <label id="pwd-label">${t("password")}</label>
                            <input class="input" id="emp-password" type="password" placeholder="${t("password")}"/>
                        </div>
                        <div class="form-group">
                            <label>${t("phone_number")}</label>
                            <input class="input" id="emp-tel" placeholder="${t("phone_number")}"/>
                        </div>
                        <div class="form-group">
                            <label>${t("gender")}</label>
                            <div class="custom-gender-select" id="emp-gender-select">
                                <div class="selected-gender" id="selected-gender-val">
                                    <span id="selected-gender-text">${t("select_gander")}</span>
                                    <svg class="chevron" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round">
                                        <polyline points="6 9 12 15 18 9"></polyline>
                                    </svg>
                                </div>
                                <div class="gender-options" id="gender-options">
                                    <div class="gender-option" data-value="Male">${t("male")}</div>
                                    <div class="gender-option" data-value="Female">${t("famale")}</div>
                                </div>
                            </div>
                            <input type="hidden" id="emp-gender" value="" />
                        </div>
                        <div class="form-group">
                            <label>${t("age")}</label>
                            <input class="input" id="emp-age" type="number" placeholder="${t("age")}"/>
                        </div>
                        <div class="form-group">
                            <label>${t("job_position")}</label>
                            <input class="input" id="emp-position" placeholder="${t("job_position")}"/>
                        </div>
                        <div class="form-group">
                            <label>${t("level")}</label>
                            <input class="input" id="emp-level" placeholder="${t("level")}"/>
                        </div>
                    </div>
                </main>
            </div>

            <div class="modal-actions" style="padding: 20px 36px; background: #fff; border-top: 1px solid #f0f2f5;">
                <button id="cancelModal"  class="btn-cancel">${t("cancel")}</button>
                <button id="saveEmployee" class="btn-save">${t("save")}</button>
            </div>
        </div>
    </div>

    <div class="modal" id="deleteConfirmModal" style="display:none;">
        <div class="modal-content delete-modal">
            <div class="todo-del-icon-wrap">
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <path d="M3 6h18M8 6V4h8v2M19 6l-1 14a2 2 0 01-2 2H8a2 2 0 01-2-2L5 6" stroke-linecap="round" stroke-linejoin="round"/>
                </svg>
            </div>
            <h3 class="todo-del-title">O'chirish?</h3>
            <p class="todo-del-desc">Ushbu xodimni ro'yxatdan o'chirib yubormoqchimisiz ?</p>
            <div class="delete-modal-actions modal-actions">
                <button id="cancelDelete"  class="btn-cancel">Bekor qilish</button>
                <button id="confirmDelete" class="btn-delete-confirm">O'chirish</button>
            </div>
        </div>
    </div>
`;

export function initEmployeesPage() {
  const list = document.getElementById("employees-list");
  const modal = document.getElementById("employeeModal");
  const modalTitle = document.getElementById("modalTitle");
  const employeeCountTitle = document.getElementById("employee-count-title");
  const pagination = document.getElementById("pagination");
  const usernameInput = document.getElementById("emp-username");
  const emailInput = document.getElementById("emp-email");
  const passwordInput = document.getElementById("emp-password");
  const telInput = document.getElementById("emp-tel");
  const genderInput = document.getElementById("emp-gender");
  const ageInput = document.getElementById("emp-age");
  const positionInput = document.getElementById("emp-position");
  const levelInput = document.getElementById("emp-level");
  const avatarInput = document.getElementById("avatar-input");
  const modalAvatarImg = document.getElementById("modal-avatar-img");
  const saveBtn = document.getElementById("saveEmployee");
  const cancelBtn = document.getElementById("cancelModal");
  const addBtn = document.querySelector(".add-employee-btn");
  const deleteModal = document.getElementById("deleteConfirmModal");
  const confirmDeleteBtn = document.getElementById("confirmDelete");
  const cancelDeleteBtn = document.getElementById("cancelDelete");

  let ITEMS_PER_PAGE = 10;
  let currentPageNum = 1;
  let editIndex = null;
  let indexToDelete = null;
  let currentImage = "/assets/images/User-avatar.png";

  avatarInput.onchange = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      currentImage = ev.target.result;
      modalAvatarImg.src = currentImage;
      modalAvatarImg.classList.add("image-loaded");
    };
    reader.readAsDataURL(file);
  };

  genderInput.onchange = () => {
    const g = genderInput.value;
    // Faqat agar foydalanuvchi o'zi rasm yuklamagan bo'lsa (ya'ni rasm base64 bo'lmasa) genderga qarab o'zgartiramiz
    if (!currentImage.startsWith("data:image")) {
      currentImage = g === "Male" ? "/assets/images/user-avatar-male.png" : g === "Female" ? "/assets/images/user-avatar-female.png" : "/assets/images/User-avatar.png";
      modalAvatarImg.src = currentImage;
    }
  };

  // ── Render ────────────────────────────────────────────────────
  async function renderEmployees() {
    list.innerHTML = `
        <div style="display:flex; justify-content:center; align-items:center; padding:40px; width:100%;">
            <div class="spinner" style="width:36px; height:36px;"></div>
        </div>`;

    let users = [];
    try {
      const res = await fetch(`${API_URL}/api/users`, {
        headers: getAuthHeaders(),
        credentials: "include",
      });

      if (res.ok) users = await res.json();
    } catch (e) {
      console.error(e);
    }
    window.usersData = users; // Cache for edit

    // JORIY userning permissionini tekshiramiz (bir marta fetch qilinadi)
    const cu = getCurrentUser();
    const myPerms = cu ? await getPermissions(cu.userId || cu._id) : null;

    list.innerHTML = "";
    employeeCountTitle.innerText = t("employees");
    const empBadgeCount = document.getElementById("emp-badge-count");
    if (empBadgeCount) empBadgeCount.innerText = users.length;

    const start = (currentPageNum - 1) * ITEMS_PER_PAGE;
    const pageUsers = users.slice(start, start + ITEMS_PER_PAGE);

    if (pageUsers.length === 0 && currentPageNum > 1) {
      currentPageNum--;
      renderEmployees();
      return;
    }

    pageUsers.forEach((u, idx) => {
      const realIndex = start + idx;
      const card = document.createElement("div");
      card.className = "employee-card";

      let permBtnHtml = "";
      if (myPerms && checkPermission(myPerms, "emp_perm_btn")) {
        const lang = getCurrentLang();
        const label = lang === "ru" ? "Ограничения" : lang === "en" ? "Permissions" : "Cheklovlar";
        permBtnHtml = `
            <button class="emp-perm-btn" data-userid="${u.userId || u._id}" data-username="${u.username}">
                <svg width="13" height="13" fill="none" viewBox="0 0 24 24">
                    <rect x="3" y="11" width="18" height="11" rx="2" stroke="currentColor" stroke-width="2"/>
                    <path d="M7 11V7a5 5 0 0110 0v4" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>
                </svg>
                ${label}
            </button>`;
      }

      card.innerHTML = `
            <div class="employee-card-inner">
                <div class="employee-box">
                    <div class="emp-avatar-wrap">
                        <img id="avatar-${u.userId || u._id}" src="${u.gender === "Male" ? "/assets/images/user-avatar-male.png" : u.gender === "Female" ? "/assets/images/user-avatar-female.png" : "/assets/images/User-avatar.png"}" alt="${u.username || "User"}"/>
                        <span class="emp-avatar-dot"></span>
                    </div>

                    <div class="name-email-box">
                        <span class="username">${u.username || "—"}</span>
                        <span class="useremail">${u.email || "—"}</span>
                    </div>

                    <div class="emp-chevron-wrap">
                        <svg class="emp-chevron" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
                            <polyline points="6 9 12 15 18 9"></polyline>
                        </svg>
                    </div>
                </div>
                <div class="user-main-info">
                    <div class="info-chip">
                        <span class="info-chip-label">${t("gender")}</span>
                        <span class="info-chip-value">${u.gender || "—"}</span>
                    </div>
                    <div class="info-chip">
                        <span class="info-chip-label">${t("age")}</span>
                        <span class="info-chip-value">${u.age || "—"}</span>
                    </div>
                    <div class="info-chip info-chip">
                        <span class="info-chip-label">${t("position")}</span>
                        <span class="info-chip-value">${u.position || "—"}</span>
                    </div>
                    <div class="info-chip">
                        <span class="info-chip-label">${t("level_mini") || "Level"}</span>
                        <span class="info-chip-value">${u.level || "—"}</span>
                    </div>
                </div>
                <div class="employee-actions">
                    <button data-perm="emp_edit_btn" class="emp-action-btn emp-action-btn--edit" data-idx="${realIndex}" title="${t("edit")}">
                        <svg width="15" height="15" viewBox="0 0 24 24" fill="none">
                            <path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7"
                                stroke="currentColor" stroke-width="2" stroke-linecap="round"/>
                            <path d="M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z"
                                stroke="currentColor" stroke-width="2" stroke-linecap="round"/>
                        </svg>
                    </button>
                    <button data-perm="emp_delete_btn" class="emp-action-btn emp-action-btn--delete" data-idx="${realIndex}" title="${t("delete")}">
                        <svg width="15" height="15" viewBox="0 0 24 24" fill="none">
                            <path d="M3 6h18M8 6V4h8v2M19 6l-1 14a2 2 0 01-2 2H8a2 2 0 01-2-2L5 6"
                                stroke="currentColor" stroke-width="2" stroke-linecap="round"/>
                        </svg>
                    </button>
                    ${permBtnHtml}
                </div>
            </div>`;
      list.appendChild(card);
    });

    renderPagination(users.length);
    attachEvents();

    // ── Apply permissions to newly rendered cards ──
    if (cu) {
      applyPermissions(cu.userId || cu._id);
    }
  }

  function renderPagination(total) {
    pagination.innerHTML = "";
    const totalPages = Math.ceil(total / ITEMS_PER_PAGE) || 1;

    // Previous button
    const prevBtn = document.createElement("button");
    prevBtn.innerHTML = `
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
            <polyline points="15 18 9 12 15 6"></polyline>
        </svg>`;
    prevBtn.disabled = currentPageNum === 1;
    prevBtn.onclick = () => {
      if (currentPageNum > 1) {
        currentPageNum--;
        renderEmployees();
      }
    };
    pagination.appendChild(prevBtn);

    // Page buttons logic: max 3 numbers
    let startPage, endPage;
    if (totalPages <= 3) {
      startPage = 1;
      endPage = totalPages;
    } else {
      if (currentPageNum === 1) {
        startPage = 1;
        endPage = 3;
      } else if (currentPageNum === totalPages) {
        startPage = totalPages - 2;
        endPage = totalPages;
      } else {
        startPage = currentPageNum - 1;
        endPage = currentPageNum + 1;
      }
    }

    for (let i = startPage; i <= endPage; i++) {
      const btn = document.createElement("button");
      btn.innerText = i;
      if (i === currentPageNum) btn.classList.add("active");
      btn.onclick = () => {
        currentPageNum = i;
        renderEmployees();
      };
      pagination.appendChild(btn);
    }

    // Next button
    const nextBtn = document.createElement("button");
    nextBtn.innerHTML = `
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
            <polyline points="9 18 15 12 9 6"></polyline>
        </svg>`;
    nextBtn.disabled = currentPageNum === totalPages;
    nextBtn.onclick = () => {
      if (currentPageNum < totalPages) {
        currentPageNum++;
        renderEmployees();
      }
    };
    pagination.appendChild(nextBtn);
  }

  function attachEvents() {
    // Accordion toggle on mobile
    document.querySelectorAll(".employee-card").forEach((card) => {
      const box = card.querySelector(".employee-box");
      if (box) {
        box.onclick = () => {
          if (window.innerWidth <= 992) {
            const isExpanded = card.classList.contains("expanded");
            // Close other cards for accordion behavior
            document.querySelectorAll(".employee-card").forEach((c) => {
              if (c !== card) c.classList.remove("expanded");
            });
            card.classList.toggle("expanded", !isExpanded);
          }
        };
      }
    });

    document.querySelectorAll(".emp-action-btn--edit").forEach((btn) => {
      btn.onclick = () => openEdit(parseInt(btn.dataset.idx));
    });
    document.querySelectorAll(".emp-action-btn--delete").forEach((btn) => {
      btn.onclick = () => deleteEmployee(parseInt(btn.dataset.idx));
    });
    document.querySelectorAll(".emp-perm-btn[data-userid]").forEach((btn) => {
      btn.onclick = (e) => {
        e.stopPropagation();
        openPermissionsModal(btn.dataset.userid, btn.dataset.username, getCurrentLang());
      };
    });
  }

  // permissions-updated → list qayta render
  document.addEventListener("permissions-updated", () => renderEmployees());

  async function openEdit(index) {
    const users = window.usersData || [];
    const u = users[index];
    editIndex = index;
    modalTitle.innerText = t("edit_employees");

    // 1️⃣ Reset and show skeletons
    modal.style.display = "flex";
    const formContent = document.getElementById("modal-form-content");
    const asideInfo = document.getElementById("modal-aside-info");

    // Save original form content to restore after loading
    const originalFormHTML = formContent.innerHTML;

    formContent.innerHTML = `
        <div class="skeleton skeleton-input"></div>
        <div class="skeleton skeleton-input"></div>
        <div class="skeleton skeleton-input"></div>
        <div class="skeleton skeleton-input"></div>
        <div class="skeleton skeleton-input"></div>
        <div class="skeleton skeleton-input"></div>
        <div class="skeleton skeleton-input"></div>
        <div class="skeleton skeleton-input"></div>
    `;

    asideInfo.innerHTML = `
        <div class="skeleton skeleton-text" style="width: 100%"></div>
        <div class="skeleton skeleton-text" style="width: 100%"></div>
        <div class="skeleton skeleton-text" style="width: 100%"></div>
    `;

    modalAvatarImg.classList.add("image-loading");
    modalAvatarImg.classList.remove("image-loaded");

    // 2️⃣ Fill data (can be immediate from usersData)
    setTimeout(() => {
      formContent.innerHTML = originalFormHTML;

      // Re-get refs after innerHTML reset
      const usernameInput = document.getElementById("emp-username");
      const emailInput = document.getElementById("emp-email");
      const passwordInput = document.getElementById("emp-password");
      const telInput = document.getElementById("emp-tel");
      const genderInput = document.getElementById("emp-gender");
      const ageInput = document.getElementById("emp-age");
      const positionInput = document.getElementById("emp-position");
      const levelInput = document.getElementById("emp-level");

      usernameInput.value = u.username || "";
      emailInput.value = u.email || "";
      passwordInput.value = "";
      passwordInput.placeholder = t("new_password");
      document.getElementById("pwd-label").innerText = t("password_hint");
      telInput.value = u.tel || "";
      
      initCustomGenderSelect();
      setCustomGenderValue(u.gender || "");
      bindGenderChangeHandler(genderInput);
      ageInput.value = u.age || "";
      positionInput.value = u.position || "";
      levelInput.value = u.level || "";

      asideInfo.innerHTML = `
            <div style="text-align: center; color: #8892a4; font-size: 14px; font-weight: 600;">
                ${u.username || "—"}
            </div>
            <div style="text-align: center; color: #5b6ef5; font-size: 13px; font-weight: 700;">
                ${u.position || "—"}
            </div>
        `;
    }, 400); // Small fake delay for skeleton effect

    // 3️⃣ Fetch avatar with animation
    currentImage = u.gender === "Male" ? "./assets/images/user-avatar-male.png" : u.gender === "Female" ? "./assets/images/user-avatar-female.png" : "./assets/images/User-avatar.png";
    modalAvatarImg.src = currentImage;

    try {
      const res = await fetch(`${API_URL}/api/user-photos/${u.userId || u._id}`, {
        headers: getAuthHeaders(),
        credentials: "include",
      });

      if (res.ok) {
        const file = await res.json();
        if (file.fileData) {
          currentImage = file.fileData;
          // Smooth transition for image
          const tempImg = new Image();
          tempImg.src = currentImage;
          tempImg.onload = () => {
            modalAvatarImg.src = currentImage;
            modalAvatarImg.classList.remove("image-loading");
            modalAvatarImg.classList.add("image-loaded");
          };
        } else {
          modalAvatarImg.classList.remove("image-loading");
          modalAvatarImg.classList.add("image-loaded");
        }
      } else {
        modalAvatarImg.classList.remove("image-loading");
        modalAvatarImg.classList.add("image-loaded");
      }
    } catch (e) {
      modalAvatarImg.classList.remove("image-loading");
      modalAvatarImg.classList.add("image-loaded");
    }
  }

  saveBtn.onclick = async () => {
    const users = window.usersData || [];
    const uId = editIndex !== null ? users[editIndex].userId || users[editIndex]._id : Date.now().toString();

    const usernameInput = document.getElementById("emp-username");
    const emailInput = document.getElementById("emp-email");
    const telInput = document.getElementById("emp-tel");
    const passwordInput = document.getElementById("emp-password");

    // Validation
    let isValid = true;
    const requiredFields = [usernameInput, emailInput, telInput];

    // Agar yangi user bo'lsa parolni ham tekshirsa bo'ladi (ixtiyoriy)
    if (editIndex === null) requiredFields.push(passwordInput);

    requiredFields.forEach((input) => {
      if (!input.value.trim()) {
        input.classList.add("error-input");
        isValid = false;
      } else {
        input.classList.remove("error-input");
      }

      // Foydalanuvchi yozishni boshlasa qizil chiziqni olib tashlaymiz
      input.oninput = () => input.classList.remove("error-input");
    });

    if (!isValid) return;

    const data = {
      username: usernameInput.value,
      email: emailInput.value,
      tel: telInput.value,
      gender: document.getElementById("emp-gender").value,
      age: document.getElementById("emp-age").value ? parseInt(document.getElementById("emp-age").value) : null,
      position: document.getElementById("emp-position").value,
      level: document.getElementById("emp-level").value,
    };

    if (editIndex !== null) {
      data.userId = uId;
    }

    if (passwordInput.value) {
      data.password = passwordInput.value;
    }

    const method = editIndex !== null ? "PUT" : "POST";
    const url = editIndex !== null ? `${API_URL}/api/users/${uId}` : `${API_URL}/api/users/register`;

    try {
      const btnOriginalText = saveBtn.innerText;
      saveBtn.disabled = true;
      saveBtn.innerHTML = `<span class="spinner" style="width:16px; height:16px; border-width:2px; display:inline-block; vertical-align:middle; margin-right:8px;"></span> ${btnOriginalText}`;

      const res = await fetch(url, {
        method,
        headers: getAuthHeaders(),
        credentials: "include",
        body: JSON.stringify(data),
      });

      if (res.ok) {
        const savedUser = await res.json();
        const finalUserId = savedUser.userId || savedUser._id;

        // Upload avatar
        if (
          currentImage &&
          currentImage !== "./assets/images/User-avatar.png" &&
          currentImage !== "./assets/images/user-avatar-male.png" &&
          currentImage !== "./assets/images/user-avatar-female.png"
        ) {
          await fetch(`${API_URL}/api/user-photos/upload`, {
            method: "POST",
            headers: getAuthHeaders(),
            credentials: "include",
            body: JSON.stringify({
              userId: finalUserId,
              fileType: "image",
              fileData: currentImage,
            }),
          });
        }
        modal.style.display = "none";
        await renderEmployees();
      } else {
        const err = await res.json();
        alert(err.message || "Xato!");
      }

      saveBtn.disabled = false;
      saveBtn.innerHTML = btnOriginalText;
    } catch (e) {
      console.error(e);
      saveBtn.disabled = false;
      saveBtn.innerHTML = "Saqlash";
    }
  };

  cancelBtn.onclick = () => {
    modal.style.display = "none";
  };

  addBtn.onclick = () => {
    editIndex = null;
    modalTitle.innerText = t("add_employees");
    document.getElementById("modal-aside-info").innerHTML = "";

    // Re-get refs if they were lost during skeleton innerHTML change
    const usernameInput = document.getElementById("emp-username");
    const emailInput = document.getElementById("emp-email");
    const passwordInput = document.getElementById("emp-password");
    const telInput = document.getElementById("emp-tel");
    const genderInput = document.getElementById("emp-gender");
    const ageInput = document.getElementById("emp-age");
    const positionInput = document.getElementById("emp-position");
    const levelInput = document.getElementById("emp-level");

    [usernameInput, emailInput, passwordInput, telInput, ageInput, positionInput, levelInput].forEach((i) => (i.value = ""));
    initCustomGenderSelect();
    setCustomGenderValue("");
    bindGenderChangeHandler(genderInput);

    currentImage = "./assets/images/User-avatar.png";
    modalAvatarImg.src = currentImage;

    passwordInput.placeholder = t("password");
    document.getElementById("pwd-label").innerText = t("password");

    modalAvatarImg.classList.add("image-loaded");
    modalAvatarImg.classList.remove("image-loading");
    modal.style.display = "flex";
  };

  function deleteEmployee(index) {
    indexToDelete = index;
    deleteModal.style.display = "flex";
  }

  cancelDeleteBtn.onclick = () => {
    deleteModal.style.display = "none";
    indexToDelete = null;
  };

  confirmDeleteBtn.onclick = async () => {
    if (indexToDelete === null) return;
    const users = window.usersData || [];
    const userToDelete = users[indexToDelete];
    const uId = userToDelete.userId || userToDelete._id;

    try {
      confirmDeleteBtn.classList.add("loading");
      const res = await fetch(`${API_URL}/api/users/${uId}`, {
        method: "DELETE",
        headers: getAuthHeaders(),
        credentials: "include",
      });

      if (res.ok) {
        deleteModal.style.display = "none";
        const currentUser = getCurrentUser();
        if (currentUser && userToDelete.email === currentUser.email) {
          const { clearAuth } = await import("../../assets/js/api.js");
          clearAuth();
          window.location.href = "login.html";
          return;
        }
        const maxPage = Math.ceil((users.length - 1) / ITEMS_PER_PAGE) || 1;
        if (currentPageNum > maxPage) currentPageNum = maxPage;
        await renderEmployees();
        indexToDelete = null;
      } else {
        alert("O'chirishda xatolik yuz berdi");
      }
    } catch (e) {
      console.error(e);
    } finally {
      confirmDeleteBtn.classList.remove("loading");
    }
  };

  // Global Key Listeners for Modals
  window.addEventListener("keydown", (e) => {
    if (e.key === "Enter") {
      // Check which modal is open
      if (modal.style.display === "flex") {
        e.preventDefault();
        saveBtn.click();
      } else if (deleteModal.style.display === "flex") {
        e.preventDefault();
        confirmDeleteBtn.click();
      }
    }
    if (e.key === "Escape") {
      modal.style.display = "none";
      deleteModal.style.display = "none";
      // Permissions modal is in another file, but we can try to close it if it exists
      document.getElementById("perm-modal-overlay")?.remove();
    }
  });

  // ── Rows Per Page Dropdown Logic ──
  const rowsSelectorBtn = document.getElementById("rows-selector-btn");
  const rowsDropdown = document.getElementById("emp-rows-dropdown");
  const currentRowsVal = document.getElementById("current-rows-val");
  const rowsOptions = document.querySelectorAll(".emp-rows-option");

  rowsSelectorBtn.onclick = (e) => {
    e.stopPropagation();
    rowsDropdown.classList.toggle("active");
    const isOpen = rowsDropdown.classList.contains("active");
    const chevron = rowsSelectorBtn.querySelector(".chevron");
    if (chevron) chevron.style.transform = isOpen ? "rotate(180deg)" : "rotate(0deg)";
  };

  rowsOptions.forEach((opt) => {
    opt.onclick = () => {
      const val = parseInt(opt.dataset.val);
      ITEMS_PER_PAGE = val;
      currentRowsVal.innerText = val;

      rowsOptions.forEach((o) => o.classList.remove("active"));
      opt.classList.add("active");

      rowsDropdown.classList.remove("active");
      const chevron = rowsSelectorBtn.querySelector(".chevron");
      if (chevron) chevron.style.transform = "rotate(0deg)";

      currentPageNum = 1; // Reset to page 1
      renderEmployees();
    };
  });

  function bindGenderChangeHandler(input) {
    if (!input) return;
    input.onchange = () => {
      const g = input.value;
      if (!currentImage.startsWith("data:image")) {
        currentImage = g === "Male" ? "/assets/images/user-avatar-male.png" : g === "Female" ? "/assets/images/user-avatar-female.png" : "/assets/images/User-avatar.png";
        modalAvatarImg.src = currentImage;
      }
    };
  }

  function initCustomGenderSelect() {
    const selectEl = document.getElementById("emp-gender-select");
    if (!selectEl) return;
    const selected = selectEl.querySelector(".selected-gender");
    const options = selectEl.querySelector(".gender-options");
    const items = selectEl.querySelectorAll(".gender-option");
    const hiddenInput = document.getElementById("emp-gender");

    selected.onclick = (e) => {
      e.stopPropagation();
      const isOpen = options.classList.contains("active");
      options.classList.toggle("active", !isOpen);
      const chevron = selected.querySelector(".chevron");
      if (chevron) chevron.style.transform = !isOpen ? "rotate(180deg)" : "rotate(0deg)";
    };

    items.forEach((item) => {
      item.onclick = (e) => {
        e.stopPropagation();
        const val = item.dataset.value;
        hiddenInput.value = val;
        
        // Update selected text
        const textEl = document.getElementById("selected-gender-text");
        if (textEl) textEl.textContent = item.textContent;

        items.forEach((i) => i.classList.remove("active"));
        item.classList.add("active");

        options.classList.remove("active");
        const chevron = selected.querySelector(".chevron");
        if (chevron) chevron.style.transform = "rotate(0deg)";

        hiddenInput.dispatchEvent(new Event("change"));
      };
    });
  }

  function setCustomGenderValue(val) {
    const hiddenInput = document.getElementById("emp-gender");
    if (hiddenInput) hiddenInput.value = val;

    const selectEl = document.getElementById("emp-gender-select");
    if (!selectEl) return;

    const items = selectEl.querySelectorAll(".gender-option");
    const textEl = document.getElementById("selected-gender-text");

    let text = t("select_gander");
    items.forEach((item) => {
      if (item.dataset.value === val) {
        item.classList.add("active");
        text = item.textContent;
      } else {
        item.classList.remove("active");
      }
    });

    if (textEl) textEl.textContent = text;
  }

  window.onclick = (e) => {
    if (e.target === modal) modal.style.display = "none";
    if (e.target === deleteModal) deleteModal.style.display = "none";

    // Close rows dropdown if clicked outside
    if (rowsSelectorBtn && rowsDropdown && !rowsSelectorBtn.contains(e.target) && !rowsDropdown.contains(e.target)) {
      rowsDropdown.classList.remove("active");
      const chevron = rowsSelectorBtn.querySelector(".chevron");
      if (chevron) chevron.style.transform = "rotate(0deg)";
    }

    // Close custom gender dropdown if clicked outside
    const genderSelect = document.getElementById("emp-gender-select");
    const genderOptions = document.getElementById("gender-options");
    if (genderSelect && genderOptions && !genderSelect.contains(e.target) && !genderOptions.contains(e.target)) {
      genderOptions.classList.remove("active");
      const chevron = genderSelect.querySelector(".chevron");
      if (chevron) chevron.style.transform = "rotate(0deg)";
    }
  };

  // Initial bindings
  initCustomGenderSelect();
  bindGenderChangeHandler(genderInput);

  renderEmployees();
  initEmployeesResponsive();
}
