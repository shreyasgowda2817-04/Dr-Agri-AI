import os
import json
import time
import uuid
import random
import logging
import threading
from typing import List, Dict, Any, Optional, Tuple, Callable
from app.core.config import settings

# Structured logging setup
logger = logging.getLogger("dr_agri.gemini_fallback")

try:
    from google import genai
    from google.genai import types
    from google.genai.errors import APIError, ClientError, ServerError
except ImportError:
    genai = None
    types = None
    APIError = Exception
    ClientError = Exception
    ServerError = Exception


# ============================================================================
# Custom Exceptions
# ============================================================================

class GeminiServiceError(Exception):
    """Base exception for Gemini service errors."""
    def __init__(
        self, 
        message: str, 
        code: str = "GEMINI_ERROR", 
        status_code: Optional[int] = None, 
        request_id: Optional[str] = None,
        retryable: bool = False
    ):
        super().__init__(message)
        self.message = message
        self.code = code
        self.status_code = status_code
        self.request_id = request_id or str(uuid.uuid4())
        self.retryable = retryable

    def to_dict(self) -> Dict[str, Any]:
        return {
            "success": False,
            "code": self.code,
            "message": self.message,
            "retryable": self.retryable,
            "requestId": self.request_id,
        }


class GeminiAllModelsExhaustedError(GeminiServiceError):
    """Raised when all configured Gemini models have failed or are in cooldown."""
    def __init__(self, message: str = "All AI models are temporarily unavailable. Please try again later.", request_id: Optional[str] = None):
        super().__init__(
            message=message, 
            code="AI_MODELS_UNAVAILABLE", 
            status_code=503, 
            request_id=request_id,
            retryable=True
        )


class GeminiAuthError(GeminiServiceError):
    """Raised when the API key is invalid, leaked, or unauthorized."""
    def __init__(self, message: str = "AI service authentication failed.", request_id: Optional[str] = None):
        super().__init__(
            message=message, 
            code="AI_AUTH_FAILED", 
            status_code=401, 
            request_id=request_id,
            retryable=False
        )


class GeminiValidationError(GeminiServiceError):
    """Raised when client input is invalid."""
    def __init__(self, message: str = "Invalid input provided for AI analysis.", request_id: Optional[str] = None):
        super().__init__(
            message=message, 
            code="AI_INVALID_ARGUMENT", 
            status_code=400, 
            request_id=request_id,
            retryable=False
        )


# ============================================================================
# Error Classification
# ============================================================================

class ErrorClassification:
    def __init__(
        self,
        error_type: str,
        status_code: Optional[int],
        is_fallback_eligible: bool,
        is_retryable_same_model: bool,
        retry_after_seconds: Optional[float],
        sanitized_message: str
    ):
        self.error_type = error_type
        self.status_code = status_code
        self.is_fallback_eligible = is_fallback_eligible
        self.is_retryable_same_model = is_retryable_same_model
        self.retry_after_seconds = retry_after_seconds
        self.sanitized_message = sanitized_message

    def __repr__(self) -> str:
        return (
            f"<ErrorClassification type={self.error_type} code={self.status_code} "
            f"fallback={self.is_fallback_eligible} retry_same={self.is_retryable_same_model}>"
        )


