// Drug information database for personalized medication insights
// Sources: FDA labels, DailyMed, clinical pharmacology references
// Used as fallback when AI API is not configured
// No free API provides reliable actual pill photos (DailyMed SPL images are chemical structures/labels)

const DRUG_INFO = {
  'amphetamine-dextroamphetamine': {
    purpose: 'This is a focus medication (you might know it as Adderall). It helps your brain use its natural "focus chemicals," dopamine and norepinephrine, more effectively. Think of it like turning up the volume on the part of your brain that helps you pay attention and finish tasks. The XR version releases slowly so it works all day.',
    sideEffects: 'You\'ll probably notice you\'re not as hungry, which is the most common side effect. You might also have trouble falling asleep, a dry mouth, or feel your heart beating a bit faster. These usually get better after a few weeks.',
    avoid: 'Don\'t drink orange juice or take vitamin C around the same time as your dose. Acidic things stop your body from absorbing the medication properly. Go easy on coffee and energy drinks since they can make you feel jittery or anxious.',
    tips: 'Take it first thing in the morning with breakfast, even if you\'re not hungry. Set a reminder to eat lunch because it\'s easy to skip meals on this medication without realizing it. If you forget a dose, just skip it. Taking it late in the day will keep you up at night. The XR capsule can be opened and sprinkled on applesauce if it\'s hard to swallow, but don\'t crush the little beads inside.',
  },
  'lisinopril-hydrochlorothiazide': {
    purpose: 'This pill is actually two blood pressure medicines in one. One part (lisinopril) relaxes your blood vessels so blood flows more easily. The other part (hydrochlorothiazide) is a "water pill" that helps your body get rid of extra salt and water. Together, they bring your blood pressure down better than either one alone.',
    sideEffects: 'You might feel dizzy when you stand up quickly, get a dry cough, or need to use the bathroom more often. Your skin may also burn more easily in the sun, so wear sunscreen. If your face or tongue ever swell up, get medical help right away (this is rare but serious).',
    avoid: 'Stay away from ibuprofen (Advil/Motrin) because it can make this medication less effective. Don\'t use salt substitutes or take extra potassium unless your doctor tells you to. Limit alcohol and too much sun.',
    tips: 'Take it in the morning so you\'re not running to the bathroom at night. Eat foods with potassium like bananas, oranges, and spinach since the water pill part can lower your potassium. Drink plenty of water, especially when it\'s hot out or you\'re exercising.',
  },
  'norethindrone-ethinyl': {
    purpose: 'This is a birth control pill. It contains two hormones that work together to prevent pregnancy in three ways: they stop your body from releasing an egg each month, make it harder for sperm to reach an egg, and change the lining of your uterus. It can also make your periods more regular, lighter, and less painful, and may help clear up acne.',
    sideEffects: 'You might feel a little nauseous, have sore breasts, headaches, or light spotting between periods for the first 1-3 months. These almost always go away as your body adjusts. Some people notice mood changes or slight weight changes.',
    avoid: 'This is really important: do NOT smoke while taking this pill. Smoking while on birth control seriously raises your chance of blood clots, heart attack, and stroke, especially if you\'re over 35. Call your doctor right away if you get bad leg pain, chest pain, a sudden severe headache, or blurry vision. Some antibiotics and herbal supplements (like St. John\'s Wort) can make the pill less effective, so use a backup method if you start any new medication.',
    tips: 'Take it at the same time every single day. Set a phone alarm. If you miss one pill, take it as soon as you remember. If you miss two or more, use a backup method (like condoms) for the next 7 days. Follow the arrows on the pack to keep the pills in order.',
  },
  lisinopril: {
    purpose: 'This medication helps lower your blood pressure by relaxing your blood vessels, making it easier for blood to flow through. Think of it like releasing pressure from a garden hose. Less pressure means less strain on your heart, kidneys, and blood vessels over time.',
    sideEffects: 'A dry, tickly cough is really common. It\'s annoying but harmless. Tell your doctor if it bugs you too much. You might also feel dizzy when standing up, especially in the first few days. If your face, lips, or tongue ever swell up, get emergency help right away. This is rare but needs immediate attention.',
    avoid: 'Don\'t take ibuprofen (Advil/Motrin) regularly because it works against this medication. Stay away from salt substitutes and extra potassium supplements unless your doctor approves them. Drink plenty of water, especially in hot weather.',
    tips: 'Take it at the same time each day. Consistency matters more than which time you pick. Don\'t stop taking it suddenly even if you feel fine. High blood pressure usually has no symptoms, so the medicine is still doing its job.',
  },
  digoxin: {
    purpose: 'This medication helps your heart beat stronger and at a steadier rhythm. If your heart has been pumping too weakly or too irregularly, digoxin gives it a boost, like a coach helping your heart keep the right pace and strength.',
    sideEffects: 'This medication has a very narrow "safe zone," so a little too much can cause problems. Watch out for feeling nauseous, losing your appetite, or seeing things with a yellowish tint or blurry vision. If any of these happen, call your doctor right away. It could mean there\'s too much digoxin in your system.',
    avoid: 'This drug interacts with a LOT of other medications, so always tell your pharmacist about everything you take, even over-the-counter stuff. Don\'t take antacids within 2 hours of digoxin. Low potassium or magnesium makes digoxin problems more likely, so eat your fruits and veggies.',
    tips: 'Take it at the same time every day. Never double up if you miss a dose. Your doctor will need to do regular blood tests to make sure the level in your body is just right. Don\'t skip these appointments. They\'re really important for this particular medication.',
  },
  hydrochlorothiazide: {
    purpose: 'This is a "water pill" that helps your body get rid of extra salt and water through your urine. Less extra fluid means lower blood pressure and less swelling.',
    sideEffects: 'You\'ll probably need to go to the bathroom more often, especially at first. It can lower your potassium levels, which might make your muscles feel crampy or tired. Your skin may be more sensitive to the sun, so wear sunscreen.',
    avoid: 'Go easy on alcohol because it can make dizziness worse. Protect yourself from the sun more than usual. Check with your doctor before taking ibuprofen.',
    tips: 'Take it in the morning so you\'re not up all night going to the bathroom. Eat potassium-rich foods like bananas, oranges, and spinach to replace what the pill removes. Stay hydrated.',
  },
  metformin: {
    purpose: 'This is usually the first medication prescribed for type 2 diabetes. It works in two ways: it tells your liver to stop making so much sugar, and it helps your body use insulin (your blood sugar-lowering hormone) more effectively.',
    sideEffects: 'Stomach issues like upset stomach, nausea, and diarrhea are really common when you first start, but they usually go away within a week or two. Taking it with food makes a huge difference.',
    avoid: 'Go easy on alcohol because combining it with metformin can cause a rare but serious problem. If you need a CT scan or any test with contrast dye, tell the doctor you\'re on metformin. They may want you to pause it temporarily.',
    tips: 'Always take it with a meal. This is the #1 way to avoid stomach trouble. If you\'re on the regular version and stomach issues won\'t quit, ask your doctor about the extended-release (XR) version, which is much gentler.',
  },
  atorvastatin: {
    purpose: 'This medication (brand name Lipitor) lowers your "bad" cholesterol (LDL). Cholesterol can build up in your blood vessel walls like grease in a pipe. Atorvastatin slows that buildup, which seriously lowers your risk of heart attack and stroke.',
    sideEffects: 'Muscle aches are the most common complaint. If you get muscle pain that won\'t go away or feels unusually severe, tell your doctor. They may adjust your dose or try a different statin.',
    avoid: 'No grapefruit or grapefruit juice because it changes how your body processes this drug and can increase side effects. Go easy on alcohol to protect your liver.',
    tips: 'You can take it any time of day, with or without food. Even if your cholesterol numbers look great, don\'t stop taking it. The protection only works while you\'re on it.',
  },
  amlodipine: {
    purpose: 'This medication relaxes your blood vessels to lower your blood pressure. It can also help with chest pain (angina) by improving blood flow to your heart. Think of it as widening the roads so traffic (your blood) moves more smoothly.',
    sideEffects: 'Swollen ankles are really common. It\'s usually harmless but can be annoying. You might also feel dizzy, flushed, or get headaches when you first start. These usually get better with time.',
    avoid: 'Don\'t drink a lot of grapefruit juice. Stand up slowly from sitting or lying down to avoid feeling lightheaded.',
    tips: 'It takes 1-2 weeks to kick in fully, so be patient. Take it at the same time each day. It works well when combined with other blood pressure meds.',
  },
  omeprazole: {
    purpose: 'This medication (brand name Prilosec) turns down the acid in your stomach. Your stomach naturally makes acid to digest food, but too much can cause heartburn, acid reflux, or ulcers. Omeprazole reduces acid production so your stomach and throat can heal.',
    sideEffects: 'Headaches and mild stomach discomfort can happen. If you take it for a very long time (years), your doctor will want to check your calcium and magnesium levels since it can affect how your body absorbs minerals.',
    avoid: 'Take it at least 30 minutes before eating. It works best on an empty stomach. Don\'t lie down right after meals if you have reflux.',
    tips: 'Take it in the morning before breakfast. Swallow the pill whole and don\'t crush or chew it. It can affect how your body absorbs some other medications, so ask your pharmacist about timing if you take multiple pills.',
  },
  levothyroxine: {
    purpose: 'Your thyroid is a small gland in your neck that controls your metabolism, basically how your body uses energy. When it doesn\'t make enough thyroid hormone, you can feel tired, gain weight, feel cold, and get "brain fog." This medication replaces the missing hormone so everything runs normally again.',
    sideEffects: 'When the dose is right, side effects are rare. If you\'re getting too much, you might feel jittery, have a fast heartbeat, or lose weight. Too little, and you\'ll feel sluggish and cold. Your doctor adjusts the dose based on blood tests.',
    avoid: 'Take it on an empty stomach, 30-60 minutes before breakfast. Calcium, iron, and antacids all block it from being absorbed, so wait at least 4 hours between them. Soy milk and high-fiber foods can also interfere.',
    tips: 'Take it the same time every morning. Consistency really matters with this one. Don\'t switch brands without telling your doctor, because the amount of actual hormone can vary between brands. You\'ll need blood tests every so often to check that the dose is right.',
  },
  metoprolol: {
    purpose: 'This medication slows down your heart rate and lowers your blood pressure. By making your heart work less hard, it helps prevent heart attacks and manages heart failure. Think of it as taking your heart from a sprint to a comfortable walk.',
    sideEffects: 'You might feel more tired than usual, have cold hands or feet, or feel a little dizzy at first. A slower heartbeat is normal. That\'s exactly what it\'s supposed to do.',
    avoid: 'NEVER stop this medication suddenly. It can cause a dangerous jump in heart rate and blood pressure. Your doctor needs to lower your dose gradually if you\'re going to stop. Go easy on alcohol.',
    tips: 'Take it with food so your body absorbs it better. Don\'t crush the extended-release tablets. Check your pulse regularly. If it drops below 50 beats per minute, call your doctor.',
  },
  sertraline: {
    purpose: 'This medication (brand name Zoloft) helps with depression, anxiety, and related conditions by boosting serotonin in your brain. Serotonin is a chemical that helps regulate your mood, sleep, and sense of well-being. When there\'s not enough of it, you can feel down, anxious, or overwhelmed.',
    sideEffects: 'Nausea, headaches, and sleep changes are common in the first week or two but usually improve. Some people experience changes in sex drive. Talk to your doctor if this is bothersome, because there are other options.',
    avoid: 'Avoid alcohol. It makes depression worse and amplifies side effects. Don\'t take St. John\'s Wort, which can cause a dangerous buildup of serotonin.',
    tips: 'Give it time. It takes 4-6 weeks to feel the full effect, so don\'t stop early because you think it isn\'t working. And never stop suddenly, because that can cause dizziness, irritability, and what people describe as "brain zaps." Your doctor will help you taper off slowly if you ever need to stop.',
  },
  gabapentin: {
    purpose: 'This medication calms down overactive nerves. It\'s used for nerve pain (that burning, shooting, or tingling kind of pain), seizures, and sometimes anxiety or restless legs. It works differently from regular painkillers because it targets the nerve signals themselves.',
    sideEffects: 'Feeling sleepy and dizzy are the most common side effects, especially when you first start or when your dose goes up. Some people gain weight or notice swelling in their hands or feet over time.',
    avoid: 'Avoid alcohol and anything that makes you drowsy, since gabapentin adds to the sleepiness. Don\'t drive until you know how it affects you. If you take antacids, wait 2 hours before taking gabapentin.',
    tips: 'Space your doses evenly throughout the day. Don\'t skip doses or stop suddenly. That can cause seizures or your pain to bounce back worse than before. Your doctor will start you on a low dose and gradually increase it.',
  },
  prednisone: {
    purpose: 'This is a powerful anti-inflammatory medication. When your body\'s immune system overreacts, causing swelling, pain, or flare-ups from conditions like asthma, arthritis, or allergies, prednisone calms everything down fast.',
    sideEffects: 'Short-term, you might feel extra hungry, have mood swings, trouble sleeping, or feel puffy from holding water. Long-term use can cause weight gain, weaker bones, higher blood sugar, and make you more likely to catch infections.',
    avoid: 'Do NOT stop this medication suddenly if you\'ve been taking it for more than a few days. Your body gets used to it and needs to be weaned off gradually. Try to avoid sick people, since your immune system is turned down. Cut back on salt to reduce puffiness.',
    tips: 'Take it with food so it doesn\'t upset your stomach. Take it in the morning to help with sleep. If you\'re on it for more than a couple of weeks, ask your doctor about calcium and vitamin D to protect your bones.',
  },
};

