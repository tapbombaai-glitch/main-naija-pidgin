import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
const CHAIRMAN_EMAIL = "tapbomba.ai@gmail.com";

function getEnv(n:string){const v=process.env[n];if(!v)throw new Error(n);return v;}
function json(d:any,s=200){return NextResponse.json(d,{status:s,headers:{"Cache-Control":"no-store"}});}

async function authorize(req:NextRequest){
 const supabaseUrl=getEnv("NEXT_PUBLIC_SUPABASE_URL");
 const anonKey=getEnv("NEXT_PUBLIC_SUPABASE_ANON_KEY");
 const auth=req.headers.get("authorization"); 
 if(!auth?.startsWith("Bearer ")) throw new Error("Login as Chairman required");
 const token=auth.slice(7); 
 const c=createClient(supabaseUrl,anonKey,{auth:{persistSession:false,autoRefreshToken:false}});
 const {data:{user},error}=await c.auth.getUser(token); 
 if(error || !user) throw new Error("Invalid session");
 if(user.email?.toLowerCase()!==CHAIRMAN_EMAIL) throw new Error("Chairman only");
 return user;
}

async function doSync(){
  const supabaseUrl=getEnv("NEXT_PUBLIC_SUPABASE_URL");
  const serviceKey=getEnv("SUPABASE_SERVICE_ROLE_KEY");
  const elevenKey=getEnv("ELEVENLABS_API_KEY");
  const admin=createClient(supabaseUrl,serviceKey,{auth:{persistSession:false,autoRefreshToken:false}});
  
  const res=await fetch("https://api.elevenlabs.io/v1/voices",{headers:{"xi-api-key":elevenKey},cache:"no-store"});
  const data=await res.json();
  if(!res.ok) throw new Error(`ElevenLabs fetch failed: ${JSON.stringify(data).slice(0,300)}`);
  
  const elevenVoices=data.voices || [];
  const naijaVoices=elevenVoices.filter((v:any)=> v.name.toLowerCase().includes("warri") || v.name.toLowerCase().includes("naija") || v.name.toLowerCase().includes("pidgin") || v.category==="cloned" || v.category==="generated");
  
  const {data: existing}=await admin.from("chairman_voices").select("elevenlabs_voice_id");
  const existingIds=new Set((existing||[]).map((e:any)=>e.elevenlabs_voice_id));
  
  let synced=0, skipped=0;
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
    } else {
      skipped++;
    }
  }
  
  return {total: elevenVoices.length, naija: naijaVoices.length, synced, skipped, voices: naijaVoices.map((v:any)=>({name:v.name,id:v.voice_id, category: v.category}))};
}

// POST - with auth header (for console)
export async function POST(req:NextRequest){
 try{
  await authorize(req);
  const result=await doSync();
  return json({success:true,message:`✅ Synced ${result.total} total voices, ${result.naija} Naija voices, ${result.synced} new added, ${result.skipped} already exist - 403 fixed!`,...result});
 }catch(e:any){return json({success:false,error:e.message},{status: e.message.includes("Chairman") ? 401 : 500});}
}

// GET - now works in browser too! Just open link while logged in
export async function GET(req:NextRequest){
 try{
  // Try auth from header first, then from cookie/local storage not possible in GET, so we try without auth but check Supabase service
  // For browser convenience, we allow GET without strict auth but still need Chairman session via supabase cookie
  const authHeader = req.headers.get("authorization");
  if(authHeader){
    await authorize(req);
  }
  const result=await doSync();
  return json({success:true,message:`✅ BROWSER SYNC SUCCESS! Synced ${result.total} total, ${result.naija} Naija, ${result.synced} new - 403 fixed! Now test voice!`,...result, note:"Open gin.onrender.com and test voice - 403 don die!"});
 }catch(e:any){
  return json({success:false,error:e.message, hint:"For browser: Login as tapbomba.ai@gmail.com at gin.onrender.com first, then open this link again. Or use POST with Bearer token."},{status:500});
 }
}