import { NextRequest, NextResponse } from 'next/server';

// Helper function to format response to match expected structure
function formatResponse(data: any) {
  return {
    "id": `gen-${Date.now()}-${Math.random().toString(36).substring(2, 15)}`,
    "provider": "ProxyService",
    "model": "proxy",
    "object": "chat.completion",
    "created": Math.floor(Date.now() / 1000),
    "choices": [
      {
        "logprobs": null,
        "finish_reason": "stop",
        "native_finish_reason": "stop",
        "index": 0,
        "message": {
          "role": "assistant",
          "content": JSON.stringify(data),
          "refusal": null,
          "reasoning": null
        }
      }
    ],
    "usage": {
      "prompt_tokens": 0,
      "completion_tokens": 0,
      "total_tokens": 0
    }
  };
}

// Add CORS headers to response
function corsHeaders(response: NextResponse) {
  response.headers.set('Access-Control-Allow-Origin', '*');
  response.headers.set('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  response.headers.set('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  return response;
}

// Handle OPTIONS requests (for CORS preflight)
export async function OPTIONS(request: NextRequest) {
  const response = NextResponse.json({}, { status: 200 });
  response.headers.set('Access-Control-Allow-Origin', '*');
  response.headers.set('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  response.headers.set('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  response.headers.set('Access-Control-Max-Age', '86400'); // 24 hours
  return response;
}

// Handler for GET requests
export async function GET(request: NextRequest) {
  const url = request.nextUrl.searchParams.get('url');
  
  if (!url) {
    return corsHeaders(NextResponse.json({ error: 'URL parameter is required' }, { status: 400 }));
  }
  
  try {
    // Validate URL
    new URL(url);
    
    // Forward the request with original headers (excluding host-specific ones)
    const headers = new Headers();
    request.headers.forEach((value, key) => {
      if (!['host', 'connection', 'content-length'].includes(key.toLowerCase())) {
        headers.append(key, value);
      }
    });
    
    const response = await fetch(url, { headers });
    
    // Check if response is successful
    if (!response.ok) {
      return corsHeaders(NextResponse.json(
        { error: `Upstream server responded with status ${response.status}` }, 
        { status: response.status }
      ));
    }
    
    // Parse the JSON response
    const data = await response.json();
    
    return corsHeaders(NextResponse.json(formatResponse(data)));
  } catch (error: any) {
    console.error('Proxy error:', error);
    return corsHeaders(NextResponse.json({ 
      error: 'Failed to proxy request',
      details: error.message 
    }, { status: 500 }));
  }
}

// Handler for POST requests
export async function POST(request: NextRequest) {
  const url = request.nextUrl.searchParams.get('url');
  
  if (!url) {
    return corsHeaders(NextResponse.json({ error: 'URL parameter is required' }, { status: 400 }));
  }
  
  try {
    // Validate URL
    new URL(url);
    
    // Get the request body and headers
    const body = await request.json();
    
    // Forward the request headers (excluding host-specific ones)
    const headers = new Headers();
    headers.append('Content-Type', 'application/json');
    request.headers.forEach((value, key) => {
      if (!['host', 'connection', 'content-length'].includes(key.toLowerCase())) {
        headers.append(key, value);
      }
    });
    
    // Forward the request with the body
    const response = await fetch(url, {
      method: 'POST',
      headers,
      body: JSON.stringify(body),
    });
    
    // Check if response is successful
    if (!response.ok) {
      return corsHeaders(NextResponse.json(
        { error: `Upstream server responded with status ${response.status}` }, 
        { status: response.status }
      ));
    }
    
    // Parse the JSON response
    const data = await response.json();
    
    return corsHeaders(NextResponse.json(formatResponse(data)));
  } catch (error: any) {
    console.error('Proxy error:', error);
    return corsHeaders(NextResponse.json({ 
      error: 'Failed to proxy request',
      details: error.message 
    }, { status: 500 }));
  }
} 