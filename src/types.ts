// Core interfaces for the application
interface User {
  id: string;
  email: string;
  watchlists: Watchlist[];
}

interface Stock {
  symbol: string;
  name: string;
  currentPrice: number;
  change: number;
  changePercent: number;
  lastUpdated: string;
}

interface PriceAlert {
  id: string;
  userId: string;
  stockSymbol: string;
  targetPrice: number;
  condition: 'above' | 'below';
  isActive: boolean;
}

interface Watchlist {
  id: string;
  name: string;
  stocks: string[];
  userId: string;
} 