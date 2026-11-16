import type { Metadata } from "next";
import { WortbankPage } from "@/components/wortbank/WortbankPage";

export const metadata: Metadata = {
  title: "Wortbank — MediDeutsch",
  description: "Look up any German word, then keep it with the words you saved from lessons.",
};

export default function Page() {
  return <WortbankPage />;
}
