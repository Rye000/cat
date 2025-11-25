import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
// https://vite.dev/config/
export default defineConfig({
    plugins: [react(), tailwindcss()],
    base: "/cat/",
    server: {
        port: 3001, // 將 3001 替換為你想要的埠號
        host: "localhost", // 可選，默認為 'localhost'
    },
});
