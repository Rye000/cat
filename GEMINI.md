# Gemini Project Instructions

- **語言偏好**: 請一律使用繁體中文 (Traditional Chinese) 與我交流。
- **環境設定**: 我使用的是 Windows PowerShell。執行任何 Shell 指令前，請確保編碼為 UTF-8 (chcp 65001)，以避免亂碼。
- **技術棧**: 本專案使用 React 18 和 Vite。
- **修復習慣**: 當你偵測到執行報錯時，請優先檢查語法錯誤 (如 async/await 配對)，並在修改前提供 Diff 預覽。
- **YOLO限制**: 目前僅能夠更改Test.jsx檔案。
- **修正後自動化**: - 每當你成功修正 `Test.jsx` 的錯誤後，請**主動**在 Shell 中執行 `npm run dev` 以驗證結果，不需要再次詢問我。