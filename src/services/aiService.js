// AI Service - Uses Claude API for health record explanations

// NOTE: In a production app, API calls should go through your backend
// to protect your API key. This is for demonstration purposes.

import { findDrugInfo, identifyDrugClass } from '../constants/drugInfo';

const ANTHROPIC_API_URL = 'https://api.anthropic.com/v1/messages';

class AIService {
  constructor() {
    // In production, this would be handled server-side
    this.apiKey = 'YOUR_ANTHROPIC_API_KEY_HERE';
  }

  // Generate a plain-language explanation of a care gap
  async explainCareGap(measureResult, patientContext) {
    if (this.apiKey === 'YOUR_ANTHROPIC_API_KEY_HERE') {
      return this.buildFallbackExplanation(measureResult, patientContext);
    }
    const prompt = this.buildCareGapPrompt(measureResult, patientContext);
    try {
      return await this.generateResponse(prompt);
    } catch {
      return this.buildFallbackExplanation(measureResult, patientContext);
    }
  }

  buildFallbackExplanation(measureResult, patientContext) {
    const { measure, status, lastCompleted } = measureResult;
    const age = patientContext?.age ?? null;
    const gender = patientContext?.gender ?? 'unknown';
    const isDue = status === 'due';
    const isOverdue = status === 'overdue';

    const conditions = patientContext?.conditions ?? [];
    const content = this._getMeasureSpecificContent(measure.id, age, gender, isDue, isOverdue, lastCompleted, conditions);

    const sdohNeeds = patientContext?.sdohNeedsIdentified ?? [];
    const sdohNote = this._buildSDOHNote(measure.id, sdohNeeds, isDue || isOverdue);
    return content + sdohNote;
  }

