"use client";
import { useState, useEffect } from 'react';

export default function Home() {
  const [input, setInput] = useState('');
  const [result, setResult] = useState<any>(null);
  const [hospitals, setHospitals] = useState([]);
  const [loading, setLoading] = useState(false);
  const [fontSize, setFontSize] = useState(24);
  const [lang, setLang] = useState<'zh' | 'en'>('zh');
  
  // 新增：儲存使用者位置
  const [location, setLocation] = useState<{lat: number, lng: number} | null>(null);

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
      sizeLabel: "字體大小調整",
      placeholder: "請描述您的不適症狀...",
      btn: "開始分析",
      analyzing: "分析中...",
      resultTitle: "診斷建議",
      dept: "建議前往：",
      action: "分析原因：",
      mapTitle: "附近推薦醫療機構",
      distance: "距離約",
      sizeLabels: { small: "小", large: "大" }
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
      sizeLabels: { small: "S", large: "L" }
    }
  };

  const currentT = t[lang];

  const handleAnalyze = async () => {
    if (!input.trim()) return;
    setLoading(true);
    try {
      const res = await fetch("/api/triage", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ symptoms: input }),
      });
      const data = await res.json();
      setResult(data);

      // 將位置資訊帶入 Places API
      const specialty = data.zh.recommended_department[0];
      let url = `/api/places?q=${specialty}`;
      if (location) {
        url += `&lat=${location.lat}&lng=${location.lng}`;
      }
      
      const placesRes = await fetch(url);
      const placesData = await placesRes.json();
      setHospitals(placesData);
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="min-h-screen p-6 md:p-12 bg-[#F9F7F2] text-[#4A3F6B] transition-all font-sans tracking-tight">
      <div className="max-w-3xl mx-auto">
        
        {/* 控制列 */}
        <div className="flex flex-col md:flex-row justify-between items-center mb-10 bg-[#B8B2C7] p-5 md:p-7 rounded-[2.5rem] shadow-sm gap-6">
          <div className="flex items-center gap-6 w-full md:w-auto">
            <span className="text-xl md:text-2xl font-black text-[#4A3F6B] whitespace-nowrap">
              {currentT.sizeLabel}
            </span>
            <div className="flex flex-1 items-center gap-4 bg-white/40 px-6 py-3 rounded-2xl">
              <span className="text-sm font-bold text-[#4A3F6B]">{currentT.sizeLabels.small}</span>
              <input 
                type="range" min="16" max="40" value={fontSize} 
                onChange={(e) => setFontSize(Number(e.target.value))}
                className="accent-[#E89A71] cursor-pointer flex-1 h-3"
              />
              <span className="text-2xl font-black text-[#4A3F6B]">{currentT.sizeLabels.large}</span>
            </div>
          </div>
          <button 
            onClick={() => setLang(lang === 'zh' ? 'en' : 'zh')}
            className="w-full md:w-auto bg-[#4A3F6B] hover:bg-[#352D52] text-white text-lg font-black py-3 px-10 rounded-2xl transition-all shadow-md active:scale-95"
          >
            {currentT.langBtn}
          </button>
        </div>

        <h1 className="text-4xl font-black mb-12 text-center text-[#4A3F6B]">
          {currentT.title}
        </h1>
        
        {/* 輸入區域 */}
        <div className="bg-[#F1EDE4] p-8 rounded-[3rem] mb-10 border border-[#E2DCD0]">
          <textarea 
            style={{ fontSize: `${fontSize}px` }}
            className="w-full bg-white/95 p-7 rounded-[2rem] outline-none min-h-[160px] transition-all shadow-inner text-gray-800 placeholder:text-gray-300 border-none"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder={currentT.placeholder}
          />
          <button 
            onClick={handleAnalyze}
            className="w-full mt-6 bg-[#E89A71] text-white py-5 rounded-[2rem] text-2xl font-black shadow-lg shadow-[#E89A71]/30 hover:bg-[#D68961] transition-all disabled:bg-gray-300"
            disabled={loading}
          >
            {loading ? currentT.analyzing : currentT.btn}
          </button>
        </div>

        {/* 結果區域 */}
        {result && (
          <div className="space-y-8 animate-in fade-in zoom-in-95 duration-700">
            <div className="bg-[#F1EDE4] rounded-[3.5rem] p-10 shadow-sm border border-[#E2DCD0]">
              <h2 className="text-2xl font-black text-[#E89A71] mb-8 flex items-center gap-3">
                <span className="w-3 h-8 bg-[#E89A71] rounded-full"></span>
                {currentT.resultTitle}
              </h2>
              
              <div style={{ fontSize: `${fontSize}px` }} className="leading-relaxed">
                <p className="mb-8 text-[#4A3F6B] font-medium">
                  {currentT.dept}
                  <span className="ml-4 px-6 py-1.5 bg-[#E89A71] text-white rounded-2xl font-black inline-block shadow-md">
                    {result[lang].recommended_department.join(", ")}
                  </span>
                </p>
                <div className="bg-[#B8B2C7]/20 p-9 rounded-[2.5rem] border-l-[12px] border-[#B8B2C7]">
                  <p className="text-[#4A3F6B] font-bold">「 {result[lang].reason} 」</p>
                </div>
              </div>
              
              <div className="mt-14">
                <h3 className="text-xl font-black text-[#4A3F6B] mb-7 opacity-90">{currentT.mapTitle}</h3>
                <div className="grid gap-5">
                  {hospitals.map((h: any, i: number) => (
                    <div key={i} className="p-7 bg-white/80 rounded-[2rem] hover:bg-white transition-all shadow-sm group border border-[#E2DCD0]">
                      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                        <div style={{ fontSize: `${fontSize * 0.85}px` }} className="font-black text-[#4A3F6B] group-hover:text-[#E89A71] transition-colors">
                          {h.name}
                        </div>
                        {/* 評價區域：星等與數字同行 */}
                        <div className="flex items-center gap-2 bg-[#F9F7F2] px-4 py-1.5 rounded-xl shrink-0">
                          <span className="text-[#FFB400] text-xl">★</span>
                          <span className="text-base font-black text-[#4A3F6B]">{h.rating || "N/A"}</span>
                        </div>
                      </div>
                      
                      <div className="flex flex-col md:flex-row justify-between items-start md:items-end mt-4 gap-4">
                        <div className="text-sm text-gray-500 max-w-[80%]">{h.address}</div>
                        {/* 距離顯示區域 */}
                        <div className="bg-[#B8B2C7]/30 px-5 py-1.5 rounded-full text-sm font-black text-[#4A3F6B] whitespace-nowrap">
                          {currentT.distance} {h.distance || "1.2"} km
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
    </main>
  );
}