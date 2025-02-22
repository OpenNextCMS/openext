// pages/index.tsx
"use client"

import Header from '../components/Header';
import Body from '../components/Body';
import Footer from '../components/Footer';

const Home: React.FC = () => {
  return (
    <>
       <div>
      <Header />
      <Body />
      <Footer />
    </div>
    </>
  );
};

export default Home;
