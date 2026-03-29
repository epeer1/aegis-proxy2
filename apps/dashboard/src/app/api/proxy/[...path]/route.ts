import { auth0 } from '@/lib/auth0';
import { NextResponse } from 'next/server';

async function proxyRequest(req: Request, path: string[], method: string) {
  const targetPath = path.join('/');
  const apiUrl = process.env.PROXY_URL || process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';

  try {
    // Dashboard→Proxy is always M2M via ADMIN_SECRET
    // Auth0 session is used to identify the analyst, not to auth with the backend
    const token = process.env.ADMIN_SECRET || 'local_dev_secret';

    // Get the authenticated user's identity for audit trail
    let analyst: string | undefined;
    if (process.env.SKIP_AUTH !== 'true') {
      try {
        const session = await auth0.getSession();
        analyst = session?.user?.email || session?.user?.name || session?.user?.sub;
      } catch (e) {}
    }

    const options: RequestInit = {
      method,
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      }
    };

    if (method !== 'GET' && method !== 'HEAD') {
      let body: any = {};
      try {
        body = await req.json();
      } catch(e) {}
      if (analyst) body.analyst = analyst;
      options.body = JSON.stringify(body);
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
