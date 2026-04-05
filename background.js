// background.js - LIT-SYNTH Tam Entegre Yapay Zeka Asistanı

async function analyzeWithGemini(text, apiKey, isFullText) {
    const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${apiKey}`;
    
    // PDF ise JSON dönen özel prompt, değilse standart özetleyici prompt
    const prompt = isFullText 
        ? `Sen bir akademik asistansın. Sana bir makalenin tam metnini veriyorum ve literatür özeti çıkarmanı istiyorum. Lütfen bu metni analiz et ve SADECE aşağıdaki JSON formatında yanıt ver. Başka hiçbir açıklama yazma:
            {
              "title": "Makalenin başlığı",
              "authors": "Yazarlar",
              "date": "Yayın yılı (bulamazsan t.y.)",
              "journal": "Dergi adı (bulamazsan Dergipark)",
              "summary": "Makalenin yöntem, bulgular ve sonuçlarını içeren kapsamlı, yoğun tek bir paragraf özet"
            }
            
            Makale Metni:
            ${text.substring(0, 60000)}`
        : `Sen bir akademik asistansın. Aşağıdaki akademik özeti yöntem, bulgular ve sonuç açısından yoğun bir paragrafla Türkçe özetle: ${text.substring(0, 10000)}`;

    const bodyData = {
        contents: [{ parts: [{ text: prompt }] }]
    };

    // Tam metin analizinde modelin kesinlikle JSON formatında dönmesini sağlayan ayar
    if (isFullText) {
        bodyData.generationConfig = { responseMimeType: "application/json" };
    }

    const response = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(bodyData)
    });

    const data = await response.json();
    if (data.error) throw new Error(data.error.message);
    return data.candidates[0].content.parts[0].text;
}

chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    
    // DURUM 1: PDF TAM METİN ANALİZİ
    if (request.action === "analyze_pdf_text") {
        chrome.storage.sync.get('gemini_api_key', async (settings) => {
            if (!settings.gemini_api_key) {
                sendResponse({ success: false, error: "Lütfen ayarlardan API anahtarınızı girin." });
                return;
            }
            try {
                const aiResponse = await analyzeWithGemini(request.text, settings.gemini_api_key, true);
                const aiData = JSON.parse(aiResponse); // JSON'u JavaScript objesine çevir
                
                const result = await chrome.storage.local.get('literature_pool');
                const pool = result.literature_pool || [];
                pool.push({
                    title: aiData.title,
                    citation: `${aiData.authors} (${aiData.date}). ${aiData.title}. ${aiData.journal}.`,
                    summary: aiData.summary
                });
                await chrome.storage.local.set({ 'literature_pool': pool });
                sendResponse({ success: true });
            } catch (e) {
                sendResponse({ success: false, error: "Yapay Zeka Hatası (PDF): " + e.message });
            }
        });
        return true;
    }

    // DURUM 2: NORMAL SAYFA KÜNYE ANALİZİ (Örn: Dergipark Ana Sayfa, ScienceDirect)
    if (request.action === "start_analysis") {
        chrome.storage.sync.get('gemini_api_key', async (settings) => {
            if (!settings.gemini_api_key) {
                sendResponse({ success: false, error: "Lütfen ayarlardan API anahtarınızı girin." });
                return;
            }

            chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
                chrome.tabs.sendMessage(tabs[0].id, { action: "get_metadata" }, async (metadata) => {
                    if (chrome.runtime.lastError || !metadata) {
                        sendResponse({ success: false, error: "Sayfadan veri okunamadı. Lütfen sayfayı yenileyip (F5) tekrar deneyin." });
                        return;
                    }

                    try {
                        const summary = await analyzeWithGemini(metadata.abstract || metadata.title, settings.gemini_api_key, false);
                        
                        const result = await chrome.storage.local.get('literature_pool');
                        const pool = result.literature_pool || [];
                        pool.push({
                            title: metadata.title || "Başlık Bulunamadı",
                            citation: `${metadata.authors || "Yazar Yok"} (${metadata.date || "t.y."}). ${metadata.title || ""}. ${metadata.journal || ""}.`,
                            summary: summary
                        });
                        
                        await chrome.storage.local.set({ 'literature_pool': pool });
                        sendResponse({ success: true });
                    } catch (e) {
                        sendResponse({ success: false, error: "Yapay Zeka Hatası (Sayfa): " + e.message });
                    }
                });
            });
        });
        return true;
    }
});