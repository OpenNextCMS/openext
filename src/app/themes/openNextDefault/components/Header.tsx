import { useEffect, useState, JSX } from "react";
import styles from "../public/assets/css/theme.module.css";

const renderElement = (element: any) => {
  const { tag, className, attributes = {}, children, text, onClick } = element;
  const Element = tag as keyof JSX.IntrinsicElements;

  const handleClick = () => {
    if (onClick === "openExternalLink") {
      window.open("https://aviraltrendzpvtltd.com/");
    }
  };

  const voidElements = ["area", "base", "br", "col", "embed", "hr", "img", "input", "link", "meta", "param", "source", "track", "wbr"];
  if (voidElements.includes(tag)) {
    return <Element key={tag} {...attributes} className={styles[className] || className} />;
  }

  return (
    <Element
      key={tag}
      {...attributes}
      className={styles[className] || className}
      onClick={onClick ? handleClick : undefined}
    >
      {text}
      {children && children.map((child: any, index: number) => renderElement(child))}
    </Element>
  );
};

const Header = () => {
  const [pageData, setPageData] = useState<any>(null);

  useEffect(() => {
    const fetchPageData = async () => {
      try {
        const res = await fetch('http://localhost:3000/api/pages/get-pages');
        const data = await res.json();
        const bodyComponent = data[0].component.find((comp: any) => comp.name === 'header').data;
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

export default Header;