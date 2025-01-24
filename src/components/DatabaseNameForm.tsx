"use client";

import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useLocalStorage } from "@/hooks/useLocalStorage";

interface DatabaseConfig {
  user: string;
  pages: string;
}

const DatabaseNameForm: React.FC = () => {
  const router = useRouter();
  const [userDatabases, setUserDatabases] = useLocalStorage<DatabaseConfig>(
    "userDatabases",
    {
      user: "",
      pages: "",
    }
  );

  const [databases, setDatabases] = useState<DatabaseConfig>({
    user: userDatabases.user || "",
    pages: userDatabases.pages || "",
  });

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setDatabases((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (!databases.user || !databases.pages) {
      alert("Please enter both User and Pages database names");
      return;
    }

    setUserDatabases(databases);
    router.push("/register");
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <label
          htmlFor="user"
          className="block text-sm font-medium text-gray-700"
        >
          User Database Name
        </label>
        <input
          type="text"
          id="user"
          name="user"
          value={databases.user}
          onChange={handleInputChange}
          required
          className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
          placeholder="Enter user database name"
        />
      </div>
      <div>
        <label
          htmlFor="pages"
          className="block text-sm font-medium text-gray-700"
        >
          Pages Database Name
        </label>
        <input
          type="text"
          id="pages"
          name="pages"
          value={databases.pages}
          onChange={handleInputChange}
          required
          className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
          placeholder="Enter pages database name"
        />
      </div>
      <button
        type="submit"
        className="w-full bg-blue-500 text-white py-2 px-4 rounded-md hover:bg-blue-600 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
      >
        Save Database Names
      </button>
    </form>
  );
};

export default DatabaseNameForm;
