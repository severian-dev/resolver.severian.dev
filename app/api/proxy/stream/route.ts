import { NextRequest } from 'next/server';

// Add CORS headers to a Response object
function addCorsHeaders(response: Response): Response {
  response.headers.set('Access-Control-Allow-Origin', '*');
  response.headers.set('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  response.headers.set('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  return response;
}

// Format streaming data to match expected structure
function formatStreamData(data: string) {
  const timestamp = Math.floor(Date.now() / 1000);
  return {
    "id": `gen-${timestamp}-${Math.random().toString(36).substring(2, 15)}`,
    "provider": "Chutes",
    "model": "deepseek/deepseek-r1:free",
    "object": "chat.completion.chunk",
    "created": timestamp,
    "choices": [
      {
        "index": 0,
        "delta": {
          "role": "assistant",
          "content": data
        },
        "finish_reason": null,
        "native_finish_reason": null,
        "logprobs": null
      }
    ],
    "usage": {
      "prompt_tokens": 3134,
      "completion_tokens": 500,
      "total_tokens": 3634
    }
  };
}

// Format the final event that includes the last 3 events
function formatFinalEvent(recentEvents: string[]) {
  const timestamp = Math.floor(Date.now() / 1000);
  // Combine the last 3 events into a single content string
  const content = recentEvents.join('\n');
  
  return {
    "id": `gen-${timestamp}-${Math.random().toString(36).substring(2, 15)}`,
    "provider": "Chutes",
    "model": "deepseek/deepseek-r1:free",
    "object": "chat.completion.chunk",
    "created": timestamp,
    "choices": [
      {
        "index": 0,
        "delta": {
          "role": "assistant",
          "content": content
        },
        "finish_reason": "stop",
        "native_finish_reason": "stop",
        "logprobs": null
      }
    ],
    "usage": {
      "prompt_tokens": 3134,
      "completion_tokens": 500,
      "total_tokens": 3634
    }
  };
}

// Handle OPTIONS requests (for CORS preflight)
export async function OPTIONS(request: NextRequest) {
  return new Response(null, {
    status: 204,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization',
      'Access-Control-Max-Age': '86400', // 24 hours
    }
  });
}

// Common function to handle both GET and POST streaming
async function handleStreamRequest(request: NextRequest, url: string, postBody?: any) {
  try {
    // Validate URL
    new URL(url);
    
    // Forward the request with appropriate method and body
    const headers = new Headers();
    request.headers.forEach((value, key) => {
      if (!['host', 'connection', 'content-length'].includes(key.toLowerCase())) {
        headers.append(key, value);
      }
    });

    // Configure fetch options based on whether this is a GET or POST
    const fetchOptions: RequestInit = { 
      headers,
      method: postBody ? 'POST' : 'GET'
    };
    
    if (postBody) {
      headers.set('Content-Type', 'application/json');
      fetchOptions.body = JSON.stringify(postBody);
    }
    
    const response = await fetch(url, fetchOptions);
    
    if (!response.ok) {
      return addCorsHeaders(new Response(
        JSON.stringify({ error: `Upstream server responded with status ${response.status}` }), 
        { status: response.status, headers: { 'Content-Type': 'application/json' } }
      ));
    }
    
    // Check if the response is SSE
    const contentType = response.headers.get('content-type');
    
    if (contentType?.includes('text/event-stream')) {
      // For SSE, we need to set up a streaming response
      const { readable, writable } = new TransformStream();
      const writer = writable.getWriter();
      const encoder = new TextEncoder();
      
      // Process the stream
      const reader = response.body?.getReader();
      
      if (!reader) {
        return addCorsHeaders(new Response(JSON.stringify({ error: 'Failed to read stream' }), {
          status: 500,
          headers: { 'Content-Type': 'application/json' }
        }));
      }
      
      // Start reading the stream
      (async () => {
        try {
          const recentEvents = [];
          const MAX_RECENT_EVENTS = 3;
          
          while (true) {
            const { done, value } = await reader.read();
            
            if (done) {
              // When stream is done, send a final message with the last 3 events
              if (recentEvents.length > 0) {
                const finalEvent = formatFinalEvent(recentEvents);
                await writer.write(encoder.encode(`data: ${JSON.stringify(finalEvent)}\n\n`));
              }
              await writer.close();
              break;
            }
            
            // Decode the chunk and wrap it in our format
            const chunk = new TextDecoder().decode(value);
            const lines = chunk.split('\n').filter(line => line.trim());
            
            for (const line of lines) {
              if (line.startsWith('data:')) {
                const data = line.slice(5).trim();
                try {
                  // Store recent events for debugging (limited to last 3)
                  recentEvents.push(data);
                  if (recentEvents.length > MAX_RECENT_EVENTS) {
                    recentEvents.shift();
                  }
                  
                  // Format the data in our desired structure
                  const formattedData = JSON.stringify(formatStreamData(data));
                  
                  // Write to our output stream
                  await writer.write(encoder.encode(`data: ${formattedData}\n\n`));
                } catch (e) {
                  console.error('Error formatting SSE data:', e);
                }
              } else {
                // Pass through other SSE events
                await writer.write(encoder.encode(`${line}\n`));
              }
            }
          }
        } catch (error) {
          console.error('Stream processing error:', error);
          writer.abort(error);
        }
      })();
      
      // Return the readable stream as an SSE response with CORS headers
      return addCorsHeaders(new Response(readable, {
        headers: {
          'Content-Type': 'text/event-stream',
          'Cache-Control': 'no-cache',
          'Connection': 'keep-alive'
        }
      }));
    } else {
      // For non-SSE responses, handle normally
      const data = await response.json();
      
      // Format response to match expected structure
      const formattedResponse = {
        "id": `gen-${Date.now()}-${Math.random().toString(36).substring(2, 15)}`,
        "provider": "Chutes",
        "model": "deepseek/deepseek-r1:free",
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
          "prompt_tokens": 3134,
          "completion_tokens": 500,
          "total_tokens": 3634
        }
      };
      
      return addCorsHeaders(new Response(JSON.stringify(formattedResponse), {
        headers: { 'Content-Type': 'application/json' }
      }));
    }
  } catch (error: any) {
    console.error('Proxy error:', error);
    return addCorsHeaders(new Response(JSON.stringify({ 
      error: 'Failed to proxy request',
      details: error.message 
    }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    }));
  }
}

// GET handler now uses the common handler
export async function GET(request: NextRequest) {
  const url = request.nextUrl.searchParams.get('url');
  
  if (!url) {
    return addCorsHeaders(new Response(JSON.stringify({ error: 'URL parameter is required' }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' }
    }));
  }
  
  return handleStreamRequest(request, url);
}

// POST handler for streaming endpoint
export async function POST(request: NextRequest) {
  const url = request.nextUrl.searchParams.get('url');
  
  if (!url) {
    return addCorsHeaders(new Response(JSON.stringify({ error: 'URL parameter is required' }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' }
    }));
  }
  
  try {
    const body = await request.json();
    return handleStreamRequest(request, url, body);
  } catch (error: any) {
    console.error('Error parsing request body:', error);
    return addCorsHeaders(new Response(JSON.stringify({ 
      error: 'Invalid JSON in request body',
      details: error.message 
    }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' }
    }));
  }
} 