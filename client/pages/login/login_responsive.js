/**
 * Login/Register sahifasining responsive logikasi (JS qismi).
 * Asosan CSS orqali media query'lar bajarilgan (responsive.css).
 * Agar kelajakda mobil va desktop uchun alohida JS logikasi yoki DOM o'zgarishlari kerak bo'lsa, ushbu faylda yoziladi.
 */

export function initResponsiveLogic() {
  function handleResize() {
    const width = window.innerWidth;
    if (width <= 768) {
      // Mobil qurilma uchun maxsus JS kodlar (masalan kelajakda formani boshqacha render qilish)
    } else if (width <= 992) {
      // Tablet uchun maxsus JS kodlar
    } else {
      // Desktop
    }
  }

  // Sahifa yuklanganda va oynaning o'lchami o'zgarganda ishlaydi
  window.addEventListener("resize", handleResize);
  handleResize();
}
