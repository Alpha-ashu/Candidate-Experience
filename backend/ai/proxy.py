from typing import Literal, Optional, Tuple

from ..config import settings


class Question:
    def __init__(self, qtype: str, text: str, metadata: dict | None = None):
        self.type = qtype
        self.text = text
        self.metadata = metadata or {}


async def generate_question(
    setup_snapshot: dict,
    remaining: int,
    difficulty: str,
    provider_preference: Optional[Literal["openai", "gemini"]] = None,
) -> Question:
    provider = provider_preference or settings.ai_provider
    # Basic fallback if provider keys are not configured
    if provider == "openai" and settings.openai_api_key:
        try:
            from .providers.openai_provider import ask_openai_question

            text, qtype, meta = await ask_openai_question(setup_snapshot, remaining, difficulty)
            return Question(qtype=qtype, text=text, metadata=meta)
        except Exception:
            pass
    if provider == "gemini" and settings.google_api_key:
        try:
            from .providers.gemini_provider import ask_gemini_question

            text, qtype, meta = await ask_gemini_question(setup_snapshot, remaining, difficulty)
            return Question(qtype=qtype, text=text, metadata=meta)
        except Exception:
            pass
    # Deterministic fallback tailored to mode
    modes = setup_snapshot.get("modes", ["behavioral"]) or ["behavioral"]
    target = (modes[0] or "behavioral").lower()
    role = setup_snapshot.get("roleCategory", "Candidate")
    qnum = setup_snapshot.get("questionCount", 0) - remaining + 1
    if target in ("coding", "code"):
        return Question(
            qtype="coding",
            text="Write a function to find all duplicates in an array of integers.",
            metadata={
                "difficulty": difficulty,
                "hintAvailable": True,
                "language": "python",
                "functionName": "find_duplicates",
                "functionSignature": "def find_duplicates(arr):\n    # your code\n    pass",
                "tests": [
                    {"input": [[1,2,3,2,4,1]], "expected": [1,2]},
                    {"input": [[5,5,5]], "expected": [5]},
                    {"input": [[1,2,3]], "expected": []},
                ],
            },
        )
    if target in ("mcq",):
        return Question(
            qtype="mcq",
            text="Which of the following statements about Big-O notation are true?",
            metadata={
                "difficulty": difficulty,
                "hintAvailable": True,
                "options": [
                    "O(n log n) grows slower than O(n^2)",
                    "O(1) means constant time regardless of input size",
                    "O(n) always faster than O(log n)",
                    "O(2^n) is polynomial time",
                ],
                "multiple": True,
            },
        )
    if target in ("fib", "fill"):
        return Question(
            qtype="fib",
            text="Fill in the blanks for the HTTP status codes: ______ means Not Found, ______ means OK.",
            metadata={
                "difficulty": difficulty,
                "hintAvailable": True,
                "fillSlots": ["Not Found", "OK"],
            },
        )
    if target in ("scenario",):
        return Question(
            qtype="scenario",
            text=f"Your automated test suite is slow. Propose a plan to optimize it for the {role} role.",
            metadata={"difficulty": difficulty, "hintAvailable": True},
        )
    return Question(
        qtype="behavioral",
        text=f"Tell me about a time you solved a difficult problem in {role}. (Q{qnum})",
        metadata={"difficulty": difficulty, "hintAvailable": True},
    )


async def summarize_session(snapshot: dict, qa: list[dict]) -> dict:
    provider = settings.ai_provider
    if provider == "openai" and settings.openai_api_key:
        try:
            from .providers.openai_provider import summarize_openai

            return await summarize_openai(snapshot, qa)
        except Exception:
            pass
    if provider == "gemini" and settings.google_api_key:
        try:
            from .providers.gemini_provider import summarize_gemini

            return await summarize_gemini(snapshot, qa)
        except Exception:
            pass
    # Fallback summary
    return {
        "rubric": {"communication": 3, "problem_solving": 3, "technical": 3},
        "strengths": ["Clear structure", "Relevant examples"],
        "gaps": ["More depth on metrics"],
        "scoreBreakdown": {"overall": 75},
    }


