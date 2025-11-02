from fastapi import APIRouter, UploadFile, File, HTTPException, status, Depends, Request
from slowapi import Limiter
from slowapi.util import get_remote_address
from typing import List, Dict, Any, Optional
import json

from ..main import limiter
from ..config import settings
from ..services.career_service import CareerService
from ..services.resume_service import ResumeService
from ..schemas import (
    CareerPath, SkillAssessment, PerformanceMetrics,
    ResumeUploadResponse, ResumeOptimization
)
from ..security.deps import get_current_user
from ..db import get_database

router = APIRouter(prefix="/career", tags=["career"])
career_service = CareerService()
resume_service = ResumeService()


@router.post("/path", response_model=CareerPath)
@limiter.limit("10/minute")
async def generate_career_path(
    request: Request,
    career_data: Dict[str, Any],
    current_user: Dict = Depends(get_current_user)
):
    """Generate personalized career path"""
    user_id = current_user["sub"]

    try:
        career_path = await career_service.generate_career_path(
            user_id=user_id,
            target_role=career_data["target_role"],
            current_skills=career_data.get("current_skills", []),
            experience_level=career_data.get("experience_level", "entry"),
            timeline_preference=career_data.get("timeline_preference", 12)
        )
        return career_path
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"Failed to generate career path: {str(e)}"
        )


@router.get("/path", response_model=List[CareerPath])
@limiter.limit("20/minute")
async def get_user_career_paths(
    request: Request,
    current_user: Dict = Depends(get_current_user)
):
    """Get user's career paths"""
    user_id = current_user["sub"]

    db = get_database()
    career_paths = await db.career_paths.find(
        {"userId": user_id}
    ).sort("createdAt", -1).to_list(None)

    return career_paths


@router.post("/skills/assess", response_model=List[SkillAssessment])
@limiter.limit("5/minute")
async def assess_skills(
    request: Request,
    assessment_data: Dict[str, Any],
    current_user: Dict = Depends(get_current_user)
):
    """Assess user's skills based on performance and self-assessment"""
    user_id = current_user["sub"]

    try:
        assessments = await career_service.assess_skills(user_id, assessment_data)
        return assessments
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"Failed to assess skills: {str(e)}"
        )


@router.get("/skills", response_model=List[SkillAssessment])
@limiter.limit("20/minute")
async def get_skill_assessments(
    request: Request,
    current_user: Dict = Depends(get_current_user)
):
    """Get user's skill assessments"""
    user_id = current_user["sub"]

    db = get_database()
    assessments = await db.skill_assessments.find(
        {"userId": user_id}
    ).sort("lastAssessed", -1).to_list(None)

    return assessments


@router.get("/market-insights")
@limiter.limit("30/minute")
async def get_market_insights(
    request: Request,
    role: Optional[str] = None
):
    """Get market insights and trends"""
    try:
        insights = await career_service.get_market_insights(role)
        return insights
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"Failed to get market insights: {str(e)}"
        )


@router.post("/milestone/{milestone_id}/complete")
@limiter.limit("10/minute")
async def complete_milestone(
    request: Request,
    milestone_id: str,
    completion_data: Dict[str, Any],
    current_user: Dict = Depends(get_current_user)
):
    """Mark a milestone as complete"""
    user_id = current_user["sub"]

    db = get_database()
    result = await db.career_paths.update_one(
        {"userId": user_id, "milestones.id": milestone_id},
        {"$set": {"milestones.$.completed": True, "milestones.$.completedAt": completion_data.get("notes")}}
    )

    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Milestone not found")

    return {"message": "Milestone marked as complete"}


