import { auth0 } from '@/lib/auth0';
import { NextResponse } from 'next/server';

async function proxyRequest(req: Request, path: string[], method: string) {
  const targetPath = path.join('/');
  const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';

  try {
    // DEV BYPASS: Force local_dev_secret for manual testing.
    // TODO: Remove this and restore auth0.getSession() for production.
    const token = "local_dev_secret";

    const options: RequestInit = {
      method,
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      }
    };

    if (method !== 'GET' && method !== 'HEAD') {
      try {
        const body = await req.json();
        options.body = JSON.stringify(body);
      } catch(e) {}
    }

    const response = await fetch(`${apiUrl}/${targetPath}`, options);
    const data = await response.json();
    return NextResponse.json(data, { status: response.status });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function POST(req: Request, props: { params: Promise<{ path: string[] }> }) {
  const { path } = await props.params;
  return proxyRequest(req, path, 'POST');
}

export async function GET(req: Request, props: { params: Promise<{ path: string[] }> }) {
  const { path } = await props.params;
  return proxyRequest(req, path, 'GET');
}
