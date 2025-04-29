console.log("✅ app.js loaded");
const resultName = document.getElementById('product-name');
const resultImage = document.getElementById('product-image');
const veganStatus = document.getElementById('vegan-status');
const scanAgainBtn = document.getElementById('scan-again');

const html5QrCode = new Html5Qrcode("reader");
const config = { fps: 10, qrbox: 250 };

function checkVeganStatus(barcode) {
  const url = `https://world.openfoodfacts.org/api/v0/product/${barcode}.json`;

  fetch(url)
    .then(response => response.json())
    .then(data => {
      if (data.status === 1) {
        const product = data.product;
        resultName.textContent = product.product_name || 'No name available';
        resultImage.src = product.image_url || '';
        const tags = product.ingredients_analysis_tags || [];

        if (tags.includes('en:vegan')) {
          veganStatus.textContent = '✅ Vegan';
          veganStatus.style.color = 'green';
        } else if (tags.includes('en:non-vegan')) {
          veganStatus.textContent = '❌ Not Vegan';
          veganStatus.style.color = 'red';
        } else {
          veganStatus.textContent = '⚠️ Vegan status unknown';
          veganStatus.style.color = 'gray';
        }
      } else {
        resultName.textContent = 'Product not found';
        resultImage.src = '';
        veganStatus.textContent = '';
      }
    })
    .catch(error => {
      console.error('API Error:', error);
      resultName.textContent = 'Error fetching data';
      resultImage.src = '';
      veganStatus.textContent = '';
    });
}

function startScanner() {
  html5QrCode.start(
    { facingMode: "environment" },
    config,
    barcode => {
      html5QrCode.stop().then(() => {
        checkVeganStatus(barcode);
        scanAgainBtn.style.display = 'inline-block';
      });
    },
    error => {
      // Avoid flooding console
    }
  ).catch(err => {
    console.error('Camera start failed:', err);
  });
}

document.getElementById('product-ingredients').textContent =
  product.ingredients_text || 'No ingredients listed';


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
  } else {
    alert('No cameras found');
  }
}).catch(err => {
  console.error('Camera error:', err);
});
