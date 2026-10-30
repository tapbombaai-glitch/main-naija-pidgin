"use client";
import { useState, useRef, useEffect } from "react";

export default function WorkerDashboard() {
  const [isRecording, setIsRecording] = useState(false);
  const [audioURL, setAudioURL] = useState<string | null>(null);
  const [timer, setTimer] = useState(0);
  const [selectedLang, setSelectedLang] = useState("Pidgin");
  const [showModal, setShowModal] = useState<string | null>(null);
  const [activeBottom, setActiveBottom] = useState("Levels");
  const [earnings, setEarnings] = useState({ total: 1250, pending: 450, approved: 87 });
  const [taskProgress, setTaskProgress] = useState({ total: 46, today: 13 });
  const [currentSentenceIndex, setCurrentSentenceIndex] = useState(0);
  const [toast, setToast] = useState<string | null>(null);
  const [savedFiles, setSavedFiles] = useState<any[]>([]);

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const timerRef = useRef<any>(null);
  const streamRef = useRef<MediaStream | null>(null);

  // CHANGE HERE - REMOVE PIDGIN SENTENCES, PUT ADVERT WRITINGS YOU CAN READ & SAVE
  const allSentences: Record<string, string[]> = {
    Pidgin: [
      "Your voice na money! Record Pidgin for MayNaija, collect 30 naira per clip!",
      "Earn 1,500 naira daily! Fifteen seconds equals thirty naira! Just talk for phone!",
      "Omo no dull! Your accent na asset, MayNaija Pidgin need your original voice!",
      "Fifty clips per day equals one thousand five hundred naira! Work from phone!",
      "Chairman dey find voices! Record once, sell forever, chairman approved!",
      "Naija talk, world listen! Join 500 workers wey dey build Naija voice bank!",
      "No laptop needed! Just your phone, your voice, your Naija, collect money!",
      "Help AI understand Naija! Google no sabi Pidgin well, MayNaija dey build am!",
      "From worker to pro! Level up for MayNaija, pro workers earn fifty thousand weekly!",
      "Top earner this week don collect twelve thousand five hundred! You fit do pass am!"
    ],
    Igbo: ["Kedu? Ana m abia ugbu a.", "Biko nyere m aka.", "Kedu ihe na-eme?"],
    Hausa: ["Yaya kake? Ina zuwa yanzu.", "Don Allah ka taimake ni."],
    Yoruba: ["Bawo ni? Mo n bo nisisinyi.", "Ejo e ran mi lowo."],
  };