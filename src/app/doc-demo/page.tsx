// app/documentation/page.tsx
export default function Documentation() {
  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="lg:grid lg:grid-cols-12 lg:gap-8">
          {/* Sidebar Navigation */}
          <aside className="lg:col-span-3 mb-8 lg:mb-0">
            <nav className="sticky top-8 space-y-1">
              <h2 className="text-xl font-bold text-gray-900 mb-4">Contents</h2>
              <ul className="space-y-2">
                {[
                  { name: 'Overview', href: '#overview' },
                  { name: 'Key Features', href: '#features' },
                  { name: 'Project Flow', href: '#flow' },
                  { name: 'Technology Stack', href: '#tech-stack' },
                  { name: 'Folder Structure', href: '#structure' },
                  { name: 'API Reference', href: '#api-reference' },
                ].map((item) => (
                  <li key={item.href}>
                    <a
                      href={item.href}
                      className="text-gray-600 hover:text-blue-600 block px-3 py-2 rounded-lg hover:bg-gray-100 transition-colors"
                    >
                      {item.name}
                    </a>
                  </li>
                ))}
              </ul>
            </nav>
          </aside>

          {/* Main Content */}
          <main className="lg:col-span-9 bg-white rounded-xl shadow-sm p-8">
            <div className="prose max-w-none">
              {/* Overview Section */}
              <section id="overview">
                <h1 className="text-3xl font-bold text-gray-900 mb-6">Next.js CMS Documentation</h1>
                <div className="space-y-4 text-gray-600">
                  <p>
                    The Next.js CMS is a modern content management system built with cutting-edge
                    web technologies to provide a seamless website creation and management
                    experience.
                  </p>
                  <div className="bg-blue-50 p-4 rounded-lg">
                    <h3 className="text-blue-800 font-semibold mb-2">Core Objectives</h3>
                    <ul className="list-disc pl-5 space-y-2">
                      <li>Simplify website creation through drag-and-drop interface</li>
                      <li>Provide secure user authentication and authorization</li>
                      <li>Enable dynamic content management with MongoDB</li>
                      <li>Offer scalable architecture for growing needs</li>
                    </ul>
                  </div>
                </div>
              </section>

              {/* Key Features Section */}
              <section id="features" className="pt-12">
                <h2 className="text-2xl font-bold text-gray-900 mb-6">Key Features</h2>
                <div className="grid gap-6 md:grid-cols-2">
                  {[
                    {
                      title: 'Authentication System',
                      content:
                        'Secure user registration and login flow with MongoDB storage and JWT authentication',
                    },
                    {
                      title: 'Dynamic Site Creation',
                      content:
                        'On-the-fly database configuration and site initialization during user onboarding',
                    },
                    {
                      title: 'Visual Page Builder',
                      content:
                        'GrapesJS integration for drag-and-drop page editing and component management',
                    },
                    {
                      title: 'User Management',
                      content:
                        'Admin panel with user role management and profile customization options',
                    },
                  ].map((feature, idx) => (
                    <div key={idx} className="p-6 bg-gray-50 rounded-lg">
                      <h3 className="font-semibold text-lg mb-2">{feature.title}</h3>
                      <p className="text-gray-600">{feature.content}</p>
                    </div>
                  ))}
                </div>
              </section>

              {/* Project Flow Section */}
              <section id="flow" className="pt-12">
                <h2 className="text-2xl font-bold text-gray-900 mb-6">Project Flow</h2>
                <div className="space-y-8">
                  <div>
                    <h3 className="text-lg font-semibold mb-3">Initial Setup Flow</h3>
                    <ol className="list-decimal pl-6 space-y-2 text-gray-600">
                      <li>Language Selection</li>
                      <li>MongoDB Connection Configuration</li>
                      <li>Database Name Specification</li>
                      <li>Site Details & Admin Credentials</li>
                      <li>LocalStorage Temporary Storage</li>
                      <li>Final Registration in MongoDB</li>
                    </ol>
                  </div>

                  <div>
                    <h3 className="text-lg font-semibold mb-3">Post-Login Flow</h3>
                    <div className="bg-gray-50 p-6 rounded-lg">
                      <ul className="space-y-3">
                        <li>• Dashboard Overview</li>
                        <li>• Page Management Interface</li>
                        <li>• GrapesJS Visual Editor Access</li>
                        <li>• User Profile Configuration</li>
                      </ul>
                    </div>
                  </div>
                </div>
              </section>

              {/* Technology Stack Section */}
              <section id="tech-stack" className="pt-12">
                <h2 className="text-2xl font-bold text-gray-900 mb-6">Technology Stack</h2>
                <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                  {[
                    ['Frontend', 'Next.js, React, Tailwind CSS'],
                    ['Backend', 'Next.js API Routes'],
                    ['Database', 'MongoDB, Mongoose'],
                    ['Authentication', 'JWT, bcryptjs'],
                    ['State Management', 'Zustand'],
                    ['Editor', 'GrapesJS'],
                  ].map(([category, tech], idx) => (
                    <div key={idx} className="p-4 border rounded-lg">
                      <span className="text-sm font-medium text-blue-600">{category}</span>
                      <p className="mt-1 text-gray-600">{tech}</p>
                    </div>
                  ))}
                </div>
              </section>

              {/* Folder Structure Section */}
              <section id="structure" className="pt-12">
                <h2 className="text-2xl font-bold text-gray-900 mb-6">Folder Structure</h2>
                <pre className="bg-gray-800 text-gray-100 p-6 rounded-lg overflow-x-auto text-sm">
                  {`└───src
    ├───app
    │   ├───(auth)
    │   │   ├───admin
    │   │   ├───language
    │   │   ├───login
    │   │   └───mongodb-setup
    │   │       └───database-setup
    │   ├───api
    │   │   ├───add-users
    │   │   ├───auth
    │   │   │   ├───admin
    │   │   │   ├───delete-databases
    │   │   │   ├───login
    │   │   │   ├───logout
    │   │   │   ├───setup-databases
    │   │   │   └───verify-mongodb
    │   │   ├───clear-cookies
    │   │   ├───get-role
    │   │   ├───get-users
    │   │   ├───logout
    │   │   ├───pages
    │   │   │   └───create
    │   │   ├───profile
    │   │   ├───settings
    │   │   ├───themes
    │   │   │   └───upload
    │   │   ├───update-users
    │   │   ├───upload
    │   │   ├───users
    │   │   │   └───[id]
    │   │   └───verify-connection
    │   ├───dashboard
    │   │   ├───profile
    │   │   ├───settings
    │   │   ├───themes
    │   │   └───users
    │   │       ├───addUsers
    │   │       └───allUsers
    │   ├───doc
    │   ├───GrapeJSEditor
    │   └───themes
    │       ├───openNextDefault
    │       │   ├───components
    │       │   ├───layouts
    │       │   ├───pages
    │       │   ├───public
    │       │   │   └───assets
    │       │   │       └───css
    │       │   └───styles
    │       └───[theme]
    ├───components
    ├───context
    ├───models
    ├───modules
    │   ├───auth
    │   └───page
    ├───styles
    ├───types
    └───utils`}
                </pre>
              </section>
              {/* New API Reference Section */}
              <section id="api-reference" className="pt-12">
                <h2 className="text-2xl font-bold text-gray-900 mb-6">API Reference</h2>
                <div className="space-y-8">
                  {/* Authentication APIs */}
                  <div>
                    <h3 className="text-lg font-semibold mb-4 text-blue-600">
                      Authentication APIs
                    </h3>
                    <div className="space-y-6">
                      {/* Database Setup */}
                      <div className="border rounded-lg p-6">
                        <div className="flex items-center gap-2 mb-4">
                          <span className="px-2 py-1 bg-blue-100 text-blue-800 rounded text-sm font-medium">
                            POST
                          </span>
                          <code className="text-gray-700">/api/auth/setup-databases</code>
                          <span className="text-gray-500 text-sm">API #1</span>
                        </div>
                        <p className="text-gray-600 mb-4">
                          Sets up separate databases for users and pages
                        </p>
                        <div className="grid gap-4 md:grid-cols-2">
                          <div>
                            <h4 className="font-medium mb-2">Request</h4>
                            <pre className="bg-gray-50 p-4 rounded text-sm overflow-x-auto">
                              {`{
  "userDbName": "DB-User01",
  "pageDbName": "DB-Page01",
  "mongodbCredentials": {
    "username": "yourUsername",
    "password": "yourPassword",
    "host": "yourMongoHost",
    "cluster": "Cluster0"
  }
}`}
                            </pre>
                          </div>
                          <div>
                            <h4 className="font-medium mb-2">Response</h4>
                            <pre className="bg-gray-50 p-4 rounded text-sm overflow-x-auto">
                              {`{
  "success": true,
  "message": "Operation successful",
  "data": "Databases setup successful...",
  "status": 200
}`}
                            </pre>
                          </div>
                        </div>
                      </div>

                      {/* MongoDB Verification */}
                      <div className="border rounded-lg p-6">
                        <div className="flex items-center gap-2 mb-4">
                          <span className="px-2 py-1 bg-blue-100 text-blue-800 rounded text-sm font-medium">
                            POST
                          </span>
                          <code className="text-gray-700">/api/auth/verify-mongodb</code>
                          <span className="text-gray-500 text-sm">API #2</span>
                        </div>
                        <p className="text-gray-600 mb-4">Verifies MongoDB connection</p>
                        <div className="grid gap-4 md:grid-cols-2">
                          <div>
                            <h4 className="font-medium mb-2">Request</h4>
                            <pre className="bg-gray-50 p-4 rounded text-sm overflow-x-auto">
                              {`{
  "mongodbUrl": "mongodb+srv://username:password@cluster.mongodb.net/..."
}`}
                            </pre>
                          </div>
                          <div>
                            <h4 className="font-medium mb-2">Response</h4>
                            <pre className="bg-gray-50 p-4 rounded text-sm overflow-x-auto">
                              {`{
  "success": true,
  "message": "MongoDB connection successful",
  "status": 200
}`}
                            </pre>
                          </div>
                        </div>
                      </div>

                      {/* Admin Registration */}
                      <div className="border rounded-lg p-6">
                        <div className="flex items-center gap-2 mb-4">
                          <span className="px-2 py-1 bg-blue-100 text-blue-800 rounded text-sm font-medium">
                            POST
                          </span>
                          <code className="text-gray-700">/api/auth/admin</code>
                          <span className="text-gray-500 text-sm">API #3</span>
                        </div>
                        <p className="text-gray-600 mb-4">Registers new admin user</p>
                        <div className="grid gap-4 md:grid-cols-2">
                          <div>
                            <h4 className="font-medium mb-2">Request</h4>
                            <pre className="bg-gray-50 p-4 rounded text-sm overflow-x-auto">
                              {`{
  "mongodbCredentials": { /* ... */ },
  "userDbName": "users",
  "pageDbName": "pages",
  "siteTitle": "Next-Press",
  "username": "ashimdevnath",
  "name": "Ashim",
  "email": "ashimdevnath@gmail.com",
  "password": "@$Him0021",
  "phoneNo": "9574449365"
}`}
                            </pre>
                          </div>
                          <div>
                            <h4 className="font-medium mb-2">Response</h4>
                            <pre className="bg-gray-50 p-4 rounded text-sm overflow-x-auto">
                              {`{
  "success": true,
  "message": "Registration successful",
  "data": { /* user data */ },
  "isRegistration": "successful"
}`}
                            </pre>
                          </div>
                        </div>
                      </div>

                      {/* Login */}
                      <div className="border rounded-lg p-6">
                        <div className="flex items-center gap-2 mb-4">
                          <span className="px-2 py-1 bg-blue-100 text-blue-800 rounded text-sm font-medium">
                            POST
                          </span>
                          <code className="text-gray-700">/api/auth/login</code>
                          <span className="text-gray-500 text-sm">API #4</span>
                        </div>
                        <p className="text-gray-600 mb-4">User authentication</p>
                        <div className="grid gap-4 md:grid-cols-2">
                          <div>
                            <h4 className="font-medium mb-2">Request</h4>
                            <pre className="bg-gray-50 p-4 rounded text-sm overflow-x-auto">
                              {`{
  "email": "ashimdevnath@gmail.com",
  "password": "@$Him0021"
}`}
                            </pre>
                          </div>
                          <div>
                            <h4 className="font-medium mb-2">Response</h4>
                            <pre className="bg-gray-50 p-4 rounded text-sm overflow-x-auto">
                              {`{
  "success": true,
  "user": { /* user data */ }
}`}
                            </pre>
                          </div>
                        </div>
                      </div>

                      {/* Logout */}
                      <div className="border rounded-lg p-6">
                        <div className="flex items-center gap-2 mb-4">
                          <span className="px-2 py-1 bg-blue-100 text-blue-800 rounded text-sm font-medium">
                            POST
                          </span>
                          <code className="text-gray-700">/api/auth/logout</code>
                          <span className="text-gray-500 text-sm">API #5</span>
                        </div>
                        <p className="text-gray-600 mb-4">Terminates user session</p>
                        <div className="grid gap-4 md:grid-cols-2">
                          <div>
                            <h4 className="font-medium mb-2">Response</h4>
                            <pre className="bg-gray-50 p-4 rounded text-sm overflow-x-auto">
                              {`{
  "success": true,
  "message": "Logged out"
}`}
                            </pre>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Content Management APIs */}
                  <div>
                    <h3 className="text-lg font-semibold mb-4 text-green-600">
                      Content Management APIs
                    </h3>
                    <div className="space-y-6">
                      {/* File Upload */}
                      <div className="border rounded-lg p-6">
                        <div className="flex items-center gap-2 mb-4">
                          <span className="px-2 py-1 bg-green-100 text-green-800 rounded text-sm font-medium">
                            POST
                          </span>
                          <code className="text-gray-700">/api/dashboard/profile/upload</code>
                          <span className="text-gray-500 text-sm">API #6</span>
                        </div>
                        <p className="text-gray-600 mb-4">Handles file uploads</p>
                        <div className="grid gap-4 md:grid-cols-2">
                          <div>
                            <h4 className="font-medium mb-2">Request</h4>
                            <div className="bg-gray-50 p-4 rounded text-sm">
                              <p className="text-gray-500">Form Data:</p>
                              <code>profileImage: [File]</code>
                            </div>
                          </div>
                          <div>
                            <h4 className="font-medium mb-2">Response</h4>
                            <pre className="bg-gray-50 p-4 rounded text-sm">
                              {`{
  "success": true,
  "message": "Profile Image Uploaded Successfully"
}`}
                            </pre>
                          </div>
                        </div>
                      </div>

                      {/* Add Users */}
                      <div className="border rounded-lg p-6">
                        <div className="flex items-center gap-2 mb-4">
                          <span className="px-2 py-1 bg-green-100 text-green-800 rounded text-sm font-medium">
                            POST
                          </span>
                          <code className="text-gray-700">/api/sub-users/add-users</code>
                          <span className="text-gray-500 text-sm">API #7</span>
                        </div>
                        <p className="text-gray-600 mb-4">Creates new user</p>
                        <div className="grid gap-4 md:grid-cols-2">
                          <div>
                            <h4 className="font-medium mb-2">Request</h4>
                            <pre className="bg-gray-50 p-4 rounded text-sm overflow-x-auto">
                              {`{
  "userData": {
    "username": "ashim",
    "name": "Ashim Devnath",
    "email": "ashim@gmail.com",
    "password": "sd@ds5fd6",
    "role": "Editor",
    "phoneNumber": "8956255635"
  }
}`}
                            </pre>
                          </div>
                          <div>
                            <h4 className="font-medium mb-2">Response</h4>
                            <pre className="bg-gray-50 p-4 rounded text-sm">
                              {`{
  "success": true,
  "message": "User Created"
}`}
                            </pre>
                          </div>
                        </div>
                      </div>

                      {/* Get Users */}
                      <div className="border rounded-lg p-6">
                        <div className="flex items-center gap-2 mb-4">
                          <span className="px-2 py-1 bg-green-100 text-green-800 rounded text-sm font-medium">
                            GET
                          </span>
                          <code className="text-gray-700">/api/sub-users/get-users</code>
                          <span className="text-gray-500 text-sm">API #8</span>
                        </div>
                        <p className="text-gray-600 mb-4">Retrieves user list</p>
                        <div className="grid gap-4 md:grid-cols-2">
                          <div>
                            <h4 className="font-medium mb-2">Response</h4>
                            <pre className="bg-gray-50 p-4 rounded text-sm overflow-x-auto">
                              {`{
  "success": true,
  "message": "Users Fetched",
  "data": [/* user data */]
}`}
                            </pre>
                          </div>
                        </div>
                      </div>
                      {/* Site Icon Upload */}
                      <div className="border rounded-lg p-6">
                        <div className="flex items-center gap-2 mb-4">
                          <span className="px-2 py-1 bg-green-100 text-green-800 rounded text-sm font-medium">
                            POST
                          </span>
                          <code className="text-gray-700">/api/dashboard/settings/siteicon</code>
                          <span className="text-gray-500 text-sm">API #9</span>
                        </div>
                        <p className="text-gray-600 mb-4">Uploads a site icon image</p>
                        <div className="grid gap-4 md:grid-cols-2">
                          <div>
                            <h4 className="font-medium mb-2">Request</h4>
                            <div className="bg-gray-50 p-4 rounded text-sm">
                              <p className="text-gray-500">Form Data:</p>
                              <code>siteIcon: [Image File]</code>
                            </div>
                          </div>
                          <div>
                            <h4 className="font-medium mb-2">Response</h4>
                            <pre className="bg-gray-50 p-4 rounded text-sm">
                              {`{
  "success": true,
  "message": "Siteicon Uploaded"
}`}
                            </pre>
                          </div>
                        </div>
                      </div>
                      {/* Themes Upload */}
                      <div className="border rounded-lg p-6">
                        <div className="flex items-center gap-2 mb-4">
                          <span className="px-2 py-1 bg-green-100 text-green-800 rounded text-sm font-medium">
                            POST
                          </span>
                          <code className="text-gray-700">/api/themes/upload</code>
                          <span className="text-gray-500 text-sm">API #10</span>
                        </div>
                        <p className="text-gray-600 mb-4">Uploads theme files in ZIP format</p>
                        <div className="grid gap-4 md:grid-cols-2">
                          <div>
                            <h4 className="font-medium mb-2">Request</h4>
                            <div className="bg-gray-50 p-4 rounded text-sm">
                              <p className="text-gray-500">Form Data:</p>
                              <code>themes: [ZIP File]</code>
                            </div>
                          </div>
                          <div>
                            <h4 className="font-medium mb-2">Response</h4>
                            <pre className="bg-gray-50 p-4 rounded text-sm">
                              {`{
  "success": true,
  "message": "Themes Uploaded Successfully"
}`}
                            </pre>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* System APIs */}
                  <div>
                    <h3 className="text-lg font-semibold mb-4 text-purple-600">System APIs</h3>
                    <div className="space-y-6">
                      {/* Verify Connection */}
                      <div className="border rounded-lg p-6">
                        <div className="flex items-center gap-2 mb-4">
                          <span className="px-2 py-1 bg-purple-100 text-purple-800 rounded text-sm font-medium">
                            POST
                          </span>
                          <code className="text-gray-700">/api/verify-connection</code>
                          <span className="text-gray-500 text-sm">API #11</span>
                        </div>
                        <p className="text-gray-600 mb-4">Checks database connections</p>
                        <div className="grid gap-4 md:grid-cols-2">
                          <div>
                            <h4 className="font-medium mb-2">Response</h4>
                            <pre className="bg-gray-50 p-4 rounded text-sm overflow-x-auto">
                              {`{
  "success": true,
  "message": "Database connections OK"
}`}
                            </pre>
                          </div>
                        </div>
                      </div>

                      {/* Update Settings */}
                      <div className="border rounded-lg p-6">
                        <div className="flex items-center gap-2 mb-4">
                          <span className="px-2 py-1 bg-purple-100 text-purple-800 rounded text-sm font-medium">
                            PUT
                          </span>
                          <code className="text-gray-700">/api/dashboard/settings</code>
                          <span className="text-gray-500 text-sm">API #12</span>
                        </div>
                        <p className="text-gray-600 mb-4">Updates system settings</p>
                        <div className="grid gap-4 md:grid-cols-2">
                          <div>
                            <h4 className="font-medium mb-2">Request</h4>
                            <pre className="bg-gray-50 p-4 rounded text-sm">
                              {`{
  "siteTitle": "Ecommerce Website",
  "tagline": "Example Tagline",
  "siteIcon": "siteIcon.jpg",
  "language": "en",
  "timeZone": "US/Pacific"
}`}
                            </pre>
                          </div>
                          <div>
                            <h4 className="font-medium mb-2">Response</h4>
                            <pre className="bg-gray-50 p-4 rounded text-sm">
                              {`{
  "success": true,
  "message": "Settings Updated Successfully"
}`}
                            </pre>
                          </div>
                        </div>
                      </div>

                      {/* Clear Cookies */}
                      <div className="border rounded-lg p-6">
                        <div className="flex items-center gap-2 mb-4">
                          <span className="px-2 py-1 bg-purple-100 text-purple-800 rounded text-sm font-medium">
                            GET
                          </span>
                          <code className="text-gray-700">/api/clear-cookies</code>
                          <span className="text-gray-500 text-sm">API #13</span>
                        </div>
                        <p className="text-gray-600 mb-4">Clears user authentication cookies</p>
                        <div className="grid gap-4 md:grid-cols-2">
                          <div>
                            <h4 className="font-medium mb-2">Response</h4>
                            <pre className="bg-gray-50 p-4 rounded text-sm">
                              {`{
  "success": true,
  "message": "Cookies Cleared"
}`}
                            </pre>
                          </div>
                        </div>
                      </div>
                      {/* Update Profile */}
                      <div className="border rounded-lg p-6">
                        <div className="flex items-center gap-2 mb-4">
                          <span className="px-2 py-1 bg-purple-100 text-purple-800 rounded text-sm font-medium">
                            GET
                          </span>
                          <code className="text-gray-700">/api/dashboard/profile</code>
                          <span className="text-gray-500 text-sm">API #14</span>
                        </div>
                        <p className="text-gray-600 mb-4">Updates user profile details</p>
                        <div className="grid gap-4 md:grid-cols-2">
                          <div>
                            <h4 className="font-medium mb-2">Request</h4>
                            <pre className="bg-gray-50 p-4 rounded text-sm overflow-x-auto">
                              {`{
  "requestedData": {
    "username": "ashim",
    "email": "ashim@gmail.com",
    "firstName": "ashim",
    "lastName": "devnath",
    "nickName": "ashim",
    "displayName": "ashim-325",
    "website": "My Website",
    "bio": "I am a new user. I am a website developer"
  }
}`}
                            </pre>
                          </div>
                          <div>
                            <h4 className="font-medium mb-2">Response</h4>
                            <pre className="bg-gray-50 p-4 rounded text-sm">
                              {`{
  "success": true,
  "message": "Profile Updated Successfully"
}`}
                            </pre>
                          </div>
                        </div>
                      </div>

                      {/* Get Roles */}
                      <div className="border rounded-lg p-6">
                        <div className="flex items-center gap-2 mb-4">
                          <span className="px-2 py-1 bg-purple-100 text-purple-800 rounded text-sm font-medium">
                            GET
                          </span>
                          <code className="text-gray-700">/api/get-role</code>
                          <span className="text-gray-500 text-sm">API #15</span>
                        </div>
                        <p className="text-gray-600 mb-4">Retrieves available user roles</p>
                        <div className="grid gap-4 md:grid-cols-2">
                          <div>
                            <h4 className="font-medium mb-2">Response</h4>
                            <pre className="bg-gray-50 p-4 rounded text-sm overflow-x-auto">
                              {`{
  "success": true,
  "message": "Roles Fetched Successfully",
  "data": {
    "SuperAdmin": "0",
    "Admin": "1",
    "Editor": "2",
    "Author": "3"
  }
}`}
                            </pre>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </section>
            </div>
          </main>
        </div>
      </div>
    </div>
  );
}
