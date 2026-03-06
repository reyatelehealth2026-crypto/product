import { NextRequest, NextResponse } from 'next/server';

/**
 * Proxy API for fetching Flash Sale data from CNY Pharmacy
 * GET /api/flashsale?id=116
 */
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const flashsaleId = searchParams.get('id') || '116';

  const apiUrl = `https://www.cnypharmacy.com/api/flashsale/${flashsaleId}`;

  try {
    const response = await fetch(apiUrl, {
      headers: {
        'Accept': 'application/json',
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
      },
      cache: 'no-store',
    });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const data = await response.json();
    
    return NextResponse.json({
      success: true,
      data,
      timestamp: new Date().toISOString(),
    });

  } catch (error) {
    console.error('Error fetching flash sale:', error);
    return NextResponse.json(
      { 
        error: 'ไม่สามารถดึงข้อมูล Flash Sale ได้',
        details: (error as Error).message 
      },
      { status: 500 }
    );
  }
}
