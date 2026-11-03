// app/api/v1/speak/route.ts - FIXED FOR CLEAR NAIJA VOICE
import { NextRequest, NextResponse } from 'next/server';

export const runtime = 'nodejs';

export async function POST(req: NextRequest) {
  try {
    const { text, voiceId } = await req.json();
    const elevenKey = process.env.ELEVENLABS_API_KEY!;

    // HIGH QUALITY SETTINGS - FOR CLEAR VOICE
    const response = await fetch(
      `https://api.elevenlabs.io/v1/text-to-speech/${encodeURIComponent(voiceId)}?output_format=mp3_44100_192&optimize_streaming_latency=0`,
      {
        method: 'POST',
        headers: {
          'xi-api-key': elevenKey,
          'Content-Type': 'application/json',
          'Accept': 'audio/mpeg',
        },
        body: JSON.stringify({
          text,
          model_id: 'eleven_multilingual_v2',
          voice_settings: {
            stability: 0.65,          // HIGH for clear sales voice
            similarity_boost: 0.85,   // Keep original Naija tune
            style: 0.25,              // Low style for clarity
            use_speaker_boost: true,  // ON for loud clear voice
          },
        }),
      }
    );

    if (!response.ok) {
      const err = await response.text();
      return NextResponse.json({ error: err }, { status: response.status });
    }

    const audioBuffer = await response.arrayBuffer();
    return new NextResponse(audioBuffer, {
      headers: {
        'Content-Type': 'audio/mpeg',
        'Cache-Control': 'no-store',
      },
    });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}