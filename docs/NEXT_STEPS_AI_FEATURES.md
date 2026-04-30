# HealthView — AI-Powered Patient Engagement Features

HealthView already delivers personalized AI insights for preventive care gaps and medications using Claude and real-time EHR data via SMART on FHIR. These three features extend that foundation into a **personal health coach** — one that understands not just a patient's clinical data, but their daily life, and uses both to drive action.

Inspired by Alignable's AI Networking Coach (which helps small business owners identify ideal partners, provides conversation templates, and sends relationship-management nudges), adapted for the patient-provider relationship.

---

## Feature 1: "How to Talk to Your Doctor"

AI-generated conversation starters that give patients the exact words to use at their next appointment — personalized to their conditions, medications, and life circumstances.

### The problem it solves

Patients often know they need to act on a screening or ask about a medication, but freeze in the appointment room. Studies show the average primary care visit is 18 minutes. Patients leave with unasked questions 50% of the time. The gap between "you should get screened" and actually making it happen isn't information — it's **communication confidence**.

### What the AI does

For every care gap and every medication, the AI generates 2-3 ready-to-use sentences the patient can say, read aloud, or screenshot before their visit. These aren't generic — they're assembled from the patient's actual EHR data:

**Care gap example — Colorectal screening, patient has transportation barrier:**
> *"I know I'm due for a colonoscopy, but getting to appointments has been difficult. Can we talk about the at-home FIT test as a first step?"*

**Medication example — Lisinopril, patient has diabetes + hypertension:**
> *"I'm on lisinopril for my blood pressure. Since I also have diabetes, is this still the best choice for protecting my kidneys? Are there side effects I should watch for?"*

**Medication example — Metformin, patient's latest HbA1c is available:**
> *"My last A1c was 7.2. I'm taking metformin — is my dose still right, or should we look at adjusting?"*

### What makes it smart

- **Condition-aware**: references the patient's actual diagnoses from their chart, not hypotheticals
- **Cross-referencing**: connects medications to relevant care gaps (e.g., asks about A1c when talking about metformin)
- **Life-circumstance-aware**: if the patient completed the Life & Wellness Check-In and flagged a barrier, the template weaves in a practical workaround — asking about at-home alternatives, generic options, telehealth, or assistance programs
- **"I" statements**: phrased as things the patient says directly, not instructions about what to ask — lowers the activation energy from "prepare a question" to "just read this"

---

## Feature 2: "Life & Wellness Check-In"

A 2-minute self-assessment that captures life circumstances — food access, housing stability, transportation, social support, financial strain, and stress — and uses the answers to make every AI interaction in the app smarter and more relevant.

### The problem it solves

Health doesn't happen in a vacuum. A patient who can't get to the clinic needs different guidance than one who can. A patient under financial strain needs to hear about generic alternatives, not just "talk to your doctor." Traditional health apps ignore this. HealthView's existing SDOH questionnaire captures this data, but the framing is clinical ("social health screening") and the results are underutilized.

### What changes

**Reframing**: "Social Health Screening" becomes **"Life & Wellness Check-In"**. The language shifts from clinical data collection to personal empowerment:

- *"Take a 2-minute check-in so we can tailor your health guidance to your real life — not just your chart."*
- Completion message: *"Thanks — your insights are now personalized"* (not "2 social needs identified")
- Privacy: *"Your answers stay on this device and are only used to personalize your health guidance"*

### How the AI uses the answers — the dual response

This is the core innovation. The AI responds to check-in answers in **two ways simultaneously**:

**1. Life improvement suggestions** — For each barrier flagged, the AI generates practical, actionable resources:

| Barrier flagged | AI suggests |
|---|---|
| Food insecurity | Local food banks, SNAP eligibility, community meal programs, food pharmacy programs at local hospitals |
| Housing instability | 211 hotline, local housing assistance programs, tenant rights resources |
| Transportation | Medicaid non-emergency transport, ride-share health programs, pharmacy delivery services |
| Financial strain | Prescription assistance programs (GoodRx, manufacturer coupons, 340B pharmacies), sliding-scale clinics |
| Social isolation | Community health worker programs, peer support groups, faith-based health ministries |
| Stress / mental health | Crisis text line, community mental health centers, employer EAP programs, mindfulness apps with free tiers |

These aren't static links — the AI frames each suggestion warmly: *"Many people in similar situations have found help through [resource]. It's free and confidential."*

**2. Health guidance adaptation** — Every AI insight across the app adapts to the patient's barriers. This isn't a separate feature — it's a behavioral shift in how the AI communicates everywhere:

| Without check-in | With check-in (transportation barrier) |
|---|---|
| "Schedule a colonoscopy with your doctor." | "Ask your doctor about the at-home FIT test — it's a simple stool test you can do without a clinic visit." |
| "Get your flu shot this season." | "Many pharmacies offer walk-in flu shots — no appointment needed. You could get it during a regular pharmacy trip." |
| "Your blood pressure should be checked regularly." | "Ask your doctor about a home blood pressure cuff. Many pharmacies carry them for under $30, and you can share readings at your next visit." |

