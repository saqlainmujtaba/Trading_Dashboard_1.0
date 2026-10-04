import './globals.css';

export const metadata = {
  title: 'Trading Dashboard',
  description: 'Personal trading dashboard',
  icons: {
    icon: '/favicon.svg',
  },
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
