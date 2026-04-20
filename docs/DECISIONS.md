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
`aiService.js` calls the Anthropic API directly from the React Native app with a hardcoded API key placeholder. In production, calls should go through a backend to protect the API key. The fallback path (`if (this.apiKey === 'YOUR_ANTHROPIC_API_KEY_HERE')`) generates a deterministic non-AI explanation so the app is fully usable without a real key.

### AI is lazy-loaded per card, with SDOH-triggered refresh
`CareGapCard` calls `aiService.explainCareGap()` when the card is first expanded (guarded by `if (!expanded && !aiExplanation)`). Same pattern in `MedicationCard`. This avoids firing N API calls on Dashboard load and keeps the UX snappy. Care gap cards also watch `patientContext.sdohNeedsIdentified` via a `useEffect` and refetch when the quiz is completed or edited, so insights update live without requiring a page reload.

### Patient context is a plain object, not passed through navigation
`patientContext` is built once in DashboardScreen and passed down to child components via props (and to Medications/Discharge via `route.params`). It's a simple `{ age, gender, conditions, sdohObservations, sdohSelfReported? }` object — no context API or global state.

---

## SDOH

### Two-layer SDOH: FHIR pull + self-report questionnaire
The app distinguishes between SDOH data *already in the Epic record* (fetched via `social-history`/`survey` Observations and Z-code Conditions) and SDOH data *self-reported by the patient* via the in-app questionnaire. Both data sources are used exclusively as AI context — they feed into `aiService.buildPatientContext()` and `aiService.addSDOHAnswers()` to personalize care gap explanations. No raw SDOH data is displayed in the UI (the collapsible "Social Health Data from Epic" section was removed in session 7 — the data only needs to inform AI guidance, not be shown directly).

### SDOH questionnaire answers are in-memory only
The `SDOHScreen` returns its result via `route.params.onComplete` callback. DashboardScreen stores it in `useState`. There is no persistence — answers are lost on app restart. `expo-secure-store` is installed but not used for this.

### SDOH questions carry LOINC codes
Each question in `SDOH_QUESTIONS` has a `loincCode` field. These aren't used in the current implementation but are there to support a future feature: writing self-reported answers back to the Epic record as Observation resources (would require write scopes).

---

## Screens & Navigation

### `document.activeElement.blur()` before navigation on web
When a `TouchableOpacity` is pressed to navigate, the browser retains focus on that element. React Navigation then marks the departing screen `aria-hidden="true"`, which triggers a WAI-ARIA violation warning because a focused element has an `aria-hidden` ancestor. The fix is `document.activeElement?.blur()` in the `onPress` handler, guarded by `Platform.OS === 'web'`. Applied to the Medications and Discharge navigation calls in `DashboardScreen`.

### Medications and Discharge screens fetch data independently
Rather than receiving data from the Dashboard via params, these screens call `fhirService` directly on mount. This allows pull-to-refresh and keeps them usable if navigated to directly. They do receive `patientContext` and `providerPhone` as params from Dashboard (read-only, for display/AI use).

### DischargeScreen filters encounters client-side
`fhirService.getEncounters()` fetches `/Encounter?_sort=-date&_count=20` and then filters for `class.code === 'IMP' | 'EMER' | 'ACUTE'` in JavaScript. Epic's sandbox doesn't reliably support server-side class filtering via query params, so client-side filtering is more robust.

### DischargeScreen uses `Promise.allSettled` for its four independent fetches
Encounters, medications, document references, and care plans are all fetched in parallel with `allSettled`. Epic's sandbox may return 404 or empty bundles for DocumentReference and CarePlan if the test patient has no records — `allSettled` ensures a missing document list doesn't break the encounter display.

### Verify Epic's granted `scope` field, not just the requested `SCOPES` array
When a FHIR request 403s, the first diagnostic is the `scope` field on the raw token response logged as `[HealthView] Raw token response:`. Epic silently drops any scope the app requests that isn't checked and saved on the app's portal registration — the request-side `SCOPES` array in `epicConfig.js` is only a wish list.

### Epic scope strings are coarser than Epic's actual per-subtype authorization
Even after a scope like `patient/MedicationRequest.read` appears in the granted `scope` field, the request can still 403 if the query parameters don't match the specific Epic "Incoming API" subtype that was checked in the portal (e.g., "Outside Record", "Signed Medication Order", "Patient Chart", "Orders", "Problems"). Each subtype only authorizes a specific category/status combination. Workarounds: drop server-side `status=` filters and filter client-side; use `category=problem-list-item` for "Problems"-scope Condition queries; etc. Confirmed session 6 against the Epic open sandbox.

