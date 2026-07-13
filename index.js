const express = require('express');
const cors = require('cors');
const emailRoutes = require('./emailRoutes');

const app = express();

app.use(cors()); // allow requests from your frontend (ostravels.com)
app.use(express.json());

app.use('/api/email', emailRoutes);

// Simple health check, same style as your AutoEmail service
app.get('/', (req, res) => {
    res.json({
        status: 'Server running',
        service: 'OS Travel Email Notification Service',
        version: '1.0.0',
        endpoints: [
            'POST /api/email/status-update',
            'POST /api/email/edit-access'
        ],
        timestamp: new Date().toISOString()
    });
});

const PORT = process.env.PORT || 4000;
app.listen(PORT, () => {
    console.log(`Email service running on port ${PORT}`);
});
