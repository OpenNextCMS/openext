"use client"
import { useState, useEffect } from 'react';

interface User {
  id: string;
  username: string;
  name: string;
  email: string;
  role: string; // stored as numeric string or number
  phoneNumber: string;
}
interface Role {
  name: string;
  value: number;
}

export default function UserList() {
  const [users, setUsers] = useState<User[]>([]);
  const [rolesMapping, setRolesMapping] = useState<Role[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Updated: fetchUsers using the GET route /api/get-users
  const fetchUsers = async () => {
    try {
      const response = await fetch('/api/get-users');
      if (!response.ok) throw new Error('Failed to fetch');
      const data = await response.json();
      setUsers(data.users || []);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch users');
    } finally {
      setLoading(false);
    }
  };

  // New: fetch roles mapping from /api/get-role
  useEffect(() => {
    const fetchRoles = async () => {
      try {
        const res = await fetch('/api/get-role');
        if (res.ok) {
          const data = await res.json();
          setRolesMapping(data.roles || []);
        }
      } catch (error) {
        console.error('Failed to fetch roles:', error);
      }
    };
    fetchRoles();
  }, []);

  useEffect(() => {
    fetchUsers();
  }, []);

  const retryFetch = () => {
    setLoading(true);
    setError(null);
    fetchUsers();
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center p-4">
        <div className="bg-red-50 p-4 rounded-lg max-w-md text-center">
          <h3 className="text-red-600 font-medium text-lg mb-2">Error loading users</h3>
          <p className="text-red-700 mb-4">{error}</p>
          <button
            onClick={retryFetch}
            className="bg-red-600 text-white px-4 py-2 rounded-md hover:bg-red-700 transition-colors"
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 max-w-7xl mx-auto">
      <div className="sm:flex sm:items-center mb-6">
        <h1 className="text-3xl font-bold text-gray-900">User Management</h1>
        <span className="sm:ml-4 mt-2 sm:mt-0 bg-blue-100 text-blue-800 text-sm font-medium px-3 py-1 rounded-full">
          {users.length} users
        </span>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  User
                </th>
                <th className="px-6 py-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Contact
                </th>
                <th className="px-6 py-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Role
                </th>
                <th className="px-6 py-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Status
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {users.map((user, index) => (
                <tr key={user.id || index} className="hover:bg-gray-50 transition-colors">
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center">
                      <div className="flex-shrink-0 h-10 w-10 bg-blue-500 rounded-full flex items-center justify-center text-white font-medium">
                        {user.name.charAt(0)}
                      </div>
                      <div className="ml-4">
                        <div className="text-sm font-medium text-gray-900">{user.name}</div>
                        <div className="text-sm text-gray-500">@{user.username}</div>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm text-gray-900">{user.email}</div>
                    <div className="text-sm text-gray-500">{user.phoneNumber}</div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className={`px-2.5 py-1 rounded-full text-xs font-medium ${
                      rolesMapping.find(role => role.value === Number(user.role))?.name === 'admin' 
                        ? 'bg-red-100 text-red-800' 
                        : rolesMapping.find(role => role.value === Number(user.role))?.name === 'editor'
                        ? 'bg-purple-100 text-purple-800'
                        : 'bg-blue-100 text-blue-800'
                    }`}>
                      {rolesMapping.find(role => role.value === Number(user.role))?.name || user.role}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-green-100 text-green-800">
                      Active
                    </span>
                  </td>
                </tr>
              ))}
              {users.length === 0 && (
                <tr>
                  <td colSpan={4} className="px-6 py-8 text-center text-gray-500">
                    No users found
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}