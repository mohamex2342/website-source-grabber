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
            const response = await axios.get(url, { timeout: 10000 });
            const html = response.data;
            const $ = cheerio.load(html);
            const files = [{ name: 'index.html', content: html }];

            // سحب الـ CSS
            $('link[rel="stylesheet"]').each((i, el) => {
                const href = $(el).attr('href');
                if (href) files.push({ name: `style-${i+1}.css`, content: `/* External CSS Link */\n${href}` });
            });

            // سحب الـ JS
            $('script[src]').each((i, el) => {
                const src = $(el).attr('src');
                if (src) files.push({ name: `script-${i+1}.js`, content: `// External JS Link\n${src}` });
            });

            // سحب الصور والفيديو
            $('img').each((i, el) => {
                const src = $(el).attr('src');
                if (src) files.push({ name: `asset-${i+1}.png`, content: `Image URL: ${src}` });
            });

            $('video, source').each((i, el) => {
                const src = $(el).attr('src');
                if (src) files.push({ name: `video-${i+1}.mp4`, content: `Video URL: ${src}` });
            });

            return res.status(200).json({ files });
        } catch (error) {
            return res.status(500).json({ error: "خطأ في سحب الموارد" });
        }
    }
    return res.status(405).end();
};
