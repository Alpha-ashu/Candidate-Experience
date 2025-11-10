# Technical Specification Document

## 1. System Architecture

### 1.1 High-Level Architecture

CandidateX follows a microservices-inspired architecture with clear separation of concerns:

```
┌─────────────────────────────────────────────────────────────────┐
│                          Client Layer                           │
│  ┌─────────────────┐ ┌─────────────────┐ ┌─────────────────┐   │
│  │   Web Browser   │ │   Mobile Web    │ │   Admin Portal   │   │
│  │  (React + TS)   │ │   (Responsive)  │ │  (React Admin)   │   │
│  └─────────────────┘ └─────────────────┘ └─────────────────┘   │
└─────────────────────────────────────────────────────────────────┘
                                   │
                                   ▼
┌─────────────────────────────────────────────────────────────────┐
│                        API Gateway Layer                        │
│  ┌─────────────────┐ ┌─────────────────┐ ┌─────────────────┐   │
│  │   FastAPI       │ │   WebSocket     │ │   Authentication │   │
│  │   REST APIs     │ │   Gateway       │ │   Service        │   │
│  └─────────────────┘ └─────────────────┘ └─────────────────┘   │
└─────────────────────────────────────────────────────────────────┘
                                   │
                                   ▼
┌─────────────────────────────────────────────────────────────────┐
│                       Service Layer                             │
│  ┌─────────────────┐ ┌─────────────────┐ ┌─────────────────┐   │
│  │   Interview     │ │   AI Service    │ │   Anti-cheat     │   │
│  │   Service       │ │   Proxy         │ │   Service        │   │
│  ├─────────────────┤ ├─────────────────┤ ├─────────────────┤   │
│  │   Resume        │ │   File Upload   │ │   Notification   │   │
│  │   Processor     │ │   Service       │ │   Service        │   │
│  └─────────────────┘ └─────────────────┘ └─────────────────┘   │
└─────────────────────────────────────────────────────────────────┘
                                   │
                                   ▼
┌─────────────────────────────────────────────────────────────────┐
│                       Data Layer                                │
│  ┌─────────────────┐ ┌─────────────────┐ ┌─────────────────┐   │
│  │   MongoDB       │ │   Redis Cache   │ │   File Storage   │   │
│  │   (Primary DB)  │ │   (Sessions)    │ │   (S3/Firebase)  │   │
│  └─────────────────┘ └─────────────────┘ └─────────────────┘   │
└─────────────────────────────────────────────────────────────────┘
```

### 1.2 Technology Stack

#### Frontend
- **Web Framework**: React 18.3.1 with TypeScript
- **Mobile Framework**: React Native 0.72+ for iOS/Android apps
- **Build Tools**: Vite 6.3.5 (web), Metro (mobile)
- **Styling**: Tailwind CSS + Radix UI components + NativeWind (mobile)
- **State Management**: Zustand for global state + React Query for server state
- **Routing**: React Router DOM (web) + React Navigation (mobile)
- **Charts**: Recharts (web) + Victory Native (mobile)
- **3D Graphics**: Three.js (web) + React Three Fiber
- **Offline Support**: Redux Persist + AsyncStorage (mobile)

#### Backend
- **Framework**: FastAPI (Python 3.11+) with microservices architecture
- **API Gateway**: Kong or Traefik for service orchestration
- **Database**: MongoDB 7.0 with Motor (async driver) + PostgreSQL for analytics
- **Cache**: Redis Cluster for session management and distributed caching
- **Message Queue**: Apache Kafka for event-driven processing
- **Authentication**: JWT tokens with RS256 signing + OAuth 2.0 flows
- **Validation**: Pydantic v2 for data models and validation
- **Documentation**: Automatic OpenAPI/Swagger docs with ReDoc

#### External Services & Integrations
- **AI Integration**: Google Gemini API, OpenAI API, custom ML models
- **File Storage**: AWS S3 with CloudFront CDN + Firebase for mobile
- **Email Service**: SendGrid/Postmark with templates and analytics
- **Video Processing**: Agora/Twilio WebRTC + recording services
- **Payment Processing**: Stripe with subscription management
- **Job Boards**: LinkedIn API, Indeed API, Glassdoor API
- **Calendar Services**: Google Calendar, Outlook Calendar integration
- **SSO Providers**: SAML 2.0, OAuth 2.0 (Google, Microsoft, LinkedIn)

