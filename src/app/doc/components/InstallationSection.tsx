import { InstallationData } from '@/types';

interface InstallationProps {
    data: InstallationData;
}

export default function InstallationSection({ data }: InstallationProps) {
    return (
        <section id="installation" className="pt-12">
            <h2 className="text-2xl font-bold text-gray-900 mb-6">{data.title}</h2>
            <p className="text-gray-600 mb-8">{data.description}</p>

            <div className="mb-8">
                <h3 className="text-xl font-semibold mb-4 text-blue-600">Requirements</h3>
                <ul className="list-disc pl-6 space-y-2 text-gray-600">
                    {data.requirements.map((req, idx) => (
                        <li key={idx}>{req}</li>
                    ))}
                </ul>
            </div>

            <div className="space-y-8">
                {data.steps.map((step) => (
                    <div key={step.step} className="border-l-4 border-blue-200 pl-4">
                        <h4 className="text-lg font-semibold mb-2">
                            Step {step.step}: {step.title}
                        </h4>
                        <pre className="bg-gray-50 p-4 rounded text-sm overflow-x-auto mb-4">
                            {step.content}
                        </pre>
                    </div>
                ))}
            </div>

            <div className="mt-12">
                <h3 className="text-xl font-semibold mb-4 text-red-600">Troubleshooting</h3>
                <div className="space-y-6">
                    {data.troubleshooting.map((issue, idx) => (
                        <div key={idx} className="bg-red-50 p-4 rounded-lg">
                            <h5 className="font-medium text-red-800 mb-2">{issue.issue}</h5>
                            <pre className="bg-white p-4 rounded text-sm overflow-x-auto">
                                {issue.solution}
                            </pre>
                        </div>
                    ))}
                </div>
            </div>
        </section>
    );
}