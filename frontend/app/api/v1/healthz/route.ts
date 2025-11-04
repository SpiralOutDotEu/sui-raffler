// Minimal health endpoint: 200 OK
export async function GET() {
    return new Response('ok', { status: 200 });
  }
  