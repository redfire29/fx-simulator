# 📈 FX 外匯操盤模擬器 (FX Trading Simulator)

> **從 30 萬日圓本金起家，挑戰達成 2,000 萬日圓的專業操盤模擬器！**  
> 具備擬真外匯動態波動引擎、TradingView 等級即時 K 線圖表、靈活槓桿倍率調整與即時保證金強平機制。

🔗 **線上試玩網址**：[https://redfire29.github.io/fx-simulator/](https://redfire29.github.io/fx-simulator/)

---

## 🎮 遊戲目標與挑戰規則

- **初始資金**：300,000 JPY (30 萬日圓)
- **獲勝目標**：淨值達到 **20,000,000 JPY (2,000 萬日圓)** 即達成通關！
- **失敗條件**：帳戶淨值歸零，或維持保證金比例低於警戒線觸發**強制平倉（Margin Call / Stop Out）**。

---

## ✨ 核心特色與機制

1. **擬真外匯市場動態引擎**
   - 模擬真實外匯市場的波動微漂移（Drift）、趨勢持續段與隨機雜訊。
   - 包含真實撮合點差（Spread）與即時報價跳動（Tick）。
2. **專業級 K 線技術圖表**
   - 採用 **TradingView Lightweight Charts** 金融級圖表引擎。
   - 流暢渲染即時 K 線蠟燭圖、漲跌量能與價格十字準星。
3. **靈活的槓桿與倉位管理**
   - 支援多檔槓桿倍率選擇（如 25x、50x、100x、200x 等）。
   - 支援市價多單（Buy）與空單（Sell）雙向開倉。
   - 即時計算佔用保證金、可用保證金、浮動盈虧與保證金維持率。
4. **時間加速器**
   - 支援 **1x / 2x / 5x / 10x** 時間流速切換，讓你在短時間內驗證交易策略與壓力測試。
5. **完整交易數據統計**
   - 即時記錄開倉價、當前價、平倉歷程與個人勝率分析。

---

## 🛠️ 技術架構

- **Framework**: [Astro 5](https://astro.build/) (Static Site Generation, 極致輕量快速)
- **UI & State**: [Vue 3](https://vuejs.org/) (Composition API + `<script setup>`)
- **Styling**: [Tailwind CSS v4](https://tailwindcss.com/) (現代 CSS-First 架構)
- **Chart**: [TradingView Lightweight Charts 4.2](https://tradingview.github.io/lightweight-charts/)
- **Icons**: [Lucide Vue Next](https://lucide.dev/)
- **Deployment**: GitHub Actions ➡️ GitHub Pages

---

## 🚀 本地開發運行

### 環境需求
- Node.js `>= 18.0.0` (建議 Node 20 或 22)
- npm / pnpm / yarn

### 安裝依賴
```bash
npm install
```

### 啟動本地開發伺服器
```bash
npm run dev
```
啟動後瀏覽器打開 `http://localhost:4321/fx-simulator/` 即可進行操盤測試。

### 建置生產環境版本
```bash
npm run build
```
建置完成後靜態產物將輸出於 `./dist/`。

### 預覽建置產物
```bash
npm run preview
```

---

## 🚢 自動化部屬說明 (GitHub Pages)

專案已內建 `.github/workflows/deploy.yml` 自動化工作流程：
1. 當代碼推送到 `main` 分支時，GitHub Actions 會自動執行安裝、建置並打包輸出至 GitHub Pages。
2. 請至 GitHub 儲存庫設定啟用 Pages：
   - 前往 **Settings** > **Pages**
   - **Build and deployment** 下方的 **Source** 選擇 **`GitHub Actions`**。

---

## 📄 授權條款

MIT License.
