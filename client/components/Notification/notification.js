/**
 * Snackbar Notification System (MUI style)
 */

let snackbarContainer = null;

const ensureContainer = () => {
  if (snackbarContainer) return snackbarContainer;

  snackbarContainer = document.createElement("div");
  snackbarContainer.className = "snackbar-container";
  document.body.appendChild(snackbarContainer);
  return snackbarContainer;
};

/**
 * Shows a snackbar notification
 * @param {string} message - The message to show
 * @param {'success' | 'error' | 'info' | 'warning'} type - The type of notification
 * @param {number} duration - How long to show the notification (ms)
 */
export const showNotification = (message, type = "info", duration = 4000) => {
  const container = ensureContainer();

  const snackbar = document.createElement("div");
  snackbar.className = `snackbar ${type}`;

  const icons = {
    success: `<svg width="20" height="20" fill="none" viewBox="0 0 24 24"><path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z" fill="currentColor"/></svg>`,
    error: `<svg width="20" height="20" fill="none" viewBox="0 0 24 24"><path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 15h-2v-2h2v2zm0-4h-2V7h2v6z" fill="currentColor"/></svg>`,
    info: `<svg width="20" height="20" fill="none" viewBox="0 0 24 24"><path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 15h-2v-6h2v6zm0-8h-2V7h2v2z" fill="currentColor"/></svg>`,
    warning: `<svg width="20" height="20" fill="none" viewBox="0 0 24 24"><path d="M1 21h22L12 2 1 21zm12-3h-2v-2h2v2zm0-4h-2v-4h2v4z" fill="currentColor"/></svg>`,
  };

  snackbar.innerHTML = `
    <div class="snackbar-content">
      <div class="snackbar-icon">${icons[type] || icons.info}</div>
      <span>${message}</span>
    </div>
    <button class="snackbar-close">✕</button>
  `;

  container.appendChild(snackbar);

  const close = () => {
    snackbar.classList.add("hiding");
    setTimeout(() => {
      if (snackbar.parentNode) {
        container.removeChild(snackbar);
      }
      if (container.children.length === 0 && snackbarContainer) {
        if (snackbarContainer.parentNode) {
          document.body.removeChild(snackbarContainer);
        }
        snackbarContainer = null;
      }
    }, 400); // 400ms matches CSS animation
  };

  snackbar.querySelector(".snackbar-close").addEventListener("click", close);

  if (duration > 0) {
    setTimeout(close, duration);
  }
};
