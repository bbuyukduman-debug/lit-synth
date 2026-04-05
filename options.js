// options.js
document.getElementById('save-btn').addEventListener('click', () => {
    const key = document.getElementById('api-key').value;
    if (key) {
        chrome.storage.sync.set({ 'gemini_api_key': key }, () => {
            const status = document.getElementById('status');
            status.style.display = 'block';
            setTimeout(() => { status.style.display = 'none'; }, 2000);
        });
    } else {
        alert("Lütfen geçerli bir anahtar girin.");
    }
});

// Sayfa açıldığında varsa eski anahtarı göster
chrome.storage.sync.get('gemini_api_key', (data) => {
    if (data.gemini_api_key) {
        document.getElementById('api-key').value = data.gemini_api_key;
    }
});