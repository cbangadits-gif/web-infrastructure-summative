const express = require('express');
const axios = require('axios');
const path = require('path');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.static(path.join(__dirname, '../public')));

app.get('/api/convert', async (req, res) => {
    try {
        const response = await axios.get('https://open.er-api.com/v6/latest/RWF',
{ timeout: 5000 });
        res.json(response.data);
    } catch (error) {
        console.error('API Error (Using fallback rates):', error.message);
        res.json({
            result:"success",
            base_code:"RWF",
            rates: {
                "RWF": 1,
                "USD": 0.00076,
                "EUR": 0.00070
            }
        });
    }
});

app.listen(PORT, () => {
    console.log(`Server is running at http://localhost:${PORT}`);
});