# HANDOFF — HealthView

Last updated: 2026-04-14

---

## Current State: What's Complete

### Core Auth & FHIR Pipeline
- SMART on FHIR OAuth 2.0 + PKCE flow via `expo-auth-session` — works end-to-end against Epic open sandbox
- Manual token exchange preserves Epic's `patient` field from the token response
- `fhirService` fetches: Patient, Condition, Observation (lab + social-history + survey), Immunization, AllergyIntolerance, MedicationRequest, Encounter, Practitioner (for provider phone)
- `Promise.allSettled` pattern throughout — partial failures don't break the UI

### Care Gaps Dashboard
- 5 quality measures implemented: Flu Shot, Colorectal Screening, Breast Cancer Screening, HbA1c, Blood Pressure
- Eligibility engine: age, gender, required conditions — gates before FHIR lookup
- Per-measure AI explanation (Claude API) triggered lazily on card expand; graceful fallback if no API key
- Care gaps sorted: OVERDUE → DUE → COMPLETE → N/A
- Summary header: % complete, counts by status

### SDOH
- 6-question self-screening questionnaire (PRAPARE/AHC-based, with LOINC codes)
- FHIR SDOH data pull: social-history observations, survey observations, Z-code conditions
- Self-reported needs merged into AI prompt context
- Dashboard banner prompts questionnaire completion; badge shown after

### Medications Screen (added 2026-04-13)
- Fetches active `MedicationRequest` resources
- Per-medication card: name, dosage, prescriber, authored date, refills allowed, validity end
- AI explanation per medication (lazy, on expand)
- "Request Refill" button calls provider phone via `tel:` deep link

### Post-Discharge Screen (added 2026-04-13)
- Fetches inpatient/emergency encounters with `period.end` (completed stays only)
- Most recent encounter auto-expands; shows admit/discharge dates, LOS, diagnoses, discharge disposition
- Cross-references active medications on the most recent discharge card
- Interactive post-discharge checklist (6 items, progress bar, tap to check off)
- Call provider button

### Navigation
- Login → Dashboard (replace, no back)
- Dashboard → Medications (push)
- Dashboard → Discharge (push)
- Dashboard → SDOH (modal)
- Quick-access cards on Dashboard for Medications and Discharge

---

## Known Issues & Incomplete Work

### `Procedure` resources never fetched
`careGapsService.analyzeAllMeasures()` references `procedures` from `patientData`, but `fhirService.getAllPatientData()` never fetches Procedure resources. This means **Colorectal Screening and Breast Cancer Screening will never show as COMPLETE** — the engine looks for CPT-coded Procedures but the array is always `undefined`. Fix: add `getProcedures()` to `fhirService` and include it in `getAllPatientData()`.

### OVERDUE status is never assigned
`careGapsService.determineDueStatus()` always returns `DUE`. OVERDUE is defined in the enum and handled in the UI but unreachable. A real implementation would need a second FHIR query without the lookback filter to find the most recent record outside the window.

### Token refresh not wired up
`oauthService` has `refreshAccessToken()` and `getValidAccessToken()` implemented, but `fhirService.fhirFetch()` uses `this.accessToken` directly without ever calling `getValidAccessToken()`. Tokens expire (Epic default: 3600s); a long session will silently fail with 401 errors. Fix: have `fhirFetch` call `oauthService.getValidAccessToken()` before each request.

### No token/session persistence
Tokens are held in memory only. Closing and reopening the app requires re-authentication. `expo-secure-store` is in `package.json` but unused. For a production app, store tokens in SecureStore and restore them on launch.

### SDOH questionnaire answers not persisted
Self-reported SDOH answers live in `DashboardScreen` state — lost on refresh or app restart. No persistence mechanism implemented.

### AI model ID may be stale
`aiService.js` hardcodes `claude-sonnet-4-20250514`. Verify this is still the correct model ID for the intended tier; update to the current model ID if needed.

### `AllergyIntolerance` fetched but never displayed
Allergy data is fetched in `getAllPatientData()` and returned in `data.allergies`, but no screen or component renders it.

### Several `aiService` methods are dead code
`explainLabResult()`, `generateHealthSummary()`, and `buildHealthSummaryPrompt()` are implemented but never called from any screen. Either wire them up or remove them.

### No error boundary or global error handling
Individual screens have try/catch and error states, but there's no React error boundary. An unhandled JS error in a component will crash the screen silently on native.

---

## Next Logical Features

1. **Fix Procedure fetching** — highest priority, unblocks two quality measures showing completion
2. **Appointment scheduling / follow-up screen** — fetch `Appointment` resources to surface upcoming follow-up visits in the Discharge screen
3. **Lab results screen** — `Observation?category=laboratory` is already fetched; surface it with AI explanations using the existing `explainLabResult()` method
4. **Medication history** — fetch `MedicationDispense` (scope already added) for dispense history alongside active requests
5. **Token refresh** — wire `oauthService.getValidAccessToken()` into `fhirService.fhirFetch()`
6. **SDOH write-back** — use self-reported answers + LOINC codes on `SDOH_QUESTIONS` to write Observation resources back to Epic (requires `patient/Observation.write` scope)
