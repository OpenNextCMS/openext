// app/components/Documentation/ProjectFlow.tsx
import { ProjectFlowData } from '@/types';

interface ProjectFlowProps {
  flow: ProjectFlowData;
}

export default function ProjectFlowSection({ flow }: ProjectFlowProps) {
  return (
    <section id="flow" className="pt-12">
      <h2 className="text-2xl font-bold text-gray-900 mb-6">Project Flow</h2>
      <div className="space-y-8">
        <div>
          <h3 className="text-lg font-semibold mb-3">Initial Setup Flow</h3>
          <ol className="list-decimal pl-6 space-y-2 text-gray-600">
            {flow.setup.map((step, index) => (
              <li key={index}>{step}</li>
            ))}
          </ol>
        </div>

        <div>
          <h3 className="text-lg font-semibold mb-3">Post-Login Flow</h3>
          <div className="bg-gray-50 p-6 rounded-lg">
            <ul className="space-y-3">
              {flow.postLogin.map((item, index) => (
                <li key={index}>• {item}</li>
              ))}
            </ul>
          </div>
        </div>
      </div>
    </section>
  );
}