@router.get("/analytics/performance", response_model=PerformanceMetrics)
@limiter.limit("20/minute")
async def get_performance_metrics(
    request: Request,
    timeframe: str = "month",
    current_user: Dict = Depends(get_current_user)
):
    """Get performance analytics"""
    user_id = current_user["sub"]

    if timeframe not in ["week", "month", "quarter", "year"]:
        raise HTTPException(status_code=400, detail="Invalid timeframe")

    # Calculate metrics from session data
    db = get_database()
    sessions = await db.sessions.find(
        {"userId": user_id}
    ).sort("createdAt", -1).to_list(None)

    # Filter by timeframe
    cutoff_dates = {
        "week": datetime.utcnow() - timedelta(days=7),
        "month": datetime.utcnow() - timedelta(days=30),
        "quarter": datetime.utcnow() - timedelta(days=90),
        "year": datetime.utcnow() - timedelta(days=365)
    }

    cutoff_date = cutoff_dates[timeframe]
    filtered_sessions = [s for s in sessions if s.get("createdAt") and s["createdAt"] > cutoff_date]

    if not filtered_sessions:
        return PerformanceMetrics(
            userId=user_id,
            timeframe=timeframe,
            totalInterviews=0,
            averageScore=0,
            scoreByCategory={},
            improvementRate=0,
            strengths=[],
            improvementAreas=[],
            peerComparison=None
        )

    # Calculate metrics
    total_interviews = len(filtered_sessions)
    scores = [s.get("score", 0) for s in filtered_sessions]
    average_score = sum(scores) / len(scores) if scores else 0

    # Score by category
    score_by_category = {}
    for session in filtered_sessions:
        feedback = session.get("feedback", {})
        rubric = feedback.get("rubric", {})
        for category, score_data in rubric.items():
            if isinstance(score_data, dict) and "score" in score_data:
                if category not in score_by_category:
                    score_by_category[category] = []
                score_by_category[category].append(score_data["score"])

    # Calculate category averages
    for category in score_by_category:
        scores = score_by_category[category]
        score_by_category[category] = sum(scores) / len(scores) if scores else 0

    # Calculate improvement rate
    if len(scores) >= 2:
        improvement_rate = (scores[-1] - scores[0]) / scores[0] * 100 if scores[0] != 0 else 0
    else:
        improvement_rate = 0

    # Identify strengths and improvement areas
    strengths = []
    improvement_areas = []

    for category, avg_score in score_by_category.items():
        if avg_score >= 80:
            strengths.append(category)
        elif avg_score < 60:
            improvement_areas.append(category)

    # Peer comparison (mock data for now)
    peer_comparison = {
        "percentile": 75,
        "average_peer_score": 72,
        "total_candidates": 1000
    }

    return PerformanceMetrics(
        userId=user_id,
        timeframe=timeframe,
        totalInterviews=total_interviews,
        averageScore=average_score,
        scoreByCategory=score_by_category,
        improvementRate=improvement_rate,
        strengths=strengths,
        improvementAreas=improvement_areas,
        peerComparison=peer_comparison
    )


# Resume Analysis Endpoints
@router.post("/resume/upload", response_model=ResumeUploadResponse)
@limiter.limit("5/minute")
async def upload_resume(
    request: Request,
    file: UploadFile = File(...),
    target_role: str = "software_engineer",
    current_user: Dict = Depends(get_current_user)
):
    """Upload and analyze resume"""
    user_id = current_user["sub"]

    # Validate file type
    allowed_types = ["application/pdf", "application/vnd.openxmlformats-officedocument.wordprocessingml.document", "text/plain"]
    if file.content_type not in allowed_types:
        raise HTTPException(status_code=400, detail="Invalid file type. Please upload PDF, DOCX, or TXT file.")

    # Validate file size (10MB limit)
    if file.size and file.size > 10 * 1024 * 1024:
        raise HTTPException(status_code=400, detail="File too large. Please upload a file smaller than 10MB.")

    try:
        file_content = await file.read()
        file_type = file.content_type.split("/")[-1] if "/" in file.content_type else "txt"

        # Map content types to file extensions
        type_mapping = {
            "pdf": "pdf",
            "vnd.openxmlformats-officedocument.wordprocessingml.document": "docx",
            "plain": "txt"
        }
        file_type = type_mapping.get(file_type, "txt")

        analysis = await resume_service.parse_resume(
            file_content=file_content,
            file_type=file_type,
            target_role=target_role
        )

        return analysis

    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"Failed to analyze resume: {str(e)}"
        )


