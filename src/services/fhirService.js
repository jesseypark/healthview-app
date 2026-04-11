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

  // Fetch all patient data at once — uses allSettled so one failure doesn't block the rest
  async getAllPatientData() {
    const patient = await this.getPatient();

    const [conditionsResult, observationsResult, immunizationsResult, allergiesResult] =
      await Promise.allSettled([
        this.getConditions(),
        this.getObservations(),
        this.getImmunizations(),
        this.getAllergyIntolerances(),
      ]);

    const settled = (result) => (result.status === 'fulfilled' ? result.value : []);

    return {
      patient,
      conditions:    settled(conditionsResult),
      observations:  settled(observationsResult),
      immunizations: settled(immunizationsResult),
      allergies:     settled(allergiesResult),
    };
  }

  // Extract resources from a FHIR Bundle
  extractResources(bundle) {
    if (!bundle || !bundle.entry) {
      return [];
    }
    return bundle.entry.map(entry => entry.resource).filter(Boolean);
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
