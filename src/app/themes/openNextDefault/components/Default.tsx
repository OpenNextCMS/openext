import renderFromJson from '@/components/ReusableComponents/RenderFromJson';
import { BlockData, Page } from '@/types';
import { useEffect, useState } from 'react';

const backendUrl = process.env.NEXT_PUBLIC_BACKEND_URL || '';

const Default = () => {
  const [pageData, setPageData] = useState<BlockData[]>([]);
  const [headerData, setHeaderData] = useState<BlockData[]>([]);
  const [footerData, setFooterData] = useState<BlockData[]>([]);

  useEffect(() => {
    const fetchData = async () => {
      let url = `${backendUrl}/api/pages/get-pages`;
      let slug = '';
      try {
        // Checking if USER is logged in checking JWT token
        const tokenRes = await fetch(`${backendUrl}/api/check-token`);
        if (!tokenRes.ok) {
          try {
            const response = await fetch(`${backendUrl}/api/env-connection?key=DEFAULT_HOME_SLUG`);

            if (!response.ok) {
              throw new Error('Failed to fetch default home slug');
            }

            const value = await response.json();

            if (value.DEFAULT_HOME_SLUG) {
              slug = value.DEFAULT_HOME_SLUG;
            } else {
              throw new Error('DEFAULT_HOME_SLUG not found in .env');
            }
          } catch (error) {
            console.error('Error fetching slug from .env:', error);
            return; // or handle fallback if needed
          }
          // If USER is not Logged "allowMe" is user defined variable location below
          // src\app\api\pages\get-page\route.ts
          url = `${backendUrl}/api/pages/get-page?name=${slug}&key=allowMe`;
        }
      } catch (err) {
        console.error('Token check failed:', err);
      }

      try {
        const res = await fetch(url, { cache: 'no-store' });
        const data = await res.json();

        let container = data.page || data.pages?.find((page: Page) => page.isHome === true);

        if (!data.page && container?.slug) {
          const layoutRes = await fetch(
            `${backendUrl}/api/pages/get-page?name=${encodeURIComponent(container.slug)}&key=allowMe`,
            { cache: 'no-store' }
          );

          if (layoutRes.ok) {
            const layoutData = await layoutRes.json();
            container = layoutData.page || container;
            data.header = layoutData.header;
            data.footer = layoutData.footer;
          }
        }

        if (!container?.isHome) {
          console.error('This is not a home page');
          return;
        }

        const defaultComponent = container.component;
        if (Array.isArray(defaultComponent)) {
          setPageData(defaultComponent);
          setHeaderData(Array.isArray(data.header?.component) ? data.header.component : []);
          setFooterData(Array.isArray(data.footer?.component) ? data.footer.component : []);
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
      {headerData.map((element) => renderFromJson(element))}
      {pageData.map((element) => renderFromJson(element))}
      {footerData.map((element) => renderFromJson(element))}
    </div>
  );
};

export default Default;
