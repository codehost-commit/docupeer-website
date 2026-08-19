import type { Metadata } from "next";
import { StatusManage } from "./status-manage";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Manage Status",
  robots: {
    index: false,
    follow: false,
  },
};

export default function StatusManagePage() {
  return <StatusManage />;
}
