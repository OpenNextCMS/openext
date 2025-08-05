import React from 'react';
import documentation from '../data/documentation.json';

interface ContentItem {
  title?: string;
  text?: string;
}

interface ContentBlock {
  type: string;
  text?: string;
  title?: string;
  items?: string[] | ContentItem[];
}

interface Section {
  id: string;
  title: string;
  content: ContentBlock[];
}

interface SectionsProps {
  // Optional prop to exclude specific section IDs
  excludeSections?: string[];
}

const Sections: React.FC<SectionsProps> = ({ excludeSections = ['overview', 'api-reference'] }) => {
  // Extract sections dynamically from the documentation object
  const sectionContents = Object.entries(documentation)
    .filter(([key, value]) => {
      // Exclude specified sections and ensure the value has a title and content
      return (
        !excludeSections.includes(key) &&
        typeof value === 'object' &&
        'title' in value &&
        'content' in value
      );
    })
    .map(([key, value]) => {
      if (typeof value === 'object' && 'title' in value) {
        return {
          id: key,
          title: value.title,
          content: 'content' in value ? value.content : [],
        };
      }
      return null;
    })
    .filter((section): section is Section => section !== null);

  return (
    <div>
      {sectionContents.map((section: Section) => (
        <section key={section.id} id={section.id} className="pt-12">
          <h2 className="text-2xl font-bold text-gray-900 mb-6">{section.title}</h2>
          <div className="space-y-6">
            {section.content.map((block: ContentBlock, index: number) => {
              switch (block.type) {
                case 'paragraph':
                  return (
                    <p key={index} className="text-gray-600">
                      {block.text}
                    </p>
                  );

                case 'box':
                  return (
                    <div key={index} className="bg-blue-50 p-4 rounded-lg">
                      <h3 className="text-blue-800 font-semibold mb-2">{block.title}</h3>
                      <ul className="list-disc pl-5 space-y-2">
                        {block.items?.map((item, idx) => (
                          <li key={idx}>{typeof item === 'string' ? item : item.text}</li>
                        ))}
                      </ul>
                    </div>
                  );

                case 'grid':
                  return (
                    <div key={index} className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
                      {(block.items as ContentItem[])?.map((item, idx) => (
                        <div key={idx} className="p-4 border rounded-lg bg-gray-50">
                          <h3 className="font-semibold text-lg mb-2">{item.title}</h3>
                          <p className="text-gray-600">{item.text}</p>
                        </div>
                      ))}
                    </div>
                  );

                case 'subsection':
                  return (
                    <div key={index}>
                      <h3 className="text-lg font-semibold mb-3">{block.title}</h3>
                      <ul className="list-disc pl-5 space-y-2 text-gray-600">
                        {block.items?.map((item, idx) => (
                          <li key={idx}>{typeof item === 'string' ? item : item.text}</li>
                        ))}
                      </ul>
                    </div>
                  );

                default:
                  return null;
              }
            })}
          </div>
        </section>
      ))}
    </div>
  );
};

export default Sections;
