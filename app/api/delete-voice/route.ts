import { createClient } from '@supabase/supabase-js';
import { NextRequest, NextResponse } from 'next/server';

const SUPABASE_URL =
  process.env.SUPABASE_URL ||
  process.env.NEXT_PUBLIC_SUPABASE_URL;

const SUPABASE_SERVICE_ROLE_KEY =
  process.env.SUPABASE_SERVICE_ROLE_KEY ||
  process.env.SUPABASE_SERVICE_KEY;

const ELEVENLABS_API_KEY = process.env.ELEVENLABS_API_KEY;

const CHAIRMAN_EMAIL = 'tapbomba.ai@gmail.com';

if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
  throw new Error('Missing Supabase server environment variables');
}

const supabaseAdmin = createClient(
  SUPABASE_URL,
  SUPABASE_SERVICE_ROLE_KEY,
  {
    auth: {
      autoRefreshToken: false,
      persistSession: false
    }
  }
);

function errorResponse(status: number, error: string) {
  return NextResponse.json(
    { success: false, error },
    {
      status,
      headers: { 'Cache-Control': 'private, no-store' }
    }
  );
}

export async function DELETE(req: NextRequest) {
  try {
    // 1. Check authentication token.
    const authHeader = req.headers.get('authorization') || '';
    const match = authHeader.match(/^Bearer\s+(.+)$/i);
    const token = match?.[1]?.trim();

    if (!token) {
      return errorResponse(401, 'Login required');
    }

    // 2. Verify Supabase user.
    const { data: userData, error: authError } =
      await supabaseAdmin.auth.getUser(token);

    if (authError || !userData?.user) {
      return errorResponse(401, 'Invalid or expired session');
    }

    const user = userData.user;

    // 3. Check Chairman email.
    const email = (user.email || '').trim().toLowerCase();

    if (email !== CHAIRMAN_EMAIL) {
      return errorResponse(403, 'Chairman access only');
    }

    // 4. Confirm Chairman profile.
    const { data: profile, error: profileError } =
      await supabaseAdmin
        .from('profiles')
        .select('email, is_chairman')
        .eq('id', user.id)
        .maybeSingle();

    if (profileError) {
      console.error('Chairman verification error:', profileError.message);
      return errorResponse(500, 'Could not verify Chairman account');
    }

    if (
      !profile ||
      profile.is_chairman !== true ||
      (profile.email || '').trim().toLowerCase() !== CHAIRMAN_EMAIL
    ) {
      return errorResponse(403, 'Chairman permission not confirmed');
    }

    // 5. Check ElevenLabs configuration.
    if (!ELEVENLABS_API_KEY) {
      return errorResponse(500, 'ElevenLabs API key is not configured');
    }

    // 6. Validate voice ID.
    const body = await req.json().catch(() => null);
    const voiceId = body?.voiceId;

    if (
      typeof voiceId !== 'string' ||
      !/^[a-zA-Z0-9_-]{1,100}$/.test(voiceId)
    ) {
      return errorResponse(400, 'Invalid voice ID');
    }

    // 7. Delete voice from ElevenLabs.
    const response = await fetch(
      `https://api.elevenlabs.io/v1/voices/${encodeURIComponent(voiceId)}`,
      {
        method: 'DELETE',
        headers: {
          'xi-api-key': ELEVENLABS_API_KEY
        },
        cache: 'no-store'
      }
    );

    const responseText = await response.text();

    let result: any = null;

    try {
      result = responseText ? JSON.parse(responseText) : null;
    } catch {
      result = responseText;
    }

    if (!response.ok) {
      console.error('ElevenLabs deletion failed:', response.status);

      return NextResponse.json(
        {
          success: false,
          error: 'ElevenLabs could not delete this voice',
          details: result
        },
        {
          status: response.status,
          headers: { 'Cache-Control': 'private, no-store' }
        }
      );
    }

    return NextResponse.json(
      {
        success: true,
        message: 'Voice deleted successfully',
        result
      },
      {
        headers: { 'Cache-Control': 'private, no-store' }
      }
    );

  } catch (error: any) {
    console.error(
      'Delete voice API error:',
      error?.message || 'Unknown error'
    );

    return errorResponse(500, 'Internal server error');
  }
}