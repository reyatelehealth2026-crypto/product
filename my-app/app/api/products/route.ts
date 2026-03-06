import { NextRequest, NextResponse } from 'next/server';

/**
 * Proxy API for fetching product data from CNY Pharmacy
 * GET /api/products?url=<encoded_api_url>
 */
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const apiUrl = searchParams.get('url');

  if (!apiUrl) {
    return NextResponse.json(
      { error: 'กรุณาระบุ URL' },
      { status: 400 }
    );
  }

  // Validate URL is from cnypharmacy.com
  if (!apiUrl.includes('cnypharmacy.com')) {
    return NextResponse.json(
      { error: 'URL ต้องมาจาก cnypharmacy.com เท่านั้น' },
      { status: 403 }
    );
  }

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
    console.error('Error fetching products:', error);
    return NextResponse.json(
      { 
        error: 'ไม่สามารถดึงข้อมูลได้',
        details: (error as Error).message 
      },
      { status: 500 }
    );
  }
}
