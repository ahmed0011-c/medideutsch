import { illustrationMarkup } from "@/components/illustrations/sprites";

export function Illustration({
  id,
  className,
}: {
  id: string;
  className?: string;
}) {
  const svg = illustrationMarkup(id);
  if (!svg) return null;
  return (
    <span className={className ? `sprite ${className}` : "sprite"} dangerouslySetInnerHTML={{ __html: svg }} />
  );
}

export function BrandMark({ wordmark = true }: { wordmark?: boolean }) {
  return (
    <span className="brand">
      <Illustration id="logo" />
      {wordmark ? (
        <span>
          Medi<b>Deutsch</b>
        </span>
      ) : null}
    </span>
  );
}
