require('dotenv').config();
const express = require('express');
const http = require('http');
const WebSocket = require('ws');
const cors = require('cors');
const { DataAggregator } = require('./aggregator');

const app = express();
const server = http.createServer(app);
const wss = new WebSocket.Server({ server });

app.use(cors());
app.use(express.json());

// Serve static frontend in production
const path = require('path');
const DIST_DIR = path.join(__dirname, '../client/dist');
app.use(express.static(DIST_DIR));


const PORT = process.env.PORT || 3000;

// Initialize Aggregator
const aggregator = new DataAggregator();

// REST API for initial data or historical data
app.get('/api/initial-data', async (req, res) => {
    try {
        const data = await aggregator.getAllData();
        res.json(data);
    } catch (error) {
        console.error('Error fetching initial data:', error);
        res.status(500).json({ error: 'Failed to fetch data' });
    }
});

app.post('/api/ai-chat', async (req, res) => {
    // Proxy to Gemini API to hide key
    // Implementation to be added if user provides key in .env or we use a placeholder
    const { context, symbol } = req.body;
    try {
        // Placeholder for AI logic
        const response = await aggregator.getAIAnalysis(symbol, context);
        res.json({ text: response });
    } catch (e) {
        res.status(500).json({ error: e.message });
    }
});

// WebSocket Connection
wss.on('connection', (ws) => {
    console.log('Client connected');

    // Send immediate data
    aggregator.getQuickData().then(data => {
        ws.send(JSON.stringify({ type: 'UPDATE', data }));
    });

    const interval = setInterval(async () => {
        // Broadcast updates
        if (ws.readyState === WebSocket.OPEN) {
            const data = await aggregator.getQuickData();
            ws.send(JSON.stringify({ type: 'UPDATE', data }));
        }
    }, 3000); // 3 seconds update rate

    ws.on('close', () => {
        clearInterval(interval);
        console.log('Client disconnected');
    });
});

// Start Aggregator Loop
aggregator.start();

server.listen(PORT, () => {
    console.log(`Server running on http://localhost:${PORT}`);
});

// Fallback to index.html for SPA routing (must be after API routes)
app.get('*', (req, res) => {
    res.sendFile(path.join(DIST_DIR, 'index.html'));
});

