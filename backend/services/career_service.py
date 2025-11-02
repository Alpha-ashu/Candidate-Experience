import uuid
import json
from typing import List, Dict, Any, Optional
from datetime import datetime, timedelta
import re

from ..db import get_database
from ..ai.proxy import AIProxy
from ..schemas import CareerPath, SkillAssessment


class CareerService:
    def __init__(self):
        self.ai_proxy = AIProxy()
        self.career_data = self._load_career_database()

    def _load_career_database(self) -> Dict[str, Any]:
        """Load career paths, skills, and market data"""
        return {
            "career_paths": {
                "software_engineer": {
                    "required_skills": [
                        "programming", "data_structures", "algorithms",
                        "system_design", "databases", "version_control",
                        "testing", "debugging", "communication"
                    ],
                    "average_salary": {"entry": 75000, "mid": 120000, "senior": 180000},
                    "growth_rate": 0.15,
                    "common_next_roles": ["senior_engineer", "tech_lead", "engineering_manager"]
                },
                "qa_engineer": {
                    "required_skills": [
                        "testing_methodologies", "automation", "manual_testing",
                        "api_testing", "performance_testing", "security_testing",
                        "bug_tracking", "documentation", "communication"
                    ],
                    "average_salary": {"entry": 65000, "mid": 95000, "senior": 130000},
                    "growth_rate": 0.12,
                    "common_next_roles": ["senior_qa", "qa_lead", "test_manager"]
                },
                "product_manager": {
                    "required_skills": [
                        "product_strategy", "market_research", "user_research",
                        "data_analysis", "communication", "stakeholder_management",
                        "agile_methodologies", "roadmap_planning", "prioritization"
                    ],
                    "average_salary": {"entry": 85000, "mid": 130000, "senior": 180000},
                    "growth_rate": 0.18,
                    "common_next_roles": ["senior_pm", "group_pm", "vp_product"]
                }
            },
            "skills_database": {
                "programming": {
                    "categories": ["technical", "core"],
                    "difficulty": "intermediate",
                    "learning_resources": [
                        {"title": "Python for Everyone", "type": "course", "duration": "6 weeks"},
                        {"title": "LeetCode Practice", "type": "practice", "duration": "ongoing"},
                        {"title": "System Design Primer", "type": "book", "duration": "4 weeks"}
                    ]
                },
                "communication": {
                    "categories": ["soft", "essential"],
                    "difficulty": "beginner",
                    "learning_resources": [
                        {"title": "Crucial Conversations", "type": "book", "duration": "2 weeks"},
                        {"title": "Public Speaking Practice", "type": "practice", "duration": "ongoing"},
                        {"title": "Technical Writing Course", "type": "course", "duration": "4 weeks"}
                    ]
                }
            },
            "market_trends": {
                "hot_skills": ["cloud_computing", "ai_ml", "cybersecurity", "blockchain"],
                "declining_skills": ["legacy_systems", "manual_testing_only"],
                "emerging_roles": ["ml_engineer", "devops_engineer", "sre"]
            }
        }

    async def generate_career_path(
        self,
        user_id: str,
        target_role: str,
        current_skills: List[str],
        experience_level: str,
        timeline_preference: int
    ) -> CareerPath:
        """Generate personalized career path using AI"""

        # Get role requirements from database
        role_data = self.career_data["career_paths"].get(target_role, {})
        required_skills = role_data.get("required_skills", [])

        # Identify skill gaps
        skill_gaps = [skill for skill in required_skills if skill not in current_skills]

        # Generate learning path using AI
        ai_prompt = f"""
        Generate a personalized career development plan for:
        - Target Role: {target_role}
        - Current Skills: {', '.join(current_skills)}
        - Experience Level: {experience_level}
        - Skill Gaps: {', '.join(skill_gaps)}
        - Timeline Preference: {timeline_preference} months

        Provide:
        1. Prioritized learning sequence
        2. Specific milestones with timelines
        3. Recommended resources for each skill
        4. Progress metrics and checkpoints
        """

        ai_response = await self.ai_proxy.generate_career_guidance(ai_prompt)

        # Parse AI response and create structured career path
        milestones = self._parse_ai_milestones(ai_response, timeline_preference)
        learning_resources = self._get_learning_resources_for_skills(skill_gaps)

        career_path = CareerPath(
            userId=user_id,
            targetRole=target_role,
            currentSkills=current_skills,
            requiredSkills=required_skills,
            skillGaps=skill_gaps,
            learningResources=learning_resources,
            timelineMonths=timeline_preference,
            milestones=milestones,
            createdAt=datetime.utcnow().isoformat()
        )

        # Save to database
        db = get_database()
        await db.career_paths.insert_one(career_path.dict())

        return career_path

    def _parse_ai_milestones(self, ai_response: str, timeline_months: int) -> List[Dict[str, Any]]:
        """Parse AI response to create structured milestones"""
        # For demo, create sample milestones
        # In production, parse actual AI response
        milestones = []

        # Calculate milestone intervals
        num_milestones = min(6, timeline_months // 2)  # One milestone every 2 months
        interval = timeline_months / num_milestones

        skills_sequence = ["programming", "system_design", "databases", "testing", "communication"]

        for i in range(num_milestones):
            month = int((i + 1) * interval)
            skills_to_learn = skills_sequence[i:min(i+2, len(skills_sequence))]

            milestone = {
                "id": str(uuid.uuid4()),
                "title": f"Milestone {i+1}: {', '.join(skills_to_learn).title()}",
                "targetMonth": month,
                "skills": skills_to_learn,
                "deliverables": [
                    f"Complete {skill} course" for skill in skills_to_learn
                ],
                "successCriteria": f"Complete projects demonstrating proficiency in {', '.join(skills_to_learn)}",
                "estimatedHours": 40 * len(skills_to_learn),
                "completed": False
            }
            milestones.append(milestone)

        return milestones

    def _get_learning_resources_for_skills(self, skills: List[str]) -> List[Dict[str, str]]:
        """Get learning resources for specific skills"""
        resources = []

        for skill in skills:
            skill_data = self.career_data["skills_database"].get(skill, {})
            skill_resources = skill_data.get("learning_resources", [])

            for resource in skill_resources[:2]:  # Top 2 resources per skill
                resources.append({
                    "skill": skill,
                    "title": resource["title"],
                    "type": resource["type"],
                    "duration": resource["duration"],
                    "priority": "high" if skill in ["programming", "communication"] else "medium"
                })

        return resources

    async def assess_skills(
        self,
        user_id: str,
        assessment_data: Dict[str, Any]
    ) -> List[SkillAssessment]:
        """Assess user's current skills based on interview performance and self-assessment"""

        assessments = []

        # Get user's recent interview performance
        db = get_database()
        recent_sessions = await db.sessions.find(
            {"userId": user_id}
        ).sort("createdAt", -1).limit(10).to_list(None)

        # Analyze performance by skill category
        skill_performance = self._analyze_performance_by_skill(recent_sessions)

        for skill_name, performance_data in skill_performance.items():
            # Determine current level (1-10)
            current_level = min(10, max(1, int(performance_data["average_score"] / 10)))

            # Get target level based on career goals
            target_level = await self._get_target_skill_level(user_id, skill_name)

            # Generate improvement suggestions using AI
            suggestions = await self._generate_skill_improvement_suggestions(
                skill_name, current_level, target_level, performance_data
            )

            assessment = SkillAssessment(
                userId=user_id,
                skillCategory=self._categorize_skill(skill_name),
                skillName=skill_name,
                currentLevel=current_level,
                targetLevel=target_level,
                assessmentScore=performance_data["average_score"],
                improvementSuggestions=suggestions,
                lastAssessed=datetime.utcnow().isoformat()
            )

            assessments.append(assessment)

        # Save assessments to database
        for assessment in assessments:
            await db.skill_assessments.replace_one(
                {"userId": user_id, "skillName": assessment.skillName},
                assessment.dict(),
                upsert=True
            )

        return assessments

    def _analyze_performance_by_skill(self, sessions: List[Dict]) -> Dict[str, Dict]:
        """Analyze interview performance by skill category"""
        skill_performance = {}

        for session in sessions:
            feedback = session.get("feedback", {})
            rubric = feedback.get("rubric", {})

            for skill, score_data in rubric.items():
                if skill not in skill_performance:
                    skill_performance[skill] = {"scores": [], "count": 0}

                if isinstance(score_data, dict) and "score" in score_data:
                    skill_performance[skill]["scores"].append(score_data["score"])
                elif isinstance(score_data, (int, float)):
                    skill_performance[skill]["scores"].append(score_data)

                skill_performance[skill]["count"] += 1

        # Calculate averages
        for skill, data in skill_performance.items():
            scores = data["scores"]
            if scores:
                data["average_score"] = sum(scores) / len(scores)
                data["improvement_trend"] = self._calculate_trend(scores)
            else:
                data["average_score"] = 0
                data["improvement_trend"] = 0

        return skill_performance

    def _calculate_trend(self, scores: List[float]) -> float:
        """Calculate improvement trend from scores"""
        if len(scores) < 2:
            return 0

        # Simple linear regression to calculate trend
        n = len(scores)
        x_values = list(range(n))

        x_mean = sum(x_values) / n
        y_mean = sum(scores) / n

        numerator = sum((x_values[i] - x_mean) * (scores[i] - y_mean) for i in range(n))
        denominator = sum((x_values[i] - x_mean) ** 2 for i in range(n))

        if denominator == 0:
            return 0

        return numerator / denominator

    async def _get_target_skill_level(self, user_id: str, skill_name: str) -> int:
        """Get target skill level based on user's career goals"""
        # Get user's active career path
        db = get_database()
        career_path = await db.career_paths.find_one({"userId": user_id})

        if not career_path:
            return 7  # Default target level

        # Set target based on skill importance for target role
        critical_skills = ["programming", "communication", "problem_solving"]
        if skill_name in critical_skills:
            return 9
        elif skill_name in career_path.get("requiredSkills", []):
            return 8
        else:
            return 6

    async def _generate_skill_improvement_suggestions(
        self,
        skill_name: str,
        current_level: int,
        target_level: int,
        performance_data: Dict
    ) -> List[str]:
        """Generate AI-powered improvement suggestions"""

        ai_prompt = f"""
        Provide specific, actionable improvement suggestions for:
        - Skill: {skill_name}
        - Current Level: {current_level}/10
        - Target Level: {target_level}/10
        - Recent Performance: {performance_data.get('average_score', 0):.1f} average score
        - Trend: {performance_data.get('improvement_trend', 0):.2f} (positive = improving)

        Provide 3-4 specific suggestions that are:
        1. Actionable and measurable
        2. Appropriate for the current level
        3. Focused on reaching the target level
        4. Based on the performance trend
        """

        try:
            ai_response = await self.ai_proxy.generate_feedback(ai_prompt)
            # Parse AI response into list of suggestions
            suggestions = [s.strip() for s in ai_response.split('\n') if s.strip()]
            return suggestions[:4]  # Return top 4 suggestions
        except:
            # Fallback suggestions
            return [
                f"Practice {skill_name} exercises daily",
                f"Seek feedback on {skill_name} from peers",
                f"Study advanced {skill_name} concepts",
                f"Apply {skill_name} in real-world projects"
            ]

    def _categorize_skill(self, skill_name: str) -> str:
        """Categorize skill into technical, soft, or domain-specific"""
        technical_skills = [
            "programming", "data_structures", "algorithms", "system_design",
            "databases", "testing", "debugging", "cloud_computing"
        ]

        soft_skills = [
            "communication", "leadership", "teamwork", "problem_solving",
            "time_management", "adaptability", "creativity"
        ]

        if skill_name in technical_skills:
            return "technical"
        elif skill_name in soft_skills:
            return "soft"
        else:
            return "domain_specific"

    async def get_market_insights(self, role: Optional[str] = None) -> Dict[str, Any]:
        """Get market insights and trends for career planning"""
        market_data = self.career_data["market_trends"]

        insights = {
            "hot_skills": market_data["hot_skills"],
            "emerging_roles": market_data["emerging_roles"],
            "industry_trends": await self._get_industry_trends(),
            "salary_insights": self._get_salary_insights(role),
            "demand_forecast": await self._get_demand_forecast()
        }

        return insights

    async def _get_industry_trends(self) -> List[Dict[str, Any]]:
        """Get current industry trends"""
        # In production, integrate with external APIs like LinkedIn, Glassdoor
        return [
            {
                "trend": "Remote Work Adoption",
                "impact": "High",
                "relevance": "Increased demand for self-management skills"
            },
            {
                "trend": "AI Integration",
                "impact": "Very High",
                "relevance": "Need for AI literacy across all roles"
            },
            {
                "trend": "Cybersecurity Focus",
                "impact": "High",
                "relevance": "Security knowledge becoming essential"
            }
        ]

    def _get_salary_insights(self, role: Optional[str]) -> Dict[str, Any]:
        """Get salary insights for specific role or general market"""
        if role and role in self.career_data["career_paths"]:
            return self.career_data["career_paths"][role]["average_salary"]

        # Return general market data
        all_salaries = {}
        for role_data in self.career_data["career_paths"].values():
            for level, salary in role_data["average_salary"].items():
                if level not in all_salaries:
                    all_salaries[level] = []
                all_salaries[level].append(salary)

        # Calculate averages
        return {
            level: sum(salaries) / len(salaries)
            for level, salaries in all_salaries.items()
        }

    async def _get_demand_forecast(self) -> Dict[str, Any]:
        """Get demand forecast for different skills and roles"""
        # In production, integrate with job market APIs
        return {
            "high_demand_skills": ["cloud_computing", "ai_ml", "cybersecurity"],
            "growing_roles": ["ml_engineer", "devops_engineer", "sre"],
            "stable_roles": ["software_engineer", "qa_engineer"],
            "declining_roles": ["manual_qa_only", "legacy_system_specialist"]
        }