// content.js - Evrensel Akademik Veri Okuyucu

chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    if (request.action === "get_metadata") {
        try {
            // Birden fazla olası etiket ismini sırayla arayan akıllı fonksiyon
            const getMeta = (names) => {
                for (let name of names) {
                    const tag = document.querySelector(`meta[name="${name}"], meta[property="${name}"]`);
                    if (tag && tag.getAttribute("content")) return tag.getAttribute("content");
                }
                return "";
            };

            // Uluslararası veritabanlarındaki tüm olası başlık, yazar ve özet etiketleri
            const title = getMeta(["citation_title", "DC.Title", "prism.title", "og:title"]) || document.title;
            let abstractText = getMeta(["citation_abstract", "DC.Description", "og:description", "description"]);
            const authors = getMeta(["citation_author", "DC.Creator", "author"]) || "Bilinmeyen Yazar";
            const date = getMeta(["citation_publication_date", "citation_date", "DC.Date", "article:published_time"]) || "t.y.";
            const journal = getMeta(["citation_journal_title", "DC.Publisher", "og:site_name"]) || window.location.hostname;

            // Zekice bir yedek plan: Eğer hiçbir meta etikette özet yoksa, sayfadaki en uzun paragrafı özet kabul et
            if (!abstractText) {
                const paragraphs = Array.from(document.querySelectorAll('p'));
                const longestP = paragraphs.sort((a, b) => b.innerText.length - a.innerText.length)[0];
                if (longestP && longestP.innerText.length > 250) {
                    abstractText = longestP.innerText.trim();
                }
            }

            const metadata = {
                title: title,
                authors: authors,
                date: date,
                journal: journal,
                abstract: abstractText
            };

            if (!metadata.title || metadata.title.length < 5) {
                sendResponse(null); 
                return true;
            }

            sendResponse(metadata);

        } catch (error) {
            console.error("LIT-SYNTH Evrensel Okuma Hatası:", error);
            sendResponse(null); 
        }
    }
    return true; 
});