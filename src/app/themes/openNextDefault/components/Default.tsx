import Image from 'next/image';
import { useEffect, useState, JSX } from 'react';

const backendUrl = process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:3000';

const typeToTag: Record<string, keyof JSX.IntrinsicElements> = {
  text: 'div',
  button: 'button',
  image: 'img',
  column: 'div',
};

type JsonElement = {
  content: string;
  type: string;
  icon?: string;
  uniqueId: string;
  style?: React.CSSProperties;
};

// Render a single JSON element
const renderFromJson = (element: JsonElement): JSX.Element => {
  const Tag = typeToTag[element.type] || 'div';
  const style = element.style || {};

  if (element.type === 'image') {
    return <Image alt={element.content} key={element.uniqueId} src={element.content} style={style} />;
  }

  return (
    <Tag key={element.uniqueId} style={style}>
      {element.content}
    </Tag>
  );
};

const Default = () => {
  const [pageData, setPageData] = useState<JsonElement[]>([]); // <-- change to an array

  useEffect(() => {
    const fetchData = async () => {
      let url = `${backendUrl}/api/pages/get-pages`;
      let slug = 'default_home';

      try {
        const tokenRes = await fetch(`${backendUrl}/api/check-token`);
        if (!tokenRes.ok) {
          url = `${backendUrl}/api/pages/get-page?name=${slug}`;
        }
      } catch (err) {
        console.error('Token check failed:', err);
      }

      try {
        const res = await fetch(url);
        const data = await res.json();

        const container = data.page || data.pages?.[0];

        if (!container?.isHome) {
          console.error('This is not a home page');
          return;
        }

        const defaultComponent = container.component;
        if (Array.isArray(defaultComponent)) {
          setPageData(defaultComponent); // ✅ safe set
          slug = container?.slug;
        } else {
          console.error('Invalid component format:', defaultComponent);
        }
      } catch (err) {
        console.error('Failed to fetch page data:', err);
      }
    };

    fetchData();
  }, []);

  if (!pageData.length) return <div>Loading...</div>;

  return (
    <div>
      {pageData.map((element) => renderFromJson(element))}
    </div>
  );
};

export default Default;
