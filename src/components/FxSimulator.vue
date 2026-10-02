<script setup lang="ts">
import { onMounted, onUnmounted } from 'vue';
import { useMarketEngine } from '../composables/useMarketEngine';
import { useTrading } from '../composables/useTrading';
import HeaderBar from './HeaderBar.vue';
import ChartView from './ChartView.vue';
import TradingPanel from './TradingPanel.vue';
import ResultModal from './ResultModal.vue';
import type { TimeSpeed, TradeSide } from '../types/trading';

const {
  currentPrice,
  priceChange,
  priceChangePercent,
  speed,
  candles,
  currentCandle,
  setSpeed,
  initMarket,
  stopEngine,
  onTick
} = useMarketEngine();

const {
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
  openPosition,
  closePosition,
  updatePosition,
  resetGame,
  getBestRecord,
  VICTORY_TARGET,
  MIN_MARGIN
} = useTrading();

// 監聽行情 Tick，即時更新持倉未實現損益與強平檢測
let unsubscribeTick: (() => void) | null = null;

onMounted(() => {
  initMarket();

  unsubscribeTick = onTick((price) => {
    updatePosition(price);
  });
});

onUnmounted(() => {
  if (unsubscribeTick) {
    unsubscribeTick();
    unsubscribeTick = null;
  }
  stopEngine();
});

// 下單處理
function handleOpenPosition(payload: { side: TradeSide; margin: number; leverage: number }) {
  openPosition(payload.side, payload.margin, payload.leverage, currentPrice.value);
}

// 平倉處理
function handleClosePosition() {
  closePosition(currentPrice.value);
}

// 變更時間加速
function handleChangeSpeed(newSpeed: TimeSpeed) {
  setSpeed(newSpeed);
}

// 重新開始遊戲
function handleRestart() {
  resetGame();
  initMarket();
}

// 繼續自由遊玩 (達成 2000 萬後)
function handleContinue() {
  isVictory.value = false;
}
</script>

<template>
  <div class="w-screen h-screen h-[100dvh] flex flex-col bg-[#FFF7FA] text-[#3B2C30] kurumi-grid-bg overflow-hidden select-none">
    <!-- 頂部導航列與狀態 -->
    <HeaderBar
      :equity="equity"
      :balance="balance"
      :marginLevel="marginLevel"
      :speed="speed"
      :targetBalance="VICTORY_TARGET"
      :currentPrice="currentPrice"
      :priceChange="priceChange"
      :priceChangePercent="priceChangePercent"
      :bestRecord="getBestRecord()"
      @changeSpeed="handleChangeSpeed"
      @resetGame="handleRestart"
    />

    <!-- 主內容區：左側 K 線圖表 + 右側下單終端 -->
    <main class="flex-1 flex flex-col lg:flex-row overflow-hidden relative min-h-0">
      <!-- 左側/中央：TradingView 即時 K 線圖表 -->
      <section class="h-[42vh] sm:h-[48vh] lg:h-full lg:flex-1 relative overflow-hidden bg-[#FFE7D1] flex-shrink-0">
        <ChartView
          :candles="candles"
          :currentCandle="currentCandle"
          :activePosition="activePosition"
        />
      </section>

      <!-- 右側：操盤下單與部位控制側欄 -->
      <aside class="flex-1 lg:flex-none w-full lg:w-80 xl:w-96 lg:h-full flex-shrink-0 bg-white/95 border-t lg:border-t-0 lg:border-l border-[#FFD7E8] shadow-sm z-20 flex flex-col min-h-0 overflow-hidden">
        <TradingPanel
          :balance="balance"
          :freeMargin="freeMargin"
          :currentPrice="currentPrice"
          :activePosition="activePosition"
          :minMargin="MIN_MARGIN"
          :gameStartTime="stats.gameStartTime"
          @openPosition="handleOpenPosition"
          @closePosition="handleClosePosition"
        />
      </aside>
    </main>

    <!-- 底部最近交易紀錄 (歷史清單，桌機平板顯示) -->
    <footer v-if="tradeHistory.length > 0" class="hidden md:flex h-7 bg-[#FFF0F5]/90 backdrop-blur-sm border-t border-[#FFD7E8] px-4 items-center justify-between text-[11px] text-[#8C6D77] font-mono overflow-x-auto whitespace-nowrap flex-shrink-0">
      <div class="flex items-center space-x-4">
        <span class="text-[#8C6D77] font-bold uppercase">最近紀錄:</span>
        <div v-for="t in tradeHistory.slice(0, 4)" :key="t.id" class="flex items-center space-x-1.5">
          <span :class="t.side === 'BUY' ? 'text-[#FF78A6]' : 'text-[#17BCC8]'" class="font-bold">
            {{ t.side === 'BUY' ? '買入' : '賣出' }}{{ t.leverage }}x
          </span>
          <span :class="t.pnl >= 0 ? 'text-[#FF78A6]' : 'text-[#17BCC8]'">
            {{ t.pnl >= 0 ? '+' : '' }}¥{{ Math.round(t.pnl).toLocaleString('ja-JP') }}
          </span>
          <span v-if="t.isLiquidation" class="text-[#17BCC8] font-bold bg-[#EBFBFC] border border-[#ABE7E7] px-1 py-0.2 rounded text-[10px]">
            [爆倉]
          </span>
        </div>
      </div>
      <div class="text-[#8C6D77]">
        總累計手數: {{ stats.totalTrades }} 筆
      </div>
    </footer>

    <!-- 勝負結算與爆倉警報彈窗 -->
    <ResultModal
      :isVictory="isVictory"
      :isGameOver="isGameOver"
      :isLiquidationAlert="isLiquidationAlert"
      :stats="stats"
      :currentBalance="balance"
      @restart="handleRestart"
      @continuePlaying="handleContinue"
    />
  </div>
</template>
