# First Round AI - Candidate Experience Guidelines

## Overview

This document outlines the design and specification guidelines for the **First Round AI** candidate interview platform. This is a comprehensive wireframe and design system prototype demonstrating the complete candidate journey from login to post-interview analytics.

## Purpose

This prototype serves as:
- **Design Specification**: Complete UI/UX flows for desktop and mobile
- **Component Library**: Reusable components with states and variants
- **API Documentation**: Request/response contracts for all endpoints
- **Policy Documentation**: Anti-cheat rules, thresholds, and automated actions
- **User Flow Maps**: Journey diagrams from entry to exit

## Key Design Principles

### 1. Responsive & Mobile-First
- All screens adapt gracefully from mobile (320px) to desktop (1920px+)
- Mobile: single-column layouts, collapsible panels, sticky headers
- Desktop: multi-column grids, sidebars, larger interactive areas
- Breakpoints: sm (640px), md (768px), lg (1024px), xl (1280px)

### 2. Accessibility Ready
- Keyboard navigable: all interactions accessible via keyboard
- Readable contrast: WCAG AA minimum (4.5:1 for text)
- Semantic HTML: proper heading hierarchy, ARIA labels where needed
- Focus indicators: visible focus states on all interactive elements
- Captions & transcripts: live transcription for audio/video content

### 3. Privacy by Design
- Visual indicators: clear badges when camera/mic/recording are active
- Explicit consent: checkboxes required before any recording
- Local-first: face baseline stored in browser, not uploaded
- Transparency: all strikes and events visible to candidate
- Data minimization: only collect what's necessary for functionality

### 4. Real-Time Feedback
- Live status lights for anti-cheat compliance (green/yellow/red)
- Instant toast notifications for violations
- Live transcription of both candidate and AI
- Progress indicators for session time and questions
- Network/camera/mic health continuously monitored

### 5. Clear, Friendly Microcopy
- Short sentences, action-oriented labels
- Error messages appear near the failed control
- Helpful tooltips and inline guidance
- Positive reinforcement for good behavior
- Plain language, no jargon

## Application Structure

### Top-Level Navigation
Available from persistent header on all screens:
1. **Home** - Dashboard overview
2. **AI Mock Interview** - Start new session
3. **My Dashboard** - Analytics and history

### Page Hierarchy

```
Login (authentication) 
  ↓
Candidate Home
  ├── AI Mock Interview Setup
  │     ↓
  ├── Anti-Cheat Pre-Check
  │     ↓
  ├── Interview Room
  │     ↓
  └── Session Summary
        ↓
  My Dashboard
```

## Screen Specifications

### 1. Candidate Home (Dashboard Overview)

**Purpose**: Central hub for quick actions, stats, and recent activity

**Sections**:
- **Quick Actions**: 4 large cards for primary tasks
  - Start AI Mock Interview (primary CTA)
  - Book 1:1 Live Session (disabled/coming soon)
  - Plan Career Path (disabled/coming soon)
  - Check Resume & ATS (disabled/coming soon)
  
- **Interview Counters**: Stats cards showing
  - AI Mock interviews (today/week/month)
  - 1:1 sessions attended
  - Companies tracked
  
- **Preparation Tracker**: List of target companies
  - Company name + role tags + target date
  - Status badges (preparing/interviewed/offer/rejected)
  - Add new company button
  
- **Recent Activity**: Last 5 sessions
  - Type, mode, date, duration
  - Score, compliance badge
  - Link to detailed summary
  
- **System Health**: Pre-check status badges
  - Camera, Microphone, Network, Browser
  - Green (pass), Yellow (warning), Red (fail)
  - Quick link to run full pre-check

**Mobile Adaptations**:
- Single column layout
- Counters in 3-column grid
- Collapsible sections for tracker/activity

### 2. AI Mock Interview Setup (Page 1)

**Purpose**: Configure session parameters and provide context

**Form Groups**:

**A. Role Selection**
- Category dropdown (QA, Developer, DevOps, etc.)
- Experience: years + months numeric inputs
- Validates: category required

