import React, { useEffect, useState } from 'react';

/**
 * Minimal history-API router. Routes:
 *   /                 model library
 *   /models/:id       simulation workspace
 *   /learn            lessons
 *   /learn/:id        one lesson
 *   /challenges       challenges
 *   /challenges/:id   one challenge
 * The backend serves index.html for unknown paths, so deep links work in production.
 */
export type Route =
  | { name: 'library' }
  | { name: 'model'; id: string }
  | { name: 'learn' }
  | { name: 'lesson'; id: string }
  | { name: 'challenges' }
  | { name: 'challenge'; id: string }
  | { name: 'not_found'; path: string };

export function parseRoute(pathname: string): Route {
  const path = pathname.replace(/\/+$/, '') || '/';
  if (path === '/' || path === '/app') return { name: 'library' };
  const match = path.match(/^\/models\/([a-z_]+)$/);
  if (match) return { name: 'model', id: match[1] };
  if (path === '/learn') return { name: 'learn' };
  if (path === '/challenges') return { name: 'challenges' };
  const lesson = path.match(/^\/learn\/([a-z0-9-]+)$/);
  if (lesson) return { name: 'lesson', id: lesson[1] };
  const challenge = path.match(/^\/challenges\/([a-z0-9-]+)$/);
  if (challenge) return { name: 'challenge', id: challenge[1] };
  return { name: 'not_found', path };
}

const NAVIGATE_EVENT = 'app:navigate';

export function navigate(to: string) {
  if (to === window.location.pathname) return;
  window.history.pushState(null, '', to);
  window.dispatchEvent(new Event(NAVIGATE_EVENT));
}

export function useRoute(): Route {
  const [route, setRoute] = useState(() => parseRoute(window.location.pathname));
  useEffect(() => {
    const update = () => setRoute(parseRoute(window.location.pathname));
    window.addEventListener('popstate', update);
    window.addEventListener(NAVIGATE_EVENT, update);
    return () => {
      window.removeEventListener('popstate', update);
      window.removeEventListener(NAVIGATE_EVENT, update);
    };
  }, []);
  return route;
}

type LinkProps = React.AnchorHTMLAttributes<HTMLAnchorElement> & { to: string };

export const Link: React.FC<LinkProps> = ({ to, onClick, ...rest }) => (
  <a
    href={to}
    onClick={(event) => {
      onClick?.(event);
      const modified = event.metaKey || event.ctrlKey || event.shiftKey || event.altKey || event.button !== 0;
      if (event.defaultPrevented || modified || rest.target) return;
      event.preventDefault();
      navigate(to);
    }}
    {...rest}
  />
);
