import os


class ApiKeyManager:
    """Load API keys from environment variables only (never from files)."""

    def __init__(self) -> None:
        groq = os.getenv("GROQ_API_KEY", "").strip()
        openrouter = os.getenv("OPENROUTER_API_KEY", "").strip()
        self.groq_keys = [groq] if groq else []
        self.openrouter_keys = [openrouter] if openrouter else []
        self._groq_index = 0
        self._openrouter_index = 0

    def get_next_groq_key(self) -> str | None:
        if not self.groq_keys:
            return None
        key = self.groq_keys[self._groq_index % len(self.groq_keys)]
        self._groq_index += 1
        return key

    def get_next_openrouter_key(self) -> str | None:
        if not self.openrouter_keys:
            return None
        key = self.openrouter_keys[self._openrouter_index % len(self.openrouter_keys)]
        self._openrouter_index += 1
        return key
