import json
import logging
import os
import re
from functools import lru_cache
from pathlib import Path
from typing import Annotated, Literal, Union

from fastapi import FastAPI, HTTPException
from openai import APIConnectionError, APIStatusError, APITimeoutError, AsyncOpenAI, RateLimitError
from pydantic import BaseModel, Field, ValidationError, field_validator, model_validator

log = logging.getLogger("uvicorn.error")
app = FastAPI()

BASE_URL = os.environ.get("EVA_BASE_URL", "")
MODEL = os.environ.get("EVA_MODEL", "qwen3.5-9b-q5_k_m")
MAX_COURSE_CHARS = 50_000  # ~15k tokens: leaves room for the answer in a 32k context


# The key is read from a file (Docker secret) so it never shows up in env vars, `docker inspect` or logs.
def api_key() -> str | None:
    try:
        return Path(os.environ.get("EVA_API_KEY_FILE", "/run/secrets/eva_api_key")).read_text().strip() or None
    except OSError:
        return os.environ.get("EVA_API_KEY")


@lru_cache
def client(key: str) -> AsyncOpenAI:
    # Cold start of a model on the gateway can take up to ~5 min.
    return AsyncOpenAI(base_url=BASE_URL, api_key=key, timeout=330, max_retries=1)


# ── What the model writes: plain text, turned into H5P params by the editor ──

BLANK = re.compile(r"\*[^*\n]+\*")


class Answer(BaseModel):
    text: str = Field(min_length=1)
    correct: bool


class MultiChoice(BaseModel):
    type: Literal["H5P.MultiChoice"]
    question: str = Field(min_length=1)
    answers: list[Answer] = Field(min_length=2, max_length=6)

    @model_validator(mode="after")
    def has_right_answer(self):
        if not any(a.correct for a in self.answers):
            raise ValueError("aucune bonne réponse")
        return self


class TrueFalse(BaseModel):
    type: Literal["H5P.TrueFalse"]
    statement: str = Field(min_length=1)
    correct: bool


class WithBlanks(BaseModel):
    instruction: str = Field(min_length=1)
    text: str = Field(min_length=1)

    @field_validator("text")
    @classmethod
    def has_blank(cls, v: str):
        if not BLANK.search(v):
            raise ValueError("aucun mot entre astérisques")
        return v


class Blanks(WithBlanks):
    type: Literal["H5P.Blanks"]


class DragText(WithBlanks):
    type: Literal["H5P.DragText"]


Activity = Annotated[Union[MultiChoice, TrueFalse, Blanks, DragText], Field(discriminator="type")]

TYPES: dict[str, tuple[type[BaseModel], str]] = {
    "H5P.MultiChoice": (MultiChoice, "QCM : une question et 3 à 5 réponses, dont au moins une correcte."),
    "H5P.TrueFalse": (TrueFalse, "Vrai / Faux : une affirmation (statement) et si elle est vraie (correct)."),
    "H5P.Blanks": (Blanks, "Texte à trous : une consigne, puis 1 à 5 phrases (une par ligne) où chaque réponse à retrouver est entourée d'astérisques, ex. : La capitale de la France est *Paris*."),
    "H5P.DragText": (DragText, "Glisser les mots : une consigne, puis un court texte où 3 à 8 mots à placer sont entourés d'astérisques, ex. : Les plantes absorbent le *dioxyde de carbone*."),
}


class CourseItem(BaseModel):
    section: int
    activity: Activity


class CourseOut(BaseModel):
    activities: list[CourseItem]


# ── Requests ──

class Section(BaseModel):
    name: str = Field(max_length=300)
    text: str = Field(max_length=30_000)


class CourseRequest(BaseModel):
    title: str = Field(max_length=300)
    sections: list[Section] = Field(max_length=300)
    types: list[str]
    count: int = Field(ge=1, le=30)
    instructions: str = Field("", max_length=2000)


class ActivityRequest(BaseModel):
    type: str
    title: str = Field(max_length=300)
    section: Section
    instructions: str = Field("", max_length=2000)


# ── LLM ──

SYSTEM = (
    "Tu es un concepteur pédagogique. Tu crées des activités d'évaluation en français pour des élèves, "
    "uniquement à partir du contenu de cours fourni, sans inventer de faits. "
    "Formulations claires, courtes et sans ambiguïté. Réponds uniquement avec le JSON demandé."
)