**B. Interview Modes** (multi-select or random)
- Behavioral (soft skills, STAR method)
- Coding (MCQ + challenges + fill-in-blank)
- Scenario-based (real projects/troubleshooting)
- Random (AI varies modes unpredictably)
- When Coding selected, show checkbox for MCQ/FIB mode

**C. Session Parameters**
- Question count: slider 5-20 (recommended 8-12)
- Duration: slider 15-90 minutes
- Language & accent: dropdown
- Difficulty: Easy / Medium / Hard / Adaptive

**D. Context Inputs** (optional)
- Job description: textarea
- Resume upload: drag-drop or click
- Company targets: chip input (add/remove)

**E. Question Sources**
- Checkbox: Include curated market questions
- Checkbox: Allow AI-generated questions
- Compliance notice for curated sources

**F. Privacy & Consent** (required)
- Checkbox: Consent to recording (audio/video/screen)
- Checkbox: Understand anti-cheat rules
- Link to Anti-Cheat Policy

**Validations**:
- Role category required
- At least one interview mode required
- Both consent checkboxes required
- Inline tooltips for guidance

**Actions**:
- Cancel (return to home)
- Save As Template (disabled in prototype)
- Run Pre-Check (primary action, proceeds to page 2)

### 3. Anti-Cheat Pre-Check (Page 2)

**Purpose**: Validate environment before entering interview

**Tests** (checklist with live status):

1. **Camera** - Face detected, centered, adequate lighting
2. **Microphone** - Signal level test, background noise estimate
3. **Speakers/Headphones** - Playback test
4. **Network** - Ping, jitter, packet loss, bandwidth
5. **Browser Integrity** - Single-tab, no extensions, screenshot blocked
6. **Full-screen Required** - Enforce and detect blur/focus
7. **Face Continuity** - Baseline embedding (local only)

**States per Check**:
- **Pending**: Empty circle, gray
- **Running**: Spinner icon, blue
- **Pass**: Green checkmark, success message
- **Warning**: Yellow alert, fixable issue
- **Fail**: Red X, blocker with guidance

**Behaviors**:
- Auto-run all checks on mount (sequential animation)
- Show overall progress bar while running
- Each check displays inline message on completion
- "Re-Test" button on individual failed checks
- "Re-run All Checks" button
- "Troubleshoot" button (opens help modal)

**Privacy Notice**: Banner explaining what's checked and not stored

**Proceed Conditions**:
- All mandatory checks must be Pass or Warning
- Cannot proceed if any check is Fail
- Warning allowed but user notified of potential quality impact

**Actions**:
- Back (return to setup)
- Re-run All Checks
- Troubleshoot (help)
- Proceed to Interview (primary, enabled when all pass)

### 4. Interview Room (Page 3)

**Purpose**: Live AI interview session with real-time monitoring

**Layout**:

**Top Bar** (sticky, full width):
- Session timer (total elapsed)
- Question timer (per question)
- Anti-cheat status light (center, prominent)
- Recording indicator (pulsing red dot + badge)
- Exit button (opens confirmation modal)

**Main Panel** (left side or full on mobile):
- Progress bar: "Question X of Y" with percentage
- **AI Interviewer Panel**:
  - Avatar icon (AI badge)
  - Question text (large, readable)
  - Question type badge
  - Hint (if available, in info box)
  - Play/Pause TTS buttons
  - "Repeat Question" and "Request Hint" buttons
  
- **Candidate Response Controls**:
  - Voice answer: Push-to-talk button with waveform
  - Text answer: Textarea with character count
  - For Coding: code editor with "Run Tests" button
  - For MCQ: radio/checkbox list
  - For FIB: text input slots
  
- **Navigation**:
  - Previous button (disabled if first or mode prevents)
  - Next / Finish button
  - Progress indicator

**Right Sidebar** (collapsible on mobile, tabs):

**Tab 1: Transcript**
- Live captions of both AI and candidate
- Speaker labels + timestamps
- Auto-scroll to latest
- Empty state: "Live transcript will appear here"

