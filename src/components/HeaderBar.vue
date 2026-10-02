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
  <header class="w-full bg-[#0d131f] border-b border-slate-800/80 px-4 py-2.5 flex flex-wrap items-center justify-between gap-3 shadow-md select-none">
    <!-- 左側：品牌名稱與當前幣種走勢 -->
    <div class="flex items-center space-x-4">
      <div class="flex items-center space-x-2">
        <div class="w-7 h-7 rounded bg-gradient-to-br from-indigo-500 to-emerald-500 flex items-center justify-center font-black text-white text-xs shadow-md shadow-emerald-500/10">
          FX
        </div>
        <div>
          <h1 class="text-sm font-bold text-white tracking-wide">
            FX模擬器
          </h1>
          <p class="text-[11px] text-slate-400">目標：2,000萬日圓達成勝利</p>
        </div>
      </div>

      <div class="h-6 w-[1px] bg-slate-800 hidden sm:block"></div>

      <!-- 當前 USD/JPY 報價即時跳動 -->
      <div class="flex items-center space-x-2 font-mono">
        <span class="text-xs text-slate-400 font-sans">USD/JPY:</span>
        <span 
          :class="priceChange >= 0 ? 'text-[#F780AE] glow-pink' : 'text-[#25D5DE] glow-cyan'"
          class="text-base font-extrabold tracking-wider transition-colors duration-100"
        >
          {{ currentPrice.toFixed(3) }}
        </span>
        <span 
          :class="priceChange >= 0 ? 'text-[#F780AE] bg-pink-950/60' : 'text-[#25D5DE] bg-cyan-950/60'"
          class="text-[10px] font-medium px-1 py-0.5 rounded"
        >
          {{ priceChange >= 0 ? '+' : '' }}{{ priceChange.toFixed(3) }} ({{ priceChange >= 0 ? '+' : '' }}{{ priceChangePercent.toFixed(2) }}%)
        </span>
      </div>
    </div>

    <!-- 中間：資金與進度狀態 -->
    <div class="flex items-center space-x-6">
      <!-- 總資產淨值 (Equity) -->
      <div class="flex flex-col">
        <span class="text-[10px] uppercase tracking-wider text-slate-400 font-medium">總資產 (淨值)</span>
        <div class="flex items-baseline space-x-1.5 font-mono">
          <span class="text-xs text-emerald-400 font-bold">¥</span>
          <span 
            :class="equity >= targetBalance ? 'text-emerald-300 glow-green' : 'text-white'"
            class="text-lg font-black tracking-tight"
          >
            {{ formatYen(equity) }}
          </span>
        </div>
      </div>

      <!-- 可用餘額 (Balance) -->
      <div class="flex flex-col hidden md:flex">
        <span class="text-[10px] uppercase tracking-wider text-slate-400 font-medium">可用餘額</span>
        <span class="text-sm font-bold text-slate-300 font-mono">
          ¥ {{ formatYen(balance) }}
        </span>
      </div>

      <!-- 保證金維持率 -->
      <div class="flex flex-col hidden lg:flex">
        <span class="text-[10px] uppercase tracking-wider text-slate-400 font-medium">維持率</span>
        <span 
          :class="marginLevel < 120 ? 'text-rose-400 font-black animate-pulse' : marginLevel < 200 ? 'text-amber-400' : 'text-slate-300'"
          class="text-sm font-bold font-mono"
        >
          {{ marginLevel > 999 ? '∞' : `${marginLevel}%` }}
        </span>
      </div>

      <!-- 2000萬目標進度條 -->
      <div class="w-28 sm:w-36 flex flex-col justify-center">
        <div class="flex justify-between text-[10px] text-slate-400 mb-1">
          <span>進度</span>
          <span class="text-emerald-400 font-mono font-bold">{{ progressPercent }}%</span>
        </div>
        <div class="w-full h-1.5 bg-slate-800 rounded-full overflow-hidden">
          <div 
            class="h-full bg-gradient-to-r from-emerald-500 to-teal-400 transition-all duration-300 rounded-full"
            :style="{ width: `${progressPercent}%` }"
          ></div>
        </div>
      </div>
    </div>

    <!-- 右側：時間加速控制器與重置按鈕 -->
    <div class="flex items-center space-x-2">
      <!-- 時間加速工具列 -->
      <div class="flex items-center bg-slate-900 border border-slate-800 rounded-lg p-0.5 shadow-inner">
        <!-- 暫停 -->
        <button
          @click="emit('changeSpeed', 0)"
          :class="speed === 0 ? 'bg-amber-500/20 text-amber-400 border border-amber-500/40' : 'text-slate-400 hover:text-white'"
          class="px-2 py-1 text-xs font-bold rounded transition-all"
          title="暫停"
        >
          ⏸ 暫停
        </button>
        <!-- 1x -->
        <button
          @click="emit('changeSpeed', 1)"
          :class="speed === 1 ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/40' : 'text-slate-400 hover:text-white'"
          class="px-2 py-1 text-xs font-bold rounded transition-all"
          title="正常 1x 速度"
        >
          1x
        </button>
        <!-- 2x -->
        <button
          @click="emit('changeSpeed', 2)"
          :class="speed === 2 ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/40' : 'text-slate-400 hover:text-white'"
          class="px-2 py-1 text-xs font-bold rounded transition-all"
          title="加速 2x"
        >
          2x
        </button>
        <!-- 5x -->
        <button
          @click="emit('changeSpeed', 5)"
          :class="speed === 5 ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/40' : 'text-slate-400 hover:text-white'"
          class="px-2 py-1 text-xs font-bold rounded transition-all"
          title="加速 5x"
        >
          5x
        </button>
        <!-- 10x -->
        <button
          @click="emit('changeSpeed', 10)"
          :class="speed === 10 ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/40' : 'text-slate-400 hover:text-white'"
          class="px-2 py-1 text-xs font-bold rounded transition-all"
          title="急速 10x"
        >
          10x
        </button>
      </div>

      <!-- 重新開局按鈕 -->
      <button
        @click="emit('resetGame')"
        class="text-xs bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white px-2.5 py-1.5 rounded-lg border border-slate-700 transition"
        title="重新以 30 萬日圓開始"
      >
        ↺ 重開局
      </button>
    </div>
  </header>
</template>
