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
    const prompt = this.buildCareGapPrompt(measureResult, patientContext);
    return this.generateResponse(prompt);
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
    
    return `You are a helpful health assistant explaining preventive care to a patient. Be warm, clear, and encouraging. Avoid medical jargon.

Patient context:
- Age: ${patientContext.age}
- Gender: ${patientContext.gender}
- Relevant conditions: ${patientContext.conditions.join(', ') || 'None noted'}

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
  buildPatientContext(patient, conditions) {
    const age = new Date().getFullYear() - new Date(patient.birthDate).getFullYear();
    const gender = patient.gender || 'unknown';
    
    const conditionNames = conditions
      .map(c => c.code?.coding?.[0]?.display)
      .filter(Boolean);

    return {
      age,
      gender,
      conditions: conditionNames,
    };
  }
}

export const aiService = new AIService();
export default aiService;
