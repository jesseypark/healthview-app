# DECISIONS — HealthView

Non-obvious design choices inferred from the code, with reasoning.

---

## Auth & FHIR

### Manual token exchange instead of expo-auth-session's built-in handler
`oauthService.js` calls the token endpoint manually with `fetch` rather than using `AuthSession.exchangeCodeAsync`. The comment explains why: expo-auth-session drops Epic's custom `patient` field from the token response. The raw `fetch` preserves the full JSON so `tokenData.patient` (the FHIR patient ID) can be extracted directly from the token response. This is the correct approach for Epic SMART on FHIR.

### Singletons for services
All three services (`oauthService`, `fhirService`, `aiService`, `careGapsService`) are exported as both a named export and a default export from a single instance. This avoids prop-drilling the access token through the component tree — any component can import `fhirService` and it already has the token set from the login flow. It works because React Native apps have a single JS runtime per session.

### fhirService holds its own accessToken/patientId (separate from oauthService)
After login, `LoginScreen` explicitly calls `fhirService.setAccessToken()` and `fhirService.setPatientId()`. They're not shared via a getter. This keeps `fhirService` self-contained and testable independently from `oauthService`.

### `Promise.allSettled` for parallel FHIR fetches
`getAllPatientData()` uses `allSettled` (not `Promise.all`) so that a 404 on one resource (e.g., AllergyIntolerance returning empty for a test patient) doesn't block all other data from loading. Each failed fetch returns an empty array via the `settled()` helper.

---

## Care Gaps Engine

### Config-driven quality measures in a plain JS object
`QUALITY_MEASURES` in `qualityMeasures.js` is a plain object keyed by measure ID, not a class or database. Each entry is fully self-describing: eligibility rules (age, gender, required conditions), FHIR criteria (resource type, codes, lookback), and display text. `careGapsService` iterates this map without needing to know measure-specific logic — adding a new measure is purely additive (no service changes needed).

### Eligibility checked before FHIR lookup
`careGapsService.analyzeMeasure()` gates on eligibility first. If the patient doesn't qualify (wrong age, gender, or missing required condition), it returns `NOT_APPLICABLE` immediately without touching the FHIR resource arrays. This avoids false positives and keeps the "action needed" list meaningful.

### `determineDueStatus()` always returns DUE (never OVERDUE)
This is a deliberate simplification noted in the code comment. Determining "overdue" would require knowing the *last time* the measure was done even outside the current lookback window — which needs a second, unbounded FHIR query. The current approach is: if no matching resource is found within the lookback period, it's DUE. OVERDUE is defined in the enum and sorted correctly, but never assigned by the engine.

### Code-only matching (system not validated)
`fhirService.codeMatches()` compares only `coding.code`, not `coding.system`. The comment acknowledges this and has stricter system matching commented out. Epic's sandbox returns codes consistently enough that this works in practice; a production app should validate both.

---

## AI Integration

### Direct client-side API calls (no backend)
`aiService.js` calls the Anthropic API directly from the React Native app with a hardcoded API key placeholder. The comment explicitly flags this as demo-only — in production, calls should go through a backend. The fallback path (`if (this.apiKey === 'YOUR_ANTHROPIC_API_KEY_HERE')`) generates a deterministic non-AI explanation so the app is fully usable without a real key.

### AI is lazy-loaded per card
`CareGapCard` only calls `aiService.explainCareGap()` when the card is first expanded, and only once (guarded by `if (!expanded && !aiExplanation)`). Same pattern in `MedicationCard`. This avoids firing N API calls on Dashboard load and keeps the UX snappy.

### Patient context is a plain object, not passed through navigation
`patientContext` is built once in DashboardScreen and passed down to child components via props (and to Medications/Discharge via `route.params`). It's a simple `{ age, gender, conditions, sdohObservations, sdohSelfReported? }` object — no context API or global state.

---

## SDOH

### Two-layer SDOH: FHIR pull + self-report questionnaire
The app distinguishes between SDOH data *already in the Epic record* (fetched via `social-history`/`survey` Observations and Z-code Conditions) and SDOH data *self-reported by the patient* via the in-app questionnaire. The FHIR data is displayed in a collapsible section on the Dashboard. The self-report result is merged into `patientContext` via `aiService.addSDOHAnswers()` to enrich AI prompts.

### SDOH questionnaire answers are in-memory only
The `SDOHScreen` returns its result via `route.params.onComplete` callback. DashboardScreen stores it in `useState`. There is no persistence — answers are lost on app restart. `expo-secure-store` is installed but not used for this.

### SDOH questions carry LOINC codes
Each question in `SDOH_QUESTIONS` has a `loincCode` field. These aren't used in the current implementation but are there to support a future feature: writing self-reported answers back to the Epic record as Observation resources (would require write scopes).

---

## Screens & Navigation

### Medications and Discharge screens fetch data independently
Rather than receiving data from the Dashboard via params, these screens call `fhirService` directly on mount. This allows pull-to-refresh and keeps them usable if navigated to directly. They do receive `patientContext` and `providerPhone` as params from Dashboard (read-only, for display/AI use).

### DischargeScreen filters encounters client-side
`fhirService.getEncounters()` fetches `/Encounter?_sort=-date&_count=20` and then filters for `class.code === 'IMP' | 'EMER' | 'ACUTE'` in JavaScript. Epic's sandbox doesn't reliably support server-side class filtering via query params, so client-side filtering is more robust.

### DischargeScreen uses `Promise.allSettled` for its four independent fetches
Encounters, medications, document references, and care plans are all fetched in parallel with `allSettled`. Epic's sandbox may return 404 or empty bundles for DocumentReference and CarePlan if the test patient has no records — `allSettled` ensures a missing document list doesn't break the encounter display.

### SDOHScreen communicates back via callback, not params
Instead of `navigation.navigate('Dashboard', { sdohResult })`, the SDOH screen calls `route.params.onComplete(result)` before `navigation.goBack()`. This keeps the Dashboard's state management self-contained and avoids issues with React Navigation's param merging behavior on `goBack`.
