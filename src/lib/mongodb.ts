import { MongoDBConfig } from '@/types';

export class MongoDBService {
  private static instance: MongoDBService;
  private config: MongoDBConfig | null = null;
  private connectionError: string | null = null;

  private constructor() {}

  public static getInstance(): MongoDBService {
    if (!MongoDBService.instance) {
      MongoDBService.instance = new MongoDBService();
    }
    return MongoDBService.instance;
  }

  setConfiguration(config: MongoDBConfig) {
    this.config = config;
    localStorage.setItem('mongoDBConfig', JSON.stringify(config));
  }

  getConfiguration(): MongoDBConfig | null {
    if (!this.config) {
      const storedConfig = localStorage.getItem('mongoDBConfig');
      this.config = storedConfig ? JSON.parse(storedConfig) : null;
    }
    return this.config;
  }

  getConnectionError(): string | null {
    return this.connectionError;
  }

  async testConnection(): Promise<boolean> {
    if (!this.config) {
      this.connectionError = "No configuration provided";
      return false;
    }

    try {
      const response = await fetch('/api/test-mongodb-connection', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(this.config),
      });

      const result = await response.json();

      if (result.success) {
        this.connectionError = null;
        return true;
      } else {
        this.connectionError = result.error;
        return false;
      }
    } catch (error) {
      this.connectionError = "An unexpected error occurred";
      return false;
    }
  }
}