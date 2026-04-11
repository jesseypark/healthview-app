# HealthView

A React Native mobile app that connects to Epic's FHIR API to display patient health records and identify care gaps based on CMS quality measures (HEDIS-style).

## Features

- **SMART on FHIR Authentication**: Secure OAuth 2.0 login with Epic via MyChart
- **Care Gap Analysis**: Checks patient records against 5 key quality measures:
  - Annual flu vaccination
  - Colorectal cancer screening (ages 45-75)
  - Breast cancer screening (women 50-74)
  - HbA1c test (diabetics)
  - Blood pressure check
- **AI-Powered Explanations**: Uses Claude API to explain health data in plain language
- **Real FHIR Codes**: Uses actual CVX, CPT, SNOMED, and LOINC codes from CMS specifications

## Tech Stack

- React Native + Expo
- SMART on FHIR (OAuth 2.0 with PKCE)
- Epic FHIR R4 API
- Claude API for AI explanations

## Setup Instructions

### 1. Install Dependencies

```bash
cd healthview-app
npm install
```

### 2. Register Your App with Epic

1. Go to [fhir.epic.com](https://fhir.epic.com)
2. Create a developer account
3. Register a new application:
   - Application Name: HealthView
   - Redirect URI: `healthview://callback`
   - Select scopes: patient/Patient.read, patient/Condition.read, patient/Observation.read, patient/Immunization.read, patient/Procedure.read
4. Copy your **Client ID**

### 3. Configure the App

Update `src/constants/epicConfig.js`:

```javascript
clientId: 'YOUR_EPIC_CLIENT_ID_HERE',
```

### 4. Add Anthropic API Key (Optional)

For AI explanations, update `src/services/aiService.js`:

```javascript
this.apiKey = 'YOUR_ANTHROPIC_API_KEY_HERE';
```

> **Note**: In production, API calls should go through a backend server to protect your API key.

### 5. Run the App

```bash
npx expo start
```

Scan the QR code with Expo Go (iOS/Android) or press `i` for iOS simulator / `a` for Android emulator.

### 6. Test with Epic Sandbox

Use these test credentials when logging in:

| Name | Username | Password | Description |
|------|----------|----------|-------------|
| Camila Lopez | fhircamila | epicepic1 | Adult female with diabetes, hypertension |
| Derrick Lin | fhirderrick | epicepic1 | Adult male with various conditions |
| Timmy Smart | fhirtimmy | epicepic1 | Pediatric patient |

## Project Structure

```
healthview-app/
├── App.js                 # Entry point with navigation
├── app.json              # Expo configuration
├── package.json          # Dependencies
└── src/
    ├── components/
    │   ├── CareGapCard.js     # Individual measure card
    │   └── SummaryHeader.js   # Dashboard summary
    ├── constants/
    │   ├── epicConfig.js      # Epic OAuth/FHIR config
    │   └── qualityMeasures.js # HEDIS-style measures
    ├── screens/
    │   ├── LoginScreen.js     # OAuth login
    │   └── DashboardScreen.js # Main care gaps view
    └── services/
        ├── oauthService.js    # SMART on FHIR auth
        ├── fhirService.js     # FHIR API calls
        ├── careGapsService.js # Measure analysis
        └── aiService.js       # Claude API integration
```

## Quality Measures Implemented

| Measure | FHIR Resource | Codes Used |
|---------|---------------|------------|
| Flu Shot | Immunization | CVX codes (140, 150, 155, etc.) |
| Colorectal Screening | Procedure | CPT 45378-45385, SNOMED 73761001 |
| Breast Cancer Screening | Procedure | CPT 77065-77067, SNOMED 24623002 |
| HbA1c Test | Observation | LOINC 4548-4, 17856-6 |
| Blood Pressure | Observation | LOINC 85354-9, 8480-6 |

## Portfolio Context

This app demonstrates:

1. **FHIR fluency**: Working with real FHIR resources, OAuth, and healthcare data standards
2. **Product thinking**: Solving a real problem (care gap awareness) with user-centered design
3. **Healthcare domain expertise**: Understanding of HEDIS, CMS quality measures, and preventive care
4. **AI integration**: Using LLMs to translate clinical data into patient-friendly language

## Interview Talking Points

> "At mPulse, I helped health plans reach patients to close care gaps. But outbound engagement has limits—patients often ignore messages from insurers. So I built an app that flips the model: patients connect their own records, and the app shows them which preventive measures they're due for, with AI explaining why each one matters. Same HEDIS measures, but patient-initiated and trusted."

## License

Portfolio project - MIT License