#### DevOps & Deployment
- **Containerization**: Docker + Kubernetes orchestration
- **Infrastructure**: AWS EKS with multi-region deployment
- **CI/CD**: GitHub Actions + ArgoCD for GitOps
- **Monitoring**: DataDog/New Relic for application monitoring
- **Logging**: ELK Stack (Elasticsearch, Logstash, Kibana)
- **Security**: AWS WAF, vulnerability scanning, SOC 2 compliance
- **Load Balancing**: AWS ALB with auto-scaling groups

## 2. Database Design

### 2.1 MongoDB Collections

#### Users Collection
```javascript
{
  _id: ObjectId,
  email: String (unique, indexed),
  full_name: String,
  hashed_password: String,
  role: Enum['candidate', 'recruiter', 'admin'],
  is_active: Boolean (default: true),
  avatar_url: String (optional),
  created_at: DateTime,
  updated_at: DateTime,
  last_login: DateTime,
  preferences: {
    theme: String (default: 'light'),
    notifications: Boolean (default: true),
    language: String (default: 'en')
  },
  profile: {
    phone: String (optional),
    location: String (optional),
    linkedin_url: String (optional),
    github_url: String (optional),
    bio: String (optional)
  }
}
```

#### Interview Sessions Collection
```javascript
{
  _id: ObjectId,
  session_id: String (unique, indexed),
  candidate_id: ObjectId (foreign key),
  recruiter_id: ObjectId (foreign key, optional),
  type: Enum['mock', 'live', 'ai_mock'],
  mode: Enum['behavioral', 'technical'],
  status: Enum['setup', 'precheck', 'active', 'paused', 'completed', 'terminated'],
  job_description: String,
  job_title: String,
  experience_level: String,
  resume_text: String (optional),
  question_count: Number,
  duration_minutes: Number,
  focus_areas: Array[String],
  questions: Array[{
    id: String,
    type: Enum['text', 'voice', 'coding'],
    content: String,
    expected_answer: String (optional),
    ai_feedback: Object (optional)
  }],
  answers: Array[{
    question_id: String,
    content: String,
    type: String,
    timestamp: DateTime,
    ai_feedback: Object
  }],
  result: {
    total_score: Number,
    behavioral_score: Number (optional),
    technical_score: Number (optional),
    feedback: String,
    strengths: Array[String],
    weaknesses: Array[String],
    recommendations: Array[String]
  },
  anti_cheat_log: Array[{
    event: String,
    timestamp: DateTime,
    details: Object,
    sequence_hash: String
  }],
  precheck_result: {
    camera: Boolean,
    microphone: Boolean,
    speaker: Boolean,
    fullscreen: Boolean,
    single_screen: Boolean,
    passed: Boolean,
    warnings: Array[String]
  },
  created_at: DateTime,
  started_at: DateTime (optional),
  completed_at: DateTime (optional),
  terminated_reason: String (optional)
}
```

#### Resumes Collection
```javascript
{
  _id: ObjectId,
  candidate_id: ObjectId (foreign key),
  filename: String,
  file_url: String,
  file_size: Number,
  mime_type: String,
  parsed_text: String,
  ats_score: Number,
  skills: Array[String],
  experience_years: Number,
  education: String,
  contact_info: {
    email: String,
    phone: String,
    location: String
  },
  analysis_result: {
    keyword_matches: Array[String],
    missing_skills: Array[String],
    suggestions: Array[String],
    overall_score: Number
  },
  status: Enum['pending', 'processed', 'failed'],
  uploaded_at: DateTime,
  processed_at: DateTime (optional)
}
```

#### Audit Logs Collection
```javascript
{
  _id: ObjectId,
  user_id: ObjectId (foreign key),
  action: String,
  resource: String,
  resource_id: String (optional),
  details: Object,
  ip_address: String,
  user_agent: String,
  timestamp: DateTime,
  severity: Enum['low', 'medium', 'high', 'critical']
}
```

### 2.2 Redis Data Structures

#### Session Storage
- **Key**: `session:{session_id}`
- **Type**: Hash
- **Fields**: user_id, role, created_at, expires_at, ip_address

#### Interview State
- **Key**: `interview:{session_id}:state`
- **Type**: Hash
- **Fields**: current_question, time_remaining, status, last_activity

#### Rate Limiting
- **Key**: `ratelimit:{user_id}:{endpoint}`
- **Type**: String (counter with expiration)

#### Cache Keys
- **User Profile**: `cache:user:{user_id}` (TTL: 1 hour)
- **Interview Results**: `cache:interview:{session_id}:results` (TTL: 24 hours)
- **AI Responses**: `cache:ai:{hash}` (TTL: 1 week)

## 3. API Specification

### 3.1 REST API Endpoints

