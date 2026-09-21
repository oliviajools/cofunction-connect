import type { SVGProps } from "react";

type P = SVGProps<SVGSVGElement> & { groesse?: number };

function Basis({ groesse = 20, children, ...rest }: P & { children: React.ReactNode }) {
  return (
    <svg
      width={groesse}
      height={groesse}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.6}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      {...rest}
    >
      {children}
    </svg>
  );
}

export const IconMikro = (p: P) => (
  <Basis {...p}>
    <rect x="9" y="3" width="6" height="11" rx="3" />
    <path d="M5 11a7 7 0 0 0 14 0M12 18v3" />
  </Basis>
);
export const IconMeeting = (p: P) => (
  <Basis {...p}>
    <circle cx="9" cy="8" r="3" />
    <path d="M3 20a6 6 0 0 1 12 0" />
    <circle cx="17" cy="9" r="2.5" />
    <path d="M15.5 14.5A5 5 0 0 1 21 19" />
  </Basis>
);
export const IconMail = (p: P) => (
  <Basis {...p}>
    <rect x="3" y="5" width="18" height="14" rx="2" />
    <path d="m3 7 9 6 9-6" />
  </Basis>
);
export const IconDatei = (p: P) => (
  <Basis {...p}>
    <path d="M6 3h8l4 4v14H6z" />
    <path d="M14 3v4h4" />
  </Basis>
);
export const IconText = (p: P) => (
  <Basis {...p}>
    <path d="M4 20h4L19 9l-4-4L4 16z" />
  </Basis>
);
export const IconBaustein = (p: P) => (
  <Basis {...p}>
    <rect x="4" y="4" width="16" height="16" rx="3" />
    <path d="M8 9h8M8 13h5" />
  </Basis>
);
export const IconIdee = (p: P) => (
  <Basis {...p}>
    <path d="M9 18h6M10 21h4" />
    <path d="M12 3a6 6 0 0 0-3.5 10.9c.6.5 1 1.2 1 2.1h5c0-.9.4-1.6 1-2.1A6 6 0 0 0 12 3z" />
  </Basis>
);
export const IconEingang = (p: P) => (
  <Basis {...p}>
    <path d="M3 13h5l2 3h4l2-3h5" />
    <path d="M5 5h14l2 8v6H3v-6z" />
  </Basis>
);
export const IconUebersicht = (p: P) => (
  <Basis {...p}>
    <rect x="3" y="3" width="7" height="7" rx="1.5" />
    <rect x="14" y="3" width="7" height="7" rx="1.5" />
    <rect x="3" y="14" width="7" height="7" rx="1.5" />
    <rect x="14" y="14" width="7" height="7" rx="1.5" />
  </Basis>
);
export const IconOrdner = (p: P) => (
  <Basis {...p}>
    <path d="M3 7a2 2 0 0 1 2-2h4l2 2h8a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
  </Basis>
);
export const IconSuche = (p: P) => (
  <Basis {...p}>
    <circle cx="11" cy="11" r="7" />
    <path d="m20 20-3.5-3.5" />
  </Basis>
);
export const IconRegeln = (p: P) => (
  <Basis {...p}>
    <path d="M4 6h10M4 12h4M12 12h8M4 18h12" />
    <circle cx="16" cy="6" r="2" />
    <circle cx="10" cy="12" r="2" />
    <circle cx="18" cy="18" r="2" />
  </Basis>
);

export const IconMindmap = (p: P) => (
  <Basis {...p}>
    <circle cx="12" cy="5" r="2.5" />
    <circle cx="5" cy="12" r="2.5" />
    <circle cx="19" cy="12" r="2.5" />
    <circle cx="12" cy="19" r="2.5" />
    <path d="M11 7 7 10M13 7 17 10M7 14l4 3m6-3-4 3" />
  </Basis>
);
export const IconPlus = (p: P) => (
  <Basis {...p}>
    <path d="M12 5v14M5 12h14" />
  </Basis>
);
export const IconHaken = (p: P) => (
  <Basis {...p}>
    <path d="m5 12 5 5 9-10" />
  </Basis>
);
export const IconX = (p: P) => (
  <Basis {...p}>
    <path d="M6 6l12 12M18 6 6 18" />
  </Basis>
);
export const IconPfeil = (p: P) => (
  <Basis {...p}>
    <path d="M5 12h14M13 6l6 6-6 6" />
  </Basis>
);
export const IconZurueck = (p: P) => (
  <Basis {...p}>
    <path d="M19 12H5M11 6l-6 6 6 6" />
  </Basis>
);
export const IconLink = (p: P) => (
  <Basis {...p}>
    <path d="M10 14a4 4 0 0 0 5.7 0l3-3a4 4 0 0 0-5.7-5.7l-1 1" />
    <path d="M14 10a4 4 0 0 0-5.7 0l-3 3a4 4 0 0 0 5.7 5.7l1-1" />
  </Basis>
);
export const IconMuell = (p: P) => (
  <Basis {...p}>
    <path d="M4 7h16M10 11v6M14 11v6M6 7l1 13h10l1-13M9 7V4h6v3" />
  </Basis>
);
export const IconSchloss = (p: P) => (
  <Basis {...p}>
    <rect x="5" y="11" width="14" height="10" rx="2" />
    <path d="M8 11V8a4 4 0 0 1 8 0v3" />
  </Basis>
);
export const IconWiederholen = (p: P) => (
  <Basis {...p}>
    <path d="M4 12a8 8 0 0 1 14-5.3L20 9M20 4v5h-5M20 12a8 8 0 0 1-14 5.3L4 15M4 20v-5h5" />
  </Basis>
);
export const IconExport = (p: P) => (
  <Basis {...p}>
    <path d="M12 3v12M7 10l5 5 5-5M5 21h14" />
  </Basis>
);
export const IconMenue = (p: P) => (
  <Basis {...p}>
    <path d="M4 7h16M4 12h16M4 17h16" />
  </Basis>
);

export const ART_ICON = {
  sprache: IconMikro,
  meeting: IconMeeting,
  mail: IconMail,
  datei: IconDatei,
  text: IconText,
  baustein: IconBaustein,
  idee: IconIdee,
} as const;
