console.log("✅ app.js loaded");
const scanAgainBtn = document.getElementById('scan-again');

function startScanner() {
  html5QrCode.start(
    { facingMode: "environment" },
    config,
    barcode => {
      html5QrCode.stop();
      checkVeganStatus(barcode);
      scanAgainBtn.style.display = 'inline-block';
    },
    errorMessage => {
      console.warn('Scan error:', errorMessage);
    }
  );
}

scanAgainBtn.addEventListener('click', () => {
  resultName.textContent = '';
  resultImage.src = '';
  veganStatus.textContent = '';
  scanAgainBtn.style.display = 'none';
  startScanner();
});

Html5Qrcode.getCameras().then(devices => {
  if (devices && devices.length) {
    startScanner();
  }
});