#### Authentication Endpoints
```
POST /auth/register
- Body: {email, password, full_name, role}
- Response: {user, access_token}

POST /auth/login
- Body: {username, password} (OAuth2 format)
- Response: {access_token, token_type}

POST /auth/logout
- Headers: Authorization: Bearer {token}
- Response: {message}

POST /auth/refresh
- Headers: Authorization: Bearer {refresh_token}
- Response: {access_token}

POST /auth/forgot-password
- Body: {email}
- Response: {message}

POST /auth/reset-password
- Body: {token, new_password}
- Response: {message}
```

#### Interview Endpoints
```
POST /interview/sessions
- Create new interview session
- Body: InterviewSessionCreate
- Response: InterviewSessionResponse

GET /interview/sessions/{session_id}
- Get session details
- Response: InterviewSessionResponse

POST /interview/sessions/{session_id}/precheck
- Submit precheck results
- Body: PrecheckResult
- Response: {passed, warnings}

GET /interview/sessions/{session_id}/next-question
- Get next question (AI-generated)
- Response: Question

POST /interview/sessions/{session_id}/answer
- Submit answer
- Body: Answer
- Response: {feedback, next_question_id}

POST /interview/sessions/{session_id}/finalize
- Complete interview and generate results
- Response: InterviewResult

GET /interview/sessions/{session_id}/summary
- Get interview summary
- Response: InterviewSummary
```

#### Resume Endpoints
```
POST /resume/upload
- Upload resume file
- FormData: file, candidate_id
- Response: Resume

GET /resume/{resume_id}
- Get resume details
- Response: Resume

POST /resume/{resume_id}/analyze
- Trigger ATS analysis
- Response: AnalysisResult

GET /resume/{resume_id}/download
- Download original file
- Response: File stream
```

#### Admin Endpoints
```
GET /admin/users
- List users with pagination
- Query: page, limit, search, role
- Response: PaginatedUserList

PUT /admin/users/{user_id}
- Update user details
- Body: UserUpdate
- Response: User

DELETE /admin/users/{user_id}
- Deactivate user
- Response: {message}

GET /admin/audit-logs
- Get audit logs
- Query: filters, pagination
- Response: PaginatedAuditLog

GET /admin/dashboard/stats
- Get system statistics
- Response: DashboardStats
```

### 3.2 WebSocket Endpoints

#### Interview Streaming
```
WS /interview/{session_id}/stream
- Authentication: Bearer token in query params
- Events:
  - question: New question available
  - timer: Time update
  - feedback: AI feedback received
  - warning: Anti-cheat warning
  - complete: Interview finished
```

#### Live Interview
```
WS /live-interview/{session_id}
- Authentication: Bearer token
- Events:
  - join: Participant joined
  - leave: Participant left
  - message: Chat message
  - offer: WebRTC offer
  - answer: WebRTC answer
  - ice-candidate: WebRTC ICE candidate
```

### 3.3 API Response Formats

#### Standard Response
```json
{
  "success": true,
  "data": {},
  "message": "Operation successful",
  "timestamp": "2025-01-01T00:00:00Z"
}
```

#### Error Response
```json
{
  "success": false,
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Invalid input data",
    "details": {
      "field": "email",
      "reason": "Invalid email format"
    }
  },
  "timestamp": "2025-01-01T00:00:00Z"
}
```

#### Paginated Response
```json
{
  "success": true,
  "data": {
    "items": [],
    "total": 100,
    "page": 1,
    "limit": 20,
    "pages": 5
  },
  "message": "Data retrieved successfully"
}
```

## 4. Security Implementation

### 4.1 Authentication & Authorization

#### JWT Token Structure
```json
{
  "sub": "user_id",
  "email": "user@example.com",
  "role": "candidate",
  "exp": 1640995200,
  "iat": 1640991600,
  "iss": "candidatex-api"
}
```

#### Password Security
- **Hashing**: bcrypt with salt rounds = 12
- **Minimum Requirements**: 8+ chars, mixed case, numbers, symbols
- **Reset Tokens**: Secure random strings with 1-hour expiration

#### Role-Based Access Control
```python
PERMISSIONS = {
    'candidate': ['read_own_profile', 'create_interview', 'upload_resume'],
    'recruiter': ['read_candidates', 'create_live_interview', 'analyze_resumes'],
    'admin': ['manage_users', 'view_audit_logs', 'configure_system']
}
```

### 4.2 Anti-Cheat System

#### Event Monitoring
- **Browser Events**: Tab visibility, fullscreen changes, right-click prevention
- **Camera Analysis**: Face detection and counting using OpenCV.js
- **Input Tracking**: Mouse movement patterns, typing speed analysis
- **Network Monitoring**: Request interception and timing analysis

