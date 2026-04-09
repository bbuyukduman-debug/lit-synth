const wait = (ms) => new Promise(res => setTimeout(res, ms));

// --- ANA ANALİZ FONKSİYONU ---
// Parametrelere modelName eklendi
async function analyzeWithGemini(text, apiKey, modelName, isFullText, retries = 3) {
    const url = `https://generativelanguage.googleapis.com/v1beta/models/${modelName}:generateContent?key=${apiKey}`;
    let delay = 2000;

    const prompt = isFullText 
        ? `Sen bir akademik asistansın. Sana bir makalenin tam metnini veriyorum ve literatür özeti çıkarmanı istiyorum. Analiz et ve SADECE aşağıdaki JSON formatında yanıt ver. Başka hiçbir açıklama yazma:
            {
              "title": "Makalenin başlığı",
              "authors": "Yazarlar",
              "date": "Yayın yılı (bulamazsan t.y.)",
              "journal": "Dergi adı (bulamazsan Dergipark)",
              "summary": "Makalenin yöntem, bulgular ve sonuçlarını içeren kapsamlı, yoğun tek bir paragraf özet"
            }
            Makale Metni: ${text.substring(0, 60000)}`
        : `Sen bir akademik asistansın. Aşağıdaki akademik özeti yöntem, bulgular ve sonuç açısından yoğun bir paragrafla Türkçe özetle: ${text.substring(0, 10000)}`;

    const bodyData = {
        contents: [{ parts: [{ text: prompt }] }]
    };

    if (isFullText) {
        bodyData.generationConfig = { responseMimeType: "application/json" };
    }

    for (let i = 0; i < retries; i++) {
        try {
            const response = await fetch(url, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(bodyData)
            });

            const data = await response.json();

            // Yoğunluk Hatası Kontrolü
            if (data.error && data.error.message.includes("high demand")) {
                if (i < retries - 1) {
                    console.log(`Sunucu yoğun, ${delay}ms sonra tekrar deneniyor... Deneme: ${i + 2}`);
                    // POPUP'A BİLGİ VER:
                    chrome.runtime.sendMessage({ action: "retry_status", attempt: i + 2, maxRetries: retries }).catch(()=> {}); 
                    await wait(delay);
                    delay *= 2;
                    continue;
                }
            }

            if (data.error) throw new Error(data.error.message);
            return data.candidates[0].content.parts[0].text;

        } catch (error) {
            if (i === retries - 1) throw error;
            chrome.runtime.sendMessage({ action: "retry_status", attempt: i + 2, maxRetries: retries }).catch(()=> {});
            await wait(delay);
            delay *= 2;
        }
    }
}

// --- MESAJ DİNLEYİCİ ---
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    
    // Ayarlardan hem API key'i hem de seçilen Modeli çekiyoruz
    chrome.storage.sync.get(['gemini_api_key', 'gemini_model'], async (settings) => {
        const apiKey = settings.gemini_api_key;
        const modelName = settings.gemini_model || "gemini-2.5-flash"; // Seçim yoksa varsayılan flash
        
        if (!apiKey) {
            sendResponse({ success: false, error: "Lütfen ayarlardan API anahtarınızı girin." });
            return;
        }

        if (request.action !== "analyze_pdf_text" && request.action !== "start_analysis") {
            sendResponse({ success: false, error: "Bilinmeyen işlem." });
            return;
        }

        if (request.action === "analyze_pdf_text") {
            try {
                // modelName değişkenini fonksiyona iletiyoruz
                const aiResponse = await analyzeWithGemini(request.text, apiKey, modelName, true);
                const cleanedResponse = aiResponse.replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/i, '').trim();
                const aiData = JSON.parse(cleanedResponse);
                
                const result = await chrome.storage.local.get('literature_pool');
                const pool = result.literature_pool || [];
                const isDuplicate = pool.some(item =>
                    item.title && aiData.title &&
                    item.title.toLowerCase().trim() === aiData.title.toLowerCase().trim()
                );
                if (isDuplicate) {
                    sendResponse({ success: false, error: "Bu makale zaten bellekte mevcut." });
                    return;
                }
                pool.push({
                    title: aiData.title,
                    citation: `${aiData.authors} (${aiData.date}). ${aiData.title}. ${aiData.journal}.`,
                    summary: aiData.summary
                });
                await chrome.storage.local.set({ 'literature_pool': pool });
                sendResponse({ success: true });
            } catch (e) {
                sendResponse({ success: false, error: "Yapay Zeka Hatası: " + e.message });
            }
        }

        if (request.action === "start_analysis") {
            chrome.tabs.query({ active: true, currentWindow: true }, async (tabs) => {
                if (!tabs || tabs.length === 0) {
                    sendResponse({ success: false, error: "Aktif sekme bulunamadı." });
                    return;
                }
                chrome.tabs.sendMessage(tabs[0].id, { action: "get_metadata" }, async (metadata) => {
                    if (chrome.runtime.lastError || !metadata) {
                        sendResponse({ success: false, error: "Sayfadan veri okunamadı (F5 deneyin)." });
                        return;
                    }
                    try {
                        const result = await chrome.storage.local.get('literature_pool');
                        const pool = result.literature_pool || [];
                        const isDuplicate = pool.some(item =>
                            item.title && metadata.title &&
                            item.title.toLowerCase().trim() === metadata.title.toLowerCase().trim()
                        );
                        if (isDuplicate) {
                            sendResponse({ success: false, error: "Bu makale zaten bellekte mevcut." });
                            return;
                        }
                        const summary = await analyzeWithGemini(metadata.abstract || metadata.title, apiKey, modelName, false);
                        pool.push({
                            title: metadata.title || "Başlık Bulunamadı",
                            citation: `${metadata.authors || "Yazar Yok"} (${metadata.date || "t.y."}). ${metadata.title || ""}. ${metadata.journal || ""}.`,
                            summary: summary
                        });
                        await chrome.storage.local.set({ 'literature_pool': pool });
                        sendResponse({ success: true });
                    } catch (e) {
                        sendResponse({ success: false, error: "Yapay Zeka Hatası: " + e.message });
                    }
                });
            });
        }
    });

    return true; 
});