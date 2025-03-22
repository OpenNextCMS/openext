import { ApiCategory, ApiEndpointProps } from '@/types';

interface ApiReferenceProps {
  apiData: ApiCategory[];
}

export default function ApiReferenceSection({ apiData }: ApiReferenceProps) {
  return (
    <section id="api-reference" className="pt-12">
      <h2 className="text-2xl font-bold text-gray-900 mb-6">API Reference</h2>
      <div className="space-y-8">
        {apiData.map((category) => (
          <div key={category.title}>
            <h3 className={`text-lg font-semibold mb-4 ${category.color}`}>{category.title}</h3>
            <div className="space-y-6">
              {category.endpoints.map((endpoint) => (
                <ApiEndpoint key={endpoint.apiNumber} endpoint={endpoint} />
              ))}
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}

const ApiEndpoint = ({ endpoint }: { endpoint: ApiEndpointProps }) => (
  <div className="border rounded-lg p-6">
    <div className="flex items-center gap-2 mb-4">
      <span
        className={`px-2 py-1 bg-${endpoint.color}-100 text-${endpoint.color}-800 rounded text-sm font-medium`}
      >
        {endpoint.method}
      </span>
      <code className="text-gray-700">{endpoint.path}</code>
      <span className="text-gray-500 text-sm">API #{endpoint.apiNumber}</span>
    </div>
    <p className="text-gray-600 mb-4">{endpoint.description}</p>
    <div className="grid gap-4 md:grid-cols-2">
      {endpoint.request && (
        <div>
          <h4 className="font-medium mb-2">Request</h4>
          <pre className="bg-gray-50 p-4 rounded text-sm overflow-x-auto">
            {typeof endpoint.request === 'string'
              ? endpoint.request
              : JSON.stringify(endpoint.request, null, 2)}
          </pre>
        </div>
      )}
      {endpoint.response && (
        <div>
          <h4 className="font-medium mb-2">Response</h4>
          <pre className="bg-gray-50 p-4 rounded text-sm overflow-x-auto">
            {JSON.stringify(endpoint.response, null, 2)}
          </pre>
        </div>
      )}
    </div>
  </div>
);
