import React, { useState, useEffect, useMemo } from "react";
import {
  Cat,
  Activity,
  Scale,
  ArrowRightCircle,
  Utensils,
  Plus,
  Trash2,
  AlertCircle,
  CheckCircle2,
  Edit3,
  Calculator,
  LineChart as IconLineChart,
  TrendingUp,
  Filter,
  Calendar,
} from "lucide-react";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  ReferenceLine,
} from "recharts";

// === 數據庫定義 ===
const FACTOR_DATA = [
  {
    id: "neutered",
    label: "已絕育 / 低活動量成貓",
    range: [1.2, 1.4],
    desc: "多數室內成貓的狀態",
  },
  {
    id: "intact",
    label: "未絕育 / 活躍成貓",
    range: [1.4, 1.6],
    desc: "活動力強或可外出的貓",
  },
  {
    id: "kitten",
    label: "幼貓 (4個月至1歲)",
    range: [2.0, 2.5],
    desc: "成長期需要大量熱量",
  },
  {
    id: "weight_loss",
    label: "體重控制 (減重期)",
    range: [0.8, 1.0],
    desc: "需由獸醫評估「理想體重」來計算",
  },
  {
    id: "senior",
    label: "老貓 (7歲以上)",
    range: [1.1, 1.4],
    desc: "視活動量與健康狀況調整",
  },
];

const CAN_DATABASE = [
  { id: "none", name: "不吃這個罐罐", kcal: 0 },
  { id: "petline_tuna", name: "PETLINE 懷石 吞拿魚慕絲", kcal: 48.0 },
  { id: "asikatta_tuna", name: "Asikatta 吞拿魚", kcal: 52.56 },
  { id: "asikatta_cod", name: "Asikatta 吞拿魚+鱈魚", kcal: 44.24 },
  { id: "asikatta_mackerel", name: "Asikatta 鯖魚", kcal: 43.36 },
  { id: "asikatta_goat", name: "Asikatta 山羊奶吞拿魚", kcal: 67.92 },
];

const FOOD_CATEGORIES = [
  {
    id: "staple",
    label: "主食/乾糧",
    color: "text-green-600",
    bg: "bg-green-100",
    barColor: "bg-green-500",
  },
  {
    id: "wet",
    label: "濕食/罐頭",
    color: "text-blue-600",
    bg: "bg-blue-100",
    barColor: "bg-blue-400",
  },
  {
    id: "snack",
    label: "零食/獎勵",
    color: "text-yellow-600",
    bg: "bg-yellow-100",
    barColor: "bg-yellow-400",
  },
  {
    id: "other",
    label: "其他補給",
    color: "text-purple-600",
    bg: "bg-purple-100",
    barColor: "bg-purple-400",
  },
];

// 簡易 CSV 解析器 (替代 papaparse 以避免依賴錯誤)
const simpleCsvParser = (csvText) => {
  const lines = csvText.trim().split("\n");
  if (lines.length < 2) return []; // 只有標題或空的

  // 取得標題列並轉小寫去除空白
  const headers = lines[0].split(",").map((h) => h.trim().toLowerCase());

  const result = [];

  for (let i = 1; i < lines.length; i++) {
    const line = lines[i].trim();
    if (!line) continue;

    const values = line.split(",").map((v) => v.trim());
    const row = {};

    headers.forEach((header, index) => {
      row[header] = values[index];
    });

    result.push(row);
  }
  return result;
};

