"use client";
import { useState, useEffect } from 'react';

export default function Home() {
  const [input, setInput] = useState('');
  const [hospitals, setHospitals] = useState([]);
  const [loading, setLoading] = useState(false);
  const [fontSize, setFontSize] = useState(24);
  const [lang, setLang] = useState<'zh' | 'en'>('zh');
  
  // 儲存使用者位置
  const [location, setLocation] = useState<{lat: number, lng: number} | null>(null);

  // 給予 result 完整的初始結構，防止不使用 ?. 時當機
  const [result, setResult] = useState<any>({
    zh: { recommended_department: [], reason: "" },
    en: { recommended_department: [], reason: "" }
  });

  // 用來控制結果區塊何時顯示
  const [hasData, setHasData] = useState(false);

  // 元件掛載時請求位置權限
  useEffect(() => {
    if ("geolocation" in navigator) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          setLocation({
            lat: position.coords.latitude,
            lng: position.coords.longitude
          });
        },
        (error) => console.error("無法取得位置:", error)
      );
    }
  }, []);

  const t = {
    zh: {
      title: "醫療導診助理",
      langBtn: "English",
      sizeLabel: "字體大小",
      placeholder: "請描述您的不適症狀...",
      btn: "開始分析",
      analyzing: "分析中...",
      resultTitle: "診斷建議",
      dept: "建議前往：",
      action: "分析原因：",
      mapTitle: "附近推薦醫療機構",
      distance: "距離約",
      sizeLabels: { small: "小", large: "大" },
      warningBox: "⚠️ 溫馨提示：本網站使用 Google Gemini AI 進行初步分流建議。AI 診斷結果可能存在誤差，無法取代專業醫療判斷。若症狀嚴重或緊急，請務必立即就醫尋求專業醫療協助。",
      footerWarning: "免責聲明：本系統僅供就醫科別參考，不具備法律與醫療診斷效力。"
    },
    en: {
      title: "Medical Triage Assistant",
      langBtn: "中文",
      sizeLabel: "Text Size",
      placeholder: "Please describe your symptoms...",
      btn: "Start Analysis",
      analyzing: "Analyzing...",
      resultTitle: "Analysis Result",
      dept: "Recommended Dept:",
      action: "Reasoning:",
      mapTitle: "Recommended Hospitals",
      distance: "Approx.",
      sizeLabels: { small: "S", large: "L" },
      warningBox: "⚠️ Notice: This website uses Google Gemini AI for initial medical triage. AI recommendations may contain errors and cannot replace professional medical diagnosis. If symptoms are severe or urgent, please seek professional medical care immediately.",
      footerWarning: "Disclaimer: This system is for reference only and does not constitute formal medical or legal advice."
    }
  };

  const currentT = t[lang];

  const handleAnalyze = async () => {
    if (!input.trim()) return;
    setLoading(true);
    setHasData(false); 
    
    try {
      const res = await fetch("/api/triage", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ symptoms: input }),
      });
      
      const data = await res.json();

      if (data && data.zh && data.zh.recommended_department) {
        setResult(data);
        setHasData(true);

        const specialty = data.zh.recommended_department[0] || "一般內科";
        let url = `/api/places?q=${encodeURIComponent(specialty)}`;
        if (location) {
          url += `&lat=${location.lat}&lng=${location.lng}`;
        }
        
        const placesRes = await fetch(url);
        const placesData = await placesRes.json();
        
        const sortedHospitals = placesData.sort((a: any, b: any) => {
          const distA = parseFloat(a.distance || '0');
          const distB = parseFloat(b.distance || '0');
          return distA - distB;
        });

        setHospitals(sortedHospitals);
      } else {
        console.error("後端回傳格式不正確:", data);
      }

    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="min-h-screen p-4 md:p-12 bg-[#F9F7F2] text-[#4A3F6B] transition-all font-sans tracking-tight flex flex-col justify-between">
      <div className="max-w-3xl mx-auto w-full flex-1">
        
        {/* 控制列 */}
        {/* 💡 修正點 1：控制列在手機版改為 items-center 且內容完全居中對齊 */}
        <div className="flex flex-col sm:flex-row justify-between items-center mb-6 md:mb-10 bg-[#B8B2C7] p-4 sm:p-6 rounded-[1.5rem] md:rounded-[2.5rem] shadow-sm gap-4 md:gap-6 text-center">
          <div className="flex items-center justify-center gap-4 w-full sm:w-auto">
            <span className="text-lg md:text-2xl font-black text-[#4A3F6B] whitespace-nowrap">
              {currentT.sizeLabel}
            </span>
            <div className="flex flex-1 items-center gap-3 bg-white/40 px-4 py-2 rounded-xl">
              <span className="text-xs font-bold text-[#4A3F6B]">{currentT.sizeLabels.small}</span>
              <input 
                type="range" min="16" max="40" value={fontSize} 
                onChange={(e) => setFontSize(Number(e.target.value))}
                className="accent-[#E89A71] cursor-pointer flex-1 h-2"
              />
              <span className="text-xl font-black text-[#4A3F6B]">{currentT.sizeLabels.large}</span>
            </div>
          </div>
          <button 
            onClick={() => setLang(lang === 'zh' ? 'en' : 'zh')}
            className="w-full sm:w-auto bg-[#4A3F6B] hover:bg-[#352D52] text-white text-base md:text-lg font-black py-2.5 sm:py-3 px-8 sm:px-10 rounded-xl md:rounded-2xl transition-all shadow-md active:scale-95"
          >
            {currentT.langBtn}
          </button>
        </div>

        {/* 主標題 */}
        {/* 💡 修正點 2：移除 md:text-center，直接改為 text-center，確保手持與桌面裝置全部強制置中 */}
        <h1 className="text-3xl md:text-4xl font-black mb-8 text-center text-[#4A3F6B]">
          {currentT.title}
        </h1>
        
        {/* 輸入區域 */}
        <div className="bg-[#F1EDE4] p-5 md:p-8 rounded-[1.5rem] md:rounded-[3rem] mb-6 md:mb-10 border border-[#E2DCD0]">
          <textarea 
            style={{ fontSize: `${Math.min(fontSize, typeof window !== 'undefined' && window.innerWidth < 768 ? 28 : 40)}px` }}
            // 💡 修正點 3：加入 text-center 讓輸入框文字及 placeholder 提示字皆完全置中，適合長輩單手握持閱讀
            className="w-full bg-white/95 p-4 md:p-7 rounded-[1rem] md:rounded-[2rem] outline-none min-h-[140px] md:min-h-[160px] transition-all shadow-inner text-gray-800 placeholder:text-gray-300 border-none resize-none text-center"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder={currentT.placeholder}
          />
          
          {/* 溫馨提示區塊 (已維持置中) */}
          <div className="mt-4 p-4 bg-[#E89A71]/10 rounded-xl md:rounded-2xl border border-[#E89A71]/30 text-xs md:text-sm text-[#D68961] font-medium leading-relaxed text-center">
            {currentT.warningBox}
          </div>

          <button 
            onClick={handleAnalyze}
            className="w-full mt-4 bg-[#E89A71] text-white py-4 md:py-5 rounded-[1.25rem] md:rounded-[2rem] text-xl md:text-2xl font-black shadow-lg shadow-[#E89A71]/30 hover:bg-[#D68961] transition-all disabled:bg-gray-300 active:scale-[0.98]"
            disabled={loading}
          >
            {loading ? currentT.analyzing : currentT.btn}
          </button>
        </div>

        {/* 結果區域 */}
        {hasData && (
          <div className="space-y-6 md:space-y-8 animate-in fade-in zoom-in-95 duration-700 mb-10">
            <div className="bg-[#F1EDE4] rounded-[1.5rem] md:rounded-[3.5rem] p-5 md:p-10 shadow-sm border border-[#E2DCD0]">
              
              {/* 💡 修正點 4：AI 診斷建議的大標題改為 justify-center，讓小圓柱跟標題文字在所有螢幕上一同置中 */}
              <h2 className="text-xl md:text-2xl font-black text-[#E89A71] mb-6 flex items-center justify-center gap-3">
                <span className="w-2 md:w-3 h-6 md:h-8 bg-[#E89A71] rounded-full"></span>
                {currentT.resultTitle}
              </h2>
              
              <div style={{ fontSize: `${Math.min(fontSize, typeof window !== 'undefined' && window.innerWidth < 768 ? 26 : 40)}px` }} className="leading-relaxed">
                
                {/* 💡 修正點 5：科別建議欄位改為 justify-center 與 text-center，讓推薦的橘色科別標籤完美居中 */}
                <div className="mb-6 text-[#4A3F6B] font-medium flex flex-wrap items-center justify-center gap-2 text-center">
                  <span>{currentT.dept}</span>
                  <span className="px-4 py-1.5 bg-[#E89A71] text-white rounded-xl md:rounded-2xl font-black inline-block shadow-md text-base md:text-xl">
                    {result[lang].recommended_department.join(", ")}
                  </span>
                </div>
                
                {/* 💡 修正點 6：原因內容區塊將左邊粗邊框改為「上方粗邊框 (border-t-[6px])」，並加上 text-center，解決了手機版左側粗邊框在文字置中時視覺上的不對稱感 */}
                <div className="bg-[#B8B2C7]/20 p-5 md:p-9 rounded-[1.25rem] md:rounded-[2.5rem] border-t-[6px] md:border-t-[12px] border-[#B8B2C7] text-center">
                  <p className="text-[#4A3F6B] font-bold text-base md:text-lg leading-relaxed">「 {result[lang].reason} 」</p>
                </div>
              </div>
              
              <div className="mt-10 md:mt-14">
                {/* 💡 修正點 7：附近推薦機構的小標題也改為 text-center 置中 */}
                <h3 className="text-lg md:text-xl font-black text-[#4A3F6B] mb-5 opacity-90 text-center">{currentT.mapTitle}</h3>
                
                {/* 醫院清單卡片部分：外框對稱，但內部文字（如地址）保持左對齊便於常輩與使用者快速掃視 */}
                <div className="grid gap-4 md:gap-5">
                  {hospitals.map((h: any, i: number) => (
                    <div key={i} className="p-4 md:p-7 bg-white/80 rounded-[1.25rem] md:rounded-[2rem] hover:bg-white transition-all shadow-sm group border border-[#E2DCD0]">
                      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2 sm:gap-4">
                        <a 
                          href={h.mapUrl} 
                          target="_blank" 
                          rel="noopener noreferrer"
                          style={{ fontSize: `${Math.min(fontSize * 0.85, typeof window !== 'undefined' && window.innerWidth < 768 ? 20 : 35)}px` }} 
                          className="font-black text-[#4A3F6B] hover:text-[#E89A71] hover:underline transition-colors cursor-pointer inline-flex items-center gap-1 break-all"
                        >
                          {h.name} 🔗
                        </a>
                        <div className="flex items-center gap-1.5 bg-[#F9F7F2] px-3 py-1 rounded-lg shrink-0">
                          <span className="text-[#FFB400] text-base">★</span>
                          <span className="text-sm font-black text-[#4A3F6B]">{h.rating || "N/A"}</span>
                        </div>
                      </div>
                      
                      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-end mt-3 sm:mt-4 gap-3 sm:gap-4">
                        <div className="text-xs md:text-sm text-gray-500 w-full sm:max-w-[75%] break-words text-left">{h.address}</div>
                        <div className="bg-[#B8B2C7]/30 px-4 py-1 rounded-full text-xs md:text-sm font-black text-[#4A3F6B] whitespace-nowrap self-end sm:self-auto">
                          {currentT.distance} {h.distance || "0.0"} km
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

            </div>
          </div>
        )}
      </div>

      {/* 頁尾常駐聲明 */}
      <footer className="w-full text-center py-4 text-[10px] md:text-xs text-gray-400 font-medium tracking-normal opacity-70 mt-4 shrink-0">
        {currentT.footerWarning}
      </footer>
    </main>
  );
}