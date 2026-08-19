export default function StatusManageLayout({
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
