import styles from '../public/assets/css/footer.module.css';

const Footer = () => {

  return (
    <footer className={styles.footer}>
      <div className={styles.container}>
        <p className={styles.text}>
          © 2025 Vercel, Inc. All rights reserved.
        </p>
      </div>
    </footer>
  );
};

export default Footer;