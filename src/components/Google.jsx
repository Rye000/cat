import React, { useState, useRef } from "react";
import Swal from "sweetalert2";
import TextField from "@mui/material/TextField";
import InputAdornment from "@mui/material/InputAdornment";
import { styled } from "@mui/material/styles";

const CustomTextField = styled(TextField)({
  "& label.Mui-focused": {
    color: "#4CAF50",
  },
  "& .MuiOutlinedInput-root": {
    "&.Mui-focused fieldset": {
      borderColor: "#4CAF50",
    },
    "&:hover fieldset": {
      borderColor: "#81C784",
    },
  },
});

const CatWeightRecorder = ({ onUploadSuccess }) => {
  // 1. 狀態管理
  const [formData, setFormData] = useState({
    date: new Date().toISOString().split("T")[0],
    weight: "",
  });
  const [loading, setLoading] = useState(false);

  // 2. 建立一個 ref 來抓取日期輸入框的 DOM 元素
  const dateInputRef = useRef(null);

  const handleChange = (e) => {
    const { name, value } = e.target;

    // 特殊處理 weight 欄位
    if (name === "weight") {
      if (value === "" || /^\d*\.?\d*$/.test(value)) {
        setFormData((prev) => ({
          ...prev,
          [name]: value,
        }));
      }
    } else {
      setFormData((prev) => ({
        ...prev,
        [name]: value,
      }));
    }
  };

  /**
   * 處理表單提交事件
   * 1. 彈出 SweetAlert 視窗要求輸入驗證碼 (API Key)
   * 2. 顯示上傳中的 Loading 狀態
   * 3. 將資料 POST 到 Google Apps Script (GAS)
   * 4. 根據 GAS 回傳的狀態顯示成功或失敗的提示
   * 5. 若成功則清空體重欄位並觸發回呼函式
   */
  const handleSubmit = async (e) => {
    e.preventDefault();

    // 決定使用哪個 GAS URL
    const GAS_URL = import.meta.env.VITE_GOOGLE;

    if (!GAS_URL) {
        Swal.fire({
            icon: "error",
            title: "設定錯誤",
            text: "找不到對應的 GAS URL 環境變數",
        });
        return;
    }

    // 1. 第一步：先跳出 SweetAlert 讓你輸入驗證碼
    const { value: userKey} = await Swal.fire({
      title: "身份驗證",
      text: `準備上傳至資料庫`,
      input: "password",
      inputLabel: "驗證 Key",
      inputPlaceholder: "請輸入 Key...",
      showCancelButton: true,
      confirmButtonText: "送出",
      cancelButtonText: "取消",
      confirmButtonColor: "#3085d6",
      cancelButtonColor: "#d33",
      inputValidator: (value) => {
        if (!value) {
          return "請輸入驗證碼！";
        }
      },
    });

    if (!userKey) return;

    setLoading(true);

    Swal.fire({
      title: "資料上傳中...",
      text: "正在驗證並寫入...",
      allowOutsideClick: false,
      didOpen: () => {
        Swal.showLoading();
      },
    });

    try {
      const payload = {
        ...formData,
        apiKey: userKey,
      };

      const response = await fetch(GAS_URL, {
        method: "POST",
        body: JSON.stringify(payload),
      });

      const data = await response.json();

      if (data.status === "success") {
        Swal.fire({
          icon: "success",
          title: "上傳成功！",
          text: `已新增紀錄`,
          timer: 1500,
          showConfirmButton: false,
          willClose: () => {
            if (onUploadSuccess) {
              onUploadSuccess(formData.date, formData.weight);
            }
            setFormData((prev) => ({ ...prev, weight: "" }));
          },
        });
      } else {
        Swal.fire({
          icon: "error",
          title: "上傳失敗",
          text: data.message,
        });
      }
    } catch (error) {
      console.error("Error:", error);
      Swal.fire({
        icon: "error",
        title: "連線錯誤",
        text: "請檢查網路連線或 GAS 網址設定",
      });
    } finally {
      setLoading(false);
    }
  };

  // 3. 專門處理點擊日期的函式
  const handleDateClick = () => {
    if (dateInputRef.current && dateInputRef.current.showPicker) {
      try {
        dateInputRef.current.showPicker();
      } catch (error) {
        console.error(error);
      }
    }
  };

  return (
    <div
      style={{
        maxWidth: "400px",
        margin: "20px auto",
        padding: "30px",
        border: "1px solid #eee",
        borderRadius: "16px",
        boxShadow: "0 4px 20px rgba(0,0,0,0.08)",
        backgroundColor: "#fff",
      }}
    >
      <h2 style={{ textAlign: "center", marginBottom: "25px", color: "#333" }}>
        🐱 體重紀錄
      </h2>

      <form onSubmit={handleSubmit}>
        <div style={{ marginBottom: "20px" }}>
          <CustomTextField
            label="日期"
            type="date"
            name="date"
            value={formData.date}
            onChange={handleChange}
            required
            fullWidth
            variant="outlined"
            inputRef={dateInputRef}
            onClick={handleDateClick}
            slotProps={{
              inputLabel: {
                shrink: true,
              },
              htmlInput: {
                style: { cursor: "pointer" },
              },
            }}
          />
        </div>

        <div style={{ marginBottom: "25px" }}>
          <CustomTextField
            label="體重"
            type="text"
            name="weight"
            value={formData.weight}
            onChange={handleChange}
            placeholder="例如: 4.5"
            required
            fullWidth
            variant="outlined"
            slotProps={{
              htmlInput: {
                inputMode: "decimal",
              },
              input: {
                endAdornment: (
                  <InputAdornment position="end">kg</InputAdornment>
                ),
              },
            }}
          />
        </div>

        <button
          type="submit"
          disabled={loading}
          style={{
            width: "100%",
            padding: "12px",
            backgroundColor: loading ? "#ccc" : "#4CAF50",
            color: "white",
            border: "none",
            borderRadius: "8px",
            fontSize: "16px",
            fontWeight: "bold",
            cursor: loading ? "not-allowed" : "pointer",
            transition: "background 0.3s",
            boxShadow: "0 2px 8px rgba(76, 175, 80, 0.3)",
          }}
        >
          {loading ? "處理中..." : "提交紀錄"}
        </button>
      </form>
    </div>
  );
};

export default CatWeightRecorder;
