import pageData from "../public/data/body.json";
import styles from "../public/assets/css/body.module.css";
import { ArrowUpRight, Atom, Zap, RefreshCw } from "lucide-react";
import { useRouter } from "next/navigation";
import { JSX } from 'react';

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
      className={styles[className] || className} // ✅ Fix className issue
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
  return <LandingPage node={pageData} router={router} />;
}
