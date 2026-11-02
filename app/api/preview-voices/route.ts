import { createClient } from '@supabase/supabase-js';
import { NextResponse } from 'next/server';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

const STORAGE_BUCKET = 'voices';
const SIGNED_URL_TTL = 120; // 2 minutes

export async function GET() {
  try {
    const { data: recordings, error } = await supabaseAdmin
      .from('recordings')
      .select('id, file_name, audio_path, pidgin_text, api_number, language')
      .eq('admin_status', 'approved')
      .not('audio_path', 'is', null)
      .order('created_at', { ascending: false })
      .limit(10);

    if (error) {
      console.error('Preview voices error:', error.message);
      return NextResponse.json(
        { success: false, error: 'Failed to load voices' },
        { status: 500 }
      );
    }

    if (!recordings || recordings.length === 0) {
      return NextResponse.json(
        { success: false, error: 'No approved voices yet' },
        { status: 404 }
      );
    }

    const voices = [];

    for (const rec of recordings.slice(0, 5)) {
      const { data: signed, error: signError } = await supabaseAdmin.storage
        .from(STORAGE_BUCKET)
        .createSignedUrl(rec.audio_path, SIGNED_URL_TTL);

      if (signError || !signed?.signedUrl) {
        console.error('Signed URL failed for', rec.audio_path, signError?.message);
        continue;
      }

      voices.push({
        id: rec.id,
        name: `Main Naija Pidgin ${rec.api_number || voices.length + 1}`,
        accent: rec.language || 'Naija Pidgin',
        sample_text: rec.pidgin_text || 'How far boss!',
        sample_url: signed.signedUrl,
        api_number: rec.api_number,
      });
    }

    return NextResponse.json({
      success: true,
      voices,
    });
  } catch (err: any) {
    console.error('Preview voices unexpected error:', err);
    return NextResponse.json(
      { success: false, error: err.message || 'Internal error' },
      { status: 500 }
    );
  }
}