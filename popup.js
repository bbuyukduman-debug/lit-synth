// popup.js - Tüm Sistemlerin Birleştiği Ana Kontrol Merkezi

// Ekran (HTML) tamamen yüklendikten sonra butonları aktif et (Kabloları bağla)
document.addEventListener('DOMContentLoaded', async () => {
    
    // 1. Ekran açıldığında sayacı güncelle
    updateCount();

    // 2. PDF Kütüphanesini Arka Plana Bağla
    try {
        if (typeof pdfjsLib !== 'undefined') {
            pdfjsLib.GlobalWorkerOptions.workerSrc = chrome.runtime.getURL('libs/pdf.worker.js');
        }
    } catch (e) {
        console.error("PDF Worker Hatası:", e);
    }

    // --- BUTON KOMUTLARI ---

    // 📍 ANALİZ BUTONU
    const analyzeBtn = document.getElementById('analyze-btn');
    if (analyzeBtn) {
        analyzeBtn.addEventListener('click', async () => {
            const statusMsg = document.getElementById('status-message');
            
            chrome.tabs.query({ active: true, currentWindow: true }, async (tabs) => {
                if (!tabs || tabs.length === 0) return;
                const url = tabs[0].url;
                
                // --- REVİZYON: URL TEMİZLİĞİ VE KONTROLÜ ---
                // Soru işaretinden (?) sonrasını silerek temiz bir link elde ediyoruz
                const cleanUrl = url.split('?')[0].toLowerCase();
                
                // Eğer sayfa PDF ise (temiz linke göre kontrol ediyoruz)
                if (cleanUrl.endsWith('.pdf') || cleanUrl.includes('.pdf') || url.includes('/pdf/') || url.includes('/article-file/')) {
                    statusMsg.style.color = "#8e44ad";
                    statusMsg.innerText = "⏳ PDF Okunuyor... Lütfen bekleyin.";
                    
                    try {
                        // Çıkardığımız temiz URL'yi DEĞİL, orijinal yetkili (tokenlı) URL'yi gönderiyoruz
                        // Çünkü ScienceDirect o token olmadan PDF'i vermez.
                        const pdfText = await extractTextFromPDF(url);
                        statusMsg.innerText = "🧠 Yapay Zeka analiz ediyor...";
                        
                        chrome.runtime.sendMessage({ action: "analyze_pdf_text", text: pdfText }, (response) => {
                            handleResponse(response, statusMsg);
                        });
                    } catch (error) {
                        statusMsg.style.color = "#e74c3c";
                        statusMsg.innerText = "PDF Hatası: " + error.message;
                    }
                } else {
                    // Normal makale sayfası ise
                    statusMsg.style.color = "#e67e22";
                    statusMsg.innerText = "⏳ Sayfa analiz ediliyor...";
                    chrome.runtime.sendMessage({ action: "start_analysis" }, (response) => {
                        handleResponse(response, statusMsg);
                    });
                }
            });
        });
    }

    // 📄 WORD'E AKTAR BUTONU
    const exportBtn = document.getElementById('export-word');
    if (exportBtn) {
        exportBtn.addEventListener('click', async () => {
            const originalText = exportBtn.innerText;
            exportBtn.innerText = "⏳ Word Hazırlanıyor...";
            try {
                const data = await chrome.storage.local.get('literature_pool');
                if (!data.literature_pool || data.literature_pool.length === 0) {
                    alert("Henüz bellekte analiz edilmiş bir makale yok!");
                    exportBtn.innerText = originalText;
                    return;
                }
                await generateWordReport(data.literature_pool); 
                alert("✅ Literatür özetiniz başarıyla oluşturuldu.");
            } catch (error) {
                alert("Word Oluşturma Hatası: " + error.message);
            } finally {
                exportBtn.innerText = originalText;
            }
        });
    }

    // ⚙️ AYARLAR BUTONU
    const settingsBtn = document.getElementById('open-settings');
    if (settingsBtn) {
        settingsBtn.addEventListener('click', () => {
            chrome.runtime.openOptionsPage();
        });
    }

    // 🗑️ SIFIRLA BUTONU
    const clearBtn = document.getElementById('clear-btn');
    if (clearBtn) {
        clearBtn.addEventListener('click', async () => {
            const isConfirmed = confirm("DİKKAT: Bellekteki tüm makale özetleri silinecek. Emin misiniz?");
            if (isConfirmed) {
                await chrome.storage.local.remove('literature_pool');
                updateCount();
                const statusMsg = document.getElementById('status-message');
                statusMsg.style.color = "#e74c3c";
                statusMsg.innerText = "🗑️ Bellek başarıyla sıfırlandı.";
                setTimeout(() => { statusMsg.innerText = ""; }, 3000);
            }
        });
    }
});

// --- YARDIMCI FONKSİYONLAR ---

