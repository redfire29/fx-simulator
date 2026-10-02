export type TradeSide = 'BUY' | 'SELL';

export interface Candle {
  time: number; // Unix timestamp in seconds
  open: number;
  high: number;
  low: number;
  close: number;
}

export interface Tick {
  time: number;
  price: number;
  change: number;
}

export interface Position {
  id: string;
  side: TradeSide;
  margin: number;            // 投入保證金 (JPY)
  leverage: number;          // 槓桿倍數 (e.g. 25, 100, 400)
  positionSize: number;      // 名義合約價值 (JPY) = margin * leverage
  entryPrice: number;        // 開倉價 (USD/JPY)
  liquidationPrice: number;  // 致命強制平倉價
  openTime: number;          // 開倉時間
  pnl: number;               // 未實現損益 (JPY)
  pnlPercent: number;        // 未實現損益率 (%)
}

export interface TradeRecord {
  id: string;
  side: TradeSide;
  margin: number;
  leverage: number;
  entryPrice: number;
  closePrice: number;
  pnl: number;
  pnlPercent: number;
  isLiquidation: boolean;
  time: number;
}

export interface GameStats {
  totalTrades: number;
  wins: number;
  losses: number;
  liquidations: number;
  winRate: number;
  peakEquity: number;
  maxDrawdown: number;
  bestTrade: number;
  worstTrade: number;
  gameStartTime: number;
  elapsedSeconds: number;
}

export type TimeSpeed = 0 | 1 | 2 | 5 | 10;
