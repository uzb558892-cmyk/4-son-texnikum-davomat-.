const PATHS: Record<string, string> = {
  home: 'M3 11l9-8 9 8M5 10v10h5v-6h4v6h5V10',
  groups: 'M3 20v-1a5 5 0 015-5h2a5 5 0 015 5v1M9 10a4 4 0 100-8 4 4 0 000 8zM17 4a4 4 0 010 7M21 20v-1a5 5 0 00-3-4.6',
  student: 'M12 3L2 8l10 5 10-5-10-5zM6 10.5V16c0 1.5 2.7 3 6 3s6-1.500 6-3v-5.500',
  check: 'M4 12l5 5L20 6',
  alert: 'M12 3l10 18H2L12 3zM12 10v5M12 18h.01',
  report: 'M5 3h14v18H5zM9 8h6M9 12h6M9 16h4',
  users: 'M12 12a4 4 0 100-8 4 4 0 000 8zM4 21a8 8 0 0116 0',
  settings: 'M12 15a3 3 0 100-6 3 3 0 000 6zM19 12a7 7 0 00-.1-1.200l2-1.500-2-3.400-2.300.9a7 7 0 00-2-1.200L14.300 3h-4l-.4 2.600a7 7 0 00-2 1.200l-2.300-.9-2 3.400 2 1.500A7 7 0 005 12c0 .4 0 .8.1 1.200l-2 1.500 2 3.400 2.300-.9a7 7 0 002 1.200l.4 2.600h4l.4-2.600a7 7 0 002-1.200l2.300.9 2-3.400-2-1.500c.1-.4.1-.8.1-1.200z',
  menu: 'M4 6h16M4 12h16M4 18h16',
  logout: 'M9 4H5v16h4M16 8l4 4-4 4M20 12H9'
};

export default function Icon({ name, className = 'h-5 w-5' }: { name: keyof typeof PATHS | string; className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <path d={PATHS[name] ?? ''} />
    </svg>
  );
}
