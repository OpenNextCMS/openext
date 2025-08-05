import { NavigationItem } from '@/types';

interface SidebarProps {
  navigation: NavigationItem[];
}

export default function Sidebar({ navigation }: SidebarProps) {
  return (
    <aside className="lg:col-span-3 mb-8 lg:mb-0">
      <nav className="sticky top-8 space-y-1">
        <h2 className="text-xl font-bold text-gray-900 mb-4">Contents</h2>
        <ul className="space-y-2">
          {navigation.map((item) => (
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
  );
}