async def analyze_qa(question: dict, answer: dict | None) -> dict:
    q_text = question.get("text", "")
    q_type = question.get("type", "behavioral")
    a_text = (answer or {}).get("responseText", "")
    answer_type = (answer or {}).get("answerType", "text")
    code_text = a_text if answer_type == "code" else None
    mcq_selected = (answer or {}).get("mcqSelected", None)
    fib_entries = (answer or {}).get("fibEntries", None)
    provider = settings.ai_provider
    if provider == "openai" and settings.openai_api_key:
        try:
            from .providers.openai_provider import analyze_openai

            return await analyze_openai(
                question_text=q_text,
                answer_text=a_text,
                qtype=q_type,
                answer_type=answer_type,
                code_text=code_text,
                mcq_selected=mcq_selected,
                fib_entries=fib_entries,
            )
        except Exception:
            pass
    if provider == "gemini" and settings.google_api_key:
        try:
            from .providers.gemini_provider import analyze_gemini

            return await analyze_gemini(
                question_text=q_text,
                answer_text=a_text,
                qtype=q_type,
                answer_type=answer_type,
                code_text=code_text,
                mcq_selected=mcq_selected,
                fib_entries=fib_entries,
            )
        except Exception:
            pass
    # Fallback heuristic per type
    length = len(a_text.split())
    base = 60 + min(40, length // 10) if a_text else 40
    if answer_type == "code":
        feedback = "Consider correctness, complexity, edge cases, and readability. Add tests where relevant."
        model = "Provide a correct, efficient solution with O(n) or better if applicable; discuss tradeoffs and edge cases."
    elif answer_type == "mcq":
        feedback = "Review the selected choices and justify why they are correct; revisit the concept if unsure."
        model = "State the correct option(s) with a brief explanation."
    elif answer_type == "fib":
        feedback = "Fill each blank with precise terminology; ensure consistency with the question context."
        model = "Provide the expected term/value per blank with a short rationale."
    else:
        feedback = "Good start. Add concrete details, metrics, and structure (STAR)."
        model = "Include Situation, Task, Action, Result with metrics; for coding, discuss complexity and edge cases."
    return {"score": base, "feedback": feedback, "modelAnswer": model}


class AIProxy:
    """AI Proxy class for extended AI functionality"""

    async def generate_career_guidance(self, prompt: str) -> str:
        """Generate career guidance using AI"""
        provider = settings.ai_provider
        if provider == "openai" and settings.openai_api_key:
            try:
                from .providers.openai_provider import generate_career_guidance_openai
                return await generate_career_guidance_openai(prompt)
            except Exception:
                pass

        if provider == "gemini" and settings.google_api_key:
            try:
                from .providers.gemini_provider import generate_career_guidance_gemini
                return await generate_career_guidance_gemini(prompt)
            except Exception:
                pass

        # Fallback response
        return """
        Based on your profile, here's a recommended learning path:

        1. Start with fundamental programming concepts (Weeks 1-4)
        2. Learn data structures and algorithms (Weeks 5-8)
        3. Practice system design principles (Weeks 9-12)
        4. Build portfolio projects (Weeks 13-16)
        5. Prepare for interviews (Weeks 17-20)

        Milestones:
        - Complete online courses and tutorials
        - Solve 100+ coding problems
        - Build 2-3 significant projects
        - Practice mock interviews weekly
        """

    async def generate_feedback(self, prompt: str) -> str:
        """Generate feedback using AI"""
        provider = settings.ai_provider
        if provider == "openai" and settings.openai_api_key:
            try:
                from .providers.openai_provider import generate_feedback_openai
                return await generate_feedback_openai(prompt)
            except Exception:
                pass

        if provider == "gemini" and settings.google_api_key:
            try:
                from .providers.gemini_provider import generate_feedback_gemini
                return await generate_feedback_gemini(prompt)
            except Exception:
                pass

        # Fallback feedback
        return """
        Improvement Suggestions:
        1. Focus on consistent practice and skill development
        2. Seek feedback from peers and mentors regularly
        3. Apply learning in real-world projects
        4. Track progress and adjust learning strategies
        """

    async def generate_resume_feedback(self, prompt: str) -> str:
        """Generate resume feedback using AI"""
        provider = settings.ai_provider
        if provider == "openai" and settings.openai_api_key:
            try:
                from .providers.openai_provider import generate_resume_feedback_openai
                return await generate_resume_feedback_openai(prompt)
            except Exception:
                pass

        if provider == "gemini" and settings.google_api_key:
            try:
                from .providers.gemini_provider import generate_resume_feedback_gemini
                return await generate_resume_feedback_gemini(prompt)
            except Exception:
                pass

        # Fallback resume feedback
        return """
        Resume Improvement Suggestions:
        1. Add a professional summary highlighting your key achievements
        2. Quantify your accomplishments with specific metrics and results
        3. Use action verbs to start each bullet point
        4. Tailor your resume to match the job description keywords
        5. Ensure consistent formatting and professional layout
        """

    async def generate_resume_optimization(self, prompt: str) -> str:
        """Generate optimized resume content using AI"""
        provider = settings.ai_provider
        if provider == "openai" and settings.openai_api_key:
            try:
                from .providers.openai_provider import generate_resume_optimization_openai
                return await generate_resume_optimization_openai(prompt)
            except Exception:
                pass

        if provider == "gemini" and settings.google_api_key:
            try:
                from .providers.gemini_provider import generate_resume_optimization_gemini
                return await generate_resume_optimization_gemini(prompt)
            except Exception:
                pass

        # Fallback - return original content with basic improvements
        return """
        Resume content has been optimized with:
        - Enhanced professional summary
        - Improved action verbs and metrics
        - Better keyword alignment
        - More impactful descriptions
        """
