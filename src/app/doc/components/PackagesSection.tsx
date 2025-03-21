import { PackageData } from '@/types';

interface PackagesProps {
    data: PackageData;
}

export default function PackagesSection({ data }: PackagesProps) {
    return (
        <section id="packages" className="pt-12">
            <h2 className="text-2xl font-bold text-gray-900 mb-6">Package Dependencies</h2>

            <div className="mb-8">
                <span className="text-sm text-gray-600">
                    Last Updated: {new Date().toLocaleDateString()}
                </span>
            </div>

            <h3 className="text-xl font-semibold mb-4 text-blue-600">Production Dependencies</h3>
            <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200 mb-8">
                    <thead className="bg-gray-50">
                        <tr>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Package Name</th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Date Added</th>
                        </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                        {data.dependencies.map((pkg, idx) => (
                            <tr key={idx}>
                                <td className="px-6 py-4 whitespace-nowrap text-sm font-mono text-gray-900">{pkg.name}</td>
                                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{pkg.dateAdded}</td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>

            <h3 className="text-xl font-semibold mb-4 text-green-600">Development Dependencies</h3>
            <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50">
                        <tr>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Package Name</th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Date Added</th>
                        </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                        {data.devDependencies.map((pkg, idx) => (
                            <tr key={idx}>
                                <td className="px-6 py-4 whitespace-nowrap text-sm font-mono text-gray-900">{pkg.name}</td>
                                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{pkg.dateAdded}</td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </section>
    );
}