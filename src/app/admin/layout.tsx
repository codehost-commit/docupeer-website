export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <>
      <style>{`.site-nav,.site-footer{display:none!important}`}</style>
      {children}
    </>
  );
}