def classify_gemini_error(exc: Exception) -> ErrorClassification:
    """
    Inspects an exception and classifies it according to HTTP status, Google API status,
    and error details. Masks sensitive data.
    """
    status_code: Optional[int] = None
    status_str: Optional[str] = None
    raw_message = str(exc)
    retry_after: Optional[float] = None

    # Check for google.genai APIError attributes
    if hasattr(exc, "code") and isinstance(exc.code, int):
        status_code = exc.code
    if hasattr(exc, "status") and isinstance(exc.status, str):
        status_str = exc.status.upper()
    if hasattr(exc, "message") and isinstance(exc.message, str):
        raw_message = exc.message

    # Check for response headers (e.g. Retry-After)
    response = getattr(exc, "response", None)
    if response and hasattr(response, "headers"):
        headers = response.headers
        retry_header = headers.get("retry-after") or headers.get("Retry-After")
        if retry_header:
            try:
                retry_after = float(retry_header)
            except (ValueError, TypeError):
                pass

    # Sanitize message to strip raw keys or long tokens
    sanitized_msg = raw_message[:300]
    if "api_key" in sanitized_msg.lower() or "key=" in sanitized_msg.lower():
        sanitized_msg = "Google API authentication/credential error."

    # 1. HTTP 429 - RESOURCE_EXHAUSTED
    if status_code == 429 or status_str == "RESOURCE_EXHAUSTED" or "quota" in raw_message.lower() or "429" in raw_message:
        return ErrorClassification(
            error_type="RESOURCE_EXHAUSTED",
            status_code=429,
            is_fallback_eligible=True,
            is_retryable_same_model=False,
            retry_after_seconds=retry_after,
            sanitized_message=sanitized_msg or "Rate limit or quota exhausted."
        )

    # 2. HTTP 401 or 403 - Authentication & Permission
    if status_code in (401, 403) or status_str in ("PERMISSION_DENIED", "UNAUTHENTICATED") or "leaked" in raw_message.lower():
        low_msg = raw_message.lower()
        # Distinguish global key revocation/leak from model-specific 403
        if "leaked" in low_msg or "api_key_invalid" in low_msg or "api key not valid" in low_msg or "unauthenticated" in low_msg:
            return ErrorClassification(
                error_type="AUTH_FAILED_GLOBAL",
                status_code=status_code or 403,
                is_fallback_eligible=False, # Don't retry other models with a known dead key
                is_retryable_same_model=False,
                retry_after_seconds=None,
                sanitized_message="API key reported invalid, leaked, or unauthenticated."
            )
        # Model-specific permission or not found
        if "model" in low_msg and ("not found" in low_msg or "not supported" in low_msg or "permission" in low_msg):
            return ErrorClassification(
                error_type="MODEL_NOT_AVAILABLE",
                status_code=status_code or 403,
                is_fallback_eligible=True,
                is_retryable_same_model=False,
                retry_after_seconds=None,
                sanitized_message="Model not found or unavailable for this project."
            )
        return ErrorClassification(
            error_type="PERMISSION_DENIED",
            status_code=status_code or 403,
            is_fallback_eligible=False,
            is_retryable_same_model=False,
            retry_after_seconds=None,
            sanitized_message="Permission denied for API project."
        )

    # 3. HTTP 400 - INVALID_ARGUMENT
    if status_code == 400 or status_str == "INVALID_ARGUMENT" or isinstance(exc, ValueError):
        return ErrorClassification(
            error_type="INVALID_ARGUMENT",
            status_code=400,
            is_fallback_eligible=False, # Same invalid payload will fail across all models
            is_retryable_same_model=False,
            retry_after_seconds=None,
            sanitized_message=sanitized_msg or "Invalid argument provided."
        )

    # 4. HTTP 503 - SERVICE_UNAVAILABLE
    if status_code == 503 or status_str == "SERVICE_UNAVAILABLE" or "503" in raw_message:
        return ErrorClassification(
            error_type="SERVICE_UNAVAILABLE",
            status_code=503,
            is_fallback_eligible=True,
            is_retryable_same_model=True, # Eligible for one transient backoff retry before switching models
            retry_after_seconds=retry_after or 2.0,
            sanitized_message="Gemini service temporarily unavailable."
        )

    # 5. HTTP 500, 502, 504 & Network Timeouts
    if status_code in (500, 502, 504) or "timeout" in raw_message.lower() or "connect" in raw_message.lower():
        return ErrorClassification(
            error_type="SERVER_TRANSIENT",
            status_code=status_code or 504,
            is_fallback_eligible=True,
            is_retryable_same_model=False,
            retry_after_seconds=None,
            sanitized_message="Transient gateway or upstream timeout."
        )

    # 6. JSON Parse / Schema error
    if isinstance(exc, json.JSONDecodeError) or "json" in raw_message.lower():
        return ErrorClassification(
            error_type="SCHEMA_VALIDATION_ERROR",
            status_code=502,
            is_fallback_eligible=True,
            is_retryable_same_model=False,
            retry_after_seconds=None,
            sanitized_message="Model returned invalid or unparseable JSON."
        )

    # Default fallback
    return ErrorClassification(
        error_type="UNKNOWN_ERROR",
        status_code=status_code or 500,
        is_fallback_eligible=True,
        is_retryable_same_model=False,
        retry_after_seconds=None,
        sanitized_message=sanitized_msg or "Unexpected AI provider error."
    )


# ============================================================================
# In-Memory Thread-Safe Model Health & Quota Tracker
# ============================================================================