const CatDietApp = () => {
  // === 全域狀態 ===
  const [activeTab, setActiveTab] = useState("daily");
  const [targetKcal, setTargetKcal] = useState(322);

  // === 日常計算狀態 ===
  const [calcMode, setCalcMode] = useState("auto");
  const [can1Id, setCan1Id] = useState("asikatta_goat");
  const [can2Id, setCan2Id] = useState("asikatta_goat");
  const [snackGrams, setSnackGrams] = useState(8);
  const [manualZiwiGrams, setManualZiwiGrams] = useState(40);
  const [customFoods, setCustomFoods] = useState([]);
  const [newCustomName, setNewCustomName] = useState("");
  const [newCustomKcal, setNewCustomKcal] = useState("");
  const [newCustomCategory, setNewCustomCategory] = useState("snack");

  // === RER/DER 工具狀態 ===
  const [weight, setWeight] = useState(4.5);
  const [selectedFactorId, setSelectedFactorId] = useState("neutered");
  const [specificFactor, setSpecificFactor] = useState(1.2);

  // === 體重圖表狀態 ===
  const [weightHistory, setWeightHistory] = useState([]);
  const [isLoadingWeight, setIsLoadingWeight] = useState(false);

  // 篩選器狀態
  const [filterYear, setFilterYear] = useState("all");
  const [filterMonth, setFilterMonth] = useState("all");

  // === 常數 ===
  const ZIWI_KCAL_PER_G = 4.4;
  const SNACK_KCAL_PER_G = 4.0;

  // === API 設定 ===
  // 請在此填入您的 Google Sheet CSV 發布連結
  // 如果是本地開發可以使用 process.env 或 import.meta.env，但在這裡我們使用變數
  const CSV_API_URL = import.meta.env.VITE_API_KEY;


  // === Effect: 取得體重數據 ===
  useEffect(() => {
    const fetchWeightData = async () => {
      // 如果沒有 URL，使用模擬數據展示效果
      if (!CSV_API_URL) {
        // console.warn("未設定 CSV_API_URL，使用模擬數據");
        const mockCsvData = `date,weight
2025-01-01,1
2025-01-12,2
2025-02-02,3
2025-02-10,4
2025-02-14,5
2025-02-15,6`;
        processCsvData(mockCsvData);
        return;
      }

      setIsLoadingWeight(true);
      try {
        const response = await fetch(CSV_API_URL);
        const reader = response.body.getReader();
        const result = await reader.read();
        const decoder = new TextDecoder("utf-8");
        const csvText = decoder.decode(result.value);

        processCsvData(csvText);
      } catch (error) {
        console.error("Failed to fetch weight data", error);
      } finally {
        setIsLoadingWeight(false);
      }
    };

    // 處理 CSV 數據的共用邏輯
    const processCsvData = (csvText) => {
      const rawData = simpleCsvParser(csvText);

      // 資料清洗與轉換
      const validData = rawData
        .map((item) => {
          // 容錯處理：有些 CSV 欄位可能有空白，或名稱大小寫不同
          // 這裡優先抓取 item.date 或 item.日期
          const dateRaw = item.date || item.date || item.日期;
          const weightRaw = item.weight || item.weight || item.體重;

          // 檢查是否為有效數據
          if (!dateRaw || !weightRaw || isNaN(parseFloat(weightRaw))) {
            return null;
          }

          // 嘗試解析日期 (支援 2025-01-01 或 2025/01/01)
          const dateObj = new Date(dateRaw);
          if (isNaN(dateObj.getTime())) {
            return null;
          }

          // 格式化日期字串
          const year = dateObj.getFullYear();
          const month = dateObj.getMonth() + 1;
          const day = dateObj.getDate();
          const fullDate = `${year}-${String(month).padStart(2, "0")}-${String(
            day
          ).padStart(2, "0")}`;
          const shortDate = `${String(month).padStart(2, "0")}/${String(
            day
          ).padStart(2, "0")}`;

          return {
            fullDate, // 2025-01-01 (用於排序與顯示)
            date: shortDate, // 01/01 (用於 X 軸)
            weight: parseFloat(weightRaw),
            year: year, // 用於篩選
            month: month, // 用於篩選
          };
        })
        .filter((item) => item !== null); // 過濾掉無效資料

      // 確保依照日期排序 (舊 -> 新)
      validData.sort((a, b) => new Date(a.fullDate) - new Date(b.fullDate));

      setWeightHistory(validData);

      // 自動載入最新體重到計算機
      if (validData.length > 0) {
        setWeight(validData[validData.length - 1].weight);
        // 預設篩選器為最新年份
        const lastYear = validData[validData.length - 1].year;
        setFilterYear(lastYear.toString());
      }

      setIsLoadingWeight(false);
    };

    fetchWeightData();
  }, []);

  // === Effect: 當因子類別改變時重置係數 ===
  useEffect(() => {
    const factorData = FACTOR_DATA.find((f) => f.id === selectedFactorId);
    if (factorData) {
      setSpecificFactor(factorData.range[0]);
    }
  }, [selectedFactorId]);

  // === 計算邏輯：篩選後的體重數據 ===
  const filteredWeightData = useMemo(() => {
    return weightHistory.filter((item) => {
      const yearMatch =
        filterYear === "all" || item.year.toString() === filterYear;
      const monthMatch =
        filterMonth === "all" || item.month.toString() === filterMonth;
      return yearMatch && monthMatch;
    });
  }, [weightHistory, filterYear, filterMonth]);

  // 取得所有可用的年份 (用於下拉選單)
  const availableYears = useMemo(() => {
    const years = new Set(weightHistory.map((item) => item.year));
    return Array.from(years).sort((a, b) => b - a); // 降序
  }, [weightHistory]);

  // === 計算邏輯：飲食部分 (維持不變) ===
  const formatNum = (num) => Math.round(num * 10) / 10;
  const rer = 70 * Math.pow(weight, 0.75);
  const der = rer * specificFactor;

  const calculateDiet = () => {
    const can1 = CAN_DATABASE.find((c) => c.id === can1Id) || CAN_DATABASE[0];
    const can2 = CAN_DATABASE.find((c) => c.id === can2Id) || CAN_DATABASE[0];
    const basicCanKcal = can1.kcal + can2.kcal;
    const basicSnackKcal = snackGrams * SNACK_KCAL_PER_G;

    let customStapleKcal = 0;
    let customWetKcal = 0;
    let customSnackKcal = 0;
    let customOtherKcal = 0;

    customFoods.forEach((food) => {
      if (food.category === "staple") {
        customStapleKcal += food.kcal;
      } else if (food.category === "wet") {
        customWetKcal += food.kcal;
      } else if (food.category === "snack") {
        customSnackKcal += food.kcal;
      } else {
        customOtherKcal += food.kcal;
      }
    });

    let ziwiGrams = 0;
    let ziwiKcal = 0;
    let totalUsed = 0;
    let diff = 0;
    let isOver = false;

    if (calcMode === "auto") {
      const currentIntake =
        basicCanKcal +
        basicSnackKcal +
        customStapleKcal +
        customWetKcal +
        customSnackKcal +
        customOtherKcal;
      let remaining = targetKcal - currentIntake;
      if (remaining < 0) {
        remaining = 0;
        isOver = true;
      }
      ziwiKcal = remaining;
      ziwiGrams = remaining / ZIWI_KCAL_PER_G;
      totalUsed = currentIntake + ziwiKcal;
      if (isOver) {
        diff = currentIntake - targetKcal;
      }
    } else {
      ziwiGrams = manualZiwiGrams;
      ziwiKcal = manualZiwiGrams * ZIWI_KCAL_PER_G;
      totalUsed =
        basicCanKcal +
        basicSnackKcal +
        ziwiKcal +
        customStapleKcal +
        customWetKcal +
        customSnackKcal +
        customOtherKcal;
      diff = totalUsed - targetKcal;
      isOver = diff > 0;
    }

    return {
      ziwiGrams,
      ziwiKcal,
      totalUsed,
      diff,
      isOver,
      distribution: {
        staple: ziwiKcal + customStapleKcal,
        wet: basicCanKcal + customWetKcal,
        snack: basicSnackKcal + customSnackKcal,
        other: customOtherKcal,
      },
    };
  };

  const results = calculateDiet();

  // === 處理函數 ===
  const handleAddCustomFood = () => {
    if (!newCustomName || !newCustomKcal) {
      return;
    }
    const newItem = {
      id: Date.now(),
      name: newCustomName,
      kcal: parseFloat(newCustomKcal),
      category: newCustomCategory,
    };
    setCustomFoods([...customFoods, newItem]);
    setNewCustomName("");
    setNewCustomKcal("");
  };

  const removeCustomFood = (id) => {
    setCustomFoods(customFoods.filter((item) => item.id !== id));
  };

  const applyDerToTarget = () => {
    setTargetKcal(Math.round(der));
    setActiveTab("daily");
    alert(`已更新目標熱量為 ${Math.round(der)} kcal`);
  };

  return (
    <div className="max-w-md mx-auto bg-gray-50 min-h-screen flex flex-col font-sans text-gray-700">
      {/* 標題區 */}
      <div className="bg-white p-5 flex items-center justify-between border-b-4 border-orange-200">
        <div>
          <h1 className="text-xl font-bold text-gray-800 flex items-center gap-2">
            <Cat className="text-orange-500" />
            貓咪飲食計算機
          </h1>
        </div>
        <Calculator className="text-orange-200 w-8 h-8" />
      </div>

      {/* 頂部導航 */}
      <div className="bg-white p-4 pt-2 shadow-sm sticky top-0 z-20">
        <div className="flex bg-gray-100 p-1 rounded-xl">
          <button
            onClick={() => setActiveTab("daily")}
            className={`flex-1 flex items-center justify-center gap-2 py-2 rounded-lg text-xs font-bold transition-all ${
              activeTab === "daily"
                ? "bg-white text-orange-600 shadow-sm"
                : "text-gray-400"
            }`}
          >
            <Utensils size={16} /> 記錄
          </button>
          <button
            onClick={() => setActiveTab("tools")}
            className={`flex-1 flex items-center justify-center gap-2 py-2 rounded-lg text-xs font-bold transition-all ${
              activeTab === "tools"
                ? "bg-white text-blue-600 shadow-sm"
                : "text-gray-400"
            }`}
          >
            <Activity size={16} /> 計算
          </button>
          <button
            onClick={() => setActiveTab("weight")}
            className={`flex-1 flex items-center justify-center gap-2 py-2 rounded-lg text-xs font-bold transition-all ${
              activeTab === "weight"
                ? "bg-white text-purple-600 shadow-sm"
                : "text-gray-400"
            }`}
          >
            <TrendingUp size={16} /> 體重
          </button>
        </div>
      </div>

      <div className="flex-1 p-4 overflow-y-auto pb-20">
        {/* === 分頁 1: 日常飲食記錄 === */}
        {activeTab === "daily" && (
          <div className="space-y-4 animate-fade-in">
            {/* 1. 目標與模式設定 */}
            <div className="bg-white rounded-xl p-4 shadow-sm border border-gray-100">
              <div className="flex justify-between items-center mb-3 border-b border-gray-100 pb-2">
                <label className="text-xs font-bold text-gray-400">
                  每日目標 (kcal)
                </label>
                <input
                  type="text" // 改成 text
                  inputMode="numeric" // 手機上還是會跳數字鍵盤
                  pattern="[0-9]*" // 可選：讓瀏覽器更確定是數字
                  value={targetKcal}
                  onChange={(e) => {
                    const val = e.target.value;
                    // 只允許數字（避免輸入奇怪符號）
                    if (val === "" || /^\d+$/.test(val)) {
                      setTargetKcal(val === "" ? "" : Number(val));
                    }
                  }}
                  className="w-20 text-right font-black text-xl text-gray-700 border-b border-dashed border-gray-300 focus:border-orange-500 focus:outline-none"
                />
              </div>
              <div className="flex gap-2">
                <button
                  onClick={() => setCalcMode("auto")}
                  className={`flex-1 py-2 px-3 rounded-lg text-xs font-bold border flex items-center justify-center gap-1 ${
                    calcMode === "auto"
                      ? "bg-orange-50 border-orange-200 text-orange-700"
                      : "bg-gray-50 border-gray-100 text-gray-400"
                  }`}
                >
                  <Calculator size={14} /> 自動推算
                </button>
                <button
                  onClick={() => setCalcMode("manual")}
                  className={`flex-1 py-2 px-3 rounded-lg text-xs font-bold border flex items-center justify-center gap-1 ${
                    calcMode === "manual"
                      ? "bg-green-50 border-green-200 text-green-700"
                      : "bg-gray-50 border-gray-100 text-gray-400"
                  }`}
                >
                  <Edit3 size={14} /> 手動記錄
                </button>
              </div>
            </div>

            {/* 2. Ziwi 區域 */}
            <div
              className={`rounded-xl shadow-lg p-5 transition-all duration-300 ${
                calcMode === "auto"
                  ? "bg-gradient-to-br from-orange-50 to-orange-100 border border-orange-200"
                  : "bg-white border-2 border-green-400"
              }`}
            >
              <div className="flex justify-between items-start mb-2">
                <h3 className="font-bold text-gray-700 flex items-center gap-2">
                  <div
                    className={`w-2 h-2 rounded-full ${
                      calcMode === "auto" ? "bg-orange-500" : "bg-green-500"
                    }`}
                  ></div>
                  Ziwi Peak
                </h3>
                <span className="text-xs font-mono text-gray-500 bg-white/50 px-2 py-1 rounded">
                  4.4 kcal/g
                </span>
              </div>
              {calcMode === "auto" ? (
                <div className="text-center py-2">
                  <p className="text-xs text-orange-600 mb-1 opacity-70">
                    建議攝取：
                  </p>
                  <div className="text-5xl font-black text-orange-700 tracking-tighter">
                    {formatNum(results.ziwiGrams)}{" "}
                    <span className="text-lg">g</span>
                  </div>
                  <div className="text-xs text-orange-800 font-bold mt-1 bg-orange-200/50 inline-block px-3 py-1 rounded-full">
                    約 {formatNum(results.ziwiKcal)} kcal
                  </div>
                  <br />
                  {/* <div className="text-xs text-orange-800 font-bold mt-1 bg-orange-200/50 inline-block px-3 py-1 rounded-full">
                                        目前約 {formatNum} kcal
                                    </div> */}
                </div>
              ) : (
                <div className="space-y-3">
                  <div className="flex items-center gap-3">
                    <input
                      type="text" // 改成 text
                      inputMode="numeric" // 手機上還是會跳數字鍵盤
                      pattern="[0-9]*" // 可選：讓瀏覽器更確定是數字
                      value={manualZiwiGrams}
                      onChange={(e) => {
                        const val = e.target.value;
                        // 只允許數字（避免輸入奇怪符號）
                        if (val === "" || /^\d+$/.test(val)) {
                          setManualZiwiGrams(val === "" ? "" : Number(val));
                        }
                      }}
                      className="w-[95%] text-3xl font-bold text-center p-2 border-b-2 border-green-200 focus:border-green-500 focus:outline-none bg-transparent"
                      placeholder="輸入克數"
                    />
                    <span className="text-xl font-bold text-gray-400">g</span>
                  </div>
                  <div className="text-right text-base font-medium text-green-600">
                    提供: {formatNum(results.ziwiKcal)} kcal
                  </div>
                </div>
              )}
            </div>

            {/* 3. 儀表板 */}
            {(calcMode === "manual" || results.isOver) && (
              <div
                className={`rounded-xl p-4 flex items-center justify-between border ${
                  results.isOver
                    ? "bg-red-50 border-red-200 text-red-700"
                    : "bg-gray-800 border-gray-700 text-white"
                }`}
              >
                <div>
                  <p className="text-xs opacity-70 mb-1">今日總攝取</p>
                  <div className="text-2xl font-black">
                    {formatNum(results.totalUsed)}{" "}
                    <span className="text-base font-normal">kcal</span>
                  </div>
                </div>
                <div className="text-right">
                  <p className="text-xs opacity-70 mb-1">
                    {results.isOver ? "已超標" : "距離目標"}
                  </p>
                  <div className="text-xl font-bold flex items-center gap-1 justify-end">
                    {results.isOver ? (
                      <AlertCircle size={18} />
                    ) : (
                      <CheckCircle2 size={18} />
                    )}
                    {Math.abs(Math.round(results.diff))} kcal
                  </div>
                </div>
              </div>
            )}

            {/* 4. 基礎食物 */}
            <div className="grid grid-cols-1 gap-4">
              <div className="bg-white rounded-xl shadow-sm p-4 border border-gray-100">
                <h3 className="font-bold text-gray-700 text-base mb-3 flex items-center gap-2">
                  <div className="w-1 h-4 bg-blue-400 rounded-full"></div>
                  濕食罐頭 ({(results.distribution.wet ?? 0).toFixed(2)} kcal)
                </h3>
                <div className="space-y-2">
                  {[can1Id, can2Id].map((currentId, idx) => (
                    <select
                      key={idx}
                      value={currentId}
                      onChange={(e) =>
                        idx === 0
                          ? setCan1Id(e.target.value)
                          : setCan2Id(e.target.value)
                      }
                      className="w-full p-2 bg-gray-50 border border-gray-200 rounded-lg text-base focus:outline-none focus:border-blue-300"
                    >
                      {CAN_DATABASE.map((can) => (
                        <option key={can.id} value={can.id}>
                          {can.name} ({can.kcal} kcal)
                        </option>
                      ))}
                    </select>
                  ))}
                </div>
              </div>
              <div className="bg-white rounded-xl shadow-sm p-4 border border-gray-100">
                <div className="flex justify-between items-center mb-2">
                  <h3 className="font-bold text-gray-700 text-base flex items-center gap-2">
                    <div className="w-1 h-4 bg-yellow-400 rounded-full"></div>{" "}
                    衛仕爆爆桶 ({snackGrams * SNACK_KCAL_PER_G} kcal)
                  </h3>
                  <span className="text-xs font-bold bg-yellow-100 text-yellow-700 px-2 py-0.5 rounded">
                    {snackGrams}g
                  </span>
                </div>
                <input
                  type="range"
                  min="0"
                  max="30"
                  value={snackGrams}
                  onChange={(e) => setSnackGrams(Number(e.target.value))}
                  className="w-full h-2 bg-gray-100 rounded-lg appearance-none cursor-pointer accent-yellow-400"
                />
              </div>
            </div>

            {/* 5. 自訂食物 */}
            <div className="bg-white rounded-xl shadow-sm p-4 border border-gray-100">
              <h3 className="font-bold text-gray-700 text-base mb-3 flex items-center gap-2">
                <div className="w-1 h-4 bg-purple-400 rounded-full"></div> 自訂
                / 額外攝取
              </h3>
              <div className="flex flex-col gap-2 mb-3 bg-gray-50 p-2 rounded-lg">
                <div className="flex gap-2">
                  {/* 名稱：寬度 70% (w-[70%]) 或是用 flex 權重 */}
                  <input
                    type="text"
                    placeholder="名稱"
                    value={newCustomName}
                    onChange={(e) => setNewCustomName(e.target.value)}
                    className="w-[70%] p-2 text-base bg-white border border-gray-200 rounded focus:outline-none focus:border-purple-300"
                  />

                  {/* 熱量：寬度 30% (w-[30%]) */}
                  <input
                    type="text"
                    inputMode="numeric"
                    pattern="[0-9]*"
                    placeholder="kcal"
                    value={newCustomKcal}
                    onChange={(e) => {
                      // ...省略 onChange 內容...
                      const val = e.target.value;
                      if (val === "" || /^\d+$/.test(val)) {
                        setNewCustomKcal(val === "" ? "" : Number(val));
                      }
                    }}
                    className="w-[30%] p-2 text-base bg-white border border-gray-200 rounded focus:outline-none focus:border-purple-300"
                  />
                </div>
                <div className="flex gap-2">
                  <select
                    value={newCustomCategory}
                    onChange={(e) => setNewCustomCategory(e.target.value)}
                    className="flex-1 p-2 text-base bg-white border border-gray-200 rounded text-gray-600 focus:outline-none"
                  >
                    {FOOD_CATEGORIES.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.label}
                      </option>
                    ))}
                  </select>
                  <button
                    onClick={handleAddCustomFood}
                    disabled={!newCustomName || !newCustomKcal}
                    className="bg-purple-500 text-white px-4 rounded hover:bg-purple-600 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    <Plus size={18} />
                  </button>
                </div>
              </div>
              {customFoods.length > 0 && (
                <div className="space-y-2 mt-2">
                  {customFoods.map((item) => {
                    const cat = FOOD_CATEGORIES.find(
                      (c) => c.id === item.category
                    );
                    return (
                      <div
                        key={item.id}
                        className="flex justify-between items-center text-base border-b border-gray-50 pb-1 last:border-0"
                      >
                        <div className="flex items-center gap-2">
                          <span
                            className={`w-2 h-2 rounded-full ${cat?.barColor}`}
                          ></span>
                          <span className="text-gray-600">{item.name}</span>
                          <span
                            className={`text-[10px] px-1.5 py-0.5 rounded ${cat?.bg} ${cat?.color}`}
                          >
                            {cat?.label.split("/")[0]}
                          </span>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="font-mono text-gray-500">
                            {item.kcal}
                          </span>
                          <button
                            onClick={() => removeCustomFood(item.id)}
                            className="text-gray-300 hover:text-red-400"
                          >
                            <Trash2 size={14} />
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            {/* 6. 熱量分佈 */}
            <div className="bg-white rounded-xl shadow-sm p-4 border border-gray-100 mb-6">
              <h3 className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-3">
                熱量來源分佈
              </h3>
              <div className="h-4 w-full bg-gray-100 rounded-full flex overflow-hidden mb-3">
                <div
                  style={{
                    width: `${
                      (results.distribution.staple / targetKcal) * 100
                    }%`,
                  }}
                  className="bg-green-500 h-full"
                ></div>
                <div
                  style={{
                    width: `${(results.distribution.wet / targetKcal) * 100}%`,
                  }}
                  className="bg-blue-400 h-full"
                ></div>
                <div
                  style={{
                    width: `${
                      (results.distribution.snack / targetKcal) * 100
                    }%`,
                  }}
                  className="bg-yellow-400 h-full"
                ></div>
                <div
                  style={{
                    width: `${
                      (results.distribution.other / targetKcal) * 100
                    }%`,
                  }}
                  className="bg-purple-400 h-full"
                ></div>
              </div>
              <div className="grid grid-cols-4 gap-1 text-center">
                {[
                  {
                    label: "主食",
                    val: results.distribution.staple,
                    color: "text-green-600",
                  },
                  {
                    label: "濕食",
                    val: results.distribution.wet,
                    color: "text-blue-600",
                  },
                  {
                    label: "零食",
                    val: results.distribution.snack,
                    color: "text-yellow-600",
                  },
                  {
                    label: "其他",
                    val: results.distribution.other,
                    color: "text-purple-600",
                  },
                ].map((item, idx) => (
                  <div key={idx} className="flex flex-col">
                    <span className="text-[10px] text-gray-400">
                      {item.label}
                    </span>
                    <span className={`text-xs font-bold ${item.color}`}>
                      {Math.round(item.val)}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* === 分頁 2: RER/DER 工具 === */}
        {activeTab === "tools" && (
          <div className="space-y-6 animate-fade-in">
            <div className="bg-white rounded-xl shadow-sm p-5 border-l-4 border-blue-500">
              <h3 className="text-lg font-bold text-gray-800 flex items-center gap-2 mb-4">
                <Scale className="text-blue-500" /> 第一步：輸入體重
              </h3>
              <div className="flex items-center gap-4">
                <div className="flex-1">
                  <label className="text-xs font-bold text-gray-400 uppercase">
                    體重 (KG)
                  </label>
                  <input
                    type="text"
                    inputMode="decimal"
                    pattern="[0-9]*\.?[0-9]*"
                    value={weight}
                    onChange={(e) => {
                      const val = e.target.value;
                      // 允許空字串、數字、單一個小數點
                      if (val === "" || /^\d*\.?\d*$/.test(val)) {
                        setWeight(val);
                      }
                    }}
                    onBlur={() => {
                      // 離開輸入框時，轉成數字並格式化到小數點後一位（可選）
                      if (weight !== "") {
                        setWeight(Number(weight).toFixed(1));
                      }
                    }}
                    className="w-full text-3xl font-black text-gray-700 border-b-2 border-blue-100 focus:border-blue-500 outline-none py-1 bg-transparent"
                    placeholder="0.0"
                  />
                </div>
                <div className="flex-1 bg-blue-50 rounded-lg p-3 text-right">
                  <div className="text-xs text-blue-600 font-bold mb-1">
                    RER (休息能量)
                  </div>
                  <div className="text-2xl font-black text-blue-700">
                    {Math.round(rer)}
                  </div>
                </div>
              </div>
              <p className="text-xs text-gray-400 mt-2">
                已自動載入最新記錄體重
              </p>
            </div>

            <div className="bg-white rounded-xl shadow-sm overflow-hidden border border-gray-100">
              <div className="p-4 bg-gray-50 border-b border-gray-200">
                <h3 className="font-bold text-gray-700 flex items-center gap-2">
                  <Activity size={18} /> 第二步：選擇需求因子
                </h3>
              </div>
              <div className="divide-y divide-gray-100">
                {FACTOR_DATA.map((factor) => (
                  <div
                    key={factor.id}
                    onClick={() => setSelectedFactorId(factor.id)}
                    className={`p-4 cursor-pointer transition-all ${
                      selectedFactorId === factor.id
                        ? "bg-blue-50 border-l-4 border-blue-500"
                        : "hover:bg-gray-50 border-l-4 border-transparent"
                    }`}
                  >
                    <div className="flex justify-between items-center mb-1">
                      <span
                        className={`font-bold ${
                          selectedFactorId === factor.id
                            ? "text-blue-700"
                            : "text-gray-700"
                        }`}
                      >
                        {factor.label}
                      </span>
                      <span className="bg-gray-200 text-gray-700 text-xs font-bold px-2 py-0.5 rounded">
                        {factor.range[0]} ~ {factor.range[1]}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {selectedFactorId && (
              <div className="bg-gradient-to-br from-gray-800 to-gray-900 rounded-xl shadow-lg p-6 text-white">
                <div className="mb-4">
                  <div className="flex justify-between items-end mb-2">
                    <label className="text-base font-bold text-gray-300">
                      第三步：決定具體係數
                    </label>
                    <span className="text-2xl font-bold text-yellow-400">
                      {formatNum(specificFactor)}
                    </span>
                  </div>
                  <input
                    type="range"
                    min={
                      FACTOR_DATA.find((f) => f.id === selectedFactorId)
                        .range[0]
                    }
                    max={
                      FACTOR_DATA.find((f) => f.id === selectedFactorId)
                        .range[1]
                    }
                    step="0.1"
                    value={specificFactor}
                    onChange={(e) =>
                      setSpecificFactor(parseFloat(e.target.value))
                    }
                    className="w-full h-2 bg-gray-600 rounded-lg appearance-none cursor-pointer accent-yellow-400"
                  />
                </div>
                <div className="border-t border-gray-700 pt-4 text-center">
                  <p className="text-gray-400 text-base mb-1">
                    DER (每日能量需求)
                  </p>
                  <div className="text-5xl font-black text-white mb-4">
                    {Math.round(der)}
                  </div>
                  <button
                    onClick={applyDerToTarget}
                    className="w-full bg-blue-600 hover:bg-blue-500 text-white font-bold py-3 rounded-xl flex items-center justify-center gap-2"
                  >
                    <ArrowRightCircle /> 設為計算機目標
                  </button>
                </div>
              </div>
            )}
          </div>
        )}

        {/* === 分頁 3: 體重趨勢圖 (整合真實數據與篩選) === */}
        {activeTab === "weight" && (
          <div className="space-y-4 animate-fade-in">
            {/* 篩選器控制列 */}
            <div className="bg-white rounded-xl shadow-sm p-3 border border-gray-100 flex gap-2 overflow-x-auto">
              <div className="flex items-center gap-2 min-w-fit px-2 border-r border-gray-100">
                <Filter size={16} className="text-gray-400" />
                <span className="text-xs font-bold text-gray-600">篩選</span>
              </div>

              {/* 年份選擇 */}
              <select
                value={filterYear}
                onChange={(e) => setFilterYear(e.target.value)}
                className="bg-gray-50 border border-gray-200 text-gray-700 text-xs rounded-lg p-2 focus:outline-none focus:border-purple-300"
              >
                <option value="all">所有年份</option>
                {availableYears.map((year) => (
                  <option key={year} value={year}>
                    {year} 年
                  </option>
                ))}
              </select>

              {/* 月份選擇 */}
              <select
                value={filterMonth}
                onChange={(e) => setFilterMonth(e.target.value)}
                className="bg-gray-50 border border-gray-200 text-gray-700 text-xs rounded-lg p-2 focus:outline-none focus:border-purple-300"
              >
                <option value="all">所有月份</option>
                {[...Array(12)].map((_, i) => (
                  <option key={i + 1} value={i + 1}>
                    {i + 1} 月
                  </option>
                ))}
              </select>
            </div>

            <div className="bg-white rounded-xl shadow-sm p-4 border border-purple-100">
              <h3 className="text-lg font-bold text-gray-800 flex items-center gap-2 mb-4">
                <IconLineChart className="text-purple-500" />
                體重趨勢記錄
              </h3>

              {/* 圖表容器 */}
              <div className="h-[250px] w-full">
                {isLoadingWeight ? (
                  <div className="h-full w-full flex items-center justify-center text-gray-400 text-base">
                    載入數據中...
                  </div>
                ) : filteredWeightData.length > 0 ? (
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart
                      data={filteredWeightData}
                      margin={{ top: 5, right: 20, left: -20, bottom: 5 }}
                    >
                      <CartesianGrid
                        strokeDasharray="3 3"
                        vertical={false}
                        stroke="#eee"
                      />
                      <XAxis
                        dataKey="date"
                        tick={{ fontSize: 12, fill: "#888" }}
                        axisLine={false}
                        tickLine={false}
                        interval="preserveStartEnd"
                      />
                      <YAxis
                        domain={["dataMin - 0.5", "dataMax + 0.5"]}
                        tick={{ fontSize: 12, fill: "#888" }}
                        axisLine={false}
                        tickLine={false}
                      />
                      <Tooltip
                        contentStyle={{
                          borderRadius: "8px",
                          border: "none",
                          boxShadow: "0 4px 12px rgba(0,0,0,0.1)",
                        }}
                        labelStyle={{ color: "#666", marginBottom: "0.5rem" }}
                      />
                      <Line
                        type="monotone"
                        dataKey="weight"
                        stroke="#8b5cf6"
                        strokeWidth={3}
                        dot={{
                          r: 4,
                          fill: "#8b5cf6",
                          strokeWidth: 2,
                          stroke: "#fff",
                        }}
                        activeDot={{ r: 6 }}
                        animationDuration={500}
                      />
                    </LineChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="h-full w-full flex flex-col items-center justify-center text-gray-300 gap-2">
                    <Calendar size={32} />
                    <span className="text-xs">此期間無數據</span>
                  </div>
                )}
              </div>
            </div>

            {/* 最近記錄列表 */}
            <div className="bg-white rounded-xl shadow-sm overflow-hidden border border-gray-100">
              <div className="p-3 bg-gray-50 border-b border-gray-200 flex justify-between items-center">
                <h4 className="font-bold text-gray-600 text-base">
                  詳細記錄列表
                </h4>
                <span className="text-xs text-gray-400">
                  筆數: {filteredWeightData.length}
                </span>
              </div>
              <div className="divide-y divide-gray-100 max-h-[300px] overflow-y-auto">
                {[...filteredWeightData].reverse().map((record, idx) => (
                  <div
                    key={idx}
                    className="p-3 flex justify-between items-center hover:bg-gray-50 transition-colors"
                  >
                    <span className="text-base text-gray-500 font-mono flex items-center gap-2">
                      {record.fullDate}
                    </span>
                    <span className="text-base font-bold text-gray-800">
                      {record.weight} kg
                    </span>
                  </div>
                ))}
                {filteredWeightData.length === 0 && (
                  <div className="p-4 text-center text-xs text-gray-400">
                    沒有符合篩選條件的記錄
                  </div>
                )}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default CatDietApp;
