"use client";

import { useState, useRef, useEffect, useMemo } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase/client";
import { getTodayPidgin } from "@/app/data/pidgin-500";

const DAILY_RECORDING_LIMIT = 30;
const APPROVED_SENTENCE_RATE = 30;

// FINAL NEW CAMPAIGN — Today, 21 Nov 2026, 5:00 PM Lagos
// 5pm Lagos = 4pm UTC (Lagos is UTC+1)
const CAMPAIGN_START_ISO = "2026-11-21T16:00:00.000Z";
const CAMPAIGN_START_MS = new Date(CAMPAIGN_START_ISO).getTime();

const AKWAIBOM_500: string[] = [
"Idem mfo, nte afo amek? Ami mmedi idem mfo, mkpo idem mfo ke afo amekere mi. I dey talk am slow slow, make you hear am well well, no rush at all for this recording.",
"Uyo adiaha mi, mkpo mfo adiaha mi, ami nkpo mfo ke ndin nte afo ade. Make you listen well well, I dey talk am clear clear, make e reach 11 seconds for this work.",
"Akwa Ibom adiaha mi, ami mmedi idem mfo, Akwa Ibom adiaha eka mi. Na so e be for Naija, we dey hustle everyday, God go bless our work for this recording.",
"Idem mfo, afo adia afia? Ami nka afia mkpa, mkpo mfo adiaha mi. I dey talk am again slow slow, make my voice clear, make Chairman hear am well well today.",
"Abasi adiaha mi, ami mmedi idem mfo, ami nka iso ke iso. No rush, talk am small small, make e sweet for ear, make e reach 12 seconds for this voice.",
"Edem mfo, mkpo mfo adiaha mi, ami nka afia mkpa ke Uyo. I dey talk am slow slow, make you hear am well well, no rush at all for this recording.",
"Mma mfo, nte afo amek? Ami mmedi idem mfo, mkpo idem mfo ke afo. Make you listen well well, I dey talk am clear clear, make e reach 11 seconds for this work.",
"Ami nka idem mfo ke Eket, mkpo mfo adiaha mi, ami nka ndin nte afo. Na so e be for Naija, we dey hustle everyday, God go bless our work for this recording.",
"Idem mfo ke Akwa Ibom, ami mmedi idem mfo, mkpo mfo adiaha mi. I dey talk am again slow slow, make my voice clear, make Chairman hear am well well today.",
"Afo adia afia? Ami nka afia mkpa, mkpo mfo adiaha mi ke Uyo. No rush, talk am small small, make e sweet for ear, make e reach 12 seconds for this voice.",
"Eka mi adiaha mi, ami mmedi idem mfo, mkpo idem mfo ke afo. I dey talk am slow slow, make you hear am well well, no rush at all for this recording.",
"Abasi, ami mmedi idem mfo, mkpo mfo adiaha mi, ami nka iso. Make you listen well well, I dey talk am clear clear, make e reach 11 seconds for this work.",
"Ikot Ekpene adiaha mi, ami mmedi idem mfo, mkpo mfo adiaha mi. Na so e be for Naija, we dey hustle everyday, God go bless our work for this recording.",
"Idem mfo, ami nka afia mkpa ke Oron, mkpo mfo adiaha mi. I dey talk am again slow slow, make my voice clear, make Chairman hear am well well today.",
"Mma, afo adia afia? Ami nka afia mkpa, mkpo mfo adiaha mi ke Uyo. No rush, talk am small small, make e sweet for ear, make e reach 12 seconds for this voice.",
"Ami nka idem mfo ke Ikot Abasi, mkpo mfo adiaha mi, ami nka ndin. I dey talk am slow slow, make you hear am well well, no rush at all for this recording.",
"Abasi adiaha mi, ami mmedi idem mfo, mkpo mfo adiaha mi ke Akwa Ibom. Make you listen well well, I dey talk am clear clear, make e reach 11 seconds for this work.",
"Idem mfo, afo adia afia? Ami nka afia mkpa ke Abak, mkpo mfo adiaha mi. Na so e be for Naija, we dey hustle everyday, God go bless our work for this recording.",
"Eka mi, ami mmedi idem mfo, mkpo idem mfo ke afo amekere mi. I dey talk am again slow slow, make my voice clear, make Chairman hear am well well today.",
"Akwa Ibom, ami mmedi idem mfo, mkpo mfo adiaha mi, ami nka iso. No rush, talk am small small, make e sweet for ear, make e reach 12 seconds for this voice.",
"Idem mfo, ami nka idem mfo ke Uyo, mkpo mfo adiaha mi, ami nka afia. I dey talk am slow slow, make you hear am well well, no rush at all for this recording.",
"Mma mfo adiaha mi, ami mmedi idem mfo, mkpo idem mfo ke afo amek. Make you listen well well, I dey talk am clear clear, make e reach 11 seconds for this work.",
"Afo adia ke Uyo? Ami nka ke Uyo, mkpo mfo adiaha mi, ami nka ndin. Na so e be for Naija, we dey hustle everyday, God go bless our work for this recording.",
"Abasi, ami nka iso ke iso, mkpo mfo adiaha mi, ami mmedi idem mfo. I dey talk am again slow slow, make my voice clear, make Chairman hear am well well today.",
"Idem mfo ke Eket, ami mmedi idem mfo, mkpo mfo adiaha mi ke afia. No rush, talk am small small, make e sweet for ear, make e reach 12 seconds for this voice.",
"Eka mi adiaha mi ke Ikot Ekpene, ami nka idem mfo, mkpo mfo adiaha mi. I dey talk am slow slow, make you hear am well well, no rush at all for this recording.",
"Mma, idem mfo, ami nka afia mkpa ke Oron, mkpo mfo adiaha mi. Make you listen well well, I dey talk am clear clear, make e reach 11 seconds for this work.",
"Ami nka idem mfo ke Abak, mkpo mfo adiaha mi, ami nka ndin nte afo. Na so e be for Naija, we dey hustle everyday, God go bless our work for this recording.",
"Idem mfo, Abasi adiaha mi, ami mmedi idem mfo, mkpo mfo adiaha mi. I dey talk am again slow slow, make my voice clear, make Chairman hear am well well today.",
"Akwa Ibom adiaha eka mi, ami mmedi idem mfo, mkpo mfo adiaha mi. No rush, talk am small small, make e sweet for ear, make e reach 12 seconds for this voice.",
"Uyo, Eket, Oron, Ikot Ekpene, Abak, Ikot Abasi, mkpo mfo adiaha mi. I dey talk am slow slow, make you hear am well well, no rush at all for this recording.",
"Idem mfo, ami nka afia mkpa, mkpo mfo adiaha mi, ami nka iso ke iso. Make you listen well well, I dey talk am clear clear, make e reach 11 seconds for this work.",
"Mma mfo, nte afo amek ke Uyo? Ami mmedi idem mfo, mkpo idem mfo ke afo. Na so e be for Naija, we dey hustle everyday, God go bless our work for this recording.",
"Abasi adiaha mi, ami nka idem mfo ke Akwa Ibom, mkpo mfo adiaha mi. I dey talk am again slow slow, make my voice clear, make Chairman hear am well well today.",
"Eka mi, idem mfo, ami nka afia mkpa ke Ikot Ekpene, mkpo mfo adiaha mi. No rush, talk am small small, make e sweet for ear, make e reach 12 seconds for this voice.",
"Idem mfo ke Akwa Ibom, ami mmedi idem mfo, mkpo mfo adiaha mi ke Uyo. I dey talk am slow slow, make you hear am well well, no rush at all for this recording.",
"Afo adia afia ke Eket? Ami nka afia mkpa, mkpo mfo adiaha mi. Make you listen well well, I dey talk am clear clear, make e reach 11 seconds for this work.",
"Mma, ami mmedi idem mfo, mkpo idem mfo ke afo amekere mi ke Uyo. Na so e be for Naija, we dey hustle everyday, God go bless our work for this recording.",
"Abasi, idem mfo, ami nka iso ke iso, mkpo mfo adiaha mi ke Akwa Ibom. I dey talk am again slow slow, make my voice clear, make Chairman hear am well well today.",
"Idem mfo, ami nka idem mfo ke Oron, mkpo mfo adiaha mi, ami nka afia. No rush, talk am small small, make e sweet for ear, make e reach 12 seconds for this voice.",
"Eka mi adiaha mi, ami mmedi idem mfo, mkpo mfo adiaha mi ke Ikot Abasi. I dey talk am slow slow, make you hear am well well, no rush at all for this recording.",
"Mma mfo, idem mfo, ami nka afia mkpa ke Abak, mkpo mfo adiaha mi. Make you listen well well, I dey talk am clear clear, make e reach 11 seconds for this work.",
"Akwa Ibom adiaha mi, ami nka idem mfo ke Uyo, mkpo mfo adiaha mi. Na so e be for Naija, we dey hustle everyday, God go bless our work for this recording.",
"Idem mfo, ami mmedi idem mfo, mkpo idem mfo ke afo amekere mi ke Eket. I dey talk am again slow slow, make my voice clear, make Chairman hear am well well today.",
"Abasi adiaha mi, ami nka iso, mkpo mfo adiaha mi, ami mmedi idem mfo. No rush, talk am small small, make e sweet for ear, make e reach 12 seconds for this voice.",
"Afo adia ke Ikot Ekpene? Ami nka ke Ikot Ekpene, mkpo mfo adiaha mi. I dey talk am slow slow, make you hear am well well, no rush at all for this recording.",
"Mma, idem mfo ke Uyo, ami mmedi idem mfo, mkpo mfo adiaha mi. Make you listen well well, I dey talk am clear clear, make e reach 11 seconds for this work.",
"Eka mi, ami nka afia mkpa ke Oron, mkpo mfo adiaha mi, ami nka ndin. Na so e be for Naija, we dey hustle everyday, God go bless our work for this recording.",
"Idem mfo ke Akwa Ibom, ami nka idem mfo, mkpo mfo adiaha mi ke Abak. I dey talk am again slow slow, make my voice clear, make Chairman hear am well well today.",
"Abasi, ami mmedi idem mfo, mkpo mfo adiaha mi, ami nka afia mkpa ke Uyo. No rush, talk am small small, make e sweet for ear, make e reach 12 seconds for this voice.",
];

