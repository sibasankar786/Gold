import google.generativeai as genai
from interfaces.llm_provider import ILLMProvider

class GeminiAdapter(ILLMProvider):
    def __init__(self, api_key: str, model_name: str = "gemini-1.5-flash", embed_model: str = "models/text-embedding-004"):
        if not api_key:
            raise ValueError("GEMINI_API_KEY is required for GeminiAdapter")
        
        # Ensure prefix
        if not embed_model.startswith("models/"):
            embed_model = f"models/{embed_model}"
        
        genai.configure(api_key=api_key)
        
        # Ensure correct model names
        if not model_name.startswith("models/"):
            model_name = f"models/{model_name}"
        
        if not embed_model.startswith("models/"):
            embed_model = f"models/{embed_model}"
            
        self._model = genai.GenerativeModel(model_name)
        self._embed_model = embed_model

    def complete(self, prompt: str) -> str:
        """Generates text completion using Gemini with retries and robust JSON extraction."""
        import time
        import random
        
        last_err = None
        for attempt in range(3):
            try:
                response = self._model.generate_content(prompt)
                text = response.text
                
                # Robust JSON extraction: Find first '{' and last '}'
                start = text.find('{')
                end = text.rfind('}')
                if start != -1 and end != -1:
                    return text[start:end+1].strip()
                return text.strip()
                
            except Exception as e:
                last_err = e
                # Check for quota error (429)
                if "429" in str(e):
                    wait = (2 ** attempt) + random.random()
                    print(f"[RETRY] 429 Quota met. Waiting {wait:.2f}s (Attempt {attempt+1}/3)...")
                    time.sleep(wait)
                    continue
                raise e
        
        # If we got here, all retries failed with 429
        raise last_err

    def embed(self, text: str) -> list[float]:
        """Generates embeddings using Gemini embedding model."""
        result = genai.embed_content(
            model=self._embed_model,
            content=text,
            task_type="retrieval_document"
        )
        return result['embedding']
