import json
import time
import pytest
from unittest.mock import MagicMock, patch

from app.core.config import settings
from app.services.gemini_service import (
    GeminiFallbackService,
    ModelHealthTracker,
    classify_gemini_error,
    GeminiServiceError,
    GeminiAllModelsExhaustedError,
    GeminiAuthError,
    GeminiValidationError,
)
from app.services.ml_service import predict_image, fallback_agronomy_inference


# Mock class for Gemini API exceptions
class MockGeminiAPIError(Exception):
    def __init__(self, message: str, code: int = 500, status: str = "UNKNOWN"):
        super().__init__(message)
        self.message = message
        self.code = code
        self.status = status


class MockGenerateResponse:
    def __init__(self, text: str):
        self.text = text


@pytest.fixture(autouse=True)
def reset_tracker():
    """Ensure a clean health tracker state before each test."""
    from app.services.gemini_service import model_health_tracker
    model_health_tracker.reset_all()
    yield
    model_health_tracker.reset_all()


# ============================================================================
# 1. Primary Model Success
# ============================================================================
def test_primary_model_success():
    mock_client = MagicMock()
    mock_client.models.generate_content.return_value = MockGenerateResponse("Healthy leaf, no disease.")

    service = GeminiFallbackService(mock_client=mock_client)
    result, model_used = service.generate_text(prompt="Check leaf health", feature_name="test_feature")

    assert result == "Healthy leaf, no disease."
    assert model_used == settings.GEMINI_PRIMARY_MODEL
    assert mock_client.models.generate_content.call_count == 1


# ============================================================================
# 2. 429 Quota Exhaustion -> Cooldown -> Fallback Model Succeeds
# ============================================================================
def test_quota_exhaustion_switches_to_fallback():
    mock_client = MagicMock()

    primary_model = settings.GEMINI_PRIMARY_MODEL
    fallback_chain = settings.get_gemini_model_chain()
    secondary_model = fallback_chain[1]

    def side_effect(*args, **kwargs):
        model = kwargs.get("model")
        if model == primary_model:
            raise MockGeminiAPIError("Quota exceeded for quota metric 'GenerateContent'", code=429, status="RESOURCE_EXHAUSTED")
        return MockGenerateResponse("Recovered via secondary model")

    mock_client.models.generate_content.side_effect = side_effect

    service = GeminiFallbackService(mock_client=mock_client)
    result, model_used = service.generate_text(prompt="Analyze leaf", feature_name="test_quota")

    assert result == "Recovered via secondary model"
    assert model_used == secondary_model

    # Check that primary model is now in EXHAUSTED cooldown
    from app.services.gemini_service import model_health_tracker
    diagnostics = model_health_tracker.get_diagnostics()
    assert primary_model in diagnostics["models"]
    assert diagnostics["models"][primary_model]["status"] == "EXHAUSTED"
    assert diagnostics["models"][primary_model]["cooldownSecondsRemaining"] > 0
    assert diagnostics["totalFallbackEvents"] >= 1


# ============================================================================
# 3. All Configured Models Exhausted -> Graceful AI_MODELS_UNAVAILABLE
# ============================================================================
def test_all_models_exhausted_raises_graceful_error():
    mock_client = MagicMock()
    mock_client.models.generate_content.side_effect = MockGeminiAPIError("Quota exhausted", code=429, status="RESOURCE_EXHAUSTED")

    service = GeminiFallbackService(mock_client=mock_client)

    with pytest.raises(GeminiAllModelsExhaustedError) as exc_info:
        service.generate_text(prompt="Scan crop", feature_name="test_exhausted")

    err = exc_info.value
    assert err.code == "AI_MODELS_UNAVAILABLE"
    assert err.status_code == 503
    assert err.retryable is True
    assert "exhausted" in err.message.lower()


# ============================================================================
# 4. 503 Transient Failure -> Single Model Retry Succeeds
# ============================================================================
def test_503_transient_retry_same_model():
    mock_client = MagicMock()
    attempts = [0]

    def side_effect(*args, **kwargs):
        attempts[0] += 1
        if attempts[0] == 1:
            raise MockGeminiAPIError("Service temporarily unavailable", code=503, status="SERVICE_UNAVAILABLE")
        return MockGenerateResponse("Success after transient 503 retry")

    mock_client.models.generate_content.side_effect = side_effect

    service = GeminiFallbackService(mock_client=mock_client)
    result, model_used = service.generate_text(prompt="Check weather impact", feature_name="test_503")

    assert result == "Success after transient 503 retry"
    assert model_used == settings.GEMINI_PRIMARY_MODEL
    assert attempts[0] == 2