const IGBO_15: string[] = [
"Ndewo, kedu ka i mere taa? A na m ekele gi nke ukwuu maka oru oma a, a na m ekwu okwu nwayo nwayo ka i wee nuru olu m nke oma, enweghi oso oso ozo na ndekọ a.",
"Biko nyere m aka taa, a choro m ka ihe nile gaa nke oma maka oru a, a na m ekwu okwu nke oma na nwayo, ka olu m wee doo anya ma di uto na nti maka oru a.",
"Kedu ihe na-eme n'ebe a taa? Anyi na-aru oru kwa ubochi, anyi na-agbasi mbọ ike, Chineke ga-agọzi oru anyi, ka ihe nile gaa nke oma maka ndekọ olu a taa.",
"Agaghi m ekwe ka ha ghogbuo m ma oli, a na m ekwu eziokwu mgbe nile, a na m ekwu okwu nwayo nwayo, ka onye obula wee nuru m nke oma, ka o ruo sekọnd iri na otu.",
"Oga, ego ole ka nke a bu taa? Biko gwa m ezi ego ya, a na m aru oru nke oma, a na m ekwu okwu nwayo, ka olu m wee doo anya maka oru a taa.",
"Anyi ga-aga ahia echi n'ututu, anyi ga-azuta ihe anyi choro, anyi ga-alaghachi n'ulo n'udo, a na m ekwu okwu nwayo ka i nuru m nke oma.",
"Daalụ nke ukwuu maka enyemaka gi taa, i mere oru oma nke ukwuu, a na m ekele gi site n'obi m nile, a na m ekwu okwu nwayo ka o ruo sekọnd iri na abuo.",
"Nwanne m, kedu ebe i na-aga ugbu a? Biko chere m obere oge, ka anyi gaa onu, a na m ekwu okwu nwayo nwayo ka i wee nuru m nke oma taa.",
"Ubochi taa di mma nke ukwuu, anyanwu na-enwu nke oma, anyi na-enwe obi uto, anyi na-aru oru nke oma, ka ihe nile gaa nke oma maka oru a.",
"Biko gee nti nke oma, a na m ekwu ihe di mkpa ugbu a, ekwula oso oso, kwuo okwu nwayo nwayo, ka olu gi wee ruo sekọnd iri na otu maka oru a.",
"A na m abia ugbu a, biko chere m, a na m aga n'uzo, a ga m abia n'oge na-adighi anya, a na m ekwu okwu nwayo ka i nuru m nke oma taa.",
"Ego ole ka i ga-akwụ m maka oru a? Biko kwuo eziokwu, a na m aru oru nke oma kwa ubochi, a na m ekwu okwu nwayo ka o doo anya.",
"Anyi ga-eri nri ọnụ ma emechaa oru a, anyi ga-aṅụ mmiri, anyi ga-ezu ike, anyi ga-enwe obi uto, a na m ekwu okwu nwayo ka o ruo sekọnd iri na abuo.",
"Chineke gozie gi nke ukwuu taa, ka oru gi gaa nke oma, ka ego gi baa ụba, ka ulo gi nwee udo, a na m ekwu okwu nwayo ka i nuru m.",
"Ndewo, ka anyi malite oru taa, a choro m ka ihe nile gaa nke oma, a na m ekwu okwu nwayo nwayo, enweghi oso oso, ka o ruo sekọnd iri na otu.",
];

const HAUSA_15: string[] = [
"Sannu, yaya kake yau? Ina gode maka wannan aiki mai kyau, ina magana a hankali don ka ji muryata da kyau, babu gaggawa kwata-kwata a cikin wannan rikodi.",
"Don Allah ka taimake ni yau, ina son komai ya tafi da kyau don wannan aiki, ina magana a hankali, don muryata ta zama a fili kuma ta yi dadi a kunne.",
"Me ke faruwa a nan yau? Muna aiki kowace rana, muna kokari sosai, Allah zai albarkaci aikinmu, komai zai tafi da kyau don wannan rikodi na murya.",
"Ba zan yarda su yaudare ni ba, ina fadin gaskiya a kowane lokaci, ina magana a hankali, don kowa ya ji ni da kyau, don ya kai daƙiƙa goma sha ɗaya.",
"Oga, nawa ne wannan yau? Don Allah ka fada mini gaskiyar kudin, ina aiki mai kyau, ina magana a hankali, don muryata ta zama a fili don wannan aiki.",
"Mu je kasuwa gobe da safe, za mu sayi abin da muke bukata, za mu dawo gida lafiya, ina magana a hankali don ka ji ni da kyau.",
"Na gode sosai don taimakonka yau, ka yi aiki mai kyau sosai, ina gode maka daga zuciyata, ina magana a hankali don ya kai daƙiƙa goma sha biyu.",
"Dan uwana, ina kake zuwa yanzu? Don Allah ka jira ni kadan, mu tafi tare, ina magana a hankali don ka ji ni da kyau yau.",
"Yau rana ce mai kyau sosai, rana na haskawa da kyau, muna farin ciki, muna aiki mai kyau, komai zai tafi da kyau don wannan aiki.",
"Don Allah ka saurara da kyau, ina fadin abu mai mahimmanci yanzu, kada ka yi gaggawa, ka yi magana a hankali, don muryarka ta kai daƙiƙa goma sha ɗaya.",
"Ina zuwa yanzu, don Allah ka jira ni, ina kan hanya, zan zo nan ba da jimawa ba, ina magana a hankali don ka ji ni da kyau yau.",
"Nawa za ka biya ni don wannan aiki? Don Allah ka fadi gaskiya, ina aiki mai kyau kowace rana, ina magana a hankali don ya zama a fili.",
"Za mu ci abinci tare bayan wannan aiki, za mu sha ruwa, za mu huta, za mu yi farin ciki, ina magana a hankali don ya kai daƙiƙa goma sha biyu.",
"Allah ya albarkace ka sosai yau, aikin ka ya tafi da kyau, kudinka ya karu, gidanka ya sami zaman lafiya, ina magana a hankali don ka ji ni.",
"Sannu, mu fara aiki yau, ina son komai ya tafi da kyau, ina magana a hankali, babu gaggawa, don ya kai daƙiƙa goma sha ɗaya.",
];

