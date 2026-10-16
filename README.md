# Excavator Game

Windows 桌面挖掘機養成遊戲。以派遣、零件收集、機型搭配及成長為主要開發方向，保留桌面陪伴與互動。

目前已有挖掘收益、派遣與掉落、車庫換裝、維修、改色、心情、陪伴里程碑、托盤選單、存檔匯入／匯出。後續計劃不等於已實現功能。

零件圖鑑可查收藏狀態、適配機型與獲取來源，並排試裝比較外觀和整機效果。查看不花錢；按「購買並裝備」或「裝備此零件」才保存變更。M1 派遣已驗收，M2 圖鑑目前等待效果驗收。

## 計劃與設計

- [項目計劃書](docs/PROJECT_PLAN.md)：階段範圍、驗收條件、回饋節點及進度。
- [開發設計文檔](docs/DEVELOPMENT_DESIGN.md)：現有架構、資料流、下一功能區設計與測試方式。

每個功能區完成後提供效果、驗證結果與待確認事項；經使用者確認後再進入下一功能區。

## 開發環境與操作

使用 Node.js 24.x、npm 及 Git；Windows 為桌面應用主要驗證平台，CI 同時在 Windows 與 Linux 執行邏輯測試與網頁建置。

```bash
npm ci
npm run dev
```

| 命令 | 用途 |
| --- | --- |
| `npm run dev` | Vite 開發伺服器與 Electron，固定使用 5173 埠 |
| `npm run web` | 只開網頁測試模式，使用 localStorage；不是正式桌面存檔 |
| `npm test` | 執行遊戲規則、服務、安全與持久化回歸測試 |
| `npm run build` | TypeScript 檢查及前端建置 |
| `npm run smoke` | 建置後啟動 Electron 冒煙測試，使用獨立臨時存檔 |
| `npm run test:dispatch` | 建置後測試完整派遣 UI、存檔失敗與重試，截圖至 artifacts/dispatch |
| `npm run demo:dispatch` | 建置後打開隔離存檔演示，停在待領取狀態供驗收 |
| `npm run test:catalog` | 建置後測試圖鑑篩選、試裝、購買、來源與記住的搭配，截圖至 artifacts/catalog |
| `npm run demo:catalog` | 建置後打開獨立存檔的圖鑑演示，可比較長小臂及試用購買／換裝 |
| `npm start` | 建置並啟動本地桌面應用 |
| `npm run pack` | Windows 可執行目錄輸出至 `release/` |
| `npm run dist` | Windows NSIS 安裝包輸出至 `release/` |
| `npm run server` | 啟動獨立本機服務，預設 8787 埠 |

首次 Windows 打包可能需要下載 Electron、NSIS 及打包工具。安裝包、依賴目錄、私鑰與執行資料不提交 Git。`src/shared/data/` 是必要源碼，必須追蹤；根目錄 `/data/` 才是忽略的執行資料。

## 實現與目錄

```text
electron/          桌面視窗、preload/IPC、托盤、存檔操作與內容包驗證
server/            本機 HTTP/SSE 服務、輸入驗證、權威狀態與持久化
src/shared/        純遊戲規則、正規化及共用型別
src/shared/data/   機型、零件、工地與繪圖資料
src/scene/         動作、對話、掉落效果與場景輔助模組
src/garage/        車庫、派遣、換裝與設定介面
src/skins/         Phaser Canvas 外觀實現及圖片風格
tests/            可重現的自動測試
docs/             計劃、設計與驗收紀錄
```

頁面透過 preload API 向主進程發送操作；主進程攜帶 token 呼叫本機服務，服務經 reducer 計算新狀態，再經 SSE/IPC 更新頁面。時間與隨機獎勵由服務決定。桌面版不需要網路帳號。

## 存檔與診斷

Windows 預設資料目錄為 `%APPDATA%/excavator-game/`，可在「設定 → 資料與診斷」打開。開發版與安裝版預設共用此目錄；測試時以 `EXCAVATOR_USER_DATA` 指定獨立資料夾。

- `state.json` / `state.bak.json`：遊戲狀態及上一份有效狀態。
- `settings.json` / `settings.bak.json`：偏好設定及備份。
- `backups/`：匯入或重置前的進度備份，保留最近 5 份。
- `logs/app.log`：錯誤日誌；寫入失敗會重試，退出仍未成功時顯示提示。

一般進度延遲約 300ms 寫入，失敗後約每 2 秒重試最新內容。派遣出發、召回及領取先持久化才回覆成功；失敗時保留原工作供重試。暫存檔寫入後再替換正式檔案；無法保證磁碟永久故障或強制斷電時零損失。匯入／重置需先成功備份與持久化，失敗時不替換原狀態。

派遣採單一工作槽：出發時固定機型／裝備及獎勵亂數，到時後手動「領取收穫」。途中可換裝，但不影響本次派遣收益；所有機型仍共用耐久。未完成可確認召回且無收穫，已完成不可召回。離線只完成原來的一次，不會自動連續接工。

獨立服務使用 `EXCAVATOR_DATA` 或根目錄 `data/`；`EXCAVATOR_TOKEN` 可指定 token，未提供時生成並保存在該資料目錄。`EXCAVATOR_SERVER_URL` 是進階開發設定，現有 Host 防護以本機服務為前提，不代表已支援公開網際網路部署。不要將 token 或私鑰提交到倉庫。

## 可選內容包

建立 `content-src/<id>/skin.json` 與 PNG 姿勢圖，參考 `src/skins/packs/example/skin.json`。打包格式額外支援 `version`，每次更換圖片應提升版本。

```bash
npm run pack-content
```

腳本建立／使用 `keys/private.pem`，產生公開驗證金鑰 `electron/content-public.pem` 及簽名內容 `content-dist/`。私鑰應由維護者離線備份，公開金鑰可以提交。首次生成金鑰會改變信任來源；正式發佈應沿用原簽名金鑰。沒有內容包也能啟動和打包，會使用內建風格；一般建置不自動生成或替換簽名金鑰。

## 依賴與品質

提交 lockfile，CI 使用 `npm ci`。`concurrently` 更新至修復版；針對 `@electron/get` 的 `global-agent` 使用 4.x override，以移除舊版 `roarr → sprintf-js` 漏洞鏈。這是打包工具的跨主版本 override，升級 electron-builder 時需重新驗證下載、代理與 Windows 打包，不能只看 audit 數字。

安全設定參照 [Electron 官方安全建議](https://www.electronjs.org/docs/latest/tutorial/security)。當前 CSP 禁止 inline script/eval；為既有樣式及 Vite 開發連線保留 inline style 與本機 5173 WebSocket。權限請求、外部導航與新視窗受限，IPC 僅接受已登記的頂層應用頁面。

## 授權

目前尚未選定開源授權。GitHub 可見不代表已授予自由使用、修改或分發的許可；如需公開開源，由項目擁有者決定授權條款後再加入 LICENSE。相依套件依各自授權使用。
