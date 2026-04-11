// Quality Measures Configuration
// Based on HEDIS, CMS, and preventive care guidelines

export const QUALITY_MEASURES = {
  FLU_SHOT: {
    id: 'flu-shot',
    name: 'Annual Flu Vaccination',
    shortName: 'Flu Shot',
    description: 'Annual influenza vaccination is recommended for all adults.',
    whyItMatters: 'The flu kills tens of thousands of Americans each year. Vaccination reduces your risk of flu illness, hospitalization, and death. It also protects people around you who may be more vulnerable.',
    frequency: 'Annual (during flu season: Sept-March)',
    
    // Who this measure applies to
    eligibility: {
      minAge: 6, // months, but we'll use years for simplicity
      maxAge: 150,
      gender: 'all',
      conditions: [], // Applies to everyone
    },
    
    // FHIR codes to look for
    fhirCriteria: {
      resourceType: 'Immunization',
      // CVX codes for influenza vaccines
      codes: [
        { system: 'http://hl7.org/fhir/sid/cvx', code: '140', display: 'Influenza, seasonal, injectable, preservative free' },
        { system: 'http://hl7.org/fhir/sid/cvx', code: '141', display: 'Influenza, seasonal, injectable' },
        { system: 'http://hl7.org/fhir/sid/cvx', code: '150', display: 'Influenza, injectable, quadrivalent, preservative free' },
        { system: 'http://hl7.org/fhir/sid/cvx', code: '155', display: 'Influenza, recombinant, injectable, preservative free' },
        { system: 'http://hl7.org/fhir/sid/cvx', code: '158', display: 'Influenza, injectable, quadrivalent' },
        { system: 'http://hl7.org/fhir/sid/cvx', code: '161', display: 'Influenza, injectable, quadrivalent, preservative free, pediatric' },
        { system: 'http://hl7.org/fhir/sid/cvx', code: '171', display: 'Influenza, injectable, MDCK, preservative free, quadrivalent' },
        { system: 'http://hl7.org/fhir/sid/cvx', code: '185', display: 'Influenza, recombinant, quadrivalent, injectable, preservative free' },
        { system: 'http://hl7.org/fhir/sid/cvx', code: '186', display: 'Influenza, injectable, MDCK, quadrivalent, preservative' },
        { system: 'http://hl7.org/fhir/sid/cvx', code: '197', display: 'Influenza, high-dose, quadrivalent' },
        { system: 'http://hl7.org/fhir/sid/cvx', code: '205', display: 'Influenza, adjuvanted, quadrivalent' },
      ],
      // How recent must the immunization be?
      lookbackMonths: 12,
    },
  },

  COLORECTAL_SCREENING: {
    id: 'colorectal-screening',
    name: 'Colorectal Cancer Screening',
    shortName: 'Colonoscopy',
    description: 'Screening for colorectal cancer via colonoscopy, FIT test, or other approved methods.',
    whyItMatters: 'Colorectal cancer is the 3rd leading cause of cancer death in the US, but it\'s highly preventable. Screening finds polyps before they become cancer. When caught early, the 5-year survival rate is over 90%.',
    frequency: 'Colonoscopy every 10 years, or FIT test annually',
    
    eligibility: {
      minAge: 45,
      maxAge: 75,
      gender: 'all',
      conditions: [],
    },
    
    fhirCriteria: {
      resourceType: 'Procedure',
      codes: [
        // CPT codes for colonoscopy
        { system: 'http://www.ama-assn.org/go/cpt', code: '44388', display: 'Colonoscopy with biopsy' },
        { system: 'http://www.ama-assn.org/go/cpt', code: '44389', display: 'Colonoscopy with polypectomy' },
        { system: 'http://www.ama-assn.org/go/cpt', code: '44390', display: 'Colonoscopy with removal of foreign body' },
        { system: 'http://www.ama-assn.org/go/cpt', code: '44391', display: 'Colonoscopy with control of bleeding' },
        { system: 'http://www.ama-assn.org/go/cpt', code: '44392', display: 'Colonoscopy with polypectomy' },
        { system: 'http://www.ama-assn.org/go/cpt', code: '45378', display: 'Colonoscopy, diagnostic' },
        { system: 'http://www.ama-assn.org/go/cpt', code: '45380', display: 'Colonoscopy with biopsy' },
        { system: 'http://www.ama-assn.org/go/cpt', code: '45381', display: 'Colonoscopy with submucosal injection' },
        { system: 'http://www.ama-assn.org/go/cpt', code: '45382', display: 'Colonoscopy with control of bleeding' },
        { system: 'http://www.ama-assn.org/go/cpt', code: '45384', display: 'Colonoscopy with polypectomy' },
        { system: 'http://www.ama-assn.org/go/cpt', code: '45385', display: 'Colonoscopy with polypectomy' },
        // SNOMED codes
        { system: 'http://snomed.info/sct', code: '73761001', display: 'Colonoscopy' },
        { system: 'http://snomed.info/sct', code: '174158000', display: 'Colonoscopy and biopsy' },
      ],
      lookbackMonths: 120, // 10 years
    },
  },

  BREAST_CANCER_SCREENING: {
    id: 'breast-cancer-screening',
    name: 'Breast Cancer Screening',
    shortName: 'Mammogram',
    description: 'Mammogram screening for early detection of breast cancer.',
    whyItMatters: 'Breast cancer is the most common cancer in women. Mammograms can detect cancer before you can feel a lump—when it\'s most treatable. Early detection increases the 5-year survival rate to 99%.',
    frequency: 'Every 2 years for women 50-74',
    
    eligibility: {
      minAge: 50,
      maxAge: 74,
      gender: 'female',
      conditions: [],
    },
    
    fhirCriteria: {
      resourceType: 'Procedure',
      codes: [
        // CPT codes for mammography
        { system: 'http://www.ama-assn.org/go/cpt', code: '77065', display: 'Diagnostic mammography, unilateral' },
        { system: 'http://www.ama-assn.org/go/cpt', code: '77066', display: 'Diagnostic mammography, bilateral' },
        { system: 'http://www.ama-assn.org/go/cpt', code: '77067', display: 'Screening mammography, bilateral' },
        // SNOMED codes
        { system: 'http://snomed.info/sct', code: '24623002', display: 'Screening mammography' },
        { system: 'http://snomed.info/sct', code: '241055006', display: 'Mammography of breast' },
        { system: 'http://snomed.info/sct', code: '726551006', display: 'Digital breast tomosynthesis' },
      ],
      lookbackMonths: 27, // ~2 years with buffer
    },
  },

  HBA1C_TEST: {
    id: 'hba1c-test',
    name: 'Hemoglobin A1c Test',
    shortName: 'HbA1c',
    description: 'Blood test measuring average blood sugar over the past 2-3 months.',
    whyItMatters: 'For people with diabetes, A1c is the key measure of blood sugar control. Keeping A1c below 7% significantly reduces your risk of diabetes complications like nerve damage, kidney disease, and vision loss.',
    frequency: 'Every 6 months for diabetics, annually for prediabetics',
    
    eligibility: {
      minAge: 18,
      maxAge: 150,
      gender: 'all',
      // Only applies to people with diabetes or prediabetes
      conditions: [
        { system: 'http://snomed.info/sct', code: '44054006', display: 'Type 2 diabetes mellitus' },
        { system: 'http://snomed.info/sct', code: '46635009', display: 'Type 1 diabetes mellitus' },
        { system: 'http://snomed.info/sct', code: '15777000', display: 'Prediabetes' },
        { system: 'http://hl7.org/fhir/sid/icd-10-cm', code: 'E11', display: 'Type 2 diabetes mellitus' },
        { system: 'http://hl7.org/fhir/sid/icd-10-cm', code: 'E10', display: 'Type 1 diabetes mellitus' },
        { system: 'http://hl7.org/fhir/sid/icd-10-cm', code: 'R73.03', display: 'Prediabetes' },
      ],
    },
    
    fhirCriteria: {
      resourceType: 'Observation',
      codes: [
        // LOINC codes for HbA1c
        { system: 'http://loinc.org', code: '4548-4', display: 'Hemoglobin A1c/Hemoglobin.total in Blood' },
        { system: 'http://loinc.org', code: '4549-2', display: 'Hemoglobin A1c/Hemoglobin.total in Blood by Electrophoresis' },
        { system: 'http://loinc.org', code: '17856-6', display: 'Hemoglobin A1c/Hemoglobin.total in Blood by HPLC' },
        { system: 'http://loinc.org', code: '59261-8', display: 'Hemoglobin A1c/Hemoglobin.total in Blood by IFCC protocol' },
      ],
      lookbackMonths: 6,
    },
  },

  BLOOD_PRESSURE_CHECK: {
    id: 'blood-pressure-check',
    name: 'Blood Pressure Check',
    shortName: 'BP Check',
    description: 'Regular blood pressure monitoring to detect and manage hypertension.',
    whyItMatters: 'High blood pressure is called the "silent killer" because it often has no symptoms but dramatically increases your risk of heart attack and stroke. Regular monitoring helps catch problems early.',
    frequency: 'At least annually for adults, more often if elevated',
    
    eligibility: {
      minAge: 18,
      maxAge: 150,
      gender: 'all',
      conditions: [],
    },
    
    fhirCriteria: {
      resourceType: 'Observation',
      codes: [
        // LOINC codes for blood pressure
        { system: 'http://loinc.org', code: '85354-9', display: 'Blood pressure panel' },
        { system: 'http://loinc.org', code: '8480-6', display: 'Systolic blood pressure' },
        { system: 'http://loinc.org', code: '8462-4', display: 'Diastolic blood pressure' },
        { system: 'http://loinc.org', code: '8478-0', display: 'Mean blood pressure' },
      ],
      lookbackMonths: 12,
    },
  },
};

// Status types for care gaps
export const MEASURE_STATUS = {
  COMPLETE: 'complete',      // Measure has been met
  DUE: 'due',                // Measure is due now
  OVERDUE: 'overdue',        // Measure is past due
  NOT_APPLICABLE: 'na',      // Patient doesn't meet eligibility criteria
  UNKNOWN: 'unknown',        // Couldn't determine status
};

// Helper to get status display info
export const getStatusDisplay = (status) => {
  switch (status) {
    case MEASURE_STATUS.COMPLETE:
      return { icon: '✅', color: '#10B981', label: 'Complete' };
    case MEASURE_STATUS.DUE:
      return { icon: '⚠️', color: '#F59E0B', label: 'Due' };
    case MEASURE_STATUS.OVERDUE:
      return { icon: '🔴', color: '#EF4444', label: 'Overdue' };
    case MEASURE_STATUS.NOT_APPLICABLE:
      return { icon: '➖', color: '#6B7280', label: 'Not Applicable' };
    default:
      return { icon: '❓', color: '#6B7280', label: 'Unknown' };
  }
};
