import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const path = searchParams.get('path');
  
  if (!path) {
    return new NextResponse('Missing path parameter', { status: 400 });
  }
  
  // Try multiple domain patterns
  const domains = [
    'https://manager.cnypharmacy.com',
    'https://www.cnypharmacy.com',
    'https://cnypharmacy.com'
  ];
  
  let lastError = null;
  
  for (const domain of domains) {
    try {
      const imageUrl = `${domain}/${path}`;
      console.log(`Trying image: ${imageUrl}`);
      
      const response = await fetch(imageUrl, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
          'Accept': 'image/webp,image/apng,image/svg+xml,image/*,*/*;q=0.8',
          'Referer': domain,
        },
        // Add timeout
        signal: AbortSignal.timeout(5000)
      });
      
      if (response.ok) {
        const contentType = response.headers.get('content-type') || 'image/jpeg';
        
        // Only accept image content types
        if (!contentType.startsWith('image/')) {
          console.log(`Not an image: ${contentType}`);
          continue;
        }
        
        const buffer = await response.arrayBuffer();
        
        // Check if we actually got data
        if (buffer.byteLength === 0) {
          console.log('Empty image buffer');
          continue;
        }
        
        console.log(`Success: ${imageUrl} (${buffer.byteLength} bytes)`);
        
        return new NextResponse(buffer, {
          headers: {
            'Content-Type': contentType,
            'Cache-Control': 'public, max-age=86400',
            'Access-Control-Allow-Origin': '*'
          }
        });
      } else {
        console.log(`Failed: ${imageUrl} - ${response.status}`);
      }
    } catch (error) {
      console.error(`Error with ${domain}:`, error);
      lastError = error;
    }
  }
  
  // All domains failed - return placeholder redirect or error
  console.error('All image sources failed for path:', path);
  
  // Return a 302 redirect to a placeholder or the original URL for debugging
  return new NextResponse('Image not found', { 
    status: 404,
    headers: {
      'X-Debug-Path': path,
      'X-Debug-Error': (lastError as Error)?.message || 'All sources failed'
    }
  });
}
