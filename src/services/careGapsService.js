// Care Gaps Service - Analyzes patient data against quality measures

import { QUALITY_MEASURES, MEASURE_STATUS } from '../constants/qualityMeasures';
import fhirService from './fhirService';

class CareGapsService {
  // Analyze all quality measures for a patient
  analyzeAllMeasures(patientData) {
    const { patient, conditions, observations, immunizations, procedures } = patientData;
    
    const results = [];
    
    for (const [measureKey, measure] of Object.entries(QUALITY_MEASURES)) {
      const result = this.analyzeMeasure(
        measure,
        patient,
        conditions,
        observations,
        immunizations,
        procedures
      );
      results.push(result);
    }
    
    return results;
  }

  // Analyze a single quality measure
  analyzeMeasure(measure, patient, conditions, observations, immunizations, procedures) {
    // Check eligibility first
    const eligibility = this.checkEligibility(measure, patient, conditions);
    
    if (!eligibility.isEligible) {
      return {
        measure,
        status: MEASURE_STATUS.NOT_APPLICABLE,
        reason: eligibility.reason,
        lastCompleted: null,
        details: null,
      };
    }

    // Determine which resources to check based on the measure
    let resources;
    switch (measure.fhirCriteria.resourceType) {
      case 'Immunization':
        resources = immunizations;
        break;
      case 'Observation':
        resources = observations;
        break;
      case 'Procedure':
        resources = procedures;
        break;
      default:
        resources = [];
    }

    // Find the most recent matching resource
    const mostRecent = fhirService.getMostRecent(
      resources,
      measure.fhirCriteria.codes,
      measure.fhirCriteria.lookbackMonths
    );

    if (mostRecent) {
      // Get the date from the resource
      const completedDate = mostRecent.effectiveDateTime || 
                           mostRecent.occurrenceDateTime || 
                           mostRecent.performedDateTime ||
                           mostRecent.performedPeriod?.start ||
                           mostRecent.recordedDate;

      // Extract value if it's an observation
      let value = null;
      if (mostRecent.valueQuantity) {
        value = `${mostRecent.valueQuantity.value} ${mostRecent.valueQuantity.unit || ''}`;
      } else if (mostRecent.valueString) {
        value = mostRecent.valueString;
      }

      return {
        measure,
        status: MEASURE_STATUS.COMPLETE,
        reason: `Completed on ${fhirService.formatDate(completedDate)}`,
        lastCompleted: completedDate,
        value,
        details: this.extractResourceDetails(mostRecent),
      };
    }

    // No matching resource found - determine if due or overdue
    const status = this.determineDueStatus(measure);

    return {
      measure,
      status,
      reason: this.getDueReason(measure, status),
      lastCompleted: null,
      details: null,
    };
  }

  // Check if patient is eligible for a measure
  checkEligibility(measure, patient, conditions) {
    const { eligibility } = measure;

    // Check age
    const age = fhirService.calculateAge(patient.birthDate);
    if (age < eligibility.minAge || age > eligibility.maxAge) {
      return {
        isEligible: false,
        reason: `Age ${age} is outside the ${eligibility.minAge}-${eligibility.maxAge} range for this measure`,
      };
    }

    // Check gender
    const gender = fhirService.getGender(patient);
    if (eligibility.gender !== 'all' && gender !== eligibility.gender) {
      return {
        isEligible: false,
        reason: `This measure applies to ${eligibility.gender} patients`,
      };
    }

    // Check required conditions (if any)
    if (eligibility.conditions && eligibility.conditions.length > 0) {
      const hasRequiredCondition = this.patientHasCondition(conditions, eligibility.conditions);
      if (!hasRequiredCondition) {
        return {
          isEligible: false,
          reason: 'Patient does not have the required diagnosis for this measure',
        };
      }
    }

    return { isEligible: true, reason: null };
  }

  // Check if patient has any of the specified conditions
  patientHasCondition(conditions, requiredConditions) {
    for (const condition of conditions) {
      const coding = condition.code?.coding || [];
      for (const code of coding) {
        for (const required of requiredConditions) {
          if (code.code === required.code) {
            return true;
          }
        }
      }
    }
    return false;
  }

  // Determine if a measure is due or overdue
  determineDueStatus(measure) {
    // For simplicity, we'll consider it DUE if no record found
    // In a real app, you'd check when the last one was done
    // even if outside the lookback period
    return MEASURE_STATUS.DUE;
  }

  // Get a human-readable reason for why measure is due
  getDueReason(measure, status) {
    if (status === MEASURE_STATUS.OVERDUE) {
      return `This ${measure.shortName} is overdue. Last one was over ${measure.fhirCriteria.lookbackMonths} months ago.`;
    }
    return `No ${measure.shortName} found in your records. This is recommended ${measure.frequency}.`;
  }

  // Extract displayable details from a FHIR resource
  extractResourceDetails(resource) {
    const details = {
      display: '',
      date: '',
      value: null,
    };

    // Get display name
    if (resource.code?.coding?.[0]?.display) {
      details.display = resource.code.coding[0].display;
    } else if (resource.vaccineCode?.coding?.[0]?.display) {
      details.display = resource.vaccineCode.coding[0].display;
    }

    // Get date
    const dateField = resource.effectiveDateTime || 
                     resource.occurrenceDateTime || 
                     resource.performedDateTime ||
                     resource.performedPeriod?.start ||
                     resource.recordedDate;
    details.date = fhirService.formatDate(dateField);

    // Get value (for observations)
    if (resource.valueQuantity) {
      details.value = {
        value: resource.valueQuantity.value,
        unit: resource.valueQuantity.unit || '',
        formatted: `${resource.valueQuantity.value} ${resource.valueQuantity.unit || ''}`,
      };
    }

    // Get interpretation if available
    if (resource.interpretation?.[0]?.coding?.[0]?.display) {
      details.interpretation = resource.interpretation[0].coding[0].display;
    }

    return details;
  }

  // Get summary statistics
  getSummary(measureResults) {
    const complete = measureResults.filter(r => r.status === MEASURE_STATUS.COMPLETE).length;
    const due = measureResults.filter(r => r.status === MEASURE_STATUS.DUE).length;
    const overdue = measureResults.filter(r => r.status === MEASURE_STATUS.OVERDUE).length;
    const notApplicable = measureResults.filter(r => r.status === MEASURE_STATUS.NOT_APPLICABLE).length;
    const total = measureResults.length - notApplicable;

    return {
      complete,
      due,
      overdue,
      notApplicable,
      total,
      percentComplete: total > 0 ? Math.round((complete / total) * 100) : 0,
    };
  }

  // Sort results by priority (overdue first, then due, then complete)
  sortByPriority(measureResults) {
    const priority = {
      [MEASURE_STATUS.OVERDUE]: 0,
      [MEASURE_STATUS.DUE]: 1,
      [MEASURE_STATUS.COMPLETE]: 2,
      [MEASURE_STATUS.NOT_APPLICABLE]: 3,
      [MEASURE_STATUS.UNKNOWN]: 4,
    };

    return [...measureResults].sort((a, b) => priority[a.status] - priority[b.status]);
  }
}

export const careGapsService = new CareGapsService();
export default careGapsService;
