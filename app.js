const resultName = document.getElementById('product-name');
const resultImage = document.getElementById('product-image');
const veganStatus = document.getElementById('vegan-status');
const productIngredients = document.getElementById('product-ingredients');
const scanAgainBtn = document.getElementById('scan-again');

const html5QrCode = new Html5Qrcode("reader");
const config = { fps: 10, qrbox: 250 };

const nonVeganKeywords = [
  "milk", "honey", "egg", "gelatin", "lard", "casein", "whey", "shellac",
  "carmine", "anchovy", "anchovies", "fish", "meat", "chicken", "beef",
  "pork", "crustacean", "shellfish", "butter", "cream", "cheese", "yogurt",
  "albumin", "cochineal", "lactose", "squid", "octopus", "snail"
];

function containsNonVeganIngredient(ingredientsText) {
  if (!ingredientsText) return false;
  const lowerText = ingredientsText.toLowerCase();
  return nonVeganKeywords.some(keyword => lowerText.includes(keyword));
}

function checkVeganStatus(barcode) {
  const url = `https://world.openfoodfacts.org/api/v0/product/${barcode}.json`;

  fetch(url)
    .then(response => response.json())
    .then(data => {
      if (data.status === 1) {
        const product = data.product;
        resultName.textContent = product.product_name || 'No name available';
        resultImage.src = product.image_url || '';
        productIngredients.textContent = product.ingredients_text || 'No ingredients listed';

        const tags = product.ingredients_analysis_tags || [];

        if (tags.includes('en:vegan')) {
          veganStatus.textContent = '✅ Vegan';
          veganStatus.style.color = 'green';
        } else if (tags.includes('en:non-vegan')) {
          veganStatus.textContent = '❌ Not Vegan';
          veganStatus.style.color = 'red';
        } else {
          const ingredientsText = product.ingredients_text || '';
          if (containsNonVeganIngredient(ingredientsText)) {
            veganStatus.textContent = '❌ Not Vegan (detected from ingredients)';
            veganStatus.style.color = 'red';
          } else {
            veganStatus.textContent = '⚠️ Vegan status unknown';
            veganStatus.style.color = 'gray';
          }
        }
      } else {
        resultName.textContent = 'Product not found';
        resultImage.src = '';
        veganStatus.textContent = '';
        productIngredients.textContent = '';
      }
    })
    .catch(error => {
      console.error('API Error:', error);
      resultName.textContent = 'Error fetching data';
      resultImage.src = '';
      veganStatus.textContent = '';
      productIngredients.textContent = '';
    });
}

function startScanner() {
  console.log("🔁 Starting scanner...");
  html5QrCode.start(
    { facingMode: "environment" },
    config,
    barcode => {
      html5QrCode.stop().then(() => {
        console.log("📦 Barcode scanned:", barcode);
        checkVeganStatus(barcode);
        scanAgainBtn.style.display = 'inline-block';
      });
    },
    error => {
      // Silent scan errors
    }
  ).catch(err => {
    console.error('❌ Camera start failed:', err);
  });
}

scanAgainBtn.addEventListener('click', () => {
  resultName.textContent = '';
  resultImage.src = '';
  veganStatus.textContent = '';
  productIngredients.textContent = '';
  scanAgainBtn.style.display = 'none';
  startScanner();
});

Html5Qrcode.getCameras().then(devices => {
  console.log("📷 Cameras found:", devices);
  if (devices && devices.length) {
    startScanner();
  } else {
    alert('No cameras found');
  }
}).catch(err => {
  console.error('❌ Error getting cameras:', err);
});