def describe(types: list[str]) -> str:
    return "\n".join(f"- {t} — {TYPES[t][1]}" for t in types)


def extra(instructions: str) -> str:
    return f"\n\nConsignes de l'enseignant : {instructions.strip()}" if instructions.strip() else ""


async def complete(prompt: str, schema: dict, max_tokens: int) -> dict:
    key = api_key()
    if not key or not BASE_URL:
        raise HTTPException(503, "Le service d'IA n'est pas configuré sur le serveur.")
    try:
        r = await client(key).chat.completions.create(
            model=MODEL,
            messages=[{"role": "system", "content": SYSTEM}, {"role": "user", "content": prompt}],
            temperature=0.4,
            max_tokens=max_tokens,
            response_format={"type": "json_schema", "json_schema": {"name": "out", "schema": schema}},
            extra_body={"chat_template_kwargs": {"enable_thinking": False}},
        )
    except RateLimitError:
        raise HTTPException(429, "Trop de demandes envoyées à l'IA. Réessayez dans une minute.")
    except APITimeoutError:
        raise HTTPException(504, "L'IA a mis trop de temps à répondre. Réessayez.")
    except (APIStatusError, APIConnectionError) as e:
        log.warning("EVA gateway error: %s", getattr(e, "status_code", type(e).__name__))
        raise HTTPException(502, "Le service d'IA est indisponible pour le moment. Réessayez plus tard.")
    text = r.choices[0].message.content or ""
    try:
        return json.loads(text[text.find("{"): text.rfind("}") + 1])
    except ValueError:
        raise HTTPException(502, "La réponse de l'IA est illisible. Réessayez.")


@app.get("/api/health")
def health():
    return {"ok": True, "configured": bool(api_key() and BASE_URL)}


@app.post("/api/generate/course")
async def generate_course(req: CourseRequest):
    types = [t for t in req.types if t in TYPES]
    if not types:
        raise HTTPException(400, "Aucun type d'activité pris en charge.")
    text = "\n\n".join(f"## Section {i} — {s.name}\n{s.text.strip()}" for i, s in enumerate(req.sections) if s.text.strip())
    if not text:
        raise HTTPException(400, "Ce contenu ne contient pas de texte exploitable par l'IA.")
    out = await complete(
        f"Cours : {req.title}\n\n{text[:MAX_COURSE_CHARS]}\n\n"
        f"Crée {req.count} activités qui couvrent les notions importantes de ce cours, réparties sur les sections "
        f"et en variant les types. Pour chaque activité, « section » est le numéro de la section concernée.\n"
        f"Types autorisés :\n{describe(types)}{extra(req.instructions)}",
        CourseOut.model_json_schema(),
        8000,
    )
    activities = []
    for raw in out.get("activities") or []:
        try:
            item = CourseItem.model_validate(raw)  # one by one: a bad activity doesn't discard the others
        except ValidationError:
            continue
        if item.activity.type in types and 0 <= item.section < len(req.sections):
            activities.append({"section": item.section, "type": item.activity.type, "data": item.activity.model_dump(exclude={"type"})})
    if not activities:
        raise HTTPException(502, "L'IA n'a produit aucune activité utilisable. Réessayez.")
    return {"activities": activities}


@app.post("/api/generate/activity")
async def generate_activity(req: ActivityRequest):
    if req.type not in TYPES:
        raise HTTPException(400, "Type d'activité non pris en charge.")
    model, how = TYPES[req.type]
    context = req.section.text.strip()
    if not context:
        raise HTTPException(400, "Cette partie ne contient pas de texte exploitable par l'IA.")
    out = await complete(
        f"Cours : {req.title}\n\n## {req.section.name}\n{context[:MAX_COURSE_CHARS]}\n\n"
        f"Crée une activité de ce type sur cette partie du cours (type = {req.type}) :\n{how}{extra(req.instructions)}",
        model.model_json_schema(),
        2000,
    )
    try:
        return {"data": model.model_validate({**out, "type": req.type}).model_dump(exclude={"type"})}
    except ValidationError:
        raise HTTPException(502, "L'IA n'a pas produit une activité utilisable. Réessayez.")
