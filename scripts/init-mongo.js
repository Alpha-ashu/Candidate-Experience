// MongoDB initialization script
// This script creates the initial database and collections

db = db.getSiblingDB('cx');

// Create collections and indexes
db.createCollection('sessions');
db.createCollection('questions');
db.createCollection('answers');
db.createCollection('anti_cheat_events');
db.createCollection('summaries');
db.createCollection('users');
db.createCollection('password_resets');
db.createCollection('live_interviews');
db.createCollection('career_paths');
db.createCollection('skill_assessments');
db.createCollection('resume_analyses');
db.createCollection('resume_optimizations');
db.createCollection('analytics');

// Create indexes for better performance
db.sessions.createIndex({ "userId": 1, "createdAt": -1 });
db.sessions.createIndex({ "state": 1 });
db.sessions.createIndex({ "_id": 1 }, { unique: true });

db.questions.createIndex({ "type": 1, "difficulty": 1 });
db.questions.createIndex({ "tags": 1 });

db.answers.createIndex({ "sessionId": 1, "questionId": 1 });
db.answers.createIndex({ "sessionId": 1, "submittedAt": -1 });

db.anti_cheat_events.createIndex({ "sessionId": 1, "seq": 1 });
db.anti_cheat_events.createIndex({ "sessionId": 1, "ts": -1 });

db.users.createIndex({ "email": 1 }, { unique: true });
db.users.createIndex({ "createdAt": -1 });

db.live_interviews.createIndex({ "candidateId": 1, "scheduledTime": 1 });
db.live_interviews.createIndex({ "recruiterId": 1, "scheduledTime": 1 });
db.live_interviews.createIndex({ "status": 1 });

db.career_paths.createIndex({ "userId": 1, "createdAt": -1 });
db.skill_assessments.createIndex({ "userId": 1, "skillName": 1 });
db.skill_assessments.createIndex({ "userId": 1, "lastAssessed": -1 });

db.resume_analyses.createIndex({ "userId": 1, "createdAt": -1 });
db.resume_optimizations.createIndex({ "resumeId": 1 });

db.analytics.createIndex({ "userId": 1, "timeframe": 1 });
db.analytics.createIndex({ "createdAt": -1 });

// Insert some initial sample data
db.users.insertOne({
  "_id": "demo-user-001",
  "email": "demo@candidate.com",
  "name": "Demo Candidate",
  "role": "candidate",
  "createdAt": new Date(),
  "lastLogin": new Date()
});

print('Database initialized successfully!');