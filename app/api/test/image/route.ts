import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const path = searchParams.get('path') || 'uploads/product_photo/1730338341_1.png';
  
  const results = [];
  
  const domains = [
    'https://manager.cnypharmacy.com',
    'https://manage.cnypharmacy.com',
    'https://www.cnypharmacy.com',
    'https://cnypharmacy.com'
  ];
  
  for (const domain of domains) {
    const url = `${domain}/${path}`;
    try {
      const response = await fetch(url, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
        },
        signal: AbortSignal.timeout(5000)
      });
      
      results.push({
        domain,
        url,
        status: response.status,
        ok: response.ok,
        contentType: response.headers.get('content-type'),
        contentLength: response.headers.get('content-length')
      });
    } catch (error) {
      results.push({
        domain,
        url,
        status: 'ERROR',
        ok: false,
        error: (error as Error).message
      });
    }
  }
  
  return NextResponse.json({
    path,
    results
  });
}
