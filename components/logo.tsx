/** Wortmarke im Stil von cofunction.de: das „O“ in „ON“ ist ein Schalter. */
export function Logo({ klein = false }: { klein?: boolean }) {
  const h = klein ? 18 : 24;
  return (
    <span
      className="inline-flex items-center font-display font-semibold tracking-[0.04em] text-white select-none"
      style={{ fontSize: h, lineHeight: 1 }}
      aria-label="CoFunction"
    >
      <span aria-hidden="true">COFUNCTI</span>
      <svg
        aria-hidden="true"
        width={h * 1.95}
        height={h * 0.82}
        viewBox="0 0 78 33"
        className="mx-[0.04em] -mt-[0.06em]"
        fill="none"
      >
        <rect x="3" y="3" width="72" height="27" rx="13.5" stroke="#C6CDD2" strokeWidth="5" />
        <circle cx="61.5" cy="16.5" r="13" stroke="#FFFFFF" strokeWidth="5.5" />
      </svg>
      <span aria-hidden="true">N</span>
    </span>
  );
}