  _getMeasureSpecificContent(measureId, age, gender, isDue, isOverdue, lastCompleted, conditions) {
    const condLower = (conditions || []).map(c => c.toLowerCase());
    const hasCondition = (keywords) => condLower.some(c => keywords.some(k => c.includes(k)));

    if (measureId === 'flu-shot') {
      if (isDue || isOverdue) {
        let text = '';
        if (hasCondition(['heart', 'cardiac', 'atrial', 'coronary'])) {
          text = 'With your heart condition, catching the flu is especially risky. The flu causes inflammation that puts extra strain on your heart and raises the risk of a heart attack, even when your heart condition is well-managed.';
        } else if (hasCondition(['diabetes', 'diabetic'])) {
          text = 'With diabetes, your immune system has to work harder to fight infections. The flu can send your blood sugar on a roller coaster that\'s hard to control, and diabetics are 3x more likely to be hospitalized from flu complications.';
        } else if (hasCondition(['asthma', 'copd', 'lung'])) {
          text = 'With your lung condition, the flu can trigger serious breathing problems and is more likely to turn into pneumonia. Getting vaccinated is one of the most important things you can do to stay out of the hospital.';
        } else if (age && age >= 65) {
          text = 'At ' + age + ', your immune system doesn\'t respond to infections as strongly as it used to. Ask specifically for the high-dose flu shot, which is designed to give older adults a stronger immune response.';
        } else {
          text = 'Even if you\'re healthy, the flu can knock you out for 1-2 weeks. You can also pass it to family members, coworkers, or friends without realizing it before symptoms show up.';
        }
        text += '\n\nMost pharmacies offer walk-in flu shots with no appointment needed, and they\'re usually free with insurance. It takes about 2 weeks to kick in fully.';
        return text;
      }
      if (lastCompleted) {
        return `You got your flu shot on ${lastCompleted}, so you\'re covered for this season. You\'ll need a new one next fall since the vaccine is reformulated each year to match the circulating strains.`;
      }
      return 'You\'re up to date on your flu shot this season. You\'ll need a new one next fall since the virus changes every year.';
    }

    if (measureId === 'colorectal-screening') {
      if (isDue || isOverdue) {
        let text = '';
        if (gender === 'male' && age && age >= 50) {
          text = `As a ${age}-year-old man, your risk of colon cancer is higher than the general population. Men develop it about 30% more often than women, and risk goes up significantly after 50.`;
        } else if (age && age >= 50) {
          text = `At ${age}, your risk is higher than it was even a few years ago. Most colon cancers develop after age 50, which is exactly why this screening matters now.`;
        } else {
          text = 'Colon cancer rates are rising in younger adults, which is why screening guidelines now start at 45.';
        }
        if (hasCondition(['diabetes', 'diabetic'])) {
          text += ' People with diabetes have a 30% higher risk of developing colon cancer, which makes this screening especially important for you.';
        }
        text += '\n\nYou don\'t have to do a colonoscopy. A FIT test is a simple at-home stool test your doctor can mail you. No prep, no procedure. If it comes back normal, you\'re covered.';
        return text;
      }
      if (lastCompleted) {
        return `Your colonoscopy on ${lastCompleted} covered you for about 10 years. Mark your calendar for around ${parseInt(lastCompleted.split(',').pop()) + 10}. In the meantime, let your doctor know if you notice any changes in bowel habits or blood in your stool.`;
      }
      return 'You\'re current on your colon cancer screening. Between screenings, let your doctor know about any unusual changes in bowel habits.';
    }

    if (measureId === 'breast-cancer-screening') {
      if (isDue || isOverdue) {
        let text = '';
        if (age && age >= 55) {
          text = `At ${age}, about 2 out of 3 breast cancers are found in women over 55. Your age alone makes regular screening more important now than when you were younger.`;
        } else {
          text = 'Regular mammograms can catch problems years before you\'d ever notice them on your own, when treatment options are the widest and least invasive.';
        }
        if (hasCondition(['diabetes', 'diabetic'])) {
          text += ' Some studies link diabetes to a higher risk of breast cancer, making this screening especially worthwhile for you.';
        }
        text += '\n\nA mammogram takes about 20 minutes. Ask about 3D mammograms (tomosynthesis), which are more accurate and reduce false alarms. Many imaging centers offer evening and weekend appointments.';
        return text;
      }
      if (lastCompleted) {
        return `Your mammogram on ${lastCompleted} is great. Schedule your next one in about 2 years. Between screenings, pay attention to any changes in how your breasts look or feel and report anything unusual right away.`;
      }
      return 'You\'re up to date on breast cancer screening. Between mammograms, pay attention to any changes and report anything unusual to your provider.';
    }

    if (measureId === 'hba1c-test') {
      if (isDue || isOverdue) {
        let text = 'Your A1c acts like a 3-month average of your blood sugar. It shows the big picture that daily readings can miss.';
        if (hasCondition(['hypertension', 'high blood pressure'])) {
          text += ' Since you also have high blood pressure, keeping your blood sugar in check is even more critical. Diabetes and high blood pressure together accelerate damage to your kidneys, eyes, and blood vessels much faster than either one alone.';
        } else if (hasCondition(['heart', 'cardiac', 'coronary'])) {
          text += ' With your heart condition, blood sugar control matters even more because high blood sugar damages blood vessels and makes heart problems worse over time.';
        }
        text += '\n\nThis is just a quick blood draw, no fasting needed. Every 1% drop in A1c cuts your risk of complications by about 40%.';
        return text;
      }
      if (lastCompleted) {
        return `Your last A1c on ${lastCompleted} helps your care team spot trends and adjust your plan before small changes become big problems. Your next one is due in about 6 months.`;
      }
      return 'You\'re current on your A1c testing. Staying on schedule lets your care team catch trends early and adjust your treatment before problems develop.';
    }

    if (measureId === 'blood-pressure-check') {
      if (isDue || isOverdue) {
        let text = '';
        if (hasCondition(['diabetes', 'diabetic'])) {
          text = 'With diabetes, high blood pressure is especially dangerous. The combination damages your kidneys, eyes, and blood vessels much faster. Keeping both numbers in check is one of the most important things you can do.';
        } else if (hasCondition(['heart', 'cardiac', 'atrial', 'coronary'])) {
          text = 'With your heart condition, blood pressure is one of the most important numbers to track. Even small increases put extra strain on your heart and raise your risk of complications.';
        } else if (gender === 'male' && age && age >= 45) {
          text = `As a ${age}-year-old man, you\'re in a higher-risk group for high blood pressure. Nearly half of men your age have it, and most don\'t know because there are no symptoms.`;
        } else if (gender === 'female' && age && age >= 55) {
          text = 'After menopause, blood pressure often rises even in women who\'ve always had normal readings. Checking it regularly catches changes early.';
        } else {
          text = 'Blood pressure can creep up without any symptoms. The only way to know your numbers is to check.';
        }
        text += '\n\nYou can check for free at most pharmacies, no appointment needed. A home monitor ($30-50) is also a great investment for tracking trends between visits.';
        return text;
      }
      if (lastCompleted) {
        return `Your BP was checked on ${lastCompleted}. Between visits, small lifestyle changes make a real difference: cutting back on salt, walking 30 minutes a day, or managing stress can each lower your numbers by 5-10 points.`;
      }
      return 'Your blood pressure check is up to date. Between visits, staying active and limiting salt are two of the easiest ways to keep your numbers in a healthy range.';
    }

    // Generic fallback for unknown measures
    const label = measureId.replace(/-/g, ' ');
    if (isDue || isOverdue) {
      return `Your ${label} is ${isOverdue ? 'overdue' : 'due'}. Staying on top of preventive care catches problems early when they're easiest to treat. Contact your provider's office to get this scheduled.`;
    }
    return `You're current on your ${label}. Staying up to date with preventive care is one of the best investments in your long-term health.`;
  }

