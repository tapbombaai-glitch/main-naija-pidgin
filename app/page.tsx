"use client";
import { useState, useEffect, useRef } from "react";

export default function ChairmanDashboard() {
  const [tab, setTab] = useState("chairman");
  const [lang, setLang] = useState("Pidgin");
  const [recordings, setRecordings] = useState<any[]>([]);
  const [isRec, setIsRec] = useState(false);
  const [audioURL, setAudioURL] = useState<string | null>(null);
  const [timer, setTimer] = useState(0);
  const [idx, setIdx] = useState(0);
  const [toast, setToast] = useState("");
  const [playingId, setPlayingId] = useState<number | null>(null);

  const mrRef = useRef<MediaRecorder | null>(null);
  const timerRef = useRef<any>(null);
  const streamRef = useRef<MediaStream | null>(null);

  // YOUR ORIGINAL SENTENCES - COMPLETE
  const allSentences: any = {
    Pidgin: [
      "Earn 1500 naira daily! Your voice na money! Record Pidgin for MayNaija!",
      "Earn 1500 naira daily! Fifteen seconds equals daily cash! Just talk for phone!",
      "Omo no dull! Earn 1500 naira daily! Your accent na asset for MayNaija!",
      "Earn 1500 naira daily! Fifty clips per day na 1500 naira! Work from phone!",
      "Chairman dey find voices! Earn 1500 naira daily! Record once, collect daily!",
    ],
    Igbo: ["Kedu? Ana m abia ugbu a", "Biko nyere m aka", "Kedu ihe na eme?"],
    Hausa: ["Yaya kake? Ina zuwa yanzu", "Don Allah ka taimake ni"],
    Yoruba: ["Bawo ni? Mo n bo nisisinyi", "Ejo e ran mi lowo"],
  };

  useEffect(() => {
    const saved = JSON.parse(localStorage.getItem("gin_recordings