const YORUBA_15: string[] = [
"Ẹ n lẹ, bawo ni o se wa loni? Mo dupẹ pupọ fun iṣẹ rere yi, mo n sọ ọrọ laiyara ki ẹ le gbọ ohun mi daradara, ko si iyara rara ninu gbigbasilẹ yi.",
"Ẹ jọ ẹ ran mi lọwọ loni, mo fẹ ki ohun gbogbo lọ daradara fun iṣẹ yi, mo n sọ ọrọ laiyara, ki ohun mi le han gbangba ki o si dun ni eti.",
"Kini n ṣẹlẹ nibi loni? A n ṣiṣẹ ni gbogbo ọjọ, a n ṣiṣẹ takuntakun, Ọlọrun yoo bukun iṣẹ wa, ohun gbogbo yoo lọ daradara fun gbigbasilẹ ohun yi.",
"Mi o ni gba ki wọn tan mi rara, mo n sọ otitọ ni gbogbo igba, mo n sọ ọrọ laiyara, ki gbogbo eniyan le gbọ mi daradara, ki o de iṣẹju-aaya mọkanla.",
"Oga, elo ni eyi loni? Ẹ jọ sọ fun mi ni otitọ owo rẹ, mo n ṣiṣẹ daradara, mo n sọ ọrọ laiyara, ki ohun mi le han gbangba fun iṣẹ yi.",
"A o lọ si ọja lọla ni owurọ, a o ra ohun ti a nilo, a o pada si ile ni alaafia, mo n sọ ọrọ laiyara ki ẹ le gbọ mi daradara.",
"Ẹ ṣe pupọ fun iranlọwọ yin loni, ẹ ṣe iṣẹ rere pupọ, mo dupẹ lati ọkan mi, mo n sọ ọrọ laiyara ki o de iṣẹju-aaya mejila.",
"Arákùnrin mi, nibo ni o n lọ nisisinyi? Ẹ jọ duro de mi diẹ, ki a lọ papọ, mo n sọ ọrọ laiyara ki ẹ le gbọ mi daradara loni.",
"Ọjọ oni dara pupọ, oorun n tan daradara, a ni ayọ, a n ṣiṣẹ daradara, ohun gbogbo yoo lọ daradara fun iṣẹ yi.",
"Ẹ jọ ẹ gbọ daradara, mo n sọ ohun pataki nisisinyi, ẹ ma ṣe iyara, ẹ sọ ọrọ laiyara, ki ohun yin le de iṣẹju-aaya mọkanla fun iṣẹ yi.",
"Mo n bọ nisisinyi, ẹ jọ duro de mi, mo wa ni ọna, mo o de laipẹ, mo n sọ ọrọ laiyara ki ẹ le gbọ mi daradara loni.",
"Elo ni o o san mi fun iṣẹ yi? Ẹ jọ sọ otitọ, mo n ṣiṣẹ daradara ni gbogbo ọjọ, mo n sọ ọrọ laiyara ki o han gbangba.",
"A o jẹun papọ lẹhin iṣẹ yi, a o mu omi, a o sinmi, a o ni ayọ, mo n sọ ọrọ laiyara ki o de iṣẹju-aaya mejila.",
"Ọlọrun bukun yin pupọ loni, ki iṣẹ yin lọ daradara, ki owo yin pọ si i, ki ile yin ni alaafia, mo n sọ ọrọ laiyara ki ẹ le gbọ mi.",
"Ẹ n lẹ, ki a bẹrẹ iṣẹ loni, mo fẹ ki ohun gbogbo lọ daradara, mo n sọ ọrọ laiyara, ko si iyara, ki o de iṣẹju-aaya mọkanla.",
];

const IJAW_15: string[] = [
"[DRAFT - NEEDS VALIDATION] Tobou, nua bomo? I bieke tobara se, I tobou ke emi, I dey talk am slow slow, make you hear am well well, no rush at all for this recording, make e reach 11 seconds.",
"[DRAFT - NEEDS VALIDATION] Emi tobou tobara, I bieke emi, I dey talk am clear clear, make you hear am well well, I dey work for this place everyday, God go bless our work for this recording.",
"[DRAFT - NEEDS VALIDATION] Nua se dei? We dey work everyday, we dey hustle for Naija, God go bless our work, I dey talk am slow slow, make my voice clear for this voice work.",
"[DRAFT - NEEDS VALIDATION] Emi na-emi, I no go lie, I dey talk true true, I dey talk am slow slow, make everybody hear am well well, make e reach 11 seconds for this recording.",
"[DRAFT - NEEDS VALIDATION] Oga, gbolo na-emi? Abeg tell me true price, I dey work well well, I dey talk am slow slow, make my voice clear for Chairman to hear am today.",
"[DRAFT - NEEDS VALIDATION] We go go market tomorrow morning, we go buy wetin we need, we go come back house for peace, I dey talk am slow slow, make you hear am well well.",
"[DRAFT - NEEDS VALIDATION] Tobou well well for your help today, you do good work, I thank you from my heart, I dey talk am slow slow, make e reach 12 seconds for this voice.",
"[DRAFT - NEEDS VALIDATION] My brother, where you dey go now? Abeg wait me small, make we go together, I dey talk am slow slow, make you hear am well well today.",
"[DRAFT - NEEDS VALIDATION] Today na good day well well, sun dey shine well, we dey happy, we dey work well, everything go go well for this recording work today.",
"[DRAFT - NEEDS VALIDATION] Abeg listen well well, I dey talk important thing now, no rush, talk am slow slow, make your voice reach 11 seconds for this work today.",
"[DRAFT - NEEDS VALIDATION] I dey come now, abeg wait me, I dey for road, I go reach soon, I dey talk am slow slow, make you hear am well well today.",
"[DRAFT - NEEDS VALIDATION] How much you go pay me for this work? Abeg talk true, I dey work well well everyday, I dey talk am slow slow, make e clear for you.",
"[DRAFT - NEEDS VALIDATION] We go chop together after this work, we go drink water, we go rest, we go happy, I dey talk am slow slow, make e reach 12 seconds.",
"[DRAFT - NEEDS VALIDATION] God bless you well well today, make your work go well, make your money plenty, make your house get peace, I dey talk am slow slow, make you hear am.",
"[DRAFT - NEEDS VALIDATION] Tobou, make we start work today, I want everything go well, I dey talk am slow slow, no rush, make e reach 11 seconds for this recording.",
];

