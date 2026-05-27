import { useCallback, useEffect, useRef, useState, type DragEvent } from 'react';

import type { IconReference } from '../../core/iconify.js';
import { IconifyPreviewIcon } from '../iconRenderer.js';
import { searchPreviewIcons } from '../iconSearch.js';

interface IconSearchDropdownProps {
  query: string;
  visible: boolean;
  onLoadingChange?(loading: boolean): void;
}

const ICON_PAGE_SIZE = 72;

export function IconSearchDropdown({ query, visible, onLoadingChange }: IconSearchDropdownProps) {
  const popoverRef = useRef<HTMLDivElement>(null);
  const [results, setResults] = useState<IconReference[]>([]);
  const [visibleCount, setVisibleCount] = useState(ICON_PAGE_SIZE);

  useEffect(() => {
    let cancelled = false;

    if (!visible) {
      setResults([]);
      setVisibleCount(ICON_PAGE_SIZE);
      onLoadingChange?.(false);
      return () => {
        cancelled = true;
      };
    }

    setResults([]);
    setVisibleCount(ICON_PAGE_SIZE);
    onLoadingChange?.(true);
    const searchTimer = window.setTimeout(() => {
      void searchPreviewIcons(query).then((nextResults) => {
        if (!cancelled) {
          setResults(nextResults);
          onLoadingChange?.(false);
        }
      });
    }, 80);

    return () => {
      cancelled = true;
      window.clearTimeout(searchTimer);
    };
  }, [onLoadingChange, query, visible]);

  useEffect(() => {
    if (popoverRef.current) {
      popoverRef.current.scrollTop = 0;
    }
  }, [query]);

  const onScroll = () => {
    const popover = popoverRef.current;
    if (!popover || visibleCount >= results.length) {
      return;
    }

    const remainingScroll = popover.scrollHeight - popover.scrollTop - popover.clientHeight;
    if (remainingScroll < 360) {
      setVisibleCount((current) => Math.min(results.length, current + ICON_PAGE_SIZE));
    }
  };

  if (!visible || results.length === 0) {
    return null;
  }

  const visibleResults = results.slice(0, visibleCount);

  return (
    <div
      ref={popoverRef}
      className="global-icon-search-popover"
      role="listbox"
      aria-label="Icon search results"
      onScroll={onScroll}
    >
      {visibleResults.map((icon) => (
        <IconSearchResult key={icon.fullName} icon={icon} />
      ))}
    </div>
  );
}

function IconSearchResult({ icon }: { icon: IconReference }) {
  const buttonRef = useRef<HTMLButtonElement>(null);
  const [shouldLoad, setShouldLoad] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const element = buttonRef.current;
    if (!element) {
      return;
    }

    setIsLoading(true);
    setShouldLoad(false);

    if (typeof IntersectionObserver === 'undefined') {
      setShouldLoad(true);
      return;
    }

    const observer = new IntersectionObserver((entries) => {
      if (entries.some((entry) => entry.isIntersecting)) {
        setShouldLoad(true);
        observer.disconnect();
      }
    }, { rootMargin: '240px' });

    observer.observe(element);
    return () => observer.disconnect();
  }, [icon.fullName]);

  const onResolve = useCallback(() => {
    setIsLoading(false);
  }, []);

  const handleDragStart = (event: DragEvent<HTMLButtonElement>) => {
    event.dataTransfer.setData('application/x-cora-icon', JSON.stringify(icon));
    event.dataTransfer.effectAllowed = 'copy';
  };

  return (
    <button
      ref={buttonRef}
      type="button"
      className="global-icon-search-result"
      data-drag-format="application/x-cora-icon"
      draggable
      onDragStart={handleDragStart}
    >
      <span className={`global-icon-preview ${isLoading ? 'loading' : ''}`} aria-hidden="true">
        <span className="global-icon-spinner" />
        <svg width="80" height="80" viewBox="0 0 80 80">
          {shouldLoad ? (
            <IconifyPreviewIcon
              iconName={icon.fullName}
              x={8}
              y={8}
              size={64}
              color="currentColor"
              onResolve={onResolve}
            />
          ) : null}
        </svg>
      </span>
      <span className="global-icon-copy">
        <strong>{icon.name}</strong>
        <span>{icon.fullName}</span>
      </span>
    </button>
  );
}