#### Violation Detection
```python
VIOLATION_THRESHOLDS = {
    'face_missing': 3,      # strikes
    'tab_switch': 2,        # strikes
    'fullscreen_exit': 1,   # strikes
    'multiple_faces': 1,    # strikes
    'suspicious_input': 5   # strikes
}
```

#### Sequence Hashing
- **Purpose**: Prevent replay attacks and detect tampering
- **Algorithm**: SHA-256 hash of event sequence with timestamp
- **Validation**: Compare against expected sequence on server

### 4.3 Data Protection

#### Encryption
- **At Rest**: MongoDB field-level encryption for sensitive data
- **In Transit**: TLS 1.3 for all communications
- **Passwords**: bcrypt hashing (not encryption)

#### Privacy Compliance
- **GDPR**: Data minimization, consent management, right to erasure
- **CCPA**: Data portability, opt-out mechanisms
- **Retention**: Configurable data retention policies

## 5. Performance & Scalability

### 5.1 Database Optimization

#### Indexing Strategy
```javascript
// Users collection
db.users.createIndex({email: 1}, {unique: true})
db.users.createIndex({role: 1})
db.users.createIndex({created_at: -1})

// Interview sessions
db.interview_sessions.createIndex({session_id: 1}, {unique: true})
db.interview_sessions.createIndex({candidate_id: 1, created_at: -1})
db.interview_sessions.createIndex({status: 1})
db.interview_sessions.createIndex({type: 1, mode: 1})

// Compound indexes for queries
db.interview_sessions.createIndex({
  candidate_id: 1,
  status: 1,
  created_at: -1
})
```

#### Query Optimization
- **Covered Queries**: Include all fields in index for common queries
- **Pagination**: Use skip/limit with indexed sort fields
- **Aggregation Pipeline**: Optimize with $match, $sort, $limit stages

### 5.2 Caching Strategy

#### Redis Cache Layers
- **Application Cache**: Frequently accessed data (user profiles, settings)
- **Session Cache**: User sessions and temporary state
- **Query Cache**: Expensive database query results
- **API Cache**: External API responses (AI service results)

#### Cache Invalidation
- **Time-based**: TTL expiration for volatile data
- **Event-based**: Invalidate on data updates
- **Manual**: Admin-triggered cache clearing

### 5.3 API Performance

#### Response Time Targets
- **Authentication**: < 200ms
- **Dashboard Data**: < 500ms
- **Interview Operations**: < 300ms
- **File Upload**: < 2s for 10MB files

#### Optimization Techniques
- **Database Connection Pooling**: Motor async driver with connection reuse
- **Query Batching**: Multiple operations in single database call
- **Response Compression**: Gzip compression for API responses
- **CDN Integration**: Static asset delivery optimization

## 6. Deployment & DevOps

### 6.1 Docker Configuration

#### Dockerfile (Backend)
```dockerfile
FROM python:3.11-slim

WORKDIR /app

COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

COPY . .

EXPOSE 8000

CMD ["uvicorn", "main:app", "--host", "0.0.0.0", "--port", "8000"]
```

#### Dockerfile (Frontend)
```dockerfile
FROM node:18-alpine

WORKDIR /app

COPY package*.json .
RUN npm ci --only=production

COPY . .

RUN npm run build

EXPOSE 5173

CMD ["npm", "run", "preview"]
```

#### Docker Compose
```yaml
version: '3.8'

services:
  mongodb:
    image: mongo:7.0
    volumes:
      - mongodb_data:/data/db
    environment:
      MONGO_INITDB_ROOT_USERNAME: admin
      MONGO_INITDB_ROOT_PASSWORD: password

  redis:
    image: redis:7-alpine
    volumes:
      - redis_data:/data

  backend:
    build: ./backend
    environment:
      MONGODB_URL: mongodb://admin:password@mongodb:27017
      REDIS_URL: redis://redis:6379
    depends_on:
      - mongodb
      - redis

  frontend:
    build: ./src
    ports:
      - "5173:5173"
```

### 6.2 Environment Configuration

#### Environment Variables
```bash
# Database
MONGODB_URL=mongodb://localhost:27017
DATABASE_NAME=candidatex

# Security
SECRET_KEY=your-secret-key-here
JWT_SECRET_KEY=your-jwt-secret
ACCESS_TOKEN_EXPIRE_MINUTES=30

# AI Services
GEMINI_API_KEY=your-gemini-key
OPENAI_API_KEY=your-openai-key

# File Storage
AWS_ACCESS_KEY_ID=your-aws-key
AWS_SECRET_ACCESS_KEY=your-aws-secret
S3_BUCKET_NAME=candidatex-media

# Email
SMTP_SERVER=smtp.gmail.com
SMTP_PORT=587
SMTP_USERNAME=your-email@gmail.com
SMTP_PASSWORD=your-app-password

# Anti-cheat
ANTI_CHEAT_THRESHOLD=3
FACE_DETECTION_ENABLED=true
TAB_SWITCH_DETECTION=true

# Performance
REDIS_URL=redis://localhost:6379
CACHE_TTL_SECONDS=3600
```

