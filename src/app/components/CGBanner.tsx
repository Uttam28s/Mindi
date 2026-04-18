import { useEffect } from 'react';
import { CG } from '../utils/crazygames';

interface CGBannerProps {
  id: string;
  className?: string;
  style?: React.CSSProperties;
}

/**
 * Renders a CrazyGames responsive banner inside a div.
 * Requests the banner on mount, clears it on unmount.
 * Renders nothing (zero-height) when not on CrazyGames.
 */
export function CGBanner({ id, className, style }: CGBannerProps) {
  useEffect(() => {
    CG.requestResponsiveBanner(id);
    return () => { CG.clearBanner(id); };
  }, [id]);

  return (
    <div
      id={id}
      className={className}
      style={{ minHeight: 0, ...style }}
    />
  );
}
