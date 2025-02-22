import { useState, useEffect } from 'react';
import styles from '../public/assets/css/footer.module.css';

const Footer = () => {
  const [theme, setTheme] = useState<'light' | 'dark' | 'system'>('system');

  useEffect(() => {
    const savedTheme = localStorage.getItem('theme') as 'light' | 'dark' | null;
    if (savedTheme) {
      setTheme(savedTheme);
      document.body.setAttribute('data-theme', savedTheme);
    }
  }, []);

  const handleThemeChange = (newTheme: 'light' | 'dark' | 'system') => {
    if (newTheme === 'system') {
      document.body.removeAttribute('data-theme');
      localStorage.removeItem('theme');
    } else {
      document.body.setAttribute('data-theme', newTheme);
      localStorage.setItem('theme', newTheme);
    }
    setTheme(newTheme);
  };

  return (
    <footer className={styles.footer}>
      <div className={styles.footerHeader}>
        <img src="/vercel-favicon.ico" alt="Vercel Logo" className={styles.vercelLogo} />
        <h1>Vercel</h1>
      </div>
      
      <div className={styles.footerGrid}>
        <div className={styles.footerColumn}>
          <h3>Resources</h3>
          <ul className={styles.footerLinks}>
            <li><a href="#">Docs</a></li>
            <li><a href="#">Learn</a></li>
            <li><a href="#">Showcase</a></li>
            <li><a href="#">Blog</a></li>
            <li><a href="#">Team</a></li>
            <li><a href="#">Analytics</a></li>
            <li><a href="#">Next.js Conf</a></li>
            <li><a href="#">Previews</a></li>
          </ul>
        </div>

        <div className={styles.footerColumn}>
          <h3>More</h3>
          <ul className={styles.footerLinks}>
            <li><a href="#">Next.js Commerce</a></li>
            <li><a href="#">Contact Sales</a></li>
            <li><a href="#">GitHub</a></li>
            <li><a href="#">Releases</a></li>
            <li><a href="#">Telemetry</a></li>
            <li><a href="#">Governance</a></li>
          </ul>
        </div>

        <div className={styles.footerColumn}>
          <h3>About Vercel</h3>
          <ul className={styles.footerLinks}>
            <li><a href="#">Next.js + Vercel</a></li>
            <li><a href="#">Open Source Software</a></li>
            <li><a href="#">GitHub</a></li>
            <li><a href="#">Bluesky</a></li>
            <li><a href="#">X</a></li>
          </ul>
        </div>

        <div className={styles.footerColumn}>
          <h3>Legal</h3>
          <ul className={styles.footerLinks}>
            <li><a href="#">Privacy Policy</a></li>
          </ul>
        </div>

        <div className={styles.footerColumn}>
          <h3>Subscribe to our newsletter</h3>
          <div className={styles.newsletter}>
            <p>Stay updated on new releases and features, guides, and case studies.</p>
            <form className={styles.subscribeForm}>
              <input type="email" placeholder="you@domain.com" />
              <button type="submit">Subscribe</button>
            </form>
          </div>
        </div>
      </div>

      <div className={styles.footerBottom}>
        <div className={styles.copyright}>© 2025 Vercel, Inc.</div>
        <div className={styles.themeControls}>
          <button 
            className={styles.themeSwitch} 
            onClick={() => handleThemeChange('light')} 
            title="Light Mode"
          >
            ☀
          </button>
          <button 
            className={styles.themeSwitch} 
            onClick={() => handleThemeChange('dark')} 
            title="Dark Mode"
          >
            ☾
          </button>
          <button 
            className={styles.themeSwitch} 
            onClick={() => handleThemeChange('system')} 
            title="System Mode"
          >
            💻
          </button>
        </div>
      </div>
    </footer>
  );
};

export default Footer;