  _buildSDOHNote(measureId, sdohNeeds, isActionable) {
    if (sdohNeeds.length === 0 || !isActionable) return '';

    // Each measure has a priority-ordered list of SDOH needs that meaningfully
    // affect that specific health outcome. We pick only the top match.
    // Notes must not repeat info from the base content. Base content already covers:
    // - flu-shot: "pharmacies offer walk-in", "free with insurance", "2 weeks to kick in"
    // - colorectal: FIT test details, "at-home stool test your doctor can mail you"
    // - blood-pressure: "free at most pharmacies", "home monitor ($30-50)"
    // - hba1c: "quick blood draw, no fasting"
    // - breast-cancer: "20 minutes", "3D mammograms", "evening/weekend appointments"
    const measureSDOH = {
      'flu-shot': [
        ['Housing', 'Crowded or unstable living situations increase your exposure to illness, making vaccination even more important.'],
        ['Food Security', 'Without reliable nutrition, your immune system has a harder time fighting infections, which makes the vaccine especially valuable for you.'],
        ['Social Support', 'Without many people around to help if you get sick, preventing the flu matters even more. It takes 15 minutes and you don\'t need anyone to come with you.'],
        ['Stress & Mental Wellbeing', 'When you\'re already dealing with a lot, getting knocked out by the flu for a week or two is the last thing you need. This is one of the easiest ways to protect yourself.'],
      ],
      'blood-pressure-check': [
        ['Stress & Mental Wellbeing', 'Stress directly raises blood pressure, so tracking your numbers right now is especially useful. Even 10 minutes of daily decompression, like a short walk or deep breathing, can lower readings by several points.'],
        ['Housing', 'Housing instability takes a real physical toll on blood pressure. Keeping track of your numbers helps your care team see the full picture and adjust your plan.'],
        ['Food Security', 'Affordable staples like canned beans, frozen vegetables, and bananas are all heart-healthy options that help keep blood pressure down.'],
        ['Social Support', 'Isolation itself is linked to higher blood pressure. If you can, even brief regular contact with others, like a weekly phone call, makes a measurable difference.'],
      ],
      'hba1c-test': [
        ['Food Security', 'Managing blood sugar is much harder without consistent meals. Ask your care team about food assistance programs that can help.'],
        ['Stress & Mental Wellbeing', 'Stress hormones push blood sugar up even when your diet hasn\'t changed. Knowing your A1c helps your care team adjust for that.'],
        ['Housing', 'Unstable housing makes it harder to store medications and eat on a regular schedule, both of which affect blood sugar. Your care team can help plan around this.'],
        ['Financial Strain', 'Community health centers offer A1c testing on a sliding fee scale. Your care team may also have options to reduce lab costs.'],
        ['Social Support', 'Managing diabetes is easier with support. Ask your care team about diabetes education groups that can connect you with others going through the same thing.'],
      ],
      'colorectal-screening': [
        ['Stress & Mental Wellbeing', 'When life feels overwhelming, preventive care is easy to push off. But getting this one done means one fewer thing hanging over you.'],
        ['Financial Strain', 'The at-home option is usually fully covered by insurance with no copay, making it one of the most affordable screenings available.'],
        ['Social Support', 'The at-home option means you can do this on your own schedule without needing anyone to drive you to a procedure.'],
        ['Transportation', 'Your doctor\'s office can mail the at-home test kit directly to you, so no travel is needed at all.'],
      ],
      'breast-cancer-screening': [
        ['Financial Strain', 'The CDC\'s National Breast and Cervical Cancer Early Detection Program covers mammograms at no cost. Ask your provider about free screening options near you.'],
        ['Transportation', 'Many health plans cover rides to mammogram appointments. Call your insurance\'s member services line to arrange a free ride.'],
        ['Stress & Mental Wellbeing', 'It\'s easy to put your own health last when life feels overwhelming. Getting this done is a small but meaningful way to take care of yourself.'],
      ],
    };

    const candidates = measureSDOH[measureId];
    if (!candidates) return '';

    for (const [need, note] of candidates) {
      if (sdohNeeds.includes(need)) {
        return '\n\n' + note;
      }
    }
    return '';
  }

