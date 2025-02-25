'use client'
import { useState, useEffect } from 'react';

interface UserData {
  username: string;
  name: string;
  email: string;
  password: string;
  role: string;
  phoneNumber: string;
}
interface Role {
  name: string;
  value: number;
}

export default function UserManagement() {
  const [userData, setUserData] = useState<UserData>({
    username: '',
    name: '',
    email: '',
    password: '',
    role: '',
    phoneNumber: ''
  });
  const [users, setUsers] = useState<UserData[]>([
    {
      username: 'john_doe',
      name: 'John Doe',
      email: 'john@example.com',
      password: '********',
      role: 'user',
      phoneNumber: '555-1234'
    }
  ]);
  const [roles, setRoles] = useState<Role[]>([]);

  const backendUrl = process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:3000';
  useEffect(() => {
    const fetchRoles = async () => {
      try {
        const res = await fetch(`${backendUrl}/api/get-role`);
        if (res.ok) {
          const data = await res.json();
          setRoles(data.roles || []);
        }
      } catch (error) {
        console.error('Failed to fetch roles:', error);
      }
    };
    fetchRoles();
  }, []);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setUserData(prev => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const res = await fetch(`${backendUrl}/api/add-users`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(userData)
      });
      if (res.ok) {
        const result = await res.json();
        // Update local state with created user from db
        setUsers(prev => [...prev, result.user]);
        // ...existing code to clear form...
        setUserData({
          username: '',
          name: '',
          email: '',
          password: '',
          role: '',
          phoneNumber: ''
        });
      } else {
        console.error('Failed to add user');
      }
    } catch (error) {
      console.error('Error adding user:', error);
    }
  };

  return (
    <div className="p-6 max-w-6xl mx-auto">
      <h1 className="text-2xl font-bold mb-6">User Management</h1>
      <form onSubmit={handleSubmit} className="bg-gray-50 p-6 rounded-lg mb-8 shadow-md">
        <h2 className="text-xl font-semibold mb-4">Add New User</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium mb-1">Username</label>
            <input
              type="text"
              name="username"
              value={userData.username}
              onChange={handleInputChange}
              className="w-full p-2 border rounded"
              required
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Name</label>
            <input
              type="text"
              name="name"
              value={userData.name}
              onChange={handleInputChange}
              className="w-full p-2 border rounded"
              required
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Email</label>
            <input
              type="email"
              name="email"
              value={userData.email}
              onChange={handleInputChange}
              className="w-full p-2 border rounded"
              required
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Password</label>
            <input
              type="password"
              name="password"
              value={userData.password}
              onChange={handleInputChange}
              className="w-full p-2 border rounded"
              required
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Role</label>
            <select
              name="role"
              value={userData.role}
              onChange={handleInputChange}
              className="w-full p-2 border rounded"
              required
            >
              <option value="">Select Role</option>
              {roles.map(role => (
                <option key={role.value} value={role.value}>{role.name}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Phone Number</label>
            <input
              type="tel"
              name="phoneNumber"
              value={userData.phoneNumber}
              onChange={handleInputChange}
              className="w-full p-2 border rounded"
              required
            />
          </div>
        </div>
        <button
          type="submit"
          className="mt-4 px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
        >
          Add User
        </button>
      </form>
    </div>
  );
}