import { useEffect, useId, useRef } from 'react';
import GameMenu from './GameMenu.jsx';
import RotateCard from './RotateCard.jsx';
import HudIcon from './HudIcon.jsx';
import { tryLandscape, useLandscape } from './landscape.js';
import { useMediaQuery } from './useMediaQuery.js';
import { MENU_LABEL } from '../labels.js';
import './hud.css';

// One player's full-screen game, held sideways, like a game console:
//   - the walkable map fills the whole screen
//   - a slim bar on top: where you are, the turn, (the mission clock), sound, read-aloud,
//     the switch button (one device only) and the Menu button
//   - pop-ups appear over the map on their own and fold away (new message, radiation hit, level end)
//   - everything else lives in the Menu: a side panel with tabs
// It only lays things out. The screens decide what goes in, and the engine decides the game.
//
// Props:
//   label         words for screen readers: whose screen this is, e.g. "Astronaut's screen"
//   active        false while hidden on one device: Escape and full screen leave it alone
//   title, turn   the words in the top bar, e.g. "Moon base", "Turn 4 of 6"
//   clock         the signal clock (MissionClock), shown small in the top bar
//   tools         the Sound and Read to me buttons. On a phone held sideways the bar has no room
//                 for them next to the clock, so they sit at the top of the open menu instead.
//   switchButton  one device only: the button that hands the device to the other player
//   map           the walkable map (it fills the screen; the bar sits on top of it)
//   popups        what pops up over the map
//   menu          from useGameMenu()
//   tabs          the menu's tabs: [{ id, label, sprite, badge, content }]
//   menuLabel     words for screen readers, e.g. "Astronaut menu"
//
// CSS for the map: --hud-top on .game-hud is the height of the top bar, so the map can keep
// its walking area out from under it.
export default function GameHud({
  label,
  active = true,
  title,
  turn,
  clock = null,
  tools = null,
  switchButton = null,
  map,
  popups = null,
  menu,
  tabs,
  menuLabel
}) {
  const menuId = useId();
  const menuButton = useRef(null);
  const { isOpen, close } = menu;
  const somethingNew = tabs.some((t) => t.badge);
  const toolsInMenu = useMediaQuery('(max-width: 900px)');

  // On a touch device: full screen and sideways when the game starts (and on a tap, if the
  // browser said "not yet").
  useLandscape(active);

  // Escape closes the menu, but only on the screen that is showing.
  useEffect(() => {
    if (!isOpen || !active) return undefined;
    const onKey = (event) => {
      if (event.key === 'Escape') {
        event.preventDefault();
        close();
      }
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [isOpen, active, close]);

  // When the menu closes, the keyboard goes back to the Menu button.
  const wasOpen = useRef(isOpen);
  useEffect(() => {
    if (wasOpen.current && !isOpen && active) menuButton.current?.focus();
    wasOpen.current = isOpen;
  }, [isOpen, active]);

  return (
    <div className="game-hud" role="region" aria-label={label} onPointerDown={() => tryLandscape()}>
      <header className="hud-top">
        <div className="hud-top__where">
          <h1 className="hud-top__title">{title}</h1>
          <p className="hud-top__turn">{turn}</p>
        </div>

        {/* MISSION CLOCK SLOT: the signal clock (MissionClock.jsx) */}
        <div className="hud-top__clock" data-slot="mission-clock">
          {clock}
        </div>

        <div className="hud-top__buttons">
          {!toolsInMenu && tools}
          {switchButton}
          <button
            ref={menuButton}
            type="button"
            className={`hud-menu-button${isOpen ? ' is-open' : ''}`}
            aria-expanded={isOpen}
            aria-controls={menuId}
            onClick={menu.toggle}
          >
            <HudIcon name="menu" size={18} />
            <span>{MENU_LABEL}</span>
            {somethingNew && (
              <span className="hud-badge hud-badge--dot">
                <span aria-hidden="true">!</span>
                <span className="visually-hidden"> (something new)</span>
              </span>
            )}
          </button>
        </div>
      </header>

      <div className="hud-popups" role="status" aria-live="polite">
        {popups}
      </div>

      <div className="game-hud__map">{map}</div>

      <GameMenu
        id={menuId}
        label={menuLabel}
        tabs={tabs}
        tab={menu.tab}
        open={isOpen}
        onTab={menu.setTab}
        onClose={close}
        tools={toolsInMenu ? tools : null}
      />

      <RotateCard />
    </div>
  );
}
