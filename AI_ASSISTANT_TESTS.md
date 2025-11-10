# AI Assistant Test Suite

This document describes the comprehensive test suite for the AI Career Assistant functionality in CandidateX.

## 🧪 Test Overview

The AI Assistant test suite covers both backend API endpoints and frontend React components to ensure reliable, high-quality AI-powered career guidance.

### Test Categories

1. **Backend API Tests** (`backend/test_ai_chat.py`)
   - AI chat endpoint functionality
   - Error handling and edge cases
   - Response format validation
   - Career advice topic coverage

2. **Frontend Component Tests** (`src/__tests__/`)
   - React component rendering
   - User interaction handling
   - State management
   - API integration

## 🚀 Running Tests

### Backend Tests Only
```bash
cd backend
python -m pytest test_ai_chat.py -v
```

### Frontend Tests Only
```bash
npm test -- --watchAll=false --verbose
```

### All Tests (Recommended)
```bash
python test_runner.py
```

## 📋 Backend Test Cases

### 1. Endpoint Accessibility
- **test_ai_chat_endpoint_exists**: Verifies the `/candidate/ai-chat` endpoint is accessible

### 2. Basic Functionality
- **test_ai_chat_basic_request**: Tests successful message sending and response receiving
- **test_ai_chat_with_conversation_history**: Ensures conversation context is maintained
- **test_ai_chat_response_format**: Validates response structure and timestamp format

### 3. Error Handling
- **test_ai_chat_error_handling**: Tests graceful handling of API failures
- **test_ai_chat_gemini_api_error**: Verifies fallback responses for external API errors

### 4. Career Advice Topics
- **test_ai_chat_career_advice_topics**: Ensures AI provides relevant advice for:
  - Resume improvement
  - Technical interview preparation
  - Behavioral interview questions
  - Networking strategies

### 5. Edge Cases
- **test_ai_chat_empty_message**: Handles empty/whitespace-only messages
- **test_ai_chat_long_conversation_history**: Manages conversation history limits

## 📋 Frontend Test Cases

### useRealtimeChat Hook Tests

#### Initialization
- **initializes with welcome message**: Verifies initial state with AI greeting

#### Message Handling
- **sends message and receives response**: Tests complete message flow
- **handles API errors gracefully**: Ensures error messages are user-friendly

#### Conversation Management
- **includes conversation history in API call**: Verifies context preservation
- **limits conversation history to recent messages**: Prevents excessive API payload

#### Input Validation
- **handles empty message input**: Prevents empty message submission
- **handles whitespace-only message input**: Filters meaningless input

#### Request Management
- **prevents multiple simultaneous requests**: Ensures single-threaded API calls

### AIAssistant Component Tests

#### Rendering
- **renders AI Assistant with welcome message**: Verifies initial UI state
- **displays welcome screen when no messages**: Shows onboarding experience

#### Message Display
- **renders message bubbles correctly**: Tests user/assistant message styling
- **shows loading state when AI is thinking**: Displays appropriate feedback

#### User Interactions
- **sends message when Enter is pressed**: Keyboard interaction
- **sends message when send button is clicked**: Button interaction
- **clicking suggestion button sets input value**: Quick action buttons

#### UI States
- **shows suggestion buttons when messages length is 1**: Contextual help
- **disables input and buttons when loading**: Prevents double-submission
- **shows timestamps for messages**: Time-based message organization
- **shows AI assistant badge for assistant messages**: Clear message attribution

#### Voice Features
- **handles voice button toggle**: Voice input state management

## 🛠️ Test Setup

### Backend Dependencies
```bash
cd backend
pip install pytest httpx
```

### Frontend Dependencies
```bash
npm install --save-dev @testing-library/react @testing-library/jest-dom @testing-library/user-event jest-environment-jsdom @types/jest
```

## 🔧 Test Configuration

### Backend Test Configuration
- Uses `pytest` framework
- Mocks Gemini AI API calls
- Tests both success and error scenarios
- Validates response formats and content

### Frontend Test Configuration
- Uses `@testing-library/react` for component testing
- Mocks API calls and external dependencies
- Tests user interactions and state changes
- Validates component rendering and behavior

## 📊 Test Coverage

### Backend Coverage
- ✅ API endpoint accessibility
- ✅ Request/response handling
- ✅ Error scenarios
- ✅ Data validation
- ✅ Career advice relevance

### Frontend Coverage
- ✅ Component rendering
- ✅ User interactions
- ✅ State management
- ✅ Error handling
- ✅ Accessibility features

## 🚨 Common Issues & Solutions

### Backend Test Issues
1. **API Key Missing**: Ensure `GEMINI_API_KEY` is set in `backend/.env`
2. **Network Issues**: Tests mock external API calls, so network connectivity isn't required
3. **Import Errors**: Ensure all dependencies are installed in the backend environment

### Frontend Test Issues
1. **Missing Test Libraries**: Install all `@testing-library` packages
2. **Type Errors**: Ensure `@types/jest` is installed for TypeScript support
3. **Mock Configuration**: Verify all external dependencies are properly mocked

## 🎯 Test Quality Metrics

- **Backend Tests**: 9 test cases covering all major functionality
- **Test Scenarios**: Success paths, error handling, edge cases
- **Mock Coverage**: External APIs and services are fully mocked
- **CI/CD Ready**: Tests can run in automated environments

## 📈 Continuous Integration

The test suite is designed to run in CI/CD pipelines:

```yaml
# Example GitHub Actions
- name: Run Backend Tests
  run: |
    cd backend
    python -m pytest test_ai_chat.py

- name: Run Frontend Tests
  run: npm test -- --watchAll=false --coverage
```

## 🔍 Debugging Tests

### Backend Debugging
```bash
# Run with detailed output
cd backend
python -m pytest test_ai_chat.py -v -s

# Run specific test
python -m pytest test_ai_chat.py::TestAIChat::test_ai_chat_basic_request -v
```

### Frontend Debugging
```bash
# Run with debugging
npm test -- --testNamePattern="useRealtimeChat" --verbose

# Run in watch mode for development
npm test
```

## 📚 Best Practices

1. **Test Isolation**: Each test is independent and doesn't rely on others
2. **Mock External Dependencies**: API calls and external services are mocked
3. **Descriptive Test Names**: Test names clearly describe what they're testing
4. **Comprehensive Coverage**: Tests cover both happy paths and error scenarios
5. **Maintainable Tests**: Tests are easy to understand and modify

## 🎉 Success Criteria

All tests should pass with:
- ✅ Zero failing tests
- ✅ Proper error handling
- ✅ Realistic response times
- ✅ Comprehensive coverage of user scenarios

The AI Assistant is production-ready when all tests pass and provide reliable career guidance to users! 🚀
