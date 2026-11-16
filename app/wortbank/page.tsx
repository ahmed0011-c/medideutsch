import type { Metadata } from "next";
import { WortbankPage } from "@/components/wortbank/WortbankPage";

export const metadata: Metadata = {
  title: "Wortbank — MediDeutsch",
  description: "Words you saved from lessons and from Look up, grouped by where they came from.",
};

export default function Page() {
  return <WortbankPage />;
}
