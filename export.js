// export.js - Güvenli Word Üretimi

async function generateWordReport(articles) {
    // 1. Kütüphane Kontrolü (Hatanın %90 kaynağı burasıdır)
    if (typeof docx === 'undefined') {
        throw new Error("docx kütüphanesi bulunamadı! Lütfen 'libs/docx.js' dosyasının doğru klasörde olduğundan emin olun.");
    }

    const { Document, Packer, Paragraph, Table, TableRow, TableCell, WidthType, HeadingLevel, AlignmentType } = docx;

    // 2. Tablo Başlıkları
    const headerRow = new TableRow({
        children: [
            new TableCell({
                children: [new Paragraph({ text: "Makale Künyesi (APA)", style: "Strong" })],
                width: { size: 30, type: WidthType.PERCENTAGE },
                shading: { fill: "f2f2f2" }
            }),
            new TableCell({
                children: [new Paragraph({ text: "Araştırma Sentezi / Özet", style: "Strong" })],
                width: { size: 70, type: WidthType.PERCENTAGE },
                shading: { fill: "f2f2f2" }
            })
        ]
    });

    // 3. İçerik Satırları
    const dataRows = articles.map(art => {
        return new TableRow({
            children: [
                new TableCell({
                    children: [new Paragraph({ text: art.citation || art.title || "Bilinmiyor" })],
                    verticalAlign: "center"
                }),
                new TableCell({
                    children: [new Paragraph({ text: art.summary || "Özet bulunamadı." })],
                    verticalAlign: "top"
                })
            ]
        });
    });

    // 4. Belgeyi Oluştur
    const doc = new Document({
        sections: [{
            children: [
                new Paragraph({
                    text: "LIT-SYNTH: SİSTEMATİK LİTERATÜR TARAMA RAPORU",
                    heading: HeadingLevel.HEADING_1,
                    alignment: AlignmentType.CENTER,
                    spacing: { after: 400 }
                }),
                new Table({
                    rows: [headerRow, ...dataRows],
                    width: { size: 100, type: WidthType.PERCENTAGE }
                }),
                new Paragraph({
                    text: `\nToplam ${articles.length} makale analiz edilmiştir.`,
                    alignment: AlignmentType.RIGHT,
                    spacing: { before: 200 }
                })
            ]
        }]
    });

    // 5. İndirme İşlemi
    const blob = await Packer.toBlob(doc);
    const url = URL.createObjectURL(blob);
    
    const link = document.createElement('a');
    link.href = url;
    link.download = `Literatur_Taramasi_${new Date().toISOString().slice(0,10)}.docx`;
    document.body.appendChild(link); // Bazı tarayıcılar için gerekli
    link.click();
    document.body.removeChild(link);
}