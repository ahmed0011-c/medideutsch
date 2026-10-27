import type { Metadata } from "next";
import { WortbankPage } from "@/components/wortbank/WortbankPage";

export const metadata: Metadata = {
  title: "Wortbank — MediDeutsch",
  description: "Words you saved from grammar lessons and hospital comics, grouped by lesson.",
};

export default function Page() {
  return <WortbankPage />;
}
