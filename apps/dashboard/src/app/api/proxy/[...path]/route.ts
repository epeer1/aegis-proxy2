import { auth0 } from '@/lib/auth0';
import { NextResponse } from 'next/server';

export async function POST(req: Request, props: { params: Promise<{ path: string[] }> }) {
  const { path } = await props.params;
  const targetPath = path.join('/');
  const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';

  try {
    const session = await auth0.getSession();
    
    // In @auth0/nextjs-auth0 v4, tokens are stored within session.tokenSet
    const token = session?.tokenSet?.idToken || session?.idToken;
    
    if (!session || !token) {
      return NextResponse.json({ error: 'Unauthorized: No active session or identity token found' }, { status: 401 });
    }

    let body;
    try {
      body = await req.json();
    } catch(e) {}

    const response = await fetch(`${apiUrl}/${targetPath}`, {
      method: "POST",
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      },
      body: body ? JSON.stringify(body) : undefined
    });

    const data = await response.json();
    return NextResponse.json(data, { status: response.status });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
