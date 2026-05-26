import { useEffect, useMemo, useRef, useState, type DragEvent, type RefObject } from 'react';

import type { IconCatalogEntry } from '../../renderer/iconPacks/types.js';
import { filterItems } from '../library/filterLibrary.js';
import { useIconCatalog } from '../library/useIconCatalog.js';

const RESULT_TILE_WIDTH = 112;
const RESULT_TILE_HEIGHT = 108;
const RESULT_LIMIT_FALLBACK = 60;
const MIN_QUERY_LENGTH = 1;

interface IconSearchDropdownProps {
  query: string;
  onQueryChange(query: string): void;
  onPick(entry: Pick<IconCatalogEntry, 'provider' | 'service'>): void;
  inputRef?: RefObject<HTMLInputElement | null>;
}

export function IconSearchDropdown({ query, onQueryChange, onPick, inputRef }: IconSearchDropdownProps) {
  const { catalog, error } = useIconCatalog();
  const rootRef = useRef<HTMLDivElement>(null);
  const [isOpen, setIsOpen] = useState(false);
  const [resultLimit, setResultLimit] = useState(RESULT_LIMIT_FALLBACK);

  useEffect(() => {
    const updateLimit = () => {
      const columns = Math.max(2, Math.floor((window.innerWidth - 32) / RESULT_TILE_WIDTH));
      const availableHeight = Math.min(window.innerHeight * 0.56, window.innerHeight - 220);
      const rows = Math.max(2, Math.floor(availableHeight / RESULT_TILE_HEIGHT));
      setResultLimit(columns * rows);
    };
    updateLimit();
    window.addEventListener('resize', updateLimit);
    return () => window.removeEventListener('resize', updateLimit);
  }, []);

  const results = useMemo(() => {
    if (!catalog || query.trim().length < MIN_QUERY_LENGTH) {
      return [] as IconCatalogEntry[];
    }
    return filterItems(catalog.entries, query).slice(0, resultLimit);
  }, [catalog, query, resultLimit]);

  const showPanel = isOpen && query.trim().length >= MIN_QUERY_LENGTH;

  useEffect(() => {
    const onPointerDown = (event: MouseEvent) => {
      if (!rootRef.current?.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', onPointerDown);
    return () => document.removeEventListener('mousedown', onPointerDown);
  }, []);

  useEffect(() => {
    if (!isOpen) {
      return;
    }
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setIsOpen(false);
      }
    };
    document.addEventListener('keydown', onKeyDown);
    return () => document.removeEventListener('keydown', onKeyDown);
  }, [isOpen]);

  const onDragStart = (event: DragEvent, entry: IconCatalogEntry) => {
    event.dataTransfer.setData(
      'application/x-cora-icon',
      JSON.stringify({ provider: entry.provider, service: entry.service }),
    );
    event.dataTransfer.effectAllowed = 'copy';
    requestAnimationFrame(() => setIsOpen(false));
  };

  return (
    <div className="icon-search-anchor" ref={rootRef}>
      <label className="preview-search">
        <span className="material-symbols-outlined" aria-hidden="true">
          search
        </span>
        <input
          ref={inputRef}
          type="search"
          value={query}
          placeholder="Search icons…"
          aria-expanded={showPanel}
          aria-controls="icon-search-results"
          aria-autocomplete="list"
          onFocus={() => setIsOpen(true)}
          onChange={(event) => {
            onQueryChange(event.currentTarget.value);
            setIsOpen(true);
          }}
          onKeyDown={(event) => {
            if (event.key === 'Escape') {
              setIsOpen(false);
            }
          }}
        />
      </label>
      {showPanel ? (
        <div id="icon-search-results" className="icon-search-dropdown" role="listbox">
          {error ? <p className="catalog-empty">{error}</p> : null}
          {!error && !catalog ? <p className="catalog-empty">Loading icons…</p> : null}
          {catalog && results.length === 0 ? (
            <p className="catalog-empty">No matching icons.</p>
          ) : null}
          <div className="icon-search-grid">
            {results.map((entry) => (
              <button
                key={`${entry.provider}:${entry.service}`}
                type="button"
                role="option"
                className="icon-search-option"
                draggable
                onDragStart={(event) => onDragStart(event, entry)}
                onClick={() => {
                  onPick({ provider: entry.provider, service: entry.service });
                  setIsOpen(false);
                }}
              >
                <img
                  src={`/icon-packs/${entry.provider}/icons/${entry.service}.svg`}
                  alt=""
                  className="icon-search-option-thumb"
                  loading="lazy"
                />
                <span className="icon-search-option-copy">
                  <strong>{entry.label ?? entry.service}</strong>
                  <span>
                    {entry.packLabel} · {entry.service}
                  </span>
                </span>
              </button>
            ))}
          </div>
        </div>
      ) : null}
    </div>
  );
}