function handleResponse(response, statusMsg) {
    if (response && response.success) {
        statusMsg.style.color = "#27ae60";
        statusMsg.innerText = "✅ Başarıyla eklendi!";
        updateCount();
    } else {
        statusMsg.style.color = "#e74c3c";
        statusMsg.innerText = "Hata: " + (response ? response.error : "Bilinmiyor");
    }
}

async function updateCount() {
    const data = await chrome.storage.local.get('literature_pool');
    const countSpan = document.getElementById('count');
    if (countSpan) {
        countSpan.innerText = data.literature_pool ? data.literature_pool.length : 0;
    }
}

// PDF'in içindeki metinleri okuyan "KABUK KIRICI" Fonksiyon
async function extractTextFromPDF(url) {
    try {
        let targetUrl = url;
        let response = await fetch(targetUrl);
        let contentType = response.headers.get('content-type');

        // 1. KONTROL: Karşımıza bir HTML kabuğu mu çıktı? (Revize: Saf PDF yanıtı geliyorsa bu bloğa girmez)
        if (contentType && contentType.toLowerCase().includes('text/html')) {
            console.log("HTML kabuğu tespit edildi, içindeki saf PDF aranıyor...");
            
            // HTML sayfasının kodlarını arka planda oku
            const htmlText = await response.text();
            const parser = new DOMParser();
            const doc = parser.parseFromString(htmlText, "text/html");

            let realPdfLink = null;

            // STRATEJİ A: İndexleme Meta Etiketine Bak (Google Akademik standardı)
            const metaTag = doc.querySelector('meta[name="citation_pdf_url"]');
            if (metaTag && metaTag.content) realPdfLink = metaTag.content;

            // STRATEJİ B: Gömülü iframe'e Bak (DergiPark genellikle bunu kullanır)
            if (!realPdfLink) {
                const iframe = doc.querySelector('iframe');
                if (iframe && iframe.src && (iframe.src.includes('.pdf') || iframe.src.includes('article-file'))) {
                    realPdfLink = iframe.src;
                }
            }

            // STRATEJİ C: Doğrudan ".pdf" uzantılı bir buton/link ara
            if (!realPdfLink) {
                const aTag = doc.querySelector('a[href$=".pdf"]');
                if (aTag && aTag.href) realPdfLink = aTag.href;
            }

            // Gerçek link bulunduysa rotayı oraya çevir
            if (realPdfLink) {
                // Eğer link yarım (relative) verilmişse, onu tam URL'ye çevir
                targetUrl = new URL(realPdfLink, targetUrl).href;
                console.log("Gizli PDF bulundu, yeni rota:", targetUrl);
                
                // Gerçek PDF'e ikinci bir saldırı (fetch) yap
                response = await fetch(targetUrl);
                contentType = response.headers.get('content-type');
                
                if (contentType && contentType.toLowerCase().includes('text/html')) {
                    throw new Error("Bulunan gizli link de korumalı çıktı. Analiz yapılamıyor.");
                }
            } else {
                // --- REVİZYON: ScienceDirect Özel İstisnası ---
                // Eğer linkin içinde zaten PDF geçiyorsa ve kabuk kırıcı bir şey bulamadıysa, 
                // linki saf PDF olarak kabul etmeye zorla.
                 if(url.toLowerCase().includes('.pdf')){
                     console.log("Kabuk kırıcı bir şey bulamadı, URL doğrudan okunmaya zorlanıyor...");
                     response = await fetch(url); 
                 } else {
                     throw new Error("Bu sayfanın içine gizlenmiş bir PDF bulunamadı. Lütfen manuel olarak saf PDF sayfasını açın.");
                 }
            }
        }

        // 2. AŞAMA: Saf PDF verisi makine diline (ArrayBuffer) çevriliyor
        
        // --- YENİ EKLENEN GÜVENLİK SÜBABI ---
        if (!response.ok) {
            throw new Error(`PDF sunucudan alınamadı (Hata: ${response.status}). Lütfen makale sayfasını yenileyip anında tekrar deneyin.`);
        }
        const finalContentType = response.headers.get('content-type');
        if (finalContentType && (finalContentType.includes('text/html') || finalContentType.includes('xml'))) {
             throw new Error("Sunucu PDF yerine hata sayfası (Zaman aşımı vb.) gönderdi. Makale sayfasını yenileyip (F5) tekrar deneyin.");
        }
        // -----------------------------------

        const arrayBuffer = await response.arrayBuffer();
        const loadingTask = pdfjsLib.getDocument({ data: arrayBuffer });
        const pdf = await loadingTask.promise;
        let fullText = "";
        
        // Sayfayı okuma sınırı
        const maxPages = pdf.numPages; 
        for (let i = 1; i <= maxPages; i++) {
            const page = await pdf.getPage(i);
            const textContent = await page.getTextContent();
            const pageText = textContent.items.map(item => item.str).join(" ");
            fullText += pageText + "\n";
        }
        
        return fullText;

    } catch (error) {
        console.error("LIT-SYNTH Kabuk Kırma Hatası:", error);
        throw error; 
    }
}