import React, { useState, useRef } from "react"; // 1. 多引入 useRef
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
    const GAS_URL = import.meta.env.VITE_GOOGLE;

    // 2. 建立一個 ref 來抓取日期輸入框的 DOM 元素
    const dateInputRef = useRef(null);

    const [formData, setFormData] = useState({
        date: new Date().toISOString().split("T")[0],
        weight: "",
    });

    const [loading, setLoading] = useState(false);

    const handleChange = (e) => {
        const { name, value } = e.target;
        setFormData((prev) => ({
            ...prev,
            [name]: value,
        }));
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setLoading(true);

        Swal.fire({
            title: "資料上傳中...",
            text: "正在將貓貓體重寫入試算表",
            allowOutsideClick: false,
            didOpen: () => {
                Swal.showLoading();
            },
        });

        try {
            const response = await fetch(GAS_URL, {
                method: "POST",
                body: JSON.stringify(formData),
            });

            const data = await response.json();

            if (data.status === "success") {
                Swal.fire({
                    icon: "success",
                    title: "上傳成功！",
                    text: "已新增一筆紀錄",
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
                    title: "寫入失敗",
                    text: data.message || "未知錯誤",
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
        // 如果瀏覽器支援 showPicker API (Chrome/Edge/Modern browsers)
        if (dateInputRef.current && dateInputRef.current.showPicker) {
            try {
                dateInputRef.current.showPicker();
            } catch (error) {
                // 防止少數情況下報錯
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
            }}>
            <h2 style={{ textAlign: "center", marginBottom: "25px", color: "#333" }}>🐱 體重紀錄</h2>

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
                        // 4. 綁定 ref 到內部的 input 元素
                        inputRef={dateInputRef}
                        // 5. 綁定 onClick 事件，點擊整個輸入框就觸發
                        onClick={handleDateClick}
                        // 6. 使用新的 slotProps 取代舊屬性
                        slotProps={{
                            inputLabel: {
                                shrink: true, // 對應舊的 InputLabelProps={{ shrink: true }}
                            },
                            htmlInput: {
                                style: { cursor: "pointer" }, // 讓滑鼠移過去變成手指形狀，暗示可點擊
                            },
                        }}
                    />
                </div>

                <div style={{ marginBottom: "25px" }}>
                    <CustomTextField
                        label="體重"
                        type="number"
                        name="weight"
                        value={formData.weight}
                        onChange={handleChange}
                        placeholder="例如: 4.5"
                        required
                        fullWidth
                        variant="outlined"
                        // 7. 體重這邊也改用 slotProps
                        slotProps={{
                            htmlInput: {
                                step: "0.01",
                                min: "0",
                            }, // 對應舊的 inputProps
                            input: {
                                endAdornment: <InputAdornment position="end">kg</InputAdornment>,
                            }, // 對應舊的 InputProps (注意大小寫差異)
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
                    }}>
                    {loading ? "處理中..." : "提交紀錄"}
                </button>
            </form>
        </div>
    );
};

export default CatWeightRecorder;