### 6.3 Monitoring & Logging

#### Application Logging
```python
import logging

logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s',
    handlers=[
        logging.FileHandler('app.log'),
        logging.StreamHandler()
    ]
)

# Structured logging for production
logger = logging.getLogger(__name__)
logger.info("User login", extra={
    "user_id": user.id,
    "ip_address": request.client.host,
    "user_agent": request.headers.get("user-agent")
})
```

#### Health Checks
```python
@app.get("/health")
async def health_check():
    return {
        "status": "healthy",
        "timestamp": datetime.utcnow(),
        "version": "1.0.0",
        "services": {
            "database": await check_database(),
            "redis": await check_redis(),
            "ai_service": await check_ai_service()
        }
    }
```

## 7. Testing Strategy

### 7.1 Unit Testing
```python
# tests/test_auth.py
import pytest
from app.services.auth import authenticate_user

def test_authenticate_valid_user():
    user = authenticate_user("test@example.com", "password123")
    assert user is not None
    assert user.email == "test@example.com"

def test_authenticate_invalid_password():
    with pytest.raises(HTTPException):
        authenticate_user("test@example.com", "wrongpassword")
```

### 7.2 Integration Testing
```python
# tests/test_interview_flow.py
def test_complete_interview_flow(client, test_user):
    # Create session
    response = client.post("/interview/sessions", json={
        "candidate_id": str(test_user.id),
        "type": "mock",
        "mode": "technical"
    })
    assert response.status_code == 201
    session_id = response.json()["id"]
    
    # Start precheck
    response = client.post(f"/interview/sessions/{session_id}/precheck", json={
        "camera": True,
        "microphone": True,
        "passed": True
    })
    assert response.status_code == 200
    
    # Get first question
    response = client.get(f"/interview/sessions/{session_id}/next-question")
    assert response.status_code == 200
    question = response.json()
    
    # Submit answer
    response = client.post(f"/interview/sessions/{session_id}/answer", json={
        "question_id": question["id"],
        "content": "Test answer",
        "type": "text"
    })
    assert response.status_code == 200
```

### 7.3 End-to-End Testing
```javascript
// e2e/test_interview_flow.spec.js
describe('Interview Flow', () => {
  it('should complete full interview process', () => {
    cy.visit('/login')
    cy.get('[data-cy=email]').type('candidate@test.com')
    cy.get('[data-cy=password]').type('password123')
    cy.get('[data-cy=login-button]').click()
    
    cy.url().should('include', '/candidate/dashboard')
    
    cy.get('[data-cy=start-interview]').click()
    cy.get('[data-cy=job-title]').type('Software Engineer')
    cy.get('[data-cy=start-button]').click()
    
    // Precheck flow
    cy.get('[data-cy=camera-test]').should('be.visible')
    cy.get('[data-cy=allow-camera]').click()
    cy.get('[data-cy=proceed-button]').click()
    
    // Interview session
    cy.get('[data-cy=question]').should('be.visible')
    cy.get('[data-cy=answer-input]').type('Sample answer')
    cy.get('[data-cy=submit-answer]').click()
    
    // Results
    cy.url().should('include', '/summary')
    cy.get('[data-cy=score]').should('be.visible')
  })
})
```

## 8. Future Enhancements

### 8.1 Scalability Improvements
- **Microservices Migration**: Split monolithic backend into microservices
- **Kubernetes Orchestration**: Container orchestration for production
- **Database Sharding**: Horizontal scaling for large datasets
- **CDN Integration**: Global content delivery for static assets

### 8.2 Advanced Features
- **Machine Learning**: Custom model training for better AI feedback
- **Video Analysis**: Advanced behavioral analysis from video feeds
- **Real-time Collaboration**: Multi-user interview sessions
- **API Marketplace**: Third-party integrations and plugins

### 8.3 Compliance & Security
- **Zero Trust Architecture**: Enhanced security with continuous verification
- **Advanced Audit**: Blockchain-based audit trails
- **Privacy Enhancements**: Homomorphic encryption for sensitive data
- **International Compliance**: Multi-region data residency options

This technical specification provides the foundation for implementing the CandidateX platform with robust, scalable, and secure architecture that can support the business requirements and user needs outlined in the other documentation.