**Tab 2: Strikes Feed**
- Chronological list of violations
- Strike type, severity badge, time, details
- Color-coded: yellow (minor), red (major)
- Empty state: "No violations detected"

**Tab 3: Notes**
- Private textarea for candidate notes
- Saved with session

**Tab 4: Resources** (optional)
- JD summary
- Resume highlights
- Company chips

**Mobile Layout**:
- Single column, full width
- Sticky top bar with essential info
- Collapsible bottom drawer for tabs
- Larger tap targets

**Behaviors**:

**Strikes & Policy Engine**:
- Real-time detection of violations
- Toast notification on strike
- Status light changes: green → yellow → red
- Auto-pause on major violations (fullscreen exit, etc.)
- Auto-end on severe/repeated violations
- Countdown timer on auto-pause (10s to correct)

**Question Flow**:
- Next/Previous based on mode rules
- Random mode: AI interleaves question types
- "Repeat Question" replays TTS
- "Request Hint" if enabled (may reduce score)

**Recording**:
- Audio from mic (live stream)
- Video from camera (face only)
- Screen hash (optional, integrity check)
- Live speech-to-text for transcription

**Exit Flow**:
- "Exit" button → confirmation modal
- "Are you sure? Your progress will be saved."
- Cancel / Yes, End Interview
- On end: finalize uploads → redirect to summary

### 5. Post-Interview Summary

**Purpose**: Detailed feedback and performance analysis

**Sections**:

**A. Score Overview**
- Large overall score (0-100) with color coding
  - ≥80: green background
  - 60-79: yellow background
  - <60: red background
- Breakdown by mode (Behavioral, Coding, Scenario)
- Visual score cards with percentages

**B. Strengths & Gaps** (side-by-side cards)
- **Strengths**: checkmark list, green theme
- **Areas for Improvement**: alert icon list, amber theme
- Action-oriented bullets

**C. Question-by-Question Review**
- Accordion or tabbed cards for each question
- Question text + type badge
- Score per question
- **Tabs per question**:
  - Your Answer (transcript + code)
  - Feedback (AI evaluation)
  - Model Answer (rubric, example answer)
  - Code Diff (if coding question)

**D. Anti-Cheat Compliance Report**
- Final status badge (Pass / Warning / Failed)
- Verdict text explanation
- Strike timeline table:
  - Time, type, severity, details
- Compliance percentage

**E. Recommended Next Steps**
- Personalized bullet list
- Links to Career Path, Practice Questions, Resume Tips
- "Add to Preparing For" tracker button

**Actions**:
- Back to Home
- View Dashboard
- Download PDF Summary
- Share Link (generate shareable URL)
- Start New Session (primary CTA)

### 6. My Dashboard (Analytics)

**Purpose**: Track progress and performance over time

**Filters** (top row):
- Date range: 7 days / 30 days / 90 days / All time
- Mode filter: All / Behavioral / Coding / Scenario / Random
- Role filter: All / QA / Developer / DevOps / etc.
- Export button (download CSV)

**Stats Cards** (4-column grid):
- Total Interviews
- Average Score
- Compliance Rate (%)
- Companies Tracked

**Charts**:

**Score Trend Over Time**:
- Line chart (Recharts)
- X-axis: dates
- Y-axis: 0-100
- Two lines: Score (blue), Compliance % (green)
- Responsive, tooltip on hover

**Performance by Interview Mode**:
- Bar chart (Recharts)
- X-axis: mode names
- Y-axis: count + avg score
- Two bars per mode: session count, avg score
- Color-coded

**Session History Table**:
- Columns: Date, Company, Role, Mode, Score, Compliance, Duration, Actions
- Mode shown as badge
- Score color-coded
- Compliance badge (Pass/Warning/Failed)
- "View" button → navigates to summary
- Responsive: horizontal scroll on mobile or card list

## Component Library

All components documented in **Component Library** screen (accessible via Help menu).

### Core Components

**1. StatusLight**
- Props: status (pass/warning/fail), label, size
- Visual: pulsing colored circle + text
- Colors: green (pass), yellow (warning), red (fail)
- Use: top bar of interview room, pre-check status

