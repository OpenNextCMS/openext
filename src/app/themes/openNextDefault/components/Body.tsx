import React from 'react';
import styles from '../public/assets/css/body.module.css';
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { ArrowUpRight, Atom, Zap, RefreshCw } from "lucide-react"


const LandingPage = () => {
  return (
    <main className={styles.main}>
      {/* Hero Section */}
      <section className={styles.heroSection}>
        <div className={styles.container}>
          <div className={styles.heroContent}>
            <h1 className={styles.heroTitle}>
              The React Framework for the Web
            </h1>
            <p className={styles.heroSubtitle}>
              Used by some of the world's largest companies, Next.js enables you to create
              <span className={styles.highlight}> high-quality web applications </span>
              with the power of React components.
            </p>
            <div className={styles.buttonGroup}>
              <Button size="lg" className={styles.button}>
                Get Started
              </Button>
              <Button size="lg" variant="outline" className={styles.button}>
                Get in Touch
              </Button>
            </div>
          </div>
        </div>
      </section>

       {/* Features Section */}
      <section className={styles.featuresSection}>
        <div className={styles.container}>
          <div className={styles.featuresGrid}>
            <Card className={styles.card}>
              <CardHeader className={styles.cardHeader}>
                <div className={styles.iconContainer}>
                  <Atom className={styles.icon} />
                </div>
                <CardTitle className={styles.cardTitle}>
                  React
                  <ArrowUpRight className={styles.arrowIcon} />
                </CardTitle>
              </CardHeader>
              <CardContent>
                <CardDescription className={styles.cardDescription}>
                  The library for web and native user interfaces. Next.js is built on the latest React features,
                  including Server Components and Actions.
                </CardDescription>
              </CardContent>
            </Card>

            <Card className={styles.card}>
              <CardHeader className={styles.cardHeader}>
                <div className={styles.iconContainer}>
                  <Zap className={styles.icon} />
                </div>
                <CardTitle className={styles.cardTitle}>
                  Turbopack
                  <ArrowUpRight className={styles.arrowIcon} />
                </CardTitle>
              </CardHeader>
              <CardContent>
                <CardDescription className={styles.cardDescription}>
                  An incremental bundler optimized for JavaScript and TypeScript, written in Rust, and built into
                  Next.js.
                </CardDescription>
              </CardContent>
            </Card>

            <Card className={styles.card}>
              <CardHeader className={styles.cardHeader}>
                <div className={styles.iconContainer}>
                  <RefreshCw className={styles.icon} />
                </div>
                <CardTitle className={styles.cardTitle}>
                  Speedy Web Compiler
                  <ArrowUpRight className={styles.arrowIcon} />
                </CardTitle>
              </CardHeader>
              <CardContent>
                <CardDescription className={styles.cardDescription}>
                  An extensible Rust-based platform for the next generation of fast developer tools, and can be used for
                  both compilation and minification.
                </CardDescription>
              </CardContent>
            </Card>
          </div>
        </div>
      </section>
    </main>
  );
};

export default LandingPage;