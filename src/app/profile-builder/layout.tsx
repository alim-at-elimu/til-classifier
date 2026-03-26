import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Elimu-Soko Innovator Profile Builder',
  description: 'Build structured innovator profiles from proposal documents',
};

export default function ProfileBuilderLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="profile-builder" style={{ colorScheme: 'light' }}>
      {children}
    </div>
  );
}