class ModelHealthTracker:
    """
    Tracks runtime health, quota exhaustion, and cooldown states for each Gemini model.
    Enforces automatic proactive recovery when cooldown periods expire.
    """
    def __init__(self):
        self._lock = threading.Lock()
        self._models: Dict[str, Dict[str, Any]] = {}
        self._global_auth_failed: bool = False
        self._total_fallback_events: int = 0
        self._last_seen_api_key: Optional[str] = getattr(settings, "GEMINI_API_KEY", None)

    def _get_or_init_model_state(self, model: str) -> Dict[str, Any]:
        if model not in self._models:
            self._models[model] = {
                "status": "HEALTHY",
                "cooldown_until": 0.0,
                "consecutive_failures": 0,
                "last_error_type": None,
                "last_error_code": None,
                "last_error_message": None,
                "last_success_at": None,
                "total_requests": 0,
                "total_successes": 0,
                "total_fallbacks_triggered": 0,
            }
        return self._models[model]

    def is_model_eligible(self, model: str) -> Tuple[bool, str]:
        """
        Determines whether a model is eligible to receive requests.
        Automatically clears expired cooldowns and resets if a new API key is detected.
        """
        with self._lock:
            current_key = getattr(settings, "GEMINI_API_KEY", None)
            if current_key != self._last_seen_api_key:
                self._models.clear()
                self._global_auth_failed = False
                self._total_fallback_events = 0
                self._last_seen_api_key = current_key

            if self._global_auth_failed:
                return False, "GLOBAL_AUTH_FAILED: API key reported invalid/leaked"

            state = self._get_or_init_model_state(model)
            now = time.time()

            if state["status"] in ("COOLDOWN", "EXHAUSTED"):
                if now >= state["cooldown_until"]:
                    # Cooldown has naturally expired -> Proactive recovery
                    state["status"] = "HEALTHY"
                    state["cooldown_until"] = 0.0
                    return True, "ELIGIBLE_RECOVERED"
                else:
                    seconds_left = max(0.0, state["cooldown_until"] - now)
                    return False, f"COOLDOWN: {seconds_left:.1f}s remaining"

            if state["status"] == "UNAVAILABLE":
                return False, "PERMANENTLY_UNAVAILABLE_OR_NOT_FOUND"

            return True, "HEALTHY"

    def record_attempt(self, model: str):
        with self._lock:
            state = self._get_or_init_model_state(model)
            state["total_requests"] += 1

    def record_success(self, model: str, latency_ms: float = 0.0):
        with self._lock:
            state = self._get_or_init_model_state(model)
            state["status"] = "HEALTHY"
            state["cooldown_until"] = 0.0
            state["consecutive_failures"] = 0
            state["last_success_at"] = time.time()
            state["total_successes"] += 1

    def record_failure(
        self, 
        model: str, 
        classification: ErrorClassification, 
        fallback_triggered: bool = False
    ):
        with self._lock:
            now = time.time()
            state = self._get_or_init_model_state(model)
            state["consecutive_failures"] += 1
            state["last_error_type"] = classification.error_type
            state["last_error_code"] = classification.status_code
            state["last_error_message"] = classification.sanitized_message

            if fallback_triggered:
                state["total_fallbacks_triggered"] += 1
                self._total_fallback_events += 1

            if classification.error_type == "AUTH_FAILED_GLOBAL":
                self._global_auth_failed = True
                state["status"] = "AUTH_FAILED"
                return

            if classification.error_type == "RESOURCE_EXHAUSTED":
                # Cooldown based on Retry-After or configured cooldown
                cd = classification.retry_after_seconds or float(settings.GEMINI_COOLDOWN_SECONDS)
                state["status"] = "EXHAUSTED"
                state["cooldown_until"] = now + cd
                return

            if classification.error_type in ("SERVICE_UNAVAILABLE", "SERVER_TRANSIENT"):
                cd = classification.retry_after_seconds or float(settings.GEMINI_TRANSIENT_COOLDOWN_SECONDS)
                state["status"] = "COOLDOWN"
                state["cooldown_until"] = now + cd
                return

            if classification.error_type == "MODEL_NOT_AVAILABLE":
                # Model does not exist or access forbidden for this model
                state["status"] = "UNAVAILABLE"
                state["cooldown_until"] = now + 3600.0 # 1 hour backoff
                return

    def get_diagnostics(self) -> Dict[str, Any]:
        """Returns safe model health status without leaking secrets."""
        with self._lock:
            now = time.time()
            models_info = {}
            for name, data in self._models.items():
                cd_left = max(0.0, data["cooldown_until"] - now) if data["cooldown_until"] > now else 0.0
                models_info[name] = {
                    "status": data["status"] if cd_left > 0 or data["status"] != "COOLDOWN" else "HEALTHY",
                    "cooldownSecondsRemaining": round(cd_left, 1),
                    "consecutiveFailures": data["consecutive_failures"],
                    "totalRequests": data["total_requests"],
                    "totalSuccesses": data["total_successes"],
                    "totalFallbacksTriggered": data["total_fallbacks_triggered"],
                    "lastErrorCode": data["last_error_code"],
                    "lastErrorType": data["last_error_type"],
                    "lastSuccessAt": data["last_success_at"],
                }
            return {
                "globalAuthFailed": self._global_auth_failed,
                "totalFallbackEvents": self._total_fallback_events,
                "models": models_info,
            }

    def reset_all(self):
        """Resets tracker state (useful for tests and manual admin reload)."""
        with self._lock:
            self._models.clear()
            self._global_auth_failed = False
            self._total_fallback_events = 0


