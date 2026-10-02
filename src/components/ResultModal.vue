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
  <!-- 爆倉瞬間警報橫條 (沉穩暗紅酒玫瑰調) -->
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
      class="fixed top-14 left-1/2 -translate-x-1/2 z-50 bg-[#7A1633]/95 text-white px-6 py-2.5 rounded-xl shadow-2xl border border-[#A6244A] font-black text-sm flex items-center space-x-2 animate-bounce select-none"
    >
      <span class="text-lg">☠️</span>
      <span>觸及強制平倉線！部位已遭強平清算！</span>
    </div>
  </Transition>

  <!-- 勝負終局結算彈窗 (勝利為官網溫潤櫻花粉，失敗為沉穩深暗玫瑰遮罩) -->
  <div
    v-if="isVictory || isGameOver"
    class="fixed inset-0 z-50 backdrop-blur-[10px] flex items-center justify-center p-4 select-none transition-colors duration-300"
    :class="isVictory ? 'bg-[rgba(255,198,218,0.68)]' : 'bg-[rgba(20,10,15,0.88)]'"
  >
    <div
      class="w-full max-w-md border-2 rounded-2xl p-6 shadow-2xl flex flex-col space-y-5 transition-all"
      :class="isVictory
        ? 'bg-white border-[#FF78A6] shadow-pink-300/40 text-[#3B2C30]'
        : 'bg-[#1C1016] border-[#8C2446] shadow-[0_0_50px_rgba(140,36,70,0.35)] text-slate-100'"
    >
      <!-- 標題與圖示 -->
      <div class="text-center space-y-1.5">
        <div class="text-4xl mb-2">{{ isVictory ? '🏆' : '💀' }}</div>
        <h2
          :class="isVictory ? 'text-[#FF78A6] glow-pink' : 'text-[#E84874] glow-dark-pink'"
          class="text-2xl font-black tracking-wider"
        >
          {{ isVictory ? '大勝利！達成 2,000 萬日圓！' : '強制平倉！帳戶完全破產！' }}
        </h2>
        <p :class="isVictory ? 'text-[#8C6D77]' : 'text-[#A8798A]'" class="text-xs">
          {{ isVictory ? '恭喜達成 2,000 萬日圓目標！展現了卓越的交易實力！' : '保證金歸零，帳戶已觸發強制平倉清算。' }}
        </p>
      </div>

      <!-- 戰績結算清單 -->
      <div 
        class="rounded-xl p-4 border space-y-2.5 text-xs font-mono"
        :class="isVictory ? 'bg-[#FFF9FB] border-[#FFD7E8]' : 'bg-[#140A0F] border-[#4A1626]'"
      >
        <div class="flex justify-between items-center" :class="isVictory ? 'text-[#554046]' : 'text-slate-200'">
          <span :class="isVictory ? 'text-[#8C6D77]' : 'text-[#9E7382]'">最終資金結算:</span>
          <span class="font-bold text-sm" :class="isVictory ? 'text-[#FF78A6]' : 'text-[#E84874]'">
            ¥{{ formatYen(currentBalance) }}
          </span>
        </div>
        <div class="flex justify-between items-center" :class="isVictory ? 'text-[#554046]' : 'text-slate-200'">
          <span :class="isVictory ? 'text-[#8C6D77]' : 'text-[#9E7382]'">歷史最高資產 (Peak):</span>
          <span :class="isVictory ? 'text-[#3B2C30]' : 'text-white'" class="font-bold">¥{{ formatYen(stats.peakEquity) }}</span>
        </div>
        <div class="flex justify-between items-center" :class="isVictory ? 'text-[#554046]' : 'text-slate-200'">
          <span :class="isVictory ? 'text-[#8C6D77]' : 'text-[#9E7382]'">總交易次數:</span>
          <span>{{ stats.totalTrades }} 次 ({{ stats.wins }} 勝 / {{ stats.losses }} 負)</span>
        </div>
        <div class="flex justify-between items-center" :class="isVictory ? 'text-[#554046]' : 'text-slate-200'">
          <span :class="isVictory ? 'text-[#8C6D77]' : 'text-[#9E7382]'">交易勝率:</span>
          <span :class="isVictory ? 'text-[#FF78A6]' : 'text-[#E84874]'" class="font-bold">{{ stats.winRate }}%</span>
        </div>
        <div class="flex justify-between items-center" :class="isVictory ? 'text-[#554046]' : 'text-slate-200'">
          <span :class="isVictory ? 'text-[#8C6D77]' : 'text-[#9E7382]'">最大回撤率 (Drawdown):</span>
          <span :class="isVictory ? 'text-[#17BCC8]' : 'text-[#E84874]'" class="font-bold">{{ stats.maxDrawdown }}%</span>
        </div>
        <div class="flex justify-between items-center" :class="isVictory ? 'text-[#554046]' : 'text-slate-200'">
          <span :class="isVictory ? 'text-[#8C6D77]' : 'text-[#9E7382]'">單筆最佳獲利:</span>
          <span :class="isVictory ? 'text-[#FF78A6]' : 'text-[#E84874]'" class="font-bold">+¥{{ formatYen(stats.bestTrade) }}</span>
        </div>
        <div class="flex justify-between items-center" :class="isVictory ? 'text-[#554046]' : 'text-slate-200'">
          <span :class="isVictory ? 'text-[#8C6D77]' : 'text-[#9E7382]'">累積爆倉次數:</span>
          <span :class="isVictory ? 'text-[#17BCC8]' : 'text-[#E84874]'" class="font-bold">{{ stats.liquidations }} 次</span>
        </div>
      </div>

      <!-- 操作按鈕 -->
      <div class="flex flex-col space-y-2 pt-2">
        <button
          @click="emit('restart')"
          :class="isVictory
            ? 'bg-gradient-to-r from-[#FF78A6] to-[#FF4D85] hover:from-[#FFA3C3] hover:to-[#FF78A6] shadow-pink-500/25'
            : 'bg-gradient-to-r from-[#9E2045] via-[#BD2D57] to-[#871939] hover:from-[#B0254E] hover:to-[#9E2045] shadow-lg shadow-black/50 border border-[#B82E56]/40'"
          class="w-full text-white font-black py-3 rounded-xl text-sm tracking-wider shadow-md transition active:scale-[0.98]"
        >
          {{ isVictory ? '以 30 萬日圓再次挑戰' : '重振旗鼓！以 30 萬再次挑戰' }}
        </button>

        <button
          v-if="isVictory"
          @click="emit('continuePlaying')"
          class="w-full bg-[#FFF0F5] hover:bg-[#FFE0EB] text-[#FF78A6] py-2.5 rounded-xl text-xs font-bold transition border border-[#FFD7E8]"
        >
          繼續無盡交易模式
        </button>
      </div>
    </div>
  </div>
</template>
