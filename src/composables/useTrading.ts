import { ref, computed } from 'vue';
import type { Position, TradeRecord, GameStats, TradeSide } from '../types/trading';

const INITIAL_BALANCE = 300_000;
const VICTORY_TARGET = 20_000_000;
const MIN_MARGIN = 1_000;

export function useTrading() {
  const balance = ref<number>(INITIAL_BALANCE);
  const activePosition = ref<Position | null>(null);
  const tradeHistory = ref<TradeRecord[]>([]);

  // 遊戲勝負狀態
  const isVictory = ref<boolean>(false);
  const isGameOver = ref<boolean>(false);
  const isLiquidationAlert = ref<boolean>(false);

  // 遊戲時間與統計
  const gameStartTime = ref<number>(Date.now());
  const elapsedSeconds = ref<number>(0);
  const peakEquity = ref<number>(INITIAL_BALANCE);
  const maxDrawdown = ref<number>(0);

  // 帳戶權益 (Equity)
  const equity = computed(() => {
    if (!activePosition.value) return balance.value;
    return Math.max(0, balance.value + activePosition.value.pnl);
  });

  // 可用保證金 (Free Margin)
  const freeMargin = computed(() => {
    if (!activePosition.value) return balance.value;
    return Math.max(0, balance.value - activePosition.value.margin);
  });

  // 保證金維持率 (Margin Level %)
  const marginLevel = computed(() => {
    if (!activePosition.value || activePosition.value.margin <= 0) return 999;
    return Number(((equity.value / activePosition.value.margin) * 100).toFixed(1));
  });

  // 統計數據
  const stats = computed<GameStats>(() => {
    const total = tradeHistory.value.length;
    const wins = tradeHistory.value.filter(t => t.pnl > 0).length;
    const losses = tradeHistory.value.filter(t => t.pnl <= 0).length;
    const liquidations = tradeHistory.value.filter(t => t.isLiquidation).length;
    const winRate = total > 0 ? Number(((wins / total) * 100).toFixed(1)) : 0;

    let best = 0;
    let worst = 0;
    for (const t of tradeHistory.value) {
      if (t.pnl > best) best = t.pnl;
      if (t.pnl < worst) worst = t.pnl;
    }

    return {
      totalTrades: total,
      wins,
      losses,
      liquidations,
      winRate,
      peakEquity: peakEquity.value,
      maxDrawdown: Number(maxDrawdown.value.toFixed(1)),
      bestTrade: best,
      worstTrade: worst,
      gameStartTime: gameStartTime.value,
      elapsedSeconds: elapsedSeconds.value
    };
  });

  // 更新當前部位損益與檢測強平
  function updatePosition(currentPrice: number) {
    if (!activePosition.value || isGameOver.value || isVictory.value) return;

    const pos = activePosition.value;
    let pnl = 0;

    if (pos.side === 'BUY') {
      // 買入損益: (現價 - 成本價) / 成本價 * (本金 * 槓桿)
      pnl = ((currentPrice - pos.entryPrice) / pos.entryPrice) * pos.positionSize;
    } else {
      // 賣出損益: (成本價 - 現價) / 成本價 * (本金 * 槓桿)
      pnl = ((pos.entryPrice - currentPrice) / pos.entryPrice) * pos.positionSize;
    }

    // 更新部位即時損益
    pos.pnl = Math.round(pnl);
    pos.pnlPercent = Number(((pnl / pos.margin) * 100).toFixed(2));

    // 更新最高權益與最大回撤
    if (equity.value > peakEquity.value) {
      peakEquity.value = equity.value;
    }
    const currentDrawdown = ((peakEquity.value - equity.value) / peakEquity.value) * 100;
    if (currentDrawdown > maxDrawdown.value) {
      maxDrawdown.value = currentDrawdown;
    }

    // 勝利檢測: 權益達成 20,000,000 円以上
    if (equity.value >= VICTORY_TARGET) {
      closePosition(currentPrice);
      isVictory.value = true;
      saveBestRecord();
      return;
    }

    // 強制平倉檢測 (Liquidation)
    // 浮虧大於等於投入保證金，或市價跌破/衝破強平價
    let hitLiquidation = false;
    if (pos.side === 'BUY' && currentPrice <= pos.liquidationPrice) {
      hitLiquidation = true;
    } else if (pos.side === 'SELL' && currentPrice >= pos.liquidationPrice) {
      hitLiquidation = true;
    }

    if (hitLiquidation || pos.pnl <= -pos.margin) {
      executeLiquidation(currentPrice);
    }
  }

  // 執行強制平倉
  function executeLiquidation(currentPrice: number) {
    if (!activePosition.value) return;

    const pos = activePosition.value;
    const loss = -pos.margin; // 損失全數投入保證金

    tradeHistory.value.unshift({
      id: pos.id,
      side: pos.side,
      margin: pos.margin,
      leverage: pos.leverage,
      entryPrice: pos.entryPrice,
      closePrice: currentPrice,
      pnl: loss,
      pnlPercent: -100,
      isLiquidation: true,
      time: Date.now()
    });

    balance.value = Math.max(0, balance.value - pos.margin);
    activePosition.value = null;

    // 觸發視覺警報
    isLiquidationAlert.value = true;
    setTimeout(() => {
      isLiquidationAlert.value = false;
    }, 2500);

    // 檢查是否完全破產
    if (balance.value < MIN_MARGIN) {
      isGameOver.value = true;
      saveBestRecord();
    }
  }

  // 開立新部位
  function openPosition(side: TradeSide, marginAmount: number, leverage: number, currentPrice: number) {
    if (isGameOver.value || isVictory.value) return false;
    if (marginAmount < MIN_MARGIN) return false;
    if (marginAmount > freeMargin.value) return false;

    // 若已有相同方向部位，則合併加碼；若不同方向，則不允許 (先手動平倉)
    if (activePosition.value) {
      if (activePosition.value.side !== side) {
        // 請先平倉當前反向部位
        return false;
      }
      // 同向加碼：計算加權平均成本價與總保證金
      const prev = activePosition.value;
      const totalMargin = prev.margin + marginAmount;
      const prevPosSize = prev.positionSize;
      const newPosSize = marginAmount * leverage;
      const totalPosSize = prevPosSize + newPosSize;
      const avgEntryPrice = (prev.entryPrice * prevPosSize + currentPrice * newPosSize) / totalPosSize;
      const effectiveLeverage = totalPosSize / totalMargin;

      // 重新計算強平價
      let liquidationPrice = 0;
      if (side === 'BUY') {
        liquidationPrice = avgEntryPrice * (1 - 1 / effectiveLeverage);
      } else {
        liquidationPrice = avgEntryPrice * (1 + 1 / effectiveLeverage);
      }

      activePosition.value = {
        id: prev.id,
        side,
        margin: totalMargin,
        leverage: Number(effectiveLeverage.toFixed(1)),
        positionSize: totalPosSize,
        entryPrice: Number(avgEntryPrice.toFixed(3)),
        liquidationPrice: Number(liquidationPrice.toFixed(3)),
        openTime: prev.openTime,
        pnl: 0,
        pnlPercent: 0
      };
      return true;
    }

    // 計算強平價
    let liquidationPrice = 0;
    if (side === 'BUY') {
      liquidationPrice = currentPrice * (1 - 1 / leverage);
    } else {
      liquidationPrice = currentPrice * (1 + 1 / leverage);
    }

    activePosition.value = {
      id: Math.random().toString(36).substring(2, 9),
      side,
      margin: marginAmount,
      leverage,
      positionSize: marginAmount * leverage,
      entryPrice: currentPrice,
      liquidationPrice: Number(liquidationPrice.toFixed(3)),
      openTime: Date.now(),
      pnl: 0,
      pnlPercent: 0
    };

    return true;
  }

  // 手動平倉
  function closePosition(currentPrice: number) {
    if (!activePosition.value) return;

    const pos = activePosition.value;
    updatePosition(currentPrice);

    const finalPnl = pos.pnl;
    balance.value = Math.max(0, balance.value + finalPnl);

    tradeHistory.value.unshift({
      id: pos.id,
      side: pos.side,
      margin: pos.margin,
      leverage: pos.leverage,
      entryPrice: pos.entryPrice,
      closePrice: currentPrice,
      pnl: finalPnl,
      pnlPercent: pos.pnlPercent,
      isLiquidation: false,
      time: Date.now()
    });

    activePosition.value = null;

    // 勝利或破產檢測
    if (balance.value >= VICTORY_TARGET) {
      isVictory.value = true;
      saveBestRecord();
    } else if (balance.value < MIN_MARGIN) {
      isGameOver.value = true;
      saveBestRecord();
    }
  }

  // 儲存最佳紀錄至 localStorage
  function saveBestRecord() {
    if (typeof window === 'undefined') return;
    try {
      const record = {
        peakEquity: peakEquity.value,
        elapsedSeconds: elapsedSeconds.value,
        winRate: stats.value.winRate,
        timestamp: Date.now()
      };
      const existing = localStorage.getItem('fx_kurumi_best_record');
      if (!existing) {
        localStorage.setItem('fx_kurumi_best_record', JSON.stringify(record));
      } else {
        const parsed = JSON.parse(existing);
        if (peakEquity.value > parsed.peakEquity) {
          localStorage.setItem('fx_kurumi_best_record', JSON.stringify(record));
        }
      }
    } catch {
      // 忽略 localStorage 異常
    }
  }

  // 取得最佳紀錄
  function getBestRecord() {
    if (typeof window === 'undefined') return null;
    try {
      const data = localStorage.getItem('fx_kurumi_best_record');
      return data ? JSON.parse(data) : null;
    } catch {
      return null;
    }
  }

  // 重置遊戲
  function resetGame() {
    balance.value = INITIAL_BALANCE;
    activePosition.value = null;
    tradeHistory.value = [];
    isVictory.value = false;
    isGameOver.value = false;
    isLiquidationAlert.value = false;
    gameStartTime.value = Date.now();
    elapsedSeconds.value = 0;
    peakEquity.value = INITIAL_BALANCE;
    maxDrawdown.value = 0;
  }

  return {
    balance,
    activePosition,
    tradeHistory,
    isVictory,
    isGameOver,
    isLiquidationAlert,
    equity,
    freeMargin,
    marginLevel,
    stats,
    elapsedSeconds,
    openPosition,
    closePosition,
    updatePosition,
    resetGame,
    getBestRecord,
    VICTORY_TARGET,
    MIN_MARGIN
  };
}
