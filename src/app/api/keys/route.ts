import { NextResponse } from "next/server";

export const runtime = "nodejs";

// API keys must be created through the verified payment route.
// Direct key generation is disabled.
export async function POST() {
return NextResponse.json(
{
success: false,
error:
"Direct API key generation is disabled. Purchase a package through Paystack to request an API key.",
},
{ status: 403 }
);
}

// Do not expose every customer's API keys through a public endpoint.
export async function GET() {
return NextResponse.json(
{
success: false,
error: "Please use the authenticated API key dashboard.",
},
{ status: 401 }
);
}