# ============================================================================
# 5. 401/403 Leaked Key -> Fast Fail Without Retry Storm
# ============================================================================
def test_leaked_key_fails_fast_without_retrying_all_models():
    mock_client = MagicMock()
    mock_client.models.generate_content.side_effect = MockGeminiAPIError(
        "PERMISSION_DENIED: Your API key was reported as leaked", code=403, status="PERMISSION_DENIED"
    )

    service = GeminiFallbackService(mock_client=mock_client)

    with pytest.raises(GeminiAuthError) as exc_info:
        service.generate_text(prompt="Analyze crop", feature_name="test_leaked")

    assert exc_info.value.code == "AI_AUTH_FAILED"
    assert exc_info.value.status_code == 401
    # Crucial: only 1 call made, no retry storm hammering other models with the dead key
    assert mock_client.models.generate_content.call_count == 1


# ============================================================================
# 6. Invalid Input (400) -> Fast Fail
# ============================================================================
def test_invalid_argument_fails_fast():
    mock_client = MagicMock()
    mock_client.models.generate_content.side_effect = MockGeminiAPIError("Invalid argument", code=400, status="INVALID_ARGUMENT")

    service = GeminiFallbackService(mock_client=mock_client)

    with pytest.raises(GeminiValidationError) as exc_info:
        service.generate_text(prompt="Bad payload", feature_name="test_invalid")

    assert exc_info.value.code == "AI_INVALID_ARGUMENT"
    assert exc_info.value.status_code == 400
    assert mock_client.models.generate_content.call_count == 1


# ============================================================================
# 7. Empty Input Validation
# ============================================================================
def test_empty_prompt_and_image_validation():
    service = GeminiFallbackService(mock_client=MagicMock())

    with pytest.raises(GeminiValidationError):
        service.generate_text(prompt="   ")

    with pytest.raises(GeminiValidationError):
        service.generate_multimodal(prompt="test", image_bytes=b"")


# ============================================================================
# 8. Malformed JSON Recovery & Markdown Strip
# ============================================================================
def test_json_markdown_cleaning():
    raw_json = '```json\n{"crop": "Tomato", "disease": "Early Blight"}\n```'
    parsed = GeminiFallbackService.clean_json_response(raw_json)
    assert parsed["crop"] == "Tomato"
    assert parsed["disease"] == "Early Blight"

    # Embedded in surrounding prose
    surrounded = 'Here is the diagnosis:\n```\n{"crop": "Rice", "status": "Healthy"}\n```\nHope this helps!'
    parsed2 = GeminiFallbackService.clean_json_response(surrounded)
    assert parsed2["crop"] == "Rice"
    assert parsed2["status"] == "Healthy"


# ============================================================================
# 9. Multimodal Generation
# ============================================================================
def test_multimodal_generation():
    mock_client = MagicMock()
    mock_client.models.generate_content.return_value = MockGenerateResponse(
        json.dumps({"crop": {"name": "Maize"}, "diagnosis": {"disease_name": "Common Rust"}})
    )

    service = GeminiFallbackService(mock_client=mock_client)
    fake_image = b"\xff\xd8\xff" + b"0" * 50
    result, model = service.generate_multimodal(
        prompt="Scan leaf",
        image_bytes=fake_image,
        mime_type="image/jpeg",
        response_mime_type="application/json"
    )

    assert result["crop"]["name"] == "Maize"
    assert result["diagnosis"]["disease_name"] == "Common Rust"
    assert model == settings.GEMINI_PRIMARY_MODEL


# ============================================================================
# 10. Cooldown Skip Behavior
# ============================================================================
def test_cooldown_skips_model():
    from app.services.gemini_service import model_health_tracker
    primary = settings.GEMINI_PRIMARY_MODEL
    chain = settings.get_gemini_model_chain()
    secondary = chain[1]

    # Force primary model into cooldown
    classification = classify_gemini_error(MockGeminiAPIError("Rate limit", code=429))
    model_health_tracker.record_failure(primary, classification, fallback_triggered=True)

    mock_client = MagicMock()
    mock_client.models.generate_content.return_value = MockGenerateResponse("Bypassed cooldown model")

    service = GeminiFallbackService(mock_client=mock_client)
    result, model_used = service.generate_text(prompt="Check crop", feature_name="test_skip")

    assert model_used == secondary
    assert result == "Bypassed cooldown model"


