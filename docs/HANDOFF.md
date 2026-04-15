# HANDOFF — HealthView

Last updated: 2026-04-15 (session 6)

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

### Epic per-subtype scope mismatch (session 6 diagnosis)
All 13 SMART scopes are now granted at OAuth (Epic finally propagated). However, Epic's actual authorization is per-data-subtype (the "Incoming APIs" checkboxes in the dev portal), not per the broad SMART scope string. Each granted subtype only authorizes queries that match its category — using the wrong query params still 403s even with the scope string present.

Workarounds in code (session 6):
- `getMedications()` — dropped `&status=active`, filter client-side. Granted MedicationRequest subtypes (Outside Record, Signed Medication Order) reject server-side status filter.
- `getProcedures()` — dropped `&status=completed`, filter client-side. Only "Orders" subtype is granted.
- `getSDOHData()` — unfiltered Condition query replaced with `category=problem-list-item` to match the granted "Problems" subtype (used for Z-code SDOH lookup).

Portal-side additions still needed for full coverage (some not available in the open sandbox):
- `MedicationRequest.Read (Patient Chart) (R4)` — NOT AVAILABLE in open sandbox
- `Procedure.Read (History)` or `(External) (R4)` — NOT AVAILABLE in open sandbox
- `AllergyIntolerance.Read (Patient Chart) (R4)` — ADDED 2026-04-15
- `Practitioner.Read (R4)` — ADDED 2026-04-15

After the new portal scopes propagate (~60 min) and a fresh-browser re-auth, AllergyIntolerance and Practitioner (provider phone) should clear. Lab/social-history/survey Observation, Immunization, and Condition (encounter-diagnosis) should also clear with the now-granted scopes.

### Session 6 follow-up: Epic returns `insufficient_scope` despite valid scope string
After the workarounds above, all FHIR calls still 403. Direct curl test against `Immunization?patient=erXuFYUfucBZaryVksYEcMg3` with a fresh bearer token returned:

```
HTTP/1.1 403 Forbidden
WWW-Authenticate: Bearer error="insufficient_scope",
  error_description="The access token provided is valid, but is not authorized for this service"
```

The token's `scope` claim contains `patient/Immunization.read` (and all 12 other resource scopes), yet Epic's resource server rejects the request as insufficiently scoped. Conclusion: **the SMART OAuth scope string and Epic's underlying per-API authorization are out of sync at the portal level**. This is not a code issue.

Likely portal-side causes (to investigate at https://fhir.epic.com/Developer/Apps):
1. Saved-but-not-synced — the "Incoming APIs" list shows checked but isn't live on the sandbox
2. Sandbox vs Production config split — the wrong environment's API list was edited
3. App's FHIR Version field is set to DSTU2 (the field is typically not editable post-creation; would require re-registering as R4)
4. Sandbox propagation delay (sometimes multi-hour)

If portal looks correct and waiting doesn't help, last resort is to delete and re-register the app fresh with R4 + all required APIs from the start, then update `CLIENT_ID` in `src/constants/epicConfig.js`.

The only call that succeeds is `Patient/{id}` — confirmed by the fact that `getProviderPhone()` retrieves a Practitioner reference from the patient resource before its own 403 on the Practitioner read.

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
