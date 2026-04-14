# PROJECT_MAP — HealthView

## What This App Is

A React Native (Expo) patient-facing health dashboard. It authenticates with Epic via SMART on FHIR (OAuth 2.0 + PKCE), fetches the patient's clinical data from the Epic FHIR R4 API, analyzes it against preventive care quality measures, and presents care gaps with AI-powered plain-language explanations. Built as a portfolio project.

## Tech Stack

| Layer | Choice |
|---|---|
| Framework | React Native 0.81.5 via Expo 54 |
| Navigation | React Navigation v7 (native stack) |
| Auth | expo-auth-session (PKCE flow) |
| FHIR API | Epic open sandbox — `fhir.epic.com/interconnect-fhir-oauth/api/FHIR/R4` |
| AI | Anthropic Claude API (`claude-sonnet-4-20250514`) — direct from client |
| Language | JavaScript (no TypeScript) |
| Tests | None |

---

## File Tree

```
healthview-app/
├── App.js                          # Root: NavigationContainer + stack screens
├── CLAUDE.md                       # Claude session instructions
├── docs/                           # Project documentation (this folder)
│   ├── PROJECT_MAP.md
│   ├── DECISIONS.md
│   └── HANDOFF.md
├── src/
│   ├── constants/
│   │   ├── epicConfig.js           # OAuth endpoints, client ID, scopes, REDIRECT_URI, sandbox test users
│   │   ├── qualityMeasures.js      # QUALITY_MEASURES map + MEASURE_STATUS enum + getStatusDisplay()
│   │   └── sdohQuestions.js        # SDOH_QUESTIONS array (6 questions, PRAPARE/AHC-based) + EPIC_SDOH_FHIR_SOURCES
│   ├── services/
│   │   ├── oauthService.js         # OAuth 2.0 PKCE flow; authenticate(), refresh, logout, isAuthenticated()
│   │   ├── fhirService.js          # All Epic FHIR calls; singleton; holds accessToken + patientId after login
│   │   ├── careGapsService.js      # Analyzes patientData against QUALITY_MEASURES; returns scored results
│   │   └── aiService.js            # Claude API calls; builds prompts; has fallback if no API key
│   ├── screens/
│   │   ├── LoginScreen.js          # Entry point; triggers OAuth; shows sandbox credentials + debug URI
│   │   ├── DashboardScreen.js      # Main screen; fetches all data; renders care gaps + quick-access cards
│   │   ├── SDOHScreen.js           # Modal; 6-question SDOH self-screen; returns result via route.params.onComplete
│   │   ├── MedicationsScreen.js    # Active MedicationRequests; per-med expand with AI explanation + refill button
│   │   └── DischargeScreen.js      # Inpatient encounters + post-discharge checklist (interactive)
│   └── components/
│       ├── SummaryHeader.js        # Preventive care score card (% complete, stat counters)
│       └── CareGapCard.js          # Expandable card per quality measure; fetches AI explanation on expand
```

---

## Navigation Stack

```
Login  →  Dashboard  →  Medications
                     →  Discharge
                     ↑  SDOH (modal, presented over Dashboard)
```

- `Login` uses `navigation.replace('Dashboard')` — no back button after login
- `SDOH` is a modal (`presentation: 'modal'`) and communicates back via `route.params.onComplete` callback
- `Medications` and `Discharge` receive `patientContext` and `providerPhone` as navigation params from Dashboard

---

## Data Flow

```
LoginScreen
  └── oauthService.authenticate()
        └── sets fhirService.accessToken + fhirService.patientId

DashboardScreen (on mount)
  └── fhirService.getAllPatientData()
        ├── Patient, Condition, Observation, Immunization, AllergyIntolerance
        ├── MedicationRequest (active)
        └── SDOH (social-history obs + survey obs + Z-code conditions)
  └── careGapsService.analyzeAllMeasures(data)
  └── aiService.buildPatientContext(patient, conditions, sdoh)
  └── fhirService.getProviderPhone(patient)

MedicationsScreen (on mount, independent)
  └── fhirService.getMedications()

DischargeScreen (on mount, independent)
  └── fhirService.getEncounters() + fhirService.getMedications() (parallel)
```

---

## Key Constants

- **Client ID**: `ff7695f5-cef2-4c7e-9c14-e1bcab631eb4` (registered in Epic dev portal)
- **Sandbox patients**: Camila Lopez (`fhircamila`), Derrick Lin (`fhirderrick`), Timmy Smart (`fhirtimmy`) — all password `epicepic1`
- **Quality measures tracked**: Flu Shot, Colorectal Screening, Breast Cancer Screening, HbA1c, Blood Pressure

---

## FHIR Resources Used

| Resource | Endpoint / Params | Used For |
|---|---|---|
| Patient | `/Patient/{id}` | Demographics, generalPractitioner ref |
| Condition | `?patient=&category=encounter-diagnosis` | Care gap eligibility; also unfiltered for Z-codes |
| Observation | `?patient=&category=laboratory` | HbA1c, BP checks |
| Observation | `?patient=&category=social-history` | SDOH FHIR data |
| Observation | `?patient=&category=survey` | SDOH screening surveys |
| Immunization | `?patient=` | Flu shot |
| AllergyIntolerance | `?patient=` | (fetched, not yet surfaced in UI) |
| MedicationRequest | `?patient=&status=active` | Medications screen |
| Encounter | `?patient=&_sort=-date&_count=20` | Discharge screen (filtered client-side for IMP/EMER) |
| Practitioner | `/{ref}` (from generalPractitioner) | Provider phone number |
