import { useEffect, useId, useRef } from 'react';
import { PixelIcon } from '../../components/index.js';
import HudIcon from './HudIcon.jsx';
import { CLOSE_LABEL, MENU_LABEL, NEW_TAG } from '../labels.js';

// The side panel with tabs, like the pause menu of a game. The map stays visible next to it.
// Every tab stays in the page while hidden, so what is inside keeps its state.
//
// Props:
//   id       id of the panel (the Menu button points at it)
//   label    words for screen readers, e.g. "Astronaut menu"
//   tabs     [{ id, label, sprite, badge, content }]  badge = true shows a "New" tag on the tab
//   tab      the id of the tab to show
//   open     true when the panel shows
//   onTab    (id) => show that tab
//   onClose  () => close the panel. (Escape is handled by GameHud, which knows if this screen shows.)
//   note     optional: { title, text, tone } shown above every tab, e.g. "Game paused"
//            (tone 'paused' or 'online')
export default function GameMenu({ id, label, tabs, tab, open, onTab, onClose, note = null }) {
  const baseId = useId();
  const tabButtons = useRef({});
  const selected = tabs.some((t) => t.id === tab) ? tab : tabs[0]?.id;

  // Opening the menu puts the keyboard on the open tab.
  useEffect(() => {
    if (open) tabButtons.current[selected]?.focus();
    // Only when the menu opens, not on every tab change.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  // Arrow keys move between the tabs (the usual keys for tabs).
  const onTabKey = (event) => {
    const index = tabs.findIndex((t) => t.id === selected);
    let next = null;
    if (event.key === 'ArrowDown' || event.key === 'ArrowRight') next = (index + 1) % tabs.length;
    else if (event.key === 'ArrowUp' || event.key === 'ArrowLeft') next = (index - 1 + tabs.length) % tabs.length;
    else if (event.key === 'Home') next = 0;
    else if (event.key === 'End') next = tabs.length - 1;
    if (next === null) return;
    event.preventDefault();
    event.stopPropagation();
    onTab(tabs[next].id);
    tabButtons.current[tabs[next].id]?.focus();
  };

  return (
    <div id={id} className="game-menu" role="dialog" aria-label={label} hidden={!open}>
      <div className="game-menu__side">
        <p className="game-menu__title" aria-hidden="true">
          {MENU_LABEL}
        </p>
        <div className="game-menu__tabs" role="tablist" aria-label={label} aria-orientation="vertical" onKeyDown={onTabKey}>
          {tabs.map((t) => {
            const isSelected = t.id === selected;
            return (
              <button
                key={t.id}
                ref={(element) => {
                  tabButtons.current[t.id] = element;
                }}
                type="button"
                role="tab"
                id={`${baseId}-tab-${t.id}`}
                aria-selected={isSelected}
                aria-controls={`${baseId}-panel-${t.id}`}
                tabIndex={isSelected ? 0 : -1}
                className={`game-menu__tab${isSelected ? ' is-selected' : ''}`}
                onClick={() => onTab(t.id)}
              >
                <PixelIcon name={t.sprite} size={22} />
                <span className="game-menu__tab-name">{t.label}</span>
                {t.badge && <span className="hud-badge">{NEW_TAG}</span>}
              </button>
            );
          })}
        </div>
        <button type="button" className="game-menu__close" onClick={onClose}>
          <HudIcon name="close" size={16} />
          <span>{CLOSE_LABEL}</span>
        </button>
      </div>

      <div className="game-menu__main">
        {note && (
          <div className={`game-menu__note game-menu__note--${note.tone}`} role="status">
            {note.title && <p className="game-menu__note-title">{note.title}</p>}
            <p className="game-menu__note-text">{note.text}</p>
          </div>
        )}
        {tabs.map((t) => (
          <section
            key={t.id}
            id={`${baseId}-panel-${t.id}`}
            role="tabpanel"
            aria-labelledby={`${baseId}-tab-${t.id}`}
            className={`game-menu__panel game-menu__panel--${t.id}`}
            hidden={t.id !== selected}
          >
            {t.content}
          </section>
        ))}
      </div>
    </div>
  );
}
