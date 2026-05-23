import itertools
import os

class ApiKeyManager:
    def __init__(self, key_file_path):
        """
        Initializes the manager with API keys from the provided file.
        Separates Groq and OpenRouter keys.
        """
        self.groq_keys = []
        self.openrouter_keys = []
        
        if not os.path.exists(key_file_path):
            print(f"Warning: API key file {key_file_path} not found.")
            return

        try:
            with open(key_file_path, 'r', encoding='utf-8') as f:
                content = f.read()
                lines = content.splitlines()
                print(f"[ApiKeyManager] Read file: {key_file_path}. Total length: {len(content)}, Total lines: {len(lines)}")
                
                import re
                for i, line in enumerate(lines):
                    # Remove all whitespace including BOM
                    key = re.sub(r'[\s\ufeff]', '', line)
                    if not key:
                        continue
                    
                    if re.match(r'^gsk_', key, re.I):
                        self.groq_keys.append(key)
                    elif re.match(r'^sk-or-', key, re.I):
                        self.openrouter_keys.append(key)
                    else:
                        print(f"[ApiKeyManager] Line {i+1} did not match: '{key[:10]}...'")
            
            if not self.groq_keys:
                print(f"Warning: No Groq API keys found in {key_file_path}")
            if not self.openrouter_keys:
                print(f"Warning: No OpenRouter API keys found in {key_file_path}")
                
            self.groq_pool = itertools.cycle(self.groq_keys) if self.groq_keys else None
            self.openrouter_pool = itertools.cycle(self.openrouter_keys) if self.openrouter_keys else None
            
        except Exception as e:
            print(f"Error loading API keys: {e}")

    def get_next_groq_key(self):
        """Returns the next Groq API key in a round-robin fashion."""
        if not self.groq_pool:
            return os.getenv("GROQ_API_KEY")
        return next(self.groq_pool)

    def get_next_openrouter_key(self):
        """Returns the next OpenRouter API key in a round-robin fashion."""
        if not self.openrouter_pool:
            return os.getenv("OPENROUTER_API_KEY")
        return next(self.openrouter_pool)
