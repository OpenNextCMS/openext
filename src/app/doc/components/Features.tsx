import { Feature } from '@/types';

interface FeaturesProps {
  features: Feature[];
}

export default function FeaturesSection({ features }: FeaturesProps) {
  return (
    <section id="features" className="pt-12">
      <h2 className="text-2xl font-bold text-gray-900 mb-6">Key Features</h2>
      <div className="grid gap-6 md:grid-cols-2">
        {features.map((feature, idx) => (
          <div key={idx} className="p-6 bg-gray-50 rounded-lg">
            <h3 className="font-semibold text-lg mb-2">{feature.title}</h3>
            <p className="text-gray-600">{feature.content}</p>
          </div>
        ))}
      </div>
    </section>
  );
}
