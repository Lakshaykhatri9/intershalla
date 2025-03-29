class StockWebSocket {
  private ws: WebSocket;
  private subscribers: Map<string, ((data: Stock) => void)[]>;

  constructor() {
    this.ws = new WebSocket('ws://your-backend-url/ws/stocks');
    this.subscribers = new Map();
    this.setupWebSocket();
  }

  private setupWebSocket() {
    this.ws.onmessage = (event) => {
      const stock: Stock = JSON.parse(event.data);
      const callbacks = this.subscribers.get(stock.symbol);
      callbacks?.forEach(callback => callback(stock));
    };

    this.ws.onclose = () => {
      setTimeout(() => this.connect(), 5000); // Reconnect after 5 seconds
    };
  }

  subscribe(symbol: string, callback: (data: Stock) => void) {
    if (!this.subscribers.has(symbol)) {
      this.subscribers.set(symbol, []);
      this.ws.send(JSON.stringify({ action: 'subscribe', symbol }));
    }
    this.subscribers.get(symbol)?.push(callback);
  }

  unsubscribe(symbol: string, callback: (data: Stock) => void) {
    const callbacks = this.subscribers.get(symbol);
    if (callbacks) {
      const index = callbacks.indexOf(callback);
      if (index > -1) {
        callbacks.splice(index, 1);
      }
      if (callbacks.length === 0) {
        this.subscribers.delete(symbol);
        this.ws.send(JSON.stringify({ action: 'unsubscribe', symbol }));
      }
    }
  }
} 