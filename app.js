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
  /\bd3\b/i, /\bmonoglyceride(s)?\b/i, /\bdiglyceride(s)?\b/i,
  /\bnatural flavors?\b/i, /\blanolin\b/i, /\bomega[- ]?3\b/i,
  /\blecithin\b/i, /\bvitamin[- ]?d3\b/i
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

async function translateToEnglish(text) {
  console.log('Original text:', text);

  try {
    const detectRes = await fetch('https://libretranslate.com/detect', {
      method: 'POST',
      body: JSON.stringify({ q: text }),
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json'
      }
    });

    const detected = await detectRes.json();
    const sourceLang = detected?.[0]?.language || 'auto';
    console.log('Detected language:', sourceLang);

    if (sourceLang === 'en') return text;

    const translateRes = await fetch('https://libretranslate.com/translate', {
      method: 'POST',
      body: JSON.stringify({
        q: text,
        source: sourceLang,
        target: 'en',
        format: 'text'
      }),
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json'
      }
    });

    const translated = await translateRes.json();
    console.log('Translated:', translated.translatedText);
    return translated.translatedText || text;

  } catch (err) {
    console.error('Translation error:', err);
    return text;
  }
}


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

        if (product.image_url) {
          resultImage.src = product.image_url;
          resultImage.style.display = 'block';
        } else {
          resultImage.src = 'assets/Confused-ele.gif';
          resultImage.style.display = 'block';
        }

        const tags = product.ingredients_analysis_tags || [];
        const rawIngredients = product.ingredients_text || '';

        if (tags.includes('en:vegan')) {
          veganStatus.textContent = '✅ Vegan';
          veganStatus.style.color = 'green';
          showModal('✅ This product is Vegan (confirmed by OpenFoodFacts)');
          scanAgainBtn.style.display = 'inline-block';
          return;
        }

        if (tags.includes('en:non-vegan')) {
          veganStatus.textContent = '❌ Not Vegan';
          veganStatus.style.color = 'red';
          showModal('❌ This product is Not Vegan (confirmed by OpenFoodFacts)');
          scanAgainBtn.style.display = 'inline-block';
          return;
        }

        if (!rawIngredients.trim()) {
          veganStatus.textContent = '⚠️ Vegan status uncertain (no ingredients listed)';
          veganStatus.style.color = 'orange';
          productIngredients.innerHTML = 'No ingredients listed';
          showModal('⚠️ Uncertain - No ingredients listed');
          scanAgainBtn.style.display = 'inline-block';
          return;
        }

        // Translate and analyze ingredients
        translateToEnglish(rawIngredients).then(translated => {
          const nonVeganMatches = findMatchedRegex(translated, nonVeganPatterns);
          const uncertainMatches = findMatchedRegex(translated, uncertainPatterns);

          productIngredients.innerHTML =
            highlightMatches(
              highlightMatches(translated, nonVeganPatterns, 'non-vegan'),
              uncertainPatterns,
              'uncertain'
            );

          if (nonVeganMatches.length > 0) {
            veganStatus.textContent = `❌ Not Vegan (contains: ${nonVeganMatches.join(', ')})`;
            veganStatus.style.color = 'red';
            showModal(`❌ Not Vegan - Detected: ${nonVeganMatches.join(', ')}`);
          } else if (uncertainMatches.length > 0) {
            veganStatus.textContent = `⚠️ Vegan status uncertain (contains: ${uncertainMatches.join(', ')})`;
            veganStatus.style.color = 'orange';
            showModal(`⚠️ Uncertain - Detected: ${uncertainMatches.join(', ')}`);
          } else {
            veganStatus.textContent = '✅ Vegan (no animal ingredients detected)';
            veganStatus.style.color = 'green';
            showModal('✅ Vegan (based on ingredient check)');
          }

          scanAgainBtn.style.display = 'inline-block';
        });
      } else {
        resultName.textContent = 'Product not found';
        resultImage.src = '';
        resultImage.style.display = 'none';
        veganStatus.textContent = '';
        productIngredients.textContent = '';
        showModal('❌ Product not found');
        scanAgainBtn.style.display = 'inline-block';
      }
    })
    .catch(err => {
      console.error('API error:', err);
      loadingSpinner.style.display = 'none';
      resultName.textContent = 'Error fetching data';
      resultImage.src = '';
      resultImage.style.display = 'none';
      veganStatus.textContent = '';
      productIngredients.textContent = '';
      showModal('❌ Error fetching product data');
      scanAgainBtn.style.display = 'inline-block';
    });
}

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
    error => {}
  ).catch(err => {
    console.error("Camera start error:", err);
    showModal('❌ Unable to access camera');
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

// Start scanner on load
startScanner();
