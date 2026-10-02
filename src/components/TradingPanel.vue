<script setup lang="ts">
import { ref, computed, watch } from 'vue';
import type { Position, TradeSide } from '../types/trading';

const props = defineProps<{
  balance: number;
  freeMargin: number;
  currentPrice: number;
  activePosition: Position | null;
  minMargin: number;
}>();

const emit = defineEmits<{
  (e: 'openPosition', payload: { side: TradeSide; margin: number; leverage: number }): void;
  (e: 'closePosition'): void;
}>();

// 輸入狀態
const inputMargin = ref<number>(50_000);
const selectedLeverage = ref<number>(100);

const leverageOptions = [10, 25, 50, 100, 200, 400, 500];

// 名義合約價值試算
const estimatedPositionSize = computed(() => {
  return inputMargin.value * selectedLeverage.value;
});

// 試算預估強平價
const estimatedLiquidation = computed(() => {
  const price = props.currentPrice;
  const lev = selectedLeverage.value;
  return {
    buy: price * (1 - 1 / lev),
    sell: price * (1 + 1 / lev)
  };
});

// 快速百分比設定保證金
function setMarginPercent(percent: number) {
  const maxAvailable = props.freeMargin;
  const amount = Math.floor((maxAvailable * percent) / 100);
  inputMargin.value = Math.max(props.minMargin, amount);
}

// 觸發下單
function handleOrder(side: TradeSide) {
  if (inputMargin.value < props.minMargin) {
    inputMargin.value = props.minMargin;
  }
  if (inputMargin.value > props.freeMargin) {
    inputMargin.value = props.freeMargin;
  }
  emit('openPosition', {
    side,
    margin: inputMargin.value,
    leverage: selectedLeverage.value
  });
}

// 金額千分位
function formatYen(amount: number): string {
  return Math.round(amount).toLocaleString('ja-JP');
}

// 當餘額大幅改變時微調預設投入保證金
watch(
  () => props.freeMargin,
  (newFree) => {
    if (inputMargin.value > newFree) {
      inputMargin.value = Math.max(props.minMargin, Math.floor(newFree * 0.25));
    }
  }
);
</script>

