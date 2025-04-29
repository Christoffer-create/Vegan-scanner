const resultName = document.getElementById('product-name');
const resultImage = document.getElementById('product-image');
const veganStatus = document.getElementById('vegan-status');
const productIngredients = document.getElementById('product-ingredients');
const scanAgainBtn = document.getElementById('scan-again');
const modal = document.getElementById('modal');
const modalMessage = document.getElementById('modal-message');
const modalClose = document.getElementById('modal-close');
const darkToggle = document.getElementById('toggle-dark');
const darkIcon = document.getElementById('dark-mode-icon');
const loadingSpinner = document.getElementById('loading-spinner');

const html5QrCode = new Html5Qrcode("reader");
const config = { fps: 10, qrbox: 250 };

const uncertainIngredients = [
  "monoglycerides", "diglycerides", "natural flavors", "lanolin",
  "omega-3", "lecithin", "vitamin d3"
];

const nonVeganIngredients = [
  "milk", "honey", "egg", "gelatin", "lard", "casein", "whey", "shellac",
  "carmine", "anchovy", "anchovies", "fish", "meat", "chicken", "beef",
  "pork", "crustacean", "shellfish", "butter", "cream", "cheese", "yogurt",
  "albumin", "cochineal", "lactose", "squid", "octopus", "snail",
  "broth", "chitosan", "isinglass", "rennet", "ghee", "suet", "tallow",
  "civet", "propolis", "royal jelly", "bee pollen", "blood", "caviar",
  "duck", "goose", "venison", "elk", "game", "egg lecithin"
];

function findMatchedKeywords(text, keywords) {
  const matches = [];
  if (!text) return matches;
  const lower = text.toLowerCase();
  keywords.forEach(word => {
    if (lower.includes(word)) matches.push(word);
  });
  return matches;
}

function showModal(message) {
  modalMessage.textContent = message;
  modal.classList.remove('hidden');
}

modalClose.addEventListener('click', () => {
  modal.classList.add('hidden');
});

function checkVeganStatus(barcode) {
  loadingSpinner.style.display = 'block';

  const url = `https://world.openfoodfacts.org/api/v0/product/${barcode}.json`;

  fetch(url)
    .then(response => response.json())
    .then(data => {
      loadingSpinner.style.display = 'none';

      if (data.status === 1) {
        const product = data.product;
        resultName.textContent = product.product_name || 'No name available';
        resultImage.src = product.image_url || '';
        const ingredientsText = product.ingredients_text || '';
        productIngredients.textContent = ingredientsText || 'No ingredients listed';

        const tags = product.ingredients_analysis_tags || [];
        let message = '';

        if (tags.includes('en:vegan')) {
          veganStatus.textContent = '✅ Vegan';
          veganStatus.style.color = 'green';
          message = '✅ This product is Vegan (confirmed by OpenFoodFacts)';
        } else if (tags.includes('en:non-vegan')) {
          veganStatus.textContent = '❌ Not Vegan';
          veganStatus.style.color = 'red';
          message = '❌ This product is Not Vegan (confirmed by OpenFoodFacts)';
        } else {
          const nonVeganMatches = findMatchedKeywords(ingredientsText, nonVeganIngredients);
          const uncertainMatches = findMatchedKeywords(ingredientsText, uncertainIngredients);

          if (nonVeganMatches.length > 0) {
            veganStatus.textContent = `❌ Not Vegan (contains: ${nonVeganMatches.join(', ')})`;
            veganStatus.style.color = 'red';
            message = `❌ Not Vegan - Detected: ${nonVeganMatches.join(', ')}`;
          } else if (uncertainMatches.length > 0) {
            veganStatus.textContent = `⚠️ Vegan status uncertain (contains: ${uncertainMatches.join(', ')})`;
            veganStatus.style.color = 'orange';
            message = `⚠️ Uncertain - Detected: ${uncertainMatches.join(', ')}`;
          } else {
            veganStatus.textContent = '✅ Vegan (no animal ingredients detected)';
            veganStatus.style.color = 'green';
            message = '✅ Vegan (based on ingredient check)';
          }
        }

        showModal(message);
        scanAgainBtn.style.display = 'inline-block';
      } else {
        resultName.textContent = 'Product not found';
        resultImage.src = '';
        veganStatus.textContent = '';
        productIngredients.textContent = '';
        showModal('❌ Product not found');
      }
    })
    .catch(error => {
      console.error('API Error:', error);
      loadingSpinner.style.display = 'none';
      resultName.textContent = 'Error fetching data';
      resultImage.src = '';
      veganStatus.textContent = '';
      productIngredients.textContent = '';
      showModal('❌ Error fetching product data');
    });
}

function startScanner() {
  html5QrCode.start(
    { facingMode: "environment" },
    config,
    barcode => {
      html5QrCode.stop().then(() => {
        checkVeganStatus(barcode);
      });
    },
    error => {}
  ).catch(err => {
    console.error('Camera error:', err);
    showModal('❌ Unable to start camera');
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
  if (devices && devices.length) {
    startScanner();
  } else {
    showModal('❌ No cameras found');
  }
}).catch(err => {
  console.error('Camera access error:', err);
  showModal('❌ Failed to access camera');
});

// Dark mode toggle
darkToggle.addEventListener('change', (e) => {
  document.body.classList.toggle('dark-mode', e.target.checked);
  darkIcon.textContent = e.target.checked ? '☀️' : '🌙';
});
