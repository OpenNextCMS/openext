import React, { useEffect } from 'react';
import styles from '../public/assets/css/body.module.css';

const LandingPage = () => {
  useEffect(() => {
    const createBeams = () => {
      const lines = document.querySelectorAll(`.${styles.line}`);
      
      lines.forEach((line, index) => {
        setInterval(() => {
          const beam = document.createElement('div');
          beam.className = styles.beam;
          line.appendChild(beam);
          
          beam.addEventListener('animationend', () => {
            beam.remove();
          });
        }, 3000 + (index * 1000));
      });
    };

    createBeams();
  }, []);

  return (
    <main className={styles.main}>
      {/* Hero Section */}
      <section className={styles.heroSection}>
        <div className={styles.container}>
          <h1 className={styles.heroTitle}>
            The React Framework for the Web
          </h1>
          
          <p className={styles.heroDescription}>
            Used by some of the world's largest companies, Next.js enables you to create 
            <span className={styles.highlight}> high-quality web applications </span> 
            with the power of React components.
          </p>

          <div className={styles.buttonsContainer}>
            <button className={`${styles.btn} ${styles.btnPrimary}`}>Get Started</button>
            <button className={`${styles.btn} ${styles.btnSecondary}`}>Learn Next.js</button>
          </div>
        </div>
      </section>

      {/* Powered By Section */}
      <section className={styles.poweredBySection}>
        <h2 className={styles.sectionTitle}>
          Built on a foundation of fast, production-grade tooling
        </h2>

        <div className={styles.poweredBy}>
          <div className={styles.poweredByText}>Powered By</div>
        </div>

        <div className={styles.connectionLines}>
          <div className={styles.leftLine}>
            <div className={styles.beam}></div>
          </div>
          <div className={styles.middleLine}>
            <div className={styles.beam}></div>
          </div>
          <div className={styles.rightLine}>
            <div className={styles.beam}></div>
          </div>
        </div>

        <div className={styles.cardsContainer}>
          <div className={styles.card}>
            <div className={`${styles.cardIcon} ${styles.reactIcon}`}>⚛️</div>
            <h3 className={styles.cardTitle}>
              React
              <span className={styles.arrow}>↗</span>
            </h3>
            <p className={styles.cardDescription}>
              The library for web and native user interfaces. Next.js is built on the latest React features, including Server Components and Actions.
            </p>
          </div>

          <div className={styles.card}>
            <div className={`${styles.cardIcon} ${styles.turbopackIcon}`}>⚡</div>
            <h3 className={styles.cardTitle}>
              Turbopack
              <span className={styles.arrow}>↗</span>
            </h3>
            <p className={styles.cardDescription}>
              An incremental bundler optimized for JavaScript and TypeScript, written in Rust, and built into Next.js.
            </p>
          </div>

          <div className={styles.card}>
            <div className={`${styles.cardIcon} ${styles.swcIcon}`}>🔄</div>
            <h3 className={styles.cardTitle}>
              Speedy Web Compiler
              <span className={styles.arrow}>↗</span>
            </h3>
            <p className={styles.cardDescription}>
              An extensible Rust based platform for the next generation of fast developer tools, and can be used for both compilation and minification.
            </p>
          </div>
        </div>
      </section>
    </main>
  );
};

export default LandingPage;