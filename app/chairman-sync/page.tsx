"use client";
import { useState } from "react";
import { createClient } from "@supabase/supabase-js";

export default function SyncPage(){
 const [log,setLog]=useState("");
 const sync=async()=>{
  setLog("Syncing...");
  const supabaseUrl=process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const anonKey=process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
  const supabase=createClient(supabaseUrl,anonKey);
  const {data:{session}}=await supabase.auth.getSession();
  if(!session){setLog("Login as Chairman first");return;}
  const res=await fetch("/api/chairman/voice/sync",{method:"POST",headers:{Authorization:`Bearer ${session.access_token}`}});
  const data=await res.json();
  setLog(JSON.stringify(data,null,2));
 };
 return <div style={{padding:20}}><h1>Chairman Voice Sync</h1><button onClick={sync} style={{padding:12,background:"green",color:"white",borderRadius:8}}>SYNC MY 29 VOICES NOW</button><pre style={{marginTop:20,whiteSpace:"pre-wrap"}}>{log}</pre></div>
}