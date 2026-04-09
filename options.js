// options.js - Temizlenmiş ve Birleştirilmiş Sürüm

// 1. Sayfa yüklendiğinde ayarları getir
document.addEventListener('DOMContentLoaded', () => {
    chrome.storage.sync.get(['gemini_api_key', 'gemini_model'], (result) => {
        if (result.gemini_api_key) {
            document.getElementById('api-key').value = result.gemini_api_key;
        }
        if (result.gemini_model) {
            document.getElementById('ai-model').value = result.gemini_model;
        }
    });
});

// 2. Kaydet butonuna basıldığında
document.getElementById('save-btn').addEventListener('click', () => {
    const apiKey = document.getElementById('api-key').value.trim();
    const selectedModel = document.getElementById('ai-model').value;

    if (!apiKey) {
        alert("Lütfen geçerli bir anahtar girin.");
        return;
    }

    chrome.storage.sync.set({ 
        'gemini_api_key': apiKey,
        'gemini_model': selectedModel
    }, () => {
        const status = document.getElementById('status');
        status.innerText = "✅ Ayarlar başarıyla kaydedildi!";
        status.style.display = 'block';
        setTimeout(() => { 
            status.style.display = 'none'; 
            status.innerText = "";
        }, 3000);
    });
});