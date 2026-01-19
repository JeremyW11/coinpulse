import Alpine from 'alpinejs';
import { createIcons, icons } from 'lucide';
import './style.css';

// Translation strings
const translations = {
    zh: {
        market_overview: "市場概覽", k_line_chart: "K線圖表", funding_rates: "資金費率",
        liquidations: "爆倉數據", open_interest: "持倉分析", data_hub: "數據中心",
        ai_diagnosis: "AI 盤面診斷", total_oi: "選定平台持倉總額", total_liq: "24H 聚合爆倉額",
        ls_ratio: "多空比", active_pairs: "活躍交易對", exchange: "交易所",
        price: "價格", change_24h: "24H 變化", history_trend: "歷史趨勢分析",
        ai_report: "AI 診斷報告", longs: "多單強平", shorts: "空單強平",
        oi_mc_ratio: "持倉/市值比", liq_intensity: "歷史強平強度 (0 軸置中)",
        total: "總額", avg: "平均", filtered: "篩選", online: "實時"
    },
    en: {
        market_overview: "Overview", k_line_chart: "Chart", funding_rates: "Funding",
        liquidations: "Liquidations", open_interest: "Open Interest", data_hub: "Data Hub",
        ai_diagnosis: "AI Diagnosis", total_oi: "Selected Total OI", total_liq: "24H Total Liq",
        ls_ratio: "L/S Ratio", active_pairs: "Active Pairs", exchange: "Exchange",
        price: "Price", change_24h: "24H Change", history_trend: "Historical Trend",
        ai_report: "AI Report", longs: "Long Liqs", shorts: "Short Liqs",
        oi_mc_ratio: "OI/MC Ratio", liq_intensity: "Liquidation Intensity (Centered)",
        total: "Total", avg: "AVG", filtered: "Filtered", online: "Live"
    }
};

function getFormatDate(date) {
    const pad = (n) => n.toString().padStart(2, '0');
    return `${date.getFullYear()}/${pad(date.getMonth() + 1)}/${pad(date.getDate())} ${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

Alpine.data('cryptoApp', () => ({
    activeTab: 'oi',
    language: 'zh',
    isSidebarOpen: true,
    showLangMenu: false,
    selectedCoin: { symbol: 'BTC', prices: 102450 },
    exchangesList: ['binance', 'okx', 'bybit', 'bitget', 'coinbase', 'kraken', 'gateio'],
    visibleExchanges: ['binance', 'okx', 'bybit', 'bitget', 'coinbase', 'kraken', 'gateio'],
    oiChartMode: 'value',
    aiModal: { show: false, title: '', content: '', loading: false },

    // Data Containers
    exchangeOI: [],
    oiHistory: [],
    fundingMatrix: [],
    coinsData: [{ symbol: 'BTC', prices: 0 }],
    metrics: { oiTotal: '0.00' },
    ws: null,

    init() {
        this.initWebSocket();
        this.$watch('activeTab', (val) => {
            this.initIcons();
            if (val === 'chart') this.loadTradingView();
        });
        this.initIcons();

        // Populate mock history for visual completeness until real history API is built
        this.generateMockHistory();
    },

    initWebSocket() {
        // Use relative path for proxy to handle
        // Protocol: if page is https, use wss. Since we proxy via vite:
        const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
        const host = window.location.host;
        this.ws = new WebSocket(`${protocol}//${host}/ws`);

        this.ws.onmessage = (event) => {
            const message = JSON.parse(event.data);
            if (message.type === 'UPDATE') {
                this.updateData(message.data);
            }
        };

        this.ws.onclose = () => {
            // Simple reconnect logic
            setTimeout(() => this.initWebSocket(), 3000);
        };
    },

    updateData(data) {
        // Update Price
        if (data.price) {
            this.selectedCoin.prices = parseFloat(data.price);
            // Update top ticker
        }

        // Update Matrix (OI / Funding)
        if (data.matrix) {
            this.fundingMatrix = data.matrix.map(item => ({
                symbol: 'BTC', // Currently aggregating BTC only in backend demo
                rates: { '1h': item.fundingRate.toFixed(4) },
                avg: item.fundingRate.toFixed(4)
            }));

            this.exchangeOI = data.matrix.map(item => ({
                exchange: item.exchange,
                oi: item.openInterest,
                oiRaw: parseFloat(item.openInterest),
                change24h: (Math.random() * 10 - 5).toFixed(2) + "%", // Still simulated 24h change as we don't store 24h history in memory yet
                isUp: Math.random() > 0.5
            }));

            this.metrics.oiTotal = this.exchangeOI
                .filter(d => this.visibleExchanges.includes(d.exchange))
                .reduce((acc, c) => acc + c.oiRaw, 0).toFixed(2);
        }
    },

    generateMockHistory() {
        // Keep the visual "History Trend" populated with mock data for now
        this.oiHistory = Array.from({ length: 18 }, (_, i) => ({
            time: getFormatDate(new Date(Date.now() - i * 4 * 3600 * 1000)),
            value: (18 + Math.random() * 5).toFixed(2),
            change: (Math.random() * 2 - 1).toFixed(2),
            price: (this.selectedCoin.prices * (1 + Math.random() * 0.02)).toFixed(2)
        })).reverse();
    },

    initIcons() {
        setTimeout(() => createIcons({ icons }), 50);
    },

    toggleExchange(ex) {
        this.visibleExchanges = this.visibleExchanges.includes(ex)
            ? this.visibleExchanges.filter(i => i !== ex)
            : [...this.visibleExchanges, ex];
        if (this.exchangeOI.length > 0) {
            this.metrics.oiTotal = this.exchangeOI.filter(d => this.visibleExchanges.includes(d.exchange)).reduce((acc, c) => acc + c.oiRaw, 0).toFixed(2);
        }
    },

    t(key) {
        const lang = this.language || 'zh';
        return (translations[lang] && translations[lang][key]) ? translations[lang][key] : key;
    },

    loadTradingView() {
        const container = document.getElementById('tv-container');
        if (!container) return;
        container.innerHTML = '';
        const script = document.createElement("script");
        script.src = "https://s3.tradingview.com/external-embedding/embed-widget-advanced-chart.js";
        script.type = "text/javascript"; script.async = true;
        script.innerHTML = JSON.stringify({ "autosize": true, "symbol": "BINANCE:BTCUSDT", "interval": "240", "theme": "dark", "style": "1", "locale": "zh_TW", "allow_symbol_change": true, "support_host": "https://www.tradingview.com" });
        container.appendChild(script);
    },

    async callAI(context) {
        this.aiModal.show = true; this.aiModal.loading = true; this.aiModal.title = "✨ Gemini 2.5 Analysis";
        try {
            // Call backend proxy
            const res = await fetch('/api/ai-chat', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ context, symbol: this.selectedCoin.symbol })
            });
            const data = await res.json();
            this.aiModal.content = data.text;
        } catch (e) {
            this.aiModal.content = "AI 診斷服務暫時不可用 (" + e.message + ")。";
        } finally { this.aiModal.loading = false; }
    }
}));

Alpine.start();
