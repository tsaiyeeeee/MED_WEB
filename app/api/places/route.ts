import { NextResponse } from 'next/server';

// 輔助函式：使用 Haversine 公式計算兩個經緯度之間的直線距離 (單位：公里)
function calculateDistance(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371; // 地球半徑 (km)
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;
  const a = 
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * Math.sin(dLon / 2) * Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return parseFloat((R * c).toFixed(1)); 
}

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const query = searchParams.get('q') || '一般內科';
  
  // 接收前端傳來的使用者經緯度，若沒有則預設為長庚大學附近座標
  const userLat = parseFloat(searchParams.get('lat') || '25.0337'); 
  const userLng = parseFloat(searchParams.get('lng') || '121.3911');
  
  const apiKey = process.env.GOOGLE_MAPS_API_KEY;

  try {
    // 💡 1. 擴大關鍵字：同時搜尋科別、診所與大型綜合醫院，將兩者納入同一個池子中比對
    const combinedQuery = `${query} 診所 醫院 綜合醫院 急診`;

    const response = await fetch('https://places.googleapis.com/v1/places:searchText', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Goog-Api-Key': apiKey || '',
        'X-Goog-FieldMask': 'places.displayName,places.formattedAddress,places.rating,places.location,places.businessStatus,places.googleMapsUri,places.currentOpeningHours'
      },
      body: JSON.stringify({
        textQuery: combinedQuery, 
        languageCode: "zh-TW",
        maxResultCount: 20, // 抓取 20 筆基數，確保篩選排序後有足夠的優質名單
        locationBias: {
          circle: {
            center: { latitude: userLat, longitude: userLng }, 
            radius: 7000.0 // 搜尋半徑擴大至 7 公里，確保涵蓋區域大型醫院
          }
        }
      })
    });

    const data = await response.json();
    const rawPlaces = data.places || [];

    // 💡 2. 轉換資料結構並注入「智慧排序演算法」
    const processHospitals = (placesList: any[]) => {
      return placesList.map((p: any) => {
        let distanceNum = 1.2;
        let distanceStr = "1.2"; 
        
        if (p.location && p.location.latitude && p.location.longitude) {
          distanceNum = calculateDistance(userLat, userLng, p.location.latitude, p.location.longitude);
          distanceStr = distanceNum.toString();
        }

        const name = p.displayName.text;
        const isOpenNow = p.currentOpeningHours ? p.currentOpeningHours.openNow === true : false;
        
        // 判斷是否為大型醫院或設有急診的機構
        const isHospitalOrEmergency = name.includes("醫院") || name.includes("急診") || name.includes("長庚") || name.includes("馬偕") || name.includes("醫院");

        // 🎯 權重分數計算核心 (分數越高排越前面)
        let score = 0;

        // 權重規則 A：營業時間與急診權限
        if (isOpenNow) {
          score += 100; // 現在有開門，大加分
        } else if (isHospitalOrEmergency) {
          score += 45;  // 沒開門但如果是大型醫院，給予急診保留分，讓它在深夜時能超越休息的診所浮上來
        }

        // 權重規則 B：距離扣分制 (每多 1 公里扣 8 分，確保同狀況下由近到遠)
        score -= distanceNum * 8;

        // 權重規則 C：評價微幅加分 (最高加 5 分，作為同距離時的微調依據)
        if (p.rating) {
          score += p.rating;
        }

        return {
          name: isHospitalOrEmergency ? `🏥 ${name}` : name, // 大型醫院加上專屬圖標
          address: p.formattedAddress,
          rating: p.rating || "尚無評分",
          distance: distanceStr,
          mapUrl: p.googleMapsUri || `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(name)}`,
          score: score
        };
      });
    };

    // 💡 3. 第一階段嘗試：尋找「正常營運」且「當下有開門」的機構
    let activePlaces = rawPlaces.filter((p: any) => {
      const isOperational = p.businessStatus === "OPERATIONAL";
      const isOpenNow = p.currentOpeningHours ? p.currentOpeningHours.openNow === true : true; 
      return isOperational && isOpenNow;
    });

    let formattedResult = processHospitals(activePlaces);

    // 💡 4. 深夜與極端情況救援機制：萬一當下附近所有機構都關門了
    if (formattedResult.length === 0 && rawPlaces.length > 0) {
      // 放寬限制，直接處理所有抓到的原始資料（這時大醫院會靠著不熄燈的急診保留分跳到最前面）
      formattedResult = processHospitals(rawPlaces);
    }

    // 💡 5. 執行最終權重排序（分數由高到低）
    const sortedResult = formattedResult.sort((a: any, b: any) => b.score - a.score);

    // 💡 6. 最終切出前 8 筆最完美的推薦名單回傳給前端
    return NextResponse.json(sortedResult.slice(0, 8));
    
  } catch (error) {
    console.error("Places API 錯誤:", error);
    return NextResponse.json({ error: "搜尋失敗" }, { status: 500 });
  }
}