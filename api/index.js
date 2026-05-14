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
            const baseUrl = new URL(url).origin;
            const response = await axios.get(url, { timeout: 10000 });
            const html = response.data;
            const $ = cheerio.load(html);
            
            const files = [{ name: 'index.html', content: html }];

            // دالة لتحويل الروابط النسبية إلى روابط كاملة
            const getFullUrl = (path) => {
                if (!path) return null;
                if (path.startsWith('http')) return path;
                return new URL(path, url).href;
            };

            // سحب محتوى ملفات CSS
            const cssPromises = $('link[rel="stylesheet"]').map(async (i, el) => {
                const href = getFullUrl($(el).attr('href'));
                if (href) {
                    try {
                        const cssRes = await axios.get(href, { timeout: 5000 });
                        files.push({ name: `style-${i+1}.css`, content: cssRes.data });
                    } catch (e) {
                        files.push({ name: `style-${i+1}.css`, content: `/* Failed to fetch: ${href} */` });
                    }
                }
            }).get();

            // سحب محتوى ملفات JS
            const jsPromises = $('script[src]').map(async (i, el) => {
                const src = getFullUrl($(el).attr('src'));
                if (src) {
                    try {
                        const jsRes = await axios.get(src, { timeout: 5000 });
                        files.push({ name: `script-${i+1}.js`, content: jsRes.data });
                    } catch (e) {
                        files.push({ name: `script-${i+1}.js`, content: `// Failed to fetch: ${src}` });
                    }
                }
            }).get();

            // انتظار انتهاء جلب جميع الملفات
            await Promise.all([...cssPromises, ...jsPromises]);

            // الصور والفيديوهات (تبقى روابط لأنها ملفات ثنائية لا تظهر ككود)
            $('img').each((i, el) => {
                const src = getFullUrl($(el).attr('src'));
                if (src) files.push({ name: `image-${i+1}.png`, content: `Direct URL: ${src}` });
            });

            return res.status(200).json({ files });
        } catch (error) {
            return res.status(500).json({ error: "خطأ في سحب وتحليل الموقع" });
        }
    }
    return res.status(405).end();
};