  // Generate a plain-language explanation of a medication
  async explainMedication(medicationName, dosage, patientContext, allMedNames) {
    if (this.apiKey === 'YOUR_ANTHROPIC_API_KEY_HERE') {
      return this.buildFallbackMedicationExplanation(medicationName, dosage, patientContext, allMedNames);
    }
    const prompt = this.buildMedicationPrompt(medicationName, dosage, patientContext, allMedNames);
    try {
      return await this.generateResponse(prompt);
    } catch {
      return this.buildFallbackMedicationExplanation(medicationName, dosage, patientContext, allMedNames);
    }
  }

  buildFallbackMedicationExplanation(medicationName, dosage, patientContext, allMedNames) {
    const conditions = patientContext?.conditions ?? [];
    const condLower = conditions.map(c => c.toLowerCase());
    const otherNames = (allMedNames || []).filter(n => n !== medicationName);
    const info = findDrugInfo(medicationName);

    if (!info) {
      // No exact match — try drug class recognition from the name
      const drugClass = identifyDrugClass(medicationName);
      const shortName = medicationName.split(' ')[0];
      if (drugClass) {
        let text = `${shortName} is a ${drugClass.className}, used for ${drugClass.use}. ${drugClass.warn}`;
        // Connect to patient's conditions if possible
        const relevantCond = this._findRelevantCondition(drugClass.use, condLower, conditions);
        if (relevantCond) {
          text += ` Given your ${relevantCond}, this medication is an important part of keeping things under control.`;
        }
        return text;
      }
      // Truly unknown
      let text = `${shortName} was prescribed as part of your treatment plan`;
      if (conditions.length > 0) {
        text += ` for conditions including ${conditions.slice(0, 2).join(' and ')}`;
      }
      text += '. Tap "Learn more on DailyMed" below for details on side effects and interactions.';
      return text;
    }

    // Build concise, personalized insight — prioritize the most critical info
    const parts = [];

    // Connect to patient's actual conditions instead of generic purpose
    const personalConnection = this._connectDrugToConditions(info.drug, medicationName, condLower, conditions);
    if (personalConnection) {
      parts.push(personalConnection);
    } else {
      // Shorten purpose to first sentence only
      const firstSentence = info.purpose.split('. ')[0] + '.';
      parts.push(firstSentence);
    }

    // Add combo therapy note if relevant
    const comboNote = this._getComboNote(medicationName, otherNames);
    if (comboNote) parts.push(comboNote);

    // Pick the single most important warning (avoid > sideEffects)
    const avoidText = info.avoid.split('. ').slice(0, 2).join('. ').replace(/\.+$/, '') + '.';
    parts.push('⚠️ ' + avoidText);

    // One practical tip — first sentence only
    const tipText = info.tips.split('. ')[0].replace(/\.+$/, '') + '.';
    parts.push('💡 ' + tipText);

    return parts.join('\n\n');
  }

