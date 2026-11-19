export function getTodayPidgin() {
  return [
    "Chii! I wake up early this morning to go lecture oh, because my lecturer dey start by 8am and e no dey allow late comers to enter class at all.",
    "Nawa oh! I go write JAMB this year, I dey read my book every day because I wan enter university to study my course, I don try tire.",
    "Hey! I enter lecture hall today, plenty students full everywhere oh, I no see where to sit down, so I stand for back to listen to lecturer.",
    "Oh my God! I dey read for library till night, because my room for hostel too noisy and I no fit concentrate to read my book well.",
    "Eh! My lecturer teach us today, e explain the topic well well, but some students dey sleep for back because the class long die.",
    "Abeg oh! I buy handout for school today, the lecturer say if we no buy am, we no go understand wetin e go set for exam, nawa oh.",
    "Ooh! I dey read with my friends for night class, we dey explain to each other, because group reading dey help me understand well well.",
    "Hey ya! Exam don near for school, everybody dey read serious now, even people wey no dey read before don start to read, e be like magic.",
    "Ah! E pain me well well, I carry over one course last semester, but I go read hard to pass am this time, I no go give up.",
    "Oh chai! I go school with small money today, I buy garri and groundnut to chop, because sapa hold me for hostel, nawa oh.",
    "Stop now! E don too much! My roommate for hostel dey make noise every night, I no fit sleep well, I dey tell am make e reduce am.",
    "Ha ha ha! For graduation day, my mama cry for joy oh, because after many years for school, I don finally graduate from university, thank God!",
    "Leave me alone! Some people dey laugh me for school because of my English, but I no mind them, I dey focus on my studies to pass.",
    "Jesus! My lecturer tell some boys for class say if them no sort am, them go fail, and the boys dey fear to talk am out, nawa.",
    "Chi! Some lecturer dey disturb small girls for school, dey tell them say if them no follow them, them go fail their course, e bad well well.",
    "Ooh! I dey write my final year project, e hard me well well, my supervisor dey tell me make I correct am again and again, I don tire.",
    "Hey, e be like say rain go fall today, I go class, rain fall, I reach school late, my clothes wet, but I still enter class to learn.",
    "Hi! I dey stay for hostel with four people, we dey share one room, sometimes we dey quarrel, sometimes we dey laugh together, na life be that.",
    "Abeg oh! I no get money to buy textbook, so I dey borrow from my friend to read, and I go return am before exam, e help me.",
    "Oh! My senior for school dey advise me, e tell me say make I read my book and no follow bad friends for school, e talk true.",
    "Mmm! I buy food for mama put for school, the food sweet well well, and I chop am with my friends for front of hostel, we enjoy am.",
    "Hey! I dey form for school because I wan impress people, but inside my pocket I no get money to even buy water, nawa oh.",
    "Chii! My lecturer come class late today, we wait am for two hours, when e come, e teach us small and go again, e pain me.",
    "Ah! I fail one exam, I dey sad, but my friend tell me say make I no give up, make I try again next time, e ginger me.",
    "Ha ha ha! For school, some people dey do fashion, dem dey wear fine clothes every day, but their result no fine like their clothes at all.",
    "Oh! I dey read for exam, my phone dey disturb me, I off am make I fit focus and finish my reading, I need to pass.",
    "Ooh! My mama call me for phone today, e ask me if I don chop, I tell am say I don chop, but I never chop since morning, na lie.",
    "Hey ya! I see my friend graduate today, I happy for am well well, because e suffer for school to reach that level, e try.",
    "Oh my God! I wan enter university, I dey pray every day make JAMB give me admission, because I don try three times now, I no go give up.",
    "Nawa oh! As I dey talk to you so, I dey for my hostel dey read my book, because tomorrow na exam and I wan pass well well."
  ];
}

// Upgraded: Ready for 500 - this na the base set, we go add more sets on top
export const PIDGIN_500 = getTodayPidgin();

// New helper - pick one random sentence for worker to record
export function getRandomPidgin() {
  const all = getTodayPidgin();
  return all[Math.floor(Math.random() * all.length)];
}

// New helper - check if sentence long enough for 10 seconds (25+ words)
export function isLongEnough(sentence) {
  return sentence.split(" ").length >= 25;
}