### Epic requires BOTH `.Read` AND `.Search` Incoming API entries
Epic's portal lists separate `.Read` and `.Search` API entries for each resource subtype (e.g., `Observation.Read (Labs) (R4)` and `Observation.Search (Labs) (R4)`). The SMART on FHIR spec says `patient/X.read` covers both read and search, but Epic enforces its own per-API authorization on top. Without the `.Search` entries, only direct reads-by-ID (like `Patient/{id}`) succeed; all query-based calls (`?patient=`) return 403 `insufficient_scope`. Diagnosed in session 7 via [SMART on FHIR Google Group thread](https://groups.google.com/g/smart-on-fhir/c/jJqF8dZ76Js).

### No pill images (no viable API)
The NIH RxImage API was retired in 2021. DailyMed's SPL API was investigated as a replacement, but its images are chemical structure diagrams, pharmacokinetics graphs, and packaging labels — not actual pill photos. No free, CORS-friendly API provides real pill photographs. Medication cards show a pill emoji instead.

### DailyMed as the medication "learn more" link
Medication cards link to `dailymed.nlm.nih.gov/dailymed/search.cfm` (NIH/NLM). DailyMed provides FDA-approved drug labeling and is the most reliable NIH drug information search. Drug names with hyphens are converted to spaces for the search (e.g., "amphetamine-dextroamphetamine" → "amphetamine dextroamphetamine"). Replaced MedlinePlus search which was returning "page not found" errors.

### Drug knowledge base for AI fallback
`drugInfo.js` contains a curated database of common medications with purpose, side effects, contraindications, and practical tips sourced from FDA labels and clinical pharmacology references. When the Claude API key is not configured, `aiService.buildFallbackMedicationExplanation()` uses this database to produce concise, personalized insights. The insight connects each drug to the patient's actual conditions via `_connectDrugToConditions()` (e.g., "You're taking this for your Essential hypertension"), adds combo therapy notes for related medications via `_getComboNote()`, then shows only the most critical warning and one tip — keeping total output to ~3-4 sentences. The `findDrugInfo()` lookup prefers longer (more specific) matches so "lisinopril-hydrochlorothiazide" matches its combo entry rather than plain "lisinopril".

### Care gap "✨ Personalized AI Insights" = whyItMatters + personalized content in one section
`CareGapCard` previously had separate "Why This Matters" and "Personalized AI Insight" sections. These are now merged into a single "✨ Personalized AI Insights" section that shows `measure.whyItMatters` (general stats) followed by personalized content from `_getMeasureSpecificContent()` which connects the screening to the patient's specific conditions and medications. The personalized content avoids repeating what `whyItMatters` already covers, focusing instead on why THIS patient specifically needs to act. The same section title is used on medication cards for consistency.

### SDOH quiz picks the single most relevant need per care gap
`_buildSDOHNote()` in `aiService.js` selects only the highest-impact SDOH need for each measure, not all of them. Each measure has a priority-ordered list (e.g., for blood pressure: Stress > Housing > Food > Financial > Transportation) reflecting which social factor most directly affects that health outcome. The method picks the first match from the patient's quiz results and appends one natural sentence. This avoids the robotic feel of addressing every quiz answer and keeps insights focused.

### Provider phone falls back to placeholder number
Epic sandbox test patients typically don't have a `generalPractitioner` reference, so `getProviderPhone()` returns `null`. DashboardScreen falls back to `(555) 123-4567` so "Schedule Appointment" and "Request Refill" buttons are always functional. A production app would remove the fallback and show a "contact your provider" message instead.

### AI disclaimer shown outside the insight box
Both care gap and medication cards show "AI-generated content may not be accurate. Verify with your care team." in italic gray text below the blue-bordered AI insight container (not inside it). This is a standard responsible-AI pattern. Positioned outside the box so it reads as a system-level caveat rather than part of the AI-generated content itself.

### Percent circle removed from SummaryHeader
The `percentComplete` value was mathematically correct but always showed 0% in the Epic sandbox because test patients don't have matching CPT/SNOMED procedure codes for colonoscopy, mammogram, etc. Showing "0%" on every patient was confusing and undermined trust in the dashboard. Replaced with a text-only "X of Y screenings up to date" summary. The `percentComplete` field is still computed in `careGapsService.getSummary()` if needed later.

### Web deployment as static Vercel export
The app is deployed to Vercel as a static site using `npx expo export --platform web`, which outputs to `dist/`. No server-side rendering or Vercel build step — the pre-built `dist/` folder is deployed directly. This works because the app has no server-side logic; all API calls (Epic FHIR, Claude) happen client-side. The Vercel project is named `healthview-app` and the production URL is `https://healthview-app.vercel.app`. To redeploy after changes: `npx expo export --platform web && npx vercel deploy dist/ --prod --yes`.

### SDOHScreen communicates back via callback, not params
Instead of `navigation.navigate('Dashboard', { sdohResult })`, the SDOH screen calls `route.params.onComplete(result)` before `navigation.goBack()`. This keeps the Dashboard's state management self-contained and avoids issues with React Navigation's param merging behavior on `goBack`.
