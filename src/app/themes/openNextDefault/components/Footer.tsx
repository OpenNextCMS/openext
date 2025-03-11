import { useEffect, useState, JSX } from "react";
import componentData from "../public/data/footer.json";
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
  const [component, setComponent] = useState<any>(null);

  useEffect(() => {
    setComponent(componentData.structure);
  }, []);

  if (!component) return null;

  return renderElement(component);
};

export default Footer;
