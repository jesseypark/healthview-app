// FHIR Service - Handles all Epic FHIR API calls

import { FHIR_BASE_URL } from '../constants/epicConfig';

class FHIRService {
  constructor() {
    this.accessToken = null;
    this.patientId = null;
  }

  // Set the access token after OAuth completes
  setAccessToken(token) {
    this.accessToken = token;
  }

  // Set the patient ID from the OAuth response
  setPatientId(patientId) {
    this.patientId = patientId;
  }

  // Generic FHIR fetch with authorization
  async fhirFetch(endpoint, options = {}) {
    if (!this.accessToken) {
      throw new Error('No access token. Please authenticate first.');
    }

    const url = `${FHIR_BASE_URL}${endpoint}`;
    
    const response = await fetch(url, {
      ...options,
      headers: {
        'Authorization': `Bearer ${this.accessToken}`,
        'Accept': 'application/fhir+json',
        ...options.headers,
      },
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`FHIR request failed: ${response.status} - ${errorText}`);
    }

    return response.json();
  }

  // Fetch the authenticated patient's demographics
  async getPatient() {
    if (!this.patientId) {
      throw new Error('No patient ID available.');
    }
    return this.fhirFetch(`/Patient/${this.patientId}`);
  }

  // Fetch patient's conditions — Epic requires category filter for "Encounter Diagnosis" subtype
  async getConditions() {
    const bundle = await this.fhirFetch(`/Condition?patient=${this.patientId}&category=encounter-diagnosis`);
    return this.extractResources(bundle);
  }

  // Fetch patient's lab observations — Epic requires category filter for "Labs" subtype
  async getObservations() {
    const bundle = await this.fhirFetch(`/Observation?patient=${this.patientId}&category=laboratory`);
    return this.extractResources(bundle);
  }

  // Fetch patient's immunizations
  async getImmunizations() {
    const bundle = await this.fhirFetch(`/Immunization?patient=${this.patientId}`);
    return this.extractResources(bundle);
  }

  // Fetch patient's allergies
  async getAllergyIntolerances() {
    const bundle = await this.fhirFetch(`/AllergyIntolerance?patient=${this.patientId}`);
    return this.extractResources(bundle);
  }

  // Fetch active medication requests
  async getMedications() {
    const bundle = await this.fhirFetch(`/MedicationRequest?patient=${this.patientId}&status=active`);
    return this.extractResources(bundle);
  }

  // Fetch inpatient encounters (IMP class = inpatient, EMER = emergency), most recent first
  async getEncounters() {
    const bundle = await this.fhirFetch(
      `/Encounter?patient=${this.patientId}&_sort=-date&_count=20`
    );
    const all = this.extractResources(bundle);
    // Filter to inpatient / emergency stays that have a discharge (period.end exists)
    return all.filter(enc => {
      const classCode = enc.class?.code;
      return (classCode === 'IMP' || classCode === 'EMER' || classCode === 'ACUTE') && enc.period?.end;
    });
  }

  // Fetch completed procedures
  async getProcedures() {
    const bundle = await this.fhirFetch(`/Procedure?patient=${this.patientId}&status=completed`);
    return this.extractResources(bundle);
  }

  // Fetch discharge summary documents (LOINC 18842-5) and any clinical notes
  async getDocumentReferences() {
    const bundle = await this.fhirFetch(
      `/DocumentReference?patient=${this.patientId}&type=18842-5&_sort=-date&_count=10`
    );
    return this.extractResources(bundle);
  }

  // Fetch active care plans
  async getCarePlans() {
    const bundle = await this.fhirFetch(
      `/CarePlan?patient=${this.patientId}&status=active`
    );
    return this.extractResources(bundle);
  }

  // Helper: extract a human-readable medication name from a MedicationRequest
  getMedicationName(med) {
    return (
      med.medicationCodeableConcept?.text ||
      med.medicationCodeableConcept?.coding?.[0]?.display ||
      med.medicationReference?.display ||
      'Unknown Medication'
    );
  }

  // Helper: extract dosage instruction text from a MedicationRequest
  getMedicationDosage(med) {
    const instr = med.dosageInstruction?.[0];
    if (!instr) return null;
    return instr.text || instr.patientInstruction || null;
  }

  // Fetch SDOH data — social-history and survey category observations + Z-code conditions
  async getSDOHData() {
    const [socialHistoryResult, surveyResult, conditionsAllResult] = await Promise.allSettled([
      this.fhirFetch(`/Observation?patient=${this.patientId}&category=social-history`).then(b => this.extractResources(b)),
      this.fhirFetch(`/Observation?patient=${this.patientId}&category=survey`).then(b => this.extractResources(b)),
      this.fhirFetch(`/Condition?patient=${this.patientId}`).then(b => this.extractResources(b)),
    ]);

    const settled = (result) => (result.status === 'fulfilled' ? result.value : []);

    const socialHistory = settled(socialHistoryResult);
    const surveys = settled(surveyResult);
    const allConditions = settled(conditionsAllResult);

    // Filter conditions for Z-codes (Z55-Z65 = social determinants)
    const zCodeConditions = allConditions.filter(c => {
      const codes = c.code?.coding ?? [];
      return codes.some(coding => /^Z[56][0-9]/.test(coding.code || ''));
    });

    return {
      socialHistory,
      surveys,
      zCodeConditions,
    };
  }