  _findRelevantCondition(drugUse, condLower, conditions) {
    const useMap = {
      'blood pressure': ['hypertension', 'high blood pressure', 'essential hypertension'],
      'heart': ['heart failure', 'cardiac', 'atrial fibrillation', 'coronary'],
      'cholesterol': ['hyperlipidemia', 'cholesterol', 'hypercholesterolemia'],
      'blood sugar': ['diabetes', 'diabetic'],
      'mood': ['depression', 'anxiety', 'depressive'],
      'stomach acid': ['gerd', 'reflux', 'gastro'],
    };
    for (const [keyword, condPatterns] of Object.entries(useMap)) {
      if (drugUse.includes(keyword)) {
        const match = conditions.find((c, i) => condPatterns.some(p => condLower[i].includes(p)));
        if (match) return match;
      }
    }
    return null;
  }

  _connectDrugToConditions(drugKey, medicationName, condLower, conditions) {
    const medLower = medicationName.toLowerCase();
    // Map drug names to condition keywords they treat
    const drugCondMap = {
      lisinopril: ['hypertension', 'high blood pressure', 'essential hypertension', 'heart failure'],
      hydrochlorothiazide: ['hypertension', 'high blood pressure', 'essential hypertension'],
      'lisinopril-hydrochlorothiazide': ['hypertension', 'high blood pressure', 'essential hypertension'],
      digoxin: ['heart failure', 'atrial fibrillation', 'cardiac'],
      metformin: ['diabetes', 'diabetic'],
      atorvastatin: ['hyperlipidemia', 'cholesterol', 'hypercholesterolemia'],
      amlodipine: ['hypertension', 'high blood pressure'],
      metoprolol: ['hypertension', 'heart failure', 'atrial fibrillation'],
      sertraline: ['depression', 'anxiety', 'depressive'],
      omeprazole: ['gerd', 'reflux', 'gastro'],
      levothyroxine: ['hypothyroid', 'thyroid'],
      gabapentin: ['neuropath', 'nerve pain', 'seizure'],
      prednisone: ['arthritis', 'asthma', 'inflammatory'],
    };

    for (const [drug, condPatterns] of Object.entries(drugCondMap)) {
      if (medLower.includes(drug)) {
        const matchedCond = conditions.find((c, i) => condPatterns.some(p => condLower[i].includes(p)));
        if (matchedCond) {
          const purposeFirst = findDrugInfo(medicationName)?.purpose.split('. ')[0] || '';
          return `You're taking this for your ${matchedCond}. ${purposeFirst.replace(/\.$/, '')}.`;
        }
      }
    }
    return null;
  }

  _getComboNote(medicationName, otherNames) {
    const medLower = medicationName.toLowerCase();
    const othersLower = otherNames.map(n => n.toLowerCase());

    if (medLower.includes('lisinopril') && othersLower.some(n => n.includes('hydrochlorothiazide'))) {
      return 'Works together with your hydrochlorothiazide: one relaxes blood vessels while the other reduces fluid, giving better blood pressure control than either alone.';
    }
    if (medLower.includes('hydrochlorothiazide') && othersLower.some(n => n.includes('lisinopril'))) {
      return 'Paired with your lisinopril, this combo tackles blood pressure from two angles: reducing fluid while relaxing blood vessels.';
    }
    if (medLower.includes('digoxin') && othersLower.some(n => n.includes('lisinopril'))) {
      return 'Works alongside your lisinopril. Digoxin strengthens the heartbeat while lisinopril reduces the workload on your heart.';
    }
    return null;
  }

