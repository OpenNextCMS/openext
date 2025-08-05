// app/documentation/page.tsx
import documentationData from './data/documentation.json';
import Sidebar from './components/Sidebar';
import OverviewSection from './components/Overview';
import FeaturesSection from './components/Features';
import ProjectFlowSection from './components/ProjectFlow';
import TechStackSection from './components/TechStackSection';
import FolderStructureSection from './components/FolderStructureSection';
import ApiReferenceSection from './components/ApiReferenceSection';
import PackagesSection from './components/PackagesSection';
import InstallationSection from './components/InstallationSection';

export default function Documentation() {
  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="lg:grid lg:grid-cols-12 lg:gap-8">
          <Sidebar navigation={documentationData.navigation} />

          <main className="lg:col-span-9 bg-white rounded-xl shadow-sm p-8">
            <div className="prose max-w-none">
              <OverviewSection data={documentationData.overview} />
              <FeaturesSection features={documentationData.features} />
              <InstallationSection data={documentationData.installation} />
              <ProjectFlowSection flow={documentationData.projectFlow} />
              <TechStackSection stack={documentationData.techStack} />
              <FolderStructureSection />
              <PackagesSection data={documentationData.packages} />
              <ApiReferenceSection apiData={documentationData.apiCategories} />
            </div>
          </main>
        </div>
      </div>
    </div>
  );
}
