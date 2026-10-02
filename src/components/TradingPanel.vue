<script setup lang="ts">
import { ref, computed, watch } from 'vue';
import type { Position, TradeSide } from '../types/trading';

const props = defineProps<{
  balance: number;
  freeMargin: number;
  currentPrice: number;
  activePosition: Position | null;
  minMargin: number;
  gameStartTime?: number;
}>();

const emit = defineEmits<{
  (e: 'openPosition', payload: { side: TradeSide; margin: number; leverage: number }): void;
  (e: 'closePosition'): void;
}>();

// 輸入狀態
const inputMargin = ref<number>(50_000);
const selectedLeverage = ref<number>(100);
const selectedPercent = ref<number | null>(null);

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

// 快速百分比設定保證金 (記憶百分比模式)
function setMarginPercent(percent: number) {
  selectedPercent.value = percent;
  const maxAvailable = props.freeMargin;
  if (!props.activePosition || maxAvailable > 0) {
    const amount = Math.floor((maxAvailable * percent) / 100);
    inputMargin.value = Math.max(props.minMargin, amount);
  }
}

// 手動輸入金額時解除百分比鎖定
function handleManualInput() {
  selectedPercent.value = null;
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

// 當可用本金更新或平倉結算時智慧同步保證金金額
watch(
  [() => props.freeMargin, () => props.activePosition],
  ([newFree, newPos]) => {
    // 平倉結算後（無持倉部位）或常態資金變化
    if (!newPos) {
      if (selectedPercent.value !== null) {
        // 鎖定百分比模式 (All-in 或指定百分比)：自動動態同步為最新全部金額
        const amount = Math.floor((newFree * selectedPercent.value) / 100);
        inputMargin.value = Math.max(props.minMargin, amount);
      } else if (inputMargin.value > newFree) {
        // 手動輸入模式下若超出可用金額，防呆調整
        inputMargin.value = Math.max(props.minMargin, Math.floor(newFree * 0.25));
      }
    } else {
      // 持倉中：若可用餘額不足以支應原本的輸入值，適度校正 (避免超過可用本金)
      if (selectedPercent.value !== null && newFree > 0) {
        const amount = Math.floor((newFree * selectedPercent.value) / 100);
        inputMargin.value = Math.max(props.minMargin, amount);
      }
    }
  }
);

// 遊戲重開局時還原預設值
watch(
  () => props.gameStartTime,
  () => {
    inputMargin.value = 50_000;
    selectedLeverage.value = 100;
    selectedPercent.value = null;
  }
);
</script>

<template>
  <div class="w-full h-full bg-white border-t lg:border-t-0 lg:border-l border-[#FFD7E8] flex flex-col justify-between select-none relative overflow-hidden min-h-0">
    <!-- 頂部與內容滾動區 -->
    <div class="flex-1 overflow-y-auto p-3 sm:p-3.5 space-y-3 min-h-0">
      <!-- 頂部標題與可用資金 -->
      <div class="flex items-center justify-between border-b border-[#FFD7E8] pb-2">
        <span class="text-xs font-black text-[#3B2C30] tracking-wider">操盤下單終端</span>
        <span class="text-[11px] text-[#8C6D77]">
          可用本金: <span class="text-[#FF78A6] font-mono font-black">¥{{ formatYen(freeMargin) }}</span>
        </span>
      </div>

      <!-- 若有持倉部位：優先置頂顯示資訊卡 (極速看盤) -->
      <div
        v-if="activePosition"
        class="border rounded-xl p-2.5 sm:p-3 space-y-2 shadow-xs transition-colors duration-300"
        :class="activePosition.pnl >= 0 ? 'bg-[#FFF9FB] border-[#FF78A6]/40 border-glow-pink' : 'bg-[#F4FCFD] border-[#17BCC8]/40 border-glow-cyan'"
      >
        <!-- 部位標題與方向標籤 -->
        <div class="flex items-center justify-between">
          <div class="flex items-center space-x-2">
            <span
              :class="activePosition.side === 'BUY' ? 'bg-[#FFF0F5] text-[#FF78A6] border-[#FFD7E8]' : 'bg-[#EBFBFC] text-[#17BCC8] border-[#ABE7E7]'"
              class="text-xs font-black px-2 py-0.5 rounded border tracking-wide shadow-2xs"
            >
              {{ activePosition.side === 'BUY' ? '多頭 LONG' : '空頭 SHORT' }}
            </span>
            <span class="text-xs text-[#FF78A6] font-mono font-bold">{{ activePosition.leverage }}x 槓桿</span>
          </div>
          <span class="text-[11px] text-[#8C6D77] font-mono">本金 ¥{{ formatYen(activePosition.margin) }}</span>
        </div>

        <!-- 即時未實現損益 (久留美體系: 正獲利粉紅、負虧損青藍) -->
        <div class="bg-white rounded-lg p-2 text-center border border-[#FFD7E8] shadow-2xs">
          <span class="text-[10px] text-[#8C6D77] block mb-0.5 font-medium">未實現損益 (PnL)</span>
          <div 
            :class="activePosition.pnl >= 0 ? 'text-[#FF78A6] glow-pink' : 'text-[#17BCC8] glow-cyan'"
            class="text-2xl font-black font-mono tracking-tight"
          >
            {{ activePosition.pnl >= 0 ? '+' : '' }}¥{{ formatYen(activePosition.pnl) }}
          </div>
          <span 
            :class="activePosition.pnl >= 0 ? 'text-[#FF78A6]' : 'text-[#17BCC8]'"
            class="text-xs font-bold font-mono"
          >
            ({{ activePosition.pnl >= 0 ? '+' : '' }}{{ activePosition.pnlPercent.toFixed(2) }}%)
          </span>
        </div>

        <!-- 價格細節 -->
        <div class="grid grid-cols-2 gap-2 text-[11px] font-mono">
          <div class="bg-white/80 p-1.5 rounded-lg border border-[#FFD7E8]">
            <span class="text-[#8C6D77] text-[10px] block">開倉均價</span>
            <span class="text-[#3B2C30] font-bold">{{ activePosition.entryPrice.toFixed(3) }}</span>
          </div>
          <div class="bg-white/80 p-1.5 rounded-lg border border-[#FFD7E8]">
            <span class="text-[#8C6D77] text-[10px] block">當前市價</span>
            <span class="text-[#3B2C30] font-bold">{{ currentPrice.toFixed(3) }}</span>
          </div>
        </div>

        <!-- 致命強平警戒 -->
        <div class="bg-[#EBFBFC] border border-[#ABE7E7] p-1.5 sm:p-2 rounded-lg flex items-center justify-between text-xs">
          <span class="text-[#17BCC8] font-bold">☠️ 強平線:</span>
          <span class="text-[#17BCC8] font-mono font-black text-sm">{{ activePosition.liquidationPrice.toFixed(3) }}</span>
        </div>
      </div>

      <!-- 下單/加碼參數輸入區 -->
      <div class="space-y-2.5">
        <!-- 投入金額輸入 -->
        <div class="space-y-1">
          <div class="flex justify-between items-center text-xs">
            <label class="text-[#554046] font-bold">
              {{ activePosition ? '追加保證金 (日圓)' : '投入保證金 (日圓)' }}
            </label>
            <span class="text-[10px] text-[#8C6D77] font-mono">最低 ¥{{ formatYen(minMargin) }}</span>
          </div>
          <div class="relative">
            <span class="absolute left-2.5 top-1/2 -translate-y-1/2 text-[#FF78A6] font-bold font-mono text-xs">¥</span>
            <input
              v-model.number="inputMargin"
              @input="handleManualInput"
              type="number"
              :min="minMargin"
              :max="freeMargin"
              step="1000"
              class="w-full bg-[#FFF9FB] border focus:border-[#FF78A6] rounded-lg py-1.5 pl-7 pr-16 text-[#3B2C30] font-mono font-bold text-xs outline-none transition shadow-2xs"
              :class="selectedPercent === 100 ? 'border-[#FF78A6] bg-[#FFF0F5] text-[#FF78A6]' : selectedPercent ? 'border-[#FFC6DA] bg-[#FFF5F8] text-[#3B2C30]' : 'border-[#FFD7E8]'"
            />
            <!-- 模式標籤指示器 -->
            <span
              v-if="selectedPercent === 100"
              class="absolute right-2 top-1/2 -translate-y-1/2 text-[9px] bg-[#FF78A6] text-white px-1.5 py-0.5 rounded font-black tracking-wider shadow-xs animate-pulse select-none"
            >
              ALL-IN
            </span>
            <span
              v-else-if="selectedPercent"
              class="absolute right-2 top-1/2 -translate-y-1/2 text-[9px] bg-[#FFD7E8] text-[#FF78A6] border border-[#FFC6DA] px-1.5 py-0.5 rounded font-bold tracking-wider select-none"
            >
              {{ selectedPercent }}%
            </span>
          </div>

          <!-- 快速百分比按鈕 (統一粉紅主題系) -->
          <div class="grid grid-cols-4 gap-1 pt-0.5">
            <button
              v-for="p in [10, 25, 50]"
              :key="p"
              @click="setMarginPercent(p)"
              :class="selectedPercent === p
                ? 'bg-[#FF78A6] text-white border-[#FF78A6] shadow-xs font-black'
                : 'bg-[#FFF5F8] hover:bg-[#FFEBF2] text-[#8C6D77] hover:text-[#FF78A6] border-[#FFD7E8] font-bold'"
              class="py-1 text-[10px] rounded-md border transition"
            >
              {{ p }}%
            </button>
            <button
              @click="setMarginPercent(100)"
              :class="selectedPercent === 100
                ? 'bg-gradient-to-r from-[#FF78A6] to-[#FF4D85] text-white border-[#FF78A6] shadow-sm font-black scale-[1.02]'
                : 'bg-[#FFF0F5] hover:bg-[#FFE0EB] text-[#FF78A6] hover:text-[#FF4D85] border-[#FFC6DA] font-bold'"
              class="py-1 text-[10px] rounded-md border transition-all"
            >
              全倉 All-in
            </button>
          </div>
        </div>

        <!-- 槓桿倍數選擇 (統一粉紅主題系) -->
        <div class="space-y-1">
          <div class="flex justify-between items-center text-xs">
            <label class="text-[#554046] font-bold">槓桿倍數</label>
            <span class="text-xs font-mono font-bold text-[#FF78A6]">{{ selectedLeverage }}x</span>
          </div>
          <div class="grid grid-cols-4 gap-1">
            <button
              v-for="lev in leverageOptions"
              :key="lev"
              @click="selectedLeverage = lev"
              :class="selectedLeverage === lev ? 'bg-[#FF78A6] text-white border-[#FF78A6] font-black shadow-xs' : 'bg-[#FFF5F8] hover:bg-[#FFEBF2] text-[#8C6D77] hover:text-[#FF78A6] border-[#FFD7E8] font-medium'"
              class="py-1 text-[11px] rounded-md border transition"
            >
              {{ lev }}x
            </button>
          </div>
        </div>

        <!-- 下單資訊預覽 -->
        <div class="bg-[#FFF9FB] p-2 rounded-lg border border-[#FFD7E8] space-y-0.5 text-[10px]">
          <div class="flex justify-between text-[#8C6D77]">
            <span>{{ activePosition ? '預計加碼名義規模:' : '合約名義價值:' }}</span>
            <span class="text-[#3B2C30] font-mono font-bold">¥{{ formatYen(estimatedPositionSize) }}</span>
          </div>
          <div v-if="!activePosition || activePosition.side === 'BUY'" class="flex justify-between text-[#8C6D77]">
            <span>{{ activePosition ? '加碼後多頭強平參考:' : '買入多頭強平價:' }}</span>
            <span class="text-[#17BCC8] font-mono font-bold">{{ estimatedLiquidation.buy.toFixed(3) }}</span>
          </div>
          <div v-if="!activePosition || activePosition.side === 'SELL'" class="flex justify-between text-[#8C6D77]">
            <span>{{ activePosition ? '加碼後空頭強平參考:' : '賣出空頭強平價:' }}</span>
            <span class="text-[#17BCC8] font-mono font-bold">{{ estimatedLiquidation.sell.toFixed(3) }}</span>
          </div>
        </div>
      </div>
    </div>

    <!-- 底部固定常駐操作欄 (Sticky Bottom Dock) -->
    <div class="sticky bottom-0 z-30 bg-white/95 backdrop-blur-md border-t border-[#FFD7E8] p-3 pt-2.5 pb-[max(0.75rem,calc(env(safe-area-inset-bottom)+0.5rem))] shadow-[0_-4px_16px_rgba(255,120,166,0.08)] flex-shrink-0">
      <!-- 狀態 A：未持倉時，顯示買入與賣出雙按鈕 (久留美官方粉藍) -->
      <div v-if="!activePosition" class="grid grid-cols-2 gap-2">
        <!-- 買入 (Long) -->
        <button
          @click="handleOrder('BUY')"
          :disabled="freeMargin < minMargin"
          class="flex flex-col items-center justify-center bg-gradient-to-b from-[#FF78A6] to-[#E84880] hover:from-[#FFA3C3] hover:to-[#FF78A6] disabled:opacity-40 disabled:cursor-not-allowed text-white py-2.5 rounded-xl font-bold shadow-md shadow-pink-500/20 transition-all active:scale-[0.98]"
        >
          <span class="text-xs font-black tracking-wider">買入 (做多)</span>
          <span class="text-[9px] text-pink-100 font-normal">買漲 UP</span>
        </button>

        <!-- 賣出 (Short) -->
        <button
          @click="handleOrder('SELL')"
          :disabled="freeMargin < minMargin"
          class="flex flex-col items-center justify-center bg-gradient-to-b from-[#17BCC8] to-[#0E9AA7] hover:from-[#35D7E2] hover:to-[#17BCC8] disabled:opacity-40 disabled:cursor-not-allowed text-white py-2.5 rounded-xl font-bold shadow-md shadow-cyan-500/20 transition-all active:scale-[0.98]"
        >
          <span class="text-xs font-black tracking-wider">賣出 (做空)</span>
          <span class="text-[9px] text-cyan-100 font-normal">買跌 DOWN</span>
        </button>
      </div>

      <!-- 狀態 B：已持倉時，切換為「市價平倉 (75%)」＋「同向加碼 (25%)」 -->
      <div v-else class="flex items-stretch space-x-2">
        <!-- 主按鈕：市價全數平倉 (75%) (久留美粉紅活力高彩) -->
        <button
          @click="emit('closePosition')"
          class="flex-[3] flex flex-col items-center justify-center bg-gradient-to-r from-[#FF78A6] via-[#FF6392] to-[#FF5083] hover:from-[#FF6392] hover:to-[#FF3B76] text-white py-2 px-3 rounded-xl font-black shadow-md shadow-pink-500/25 transition-all active:scale-[0.98] border border-white/40"
        >
          <span class="text-xs tracking-wider flex items-center space-x-1">
            <span>🔥 市價全數平倉</span>
          </span>
          <div class="flex items-center space-x-1.5 text-[11px] font-mono mt-0.5">
            <span :class="activePosition.pnl >= 0 ? 'text-white' : 'text-[#EBFBFC]'" class="font-black">
              {{ activePosition.pnl >= 0 ? '+' : '' }}¥{{ formatYen(activePosition.pnl) }}
            </span>
            <span :class="activePosition.pnl >= 0 ? 'text-white/90' : 'text-[#EBFBFC]/90'" class="text-[10px]">
              ({{ activePosition.pnl >= 0 ? '+' : '' }}{{ activePosition.pnlPercent.toFixed(1) }}%)
            </span>
          </div>
        </button>

        <!-- 次按鈕：同向加碼 (25%) -->
        <button
          @click="handleOrder(activePosition.side)"
          :disabled="freeMargin < minMargin || inputMargin > freeMargin"
          :class="activePosition.side === 'BUY'
            ? 'bg-gradient-to-b from-[#FF78A6] to-[#E84880] hover:from-[#FFA3C3] hover:to-[#FF78A6] shadow-pink-500/20'
            : 'bg-gradient-to-b from-[#17BCC8] to-[#0E9AA7] hover:from-[#35D7E2] hover:to-[#17BCC8] shadow-cyan-500/20'"
          class="flex-[1] flex flex-col items-center justify-center disabled:opacity-40 disabled:cursor-not-allowed text-white py-2 px-2 rounded-xl font-bold shadow-md transition-all active:scale-[0.98] border border-white/20"
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