# Global tracker instance
model_health_tracker = ModelHealthTracker()


# ============================================================================
# Reusable Automatic Gemini Fallback Service
# ============================================================================

class GeminiFallbackService:
    def __init__(self, mock_client: Any = None):
        self._mock_client = mock_client

    def _get_client(self) -> Any:
        if self._mock_client is not None:
            return self._mock_client

        if not settings.GEMINI_API_KEY:
            raise GeminiAuthError("GEMINI_API_KEY is not configured on the server.")

        if not genai:
            raise GeminiServiceError("google-genai SDK is not installed on the server.")

        return genai.Client(api_key=settings.GEMINI_API_KEY)

    @staticmethod
    def clean_json_response(raw_text: str) -> Dict[str, Any]:
        """Safely extracts and parses JSON from LLM output."""
        if not raw_text or not isinstance(raw_text, str):
            raise json.JSONDecodeError("Empty or non-string response from model", "", 0)

        text = raw_text.strip()
        if text.startswith("```json"):
            text = text[7:]
        elif text.startswith("```"):
            text = text[3:]
        if text.endswith("```"):
            text = text[:-3]
        text = text.strip()

        # Handle potential leading/trailing non-JSON text
        start_idx = text.find("{")
        end_idx = text.rfind("}")
        if start_idx != -1 and end_idx != -1 and end_idx >= start_idx:
            text = text[start_idx : end_idx + 1]

        return json.loads(text)

    def execute_with_fallback(
        self,
        call_fn: Callable[[Any, str], Any],
        feature_name: str = "ai_feature",
        request_id: Optional[str] = None,
        validate_json: bool = False
    ) -> Tuple[Any, str]:
        """
        Executes a Gemini call function against the configured model chain with
        automatic quota-aware model fallback.
        
        Returns:
            (parsed_result, model_name_used)
        """
        req_id = request_id or str(uuid.uuid4())
        model_chain = settings.get_gemini_model_chain()

        if not model_chain:
            raise GeminiAllModelsExhaustedError("No Gemini models configured in model chain.", request_id=req_id)

        client = self._get_client()
        total_deadline = time.time() + float(settings.GEMINI_TOTAL_TIMEOUT)
        max_attempts = min(int(settings.GEMINI_MAX_ATTEMPTS), len(model_chain))

        attempt_idx = 0
        last_classification: Optional[ErrorClassification] = None

        logger.info(
            f"[GeminiReq:{req_id}] Starting AI request for '{feature_name}'. "
            f"Configured models: {model_chain}. Max attempts: {max_attempts}."
        )

        for model in model_chain:
            if attempt_idx >= max_attempts:
                logger.warning(f"[GeminiReq:{req_id}] Reached maximum model attempt budget ({max_attempts}).")
                break

            if time.time() >= total_deadline:
                logger.warning(f"[GeminiReq:{req_id}] Total request deadline exceeded ({settings.GEMINI_TOTAL_TIMEOUT}s).")
                break

            # Check model eligibility (cooldown & auth checks)
            is_eligible, reason = model_health_tracker.is_model_eligible(model)
            if not is_eligible:
                logger.info(f"[GeminiReq:{req_id}] Skipping model '{model}': {reason}")
                continue

            attempt_idx += 1
            model_health_tracker.record_attempt(model)
            attempt_start = time.time()

            try:
                logger.info(
                    f"[GeminiReq:{req_id}] Attempt {attempt_idx}/{max_attempts} using model '{model}' for '{feature_name}'."
                )

                response = call_fn(client, model)
                raw_text = getattr(response, "text", None) or (response if isinstance(response, str) else "")

                if validate_json:
                    result = self.clean_json_response(raw_text)
                else:
                    result = raw_text

                latency = (time.time() - attempt_start) * 1000.0
                model_health_tracker.record_success(model, latency)

                logger.info(
                    f"[GeminiReq:{req_id}] Success using model '{model}' in {latency:.1f}ms (Attempt {attempt_idx})."
                )
                return result, model

            except Exception as exc:
                latency = (time.time() - attempt_start) * 1000.0
                classification = classify_gemini_error(exc)
                last_classification = classification

                logger.warning(
                    f"[GeminiReq:{req_id}] Model '{model}' failed (latency {latency:.1f}ms): "
                    f"[{classification.error_type} {classification.status_code}] {classification.sanitized_message}"
                )

                # Record failure on health tracker
                fallback_eligible = classification.is_fallback_eligible and (attempt_idx < max_attempts)
                model_health_tracker.record_failure(model, classification, fallback_triggered=fallback_eligible)

                # Non-retryable error (e.g. invalid user input or global leaked key)
                if not classification.is_fallback_eligible:
                    if classification.error_type == "AUTH_FAILED_GLOBAL":
                        raise GeminiAuthError(classification.sanitized_message, request_id=req_id)
                    elif classification.error_type == "INVALID_ARGUMENT":
                        raise GeminiValidationError(classification.sanitized_message, request_id=req_id)
                    else:
                        raise GeminiServiceError(
                            classification.sanitized_message,
                            code=classification.error_type,
                            status_code=classification.status_code,
                            request_id=req_id,
                            retryable=False
                        )

                # If single-model transient retry is supported (503), attempt one quick retry with jitter
                if classification.is_retryable_same_model and (time.time() + 1.5) < total_deadline:
                    backoff = random.uniform(0.5, 1.5)
                    logger.info(f"[GeminiReq:{req_id}] Transient {classification.status_code} on '{model}'. Backoff {backoff:.2f}s before retry.")
                    time.sleep(backoff)
                    try:
                        response = call_fn(client, model)
                        raw_text = getattr(response, "text", None) or (response if isinstance(response, str) else "")
                        result = self.clean_json_response(raw_text) if validate_json else raw_text
                        model_health_tracker.record_success(model)
                        return result, model
                    except Exception as retry_exc:
                        logger.warning(f"[GeminiReq:{req_id}] Same-model retry on '{model}' failed. Continuing to fallback model.")

                # Fallback to next configured model in loop
                logger.info(f"[GeminiReq:{req_id}] Triggering fallback from '{model}' to next eligible model.")
                continue

        # All models exhausted
        msg = "All available Gemini models are currently exhausted or unavailable. Please try again in a few moments."
        if last_classification and last_classification.error_type == "AUTH_FAILED_GLOBAL":
            raise GeminiAuthError(last_classification.sanitized_message, request_id=req_id)

        logger.error(f"[GeminiReq:{req_id}] All eligible Gemini models exhausted for '{feature_name}'.")
        raise GeminiAllModelsExhaustedError(message=msg, request_id=req_id)

    def generate_multimodal(
        self,
        prompt: str,
        image_bytes: bytes,
        mime_type: str = "image/jpeg",
        response_mime_type: str = "application/json",
        feature_name: str = "crop_analysis",
        request_id: Optional[str] = None
    ) -> Tuple[Any, str]:
        """
        Multimodal generation with image inputs (crop leaf scans).
        """
        if not prompt or not prompt.strip():
            raise GeminiValidationError("Prompt cannot be empty.", request_id=request_id)
        if not image_bytes or len(image_bytes) < 10:
            raise GeminiValidationError("Invalid or empty image data.", request_id=request_id)

        def call_fn(client: Any, model: str):
            part = types.Part.from_bytes(data=image_bytes, mime_type=mime_type)
            config = types.GenerateContentConfig(
                response_mime_type=response_mime_type,
            )
            return client.models.generate_content(
                model=model,
                contents=[prompt, part],
                config=config,
            )

        return self.execute_with_fallback(
            call_fn=call_fn,
            feature_name=feature_name,
            request_id=request_id,
            validate_json=(response_mime_type == "application/json")
        )

    def generate_text(
        self,
        prompt: str,
        response_mime_type: str = "text/plain",
        feature_name: str = "text_generation",
        request_id: Optional[str] = None
    ) -> Tuple[Any, str]:
        """
        Text generation (chatbot, search navigation, translations).
        """
        if not prompt or not prompt.strip():
            raise GeminiValidationError("Prompt cannot be empty.", request_id=request_id)

        def call_fn(client: Any, model: str):
            config = types.GenerateContentConfig(
                response_mime_type=response_mime_type,
            ) if response_mime_type != "text/plain" else None

            kwargs = {"model": model, "contents": prompt}
            if config:
                kwargs["config"] = config
            return client.models.generate_content(**kwargs)

        return self.execute_with_fallback(
            call_fn=call_fn,
            feature_name=feature_name,
            request_id=request_id,
            validate_json=(response_mime_type == "application/json")
        )


# Global singleton instance
gemini_fallback_service = GeminiFallbackService()
