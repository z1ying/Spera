import { REFERENCES } from "@/lib/references";

/** Inline citation marker, e.g. 39.1% [1] (design doc §18). */
export function Cite({ n }: { n: number | null }) {
  if (n === null) return null;
  return (
    <sup className="ml-0.5 text-[0.7em] text-slate-500">
      <a href={`#ref-${n}`} className="hover:underline" title={REFERENCES[n]?.text}>
        [{n}]
      </a>
    </sup>
  );
}

export function References({ numbers }: { numbers: number[] }) {
  return (
    <ol className="space-y-1 text-xs text-slate-600">
      {numbers.map((n) => (
        <li key={n} id={`ref-${n}`}>
          [{n}] {REFERENCES[n].text}{" "}
          <a href={REFERENCES[n].url} className="break-all underline print:no-underline">
            {REFERENCES[n].url}
          </a>
        </li>
      ))}
    </ol>
  );
}
