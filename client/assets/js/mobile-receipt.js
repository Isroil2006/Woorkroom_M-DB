(function() {
  const urlParams = new URLSearchParams(window.location.search);
  const receiptData = urlParams.get('receiptData');

  if (receiptData) {
    document.addEventListener("DOMContentLoaded", () => {
      const overlay = document.createElement("div");
      overlay.id = "mobile-interceptor";
      overlay.className = "active";
      
      const decoded = decodeURIComponent(receiptData);
      const lines = decoded.split('\n');
      let html = '<div class="mobile-receipt-card">';
      
      let title = "Tranzaksiya Cheki";
      if(lines.length > 0 && !lines[0].includes(':')) {
         title = lines[0].replace(/-/g, '').trim() || title;
      }
      html += '<h2>' + title + '</h2>';

      lines.forEach(line => {
         if (line.includes(':')) {
            const firstColon = line.indexOf(':');
            const label = line.substring(0, firstColon).trim();
            const val = line.substring(firstColon + 1).trim();
            html += '<div class="mobile-receipt-row"><span class="mobile-receipt-label">' + label + '</span><span class="mobile-receipt-val">' + val + '</span></div>';
         }
      });
      html += '</div>';
      overlay.innerHTML = html;

      document.body.appendChild(overlay);
      const container = document.querySelector(".container");
      if (container) container.style.display = "none";
      const globalLoader = document.getElementById("global-loader");
      if (globalLoader) globalLoader.style.display = "none";
    });
  }
})();
