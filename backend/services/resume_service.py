import uuid
import re
import json
from typing import List, Dict, Any, Optional
from datetime import datetime
import io
import pdfplumber
import docx
from collections import Counter

from ..db import get_database
from ..ai.proxy import AIProxy
from ..schemas import ResumeUploadResponse, ResumeOptimization


class ResumeService:
    def __init__(self):
        self.ai_proxy = AIProxy()
        self.ats_keywords = self._load_ats_keywords()
        self.resume_templates = self._load_resume_templates()

    def _load_ats_keywords(self) -> Dict[str, List[str]]:
        """Load ATS keywords by role and industry"""
        return {
            "software_engineer": {
                "technical": [
                    "python", "java", "javascript", "react", "node.js", "aws", "docker",
                    "kubernetes", "microservices", "api", "rest", "sql", "nosql",
                    "git", "ci/cd", "testing", "debugging", "algorithms", "data structures"
                ],
                "soft": [
                    "teamwork", "communication", "problem-solving", "leadership",
                    "agile", "scrum", "collaboration", "project management"
                ],
                "action_verbs": [
                    "developed", "implemented", "designed", "optimized", "led",
                    "architected", "deployed", "maintained", "tested", "refactored"
                ]
            },
            "qa_engineer": {
                "technical": [
                    "automation", "selenium", "cypress", "junit", "testng", "api testing",
                    "performance testing", "security testing", "manual testing", "bug tracking",
                    "jira", "testrail", "ci/cd", "regression testing"
                ],
                "soft": [
                    "attention to detail", "analytical thinking", "communication",
                    "documentation", "collaboration", "quality focus"
                ],
                "action_verbs": [
                    "tested", "automated", "identified", "documented", "verified",
                    "validated", "inspected", "ensured", "monitored", "reported"
                ]
            },
            "product_manager": {
                "technical": [
                    "product roadmap", "user research", "data analysis", "metrics",
                    "agile", "scrum", "market research", "competitor analysis",
                    "product analytics", "a/b testing", "user stories"
                ],
                "soft": [
                    "stakeholder management", "communication", "leadership",
                    "strategic thinking", "prioritization", "negotiation",
                    "presentation", "cross-functional collaboration"
                ],
                "action_verbs": [
                    "launched", "managed", "defined", "prioritized", "analyzed",
                    "researched", "presented", "coordinated", "drove", "optimized"
                ]
            }
        }

    def _load_resume_templates(self) -> Dict[str, Any]:
        """Load resume templates and best practices"""
        return {
            "modern_template": {
                "sections": ["contact", "summary", "experience", "skills", "education"],
                "format": "clean",
                "font": "Calibri",
                "font_size": 11,
                "margins": 1.0
            },
            "technical_template": {
                "sections": ["contact", "summary", "technical_skills", "experience", "projects", "education"],
                "format": "technical",
                "font": "Consolas",
                "font_size": 10,
                "margins": 0.75
            },
            "best_practices": {
                "max_length_pages": 2,
                "bullet_points_per_experience": 3,
                "quantify_achievements": True,
                "use_action_verbs": True,
                "tailor_to_job": True,
                "include_metrics": True
            }
        }

    async def parse_resume(self, file_content: bytes, file_type: str, target_role: str) -> ResumeUploadResponse:
        """Parse and analyze resume content"""

        # Extract text from file
        resume_text = await self._extract_text_from_file(file_content, file_type)

        # Parse resume structure
        parsed_content = self._parse_resume_structure(resume_text)

        # Calculate ATS score
        ats_score = await self._calculate_ats_score(parsed_content, target_role)

        # Analyze keywords
        keyword_analysis = self._analyze_keywords(parsed_content, target_role)

        # Generate improvement suggestions
        improvement_suggestions = await self._generate_resume_improvements(
            parsed_content, target_role, ats_score, keyword_analysis
        )

        # Check format compliance
        format_score = self._check_format_compliance(parsed_content)

        # Create response
        resume_id = str(uuid.uuid4())
        response = ResumeUploadResponse(
            resumeId=resume_id,
            parsedContent=parsed_content,
            atsScore=ats_score,
            keywordMatches=keyword_analysis["matches"],
            missingKeywords=keyword_analysis["missing"],
            improvementSuggestions=improvement_suggestions,
            formatScore=format_score
        )

        # Save to database
        await self._save_resume_analysis(resume_id, response.dict())

        return response

    async def _extract_text_from_file(self, file_content: bytes, file_type: str) -> str:
        """Extract text from different file formats"""
        try:
            if file_type.lower() == "pdf":
                with pdfplumber.open(io.BytesIO(file_content)) as pdf:
                    text = ""
                    for page in pdf.pages:
                        text += page.extract_text() + "\n"
                return text
            elif file_type.lower() in ["docx", "doc"]:
                doc = docx.Document(io.BytesIO(file_content))
                text = ""
                for paragraph in doc.paragraphs:
                    text += paragraph.text + "\n"
                return text
            elif file_type.lower() == "txt":
                return file_content.decode("utf-8")
            else:
                raise ValueError(f"Unsupported file type: {file_type}")
        except Exception as e:
            raise ValueError(f"Failed to extract text from file: {str(e)}")

    def _parse_resume_structure(self, resume_text: str) -> Dict[str, Any]:
        """Parse resume into structured sections"""
        lines = resume_text.split('\n')
        parsed = {
            "contact": {},
            "summary": "",
            "experience": [],
            "education": [],
            "skills": [],
            "projects": [],
            "raw_text": resume_text,
            "line_count": len(lines),
            "word_count": len(resume_text.split())
        }

        current_section = None
        current_content = []

        for line in lines:
            line = line.strip()
            if not line:
                continue

            # Identify section headers
            section_headers = {
                "contact": ["contact", "information", "phone", "email", "linkedin"],
                "summary": ["summary", "objective", "profile", "about"],
                "experience": ["experience", "work", "employment", "professional"],
                "education": ["education", "academic", "university", "college"],
                "skills": ["skills", "technical", "technologies", "competencies"],
                "projects": ["projects", "portfolio", "work"]
            }

            identified_section = None
            for section, keywords in section_headers.items():
                if any(keyword.lower() in line.lower() for keyword in keywords):
                    identified_section = section
                    break

            if identified_section:
                # Save previous section content
                if current_section and current_content:
                    parsed[current_section] = self._process_section_content(
                        current_section, current_content
                    )
                current_section = identified_section
                current_content = []
            else:
                current_content.append(line)

        # Save last section
        if current_section and current_content:
            parsed[current_section] = self._process_section_content(
                current_section, current_content
            )

        # Extract contact information
        parsed["contact"] = self._extract_contact_info(resume_text)

        return parsed

    def _process_section_content(self, section: str, content: List[str]) -> Any:
        """Process section content based on section type"""
        if section == "experience":
            return self._parse_experience_section(content)
        elif section == "education":
            return self._parse_education_section(content)
        elif section == "skills":
            return self._parse_skills_section(content)
        elif section == "projects":
            return self._parse_projects_section(content)
        else:
            return content

    def _parse_experience_section(self, content: List[str]) -> List[Dict[str, Any]]:
        """Parse work experience section"""
        experiences = []
        current_exp = None

        for line in content:
            # Look for job title patterns (usually includes dates)
            if re.search(r'\d{4}|\d{1,2}/\d{4}|present', line.lower()):
                if current_exp:
                    experiences.append(current_exp)

                # Parse job title, company, and dates
                parts = line.split('|') or line.split('-') or [line]
                current_exp = {
                    "title": parts[0].strip() if parts else line.strip(),
                    "company": parts[1].strip() if len(parts) > 1 else "",
                    "duration": parts[2].strip() if len(parts) > 2 else "",
                    "description": []
                }
            elif current_exp:
                current_exp["description"].append(line)

        if current_exp:
            experiences.append(current_exp)

        return experiences

    def _parse_education_section(self, content: List[str]) -> List[Dict[str, Any]]:
        """Parse education section"""
        education = []
        current_edu = None

        for line in content:
            # Look for degree patterns
            if any(keyword in line.lower() for keyword in ["bachelor", "master", "phd", "degree"]):
                if current_edu:
                    education.append(current_edu)

                current_edu = {
                    "degree": line.strip(),
                    "institution": "",
                    "year": "",
                    "details": []
                }
            elif current_edu:
                current_edu["details"].append(line)

        if current_edu:
            education.append(current_edu)

        return education

    def _parse_skills_section(self, content: List[str]) -> List[str]:
        """Parse skills section"""
        skills = []
        for line in content:
            # Split by common delimiters
            for skill in re.split(r'[,;|]', line):
                skill = skill.strip()
                if skill and len(skill) > 1:
                    skills.append(skill)
        return skills

    def _parse_projects_section(self, content: List[str]) -> List[Dict[str, Any]]:
        """Parse projects section"""
        projects = []
        current_proj = None

        for line in content:
            # Look for project titles
            if len(line) < 100 and not line.startswith('•'):
                if current_proj:
                    projects.append(current_proj)
                current_proj = {
                    "name": line.strip(),
                    "description": [],
                    "technologies": []
                }
            elif current_proj:
                current_proj["description"].append(line)

        if current_proj:
            projects.append(current_proj)

        return projects

    def _extract_contact_info(self, text: str) -> Dict[str, str]:
        """Extract contact information from resume text"""
        contact = {}

        # Email
        email_pattern = r'\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b'
        emails = re.findall(email_pattern, text)
        if emails:
            contact["email"] = emails[0]

        # Phone
        phone_pattern = r'\b\d{3}[-.]?\d{3}[-.]?\d{4}\b|\(\d{3}\)\s*\d{3}[-.]?\d{4}'
        phones = re.findall(phone_pattern, text)
        if phones:
            contact["phone"] = phones[0]

        # LinkedIn
        linkedin_pattern = r'linkedin\.com/in/[A-Za-z0-9-]+'
        linkedin_matches = re.findall(linkedin_pattern, text)
        if linkedin_matches:
            contact["linkedin"] = "https://" + linkedin_matches[0]

        # GitHub
        github_pattern = r'github\.com/[A-Za-z0-9-]+'
        github_matches = re.findall(github_pattern, text)
        if github_matches:
            contact["github"] = "https://" + github_matches[0]

        return contact

    async def _calculate_ats_score(self, parsed_content: Dict[str, Any], target_role: str) -> float:
        """Calculate ATS compatibility score"""
        score = 0
        max_score = 100

        # Keyword matching (40% of score)
        keywords_score = await self._calculate_keywords_score(parsed_content, target_role)
        score += keywords_score * 0.4

        # Structure compliance (25% of score)
        structure_score = self._calculate_structure_score(parsed_content)
        score += structure_score * 0.25

        # Content quality (25% of score)
        quality_score = self._calculate_content_quality_score(parsed_content)
        score += quality_score * 0.25

        # Format compliance (10% of score)
        format_score = self._calculate_format_score(parsed_content)
        score += format_score * 0.1

        return min(100, max(0, score))

    async def _calculate_keywords_score(self, parsed_content: Dict[str, Any], target_role: str) -> float:
        """Calculate keyword matching score"""
        if target_role not in self.ats_keywords:
            return 70  # Default score for unknown roles

        role_keywords = self.ats_keywords[target_role]
        all_keywords = (
            role_keywords["technical"] +
            role_keywords["soft"] +
            role_keywords["action_verbs"]
        )

        resume_text = parsed_content.get("raw_text", "").lower()

        found_keywords = 0
        for keyword in all_keywords:
            if keyword.lower() in resume_text:
                found_keywords += 1

        return (found_keywords / len(all_keywords)) * 100 if all_keywords else 0

    def _calculate_structure_score(self, parsed_content: Dict[str, Any]) -> float:
        """Calculate resume structure score"""
        required_sections = ["contact", "summary", "experience", "skills", "education"]
        present_sections = [section for section in required_sections if parsed_content.get(section)]

        score = (len(present_sections) / len(required_sections)) * 100

        # Bonus for having projects
        if parsed_content.get("projects"):
            score = min(100, score + 10)

        return score

    def _calculate_content_quality_score(self, parsed_content: Dict[str, Any]) -> float:
        """Calculate content quality score"""
        score = 0

        # Experience quality
        experiences = parsed_content.get("experience", [])
        if experiences:
            # Check for quantified achievements
            has_metrics = any(
                any(re.search(r'\d+', desc) for desc in exp.get("description", []))
                for exp in experiences
            )
            if has_metrics:
                score += 30

            # Check for action verbs
            action_verbs = ["developed", "implemented", "led", "managed", "created"]
            has_action_verbs = any(
                any(verb in desc.lower() for desc in exp.get("description", []))
                for exp in experiences
                for verb in action_verbs
            )
            if has_action_verbs:
                score += 20

        # Skills section quality
        skills = parsed_content.get("skills", [])
        if len(skills) >= 5:
            score += 25

        # Contact information completeness
        contact = parsed_content.get("contact", {})
        if contact.get("email") and contact.get("phone"):
            score += 25

        return min(100, score)

    def _calculate_format_score(self, parsed_content: Dict[str, Any]) -> float:
        """Calculate format compliance score"""
        score = 100

        # Length check
        word_count = parsed_content.get("word_count", 0)
        if word_count < 200:  # Too short
            score -= 20
        elif word_count > 600:  # Too long
            score -= 10

        # Check for common formatting issues
        raw_text = parsed_content.get("raw_text", "")

        # Too many short lines (potential formatting issues)
        lines = [line for line in raw_text.split('\n') if line.strip()]
        short_lines = [line for line in lines if len(line.strip()) < 20]
        if len(short_lines) / len(lines) > 0.3:
            score -= 15

        # Check for consistent formatting
        has_bullet_points = '•' in raw_text or '-' in raw_text
        if has_bullet_points:
            score += 10

        return max(0, score)

    def _analyze_keywords(self, parsed_content: Dict[str, Any], target_role: str) -> Dict[str, Any]:
        """Analyze keyword matches and missing keywords"""
        if target_role not in self.ats_keywords:
            return {"matches": [], "missing": []}

        role_keywords = self.ats_keywords[target_role]
        all_keywords = (
            role_keywords["technical"] +
            role_keywords["soft"] +
            role_keywords["action_verbs"]
        )

        resume_text = parsed_content.get("raw_text", "").lower()

        matches = []
        missing = []

        for keyword in all_keywords:
            if keyword.lower() in resume_text:
                matches.append(keyword)
            else:
                missing.append(keyword)

        return {"matches": matches, "missing": missing}

    async def _generate_resume_improvements(
        self,
        parsed_content: Dict[str, Any],
        target_role: str,
        ats_score: float,
        keyword_analysis: Dict[str, List[str]]
    ) -> List[str]:
        """Generate AI-powered resume improvement suggestions"""
        suggestions = []

        # Basic format suggestions
        if ats_score < 70:
            suggestions.append("Your ATS score is below 70%. Consider optimizing for better keyword matching.")

        # Keyword suggestions
        missing_keywords = keyword_analysis.get("missing", [])[:5]
        if missing_keywords:
            suggestions.append(f"Consider adding these keywords: {', '.join(missing_keywords)}")

        # Structure suggestions
        experiences = parsed_content.get("experience", [])
        for i, exp in enumerate(experiences):
            descriptions = exp.get("description", [])
            has_metrics = any(re.search(r'\d+', desc) for desc in descriptions)
            if not has_metrics:
                suggestions.append(f"Add quantifiable metrics to experience #{i+1}")

        # AI-powered suggestions
        ai_prompt = f"""
        Analyze this resume and provide specific improvement suggestions:
        - Target Role: {target_role}
        - Current ATS Score: {ats_score}%
        - Word Count: {parsed_content.get('word_count', 0)}
        - Number of Experiences: {len(experiences)}

        Resume content summary:
        {json.dumps(parsed_content, indent=2)[:1000]}...

        Provide 3-4 specific, actionable suggestions to improve this resume.
        """

        try:
            ai_response = await self.ai_proxy.generate_resume_feedback(ai_prompt)
            ai_suggestions = [s.strip() for s in ai_response.split('\n') if s.strip()]
            suggestions.extend(ai_suggestions[:3])
        except:
            # Fallback suggestions
            if not suggestions:
                suggestions = [
                    "Add a professional summary at the top of your resume",
                    "Quantify your achievements with specific metrics",
                    "Tailor your resume to the job description",
                    "Ensure consistent formatting throughout"
                ]

        return suggestions[:8]  # Return top 8 suggestions

    def _check_format_compliance(self, parsed_content: Dict[str, Any]) -> float:
        """Check resume format compliance"""
        score = 100

        # Check sections
        required_sections = ["contact", "summary", "experience", "skills", "education"]
        missing_sections = [
            section for section in required_sections
            if not parsed_content.get(section)
        ]
        score -= len(missing_sections) * 10

        # Check length
        word_count = parsed_content.get("word_count", 0)
        if word_count < 300:
            score -= 20
        elif word_count > 800:
            score -= 10

        return max(0, score)

    async def optimize_resume(
        self,
        resume_id: str,
        target_role: str,
        job_description: Optional[str] = None
    ) -> ResumeOptimization:
        """Optimize resume for specific role and job description"""

        # Get original resume analysis
        original_analysis = await self._get_resume_analysis(resume_id)
        if not original_analysis:
            raise ValueError("Resume not found")

        # Generate optimized content using AI
        optimized_content = await self._generate_optimized_content(
            original_analysis["parsedContent"],
            target_role,
            job_description
        )

        # Calculate improvements
        improvements = self._calculate_improvements(
            original_analysis,
            optimized_content,
            target_role
        )

        # Calculate new ATS score
        new_ats_score = await self._calculate_ats_score(optimized_content, target_role)

        optimization = ResumeOptimization(
            resumeId=resume_id,
            targetRole=target_role,
            optimizedContent=optimized_content,
            improvements=improvements,
            newAtsScore=new_ats_score
        )

        # Save optimization
        await self._save_resume_optimization(resume_id, optimization.dict())

        return optimization

    async def _generate_optimized_content(
        self,
        original_content: Dict[str, Any],
        target_role: str,
        job_description: Optional[str]
    ) -> Dict[str, Any]:
        """Generate optimized resume content using AI"""

        ai_prompt = f"""
        Optimize this resume for a {target_role} position.

        Original resume content:
        {json.dumps(original_content, indent=2)}

        Job Description:
        {job_description or "Not provided"}

        Please:
        1. Enhance the professional summary
        2. Improve experience descriptions with better action verbs and metrics
        3. Reorder skills by relevance
        4. Add missing keywords naturally
        5. Maintain the original structure while improving content

        Return the optimized content in the same JSON structure.
        """

        try:
            ai_response = await self.ai_proxy.generate_resume_optimization(ai_prompt)
            # Parse AI response
            optimized_content = json.loads(ai_response)
            return optimized_content
        except:
            # Fallback: return slightly modified original content
            return self._apply_basic_optimizations(original_content, target_role)

    def _apply_basic_optimizations(self, content: Dict[str, Any], target_role: str) -> Dict[str, Any]:
        """Apply basic optimizations when AI is unavailable"""
        optimized = content.copy()

        # Enhance summary
        if target_role in self.ats_keywords:
            keywords = self.ats_keywords[target_role]["technical"][:5]
            summary = optimized.get("summary", "")
            if keywords and summary:
                optimized["summary"] = f"{summary} Proficient in {', '.join(keywords)}."

        return optimized

    def _calculate_improvements(
        self,
        original: Dict[str, Any],
        optimized: Dict[str, Any],
        target_role: str
    ) -> List[Dict[str, Any]]:
        """Calculate specific improvements made"""
        improvements = []

        # ATS score improvement
        original_score = original.get("atsScore", 0)
        new_score = self._calculate_ats_score(optimized, target_role)
        if new_score > original_score:
            improvements.append({
                "type": "ats_score",
                "description": f"ATS score improved from {original_score}% to {new_score}%",
                "impact": "high"
            })

        # Content improvements
        original_word_count = original.get("parsedContent", {}).get("word_count", 0)
        optimized_word_count = optimized.get("word_count", 0)
        if abs(optimized_word_count - original_word_count) > 50:
            improvements.append({
                "type": "content_length",
                "description": f"Word count adjusted from {original_word_count} to {optimized_word_count}",
                "impact": "medium"
            })

        # Structure improvements
        original_sections = len([k for k in original.get("parsedContent", {}).keys() if k != "raw_text"])
        optimized_sections = len([k for k in optimized.keys() if k not in ["raw_text", "word_count", "line_count"]])
        if optimized_sections > original_sections:
            improvements.append({
                "type": "structure",
                "description": f"Added {optimized_sections - original_sections} new sections",
                "impact": "medium"
            })

        return improvements

    async def _save_resume_analysis(self, resume_id: str, analysis: Dict[str, Any]) -> None:
        """Save resume analysis to database"""
        db = get_database()
        analysis["_id"] = resume_id
        analysis["createdAt"] = datetime.utcnow()
        await db.resume_analyses.insert_one(analysis)

    async def _get_resume_analysis(self, resume_id: str) -> Optional[Dict[str, Any]]:
        """Get resume analysis from database"""
        db = get_database()
        return await db.resume_analyses.find_one({"_id": resume_id})

    async def _save_resume_optimization(self, resume_id: str, optimization: Dict[str, Any]) -> None:
        """Save resume optimization to database"""
        db = get_database()
        optimization["_id"] = f"{resume_id}_optimized"
        optimization["createdAt"] = datetime.utcnow()
        await db.resume_optimizations.insert_one(optimization)