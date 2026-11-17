import type { Metadata } from "next";
import { FlashcardsScreen } from "@/components/wortbank/Flashcards";

export const metadata: Metadata = {
  title: "Flashcards — MediDeutsch",
  description: "Practise every word saved in your Wortbank. Rate each card Easy, Medium, or Hard.",
};

export default function Page() {
  return <FlashcardsScreen />;
}
