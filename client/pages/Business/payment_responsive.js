/**
 * Payment Responsive Logic for Mobile Devices
 */

export const initResponsive = (showView, setDPage, renderDocsFull) => {
  // Mobile barchasi link click
  const barchasiBtn = document.getElementById("mobile-barchasi");
  if (barchasiBtn) {
    barchasiBtn.addEventListener("click", () => {
      showView("view-docs");
      setDPage(1);
      renderDocsFull();
    });
  }

  // Handle Swipe/Touch for Carousel on Mobile
  const carouselTrack = document.getElementById("carousel-track");
  if (carouselTrack) {
    let startX = 0;
    let isSwiping = false;

    carouselTrack.addEventListener("touchstart", (e) => {
      startX = e.touches[0].clientX;
      isSwiping = true;
    }, { passive: true });

    carouselTrack.addEventListener("touchend", (e) => {
      if (!isSwiping) return;
      const endX = e.changedTouches[0].clientX;
      const diffX = startX - endX;

      // Threshold of 50px
      if (Math.abs(diffX) > 50) {
        if (diffX > 0) {
          // Swipe Left -> Next
          document.getElementById("c-next")?.click();
        } else {
          // Swipe Right -> Prev
          document.getElementById("c-prev")?.click();
        }
      }
      isSwiping = false;
    }, { passive: true });
  }
};

export const bindMiniRowClicks = (el, openReceiptModal, openPaymentModal) => {
  el.querySelectorAll(".mini-table-row").forEach((row) => {
    row.addEventListener("click", () => {
      if (window.innerWidth <= 1024) {
        const btn = row.querySelector(".receipt-btn") || row.querySelector(".send-btn");
        if (btn) {
          const tid = btn.dataset.tid;
          if (btn.classList.contains("receipt-btn")) {
            openReceiptModal(tid);
          } else if (btn.classList.contains("send-btn")) {
            openPaymentModal(tid);
          }
        }
      }
    });
  });
};

export const bindFullRowClicks = (el, openReceiptModal, openPaymentModal) => {
  el.querySelectorAll(".biz-doc-row-wrap").forEach((row) => {
    row.addEventListener("click", () => {
      if (window.innerWidth <= 1024) {
        const btn = row.querySelector(".receipt-btn") || row.querySelector(".send-btn");
        if (btn) {
          const tid = btn.dataset.tid;
          if (btn.classList.contains("receipt-btn")) {
            openReceiptModal(tid);
          } else if (btn.classList.contains("send-btn")) {
            openPaymentModal(tid);
          }
        }
      }
    });
  });
};
