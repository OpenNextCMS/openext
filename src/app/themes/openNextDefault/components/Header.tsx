import styles from '../public/assets/css/theme.module.css';
import Link from "next/link"
import { Button } from "@/components/ui/button"

const Header = () => {
  return (
    <header className={styles.header}>
      <div className={styles.container}>
        <Link href="/" className={styles.logo}>
          <img src="/siteicon/openNext.png" alt="OpenNext Logo" className={styles.logoImage} />
        </Link>

        <div className={styles.actions}>
          <Button className={styles.button} onClick={() => window.open("https://aviraltrendzpvtltd.com/")}>Get to know us</Button>
        </div>
      </div>

    </header>
  );
};

export default Header;