const express = require('express');
const cors = require('cors');
const emailRoutes = require('./emailRoutes');

const app = express();

const allowedOrigins = [
    'https://www.ostravel.pk',
    'https://ostravel.pk',
    'http://localhost:5173',
    'http://localhost:3000',
];

const corsOptions = {
    origin: (origin, callback) => {
        // Allow requests with no origin (mobile apps, Postman, curl)
        if (!origin || allowedOrigins.includes(origin)) {
            callback(null, true);
        } else {
            callback(new Error(`CORS: origin ${origin} not allowed`));
        }
    },
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
    credentials: true,
    optionsSuccessStatus: 200, // some browsers (IE11) choke on 204
};

// Handle preflight OPTIONS requests for ALL routes
app.options('*', cors(corsOptions));

// Apply CORS to all routes
app.use(cors(corsOptions));

app.use(express.json());

app.use('/api/email', emailRoutes);

app.get('/', (req, res) => {
    res.json({
        status: 'Server running',
        service: 'OS Travel Email Notification Service',
        version: '1.0.0',
        endpoints: [
            'POST /api/email/status-update',
            'POST /api/email/edit-access',
            'POST /api/email/umrah-status-update',
            'POST /api/email/application-message',
            'POST /api/email/umrah-message',
            'POST /api/email/verify-document',
            'POST /api/email/consolidated-update',
            'POST /api/email/invoice',
        ],
        timestamp: new Date().toISOString()
    });
});

const PORT = process.env.PORT || 4000;
app.listen(PORT, () => {
    console.log(`Email service running on port ${PORT}`);
});