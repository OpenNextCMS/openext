import styles from "../public/assets/css/body.module.css";
import { ArrowUpRight, Atom, Zap, RefreshCw } from "lucide-react";
import { useRouter } from "next/navigation";
import { JSX, useEffect, useState } from 'react';

const iconComponents = {
  ArrowUpRight,
  Atom,
  Zap,
  RefreshCw
};

const LandingPage = ({ node, router }: { node: any, router: any }) => {
  if (!node.tag) return null;

  const Element = node.tag as keyof JSX.IntrinsicElements;
  const { children, text, icon, onClick, className, ...attrs } = node;

  const IconComponent = icon ? iconComponents[icon as keyof typeof iconComponents] : null;

  return (
    <Element
      {...attrs}
      className={styles[className] || className}
      onClick={onClick ? () => (onClick.startsWith("http") ? window.open(onClick) : router.push(onClick)) : undefined}
    >
      {IconComponent && <IconComponent className={styles.icon} />}
      {text || null}
      {children?.map((child: any, index: number) => (
        <LandingPage key={index} node={child} router={router} />
      ))}
    </Element>
  );
};

export default function DynamicPage() {
  const router = useRouter();
  const [pageData, setPageData] = useState<any>(null);

  useEffect(() => {
    const fetchPageData = async () => {
      try {
        const res = await fetch('http://localhost:3000/api/pages/get-pages');
        const data = await res.json();
        const bodyComponent = data[0].component.find((comp: any) => comp.name === 'body').data;
        setPageData(bodyComponent);
      } catch (error) {
        console.error('Failed to fetch page data:', error);
      }
    };

    fetchPageData();
  }, []);

  if (!pageData) {
    return <div>Loading...</div>;
  }


  return <LandingPage node={pageData} router={router} />;
}