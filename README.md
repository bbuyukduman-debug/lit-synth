# LIT-SYNTH: AI-Powered Academic Research Assistant 🧠📚

**LIT-SYNTH**, akademisyenlerin ve araştırmacıların literatür tarama süreçlerini otomatize etmek için geliştirilmiş, açık kaynaklı bir Chrome eklentisidir. Makaleleri sadece özetlemekle kalmaz, onları yapılandırılmış bir literatür havuzuna dönüştürerek doğrudan Word formatında raporlar.

---

## ✨ Özellikler

- **Evrensel PDF Analizi:** Sadece bir linke bağlı kalmadan, tarayıcıda açılan tüm PDF dosyalarını (ilk sayfasından son sayfasına kadar) analiz eder.
- **Automated PDF Discovery (Shell Cracker):** DergiPark ve benzeri platformlarda HTML içine gömülmüş (iframe) PDF'leri otomatik olarak tespit eder ve okur.
- **Hibrit Analiz:** PDF olmayan sayfalarda meta verileri (Abstract) okurken, PDF sayfalarında tam metin analizi yapar.
- **Yapay Zeka Sentezi:** Google Gemini 2.5 Flash modelini kullanarak yöntem, bulgular ve sonuç odaklı akademik özetler çıkarır.
- **Word Raporu Oluşturma:** Bellekte biriktirilen tüm analizleri tek tıkla profesyonel bir Word tablosuna (.docx) aktarır.
- **BYOK (Bring Your Own Key):** Kullanıcılar kendi ücretsiz Gemini API anahtarlarını kullanarak tam kontrol ve gizlilik sağlar.

---

## 🛠️ Kurulum (Geliştirici Modu)

Şu an için eklenti manuel kurulum ile kullanılabilmektedir:

1. Bu repoyu `.zip` olarak indirin ve bir klasöre çıkartın.
2. Google Chrome'da `chrome://extensions` adresine gidin.
3. Sağ üst köşedeki **"Geliştirici Modu" (Developer Mode)** seçeneğini aktif hale getirin.
4. Sol üstteki **"Paketlenmemiş öğe yükle" (Load unpacked)** butonuna tıklayın.
5. Klasörü (içinde `manifest.json` olan ana dizini) seçerek yükleyin.

---

## 🚀 Nasıl Kullanılır?

1. [Google AI Studio](https://aistudio.google.com/app/apikey) üzerinden ücretsiz bir Gemini API anahtarı alın.
2. Eklentinin **Ayarlar** kısmına giderek bu anahtarı kaydedin.
3. Herhangi bir akademik makale veya PDF sayfasındayken eklenti simgesine tıklayın ve **"Analiz Et"** butonuna basın.
4. Çalışmanız bittiğinde **"Word Raporu Oluştur"** diyerek literatür tablonuzu indirin.

---

## 🔒 Gizlilik ve Güvenlik

LIT-SYNTH "Local-First" prensibiyle çalışır:
- API anahtarınız `chrome.storage.sync` üzerinde güvenli bir şekilde tutulur.
- Analiz edilen makale özetleri sadece tarayıcınızın yerel belleğinde saklanır; hiçbir harici sunucuya veya veri tabanına kaydedilmez.

---

## 🖋️ Geliştirici

**Dr. Bedirhan Büyükduman** İstanbul Sabahattin Zaim Üniversitesi, Dr. Öğretim Üyesi.  
Akademik süreçleri kolaylaştırmak amacıyla açık kaynak olarak geliştirilmiştir.

---

## 📄 Lisans

Bu proje MIT Lisansı ile lisanslanmıştır. Daha fazla bilgi için `LICENSE` dosyasına bakabilirsiniz.