import { highlight, tokenize } from "@/lib/search";

export function Highlight({ text, query }: { text: string; query: string }) {
  return (
    <>
      {highlight(text, tokenize(query)).map((part, i) =>
        part.hit ? (
          <mark key={i} className="rounded-sm bg-accent px-0.5 text-ink">{part.text}</mark>
        ) : (
          <span key={i}>{part.text}</span>
        ),
      )}
    </>
  );
}
