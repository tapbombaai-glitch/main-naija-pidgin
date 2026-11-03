import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
const CHAIRMAN_EMAIL = "tapbomba.ai@gmail.com";

function getEnv(n:string){const v=process.env[n];if(!v)throw new Error(n);return v;}
async function authorize(req:NextRequest){
 const supabaseUrl=getEnv("NEXT_PUBLIC_SUPABASE_URL");
 const anonKey=getEnv("NEXT_PUBLIC_SUPABASE_ANON_KEY");
 const auth=req.headers.get("authorization"); if(!auth?.startsWith("Bearer ")) throw new Error("Login");
 const token=auth.slice(7); const c=createClient(supabaseUrl,anonKey,{auth:{persistSession:false,autoRefreshToken:false}});
 const {data:{user}}=await c.auth.getUser(token); if(!user || user.email?.toLowerCase()!==CHAIRMAN_EMAIL) throw new Error("Chairman only"); return user;
}

export async function POST(req:NextRequest){
 try{
  await authorize(req);
  const supabaseUrl=getEnv("NEXT_PUBLIC_SUPABASE_URL");
  const serviceKey=getEnv("SUPABASE_SERVICE_ROLE_KEY");
  const elevenKey=getEnv("ELEVENLABS_API_KEY");
  const admin=createClient(supabaseUrl,serviceKey,{auth:{persistSession:false,autoRefreshToken:false}});
  
  // Get all voices from ElevenLabs account that matches your API key
  const res=await fetch("https://api.elevenlabs.io/v1/voices",{headers:{"xi-api-key":elevenKey},cache:"no-store"});
  const data=await res.json();
  if(!res.ok) return NextResponse.json({success:false,error:"ElevenLabs fetch failed",data},{status:500});
  
  const elevenVoices=data.voices || [];
  // Filter only your Naija voices
  const naijaVoices=elevenVoices.filter((v:any)=> v.name.toLowerCase().includes("warri") || v.name.toLowerCase().includes("naija") || v.name.toLowerCase().includes("pidgin") || v.category==="cloned");
  
  // Clear old broken entries and insert fresh ones
  // Keep only voices that exist in ElevenLabs
  const {data: existing}=await admin.from("chairman_voices").select("elevenlabs_voice_id");
  const existingIds=new Set((existing||[]).map((e:any)=>e.elevenlabs_voice_id));
  
  let synced=0;
  for(const ev of naijaVoices){
    if(!existingIds.has(ev.voice_id)){
      await admin.from("chairman_voices").insert({
        name: ev.name,
        elevenlabs_voice_id: ev.voice_id,
        category: ev.labels?.gender || "male",
        accent: "Naija Pidgin",
        is_active: true,
        is_published: false,
        requires_verification: false,
        description: `Synced from ElevenLabs - ${ev.name}`
      });
      synced++;
    }
  }
  
  return NextResponse.json({success:true,message:`Synced ${elevenVoices.length} total, ${naijaVoices.length} Naija, ${synced} new`,voices:naijaVoices.map((v:any)=>({name:v.name,id:v.voice_id}))});
 }catch(e:any){return NextResponse.json({success:false,error:e.message},{status:500});}
}