  buildMedicationPrompt(medicationName, dosage, patientContext, allMedNames) {
    const otherMeds = (allMedNames || []).filter(n => n !== medicationName);
    return `You are a knowledgeable pharmacist giving a patient genuinely useful information about their medication. Do NOT repeat the medication name, dosage, or prescriber — the patient already sees that on screen.

Patient context:
- Age: ${patientContext?.age ?? 'unknown'}
- Gender: ${patientContext?.gender ?? 'unknown'}
- Conditions on record: ${patientContext?.conditions?.join(', ') || 'None noted'}
- Other active medications: ${otherMeds.length > 0 ? otherMeds.join(', ') : 'None'}

Medication: ${medicationName}

Provide NEW, USEFUL information the patient doesn't already know:
1. What this medication actually does in the body and how it helps their specific conditions (2-3 sentences)
2. How it works with their other medications — are they complementary? Any interactions to watch for?
3. Side effects to be aware of and what warrants calling the doctor
4. Foods, drinks, or activities to avoid while taking this
5. A practical tip specific to THIS drug (timing, absorption, what to do if a dose is missed)

Vary your format based on what's most important for this specific drug. Some drugs need more warnings, others need lifestyle tips. Do NOT use a cookie-cutter format.
Keep the total response under 200 words. Be warm, direct, and genuinely helpful.`;
  }

  // Generate explanation of a lab result or observation
  async explainLabResult(observation, patientContext) {
    const prompt = this.buildLabResultPrompt(observation, patientContext);
    return this.generateResponse(prompt);
  }

  // Generate a summary of the patient's overall health status
  async generateHealthSummary(patientData, measureResults) {
    const prompt = this.buildHealthSummaryPrompt(patientData, measureResults);
    return this.generateResponse(prompt);
  }

  // Build prompt for care gap explanation
  buildCareGapPrompt(measureResult, patientContext) {
    const { measure, status, lastCompleted, value } = measureResult;
    
    const sdohLines = [];
    if (patientContext.sdohObservations?.length > 0) {
      sdohLines.push(`- Social & life context (from health record): ${patientContext.sdohObservations.slice(0, 4).join('; ')}`);
    }
    if (patientContext.sdohSelfReported) {
      sdohLines.push(`- ${patientContext.sdohSelfReported}`);
    }

    return `You are a helpful health assistant explaining preventive care to a patient. Be warm, clear, and encouraging. Avoid medical jargon.

Patient context:
- Age: ${patientContext.age}
- Gender: ${patientContext.gender}
- Relevant conditions: ${patientContext.conditions.join(', ') || 'None noted'}${sdohLines.length > 0 ? '\n' + sdohLines.join('\n') : ''}

Care measure: ${measure.name}
Status: ${status}
${lastCompleted ? `Last completed: ${lastCompleted}` : 'No record found'}
${value ? `Most recent value: ${value}` : ''}

The measure description is: ${measure.description}

Please provide:
1. A brief (2-3 sentence) explanation of what this screening/test is and why it matters for this patient specifically
2. What the patient should do next (if action is needed)
3. One encouraging statement

Keep the total response under 150 words. Use "you" and "your" to speak directly to the patient.`;
  }

  // Build prompt for lab result explanation
  buildLabResultPrompt(observation, patientContext) {
    const value = observation.valueQuantity 
      ? `${observation.valueQuantity.value} ${observation.valueQuantity.unit || ''}`
      : observation.valueString || 'Not specified';
    
    const name = observation.code?.coding?.[0]?.display || 'Unknown test';
    const interpretation = observation.interpretation?.[0]?.coding?.[0]?.display || null;

    return `You are a helpful health assistant explaining lab results to a patient. Be clear, reassuring when appropriate, and avoid unnecessary alarm.

Patient context:
- Age: ${patientContext.age}
- Gender: ${patientContext.gender}
- Relevant conditions: ${patientContext.conditions.join(', ') || 'None noted'}

Lab result:
- Test: ${name}
- Value: ${value}
${interpretation ? `- Interpretation: ${interpretation}` : ''}

Please provide:
1. A simple explanation of what this test measures (1-2 sentences)
2. What this specific result means for the patient
3. Whether any action is recommended
4. Context about what's considered normal

Keep the total response under 150 words. Be factual but warm. Use "you" and "your" to speak directly to the patient. If the result is concerning, gently encourage them to discuss with their doctor rather than causing alarm.`;
  }

