// AI Service - Uses Claude API for health record explanations

// NOTE: In a production app, API calls should go through your backend
// to protect your API key. This is for demonstration purposes.

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
    const age = patientContext?.age ?? 'your';
    const isDue = status === 'due';
    const isOverdue = status === 'overdue';

    const sdohNeeds = patientContext?.sdohNeedsIdentified ?? [];
    let transportNote = '';
    if (sdohNeeds.includes('Transportation') && (isDue || isOverdue)) {
      transportNote = ' If transportation is a barrier, ask your provider about telehealth options or community transport assistance.';
    }

    if (isDue || isOverdue) {
      const urgency = isOverdue
        ? 'This is overdue — scheduling it soon is a priority.'
        : 'Now is a great time to get this done.';
      return `At age ${age}, ${measure.name.toLowerCase()} is recommended for you. ${measure.whyItMatters} ${urgency}${transportNote} Talk to your provider about scheduling this.`;
    }
    if (lastCompleted) {
      return `Great job staying on top of your health! You completed ${measure.name.toLowerCase()} on ${lastCompleted}. ${measure.whyItMatters} Keep it up!`;
    }
    return `You're current on ${measure.name.toLowerCase()}. ${measure.whyItMatters}`;
  }

  // Generate a plain-language explanation of a medication
  async explainMedication(medicationName, dosage, patientContext) {
    if (this.apiKey === 'YOUR_ANTHROPIC_API_KEY_HERE') {
      return this.buildFallbackMedicationExplanation(medicationName, dosage);
    }
    const prompt = this.buildMedicationPrompt(medicationName, dosage, patientContext);
    try {
      return await this.generateResponse(prompt);
    } catch {
      return this.buildFallbackMedicationExplanation(medicationName, dosage);
    }
  }

  buildFallbackMedicationExplanation(medicationName, dosage) {
    return `${medicationName} is a prescribed medication in your care plan.${dosage ? ` Take as directed: ${dosage}.` : ''} Talk to your provider or pharmacist if you have questions about this medication or need a refill.`;
  }

  buildMedicationPrompt(medicationName, dosage, patientContext) {
    return `You are a helpful health assistant explaining a medication to a patient. Be clear, reassuring, and avoid unnecessary alarm.

Patient context:
- Age: ${patientContext?.age ?? 'unknown'}
- Gender: ${patientContext?.gender ?? 'unknown'}
- Relevant conditions: ${patientContext?.conditions?.join(', ') || 'None noted'}

Medication: ${medicationName}
${dosage ? `Dosage instructions: ${dosage}` : ''}

Please provide:
1. A simple explanation of what this medication is commonly used for (1-2 sentences)
2. Any key tips for taking it correctly
3. When to contact their provider (refills, side effects, etc.)

Keep the total response under 120 words. Be warm and direct. Use "you" and "your" to speak directly to the patient.`;
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
