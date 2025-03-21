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

interface Node {
  tag: string;
  children?: Node[];
  text?: string;
  icon?: string;
  onClick?: string;
  className?: string;
  [key: string]: string | Node[] | undefined;
}

const LandingPage = ({ node, router }: { node: Node, router: ReturnType<typeof useRouter> }) => {
  if (!node.tag) return null;

  const Element = node.tag as keyof JSX.IntrinsicElements;
  const { children, text, icon, onClick, className, ...attrs } = node;

  const IconComponent = icon ? iconComponents[icon as keyof typeof iconComponents] : null;

  return (
    <Element
      {...attrs}
      className={className ? styles[className] || className : undefined}
      onClick={onClick ? () => (onClick.startsWith("http") ? window.open(onClick) : router.push(onClick)) : undefined}
    >
      {IconComponent && <IconComponent className={styles.icon} />}
      {text || null}
      {children?.map((child: Node, index: number) => (
        <LandingPage key={index} node={child} router={router} />
      ))}
    </Element>
  );
};

const backendUrl = process.env.NEXT_PUBLIC_BACKEND_URL || "http://localhost:3000"
export default function DynamicPage() {
  const router = useRouter();
  const [pageData, setPageData] = useState<Node | null>(null);


  useEffect(() => {
    const fetchPageData = async () => {
      try {
        const res = await fetch(`${backendUrl}/api/pages/get-pages`);
        const data = await res.json();
        const bodyComponent = data[0].component.find((comp: { name: string }) => comp.name === 'body').data;
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