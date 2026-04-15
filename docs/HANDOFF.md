# HANDOFF — HealthView

Last updated: 2026-04-15 (session 5)

---

## Current State: What's Complete

### Core Auth & FHIR Pipeline
- SMART on FHIR OAuth 2.0 + PKCE flow via `expo-auth-session` — works end-to-end against Epic open sandbox
- Manual token exchange preserves Epic's `patient` field from the token response
- `fhirService` fetches: Patient, Condition, Observation (lab + social-history + survey), Immunization, AllergyIntolerance, MedicationRequest, Procedure, Encounter, DocumentReference, CarePlan, Practitioner (for provider phone)
- `Promise.allSettled` pattern throughout — partial failures don't break the UI
- Registered scopes in Epic app portal: Patient (Demographics), Condition (Encounter Diagnosis), Condition (Problems), Observation (Labs), Observation (Social History), Observation (Assessments), Observation (SDOH Assessments), Observation (Outside Record SDOH Assessment), Observation (Outside Record Activities of Daily Living), Immunization (Patient Chart), AllergyIntolerance (Outside Record), Encounter (Patient Chart), MedicationRequest (Outside Record), MedicationRequest (Signed Medication Order), MedicationDispense (Fill Status), MedicationDispense (Outside Record), Procedure (Orders), DocumentReference (Clinical Notes), CarePlan (Encounter) — `Appointment.read` not available in Epic sandbox; `MedicationRequest (Patient Chart)` not available as a portal option

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
- 403 error state now shows a plain-language message directing the user to log out and re-authenticate

### Post-Discharge Screen (added 2026-04-13, updated session 2)
- Fetches inpatient/emergency encounters with `period.end` (completed stays only)
- Most recent encounter auto-expands; shows admit/discharge dates, LOS, diagnoses, discharge disposition
- Cross-references active medications on the most recent discharge card
- Discharge summary documents (`DocumentReference` LOINC 18842-5) listed if present
- Active care plans (`CarePlan`) listed if present
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

### MedicationRequest 403 — root cause confirmed (portal-side, not code)
Inspected the raw token response on 2026-04-15. Epic's granted `scope` field contains only: `patient/AllergyIntolerance.read patient/Condition.read patient/Immunization.read patient/Observation.read patient/Patient.read launch/patient openid`. Every scope added in session 3 (`MedicationRequest`, `MedicationDispense`, `Encounter`, `Procedure`, `DocumentReference`, `CarePlan`) is silently dropped at authorization. The Medications screen (and Discharge screen, which depends on `Encounter`/`DocumentReference`/`CarePlan`) will 403 until the grant includes these.

No code fix required. Resolution is Epic-portal-side:
1. Re-verify the scope checkboxes are saved on the live (not draft) app version at https://fhir.epic.com/Developer/Apps
2. Epic sandbox scope changes can take up to ~60 min to propagate to new tokens
3. Login via a fresh/incognito browser session to bypass any cached consent
4. Confirm the app's `client_id` matches the one in the token (`ff7695f5-cef2-4c7e-9c14-e1bcab631eb4`)

Re-auth after each change and inspect `[HealthView] Raw token response:` — success = the new scopes appear in the `scope` field.

### ~~`Procedure` resources never fetched~~ FIXED
`getProcedures()` added to `fhirService`; `procedures` now included in `getAllPatientData()`. Colorectal Screening and Breast Cancer Screening will now show as COMPLETE when matching CPT/SNOMED codes are found in the patient's record.

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

1. **Lab results screen** — `Observation?category=laboratory` is already fetched; surface it with AI explanations using the existing `explainLabResult()` method
2. **Medication history** — fetch `MedicationDispense` (scope already added) for dispense history alongside active requests
3. **Token refresh** — wire `oauthService.getValidAccessToken()` into `fhirService.fhirFetch()` so sessions longer than ~1 hour don't silently fail
4. **Session persistence** — store tokens in `expo-secure-store` (already installed) to avoid re-login on every app restart
5. **SDOH write-back** — use self-reported answers + LOINC codes on `SDOH_QUESTIONS` to write Observation resources back to Epic (requires `patient/Observation.write` scope)
6. **Allergies screen** — `AllergyIntolerance` data is already fetched; just needs a UI surface
