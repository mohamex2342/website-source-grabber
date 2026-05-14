const axios = require('axios');
const cheerio = require('cheerio');

module.exports = async (req, res) => {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

    if (req.method === 'OPTIONS') return res.status(200).end();

    if (req.method === 'POST') {
        try {
            const { url } = req.body;
            const urlObj = new URL(url);
            const domain = urlObj.hostname;
            const baseUrl = urlObj.origin;

            const response = await axios.get(url, { timeout: 10000 });
            const mainHtml = response.data;
            const $ = cheerio.load(mainHtml);
            
            const files = [{ name: 'index.html', content: mainHtml }];
            const pagesToFetch = [];

            // 1. اكتشاف الصفحات الداخلية (الروابط)
            $('a').each((i, el) => {
                let href = $(el).attr('href');
                if (!href) return;

                // تحويل الرابط النسبي لكامل
                if (href.startsWith('/')) href = baseUrl + href;
                
                try {
                    const hrefObj = new URL(href);
                    // التأكد أن الرابط يتبع نفس الدومين وليس موقعاً خارجياً
                    if (hrefObj.hostname === domain && !pagesToFetch.includes(href) && href !== url) {
                        if (pagesToFetch.length < 8) { // تحديد عدد الصفحات بـ 8 لتجنب البطء
                            pagesToFetch.push(href);
                        }
                    }
                } catch (e) {}
            });

            // 2. جلب محتوى الصفحات المكتشفة
            const pagePromises = pagesToFetch.map(async (pageUrl) => {
                try {
                    const pRes = await axios.get(pageUrl, { timeout: 5000 });
                    const name = pageUrl.split('/').filter(Boolean).pop() || 'page';
                    files.push({ name: `${name}.html`, content: pRes.data });
                } catch (e) {}
            });

            // 3. جلب ملفات CSS و JS (كما فعلنا سابقاً)
            const assetPromises = [];
            $('link[rel="stylesheet"]').each((i, el) => {
                let href = $(el).attr('href');
                if (href) assetPromises.push(fetchAsset(href, url, 'style', files));
            });
            $('script[src]').each((i, el) => {
                let src = $(el).attr('src');
                if (src) assetPromises.push(fetchAsset(src, url, 'script', files));
            });

            await Promise.all([...pagePromises, ...assetPromises]);

            return res.status(200).json({ files });
        } catch (error) {
            return res.status(500).json({ error: "فشل في سحب الموقع ومحتوياته" });
        }
    }
    return res.status(405).end();
};

// دالة مساعدة لجلب محتوى الملفات البرمجية
async function fetchAsset(path, baseUrl, type, filesArray) {
    try {
        const fullUrl = path.startsWith('http') ? path : new URL(path, baseUrl).href;
        const res = await axios.get(fullUrl, { timeout: 5000 });
        const ext = type === 'style' ? 'css' : 'js';
        const name = path.split('/').pop().split('?')[0] || `${type}-${Math.random().toString(36).substr(2, 5)}.${ext}`;
        filesArray.push({ name: name.endsWith(`.${ext}`) ? name : `${name}.${ext}`, content: res.data });
    } catch (e) {}
}