**2. Buttons**
- Variants: default, secondary, outline, ghost, destructive
- Sizes: sm, default, lg, icon
- States: default, hover, active, disabled, loading
- Always action-oriented labels

**3. Badges**
- Variants: default, secondary, outline, destructive
- Use: status indicators, labels, tags
- Examples: "Pass", "Behavioral", "Major Strike"

**4. Cards**
- Structure: CardHeader (title, description), CardContent, CardFooter
- Variants: default, highlighted (colored border/background)
- Nested cards allowed
- Always with rounded corners and subtle shadow

**5. Form Controls**
- Input (text, number, email, etc.)
- Textarea (resizable or fixed)
- Select dropdown
- Checkbox with label
- Radio group
- Slider with live value display
- All with labels, validation states, error messages

**6. Progress & Indicators**
- Progress bar (0-100%)
- Slider (interactive value selection)
- Loading spinner
- Skeleton loaders (for async content)

**7. Alerts & Toasts**
- Alert: info, warning, error, success variants
- Toast (Sonner): auto-dismiss notifications
- Always with icon + message
- Dismissible

**8. Compliance Checklist Item**
- Icon + label + description
- Status icon: pending, running, pass, warning, fail
- Inline message on completion
- "Re-Test" button on fail

## API Contracts

All endpoints documented in **API Contracts** screen.

### Key Endpoints

1. **POST /api/sessions** - Create session
2. **POST /api/sessions/{id}/precheck** - Run pre-check
3. **POST /api/sessions/{id}/start** - Start interview
4. **GET /api/sessions/{id}/questions/next** - Get next question
5. **POST /api/sessions/{id}/answers** - Submit answer
6. **POST /api/sessions/{id}/strikes** - Emit strike
7. **POST /api/sessions/{id}/end** - End interview
8. **GET /api/sessions/{id}/summary** - Fetch summary
9. **POST /api/users/{id}/companies** - Update company tracker
10. **GET /api/users/{id}/analytics** - Get analytics

### Response Patterns

**Success**: 200/201 with data object
**Client Error**: 4xx with { message, details }
**Server Error**: 5xx with { message }
**Headers**: Standard auth, content-type, rate-limit info

### Real-Time Events

- WebSocket or SSE for live transcription
- Strike events pushed immediately
- Timer updates every second
- Network health monitoring

## Anti-Cheat Policies

Full documentation in **Policies** screen.

### Strike Severity

**Minor Strikes**:
- Face missing < 2s
- Blur/occlusion
- Brief focus loss
- Threshold: 3 → auto-pause

**Major Strikes**:
- Fullscreen exit
- Tab switch / Alt-Tab
- Screenshot attempt
- Background human voice
- Multiple faces detected
- Threshold: 2 → auto-end

### Auto-Pause Flow

1. Violation detected
2. Strike logged + toast notification
3. Interview pauses, timer stops
4. Modal shows reason + instructions
5. 10-second countdown to resume
6. User corrects issue (e.g., re-enter fullscreen)
7. Countdown completes → resume
8. If not corrected → auto-end

### Recording & Privacy

- Audio/video/screen recorded
- Encrypted in transit and at rest
- 90-day retention, then auto-delete
- Candidate can request deletion (30 days)
- Access: Candidate (own), Recruiter (assigned), Admin (flagged only)
- Face baseline: local storage only, not uploaded
- Clear visual indicators when recording active

## User Flows

Full flow diagrams in **User Flows** screen.

### Primary Flow

1. **Login** → Role assignment
2. **Candidate Home** → Quick actions, stats, tracker
3. **AI Mock Setup** → Configure session
4. **Pre-Check** → Validate environment
5. **Interview Room** → Live session
6. **Summary** → Feedback + compliance report
7. **Dashboard** → Analytics + history

### Error & Edge Flows

- **Pre-check fail**: troubleshoot → retry → block proceed
- **Network drop**: auto-switch audio-only → warn
- **Face lost**: auto-pause → countdown → resume
- **Major violation**: strike → warning → escalate → optional auto-end
- **Browser crash**: resume with integrity check
- **Screenshot attempt**: block + immediate red strike

