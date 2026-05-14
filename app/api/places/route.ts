import { NextResponse } from 'next/server';

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const query = searchParams.get('q') || '醫院';
  const apiKey = process.env.GOOGLE_MAPS_API_KEY;

  try {
    const response = await fetch('https://places.googleapis.com/v1/places:searchText', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Goog-Api-Key': apiKey || '',
        'X-Goog-FieldMask': 'places.displayName,places.formattedAddress,places.rating'
      },
      body: JSON.stringify({
        textQuery: `${query} 診所`, 
        languageCode: "zh-TW",
        maxResultCount: 8,
        locationBias: {
          circle: {
            center: { latitude: 25.0337, longitude: 121.3911 },
            radius: 5000.0
          }
        }
      })
    });

    const data = await response.json();
    const hospitals = data.places?.map((p: any) => ({
      name: p.displayName.text,
      address: p.formattedAddress,
      rating: p.rating || "尚無評分"
    })) || [];

    return NextResponse.json(hospitals);
  } catch (error) {
    return NextResponse.json({ error: "搜尋失敗" }, { status: 500 });
  }
}