  // Build prompt for overall health summary
  buildHealthSummaryPrompt(patientData, measureResults) {
    const { patient, conditions, medications } = patientData;
    
    const conditionList = conditions
      .map(c => c.code?.coding?.[0]?.display)
      .filter(Boolean)
      .slice(0, 5);
    
    const medicationList = medications
      .map(m => m.medicationCodeableConcept?.coding?.[0]?.display || m.medicationReference?.display)
      .filter(Boolean)
      .slice(0, 5);

    const complete = measureResults.filter(r => r.status === 'complete').length;
    const due = measureResults.filter(r => r.status === 'due' || r.status === 'overdue').length;
    const total = measureResults.filter(r => r.status !== 'na').length;

    return `You are a helpful health assistant providing a friendly overview of a patient's health status. Be encouraging and actionable.

Patient: ${patient.name?.[0]?.given?.[0] || 'Patient'}
Age: ${new Date().getFullYear() - new Date(patient.birthDate).getFullYear()}

Active conditions: ${conditionList.join(', ') || 'None noted'}
Current medications: ${medicationList.join(', ') || 'None noted'}

Preventive care status:
- ${complete} of ${total} recommended screenings are up to date
- ${due} screenings need attention

Please provide:
1. A warm, personalized greeting using their first name
2. A brief summary of their preventive care status (1-2 sentences)
3. Their top priority action item (if any screenings are due)
4. One positive, encouraging closing statement

Keep the total response under 120 words. Be warm and supportive, like a helpful nurse or health coach.`;
  }

  // Make API call to Claude
  async generateResponse(prompt) {
    try {
      const response = await fetch(ANTHROPIC_API_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': this.apiKey,
          'anthropic-version': '2023-06-01',
        },
        body: JSON.stringify({
          model: 'claude-sonnet-4-20250514',
          max_tokens: 300,
          messages: [
            {
              role: 'user',
              content: prompt,
            },
          ],
        }),
      });

      if (!response.ok) {
        throw new Error(`API request failed: ${response.status}`);
      }

      const data = await response.json();
      return data.content[0].text;
    } catch (error) {
      console.error('AI Service error:', error);
      // Return a fallback message if API fails
      return this.getFallbackMessage();
    }
  }

  // Fallback message if API is unavailable
  getFallbackMessage() {
    return "I'm unable to generate a personalized explanation right now. Please consult with your healthcare provider for more information about this result.";
  }

  // Build patient context object from FHIR data
  buildPatientContext(patient, conditions, sdohFhirData = null) {
    const age = new Date().getFullYear() - new Date(patient.birthDate).getFullYear();
    const gender = patient.gender || 'unknown';

    const conditionNames = conditions
      .map(c => c.code?.coding?.[0]?.display)
      .filter(Boolean);

    // Extract SDOH observations from FHIR
    const sdohObservations = [];
    if (sdohFhirData) {
      const allObs = [...(sdohFhirData.socialHistory ?? []), ...(sdohFhirData.surveys ?? [])];
      for (const obs of allObs) {
        const name = obs.code?.coding?.[0]?.display || obs.code?.text;
        const value = obs.valueCodeableConcept?.text
          || obs.valueCodeableConcept?.coding?.[0]?.display
          || (obs.valueQuantity ? `${obs.valueQuantity.value} ${obs.valueQuantity.unit ?? ''}`.trim() : null)
          || obs.valueString;
        if (name && value) sdohObservations.push(`${name}: ${value}`);
      }

      for (const cond of (sdohFhirData.zCodeConditions ?? [])) {
        const name = cond.code?.coding?.[0]?.display || cond.code?.text;
        if (name) sdohObservations.push(`Social condition: ${name}`);
      }
    }

    return {
      age,
      gender,
      conditions: conditionNames,
      sdohObservations,
    };
  }

  // Merge self-reported SDOH questionnaire answers into patient context
  addSDOHAnswers(patientContext, sdohResult) {
    if (!sdohResult) return patientContext;

    const { answers, needsIdentified } = sdohResult;
    const selfReported = needsIdentified.length > 0
      ? `Self-reported social needs: ${needsIdentified.join(', ')}`
      : 'No significant social needs self-reported';

    return {
      ...patientContext,
      sdohSelfReported: selfReported,
      sdohNeedsIdentified: needsIdentified,
    };
  }
}

export const aiService = new AIService();
export default aiService;
