import fs from 'fs';
import path from 'path';

class ApiKeyManager {
  private groqKeys: string[] = [];
  private openrouterKeys: string[] = [];
  private groqIndex = 0;
  private openrouterIndex = 0;

  constructor() {
    this.loadKeys();
  }

  private loadKeys() {
    const filePath = path.join(process.cwd(), 'python_api', 'api_keys.txt');
    if (!fs.existsSync(filePath)) {
      console.warn(`Warning: API key file not found at: ${filePath}`);
      return;
    }

    try {
      const content = fs.readFileSync(filePath, 'utf-8');
      const lines = content.split(/\r?\n/);
      console.log(`[ApiKeyManager] Read file: ${filePath}. Total length: ${content.length}, Total lines: ${lines.length}`);
      
      for (let i = 0; i < lines.length; i++) {
        const line = lines[i];
        // Remove all whitespace including non-breaking spaces and BOM
        const key = line.replace(/[\s\uFEFF\u00A0]/g, '');
        if (!key) continue;
        
        if (/^gsk_/i.test(key)) {
          this.groqKeys.push(key);
        } else if (/^sk-or-/i.test(key)) {
          this.openrouterKeys.push(key);
        } else {
          console.warn(`[ApiKeyManager] Line ${i+1} did not match: "${key.substring(0, 10)}..."`);
        }
      }

      if (this.groqKeys.length === 0) {
        console.warn(`Warning: No Groq API keys found in: ${filePath}`);
      }
      if (this.openrouterKeys.length === 0) {
        console.warn(`Warning: No OpenRouter API keys found in: ${filePath}`);
      }
    } catch (error) {
      console.error('Error loading API keys:', error);
    }
  }

  getAllGroqKeys(): string[] {
    return [...this.groqKeys];
  }

  getAllOpenrouterKeys(): string[] {
    return [...this.openrouterKeys];
  }

  getNextGroqKey(): string | undefined {
    if (this.groqKeys.length === 0) return process.env.GROQ_API_KEY;
    const key = this.groqKeys[this.groqIndex];
    this.groqIndex = (this.groqIndex + 1) % this.groqKeys.length;
    return key;
  }

  getNextOpenrouterKey(): string | undefined {
    if (this.openrouterKeys.length === 0) return process.env.OPENROUTER_API_KEY;
    const key = this.openrouterKeys[this.openrouterIndex];
    this.openrouterIndex = (this.openrouterIndex + 1) % this.openrouterKeys.length;
    return key;
  }
}

export const apiKeyManager = new ApiKeyManager();