@router.post("/resume/optimize", response_model=ResumeOptimization)
@limiter.limit("3/minute")
async def optimize_resume(
    request: Request,
    optimization_data: Dict[str, Any],
    current_user: Dict = Depends(get_current_user)
):
    """Optimize resume for specific role"""
    resume_id = optimization_data.get("resume_id")
    target_role = optimization_data.get("target_role")
    job_description = optimization_data.get("job_description")

    if not resume_id or not target_role:
        raise HTTPException(status_code=400, detail="resume_id and target_role are required")

    try:
        optimization = await resume_service.optimize_resume(
            resume_id=resume_id,
            target_role=target_role,
            job_description=job_description
        )
        return optimization

    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"Failed to optimize resume: {str(e)}"
        )


@router.get("/resume/analyses")
@limiter.limit("20/minute")
async def get_resume_analyses(
    request: Request,
    current_user: Dict = Depends(get_current_user)
):
    """Get user's resume analyses"""
    user_id = current_user["sub"]

    db = get_database()
    analyses = await db.resume_analyses.find(
        {"userId": user_id}
    ).sort("createdAt", -1).to_list(None)

    # Remove sensitive data
    for analysis in analyses:
        if "_id" in analysis:
            analysis["_id"] = str(analysis["_id"])
        if "parsedContent" in analysis and "raw_text" in analysis["parsedContent"]:
            del analysis["parsedContent"]["raw_text"]

    return analyses


@router.get("/resume/templates")
@limiter.limit("30/minute")
async def get_resume_templates(request: Request):
    """Get available resume templates"""
    templates = [
        {
            "id": "modern",
            "name": "Modern Clean",
            "description": "Clean, professional template suitable for most industries",
            "preview": "https://example.com/modern-preview.png",
            "sections": ["contact", "summary", "experience", "skills", "education"]
        },
        {
            "id": "technical",
            "name": "Technical Professional",
            "description": "Template optimized for technical roles with skills section",
            "preview": "https://example.com/technical-preview.png",
            "sections": ["contact", "summary", "technical_skills", "experience", "projects", "education"]
        },
        {
            "id": "executive",
            "name": "Executive",
            "description": "Template for senior-level positions and executives",
            "preview": "https://example.com/executive-preview.png",
            "sections": ["contact", "executive_summary", "leadership_experience", "achievements", "education"]
        }
    ]

    return templates


@router.post("/learning/recommendations")
@limiter.limit("10/minute")
async def get_learning_recommendations(
    request: Request,
    learning_data: Dict[str, Any],
    current_user: Dict = Depends(get_current_user)
):
    """Get personalized learning recommendations"""
    user_id = current_user["sub"]

    target_skills = learning_data.get("target_skills", [])
    current_level = learning_data.get("current_level", "beginner")
    learning_style = learning_data.get("learning_style", "mixed")
    time_commitment = learning_data.get("time_commitment", "5")  # hours per week

    recommendations = []

    for skill in target_skills:
        # Get learning resources from career service
        skill_data = career_service.career_data["skills_database"].get(skill, {})
        resources = skill_data.get("learning_resources", [])

        for resource in resources[:3]:  # Top 3 resources per skill
            recommendations.append({
                "skill": skill,
                "title": resource["title"],
                "type": resource["type"],
                "duration": resource["duration"],
                "difficulty": skill_data.get("difficulty", "intermediate"),
                "estimated_hours": self._estimate_hours(resource["type"], resource["duration"]),
                "rating": 4.5,  # Mock rating
                "provider": "First Round AI Learning",
                "url": f"https://learning.firstround.ai/courses/{resource['title'].lower().replace(' ', '-')}"
            })

    return {"recommendations": recommendations}


def _estimate_hours(resource_type: str, duration: str) -> int:
    """Estimate hours needed for a learning resource"""
    if "week" in duration:
        weeks = int(duration.split()[0])
        return weeks * 10  # 10 hours per week
    elif "month" in duration:
        months = int(duration.split()[0])
        return months * 40  # 40 hours per month
    elif "ongoing" in duration:
        return 100  # Ongoing resources
    else:
        return 20  # Default estimate