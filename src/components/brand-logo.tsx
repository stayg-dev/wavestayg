export function BrandLogo({ white = false }: { white?: boolean }) {
  return (
    <svg
      className={`brand-logo${white ? " brand-logo-white" : ""}`}
      viewBox="0 0 189 104"
      width="189"
      height="104"
      role="img"
      aria-label="WAVE STAY-G"
    >
      {/* Use the clean, transparent color artwork from the original sprites. */}
      <svg x="58" y="0" width="73" height="73" viewBox="100 20 800 780" overflow="hidden">
        <image href="/assets/home-imgImage3.png" width="1944" height="809" />
      </svg>
      <svg x="0" y="78" width="189" height="26" viewBox="80 60 2010 250" overflow="hidden">
        <image href="/assets/home-imgImage4.png" width="2172" height="724" />
      </svg>
    </svg>
  );
}
