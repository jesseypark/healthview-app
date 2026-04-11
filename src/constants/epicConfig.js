import * as AuthSession from 'expo-auth-session';

// ---------------------------------------------------------------------------
// Epic SMART on FHIR – Sandbox Configuration
// Register your app at https://fhir.epic.com/Developer/Apps to get a clientId.
// ---------------------------------------------------------------------------

export const CLIENT_ID = 'ff7695f5-cef2-4c7e-9c14-e1bcab631eb4';

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
];

// ---------------------------------------------------------------------------
// Sandbox test patients (Epic open sandbox)
// ---------------------------------------------------------------------------
export const SANDBOX_TEST_USERS = [
  {
    name: 'Camila Lopez',
    username: 'fhircamila',
    password: 'epicepic1',
    description: 'Adult female with diabetes, hypertension',
  },
  {
    name: 'Derrick Lin',
    username: 'fhirderrick',
    password: 'epicepic1',
    description: 'Adult male with various conditions',
  },
  {
    name: 'Timmy Smart',
    username: 'fhirtimmy',
    password: 'epicepic1',
    description: 'Pediatric patient',
  },
];
