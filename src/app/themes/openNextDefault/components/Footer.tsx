import { useEffect, useState, JSX } from "react";
import styles from "../public/assets/css/footer.module.css";

const renderElement = (element: any) => {
  const { tag, attributes = {}, className, children, text } = element;
  const Element = tag as keyof JSX.IntrinsicElements;

  return (
    <Element
      key={attributes.id || tag}
      {...attributes}
      className={styles[className] || className}
    >
      {text}
      {children && children.map((child: any) => renderElement(child))}
    </Element>
  );
};

const Footer = () => {
  const [pageData, setPageData] = useState<any>(null);

  useEffect(() => {
    const fetchPageData = async () => {
      try {
        const res = await fetch('http://localhost:3000/api/pages/get-pages');
        const data = await res.json();
        const bodyComponent = data[0].component.find((comp: any) => comp.name === 'footer').data;
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
