import { NextResponse } from 'next/server';

export async function GET() {
return NextResponse.json({
success: true,
app_name: 'EMAKA VOICE',
voice: 'Kingsley - EMAKA VOICE',
message: 'EMAKA VOICE API - Inside Same EMAKA VOICE App',
});
}