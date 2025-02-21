// 'use client';

// import { useEffect } from 'react';
// import { useRouter } from 'next/navigation';
// // import HelloWorldPage from './hello-world/page';

// export default function Home() {
//   const router = useRouter();

//   useEffect(() => {
//     const isRegistration = process.env.isRegistration === 'true';
//     const dbConnection = process.env.dbConnection === 'true';

//     if (isRegistration && dbConnection) {
//       router.push('/');
//     }
//     else{
//       router.push('/language');
//     }
//   }, [router]);

//   return (
//     // <HelloWorldPage />
//     <h1>Hello World</h1>
//   );
// }

'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';

export default function Home() {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const checkTheme = async () => {
      try {
        // You can create an API route to check if the theme exists
        const response = await fetch('/themes/my-demo-theme/layouts');
        if (response.ok) {
          router.push('/themes/my-demo-theme/layouts');
        } else {
          setIsLoading(false); // Show the default content
        }
      } catch {
        setIsLoading(false); // Show the default content
      }
    };

    checkTheme();
  }, [router]);

  if (isLoading) {
    return <div>Loading...</div>;
  }

  return (
    <main>
      <h1>Hello World</h1>
    </main>
  );
}