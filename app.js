const resultName = document.getElementById('product-name');
const resultImage = document.getElementById('product-image');
const veganStatus = document.getElementById('vegan-status');
const productIngredients = document.getElementById('product-ingredients');
const scanAgainBtn = document.getElementById('scan-again');
const modal = document.getElementById('modal');
const modalMessage = document.getElementById('modal-message');
const modalClose = document.getElementById('modal-close');
const loadingSpinner = document.getElementById('loading-spinner');

document.body.classList.add('dark-mode');

const uncertainPatterns = [
  /\bd3\b/i,
  /\bmonoglyceride(s)?\b/i,
  /\bdiglyceride(s)?\b/i,
  /\bnatural flavors?\b/i,
  /\blanolin\b/i,
  /\bomega[- ]?3\b/i,
  /\blecithin\b/i,
  /\bvitamin[- ]?d3\b/i
];

const nonVeganPatterns = [
  /\bmilk\b/i, /\bhoney\b/i, /\begg\b/i, /\bgelatin\b/i, /\blard\b/i, /\bcasein\b/i,
  /\bwhey\b/i, /\bshellac\b/i, /\bcarmine\b/i, /\banchovies?\b/i, /\bfish\b/i,
  /\bmeat\b/i, /\bchicken\b/i, /\bbeef\b/i, /\bpork\b/i, /\bcrustacean\b/i,
  /\bshellfish\b/i, /\bbutter\b/i, /\bcream\b/i, /\bcheese\b/i, /\byogurt\b/i,
  /\balbumin\b/i, /\bcochineal\b/i, /\blactose\b/i, /\bsquid\b/i, /\boctopus\b/i,
  /\bsnail\b/i, /\bbroth\b/i, /\bchitosan\b/i, /\bisinglass\b/i, /\brennet\b/i,
  /\bghee\b/i, /\bsuet\b/i, /\btallow\b/i, /\bcivet\b/i, /\bpropolis\b/i,
  /\broyal jelly\b/i, /\bbee pollen\b/i, /\bblood\b/i, /\bcaviar\b/i, /\bduck\b/i,
  /\bgoose\b/i, /\bvenison\b/i, /\belk\b/i, /\bgame\b/i, /\begg lecithin\b/i
];

function findMatchedRegex(text, patterns) {
  if (!text) return [];
  return patterns
    .filter(rx => rx.test(text))
    .map(rx => {
      const match = text.match(rx);
      return match ? match[0] : rx.source;
    });
}

function highlightMatches(text, patterns, cssClass) {
  if (!text) return '';
  let result = text;
  patterns.forEach(rx => {
    result = result.replace(rx, match => `<mark class="${cssClass}">${match}</mark>`);
  });
  return result;
}

function showModal(message) {
  modalMessage.textContent = message;
  modal.classList.remove('hidden');
}

modalClose.addEventListener('click', () => {
  modal.classList.add('hidden');
});

document.getElementById('submit-barcode').addEventListener('click', () => {
  const input = document.getElementById('manual-barcode');
  const code = input.value.trim();
  if (code) {
    checkVeganStatus(code);
    input.value = '';
  }
});

function seemsEnglish(text) {
  const commonEnglishWords = ['and', 'the', 'with', 'contains', 'sugar', 'salt'];
  return commonEnglishWords.some(word => text.toLowerCase().includes(word));
}

async function translateText(text) {
  try {
    const res = await fetch('https://libretranslate.de/translate', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        q: text,
        source: 'auto',
        target: 'en',
        format: 'text'
      })
    });
    const data = await res.json();
    return data.translatedText || text;
  } catch (err) {
    console.error('Translation failed:', err);
    return text;
  }
}

async function checkVeganStatus(barcode) {
  loadingSpinner.style.display = 'block';

  const url = `https://world.openfoodfacts.org/api/v0/product/${barcode}.json`;

  try {
    const response = await fetch(url);
    const data = await response.json();
    loadingSpinner.style.display = 'none';

    if (data.status === 1) {
      const product = data.product;
      resultName.textContent = product.product_name || 'No name available';

      if (product.image_url) {
        resultImage.src = product.image_url;
        resultImage.style.display = 'block';
      } else {
        resultImage.src = 'assets/Confused-ele.gif';
        resultImage.style.display = 'block';
      }

      let ingredientsText = product.ingredients_text_en || '';
      if (!ingredientsText && product.ingredients_text) {
        if (seemsEnglish(product.ingredients_text)) {
          ingredientsText = product.ingredients_text;
        } else {
          ingredientsText = await translateText(product.ingredients_text);
        }
      }

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
      } else if (!ingredientsText.trim()) {
        veganStatus.textContent = '⚠️ Vegan status uncertain (no ingredients listed)';
        veganStatus.style.color = 'orange';
        productIngredients.innerHTML = 'No ingredients listed';
        message = '⚠️ Uncertain - No ingredients listed';
      } else {
        const nonVeganMatches = findMatchedRegex(ingredientsText, nonVeganPatterns);
        const uncertainMatches = findMatchedRegex(ingredientsText, uncertainPatterns);

        productIngredients.innerHTML =
          highlightMatches(
            highlightMatches(ingredientsText, nonVeganPatterns, 'non-vegan'),
            uncertainPatterns,
            'uncertain'
          );

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
      resultImage.style.display = 'none';
      veganStatus.textContent = '';
      productIngredients.textContent = '';
      showModal('❌ Product not found');
      scanAgainBtn.style.display = 'inline-block';
    }
  } catch (error) {
    console.error('API Error:', error);
    loadingSpinner.style.display = 'none';
    resultName.textContent = 'Error fetching data';
    resultImage.style.display = 'none';
    veganStatus.textContent = '';
    productIngredients.textContent = '';
    showModal('❌ Error fetching product data');
    scanAgainBtn.style.display = 'inline-block';
  }
}

// 📷 Scanner: Html5QrCode (simple and clean)
const html5QrCode = new Html5Qrcode("reader");

function startScanner() {
  html5QrCode.start(
    { facingMode: "environment" },
    { fps: 10, qrbox: 250 },
    barcode => {
      html5QrCode.stop().then(() => {
        checkVeganStatus(barcode);
        navigator.vibrate?.(100);
      });
    },
    error => {
      // silent scan error
    }
  ).catch(err => {
    console.error("Camera start error:", err);
    showModal('❌ Unable to access camera');
    scanAgainBtn.style.display = 'inline-block';
  });
}

scanAgainBtn.addEventListener('click', () => {
  resultName.textContent = '';
  resultImage.src = '';
  resultImage.style.display = 'none';
  veganStatus.textContent = '';
  productIngredients.textContent = '';
  scanAgainBtn.style.display = 'none';
  startScanner();
});

startScanner();
