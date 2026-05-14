const axios = require('axios');

module.exports = async (req, res) => {
    // إعدادات الـ CORS للسماح بالوصول من المتصفح
    res.setHeader('Access-Control-Allow-Credentials', true);
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS,PATCH,DELETE,POST,PUT');
    res.setHeader('Access-Control-Allow-Headers', 'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version');

    // التعامل مع طلبات OPTIONS
    if (req.method === 'OPTIONS') {
        return res.status(200).end();
    }

    if (req.method === 'POST') {
        const { url } = req.body;

        if (!url) {
            return res.status(400).json({ error: "الرابط مطلوب" });
        }

        try {
            const response = await axios.get(url, {
                timeout: 10000,
                headers: { 
                    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36' 
                }
            });

            // إرسال البيانات للواجهة
            return res.status(200).json({
                files: [
                    { name: 'index.html', content: response.data }
                ]
            });
        } catch (error) {
            return res.status(500).json({ error: "فشل سحب الموقع، قد يكون محمياً" });
        }
    }

    return res.status(405).json({ error: "Method Not Allowed" });
};