// Drug class recognition by name patterns, used when no exact match exists
const DRUG_CLASS_PATTERNS = [
  { pattern: /pril$/i, className: 'ACE inhibitor', use: 'blood pressure and heart protection', warn: 'Watch for dry cough and dizziness. Avoid potassium supplements and NSAIDs like ibuprofen.' },
  { pattern: /sartan$/i, className: 'ARB (angiotensin receptor blocker)', use: 'blood pressure', warn: 'Avoid potassium supplements. May cause dizziness when standing. Do not take during pregnancy.' },
  { pattern: /statin$/i, className: 'statin (cholesterol-lowering)', use: 'lowering cholesterol and heart disease risk', warn: 'Avoid grapefruit. Report any unexplained muscle pain to your provider.' },
  { pattern: /olol$/i, className: 'beta-blocker', use: 'heart rate and blood pressure control', warn: 'Never stop suddenly. Must be tapered. May cause fatigue and cold hands.' },
  { pattern: /dipine$/i, className: 'calcium channel blocker', use: 'blood pressure', warn: 'May cause ankle swelling and dizziness. Avoid large amounts of grapefruit.' },
  { pattern: /prazole$/i, className: 'proton pump inhibitor', use: 'reducing stomach acid (reflux/ulcers)', warn: 'Take before meals. Long-term use may affect mineral absorption.' },
  { pattern: /oxetine$|aline$/i, className: 'SSRI/SNRI antidepressant', use: 'mood, anxiety, or depression', warn: 'Takes 4-6 weeks for full effect. Never stop suddenly. Taper with your provider.' },
  { pattern: /cillin$/i, className: 'penicillin-type antibiotic', use: 'treating bacterial infections', warn: 'Finish the entire course even if you feel better. Watch for allergic reactions (rash, swelling).' },
  { pattern: /mycin$|cycline$/i, className: 'antibiotic', use: 'treating bacterial infections', warn: 'Finish the full course. Some interact with dairy or sun exposure.' },
  { pattern: /thiazide$/i, className: 'diuretic (water pill)', use: 'blood pressure and fluid retention', warn: 'Take in the morning. Eat potassium-rich foods. Increased sun sensitivity.' },
  { pattern: /gliptin$|glutide$/i, className: 'diabetes medication', use: 'blood sugar control', warn: 'Monitor blood sugar as directed. Report any persistent nausea or abdominal pain.' },
  { pattern: /ethinyl|estradiol|norethindrone|gestrel/i, className: 'hormonal contraceptive', use: 'birth control and/or hormone regulation', warn: 'Do not smoke while taking this. Take at the same time daily. Certain medications can reduce effectiveness.' },
];

// Find drug info by matching the medication name against known drugs
// Prefers longer (more specific) matches, e.g. "lisinopril-hydrochlorothiazide" beats "lisinopril"
const findDrugInfo = (medName) => {
  const lower = medName.toLowerCase();
  let bestMatch = null;
  let bestLen = 0;
  for (const [drug, info] of Object.entries(DRUG_INFO)) {
    if (lower.includes(drug) && drug.length > bestLen) {
      bestMatch = { drug, ...info };
      bestLen = drug.length;
    }
  }
  return bestMatch;
};

// Identify drug class from name patterns when no exact match exists
const identifyDrugClass = (medName) => {
  const firstWord = medName.split(/\s+/)[0];
  for (const { pattern, className, use, warn } of DRUG_CLASS_PATTERNS) {
    if (pattern.test(firstWord) || pattern.test(medName)) {
      return { className, use, warn };
    }
  }
  return null;
};

export { DRUG_INFO, findDrugInfo, identifyDrugClass };
export default DRUG_INFO;
