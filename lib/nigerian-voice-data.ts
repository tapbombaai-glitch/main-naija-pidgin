// lib/nigerian-voice-data.ts

/**
 * MAIN NAIJA PIDGIN
 * NIGERIAN VOICE DATASET
 *
 * Recording language: Natural Nigerian English
 * Paragraph target: 120–150 words
 * Minimum recording duration: 60 seconds
 * Reward: ₦30 per approved recording
 *
 * IMPORTANT:
 * Actual recording duration must be checked by the Worker Page.
 * Word count alone does not prove that a recording is 60 seconds.
 */

export type NigerianVoiceParagraph = {
  id: number;
  text: string;
  category: string;
  estimatedSeconds: number;
};

export const NIGERIAN_VOICE_REWARD = 30;

export const NIGERIAN_VOICE_MIN_DURATION = 60;

export const NIGERIAN_VOICE_MIN_WORDS = 120;

export const NIGERIAN_VOICE_MAX_WORDS = 150;

/**
 * Ten starter paragraphs.
 * Each paragraph is designed for natural Nigerian English reading.
 */

export const NIGERIAN_VOICE_PARAGRAPHS: NigerianVoiceParagraph[] = [
  {
    id: 1,
    category: "Daily Life",
    estimatedSeconds: 60,
    text: `Good morning, my name is Chidi and I live in Port Harcourt. Yesterday, I went to the market to buy yam, pepper, tomatoes and some other food items for my mother. The market was very busy because many people came to buy things for the weekend. I met my friend Emeka near the vegetable section, and we talked about our work and plans for the coming month. After buying everything, I entered a commercial bus and returned home. When I arrived, my mother was happy because she had been waiting for the ingredients to prepare lunch. I helped her arrange the food in the kitchen before taking a short rest. Later in the evening, we prepared a delicious meal and discussed how our day had gone.`,
  },
  {
    id: 2,
    category: "Family",
    estimatedSeconds: 60,
    text: `Every Sunday, my family tries to spend time together because everyone has a busy schedule during the week. My father usually wakes up early, washes his car and listens to the radio while drinking a cup of tea. My mother prepares breakfast, and my younger sister helps arrange the dining table. After eating, we sometimes visit our relatives or attend a family gathering in the neighbourhood. These visits give us an opportunity to ask about one another and share important news. Last Sunday, my uncle visited with his children, and everybody was excited to see them. We talked, laughed and took several pictures together. Before they left, my mother prepared some food for them to take home. Moments like these remind me that family support is very important.`,
  },
  {
    id: 3,
    category: "Transportation",
    estimatedSeconds: 60,
    text: `Travelling around a busy Nigerian city requires patience and good planning. On Monday morning, I left my house earlier than usual because I had an important appointment in the city centre. Unfortunately, the road was already crowded when I reached the bus stop. Several buses arrived, but most of them were completely full. I eventually found a driver who was going in my direction and entered the vehicle with other passengers. Along the journey, we experienced heavy traffic near a major junction because road construction had reduced the available space. Some passengers became impatient, while others quietly checked their phones. I finally reached my destination with enough time to prepare for my appointment. Since that experience, I always try to leave home early whenever I have something important to do.`,
  },
  {
    id: 4,
    category: "Education",
    estimatedSeconds: 60,
    text: `Education has opened many opportunities for young people across Nigeria. When I was in secondary school, my teachers encouraged us to read regularly and develop useful skills outside the classroom. Mathematics was sometimes difficult for me, but my teacher patiently explained every topic until I understood it. I also enjoyed English lessons because they helped me communicate more confidently with other people. During examination periods, my classmates and I usually studied together after school. We shared textbooks, discussed difficult questions and encouraged one another to keep working hard. Although school life was not always easy, those experiences taught me discipline and determination. Today, I understand that learning does not end after graduation. People must continue improving their knowledge because the world keeps changing and new opportunities require new skills.`,
  },
  {
    id: 5,
    category: "Business",
    estimatedSeconds: 60,
    text: `Starting a small business requires careful planning, patience and a good understanding of customers. My neighbour opened a small provision shop several years ago with money she had saved from her previous job. At first, the business was not making much profit because there were already several shops on the same street. However, she treated customers politely, kept her shop clean and made sure popular products were always available. Gradually, more people started buying from her because they trusted her service. She also began keeping proper records of daily sales and expenses. Whenever she noticed that a product was selling quickly, she ordered more before the stock finished. Her experience has taught me that a successful business does not grow in one day. Consistency and good customer relationships matter greatly.`,
  },
  {
    id: 6,
    category: "Weather",
    estimatedSeconds: 60,
    text: `The weather in Nigeria can change quickly, especially during the rainy season. One morning, I left home under a bright sky because there was no sign of rain. I had planned to visit a friend who lived several streets away, so I decided to walk instead of taking a bus. Halfway through the journey, dark clouds appeared and the wind became stronger. Within a few minutes, heavy rain started falling, forcing people along the road to look for shelter. I entered a nearby shop and waited with other customers until the rain became lighter. Some people were worried about getting late to work, while others used the opportunity to make phone calls. When the rain finally stopped, the roads were wet and traffic moved slowly. That day reminded me to carry an umbrella whenever I travel during the rainy season.`,
  },
  {
    id: 7,
    category: "Technology",
    estimatedSeconds: 60,
    text: `Technology has changed the way people communicate, work and manage everyday activities in Nigeria. Many people now use smartphones to send messages, attend online meetings and learn new skills from home. Small business owners also advertise their products through social media instead of depending only on physical shops. Last week, I helped my younger cousin create an email account because she needed it for an online training programme. We downloaded the required application, completed the registration and checked that everything was working properly. She was excited because the programme would teach her how to use digital tools for business. However, I also explained that people should be careful when sharing personal information online. Technology is useful, but users must protect their accounts and avoid suspicious messages. Learning how to use digital services responsibly is becoming increasingly important.`,
  },
  {
    id: 8,
    category: "Health and Lifestyle",
    estimatedSeconds: 60,
    text: `Maintaining a healthy lifestyle involves making sensible choices every day. I have recently started paying more attention to the food I eat and the amount of time I spend sitting down. Instead of buying snacks every afternoon, I sometimes prepare fruit at home and carry it to work. I also try to drink enough clean water throughout the day. In the evening, when the weather is suitable, I take a walk around my neighbourhood to relax after work. My friend recently joined a local exercise group, and he invited me to participate in their weekend activities. We agreed that staying active would be easier if we encouraged one another. Rest is equally important, so I try to maintain a regular sleeping routine. Small positive habits can make a meaningful difference over time.`,
  },
  {
    id: 9,
    category: "Community",
    estimatedSeconds: 60,
    text: `People in a community can achieve great things when they work together and support one another. Last month, residents of our street organised a clean-up exercise to remove waste from the drainage channels and clear the roadsides. Several young people arrived early with gloves, shovels and waste bags. Some older residents provided drinking water and helped organise the different groups. Although the work was tiring, everyone understood that a cleaner environment would benefit the entire neighbourhood. By midday, the surroundings looked much better than they had before the exercise started. Our community leader thanked everyone and encouraged residents to avoid throwing rubbish into the drainage system. We also discussed plans to organise similar activities every few weeks. The experience showed me that improving a neighbourhood does not depend on one person alone. Everyone has a role to play.`,
  },
  {
    id: 10,
    category: "Personal Experience",
    estimatedSeconds: 60,
    text: `One of the most important lessons I have learned is that success requires patience and consistent effort. A few years ago, I wanted to learn a new skill, but I found the lessons difficult during the first weeks. Sometimes I made mistakes and felt discouraged because other learners seemed to understand everything faster than I did. Instead of giving up, I decided to practise for a short time every evening. I also asked questions whenever I needed help and carefully reviewed the areas where I struggled. After several months, I noticed that my confidence had improved and I could complete tasks that once seemed impossible. That experience changed the way I approach challenges. I now understand that people learn at different speeds, and progress does not always happen immediately. What matters is the willingness to continue learning and improving.`,
  },
];

