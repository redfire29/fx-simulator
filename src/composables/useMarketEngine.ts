import { ref } from 'vue';
import type { Candle, TimeSpeed } from '../types/trading';

export function useMarketEngine() {
  const currentPrice = ref<number>(154.500);
  const previousPrice = ref<number>(154.500);
  const priceChange = ref<number>(0);
  const priceChangePercent = ref<number>(0);

  const speed = ref<TimeSpeed>(1);
  const candles = ref<Candle[]>([]);
  const currentCandle = ref<Candle | null>(null);

  // 動態市場狀態
  let trendDrift = 0;           // 當前趨勢微漂移
  let trendRemainingTicks = 0;   // 趨勢持續剩餘 Tick 數
  let volatility = 0.012;        // 基礎波動率
  let candlePeriod = 5;          // 5 秒為一根 K 線
  let currentCandleStartTime = 0;

  // 定時器
  let timerId: number | null = null;
  const tickListeners: Array<(price: number, candle: Candle) => void> = [];

  // 生成初始歷史 K 線數據 (讓玩家一進來盤面就有 80 根 K 線走勢)
  function generateInitialHistory(count = 80): Candle[] {
    const list: Candle[] = [];
    const now = Math.floor(Date.now() / 1000);
    const startTime = now - count * candlePeriod;
    
    let price = 154.200 + (Math.random() - 0.5) * 1.5;
    let localTrend = 0;
    let localTrendTicks = 0;

    for (let i = 0; i < count; i++) {
      const time = startTime + i * candlePeriod;
      const open = price;
      let high = open;
      let low = open;
      let close = open;

      // 模擬每根 K 線內部的 10 個 tick
      for (let t = 0; t < 10; t++) {
        if (localTrendTicks <= 0) {
          localTrend = (Math.random() - 0.5) * 0.008;
          localTrendTicks = Math.floor(Math.random() * 20) + 5;
        }
        localTrendTicks--;

        const noise = (Math.random() - 0.5) * 0.015;
        price = Math.max(130, Math.min(170, price + localTrend + noise));
        if (price > high) high = price;
        if (price < low) low = price;
        close = price;
      }

      list.push({
        time,
        open: Number(open.toFixed(3)),
        high: Number(high.toFixed(3)),
        low: Number(low.toFixed(3)),
        close: Number(close.toFixed(3))
      });
    }

    currentPrice.value = Number(price.toFixed(3));
    previousPrice.value = list[list.length - 2]?.close ?? currentPrice.value;
    return list;
  }

  // 產生下一個價格 Tick
  function generateNextTick(): number {
    // 隨機切換市場狀態（盤整、突破、黑天鵝）
    if (trendRemainingTicks <= 0) {
      const mode = Math.random();
      if (mode < 0.25) {
        // 強趨勢突破 (爆衝或跳水)
        trendDrift = (Math.random() - 0.49) * 0.035;
        volatility = 0.025;
        trendRemainingTicks = Math.floor(Math.random() * 25) + 15;
      } else if (mode < 0.30) {
        // 黑天鵝突發尖刺 (大插針)
        trendDrift = (Math.random() - 0.5) * 0.09;
        volatility = 0.045;
        trendRemainingTicks = 3;
      } else {
        // 標準震盪盤整
        trendDrift = (Math.random() - 0.5) * 0.006;
        volatility = 0.010;
        trendRemainingTicks = Math.floor(Math.random() * 20) + 10;
      }
    }
    trendRemainingTicks--;

    // 幾何布朗隨機擾動 + 均值回歸微引力
    const meanReversion = (154.500 - currentPrice.value) * 0.0008;
    const gaussianNoise = (Math.random() + Math.random() - 1.0) * volatility;
    let nextPrice = currentPrice.value + trendDrift + meanReversion + gaussianNoise;

    // 防止極端負值或超出常理範圍
    nextPrice = Math.max(130.000, Math.min(175.000, nextPrice));
    return Number(nextPrice.toFixed(3));
  }

  // 每一步週期執行
  function step() {
    if (speed.value === 0) return;

    const newPrice = generateNextTick();
    previousPrice.value = currentPrice.value;
    currentPrice.value = newPrice;

    priceChange.value = Number((newPrice - previousPrice.value).toFixed(3));
    priceChangePercent.value = Number(((priceChange.value / previousPrice.value) * 100).toFixed(4));

    const now = Math.floor(Date.now() / 1000);

    // K 線聚合
    if (!currentCandle.value) {
      currentCandleStartTime = now;
      currentCandle.value = {
        time: now,
        open: newPrice,
        high: newPrice,
        low: newPrice,
        close: newPrice
      };
    } else {
      // 根據流速推進 K 線形成
      const elapsedGameSeconds = (now - currentCandleStartTime) * (speed.value || 1);
      if (elapsedGameSeconds >= candlePeriod) {
        // 封閉當前 K 線，加入列表
        candles.value.push({ ...currentCandle.value });
        if (candles.value.length > 300) {
          candles.value.shift(); // 保持記憶體精簡
        }

        // 開啟新 K 線
        currentCandleStartTime = now;
        currentCandle.value = {
          time: now,
          open: newPrice,
          high: newPrice,
          low: newPrice,
          close: newPrice
        };
      } else {
        // 更新當前 K 線的高低收
        currentCandle.value.high = Math.max(currentCandle.value.high, newPrice);
        currentCandle.value.low = Math.min(currentCandle.value.low, newPrice);
        currentCandle.value.close = newPrice;
      }
    }

    // 通知所有監聽器 (例如交易部位強平與盈虧計算)
    const candleSnap = { ...currentCandle.value };
    for (const listener of tickListeners) {
      listener(newPrice, candleSnap);
    }
  }

  function startEngine() {
    stopEngine();
    // 依據 speed 動態調整更新間隔 (1x 每 180ms 跳動一次，加速時頻率加快)
    const interval = speed.value === 0 ? 1000 : Math.max(30, Math.floor(180 / speed.value));
    timerId = window.setInterval(step, interval);
  }

  function stopEngine() {
    if (timerId !== null) {
      clearInterval(timerId);
      timerId = null;
    }
  }

  function setSpeed(newSpeed: TimeSpeed) {
    speed.value = newSpeed;
    if (newSpeed === 0) {
      stopEngine();
    } else {
      startEngine();
    }
  }

  function initMarket() {
    stopEngine();
    const initial = generateInitialHistory(80);
    candles.value = initial;
    const last = initial[initial.length - 1];
    if (last) {
      currentCandle.value = { ...last };
      currentCandleStartTime = Math.floor(Date.now() / 1000);
      currentPrice.value = last.close;
      previousPrice.value = last.open;
    }
    setSpeed(speed.value || 1);
  }

  function onTick(callback: (price: number, candle: Candle) => void) {
    tickListeners.push(callback);
    return () => {
      const idx = tickListeners.indexOf(callback);
      if (idx !== -1) tickListeners.splice(idx, 1);
    };
  }

  return {
    currentPrice,
    previousPrice,
    priceChange,
    priceChangePercent,
    speed,
    candles,
    currentCandle,
    setSpeed,
    initMarket,
    stopEngine,
    onTick
  };
}