  // Fetch all patient data at once — uses allSettled so one failure doesn't block the rest
  async getAllPatientData() {
    const patient = await this.getPatient();

    const [conditionsResult, observationsResult, immunizationsResult, allergiesResult, sdohResult, medicationsResult, proceduresResult] =
      await Promise.allSettled([
        this.getConditions(),
        this.getObservations(),
        this.getImmunizations(),
        this.getAllergyIntolerances(),
        this.getSDOHData(),
        this.getMedications(),
        this.getProcedures(),
      ]);

    const settled = (result) => (result.status === 'fulfilled' ? result.value : []);
    const settledObj = (result) => (result.status === 'fulfilled' ? result.value : { socialHistory: [], surveys: [], zCodeConditions: [] });

    return {
      patient,
      conditions:    settled(conditionsResult),
      observations:  settled(observationsResult),
      immunizations: settled(immunizationsResult),
      allergies:     settled(allergiesResult),
      sdoh:          settledObj(sdohResult),
      medications:   settled(medicationsResult),
      procedures:    settled(proceduresResult),
    };
  }

  // Extract resources from a FHIR Bundle
  extractResources(bundle) {
    if (!bundle || !bundle.entry) {
      return [];
    }
    return bundle.entry.map(entry => entry.resource).filter(Boolean);
  }

  // Fetch provider phone from patient's generalPractitioner reference
  async getProviderPhone(patient) {
    try {
      const ref = patient?.generalPractitioner?.[0]?.reference;
      if (!ref) return null;
      const practitioner = await this.fhirFetch(`/${ref}`);
      return practitioner?.telecom?.find(t => t.system === 'phone')?.value ?? null;
    } catch {
      return null;
    }
  }

  // Helper: Get patient's age from birthDate
  calculateAge(birthDateString) {
    const birthDate = new Date(birthDateString);
    const today = new Date();
    let age = today.getFullYear() - birthDate.getFullYear();
    const monthDiff = today.getMonth() - birthDate.getMonth();
    
    if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
      age--;
    }
    
    return age;
  }

  // Helper: Get patient's gender
  getGender(patient) {
    return patient?.gender?.toLowerCase() || 'unknown';
  }

  // Helper: Check if a code matches any in a list
  codeMatches(resourceCoding, targetCodes) {
    if (!resourceCoding || !Array.isArray(resourceCoding)) {
      return false;
    }

    for (const coding of resourceCoding) {
      for (const target of targetCodes) {
        if (coding.code === target.code) {
          // Optionally check system too for stricter matching
          // if (coding.system === target.system) {
          return true;
        }
      }
    }
    return false;
  }

  // Helper: Check if a resource is within the lookback period
  isWithinLookback(dateString, lookbackMonths) {
    if (!dateString) return false;
    
    const resourceDate = new Date(dateString);
    const cutoffDate = new Date();
    cutoffDate.setMonth(cutoffDate.getMonth() - lookbackMonths);
    
    return resourceDate >= cutoffDate;
  }

  // Helper: Get the most recent resource matching criteria
  getMostRecent(resources, codes, lookbackMonths) {
    const matching = resources.filter(resource => {
      // Get the coding array from the resource
      let coding = [];
      if (resource.code?.coding) {
        coding = resource.code.coding;
      } else if (resource.vaccineCode?.coding) {
        coding = resource.vaccineCode.coding;
      }

      // Check if code matches
      if (!this.codeMatches(coding, codes)) {
        return false;
      }

      // Get the date
      const dateField = resource.effectiveDateTime || 
                       resource.occurrenceDateTime || 
                       resource.performedDateTime ||
                       resource.performedPeriod?.start ||
                       resource.recordedDate;

      // Check if within lookback
      return this.isWithinLookback(dateField, lookbackMonths);
    });

    // Sort by date descending and return most recent
    matching.sort((a, b) => {
      const dateA = new Date(a.effectiveDateTime || a.occurrenceDateTime || a.performedDateTime || a.recordedDate);
      const dateB = new Date(b.effectiveDateTime || b.occurrenceDateTime || b.performedDateTime || b.recordedDate);
      return dateB - dateA;
    });

    return matching[0] || null;
  }

  // Format a FHIR date for display
  formatDate(dateString) {
    if (!dateString) return 'Unknown date';
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
  }
}

// Export singleton instance
export const fhirService = new FHIRService();
export default fhirService;