| Without check-in | With check-in (financial strain) |
|---|---|
| "Talk to your doctor about your metformin dose." | "Metformin is one of the most affordable diabetes medications — ask if the generic version is right for you. Many pharmacies offer it for $4/month." |
| "You're due for a mammogram." | "Ask your doctor about free or low-cost mammogram programs — many hospitals offer them, especially in October." |

### Design principles

- **Warm & empowering tone**: "We can help you work around this" — focuses on what's possible, not what's missing
- **Never deficit-framing**: the app never says "you have 3 needs" or scores the patient. It says "your insights are personalized to your situation"
- **The check-in is a gift to the patient**: answering = better, more relevant guidance for *them*. The framing makes this obvious
- **Progressive enrichment**: the app works without the check-in. With it, everything gets meaningfully better. The patient sees the difference immediately

---

## Feature 3: Follow-Up Nudges

A single, time-aware banner at the top of the Dashboard that surfaces the most urgent health action — grounded in real dates from the patient's medical record, and adapted to their life circumstances.

### The problem it solves

The dashboard currently labels care gaps as "Due" or "Complete" — abstract statuses that don't create urgency. Patients see "Due" and think "I'll get to it." Alignable solved an analogous problem for business networking: "You haven't connected with Sarah in 3 months" is more motivating than "Reconnect suggested." The same psychology applies to health: **time-grounded language drives action**.

### What the AI generates

On each Dashboard load, the app identifies the single most urgent care gap and renders a banner with two elements: a **time-grounded fact** and a **personalized next step**.

**Examples:**

> **Your last flu shot was 11 months ago.** Flu season is coming up — a good time to schedule one.

> **You're eligible for colorectal screening, but we don't see one on record.** This is one of the most effective cancer prevention tools — ask your doctor about the at-home option.

> **Your last A1c was 8 months ago.** Since you're managing diabetes, staying current helps you and your doctor catch changes early.

**With Life & Wellness Check-In context (transportation barrier):**

> **Your blood pressure check is overdue.** If getting to the clinic is hard, ask about a home blood pressure cuff — many pharmacies carry them for under $30.

**With Life & Wellness Check-In context (financial strain):**

> **Your flu shot is due.** Many pharmacies offer free flu shots with most insurance plans, or low-cost options without — no appointment needed.

### What makes it smart

- **One nudge, not a list**: decision fatigue is the enemy. The AI picks the single most important action and advocates for it
- **Time-grounded**: always references real dates — "11 months ago" is more motivating than "due"
- **Urgency-ranked**: OVERDUE items surface first, then DUE items sorted by how far past their recommended interval
- **SDOH-adaptive**: if the patient completed the check-in, the nudge incorporates a practical workaround for their specific barrier
- **Never guilt-based**: "a good time to schedule one" — not "you're late on this"

---

## How the Three Features Work Together

```
┌─────────────────────────────────────────────────┐
│         Life & Wellness Check-In                │
│    "Help us tailor guidance to your real life"   │
└───────────────────┬─────────────────────────────┘
                    │
        ┌───────────┼───────────────┐
        ▼           ▼               ▼
  ┌──────────┐ ┌──────────┐ ┌──────────────────┐
  │ Nudge    │ │ AI       │ │ Talk to Your     │
  │ Banner   │ │ Insights │ │ Doctor templates │
  │          │ │          │ │                  │
  │ adds     │ │ adapts   │ │ weaves in        │
  │ barrier- │ │ all recs │ │ barrier-aware    │
  │ aware    │ │ to life  │ │ alternatives     │
  │ tips     │ │ context  │ │                  │
  └────┬─────┘ └──────────┘ └──────────────────┘
       │
       │ tap → scrolls to relevant card
       ▼
  ┌──────────────────────────────────────────┐
  │  Care Gap or Medication Card             │
  │  ├─ Personalized AI Insight              │
  │  ├─ How to Talk to Your Doctor           │
  │  ├─ Life improvement suggestions         │
  │  └─ Schedule / Refill action button      │
  └──────────────────────────────────────────┘
```

**The patient journey:**

1. **Complete the check-in** — the app now understands their life, not just their chart
2. **See what's urgent** — the nudge banner highlights the #1 action with time-grounded language
3. **Understand why it matters** — AI insights explain the care gap in context of their conditions AND life circumstances
4. **Get practical help** — life improvement suggestions surface resources for barriers they flagged
5. **Know exactly what to say** — conversation templates give them the words for their next appointment
6. **Take action** — schedule or call button is one tap away

Each layer reinforces the others. The check-in makes the nudges smarter. The nudges drive patients to cards. The cards give them understanding, resources, and words. The action button closes the loop.