## Microcopy Examples

### Success Messages
- "You're good to go. All checks passed."
- "Interview session created successfully."
- "Answer submitted. Loading next question..."

### Warnings
- "We detected background noise. Try moving to a quieter space."
- "Your network speed is lower than recommended. Interview quality may be affected."

### Errors
- "Camera not detected. Please check your device settings and try again."
- "Fullscreen mode required. Click here to re-enter fullscreen."

### Strike Toasts
- "Strike: Full-screen exited. Please return within 10 seconds."
- "Warning: Face briefly out of frame. Please stay centered."
- "Major violation: Tab switch detected. Interview paused."

## Mobile-Specific Rules

1. **Navigation**: Hamburger menu, bottom nav optional
2. **Panels**: Single column, collapsible sections
3. **Tap Targets**: Minimum 44x44px
4. **Dialogs**: Sheet from bottom instead of modal
5. **Tables**: Horizontal scroll or card list view
6. **Sticky Elements**: Minimize to header only
7. **Font Sizes**: Slightly larger for readability
8. **Charts**: Simplified, touch-optimized

## Accessibility Checklist

- [ ] All interactive elements keyboard accessible
- [ ] Focus indicators visible and clear
- [ ] Semantic HTML (h1-h6, nav, main, etc.)
- [ ] ARIA labels where needed (icon buttons, etc.)
- [ ] Color contrast ≥ 4.5:1 for text
- [ ] Form labels associated with inputs
- [ ] Error messages programmatically linked
- [ ] Skip links for keyboard users
- [ ] Screen reader announcements for dynamic content
- [ ] Media captions and transcripts

## Design Tokens

### Colors
- **Primary**: Blue-600 (#2563eb)
- **Success**: Green-600 (#16a34a)
- **Warning**: Yellow-600 (#ca8a04)
- **Error**: Red-600 (#dc2626)
- **Neutral**: Slate-600 (#475569)

### Spacing
- Base unit: 4px (0.25rem)
- Common values: 2, 4, 6, 8, 12, 16, 24, 32, 48, 64

### Typography
- Base font size: 16px
- Scale: xs (0.75rem), sm (0.875rem), base (1rem), lg (1.125rem), xl (1.25rem)
- Headings use default browser sizes (no Tailwind size classes)
- Line height: relaxed for body, tight for headings

### Border Radius
- sm: 0.125rem
- default: 0.25rem
- md: 0.375rem
- lg: 0.5rem
- full: 9999px (circles)

### Shadows
- sm: subtle
- default: card elevation
- lg: modals/dialogs
- none: flush surfaces

## Technical Notes (for reference, no implementation)

### Frontend
- React with TypeScript for type safety
- Tailwind CSS for styling
- Shadcn/ui for base components
- Recharts for data visualization
- Responsive hooks for mobile detection

### State Management
- Local state (useState) for simple UI
- Context for shared state (user, session)
- Real-time updates via WebSocket/SSE

### Backend (conceptual)
- RESTful API for CRUD operations
- Real-time service for duplex communication
- Media streaming service
- Speech-to-text / Text-to-speech services
- Question database + AI generator
- Storage service for recordings
- Anti-cheat detection engine

### Security
- Token-based authentication
- Role-based access control
- End-to-end encryption for media
- Rate limiting per user
- CORS, CSRF protection
- Input validation and sanitization

## Conclusion

This prototype demonstrates a complete, production-ready design specification for the **First Round AI** candidate experience. All screens, components, flows, API contracts, and policies are documented and wireframed. The design prioritizes:

1. **Candidate respect**: fair, transparent anti-cheat with clear communication
2. **Usability**: intuitive flows, helpful guidance, responsive design
3. **Privacy**: minimal data collection, clear consent, encryption
4. **Quality**: real-time monitoring, comprehensive feedback, actionable insights
5. **Accessibility**: keyboard navigation, readable contrast, semantic markup

Use this prototype as a blueprint for implementation, ensuring all specifications are followed for consistency and compliance.
