<script setup lang="ts">
import { ref, onMounted, onUnmounted, watch } from 'vue';
import { createChart, type IChartApi, type ISeriesApi, ColorType, LineStyle } from 'lightweight-charts';
import type { Candle, Position } from '../types/trading';

const props = defineProps<{
  candles: Candle[];
  currentCandle: Candle | null;
  activePosition: Position | null;
}>();

const chartContainer = ref<HTMLDivElement | null>(null);
let chart: IChartApi | null = null;
let candleSeries: ISeriesApi<'Candlestick'> | null = null;
let entryPriceLine: any = null;
let liquidationPriceLine: any = null;
let resizeObserver: ResizeObserver | null = null;

function initChart() {
  if (!chartContainer.value) return;

  chart = createChart(chartContainer.value, {
    layout: {
      background: {
        type: ColorType.VerticalGradient,
        topColor: '#FFE7D1',
        bottomColor: '#FFD3A5'
      },
      textColor: '#5A3427',
      fontSize: 12,
      fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif'
    },
    grid: {
      vertLines: { color: 'rgba(255, 255, 255, 0.72)', style: LineStyle.Dashed },
      horzLines: { color: 'rgba(255, 255, 255, 0.72)', style: LineStyle.Dashed }
    },
    crosshair: {
      vertLine: {
        color: '#7C4838',
        width: 1,
        style: LineStyle.Dotted
      },
      horzLine: {
        color: '#7C4838',
        width: 1,
        style: LineStyle.Dotted
      }
    },
    rightPriceScale: {
      borderColor: 'rgba(124, 72, 56, 0.25)',
      scaleMargins: {
        top: 0.15,
        bottom: 0.15
      },
      autoScale: true
    },
    timeScale: {
      borderColor: 'rgba(124, 72, 56, 0.25)',
      timeVisible: true,
      secondsVisible: true
    },
    handleScroll: true,
    handleScale: true
  });

  // 動畫同款配色: 粉紅陽線(漲)、青藍陰線(跌)
  candleSeries = chart.addCandlestickSeries({
    upColor: '#F780AE',
    downColor: '#25D5DE',
    borderVisible: false,
    wickUpColor: '#F780AE',
    wickDownColor: '#25D5DE'
  });

  if (props.candles.length > 0) {
    candleSeries.setData(props.candles as any);
  }

  // 監聽容器尺寸變化
  resizeObserver = new ResizeObserver((entries) => {
    if (!chart || entries.length === 0) return;
    const { width, height } = entries[0].contentRect;
    chart.applyOptions({ width, height });
  });
  resizeObserver.observe(chartContainer.value);
}

// 監聽當前 K 線實時更新
watch(
  () => props.currentCandle,
  (newCandle) => {
    if (newCandle && candleSeries) {
      try {
        candleSeries.update(newCandle as any);
      } catch {
        // 防止時間序列異常微調
      }
    }
  },
  { deep: true }
);

// 監聽全量 K 線重置 (如重新開局)
watch(
  () => props.candles,
  (newCandles) => {
    if (candleSeries && newCandles.length > 0) {
      candleSeries.setData(newCandles as any);
    }
  }
);

// 監聽部位變化，繪製開倉價線與致命強制平倉線
watch(
  () => props.activePosition,
  (pos) => {
    if (!candleSeries) return;

    // 清理舊線段
    if (entryPriceLine) {
      candleSeries.removePriceLine(entryPriceLine);
      entryPriceLine = null;
    }
    if (liquidationPriceLine) {
      candleSeries.removePriceLine(liquidationPriceLine);
      liquidationPriceLine = null;
    }

    if (pos) {
      // 繪製開倉成本線 (久留美粉紅實線)
      entryPriceLine = candleSeries.createPriceLine({
        price: pos.entryPrice,
        color: '#FF78A6',
        lineWidth: 2,
        lineStyle: LineStyle.Solid,
        axisLabelVisible: true,
        title: `開倉 ${pos.side === 'BUY' ? '多' : '空'} @ ${pos.entryPrice}`
      });

      // 繪製致命強制平倉線 (清透青藍虛線)
      liquidationPriceLine = candleSeries.createPriceLine({
        price: pos.liquidationPrice,
        color: '#17BCC8',
        lineWidth: 2,
        lineStyle: LineStyle.Dashed,
        axisLabelVisible: true,
        title: `☠️ 強平線 @ ${pos.liquidationPrice}`
      });
    }
  },
  { immediate: true }
);

onMounted(() => {
  initChart();
});

onUnmounted(() => {
  if (resizeObserver) {
    resizeObserver.disconnect();
    resizeObserver = null;
  }
  if (chart) {
    chart.remove();
    chart = null;
  }
});
</script>

<template>
  <div class="relative w-full h-full flex flex-col">
    <!-- 圖表頂部即時匯率浮水印標籤 (久留美粉白微磨砂徽章) -->
    <div class="absolute top-3 left-4 z-10 flex items-center space-x-3 pointer-events-none">
      <div class="flex items-center space-x-1.5 bg-white/90 backdrop-blur-md px-3 py-1 rounded-lg border border-[#FFD7E8] shadow-xs text-[#3B2C30]">
        <span class="w-2 h-2 rounded-full bg-[#FF78A6] animate-pulse"></span>
        <span class="text-xs font-bold text-[#3B2C30] tracking-wider">USD / JPY</span>
        <span class="text-[10px] text-[#8C6D77]">美金 / 日圓</span>
      </div>
      <div v-if="activePosition" class="flex items-center space-x-2 bg-white/90 backdrop-blur-md px-3 py-1 rounded-lg border border-[#FFD7E8] shadow-xs">
        <span 
          :class="activePosition.side === 'BUY' ? 'text-[#FF78A6] bg-[#FFF0F5] border-[#FFD7E8]' : 'text-[#17BCC8] bg-[#EBFBFC] border-[#ABE7E7]'"
          class="text-xs font-bold px-1.5 py-0.5 rounded border"
        >
          {{ activePosition.side === 'BUY' ? '多頭' : '空頭' }} {{ activePosition.leverage }}x
        </span>
        <span class="text-xs text-[#554046]">
          強平價: <span class="text-[#17BCC8] font-mono font-bold">{{ activePosition.liquidationPrice.toFixed(3) }}</span>
        </span>
      </div>
    </div>

    <!-- TradingView 圖表掛載容器 -->
    <div ref="chartContainer" class="w-full flex-1"></div>
  </div>
</template>
