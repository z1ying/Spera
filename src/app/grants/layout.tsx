import GrantTabs from "./GrantTabs";

export default function GrantsLayout({ children }: { children: React.ReactNode }) {
  return (
    <main className="mx-auto max-w-5xl px-6 py-8">
      <GrantTabs />
      <div className="mt-8">{children}</div>
    </main>
  );
}
