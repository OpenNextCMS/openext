"use client";

import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { MongoDBConfig } from "@/types";
import { MongoDBService } from "@/lib/mongodb";

export default function MongoDBSetupPage() {
  const router = useRouter();
  const mongoDBService = MongoDBService.getInstance();
  const [config, setConfig] = useState<MongoDBConfig>({
    username: "",
    password: "",
    host: "",
    clusterName: "",
  });
  const [connectionStatus, setConnectionStatus] = useState<
    "idle" | "testing" | "success" | "error"
  >("idle");
  const [errorMessage, setErrorMessage] = useState<string>("");

  useEffect(() => {
    const storedConfig = mongoDBService.getConfiguration();
    if (storedConfig) {
      setConfig(storedConfig);
    }
  }, []);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setConfig((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setConnectionStatus("testing");
    setErrorMessage("");

    try {
      mongoDBService.setConfiguration(config);
      const connectionResult = await mongoDBService.testConnection();

      if (connectionResult) {
        setConnectionStatus("success");
        setTimeout(() => router.push("/db-name"), 1500);
      } else {
        setConnectionStatus("error");
        const error = mongoDBService.getConnectionError();
        setErrorMessage(error || "Connection failed");
      }
    } catch (error) {
      setConnectionStatus("error");
      setErrorMessage("An unexpected error occurred");
      console.error("Connection test failed", error);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-100">
      <div className="bg-white p-8 rounded-lg shadow-md w-full max-w-md">
        <h1 className="text-2xl font-bold mb-6 text-center">
          MongoDB Configuration
        </h1>
        <form onSubmit={handleSubmit} className="space-y-4">
        <div>
            <label
              htmlFor="username"
              className="block text-sm font-medium text-gray-700"
            >
              Username
            </label>
            <input
              type="text"
              id="username"
              name="username"
              value={config.username}
              onChange={handleInputChange}
              required
              className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
              placeholder="MongoDB Username"
            />
          </div>
          <div>
            <label
              htmlFor="password"
              className="block text-sm font-medium text-gray-700"
            >
              Password
            </label>
            <input
              type="password"
              id="password"
              name="password"
              value={config.password}
              onChange={handleInputChange}
              required
              className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
              placeholder="MongoDB Password"
            />
          </div>
          <div>
            <label
              htmlFor="host"
              className="block text-sm font-medium text-gray-700"
            >
              Host
            </label>
            <input
              type="text"
              id="host"
              name="host"
              value={config.host}
              onChange={handleInputChange}
              required
              className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
              placeholder="MongoDB Host"
            />
          </div>
          <div>
            <label
              htmlFor="clusterName"
              className="block text-sm font-medium text-gray-700"
            >
              Cluster Name
            </label>
            <input
              type="text"
              id="clusterName"
              name="clusterName"
              value={config.clusterName}
              onChange={handleInputChange}
              required
              className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
              placeholder="MongoDB Cluster Name"
            />
          </div>
          
          <button
            type="submit"
            disabled={connectionStatus === "testing"}
            className={`w-full py-2 px-4 rounded-md transition-colors duration-300 ${
              connectionStatus === "testing"
                ? "bg-gray-400 cursor-not-allowed"
                : "bg-blue-500 text-white hover:bg-blue-600"
            } ${connectionStatus === "success" ? "bg-green-500" : ""} ${
              connectionStatus === "error" ? "bg-red-500" : ""
            }`}
          >
            {connectionStatus === "testing" && "Testing Connection..."}
            {connectionStatus === "idle" && "Test Connection"}
            {connectionStatus === "success" && "Connection Successful!"}
            {connectionStatus === "error" && "Connection Failed"}
          </button>

          {connectionStatus === "error" && errorMessage && (
            <div className="mt-4 p-3 bg-red-100 border border-red-400 text-red-700 rounded">
              <p className="text-sm">{errorMessage}</p>
            </div>
          )}
        </form>
      </div>
    </div>
  );
}