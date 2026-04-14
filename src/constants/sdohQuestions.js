// SDOH Self-Screening Questions
// Based on PRAPARE (Protocol for Responding to and Assessing Patients' Assets, Risks, and Experiences)
// and AHC Health-Related Social Needs screening tool

export const SDOH_QUESTIONS = [
  {
    id: 'food_security',
    category: 'Food Security',
    icon: '🥗',
    question: 'In the past year, how often have you worried about having enough food for you or your family?',
    options: [
      { label: 'Never', value: 0 },
      { label: 'Sometimes', value: 1 },
      { label: 'Often', value: 2 },
    ],
    loincCode: '88122-7',
    riskThreshold: 1, // value >= this is considered a social need
  },
  {
    id: 'housing',
    category: 'Housing',
    icon: '🏠',
    question: 'Are you worried about losing your housing or do you feel your housing is unsafe or unstable?',
    options: [
      { label: 'No', value: 0 },
      { label: 'Somewhat', value: 1 },
      { label: 'Yes', value: 2 },
    ],
    loincCode: '71802-3',
    riskThreshold: 1,
  },
  {
    id: 'transportation',
    category: 'Transportation',
    icon: '🚗',
    question: 'In the past year, has lack of transportation kept you from medical appointments, getting medications, or other needs?',
    options: [
      { label: 'Never', value: 0 },
      { label: 'Occasionally', value: 1 },
      { label: 'Frequently', value: 2 },
    ],
    loincCode: '93030-5',
    riskThreshold: 1,
  },
  {
    id: 'social_support',
    category: 'Social Support',
    icon: '🤝',
    question: 'How often do you feel you have people you can count on for support (family, friends, or community)?',
    options: [
      { label: 'Usually or always', value: 0 },
      { label: 'Sometimes', value: 1 },
      { label: 'Rarely or never', value: 2 },
    ],
    loincCode: '76506-5',
    riskThreshold: 1,
  },
  {
    id: 'financial_strain',
    category: 'Financial Strain',
    icon: '💰',
    question: 'How hard is it for you to pay for basic needs like housing, food, medicine, and childcare?',
    options: [
      { label: 'Not hard at all', value: 0 },
      { label: 'Somewhat hard', value: 1 },
      { label: 'Very hard', value: 2 },
    ],
    loincCode: '82589-3',
    riskThreshold: 1,
  },
  {
    id: 'stress',
    category: 'Stress & Mental Wellbeing',
    icon: '🧘',
    question: 'Over the past 2 weeks, how often have you felt overwhelmed by stress or anxiety?',
    options: [
      { label: 'Not at all', value: 0 },
      { label: 'Some days', value: 1 },
      { label: 'More than half the days', value: 2 },
    ],
    loincCode: '69737-5',
    riskThreshold: 1,
  },
];

// Epic FHIR SDOH data that can be pulled
export const EPIC_SDOH_FHIR_SOURCES = {
  observations: [
    {
      category: 'social-history',
      description: 'Social history observations (smoking, alcohol, housing, employment)',
      loincExamples: ['72166-2', '11367-0', '63586-2', '67875-5'],
    },
    {
      category: 'survey',
      description: 'Validated screening tools (PRAPARE, AHC HRSN, PHQ-2/9, AUDIT)',
      loincExamples: ['93025-5', '96777-8', '44249-1', '55757-9'],
    },
  ],
  conditions: {
    description: 'ICD-10 Z-codes for social determinants',
    zCodeRanges: [
      { range: 'Z55', description: 'Problems related to education and literacy' },
      { range: 'Z56', description: 'Problems related to employment and unemployment' },
      { range: 'Z57', description: 'Occupational exposure to risk factors' },
      { range: 'Z59', description: 'Problems related to housing and economic circumstances' },
      { range: 'Z60', description: 'Problems related to social environment' },
      { range: 'Z62', description: 'Problems related to upbringing' },
      { range: 'Z63', description: 'Other problems related to primary support group' },
      { range: 'Z64', description: 'Problems related to certain psychosocial circumstances' },
      { range: 'Z65', description: 'Problems related to other psychosocial circumstances' },
    ],
  },
};
