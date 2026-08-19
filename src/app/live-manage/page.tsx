import type { Metadata } from "next";
import { LiveManage } from "./live-manage";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Manage Live",
  robots: {
    index: false,
    follow: false,
  },
};

export default function LiveManagePage() {
  return <LiveManage />;
}