function seededRandom(seed: number) {
  let s = seed;
  return () => {
    s = (s * 9301 + 49297) % 233280;
    return s / 233280;
  };
}
function hashString(str: string): number {
  let h = 2166136261;
  for (let i = 0; i < str.length; i++) {
    h ^= str.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return Math.abs(h);
}
function shuffleArray<T>(arr: T[], seedKey = "default"): T[] {
  const a = [...arr];
  const rand = seededRandom(hashString(seedKey) || 12345);
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(rand() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

function getLagosRecordingWindow(now = new Date()) {
  const offset = 60 * 60 * 1000;
  const lagosNow = new Date(now.getTime() + offset);
  let start = Date.UTC(lagosNow.getUTCFullYear(), lagosNow.getUTCMonth(), lagosNow.getUTCDate(), 17, 0, 0);
  if (lagosNow.getUTCHours() < 17) { start -= 24 * 60 * 60 * 1000; }
  const startUtc = start - offset;
  return { startMs: startUtc, startIso: new Date(startUtc).toISOString(), key: String(startUtc), nextResetMs: startUtc + 24 * 60 * 60 * 1000 };
}

export default function WorkersPage() {
  const router = useRouter();
  const [isRecording, setIsRecording] = useState(false);
  const [audioURL, setAudioURL] = useState<string | null>(null);
  const [timer, setTimer] = useState(0);
  const [selectedLang, setSelectedLang] = useState("Pidgin");
  const [showModal, setShowModal] = useState<string | null>(null);
  const [workerId, setWorkerId] = useState("WORKER");
  const [recordingDayKey, setRecordingDayKey] = useState(() => getLagosRecordingWindow().key);
  const [earnings, setEarnings] = useState({ approved: 0 });
  const [taskProgress, setTaskProgress] = useState({ total: 0, today: 0, approved: 0, pending: 0, rejected: 0 });
  const [currentSentenceIndex, setCurrentSentenceIndex] = useState(0);
  const [toast, setToast] = useState<string | null>(null);
  const [savedFiles, setSavedFiles] = useState<any[]>([]);
  const [savingRecording, setSavingRecording] = useState(false);
  const [announcements, setAnnouncements] = useState<any[]>([]);
  const [announcementLoading, setAnnouncementLoading] = useState(true);
  const [accountName, setAccountName] = useState("");
  const [bankName, setBankName] = useState("");
  const [accountNumber, setAccountNumber] = useState("");
  const [phoneNumber, setPhoneNumber] = useState("");
  const [noiseScore, setNoiseScore] = useState(0);
  const [noiseWarning, setNoiseWarning] = useState("");
  // NEW: Remote sentences from Supabase + Frozen sentence for recording
  const [remoteSentences, setRemoteSentences] = useState<string[] | null>(null);
  const [frozenSentence, setFrozenSentence] = useState<string | null>(null);
  const frozenSentenceRef = useRef<string | null>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const timerRef = useRef<any>(null);
  const stopTimeoutRef = useRef<any>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const TOTAL_RECORDING_TARGET = 500;
  const isTooShort = timer > 0 && timer < 11;
  const isPass = timer >= 11;
  const isPerfect = timer >= 12 && timer <= 13;
  const remainingToday = Math.max(0, DAILY_RECORDING_LIMIT - taskProgress.today);
  const remainingTotal = Math.max(0, TOTAL_RECORDING_TARGET - taskProgress.total);

  const allSentences: Record<string, string[]> = useMemo(() => {
    return {
      Pidgin: shuffleArray([...new Set(getTodayPidgin())].slice(0, 30), `Pidgin-${recordingDayKey}`),
      Hausa: shuffleArray(HAUSA_15, `Hausa-${recordingDayKey}`),
      Igbo: shuffleArray(IGBO_15, `Igbo-${recordingDayKey}`),
      Yoruba: shuffleArray(YORUBA_15, `Yoruba-${recordingDayKey}`),
      "Akwa Ibom": shuffleArray([...new Set(AKWAIBOM_500)], `AkwaIbom-${recordingDayKey}`),
      "Ijaw / Izon": shuffleArray(IJAW_15, `Ijaw-${recordingDayKey}`),
    };
  }, [recordingDayKey]);

  // SAFEGUARD 2: Remote sentences first, local fallback
  // If Chairman publishes new text in Supabase, workers get it automatically
  const sentences = useMemo(() => {
    if (remoteSentences && remoteSentences.length > 0) {
      return shuffleArray(remoteSentences, `Remote-${selectedLang}-${recordingDayKey}`);
    }
    return allSentences[selectedLang] || allSentences["Pidgin"];
  }, [remoteSentences, allSentences, selectedLang, recordingDayKey]);

  const isIjawDraft = selectedLang === "Ijaw / Izon";
  // SAFEGUARD 3: Display frozen sentence while recording / reviewing, so text never jumps mid-recording
  const displaySentence = (isRecording || audioURL) && frozenSentence ? frozenSentence : sentences[currentSentenceIndex];

  useEffect(() => {
    const wid = localStorage.getItem("gin_worker_id") || "WORKER";
    setWorkerId(wid);
    if (wid !== "WORKER") {
      loadWorkerData(wid);
      supabase.from("marketplace_visits").insert({ worker_id: wid, page: "workers", entered_at: new Date().toISOString() }).then(()=>{});
    }
    try { const raw = localStorage.getItem("gin_recordings"); const parsed = raw ? JSON.parse(raw) : []; setSavedFiles(Array.isArray(parsed) ? parsed : []); } catch { setSavedFiles([]); }
    try { const savedBank = localStorage.getItem("gin_bank_details"); if (savedBank) { const bank = JSON.parse(savedBank); setAccountName(bank.accountName || ""); setBankName(bank.bankName || ""); setAccountNumber(bank.accountNumber || ""); setPhoneNumber(bank.phoneNumber || ""); } } catch {}
  }, []);

  const loadWorkerData = async (wid: string) => {
    const { data: anns } = await supabase.from("announcements").select("id, title, message, type, created_at").eq("is_published", true).order("created_at", { ascending: false }).limit(5);
    if (anns) setAnnouncements(anns);
    setAnnouncementLoading(false);
    const window = getLagosRecordingWindow();
    const { data: recs, error } = await supabase.from("recordings").select("earnings, status, created_at").eq("worker_id", wid);
    if (error) { console.error("Worker recordings loading error:", error.message); return; }
    if (recs) {
      let allTimeEarnings = 0;
      let campaignApproved = 0;
      let campaignPending = 0;
      let campaignRejected = 0;
      let campaignToday = 0;
      recs.forEach((r: any) => {
        const createdMs = r.created_at ? new Date(r.created_at).getTime() : 0;
        const isNewCampaign = createdMs >= CAMPAIGN_START_MS;
        if (r.status === "approved") { allTimeEarnings += Number(r.earnings) || 0; }
        if (isNewCampaign) {
          if (r.status === "approved") campaignApproved += 1;
          else if (r.status === "rejected") campaignRejected += 1;
          else campaignPending += 1;
          if (createdMs >= window.startMs && createdMs < window.nextResetMs) { campaignToday += 1; }
        }
      });
      setEarnings({ approved: allTimeEarnings });
      setTaskProgress({ total: campaignApproved, today: campaignToday, approved: campaignApproved, pending: campaignPending, rejected: campaignRejected });
    } else {
      setEarnings({ approved: 0 });
      setTaskProgress({ total: 0, today: 0, approved: 0, pending: 0, rejected: 0 });
    }
  };

  useEffect(() => {
    if (workerId === "WORKER") return;
    const progressKey = `naija_progress:${workerId}:${selectedLang}:${recordingDayKey}`;
    try { const saved = localStorage.getItem(progressKey); if (saved) { const progress = JSON.parse(saved); const index = Number(progress.index) || 0; setCurrentSentenceIndex(Math.max(0, Math.min(index, Math.min(30, sentences.length)))); } else { setCurrentSentenceIndex(0); } } catch { setCurrentSentenceIndex(0); }
    setAudioURL(null); setTimer(0);
    // New sentence set / new day: clear frozen sentence
    setFrozenSentence(null); frozenSentenceRef.current = null;
  }, [workerId, selectedLang, recordingDayKey, sentences.length]);

  useEffect(() => {
    const checkRecordingDay = () => {
      const window = getLagosRecordingWindow();
      if (window.key !== recordingDayKey) {
        setRecordingDayKey(window.key); setCurrentSentenceIndex(0); setTaskProgress(prev => ({ ...prev, today: 0 }));
        if (mediaRecorderRef.current?.state === "recording") { mediaRecorderRef.current.onstop = null; mediaRecorderRef.current.stop(); }
        setIsRecording(false); setAudioURL(null); setTimer(0);
        setFrozenSentence(null); frozenSentenceRef.current = null;
        if (streamRef.current) { streamRef.current.getTracks().forEach(track => track.stop()); streamRef.current = null; }
        audioChunksRef.current = [];
        if (timerRef.current) { clearInterval(timerRef.current); }
        if (stopTimeoutRef.current) { clearTimeout(stopTimeoutRef.current); stopTimeoutRef.current = null; }
        if (workerId !== "WORKER") { loadWorkerData(workerId); }
        showToast("🌅 NEW RECORDING DAY! Your 30-recording allowance has reset.");
      }
    };
    const interval = setInterval(checkRecordingDay, 15000);
    return () => clearInterval(interval);
  }, [recordingDayKey, workerId]);

  // AUTOMATIC EARNINGS REFRESH — No logout needed
  useEffect(() => {
    if (workerId === "WORKER") return;
    const poll = setInterval(() => { loadWorkerData(workerId); }, 20000);
    const channel = supabase.channel(`worker-earnings-${workerId}`).on("postgres_changes", { event: "*", schema: "public", table: "recordings", filter: `worker_id=eq.${workerId}` }, () => { loadWorkerData(workerId); }).subscribe();
    const onVisible = () => { if (document.visibilityState === "visible") { loadWorkerData(workerId); } };
    document.addEventListener("visibilitychange", onVisible);
    return () => { clearInterval(poll); supabase.removeChannel(channel); document.removeEventListener("visibilitychange", onVisible); };
  }, [workerId]);

  // SAFEGUARD 2: AUTO-DISTRIBUTE NEW SENTENCES — Realtime + 60s polling backup
  // Chairman updates `sentences` table → workers get new text automatically, no redeploy
  // If Supabase fails, local fallback keeps work going. Old recordings never change.
  useEffect(() => {
    if (workerId === "WORKER") return;
    let cancelled = false;
    const loadSentences = async () => {
      const { data, error } = await supabase.from("sentences").select("text").eq("language", selectedLang.toLowerCase()).eq("is_active", true).order("sort_order", { ascending: true }).limit(30);
      if (!cancelled && !error && data && data.length > 0) {
        const texts = data.map((r: any) => String(r.text)).filter(Boolean);
        if (texts.length > 0) setRemoteSentences(texts);
      }
    };
    loadSentences();
    const channel = supabase.channel(`sentences-${selectedLang}`).on("postgres_changes", { event: "*", schema: "public", table: "sentences" }, () => { loadSentences(); }).subscribe();
    const poll = setInterval(loadSentences, 60000);
    return () => { cancelled = true; supabase.removeChannel(channel); clearInterval(poll); };
  }, [workerId, selectedLang]);

  useEffect(() => {
    let active = true;
    async function loadAnnouncements() {
      const { data, error } = await supabase.from("announcements").select("id, title, message, type, created_at").eq("is_published", true).order("created_at", { ascending: false });
      if (!active) return;
      if (error) console.error("Announcement loading error:", error.message);
      else setAnnouncements(data || []);
      setAnnouncementLoading(false);
    }
    loadAnnouncements();
    const channel = supabase.channel("worker-announcements").on("postgres_changes", { event: "*", schema: "public", table: "announcements" }, () => loadAnnouncements()).subscribe();
    return () => { active = false; supabase.removeChannel(channel); };
  }, []);

  const showToast = (msg: string) => { setToast(msg); setTimeout(() => setToast(null), 3000); };

  const handleLogout = async () => {
    const confirmed = window.confirm("Are you sure you want to logout?");
    if (!confirmed) return;
    try {
      if (mediaRecorderRef.current?.state === "recording") { mediaRecorderRef.current.onstop = null; mediaRecorderRef.current.stop(); }
      if (timerRef.current) { clearInterval(timerRef.current); timerRef.current = null; }
      if (stopTimeoutRef.current) { clearTimeout(stopTimeoutRef.current); stopTimeoutRef.current = null; }
      if (streamRef.current) { streamRef.current.getTracks().forEach((track) => track.stop()); streamRef.current = null; }
      await supabase.auth.signOut();
      localStorage.removeItem("gin_worker_id");
      localStorage.removeItem("worker_id");
      router.replace("/worker/login");
      router.refresh();
    } catch (error) {
      console.error("Worker logout error:", error);
      localStorage.removeItem("gin_worker_id");
      localStorage.removeItem("worker_id");
      router.replace("/worker/login");
      router.refresh();
    }
  };

  const saveBankDetails = () => {
    if (!accountName.trim()) return alert("Please enter your Account Name.");
    if (!bankName.trim()) return alert("Please select your Bank Name.");
    if (!accountNumber.trim()) return alert("Please enter your Account Number.");
    if (!phoneNumber.trim()) return alert("Please enter your Phone Number.");
    const bankDetails = { accountName: accountName.trim(), bankName: bankName.trim(), accountNumber: accountNumber.trim(), phoneNumber: phoneNumber.trim() };
    try { localStorage.setItem("gin_bank_details", JSON.stringify(bankDetails)); setShowModal(null); showToast("✅ Bank details saved successfully."); } catch { alert("Could not save bank details on this phone."); }
  };

  async function analyzeNoise(blob: Blob): Promise<{ status: string; reason: string; score: number }> {
    try {
      const audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
      const arrayBuffer = await blob.arrayBuffer();
      const audioBuffer = await audioCtx.decodeAudioData(arrayBuffer);
      const data = audioBuffer.getChannelData(0);
      let sum = 0; let silenceCount = 0; let loudCount = 0;
      for (let i = 0; i < data.length; i++) {
        const s = Math.abs(data[i]);
        sum += s * s;
        if (s < 0.005) silenceCount++;
        if (s > 0.9) loudCount++;
      }
      const rms = Math.sqrt(sum / data.length);
      const silenceRatio = silenceCount / data.length;
      const loudRatio = loudCount / data.length;
      await audioCtx.close();
      let score = 100;
      if (rms < 0.01) score -= 50;
      if (silenceRatio > 0.6) score -= 40;
      if (loudRatio > 0.05) score -= 30;
      if (rms > 0.3) score -= 20;
      if (score < 60) return { status: "NOISY", reason: "🔊 NOISY! Background noise too much! Go quiet room, close door, no music, no generator, record again!", score };
      if (score < 80) return { status: "WARNING", reason: "⚠️ Small noise dey! Try go more quiet place!", score };
      return { status: "CLEAN", reason: "✅ CLEAN - Good voice!", score };
    } catch { return { status: "CLEAN", reason: "Could not check noise", score: 100 }; }
  }

  const toggleRecording = async () => {
    if (selectedLang !== "Pidgin") { alert("Only Pidgin recording is currently available."); return; }
    if (isIjawDraft) { alert("Ijaw / Izon recording is temporarily unavailable. The sentences must first be checked and approved by a native Ijaw speaker."); return; }
    if (!isRecording) {
      if (taskProgress.today >= DAILY_RECORDING_LIMIT) { alert("You have completed your 30 recordings for today. Come back after 5:00 p.m. Lagos time."); return; }
      if (currentSentenceIndex >= dailySentenceCount) { alert("You have completed today's unique sentences in this language."); return; }
    }
    if (isRecording) { mediaRecorderRef.current?.stop(); setIsRecording(false); if (timerRef.current) clearInterval(timerRef.current); if (stopTimeoutRef.current) { clearTimeout(stopTimeoutRef.current); stopTimeoutRef.current = null; } return; }
    try {
      // SAFEGUARD 3: FREEZE sentence at recording start — even if Chairman changes sentences mid-recording, this recording keeps this exact text
      const sentenceToRecord = sentences[currentSentenceIndex];
      setFrozenSentence(sentenceToRecord);
      frozenSentenceRef.current = sentenceToRecord;
      const stream = await navigator.mediaDevices.getUserMedia({ audio: { echoCancellation: true, noiseSuppression: true, sampleRate: 48000 } });
      streamRef.current = stream;
      const mr = new MediaRecorder(stream, { mimeType: "audio/webm;codecs=opus" });
      mediaRecorderRef.current = mr; audioChunksRef.current = [];
      mr.ondataavailable = (e) => { if (e.data.size > 0) audioChunksRef.current.push(e.data); };
      mr.onstop = () => {
        if (timerRef.current) { clearInterval(timerRef.current); timerRef.current = null; }
        if (stopTimeoutRef.current) { clearTimeout(stopTimeoutRef.current); stopTimeoutRef.current = null; }
        const blob = new Blob(audioChunksRef.current, { type: "audio/webm" }); setAudioURL(URL.createObjectURL(blob)); stream.getTracks().forEach((t) => t.stop());
      };
      mr.start(); setIsRecording(true); setAudioURL(null); setTimer(0); setNoiseScore(0); setNoiseWarning("");
      timerRef.current = setInterval(() => setTimer((p: number) => p + 1), 1000);
      if (stopTimeoutRef.current) clearTimeout(stopTimeoutRef.current);
      stopTimeoutRef.current = setTimeout(() => {
        if (mediaRecorderRef.current && mediaRecorderRef.current.state === "recording") { mediaRecorderRef.current.stop(); setIsRecording(false); }
      }, 15000);
    } catch { alert("Abeg allow microphone!"); }
  };

  const formatTime = (s: number) => { const m = Math.floor(s / 60).toString().padStart(2, "0"); const sec = (s % 60).toString().padStart(2, "0"); return `${m}:${sec}`; };
  const reRecord = () => { if (isRecording) { mediaRecorderRef.current?.stop(); setIsRecording(false); } setAudioURL(null); setTimer(0); setNoiseScore(0); setNoiseWarning(""); setFrozenSentence(null); frozenSentenceRef.current = null; if (timerRef.current) clearInterval(timerRef.current); if (stopTimeoutRef.current) { clearTimeout(stopTimeoutRef.current); stopTimeoutRef.current = null; } };
  const dailySentenceCount = Math.min(DAILY_RECORDING_LIMIT, sentences.length);

  const saveAndNext = async () => {
    if (selectedLang !== "Pidgin") { alert("Only Pidgin recordings can be submitted right now."); return; }
    if (isIjawDraft) { alert("Ijaw / Izon recordings cannot be submitted until native-speaker validation is complete."); return; }
    if (timer < 11) { alert(`❌ FAIL! Your voice na ${timer} seconds only! E too short! E no go work! Abeg do am again, make e reach 11 or 12 seconds.`); return; }
    if (taskProgress.today >= DAILY_RECORDING_LIMIT) { return alert("You have completed your 30 recordings for today. Your next recording day starts at 5:00 p.m. Lagos time."); }
    if (currentSentenceIndex >= dailySentenceCount) { return alert("You have completed all the unique sentences available in this language for today. You can choose another language or continue after the next 5:00 p.m. reset."); }
    if (!audioURL) return alert("🎤 Record first!");
    if (savingRecording) return;
    const wid = localStorage.getItem("gin_worker_id");
    if (!wid) return alert("Worker account not found. Please logout and login again.");
    setSavingRecording(true);
    try {
      const blob = await fetch(audioURL).then((r) => r.blob());
      showToast("🔍 Checking for background noise...");
      const noiseResult = await analyzeNoise(blob);
      setNoiseScore(noiseResult.score);
      if (noiseResult.status === "NOISY") {
        setSavingRecording(false);
        setNoiseWarning(noiseResult.reason);
        alert(`❌ REJECTED - NOISY!\n\n${noiseResult.reason}\n\nScore: ${noiseResult.score}/100 (Need 60+)\n\nAbeg go quiet room, close door, off music / generator, record again!`);
        return;
      }
      if (noiseResult.status === "WARNING") {
        const goAhead = confirm(`⚠️ ${noiseResult.reason}\n\nScore: ${noiseResult.score}/100\n\nYou want submit am still, or you want record again for cleaner voice?`);
        if (!goAhead) { setSavingRecording(false); return; }
      }
      const safeLang = selectedLang.replace(/\s/g, "");
      const fileName = `GIN-${safeLang}-${Date.now()}.webm`;
      const storagePath = `${wid}/${fileName}`;
      const { error: uploadError } = await supabase.storage.from("voice-clips").upload(storagePath, blob, { contentType: "audio/webm", upsert: false });
      if (uploadError) throw new Error("Audio upload failed: " + uploadError.message);
      const { data: publicData } = supabase.storage.from("voice-clips").getPublicUrl(storagePath);
      const audioUrl = publicData?.publicUrl || "";
      if (!audioUrl) throw new Error("Could not create recording audio URL.");
      // SAFEGUARD 1 + 3: Save EXACT frozen sentence from recording start — never fetch latest sentence here
      // Chairman Panel must display this saved `text`, not the current `sentences` table
      const recordingText = frozenSentenceRef.current || frozenSentence || sentences[currentSentenceIndex];
      const { data: recordingRow, error: insertError } = await supabase.from("recordings").insert({ worker_id: wid, language: selectedLang.toLowerCase(), text: recordingText, audio_url: audioUrl, file_name: fileName, duration: timer, earnings: APPROVED_SENTENCE_RATE, status: "pending", is_approved: false }).select().single();
      if (insertError) { try { await supabase.storage.from("voice-clips").remove([storagePath]); } catch {} throw new Error("Recording could not be submitted: " + insertError.message); }
      const data = { id: recordingRow?.id || Date.now(), worker_id: wid, lang: selectedLang, sentence: recordingText, fileName, audio_url: audioUrl, storage_path: storagePath, time: new Date().toISOString(), earnings: APPROVED_SENTENCE_RATE, status: "pending", approved: false };
      let old: any[] = [];
      try { const raw = localStorage.getItem("gin_recordings"); const parsed = raw ? JSON.parse(raw) : []; old = Array.isArray(parsed) ? parsed : []; } catch { old = []; }
      old.unshift(data);
      const updated = old.slice(0, 100);
      try { localStorage.setItem("gin_recordings", JSON.stringify(updated)); setSavedFiles(updated); } catch {}
      const newEarnings = earnings;
      const submittedAt = Date.now();
      const isNewCampaignSubmission = submittedAt >= CAMPAIGN_START_MS;
      const newProgress = isNewCampaignSubmission ? { ...taskProgress, today: taskProgress.today + 1, pending: taskProgress.pending + 1 } : { ...taskProgress };
      const nextIndex = currentSentenceIndex + 1;
      setEarnings(newEarnings); setTaskProgress(newProgress); setCurrentSentenceIndex(nextIndex);
      const progressKey = `naija_progress:${wid}:${selectedLang}:${recordingDayKey}`;
      localStorage.setItem(progressKey, JSON.stringify({ index: nextIndex, dayKey: recordingDayKey }));
      setAudioURL(null); setTimer(0); setNoiseScore(0); setNoiseWarning("");
      setFrozenSentence(null); frozenSentenceRef.current = null;
      showToast(`✅ SUBMITTED TO CHAIRMAN • ${fileName} • Awaiting Approval`);
    } catch (error) { alert(error instanceof Error ? error.message : "Recording submission failed. Please try again."); }
    finally { setSavingRecording(false); }
  };

  useEffect(() => { return () => { if (timerRef.current) clearInterval(timerRef.current); if (stopTimeoutRef.current) clearTimeout(stopTimeoutRef.current); streamRef.current?.getTracks().forEach((t: MediaStreamTrack) => t.stop()); }; }, []);

  return (
    <div style={{ background: "#060A06", minHeight: "100vh", color: "white", fontFamily: "system-ui" }}>
      {toast && <div style={{ position: "fixed", top: "20px", left: "50%", transform: "translateX(-50%)", background: "#00E676", color: "black", padding: "10px 18px", borderRadius: "20px", fontSize: "12px", fontWeight: "900", zIndex: 1000 }}>{toast}</div>}
      <div style={{ maxWidth: "390px", margin: "0 auto", padding: "10px", paddingBottom: "90px" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: "10px", marginBottom: "10px" }}>
          <div style={{ minWidth: 0 }}>
            <h1 style={{ fontSize: "18px", fontWeight: "900", margin: 0 }}>Worker Dashboard 🇳🇬</h1>
            <div style={{ fontSize: "11px", color: "#aaa", marginTop: "3px" }}>{workerId} ● {taskProgress.approved} approved • {taskProgress.pending} waiting • {taskProgress.rejected} rejected</div>
            <div style={{ fontSize: "10px", color: "#888", marginTop: "2px" }}>New Campaign: From 21 Nov 2026, 5:00 PM Lagos</div>
          </div>
          <button type="button" onClick={handleLogout} style={{ flexShrink: 0, background: "#2A0A0A", color: "#FF6B6B", border: "1px solid #7F1D1D", borderRadius: "10px", padding: "9px 11px", fontSize: "11px", fontWeight: "900", cursor: "pointer" }}>🚪 LOGOUT</button>
        </div>
        <div style={{ background: "#111A11", border: "1px solid #EAB308", borderRadius: "12px", padding: "12px", marginTop: "12px" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <strong style={{ color: "#FACC15", fontSize: "14px" }}>📢 CHAIRMAN ANNOUNCEMENTS</strong>
            {announcements.length > 0 && <span style={{ background: "#EAB308", color: "black", padding: "3px 8px", borderRadius: "20px", fontSize: "10px", fontWeight: "900" }}>{announcements.length} MESSAGES</span>}
          </div>
          {announcementLoading ? <p style={{ color: "#aaa", fontSize: "12px" }}>Loading announcements...</p>
          : announcements.length === 0 ? <p style={{ color: "#888", fontSize: "12px" }}>No announcements yet. Check again later.</p>
          : announcements.map((a) => (
            <div key={a.id} style={{ background: "#080E08", border: "1px solid #263526", borderRadius: "10px", padding: "10px", marginTop: "10px" }}>
              <div style={{ color: a.type === "urgent" ? "#ff5252" : "#FACC15", fontSize: "10px", fontWeight: "900" }}>📢 {String(a.type || "GENERAL").toUpperCase()}</div>
              <div style={{ fontWeight: "900", fontSize: "14px", marginTop: "5px" }}>{a.title}</div>
              <p style={{ color: "#ccc", fontSize: "12px", lineHeight: 1.6, whiteSpace: "pre-wrap" }}>{a.message}</p>
              <div style={{ color: "#777", fontSize: "10px" }}>{new Date(a.created_at).toLocaleString()}</div>
            </div>
          ))}
        </div>
        <div style={{ background: "#111A11", border: "1px solid #00E676", borderRadius: "12px", padding: "16px", marginTop: "12px", textAlign: "center" }}>
          <div style={{ fontSize: "11px", color: "#aaa", fontWeight: "900" }}>💰 APPROVED EARNINGS — ALL TIME</div>
          <div style={{ color: "#00E676", fontWeight: "900", fontSize: "28px", marginTop: "8px" }}>₦{earnings.approved.toLocaleString("en-NG")}</div>
          <div style={{ fontSize: "10px", color: "#aaa", marginTop: "6px" }}>Old + New approved recordings count for earnings. Only Chairman-approved count.</div>
          <div style={{ fontSize: "11px", color: "#ccc", marginTop: "8px" }}>✅ New Campaign Approved: {taskProgress.approved} • ⏳ Waiting: {taskProgress.pending} • ❌ Rejected: {taskProgress.rejected}</div>
        </div>
        <div style={{ background: "#111A11", border: "1px solid #1E2F1E", borderRadius: "12px", padding: "12px", marginTop: "10px" }}>
          <div style={{ display: "flex", justifyContent: "space-between", fontSize: "11px" }}><span style={{ color: "#aaa" }}>TASK PROGRESS — NEW CAMPAIGN</span><strong style={{ color: "#00E676" }}>{taskProgress.today} today</strong></div>
          <div style={{ height: "7px", background: "#1A251A", borderRadius: "10px", overflow: "hidden", marginTop: "8px" }}><div style={{ width: `${Math.min((taskProgress.today / 30) * 100, 100)}%`, height: "100%", background: "#00E676", borderRadius: "10px" }} /></div>
          <div style={{ marginTop: "6px", fontSize: "10px", color: "#777" }}>{taskProgress.total} total approved in new campaign</div>
        </div>
        <div style={{ background: "#111A11", border: "1px solid #00E676", borderRadius: "12px", padding: "12px", marginTop: "10px" }}>
          <h3 style={{ margin: 0, fontSize: "13px", fontWeight: "900", color: "#00E676" }}>🎯 NEW CAMPAIGN TARGET</h3>
          <p style={{ margin: "8px 0 0", fontSize: "16px", fontWeight: "900" }}>{taskProgress.total} / {TOTAL_RECORDING_TARGET} Voices</p>
          <p style={{ margin: "4px 0 0", fontSize: "12px", color: "#aaa" }}>{remainingTotal} Voices Remaining</p>
          <p style={{ margin: "4px 0 0", fontSize: "12px", color: "#ccc" }}>Today&apos;s recordings: {taskProgress.today} / {DAILY_RECORDING_LIMIT} — {remainingToday} remaining today</p>
          <div style={{ height: "7px", background: "#1A251A", borderRadius: "10px", overflow: "hidden", marginTop: "8px" }}><div style={{ width: `${Math.min((taskProgress.total / TOTAL_RECORDING_TARGET) * 100, 100)}%`, height: "100%", background: "#00E676", borderRadius: "10px" }} /></div>
        </div>
        <a href="/worker/announcements" style={{ display: "block", width: "100%", marginTop: "12px", padding: "15px", borderRadius: "12px", border: "1px solid #00E676", background: "#102010", color: "#00E676", fontWeight: "900", fontSize: "13px", textAlign: "center", textDecoration: "none", boxSizing: "border-box" }}>📢 ANNOUNCEMENT BOARD</a>
        <button type="button" onClick={() => setShowModal("bank")} style={{ width: "100%", marginTop: "12px", padding: "15px", borderRadius: "12px", border: "1px solid #EAB308", background: "linear-gradient(135deg, #3a2d00, #191500)", color: "#FACC15", fontWeight: "900", fontSize: "13px", cursor: "pointer" }}>💳 PAYMENT / BANK DETAILS</button>
        <div style={{ display: "flex", gap: "6px", marginTop: "12px", flexWrap: "wrap" }}>
          {["Pidgin", "Hausa", "Igbo", "Yoruba", "Akwa Ibom", "Ijaw / Izon"].map((lang) => {
            const isPidgin = lang === "Pidgin";
            return (
              <button key={lang} type="button" disabled={!isPidgin} onClick={() => { if (isRecording || audioURL || savingRecording) { alert("Please finish or discard your current recording first."); return; } setSelectedLang("Pidgin"); }} style={{ flex: lang === "Akwa Ibom" || lang === "Ijaw / Izon" ? "1 1 48%" : "1", padding: "10px 0", borderRadius: "20px", fontSize: "11px", fontWeight: "900", border: isPidgin ? "1.5px solid #00E676" : "1px solid #444", background: isPidgin ? "#00E676" : "#171717", color: isPidgin ? "black" : "#777", cursor: isPidgin ? "pointer" : "not-allowed", opacity: isPidgin ? 1 : 0.65 }}>
                {lang === "Pidgin" ? "🇳🇬 PIDGIN ✓" : `${lang === "Akwa Ibom" ? "🌴 Akwa Ibom" : lang === "Ijaw / Izon" ? "🌊 Ijaw / Izon" : lang} 🔒`}
                {!isPidgin && (<span style={{ display: "block", fontSize: "8px", color: "#EAB308", marginTop: "3px" }}>COMING SOON</span>)}
              </button>
            );
          })}
        </div>
        {isIjawDraft && (
          <div style={{ background: "#2A1A00", border: "1px solid #FFA500", borderRadius: "10px", padding: "14px", marginTop: "10px", fontSize: "12px", color: "#FFD580", lineHeight: 1.7, fontWeight: "700" }}>
            🌊 IJAW / IZON — VALIDATION IN PROGRESS<br /><br />Recording is temporarily disabled because the current sentences are AI-generated drafts and have not been verified by native Ijaw / Izon speakers.<br /><br />We want genuine Ijaw voices and correct native-language sentences in our Nigerian voice dataset.<br /><br />Native Ijaw speakers can contact the Chairman to help validate the sentences.
          </div>
        )}
        <a href="/worker/dataset" style={{ display: "block", width: "100%", boxSizing: "border-box", padding: "16px", marginTop: "16px", background: "#064e3b", color: "#ffffff", border: "1px solid #00E676", borderRadius: "12px", textAlign: "center", fontWeight: "900", fontSize: "13px", textDecoration: "none" }}>🎙️ JOIN NIGERIAN VOICE DATASET →</a>
        <div style={{ background: "#2A1A00", border: "1px solid #EAB308", borderRadius: "12px", padding: "12px", marginTop: "12px", fontSize: "12px", lineHeight: 1.6, color: "#FFD580" }}>
          ⚠️ <strong>READ FIRST, JOKE AFTER</strong><br />
          Read sentence exactly as e dey for first 11 seconds. No laugh, no sing, no shout inside sentence. After you don read am finish, you fit add small joke. If you laugh inside sentence, Chairman go REJECT am.
        </div>
        <div style={{ background: "#111A11", border: "1px solid #1E2F1E", borderRadius: "16px", padding: "14px", marginTop: "12px" }}>
          <div style={{ fontSize: "11px", fontWeight: "800", marginBottom: "10px" }}>🎙️ {selectedLang} — {Math.min(currentSentenceIndex + 1, dailySentenceCount)}/{dailySentenceCount}</div>
          <div style={{ textAlign: "center", minHeight: "48px", display: "flex", alignItems: "center", justifyContent: "center", marginBottom: "14px" }}><p style={{ fontSize: "18px", fontWeight: "900", margin: 0 }}>
            {isIjawDraft ? "Ijaw / Izon sentences are awaiting native-speaker validation." : taskProgress.today >= DAILY_RECORDING_LIMIT ? "You have completed your 30 recordings for today. Come back at 5:00 p.m. for the next recording day." : currentSentenceIndex >= Math.min(30, sentences.length) ? "You have completed all unique sentences available in this language today." : displaySentence}
          </p></div>
          <div style={{ display: "flex", justifyContent: "center", marginBottom: "8px" }}>
            <button onClick={toggleRecording} disabled={isIjawDraft} style={{ width: "70px", height: "70px", borderRadius: "50%", background: isRecording ? "#CC0000" : isIjawDraft ? "#333" : "#E53935", border: "4px solid #7f1d1d", opacity: isIjawDraft ? 0.5 : 1, cursor: isIjawDraft ? "not-allowed" : "pointer" }}>{isRecording ? <div style={{ width: "22px", height: "22px", background: "white", borderRadius: "3px", margin: "auto" }} /> : <div style={{ width: "26px", height: "26px", background: "#7f1d1d", borderRadius: "50%", margin: "auto" }} />}</button>
          </div>
          <div style={{ textAlign: "center", fontSize: "12px", fontWeight: "900", fontFamily: "monospace", color: timer >= 11 ? "#00E676" : "#ff5252", background: timer >= 11 ? "#0A2A0A" : timer > 0 ? "#2A0A0A" : "transparent", padding: "6px", borderRadius: "8px" }}>
            {timer < 11 && timer > 0 ? `❌ REC ${formatTime(timer)} / 00:15 - RED - FAIL` : timer >= 11 ? `✅ REC ${formatTime(timer)} / 00:15 - GREEN - PASS` : `REC ${formatTime(timer)} / 00:15`}
          </div>
          {audioURL && <audio controls src={audioURL} style={{ width: "100%", margin: "12px 0", height: "36px" }} />}
          {audioURL && noiseScore > 0 && (<div style={{ textAlign: "center", padding: "8px", borderRadius: "8px", marginTop: "6px", background: noiseScore >= 80 ? "#0A2A0A" : noiseScore >= 60 ? "#2A1A00" : "#2A0A0A", color: noiseScore >= 80 ? "#00E676" : noiseScore >= 60 ? "#FFA500" : "#FF5252", fontSize: "12px", fontWeight: "900" }}>{noiseScore >= 80 ? `✅ CLEAN - Noise Score: ${noiseScore}/100 - Good!` : noiseScore >= 60 ? `⚠️ SMALL NOISE - Score: ${noiseScore}/100 - Go more quiet!` : `🔊 NOISY - Score: ${noiseScore}/100 - Go quiet room!`}</div>)}
          {noiseWarning && (<div style={{ background: "#FF0000", color: "white", padding: "8px", borderRadius: "8px", fontSize: "12px", fontWeight: "900", textAlign: "center", marginTop: "6px" }}>{noiseWarning}</div>)}
          <div style={{ background: "#111A11", border: "1px solid #EAB308", borderRadius: "8px", padding: "8px", marginTop: "8px", fontSize: "11px", color: "#FACC15", textAlign: "center" }}>🤫 QUIET RULE: No record for road / market / where generator dey! Go inside room, close door, no music!</div>
          <div style={{ display: "flex", gap: "8px", marginTop: "10px" }}>
            <button onClick={reRecord} style={{ flex: 1, background: "#1E2F1E", color: "#ccc", padding: "14px", borderRadius: "12px", border: "1px solid #2A4A2A" }}>↻ Re-record</button>
            <div style={{ flex: 1.6 }}>
              {audioURL && isTooShort && (<div style={{ background: "#FF0000", color: "white", padding: "8px", borderRadius: "10px", fontSize: "12px", fontWeight: "900", textAlign: "center", marginBottom: "6px" }}>❌ FAIL! {timer}s - RED - Too short! Must reach 11!</div>)}
              {audioURL && isPass && (<div style={{ background: "#00E676", color: "black", padding: "8px", borderRadius: "10px", fontSize: "12px", fontWeight: "900", textAlign: "center", marginBottom: "6px" }}>{isPerfect ? `⭐ PERFECT! ${timer}s - GREEN - You don pass!` : `✅ PASS! ${timer}s - GREEN - You don pass!`}</div>)}
              <button onClick={() => { if (timer < 11) { alert(`❌ FAIL! Your voice na ${timer} seconds only! E too short! E no go work! Abeg do am again, make e reach 11 or 12 seconds.`); return; } saveAndNext(); }} disabled={isIjawDraft || !audioURL || savingRecording || timer < 11 || taskProgress.today >= DAILY_RECORDING_LIMIT || currentSentenceIndex >= Math.min(30, sentences.length)} style={{ width: "100%", background: savingRecording ? "#1A3A1A" : !audioURL ? "#1A3A1A" : timer < 11 ? "#FF0000" : timer >= 11 ? "#00E676" : "#1A3A1A", color: timer < 11 && audioURL ? "white" : audioURL && !savingRecording ? "black" : "#666", padding: "14px", borderRadius: "12px", border: timer < 11 && audioURL ? "2px solid #FF0000" : "none", fontWeight: "900", cursor: timer < 11 ? "not-allowed" : "pointer" }}>
                {savingRecording ? "⏳ SUBMITTING..." : !audioURL ? "Save & Next →" : timer < 11 ? `🔒 LOCKED - ${timer}s ❌ FAIL - Must reach 11` : isPerfect ? `💾 SUBMIT TO CHAIRMAN → ⭐ ${timer}s PERFECT!` : `💾 SUBMIT TO CHAIRMAN → ✅ ${timer}s PASS!`}
              </button>
              {audioURL && (<div style={{ display: "flex", gap: "4px", marginTop: "6px", justifyContent: "center" }}><span style={{ background: timer === 9 || timer === 10 ? "#FF0000" : "#333", color: "white", padding: "3px 6px", borderRadius: "6px", fontSize: "10px", fontWeight: "900" }}>9 ❌ RED</span><span style={{ background: timer === 10 ? "#FF0000" : "#333", color: "white", padding: "3px 6px", borderRadius: "6px", fontSize: "10px", fontWeight: "900" }}>10 ❌ RED</span><span style={{ background: timer === 11 ? "#00E676" : "#333", color: timer === 11 ? "black" : "white", padding: "3px 6px", borderRadius: "6px", fontSize: "10px", fontWeight: "900" }}>11 ✅ GREEN</span><span style={{ background: isPerfect ? "#00E676" : "#333", color: isPerfect ? "black" : "white", padding: "3px 6px", borderRadius: "6px", fontSize: "10px", fontWeight: "900" }}>12 ⭐ GREEN</span></div>)}
            </div>
          </div>
        </div>
        {savedFiles.length > 0 && (<div style={{ marginTop: "12px", background: "#0A150A", border: "1px solid #00E67640", borderRadius: "12px", padding: "10px" }}><div style={{ fontSize: "11px", fontWeight: "800", color: "#00E676" }}>📁 {savedFiles.length} Files Saved to Supabase</div>{savedFiles.slice(0, 3).map((f: any) => (<div key={f.id} style={{ fontSize: "10px", color: "#aaa", marginTop: "4px" }}>• {f.fileName || "Recording"} — {typeof f.sentence === "string" ? f.sentence.slice(0, 20) : "Saved audio"}...</div>))}</div>)}
      </div>
      {showModal === "bank" && (
        <div onClick={() => setShowModal(null)} style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.78)", display: "flex", alignItems: "center", justifyContent: "center", padding: "18px", zIndex: 2000 }}>
          <div onClick={(e) => e.stopPropagation()} style={{ width: "100%", maxWidth: "390px", maxHeight: "90vh", overflowY: "auto", background: "#0D130D", border: "1px solid #EAB308", borderRadius: "20px", padding: "20px", boxSizing: "border-box" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "18px" }}><div><h2 style={{ margin: 0, fontSize: "20px", fontWeight: "900", color: "#FACC15" }}>💳 Payment Details</h2><p style={{ margin: "5px 0 0", fontSize: "11px", color: "#888" }}>Add your bank details for payment.</p></div><button type="button" onClick={() => setShowModal(null)} style={{ width: "36px", height: "36px", borderRadius: "50%", border: "1px solid #333", background: "#171D17", color: "white", fontSize: "20px", cursor: "pointer" }}>×</button></div>
            <label style={{ display: "block", fontSize: "12px", color: "#ccc", fontWeight: "800", marginBottom: "7px" }}>ACCOUNT NAME</label><input value={accountName} onChange={(e) => setAccountName(e.target.value)} placeholder="Enter account name" style={{ width: "100%", boxSizing: "border-box", padding: "14px", borderRadius: "12px", border: "1px solid #374137", background: "#070A07", color: "white", outline: "none", marginBottom: "15px", fontSize: "14px" }} />
            <label style={{ display: "block", fontSize: "12px", color: "#ccc", fontWeight: "800", marginBottom: "7px" }}>BANK NAME</label><select value={bankName} onChange={(e) => setBankName(e.target.value)} style={{ width: "100%", boxSizing: "border-box", padding: "14px", borderRadius: "12px", border: "1px solid #374137", background: "#070A07", color: "white", outline: "none", marginBottom: "15px", fontSize: "14px" }}><option value="">Select your bank</option><option value="Opay">Opay</option><option value="Moniepoint">Moniepoint</option><option value="PalmPay">PalmPay</option><option value="Kuda">Kuda</option><option value="First Bank">First Bank</option><option value="GTBank">GTBank</option><option value="UBA">UBA</option><option value="Zenith Bank">Zenith Bank</option></select>
            <label style={{ display: "block", fontSize: "12px", color: "#ccc", fontWeight: "800", marginBottom: "7px" }}>ACCOUNT NUMBER</label><input value={accountNumber} onChange={(e) => setAccountNumber(e.target.value.replace(/\D/g, "").slice(0, 10))} inputMode="numeric" placeholder="Enter 10-digit account number" style={{ width: "100%", boxSizing: "border-box", padding: "14px", borderRadius: "12px", border: "1px solid #374137", background: "#070A07", color: "white", outline: "none", marginBottom: "15px", fontSize: "14px" }} />
            <label style={{ display: "block", fontSize: "12px", color: "#ccc", fontWeight: "800", marginBottom: "7px" }}>PHONE NUMBER</label><input value={phoneNumber} onChange={(e) => setPhoneNumber(e.target.value.replace(/\D/g, "").slice(0, 11))} inputMode="tel" placeholder="Enter phone number" style={{ width: "100%", boxSizing: "border-box", padding: "14px", borderRadius: "12px", border: "1px solid #374137", background: "#070A07", color: "white", outline: "none", marginBottom: "20px", fontSize: "14px" }} />
            <button type="button" onClick={saveBankDetails} style={{ width: "100%", padding: "15px", borderRadius: "12px", border: "none", background: "#00E676", color: "black", fontWeight: "900", fontSize: "14px", cursor: "pointer" }}>💾 SAVE BANK DETAILS</button>
            <button type="button" onClick={() => setShowModal(null)} style={{ width: "100%", padding: "12px", marginTop: "8px", borderRadius: "12px", border: "1px solid #333", background: "transparent", color: "#aaa", fontWeight: "700", fontSize: "13px" }}>Cancel</button>
            <div style={{ marginTop: "15px", padding: "10px", borderRadius: "10px", background: "#171D17", color: "#777", fontSize: "10px", textAlign: "center", lineHeight: 1.5 }}>Your bank information is used for worker payment processing.</div>
          </div>
        </div>
      )}
    </div>
  );
}