export default function DashboardPage() {
    return (
      <div>
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-800">Welcome to Dashboard</h1>
          <p className="text-gray-600 mt-2">
            Select an option from the sidebar to get started
          </p>
        </div>
  
        {/* Stats Cards Grid */}
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
          <div className="bg-white p-6 rounded-xl shadow-sm">
            <h3 className="text-lg font-semibold text-gray-700">Quick Stats</h3>
            {/* Add stats content here */}
          </div>
          
          {/* Add more cards here */}
        </div>
  
      </div>
    );
  }