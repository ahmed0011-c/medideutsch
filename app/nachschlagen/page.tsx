import type { Metadata } from "next";
import { LookupPage } from "@/components/lookup/LookupPage";

export const metadata: Metadata = {
  title: "Look up — MediDeutsch",
  description:
    "Look up any German word: English meaning, article, plural, and verb forms, then save it to your Wortbank.",
};

export default function Page() {
  return <LookupPage />;
}
