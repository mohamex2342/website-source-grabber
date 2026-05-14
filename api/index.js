const axios = require('axios');
const cheerio = require('cheerio');

module.exports = async (req, res) => {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

    if (req.method === 'OPTIONS') return res.status(200).end();

    if (req.method === 'POST') {
        try {
            const { url, getFullContent } = req.body;

            // إذا كان الطلب لجلب محتوى ملف واحد محدد
            if (getFullContent) {
                const fileRes = await axios.get(getFullContent, { timeout: 5000 });
                return res.status(200).json({ content: fileRes.data });
            }

            // الطلب الأساسي: تحليل الموقع
            const response = await axios.get(url, { timeout: 8000 });
            const html = response.data;
            const $ = cheerio.load(html);
            const baseUrl = new URL(url).origin;

            const files = [{ name: 'index.html', content: html, type: 'html' }];

            // استخراج الصفحات الداخلية (الروابط)
            $('a[href]').each((i, el) => {
                let href = $(el).attr('href');
                if (href.startsWith('/') || href.startsWith(baseUrl)) {
                    const fullPath = new URL(href, url).href;
                    const name = href.split('/').filter(Boolean).pop() || 'page';
                    if (!files.find(f => f.url === fullPath)) {
                        files.push({ name: `${name}.html`, url: fullPath, type: 'html', needsFetch: true });
                    }
                }
            });

            // استخراج CSS
            $('link[rel="stylesheet"]').each((i, el) => {
                const href = $(el).attr('href');
                if (href) {
                    const fullPath = new URL(href, url).href;
                    files.push({ name: `style-${i+1}.css`, url: fullPath, type: 'css', needsFetch: true });
                }
            });

            // استخراج JS
            $('script[src]').each((i, el) => {
                const src = $(el).attr('src');
                if (src) {
                    const fullPath = new URL(src, url).href;
                    files.push({ name: `script-${i+1}.js`, url: fullPath, type: 'js', needsFetch: true });
                }
            });

            return res.status(200).json({ files: files.slice(0, 30) }); // جلب أول 30 مورد لضمان السرعة
        } catch (error) {
            return res.status(500).json({ error: "فشل السيرفر في الوصول للموقع" });
        }
    }
    return res.status(405).end();
};
