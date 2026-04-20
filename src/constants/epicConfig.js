import * as AuthSession from 'expo-auth-session';

// ---------------------------------------------------------------------------
// Epic SMART on FHIR – Sandbox Configuration
// Register your app at https://fhir.epic.com/Developer/Apps to get a clientId.
// ---------------------------------------------------------------------------

export const CLIENT_ID = '815f9183-d3e0-4a79-8662-047d8f359e31';

export const EPIC_ENDPOINTS = {
  authorization: 'https://fhir.epic.com/interconnect-fhir-oauth/oauth2/authorize',
  token:         'https://fhir.epic.com/interconnect-fhir-oauth/oauth2/token',
};

export const FHIR_BASE_URL =
  'https://fhir.epic.com/interconnect-fhir-oauth/api/FHIR/R4';

// makeRedirectUri picks the right URI for each platform automatically:
//   – Expo Go / dev build (Android/iOS):  exp+healthview://expo-development-client/...
//   – Standalone Android build:           healthview://callback
//   – Web:                                http://localhost:8081  (or production origin)
export const REDIRECT_URI = AuthSession.makeRedirectUri({
  scheme: 'healthview',
  path: 'callback',
});

console.log('[HealthView] OAuth Redirect URI:', REDIRECT_URI);

export const SCOPES = [
  'openid',
  'launch/patient',
  'patient/Patient.read',
  'patient/Condition.read',
  'patient/Observation.read',
  'patient/Immunization.read',
  'patient/AllergyIntolerance.read',
  'patient/Encounter.read',
  'patient/MedicationRequest.read',
  'patient/MedicationDispense.read',
  'patient/Procedure.read',
  'patient/DocumentReference.read',
  'patient/CarePlan.read',
];

// ---------------------------------------------------------------------------
// Sandbox test patients (Epic open sandbox)
// ---------------------------------------------------------------------------
export const SANDBOX_TEST_USERS = [
  {
    name: 'Jason Argonaut',
    username: 'fhirjason',
    password: 'epicepic1',
    description: 'Best for medication AI summaries and refill history',
    initials: 'JA',
    gradient: 'blue',
  },
  {
    name: 'Derrick Lin',
    username: 'fhirderrick',
    password: 'epicepic1',
    description: 'Best for care gap AI summaries (older male, heart conditions)',
    initials: 'DL',
    gradient: 'teal',
  },
];
