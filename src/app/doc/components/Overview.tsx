// app/components/Documentation/Overview.tsx
import { OverviewData } from '@/types';

interface OverviewProps {
    data: OverviewData;
}

export default function OverviewSection({ data }: OverviewProps) {
    return (
        <section id="overview">
            <h1 className="text-3xl font-bold text-gray-900 mb-6">{data.title}</h1>
            <div className="space-y-4 text-gray-600">
                <p>{data.description}</p>
                <div className="bg-blue-50 p-4 rounded-lg">
                    <h3 className="text-blue-800 font-semibold mb-2">Core Objectives</h3>
                    <ul className="list-disc pl-5 space-y-2">
                        {data.objectives.map((objective, index) => (
                            <li key={index}>{objective}</li>
                        ))}
                    </ul>
                </div>
            </div>
        </section>
    );
}