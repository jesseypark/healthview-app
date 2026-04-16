# HANDOFF — HealthView

Last updated: 2026-04-16 (session 7)

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
- Both FHIR SDOH data and self-reported needs are merged into AI prompt context to personalize care gap explanations — no raw SDOH data is displayed in the UI (removed session 7)
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

### ~~Epic 403 insufficient_scope on all FHIR calls~~ FIXED (session 7)

Root cause was missing `.Search` API entries in the Epic portal — see below for full diagnosis.

Workarounds still in code from session 6 (still needed even with `.Search` entries):
- `getMedications()` — no `&status=active` server-side filter, filters client-side
- `getProcedures()` — no `&status=completed` server-side filter, filters client-side
- `getSDOHData()` — uses `category=problem-list-item` for Condition query

Portal-side APIs not available in the open sandbox (non-blocking):
- `MedicationRequest.Read (Patient Chart) (R4)`
- `Procedure.Read (History)` or `(External) (R4)`

### Session 6–7 diagnosis: Epic `.Read` vs `.Search` API entries — ROOT CAUSE + FIX
All FHIR calls except `Patient/{id}` return 403. The token's `scope` claim contains all 13 resource scopes, yet Epic's resource server rejects search queries as insufficiently scoped. `Patient/{id}` succeeds because it's a direct read-by-ID, not a search.

**Root cause (session 7 research):** Epic's portal has **separate `.Read` and `.Search` API entries** for each resource subtype. The app's "Incoming APIs" likely only had `.Read` variants checked. In Epic's authorization model:
- `.Read` APIs authorize direct resource reads by ID (e.g., `GET /Patient/{id}`)
- `.Search` APIs authorize query/search operations (e.g., `GET /Condition?patient={id}`)

Since every FHIR call in the app (except `Patient/{id}`) is a search query using `?patient=` parameters, **all calls fail without the `.Search` API entries**. The SMART scope string `patient/X.read` covers both read and search per the FHIR spec, but Epic enforces its own per-API authorization on top of that.

**Fix:** In the Epic portal "Incoming APIs" section, check BOTH `.Read` AND `.Search` entries for every resource subtype. Then Save & Ready for Sandbox, wait up to 1 hour, and re-auth.

Reference: [SMART on FHIR Google Group — 403 on Observation/DiagnosticReport](https://groups.google.com/g/smart-on-fhir/c/jJqF8dZ76Js)

Verified during session 7 research:
- App settings confirmed correct: Application Audience = Patients, FHIR Version = R4, SMART v1
- SMART configuration endpoint supports `launch-standalone`, `context-standalone-patient`, `permission-patient`, `permission-v1`
- CapabilityStatement confirms all target resources support both `read` and `search-type` interactions
- Code is correct — Bearer token properly attached in `fhirService.fhirFetch()`
- App was re-registered in session 7 with new CLIENT_ID `815f9183-d3e0-4a79-8662-047d8f359e31`; same 403 behavior because the `.Search` API entries were still missing

Previous hypotheses ruled out:
- ~~DSTU2 vs R4 mismatch~~ — confirmed R4
- ~~Application Audience wrong~~ — confirmed "Patients"
- ~~Code-level auth header issue~~ — confirmed correct
- ~~Sandbox propagation delay~~ — persisted across 2 app registrations and 24+ hours
- ~~Saved-but-not-synced~~ — multiple Save & Ready cycles performed

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

## Next Steps (priority order)

1. ~~**Resolve 403**~~ FIXED — added `.Search` API entries in Epic portal; Medications and SDOH data now loading successfully
2. **Web deployment** — test `npx expo start --web`, fix web-specific issues, deploy to Vercel with `npx expo export:web`, register HTTPS redirect URI in Epic portal — goal is a shareable URL for hiring manager demo
3. **Lab results screen** — `Observation?category=laboratory` is already fetched; surface it with AI explanations using the existing `explainLabResult()` method
4. **Medication history** — fetch `MedicationDispense` (scope already added) for dispense history alongside active requests
5. **Token refresh** — wire `oauthService.getValidAccessToken()` into `fhirService.fhirFetch()` so sessions longer than ~1 hour don't silently fail
6. **Session persistence** — store tokens in `expo-secure-store` (already installed) to avoid re-login on every app restart
7. **SDOH write-back** — use self-reported answers + LOINC codes on `SDOH_QUESTIONS` to write Observation resources back to Epic (requires `patient/Observation.write` scope)
8. **Allergies screen** — `AllergyIntolerance` data is already fetched; just needs a UI surface