<template>
  <div class="w-full h-full bg-[#0d131f] border-t lg:border-t-0 lg:border-l border-slate-800/80 flex flex-col justify-between select-none relative overflow-hidden min-h-0">
    <!-- 頂部與內容滾動區 -->
    <div class="flex-1 overflow-y-auto p-3 sm:p-3.5 space-y-3 min-h-0">
      <!-- 頂部標題與可用資金 -->
      <div class="flex items-center justify-between border-b border-slate-800/90 pb-2">
        <span class="text-xs font-bold text-slate-200 tracking-wider">操盤下單終端</span>
        <span class="text-[11px] text-slate-400">
          可用本金: <span class="text-slate-100 font-mono font-bold">¥{{ formatYen(freeMargin) }}</span>
        </span>
      </div>

      <!-- 若有持倉部位：優先置頂顯示資訊卡 (極速看盤) -->
      <div
        v-if="activePosition"
        class="bg-[#090d16] border rounded-xl p-2.5 sm:p-3 space-y-2 shadow-lg transition-colors duration-300"
        :class="activePosition.pnl >= 0 ? 'border-emerald-700/60' : 'border-rose-700/60 border-glow-red'"
      >
        <!-- 部位標題與方向標籤 -->
        <div class="flex items-center justify-between">
          <div class="flex items-center space-x-2">
            <span
              :class="activePosition.side === 'BUY' ? 'bg-pink-950 text-[#F780AE] border-pink-700/70' : 'bg-cyan-950 text-[#25D5DE] border-cyan-700/70'"
              class="text-xs font-black px-2 py-0.5 rounded border tracking-wide"
            >
              {{ activePosition.side === 'BUY' ? '多頭 LONG' : '空頭 SHORT' }}
            </span>
            <span class="text-xs text-amber-400 font-mono font-bold">{{ activePosition.leverage }}x 槓桿</span>
          </div>
          <span class="text-[11px] text-slate-400 font-mono">本金 ¥{{ formatYen(activePosition.margin) }}</span>
        </div>

        <!-- 即時未實現損益 -->
        <div class="bg-slate-900/90 rounded-lg p-2 text-center border border-slate-800">
          <span class="text-[10px] text-slate-400 block mb-0.5">未實現損益 (PnL)</span>
          <div 
            :class="activePosition.pnl >= 0 ? 'text-emerald-400 glow-green' : 'text-rose-400 glow-red'"
            class="text-2xl font-black font-mono tracking-tight"
          >
            {{ activePosition.pnl >= 0 ? '+' : '' }}¥{{ formatYen(activePosition.pnl) }}
          </div>
          <span 
            :class="activePosition.pnl >= 0 ? 'text-emerald-400' : 'text-rose-400'"
            class="text-xs font-bold font-mono"
          >
            ({{ activePosition.pnl >= 0 ? '+' : '' }}{{ activePosition.pnlPercent.toFixed(2) }}%)
          </span>
        </div>

        <!-- 價格細節 -->
        <div class="grid grid-cols-2 gap-2 text-[11px] font-mono">
          <div class="bg-slate-900/50 p-1.5 rounded border border-slate-800/80">
            <span class="text-slate-400 text-[10px] block">開倉均價</span>
            <span class="text-slate-200 font-bold">{{ activePosition.entryPrice.toFixed(3) }}</span>
          </div>
          <div class="bg-slate-900/50 p-1.5 rounded border border-slate-800/80">
            <span class="text-slate-400 text-[10px] block">當前市價</span>
            <span class="text-white font-bold">{{ currentPrice.toFixed(3) }}</span>
          </div>
        </div>

        <!-- 致命強平警戒 -->
        <div class="bg-rose-950/40 border border-rose-900/60 p-1.5 sm:p-2 rounded-lg flex items-center justify-between text-xs">
          <span class="text-rose-300 font-bold">☠️ 強平線:</span>
          <span class="text-rose-400 font-mono font-black text-sm">{{ activePosition.liquidationPrice.toFixed(3) }}</span>
        </div>
      </div>

      <!-- 下單/加碼參數輸入區 -->
      <div class="space-y-2.5">
        <!-- 投入金額輸入 -->
        <div class="space-y-1">
          <div class="flex justify-between items-center text-xs">
            <label class="text-slate-300 font-medium">
              {{ activePosition ? '追加保證金 (日圓)' : '投入保證金 (日圓)' }}
            </label>
            <span class="text-[10px] text-slate-400 font-mono">最低 ¥{{ formatYen(minMargin) }}</span>
          </div>
          <div class="relative">
            <span class="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400 font-bold font-mono text-xs">¥</span>
            <input
              v-model.number="inputMargin"
              type="number"
              :min="minMargin"
              :max="freeMargin"
              step="1000"
              class="w-full bg-[#090d16] border border-slate-700 focus:border-indigo-500 rounded-lg py-1.5 pl-7 pr-3 text-white font-mono font-bold text-xs outline-none transition"
            />
          </div>

          <!-- 快速百分比按鈕 -->
          <div class="grid grid-cols-4 gap-1 pt-0.5">
            <button
              @click="setMarginPercent(10)"
              class="py-1 text-[10px] font-bold bg-slate-800/80 hover:bg-slate-700 text-slate-300 hover:text-white rounded border border-slate-700 transition"
            >
              10%
            </button>
            <button
              @click="setMarginPercent(25)"
              class="py-1 text-[10px] font-bold bg-slate-800/80 hover:bg-slate-700 text-slate-300 hover:text-white rounded border border-slate-700 transition"
            >
              25%
            </button>
            <button
              @click="setMarginPercent(50)"
              class="py-1 text-[10px] font-bold bg-slate-800/80 hover:bg-slate-700 text-slate-300 hover:text-white rounded border border-slate-700 transition"
            >
              50%
            </button>
            <button
              @click="setMarginPercent(100)"
              class="py-1 text-[10px] font-black bg-rose-950/40 hover:bg-rose-900/60 text-rose-300 hover:text-rose-100 rounded border border-rose-800/50 transition"
            >
              全倉 All-in
            </button>
          </div>
        </div>

        <!-- 槓桿倍數選擇 -->
        <div class="space-y-1">
          <div class="flex justify-between items-center text-xs">
            <label class="text-slate-300 font-medium">槓桿倍數</label>
            <span class="text-xs font-mono font-bold text-amber-400">{{ selectedLeverage }}x</span>
          </div>
          <div class="grid grid-cols-4 gap-1">
            <button
              v-for="lev in leverageOptions"
              :key="lev"
              @click="selectedLeverage = lev"
              :class="selectedLeverage === lev ? 'bg-amber-500/20 text-amber-300 border-amber-500/60 font-black' : 'bg-slate-800/80 text-slate-400 hover:text-white border-slate-700'"
              class="py-1 text-[11px] rounded border transition"
            >
              {{ lev }}x
            </button>
          </div>
        </div>

        <!-- 下單資訊預覽 -->
        <div class="bg-[#090d16] p-2 rounded-lg border border-slate-800/80 space-y-0.5 text-[10px]">
          <div class="flex justify-between text-slate-400">
            <span>{{ activePosition ? '預計加碼名義規模:' : '合約名義價值:' }}</span>
            <span class="text-slate-200 font-mono font-bold">¥{{ formatYen(estimatedPositionSize) }}</span>
          </div>
          <div v-if="!activePosition || activePosition.side === 'BUY'" class="flex justify-between text-slate-400">
            <span>{{ activePosition ? '加碼後多頭強平參考:' : '買入多頭強平價:' }}</span>
            <span class="text-rose-400 font-mono">{{ estimatedLiquidation.buy.toFixed(3) }}</span>
          </div>
          <div v-if="!activePosition || activePosition.side === 'SELL'" class="flex justify-between text-slate-400">
            <span>{{ activePosition ? '加碼後空頭強平參考:' : '賣出空頭強平價:' }}</span>
            <span class="text-rose-400 font-mono">{{ estimatedLiquidation.sell.toFixed(3) }}</span>
          </div>
        </div>
      </div>
    </div>

    <!-- 底部固定常駐操作欄 (Sticky Bottom Dock) -->
    <div class="sticky bottom-0 z-30 bg-[#0d131f]/95 backdrop-blur-md border-t border-slate-800/90 p-3 pt-2.5 pb-[max(0.75rem,calc(env(safe-area-inset-bottom)+0.5rem))] shadow-[0_-8px_20px_rgba(0,0,0,0.5)] flex-shrink-0">
      <!-- 狀態 A：未持倉時，顯示買入與賣出雙按鈕 -->
      <div v-if="!activePosition" class="grid grid-cols-2 gap-2">
        <!-- 買入 (Long) -->
        <button
          @click="handleOrder('BUY')"
          :disabled="freeMargin < minMargin"
          class="flex flex-col items-center justify-center bg-gradient-to-b from-[#F780AE] to-[#E25C8E] hover:from-[#FA93BD] hover:to-[#F780AE] disabled:opacity-40 disabled:cursor-not-allowed text-white py-2.5 rounded-xl font-bold shadow-lg shadow-pink-500/20 transition-all active:scale-[0.98]"
        >
          <span class="text-xs font-black tracking-wider">🌸 買入 (做多)</span>
          <span class="text-[9px] text-pink-100 font-normal">買漲 UP</span>
        </button>

        <!-- 賣出 (Short) -->
        <button
          @click="handleOrder('SELL')"
          :disabled="freeMargin < minMargin"
          class="flex flex-col items-center justify-center bg-gradient-to-b from-[#25D5DE] to-[#14B2BB] hover:from-[#3DE6EF] hover:to-[#25D5DE] disabled:opacity-40 disabled:cursor-not-allowed text-white py-2.5 rounded-xl font-bold shadow-lg shadow-cyan-500/20 transition-all active:scale-[0.98]"
        >
          <span class="text-xs font-black tracking-wider">🌊 賣出 (做空)</span>
          <span class="text-[9px] text-cyan-100 font-normal">買跌 DOWN</span>
        </button>
      </div>

      <!-- 狀態 B：已持倉時，切換為「市價平倉 (75%)」＋「同向加碼 (25%)」 -->
      <div v-else class="flex items-stretch space-x-2">
        <!-- 主按鈕：市價全數平倉 (75%) -->
        <button
          @click="emit('closePosition')"
          class="flex-[3] flex flex-col items-center justify-center bg-gradient-to-r from-amber-600 via-orange-600 to-amber-600 hover:from-amber-500 hover:to-orange-500 text-white py-2 px-3 rounded-xl font-black shadow-lg shadow-orange-600/30 transition-all active:scale-[0.98] border border-amber-400/40"
        >
          <span class="text-xs tracking-wider flex items-center space-x-1">
            <span>🔥 市價全數平倉</span>
          </span>
          <div class="flex items-center space-x-1.5 text-[11px] font-mono mt-0.5">
            <span :class="activePosition.pnl >= 0 ? 'text-emerald-200' : 'text-rose-200'" class="font-black">
              {{ activePosition.pnl >= 0 ? '+' : '' }}¥{{ formatYen(activePosition.pnl) }}
            </span>
            <span :class="activePosition.pnl >= 0 ? 'text-emerald-200' : 'text-rose-200'" class="text-[10px] opacity-90">
              ({{ activePosition.pnl >= 0 ? '+' : '' }}{{ activePosition.pnlPercent.toFixed(1) }}%)
            </span>
          </div>
        </button>

        <!-- 次按鈕：同向加碼 (25%) -->
        <button
          @click="handleOrder(activePosition.side)"
          :disabled="freeMargin < minMargin || inputMargin > freeMargin"
          :class="activePosition.side === 'BUY'
            ? 'bg-gradient-to-b from-[#F780AE] to-[#E25C8E] hover:from-[#FA93BD] hover:to-[#F780AE] shadow-pink-500/20'
            : 'bg-gradient-to-b from-[#25D5DE] to-[#14B2BB] hover:from-[#3DE6EF] hover:to-[#25D5DE] shadow-cyan-500/20'"
          class="flex-[1] flex flex-col items-center justify-center disabled:opacity-40 disabled:cursor-not-allowed text-white py-2 px-2 rounded-xl font-bold shadow-lg transition-all active:scale-[0.98] border border-white/20"
          :title="`以當前設定保證金 ¥${formatYen(inputMargin)} 追加持倉`"
        >
          <span class="text-[11px] font-black tracking-wide whitespace-nowrap">
            ➕ 加碼{{ activePosition.side === 'BUY' ? '多' : '空' }}
          </span>
          <span class="text-[9px] text-white/90 font-mono mt-0.5">
            ¥{{ formatYen(inputMargin) }}
          </span>
        </button>
      </div>
    </div>
  </div>
</template>