# ============================================================================
# 11. Expired Cooldown Proactive Recovery
# ============================================================================
def test_cooldown_natural_recovery():
    tracker = ModelHealthTracker()
    model = "test-model"

    # Set expired cooldown
    tracker._models[model] = {
        "status": "EXHAUSTED",
        "cooldown_until": time.time() - 10.0, # 10 seconds in the past
        "consecutive_failures": 2,
        "total_requests": 2,
        "total_successes": 0,
        "total_fallbacks_triggered": 1,
    }

    is_eligible, reason = tracker.is_model_eligible(model)
    assert is_eligible is True
    assert reason == "ELIGIBLE_RECOVERED"
    assert tracker._models[model]["status"] == "HEALTHY"


# ============================================================================
# 12. Safe Diagnostics - No Secret Leakage
# ============================================================================
def test_safe_diagnostics_no_secret_leaks():
    from app.services.gemini_service import model_health_tracker
    tracker = model_health_tracker
    diag = tracker.get_diagnostics()

    assert "globalAuthFailed" in diag
    assert "models" in diag
    assert "totalFallbackEvents" in diag

    # Ensure no secrets or API keys are exposed
    diag_str = json.dumps(diag)
    assert "api_key" not in diag_str.lower()
    assert "secret" not in diag_str.lower()


# ============================================================================
# 13. Localized Agronomy Fallback Engine
# ============================================================================
def test_fallback_agronomy_inference_multilingual():
    fake_img = b"fake-leaf-bytes"

    # English
    en_res = fallback_agronomy_inference(fake_img, language="en")
    assert en_res["is_fallback"] is True
    assert "Crop Plant" in en_res["crop"]["name"]
    assert len(en_res["organic_treatments"]) > 0

    # Hindi
    hi_res = fallback_agronomy_inference(fake_img, language="hi")
    assert hi_res["is_fallback"] is True
    assert "पहचानी गई फसल" in hi_res["crop"]["name"]
    assert "नीम के तेल" in hi_res["organic_treatments"][0]

    # Kannada
    kn_res = fallback_agronomy_inference(fake_img, language="kn")
    assert kn_res["is_fallback"] is True
    assert "ಗುರುತಿಸಲಾದ ಬೆಳೆ" in kn_res["crop"]["name"]
    assert "ಬೇವಿನ ಎಣ್ಣೆ" in kn_res["organic_treatments"][0]


# ============================================================================
# 14. ML Service Predict Image End-to-End Fallback
# ============================================================================
def test_predict_image_full_fallback_chain():
    fake_img = b"\xff\xd8\xff" + b"1" * 50

    # When Gemini fails and ML microservice is not configured, fallback_agronomy_inference is returned
    with patch("app.services.gemini_service.gemini_fallback_service.generate_multimodal") as mock_gen:
        mock_gen.side_effect = GeminiAllModelsExhaustedError("All models down")
        
        result = predict_image(fake_img, language="en")
        assert result is not None
        assert result["is_fallback"] is True
        assert "crop" in result
        assert "diagnosis" in result


# ============================================================================
# 15. Emergency Route Fallback Test
# ============================================================================
def test_emergency_fallback_diagnosis():
    from app.api.routes.predict import get_emergency_fallback_diagnosis, fallback_agronomy_inference
    assert fallback_agronomy_inference is not None

    res_en = get_emergency_fallback_diagnosis(language="en")
    assert res_en["is_fallback"] is True
    assert "Crop Plant" in res_en["crop"]["name"]

    res_hi = get_emergency_fallback_diagnosis(language="hi")
    assert res_hi["is_fallback"] is True
    assert "पहचानी गई फसल" in res_hi["crop"]["name"]

    res_kn = get_emergency_fallback_diagnosis(language="kn")
    assert res_kn["is_fallback"] is True
    assert "ಗುರುತಿಸಲಾದ ಬೆಳೆ" in res_kn["crop"]["name"]
