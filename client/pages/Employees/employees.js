// employees.js
import {
  openPermissionsModal,
  getPermissions,
  applyPermissions,
} from "./permission.js";
import { translations } from "../Employees/translations.js";

let currentLang = localStorage.getItem("language") || "uz";
const t = (key) => translations[currentLang][key] || key;

export const EmployeesPage = `
    <div class="employees-page">
        <div class="employees-header">
            <h2 id="employee-count-title">${t("employees")} (0)</h2>
            <button class="btn add-employee-btn">${t("add_employees")}</button>
        </div>
        <div id="employees-list"></div>
        <div class="pagination" id="pagination"></div>
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
                            <select id="emp-gender">
                                <option value="" disabled selected>${t("select_gander")}</option>
                                <option value="Male">${t("male")}</option>
                                <option value="Female">${t("famale")}</option>
                            </select>
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
            <h3>O'chirishni tasdiqlaysizmi?</h3>
            <div class="delete-modal-actions modal-actions">
                <button id="cancelDelete"  class="btn-cancel">Yo'q</button>
                <button id="confirmDelete" class="btn-delete-confirm">Ha</button>
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

  const ITEMS_PER_PAGE = 4;
  let currentPageNum = 1;
  let editIndex = null;
  let indexToDelete = null;
  let currentImage = "./assets/images/User-avatar.png";

  avatarInput.onchange = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      currentImage = ev.target.result;
      modalAvatarImg.src = currentImage;
    };
    reader.readAsDataURL(file);
  };

  // ── Render ────────────────────────────────────────────────────
  async function renderEmployees() {
    let users = [];
    try {
      const res = await fetch("http://localhost:5000/api/users");
      if (res.ok) users = await res.json();
    } catch (e) {
      console.error(e);
    }
    window.usersData = users; // Cache for edit

    // JORIY userning permissionini tekshiramiz (bir marta fetch qilinadi)
    const cu = JSON.parse(localStorage.getItem("currentUser") || "null");
    const myPerms = cu ? await getPermissions(cu.userId || cu._id) : null;

    list.innerHTML = "";
    employeeCountTitle.innerText = `${t("employees")} (${users.length})`;

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
      if (myPerms && myPerms["emp_perm_btn"] !== false) {
        const label =
          currentLang === "ru"
            ? "Ограничения"
            : currentLang === "en"
              ? "Permissions"
              : "Cheklovlar";
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
                        <img id="avatar-${u.userId || u._id}" src="./assets/images/User-avatar.png" alt="${u.username || "User"}"/>
                        <span class="emp-avatar-dot"></span>
                    </div>
                    <div class="name-email-box">
                        <span class="username">${u.username || "—"}</span>
                        <span class="useremail">${u.email || "—"}</span>
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

      // Fetch avatar
      const img = document.getElementById(`avatar-${u.userId || u._id}`);
      if (img) img.classList.add("image-loading");

      fetch(`http://localhost:5000/api/user-photos/${u.userId || u._id}`)
        .then((r) => (r.ok ? r.json() : null))
        .then((f) => {
          if (f && f.fileData && img) {
            const tempImg = new Image();
            tempImg.src = f.fileData;
            tempImg.onload = () => {
              img.src = f.fileData;
              img.classList.remove("image-loading");
              img.classList.add("image-loaded");
            };
          } else if (img) {
            img.classList.remove("image-loading");
            img.classList.add("image-loaded");
          }
        })
        .catch((err) => {
          console.error(err);
          if (img) {
            img.classList.remove("image-loading");
            img.classList.add("image-loaded");
          }
        });
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
    for (let i = 1; i <= totalPages; i++) {
      const btn = document.createElement("button");
      btn.innerText = i;
      if (i === currentPageNum) btn.classList.add("active");
      btn.onclick = () => {
        currentPageNum = i;
        renderEmployees();
      };
      pagination.appendChild(btn);
    }
  }

  function attachEvents() {
    document.querySelectorAll(".emp-action-btn--edit").forEach((btn) => {
      btn.onclick = () => openEdit(parseInt(btn.dataset.idx));
    });
    document.querySelectorAll(".emp-action-btn--delete").forEach((btn) => {
      btn.onclick = () => deleteEmployee(parseInt(btn.dataset.idx));
    });
    document.querySelectorAll(".emp-perm-btn[data-userid]").forEach((btn) => {
      btn.onclick = (e) => {
        e.stopPropagation();
        openPermissionsModal(
          btn.dataset.userid,
          btn.dataset.username,
          currentLang,
        );
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
      genderInput.value = u.gender || "";
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
    currentImage = "./assets/images/User-avatar.png";
    modalAvatarImg.src = currentImage;

    try {
      const res = await fetch(
        `http://localhost:5000/api/user-photos/${u.userId || u._id}`,
      );
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
    const uId =
      editIndex !== null
        ? users[editIndex].userId || users[editIndex]._id
        : Date.now().toString();

    const passwordVal = document.getElementById("emp-password").value;

    const data = {
      userId: uId,
      username: document.getElementById("emp-username").value,
      email: document.getElementById("emp-email").value,
      tel: document.getElementById("emp-tel").value,
      gender: document.getElementById("emp-gender").value,
      age: document.getElementById("emp-age").value,
      position: document.getElementById("emp-position").value,
      level: document.getElementById("emp-level").value,
    };

    if (passwordVal) {
      data.password = passwordVal;
    }

    const method = editIndex !== null ? "PUT" : "POST";
    const url =
      editIndex !== null
        ? `http://localhost:5000/api/users/${uId}`
        : "http://localhost:5000/api/users/register";

    try {
      const btnOriginalText = saveBtn.innerText;
      saveBtn.disabled = true;
      saveBtn.innerHTML = `<span class="spinner" style="width:16px; height:16px; border-width:2px; display:inline-block; vertical-align:middle; margin-right:8px;"></span> ${btnOriginalText}`;

      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });

      if (res.ok) {
        // Upload avatar
        if (
          currentImage &&
          currentImage !== "./assets/images/User-avatar.png"
        ) {
          await fetch("http://localhost:5000/api/user-photos/upload", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              userId: uId,
              fileType: "image",
              fileData: currentImage,
            }),
          });
        }
        modal.style.display = "none";

        const responseData = await res.json();
        const currentUser = JSON.parse(localStorage.getItem("currentUser"));
        if (
          currentUser &&
          editIndex !== null &&
          users[editIndex].email === currentUser.email
        ) {
          localStorage.setItem("currentUser", JSON.stringify(responseData));
        }

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

    [
      usernameInput,
      emailInput,
      passwordInput,
      telInput,
      ageInput,
      positionInput,
      levelInput,
    ].forEach((i) => (i.value = ""));
    genderInput.value = "";
    currentImage = "./assets/images/User-avatar.png";
    passwordInput.placeholder = t("password");
    document.getElementById("pwd-label").innerText = t("password");
    modalAvatarImg.src = currentImage;
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
      const res = await fetch(`http://localhost:5000/api/users/${uId}`, {
        method: "DELETE",
      });
      if (res.ok) {
        deleteModal.style.display = "none";
        const currentUser = JSON.parse(localStorage.getItem("currentUser"));
        if (currentUser && userToDelete.email === currentUser.email) {
          localStorage.removeItem("currentUser");
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
    }
  };

  window.onclick = (e) => {
    if (e.target === modal) modal.style.display = "none";
    if (e.target === deleteModal) deleteModal.style.display = "none";
  };

  renderEmployees();
}
