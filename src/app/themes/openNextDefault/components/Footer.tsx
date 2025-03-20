import { useEffect, useState, JSX } from "react";
import styles from "../public/assets/css/footer.module.css";

interface ElementAttributes {
  id?: string;
  [key: string]: string | Node[] | undefined;
}

interface ElementNode {
  tag: string;
  attributes?: ElementAttributes;
  className?: string;
  children?: ElementNode[];
  text?: string;
}

const renderElement = (element: ElementNode) => {
  const { tag, attributes = {}, className, children, text } = element;
  const Element = tag as keyof JSX.IntrinsicElements;

  return (
    <Element
      key={attributes.id || tag}
      {...attributes}
      className={className ? styles[className] || className : undefined}
    >
      {text}
      {children && children.map((child: ElementNode) => renderElement(child))}
    </Element>
  );
};


const backendUrl = process.env.NEXT_PUBLIC_BACKEND_URL || "http://localhost:3000"

const Footer = () => {
  const [pageData, setPageData] = useState<ElementNode | null>(null);

  useEffect(() => {
    const fetchPageData = async () => {
      try {
        const res = await fetch(`${backendUrl}/api/pages/get-pages`);
        const data = await res.json();
        const bodyComponent = data[0].component.find((comp: { name: string }) => comp.name === 'footer').data;
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

  return renderElement(pageData);
};

export default Footer;
