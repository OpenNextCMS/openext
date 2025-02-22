import { useState } from 'react';
import Link from 'next/link';
import styles from '../public/assets/css/theme.module.css';

const Header = () => {
  const [isMenuOpen, setIsMenuOpen] = useState(false);

  const toggleMenu = () => {
    setIsMenuOpen(!isMenuOpen);
  };

  return (
    <header className={styles.header}>
      <Link href="/" className={styles.logo}>
        <span>▲</span>
        NEXT.js
      </Link>

      <button className={styles.menuToggle} onClick={toggleMenu}>
        ☰
      </button>

      <nav className={`${styles.navLinks} ${isMenuOpen ? styles.active : ''}`}>
        <Link href="/showcase">Showcase</Link>
        <Link href="/docs">Docs</Link>
        <Link href="/blog">Blog</Link>
        <Link href="/templates">Templates</Link>
        <Link href="/enterprise">Enterprise</Link>
        <div className={styles.actionButtons}>
          <button className={styles.deployBtn}>Deploy</button>
          <button className={styles.learnBtn}>Learn</button>
        </div>
      </nav>

      <div className={styles.rightSection}>
        <div className={styles.searchBox}>
          <input type="text" placeholder="Search documentation..." />
          <span>Ctrl K</span>
        </div>

        <div className={styles.actionButtons}>
          <button className={styles.deployBtn}>Deploy</button>
          <button className={styles.learnBtn}>Learn</button>
        </div>
      </div>
    </header>
  );
};

export default Header;