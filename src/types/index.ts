// src/types/index.ts

export interface MongoDBConfig {
    username: string;
    password: string;
    host: string;
    clusterName: string;
  }
  
  export interface UserRegistrationData {
    siteTitle: string;
    username: string;
    name: string;
    email: string;
    password: string;
    phoneNumber: string;
  }
  
  export interface LanguageConfig {
    code: string;
    name: string;
  }
  
  export interface DatabaseConfig {
    user: string;
    pages: string;
  }