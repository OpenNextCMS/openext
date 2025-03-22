import { useEffect, useState, JSX } from 'react';
import styles from '../public/assets/css/theme.module.css';

interface ElementAttributes {
  id?: string;
  [key: string]: string | undefined;
}

interface ElementNode {
  tag: string;
  attributes?: ElementAttributes;
  className?: string;
  children?: ElementNode[];
  text?: string;
  onClick?: string;
}

const renderElement = (element: ElementNode) => {
  const { tag, className, attributes = {}, children, text, onClick } = element;
  const Element = tag as keyof JSX.IntrinsicElements;

  const handleClick = () => {
    if (onClick === 'openExternalLink') {
      window.open('https://aviraltrendzpvtltd.com/');
    }
  };

  const voidElements = [
    'area',
    'base',
    'br',
    'col',
    'embed',
    'hr',
    'img',
    'input',
    'link',
    'meta',
    'param',
    'source',
    'track',
    'wbr',
  ];
  if (voidElements.includes(tag)) {
    return (
      <Element
        key={tag}
        {...attributes}
        className={className ? styles[className] || className : undefined}
      />
    );
  }

  return (
    <Element
      key={tag}
      {...attributes}
      className={className ? styles[className] || className : undefined}
      onClick={onClick ? handleClick : undefined}
    >
      {text}
      {children && children.map((child: ElementNode) => renderElement(child))}
    </Element>
  );
};

const backendUrl = process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:3000';

const Header = () => {
  const [pageData, setPageData] = useState<ElementNode | null>(null);

  useEffect(() => {
    const fetchPageData = async () => {
      try {
        const res = await fetch(`${backendUrl}/api/pages/get-pages`);
        const data = await res.json();
        const bodyComponent = data[0].component.find(
          (comp: { name: string }) => comp.name === 'header'
        ).data;
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
