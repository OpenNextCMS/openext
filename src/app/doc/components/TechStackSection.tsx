// app/components/Documentation/TechStackSection.tsx
import { TechStackItem } from '@/types';

interface TechStackProps {
  stack: TechStackItem[];
}

export default function TechStackSection({ stack }: TechStackProps) {
  return (
    <section id="tech-stack" className="pt-12">
      <h2 className="text-2xl font-bold text-gray-900 mb-6">Technology Stack</h2>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {stack.map((item, idx) => (
          <div key={idx} className="p-4 border rounded-lg">
            <span className="text-sm font-medium text-blue-600">{item.category}</span>
            <p className="mt-1 text-gray-600">{item.tech}</p>
          </div>
        ))}
      </div>
    </section>
  );
}
