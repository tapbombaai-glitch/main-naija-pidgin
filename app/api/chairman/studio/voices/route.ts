import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const CHAIRMAN_EMAIL = "tapbomba.ai@gmail.com";

export async function POST(request: NextRequest) {
try {
const url = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const anon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
const service = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const elevenKey = process.env.ELEVENLABS_API_KEY;

if (!url || !anon || !service || !elevenKey) {  
  throw new Error("Server configuration is incomplete.");  
}  

const token = request.headers  
  .get("authorization")  
  ?.replace(/^Bearer /, "");  

if (!token) {  
  return NextResponse.json(  
    { error: "Login required." },  
    { status: 401 }  
  );  
}  

const auth = createClient(url, anon);  

const {  
  data: { user },  
  error,  
} = await auth.auth.getUser(token);  

if (  
  error ||  
  !user ||  
  user.email?.toLowerCase() !== CHAIRMAN_EMAIL  
) {  
  return NextResponse.json(  
    { error: "Chairman access only." },  
    { status: 403 }  
  );  
}  

const { voiceId, text } = await request.json();  

if (  
  typeof voiceId !== "string" ||  
  !/^[a-zA-Z0-9_-]{5,100}$/.test(voiceId)  
) {  
  throw new Error("Invalid voice ID.");  
}  

if (  
  typeof text !== "string" ||  
  !text.trim() ||  
  text.length > 1000  
) {  
  throw new Error("Enter valid preview text (maximum 1,000 characters).");  
}  

const response = await fetch(  
  `https://api.elevenlabs.io/v1/text-to-speech/${encodeURIComponent(  
    voiceId  
  )}`,  
  {  
    method: "POST",  
    headers: {  
      "xi-api-key": elevenKey,  
      "Content-Type": "application/json",  
      Accept: "audio/mpeg",  
    },  
    body: JSON.stringify({  
      text,  
      model_id: "eleven_multilingual_v2",  
      output_format: "mp3_44100_128",  
    }),  
    cache: "no-store",  
  }  
);  

if (!response.ok) {  
  const detail = await response.text();  

  console.error("ElevenLabs preview error:", detail);  

  return NextResponse.json(  
    { error: "ElevenLabs could not generate this preview." },  
    { status: 502 }  
  );  
}  

const audio = await response.arrayBuffer();  

return new Response(audio, {  
  headers: {  
    "Content-Type": "audio/mpeg",  
    "Cache-Control": "no-store",  
  },  
});

} catch (error) {
return NextResponse.json(
{
error:
error instanceof Error
? error.message
: "Preview failed.",
},
{ status: 500 }
);
}
}