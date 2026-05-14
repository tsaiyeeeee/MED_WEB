import { NextResponse } from 'next/server';
import { GoogleGenerativeAI } from "@google/generative-ai";

// 初始化 Gemini SDK
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || "");

export async function POST(req: Request) {
  try {
    const { symptoms } = await req.json();

    if (!symptoms) {
      return NextResponse.json({ error: "缺少症狀描述" }, { status: 400 });
    }

    // 使用 gemini-1.5-flash 確保速度與穩定性，並指定回傳 JSON
    const model = genAI.getGenerativeModel({ 
      model: "gemini-3-flash-preview",
      generationConfig: { 
        responseMimeType: "application/json",
        temperature: 0.7,
      }
    });

    const prompt = `
      你是一位專業的醫療分流助手。請根據使用者的症狀描述，判斷最適合掛號的「單一」醫療科別。
      
      使用者描述：'${symptoms}'
      
      請嚴格按照以下 JSON 格式回傳（不要包含任何 Markdown 標籤或額外文字）：
      {
        "zh": {
          "recommended_department": ["科別名稱"],
          "reason": "為什麼建議這個科別的簡短分析"
        },
        "en": {
          "recommended_department": ["Department Name"],
          "reason": "Brief analysis of why this department is recommended"
        }
      }
    `;

    const result = await model.generateContent(prompt);

        
    // 💡 修正 1：加上 await 確保獲取 response 物件
    const response = await result.response; 
    
    // 💡 修正 2：加上 await 確保獲取文字內容
    const responseText = await response.text();

    
    const text = response.text();

    // 解析 AI 回傳的 JSON 字串
    const data = JSON.parse(text);

    return NextResponse.json(data);

  } catch (error: any) {
    console.error("Gemini Triage Error:", error);

    // 💡 重要：當 API 發生錯誤或額度用完時，回傳預設結構防止前端 result[lang] 報錯
    return NextResponse.json({
      zh: { 
        recommended_department: ["一般內科"], 
        reason: "目前分析系統繁忙，建議您先諮詢一般內科確認初步狀況。" 
      },
      en: { 
        recommended_department: ["General Medicine"], 
        reason: "The analysis system is currently busy. It is recommended to consult general medicine first." 
      }
    });
  }
}