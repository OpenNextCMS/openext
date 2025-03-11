import { useEffect, useState, JSX } from "react";
import componentData from "../public/data/header.json";
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
  const [component, setComponent] = useState<any>(null);

  useEffect(() => {
    setComponent(componentData);
  }, []);

  if (!component) return null;

  return renderElement(component);
};

export default Header;