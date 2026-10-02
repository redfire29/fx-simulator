<script setup lang="ts">
import { computed } from 'vue';
import type { TimeSpeed } from '../types/trading';

const props = defineProps<{
  equity: number;
  balance: number;
  marginLevel: number;
  speed: TimeSpeed;
  targetBalance: number;
  currentPrice: number;
  priceChange: number;
  priceChangePercent: number;
  bestRecord: { peakEquity: number; winRate: number } | null;
}>();

const emit = defineEmits<{
  (e: 'changeSpeed', speed: TimeSpeed): void;
  (e: 'resetGame'): void;
}>();

// 目標進度百分比 (0% ~ 100%)
const progressPercent = computed(() => {
  const p = (props.equity / props.targetBalance) * 100;
  return Math.min(100, Math.max(0, p)).toFixed(1);
});

// 金額千分位格式化
function formatYen(amount: number): string {
  return Math.round(amount).toLocaleString('ja-JP');
}
</script>

<template>
  <header class="w-full bg-white/95 backdrop-blur-md border-b border-[#FFD7E8] px-4 py-2.5 flex flex-wrap items-center justify-between gap-3 shadow-[0_2px_12px_rgba(255,120,166,0.06)] select-none">
    <!-- 左側：品牌名稱與當前幣種走勢 -->
    <div class="flex items-center space-x-4">
      <div class="flex items-center space-x-2">
        <div class="w-7 h-7 rounded-lg bg-gradient-to-br from-[#FF78A6] to-[#FF4D85] flex items-center justify-center font-black text-white text-xs shadow-sm shadow-pink-300">
          FX
        </div>
        <div>
          <h1 class="text-sm font-extrabold text-[#3B2C30] tracking-wide">
            FX模擬器
          </h1>
          <p class="text-[11px] text-[#8C6D77]">目標：2,000萬日圓達成勝利</p>
        </div>
      </div>

      <div class="h-6 w-[1px] bg-[#FFD7E8] hidden sm:block"></div>

      <!-- 當前 USD/JPY 報價即時跳動 -->
      <div class="flex items-center space-x-2 font-mono">
        <span class="text-xs text-[#8C6D77] font-sans font-medium">USD/JPY:</span>
        <span 
          :class="priceChange >= 0 ? 'text-[#FF78A6] glow-pink' : 'text-[#17BCC8] glow-cyan'"
          class="text-base font-extrabold tracking-wider transition-colors duration-100"
        >
          {{ currentPrice.toFixed(3) }}
        </span>
        <span 
          :class="priceChange >= 0 ? 'text-[#FF78A6] bg-[#FFF0F5] border border-[#FFD7E8]' : 'text-[#17BCC8] bg-[#EBFBFC] border border-[#ABE7E7]'"
          class="text-[10px] font-bold px-1.5 py-0.5 rounded shadow-xs"
        >
          {{ priceChange >= 0 ? '+' : '' }}{{ priceChange.toFixed(3) }} ({{ priceChange >= 0 ? '+' : '' }}{{ priceChangePercent.toFixed(2) }}%)
        </span>
      </div>
    </div>

    <!-- 中間：資金與進度狀態 -->
    <div class="flex items-center space-x-6">
      <!-- 總資產淨值 (Equity) -->
      <div class="flex flex-col">
        <span class="text-[10px] uppercase tracking-wider text-[#8C6D77] font-semibold">總資產 (淨值)</span>
        <div class="flex items-baseline space-x-1.5 font-mono">
          <span class="text-xs text-[#FF78A6] font-bold">¥</span>
          <span 
            :class="equity >= targetBalance ? 'text-[#FF78A6] glow-pink font-black' : 'text-[#3B2C30] font-black'"
            class="text-lg tracking-tight"
          >
            {{ formatYen(equity) }}
          </span>
        </div>
      </div>

      <!-- 可用餘額 (Balance) -->
      <div class="flex flex-col hidden md:flex">
        <span class="text-[10px] uppercase tracking-wider text-[#8C6D77] font-semibold">可用餘額</span>
        <span class="text-sm font-bold text-[#554046] font-mono">
          ¥ {{ formatYen(balance) }}
        </span>
      </div>

      <!-- 保證金維持率 -->
      <div class="flex flex-col hidden lg:flex">
        <span class="text-[10px] uppercase tracking-wider text-[#8C6D77] font-semibold">維持率</span>
        <span 
          :class="marginLevel < 120 ? 'text-[#17BCC8] bg-[#EBFBFC] border border-[#ABE7E7] px-1 py-0.2 rounded font-black animate-pulse' : marginLevel < 200 ? 'text-[#FF78A6] font-bold' : 'text-[#554046] font-bold'"
          class="text-sm font-mono"
        >
          {{ marginLevel > 999 ? '∞' : `${marginLevel}%` }}
        </span>
      </div>

      <!-- 2000萬目標進度條 -->
      <div class="w-28 sm:w-36 flex flex-col justify-center">
        <div class="flex justify-between text-[10px] text-[#8C6D77] mb-1">
          <span>進度</span>
          <span class="text-[#FF78A6] font-mono font-bold">{{ progressPercent }}%</span>
        </div>
        <div class="w-full h-1.5 bg-[#FFEBF2] rounded-full overflow-hidden">
          <div 
            class="h-full bg-gradient-to-r from-[#FF78A6] via-[#FFA8C8] to-[#17BCC8] transition-all duration-300 rounded-full"
            :style="{ width: `${progressPercent}%` }"
          ></div>
        </div>
      </div>
    </div>

    <!-- 右側：時間加速控制器與重置按鈕 (統一粉紅主題系) -->
    <div class="flex items-center space-x-2">
      <!-- 時間加速工具列 -->
      <div class="flex items-center bg-[#FFF5F8] border border-[#FFD7E8] rounded-lg p-0.5 shadow-xs">
        <!-- 暫停 -->
        <button
          @click="emit('changeSpeed', 0)"
          :class="speed === 0 ? 'bg-[#FF78A6] text-white shadow-xs font-black' : 'text-[#8C6D77] hover:text-[#FF78A6] hover:bg-[#FFEBF2]'"
          class="px-2 py-1 text-xs font-bold rounded-md transition-all"
          title="暫停"
        >
          ⏸ 暫停
        </button>
        <!-- 1x -->
        <button
          @click="emit('changeSpeed', 1)"
          :class="speed === 1 ? 'bg-[#FF78A6] text-white shadow-xs font-black' : 'text-[#8C6D77] hover:text-[#FF78A6] hover:bg-[#FFEBF2]'"
          class="px-2 py-1 text-xs font-bold rounded-md transition-all"
          title="正常 1x 速度"
        >
          1x
        </button>
        <!-- 2x -->
        <button
          @click="emit('changeSpeed', 2)"
          :class="speed === 2 ? 'bg-[#FF78A6] text-white shadow-xs font-black' : 'text-[#8C6D77] hover:text-[#FF78A6] hover:bg-[#FFEBF2]'"
          class="px-2 py-1 text-xs font-bold rounded-md transition-all"
          title="加速 2x"
        >
          2x
        </button>
        <!-- 5x -->
        <button
          @click="emit('changeSpeed', 5)"
          :class="speed === 5 ? 'bg-[#FF78A6] text-white shadow-xs font-black' : 'text-[#8C6D77] hover:text-[#FF78A6] hover:bg-[#FFEBF2]'"
          class="px-2 py-1 text-xs font-bold rounded-md transition-all"
          title="加速 5x"
        >
          5x
        </button>
        <!-- 10x -->
        <button
          @click="emit('changeSpeed', 10)"
          :class="speed === 10 ? 'bg-[#FF78A6] text-white shadow-xs font-black' : 'text-[#8C6D77] hover:text-[#FF78A6] hover:bg-[#FFEBF2]'"
          class="px-2 py-1 text-xs font-bold rounded-md transition-all"
          title="急速 10x"
        >
          10x
        </button>
      </div>

      <!-- 重新開局按鈕 -->
      <button
        @click="emit('resetGame')"
        class="text-xs bg-[#FFF0F5] hover:bg-[#FFE0EB] text-[#FF78A6] hover:text-[#E84880] px-2.5 py-1.5 rounded-lg border border-[#FFD7E8] transition font-bold shadow-xs"
        title="重新以 30 萬日圓開始"
      >
        ↺ 重開局
      </button>
    </div>
  </header>
</template>
