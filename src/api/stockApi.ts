class StockAPI {
  private baseUrl = 'http://your-backend-url/api';

  async searchStocks(query: string): Promise<Stock[]> {
    const response = await fetch(`${this.baseUrl}/stocks/search?q=${query}`);
    return response.json();
  }

  async createAlert(alert: Omit<PriceAlert, 'id'>): Promise<PriceAlert> {
    const response = await fetch(`${this.baseUrl}/alerts`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${localStorage.getItem('token')}`
      },
      body: JSON.stringify(alert)
    });
    return response.json();
  }

  async addToWatchlist(watchlistId: string, symbol: string): Promise<void> {
    await fetch(`${this.baseUrl}/watchlists/${watchlistId}/stocks`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${localStorage.getItem('token')}`
      },
      body: JSON.stringify({ symbol })
    });
  }
} 