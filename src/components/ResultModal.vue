<script setup lang="ts">
import type { GameStats } from '../types/trading';

defineProps<{
  isVictory: boolean;
  isGameOver: boolean;
  isLiquidationAlert: boolean;
  stats: GameStats;
  currentBalance: number;
}>();

const emit = defineEmits<{
  (e: 'restart'): void;
  (e: 'continuePlaying'): void;
}>();

function formatYen(amount: number): string {
  return Math.round(amount).toLocaleString('ja-JP');
}

function formatTime(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${m} 分 ${s < 10 ? '0' : ''}${s} 秒`;
}
</script>

<template>
  <!-- 爆倉瞬間警報橫條 -->
  <Transition
    enter-active-class="transition-opacity duration-200"
    enter-from-class="opacity-0"
    enter-to-class="opacity-100"
    leave-active-class="transition-opacity duration-300"
    leave-from-class="opacity-100"
    leave-to-class="opacity-0"
  >
    <div
      v-if="isLiquidationAlert && !isGameOver"
      class="fixed top-14 left-1/2 -translate-x-1/2 z-50 bg-rose-600/95 text-white px-6 py-2.5 rounded-xl shadow-2xl border border-rose-400 font-bold text-sm flex items-center space-x-2 animate-bounce select-none"
    >
      <span class="text-lg">☠️</span>
      <span>觸及致命強平價！該部位已遭強制平倉清算！</span>
    </div>
  </Transition>

  <!-- 勝負終局結算彈窗 -->
  <div
    v-if="isVictory || isGameOver"
    class="fixed inset-0 z-50 bg-black/85 backdrop-blur-md flex items-center justify-center p-4 select-none"
  >
    <div
      class="w-full max-w-md bg-[#0d131f] border rounded-2xl p-6 shadow-2xl flex flex-col space-y-5"
      :class="isVictory ? 'border-emerald-500/60 shadow-emerald-500/20' : 'border-rose-600/60 shadow-rose-600/20'"
    >
      <!-- 標題與圖示 -->
      <div class="text-center space-y-1.5">
        <div class="text-4xl mb-2">{{ isVictory ? '🏆' : '💀' }}</div>
        <h2
          :class="isVictory ? 'text-emerald-400 glow-green' : 'text-rose-400 glow-red'"
          class="text-2xl font-black tracking-wider"
        >
          {{ isVictory ? '大勝利！達成 2,000 萬日圓！' : '強制平倉！帳戶完全破產！' }}
        </h2>
        <p class="text-xs text-slate-400">
          {{ isVictory ? '恭喜達成 2,000 萬日圓目標！展現了卓越的交易實力！' : '保證金歸零，帳戶已觸發強制平倉清算。' }}
        </p>
      </div>

      <!-- 戰績結算清單 -->
      <div class="bg-[#090d16] rounded-xl p-4 border border-slate-800 space-y-2.5 text-xs font-mono">
        <div class="flex justify-between items-center text-slate-300">
          <span class="text-slate-400">最終資金結算:</span>
          <span class="font-bold text-sm" :class="isVictory ? 'text-emerald-400' : 'text-rose-400'">
            ¥{{ formatYen(currentBalance) }}
          </span>
        </div>
        <div class="flex justify-between items-center text-slate-300">
          <span class="text-slate-400">歷史最高資產 (Peak):</span>
          <span class="text-slate-200">¥{{ formatYen(stats.peakEquity) }}</span>
        </div>
        <div class="flex justify-between items-center text-slate-300">
          <span class="text-slate-400">總交易次數:</span>
          <span class="text-slate-200">{{ stats.totalTrades }} 次 ({{ stats.wins }} 勝 / {{ stats.losses }} 負)</span>
        </div>
        <div class="flex justify-between items-center text-slate-300">
          <span class="text-slate-400">交易勝率:</span>
          <span class="text-amber-400 font-bold">{{ stats.winRate }}%</span>
        </div>
        <div class="flex justify-between items-center text-slate-300">
          <span class="text-slate-400">最大回撤率 (Drawdown):</span>
          <span class="text-rose-400">{{ stats.maxDrawdown }}%</span>
        </div>
        <div class="flex justify-between items-center text-slate-300">
          <span class="text-slate-400">單筆最佳獲利:</span>
          <span class="text-emerald-400">+¥{{ formatYen(stats.bestTrade) }}</span>
        </div>
        <div class="flex justify-between items-center text-slate-300">
          <span class="text-slate-400">累積爆倉次數:</span>
          <span class="text-rose-400">{{ stats.liquidations }} 次</span>
        </div>
      </div>

      <!-- 操作按鈕 -->
      <div class="flex flex-col space-y-2 pt-2">
        <button
          @click="emit('restart')"
          :class="isVictory ? 'bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-400 hover:to-teal-400' : 'bg-gradient-to-r from-rose-600 to-red-600 hover:from-rose-500 hover:to-red-500'"
          class="w-full text-white font-bold py-3 rounded-xl text-sm tracking-wider shadow-lg transition active:scale-[0.98]"
        >
          {{ isVictory ? '以 30 萬日圓再次挑戰' : '重振旗鼓！以 30 萬再次挑戰' }}
        </button>

        <button
          v-if="isVictory"
          @click="emit('continuePlaying')"
          class="w-full bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white py-2.5 rounded-xl text-xs font-semibold transition"
        >
          繼續無盡交易模式
        </button>
      </div>
    </div>
  </div>
</template>