/**
 * Count words in a paragraph.
 */
export function countNigerianVoiceWords(text: string): number {
  return text
    .trim()
    .split(/\s+/)
    .filter(Boolean).length;
}

/**
 * Check whether a paragraph meets the required word range.
 */
export function isValidNigerianVoiceParagraph(
  text: string
): boolean {
  const wordCount = countNigerianVoiceWords(text);

  return (
    wordCount >= NIGERIAN_VOICE_MIN_WORDS &&
    wordCount <= NIGERIAN_VOICE_MAX_WORDS
  );
}

/**
 * Return all available Nigerian English paragraphs.
 */
export function getAllNigerianVoiceParagraphs(): NigerianVoiceParagraph[] {
  return NIGERIAN_VOICE_PARAGRAPHS;
}

/**
 * Find one paragraph using its ID.
 */
export function getNigerianVoiceById(
  id: number
): NigerianVoiceParagraph | undefined {
  return NIGERIAN_VOICE_PARAGRAPHS.find(
    (paragraph) => paragraph.id === id
  );
}

/**
 * Return paragraphs belonging to a category.
 */
export function getNigerianVoiceByCategory(
  category: string
): NigerianVoiceParagraph[] {
  return NIGERIAN_VOICE_PARAGRAPHS.filter(
    (paragraph) =>
      paragraph.category.toLowerCase() === category.toLowerCase()
  );
}

/**
 * Return a random paragraph.
 */
export function getRandomNigerianVoice(): NigerianVoiceParagraph {
  const index = Math.floor(
    Math.random() * NIGERIAN_VOICE_PARAGRAPHS.length
  );

  return NIGERIAN_VOICE_PARAGRAPHS[index];
}

/**
 * Return the paragraph for a given day.
 * This gives workers a predictable daily paragraph selection.
 */
export function getTodayNigerianVoice(
  date: Date = new Date()
): NigerianVoiceParagraph {
  const dayNumber = Math.floor(
    Date.UTC(
      date.getFullYear(),
      date.getMonth(),
      date.getDate()
    ) / 86400000
  );

  const index =
    ((dayNumber % NIGERIAN_VOICE_PARAGRAPHS.length) +
      NIGERIAN_VOICE_PARAGRAPHS.length) %
    NIGERIAN_VOICE_PARAGRAPHS.length;

  return NIGERIAN_VOICE_PARAGRAPHS[index];
}

/**
 * Check whether a recording has reached the minimum duration.
 *
 * Call this from the Worker Page before allowing submission.
 */
export function isNigerianVoiceRecordingLongEnough(
  durationSeconds: number
): boolean {
  return durationSeconds >= NIGERIAN_VOICE_MIN_DURATION;
}