import { describe, expect, it } from "vitest";
import { diagnoseSentence, normaliseTyped, sentenceAccepted } from "@/lib/sentence-check";

describe("sentence-check", () => {
  const answers = [
    "Die Pflegerin hilft dem alten Patienten beim Waschen",
    "Beim Waschen hilft die Pflegerin dem alten Patienten",
  ];

  it("normalises case, spaces and final punctuation", () => {
    expect(normaliseTyped("  Die Pflegerin hilft dem alten Patienten beim Waschen.  ")).toBe(
      "die pflegerin hilft dem alten patienten beim waschen",
    );
    expect(normaliseTyped("Hallo!!!")).toBe("hallo");
  });

  it("accepts the primary answer", () => {
    expect(sentenceAccepted("Die Pflegerin hilft dem alten Patienten beim Waschen.", answers)).toBe(true);
  });

  it("accepts an alternative word order", () => {
    expect(sentenceAccepted("beim waschen hilft die pflegerin dem alten patienten", answers)).toBe(true);
  });

  it("rejects a wrong ending", () => {
    expect(sentenceAccepted("Die Pflegerin hilft dem alte Patienten beim Waschen", answers)).toBe(false);
  });

  it("highlights wrong tokens with a reason", () => {
    const marks = [{ wrong: "alte", right: "alten", reason: "alte → alten (Dativ, maskulin)" }];
    const feedback = diagnoseSentence(
      "Die Pflegerin hilft dem alte Patienten beim Waschen",
      answers[0],
      marks,
    );
    const bad = feedback.find((t) => t.kind === "bad");
    expect(bad).toMatchObject({ text: "alte", reason: "alte → alten (Dativ, maskulin)" });
  });
});
