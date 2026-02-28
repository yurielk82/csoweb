export default function NarrowLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="max-w-3xl mx-auto w-full">
      {children}
    </div>
  );
}
