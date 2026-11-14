import { describe, it, expect } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import { moveConfirm, roomDialog } from './dialogs.jsx';
import { MOVE_INFO, WARNING_INFO, BLACKOUT_NOTE, MARS_DELAY_NOTE } from '../labels.js';
import { fakeMissionControlView, fakeMarsMissionControlView, fakeMarsBlackoutMissionControlView } from '../../fakeState.js';

const spy = () => {
  const calls = [];
  const fn = (...args) => calls.push(args);
  fn.calls = calls;
  return fn;
};

describe('moveConfirm: Nova asks before she acts', () => {
  it('asks with the move and its cost, Yes first and highlighted', () => {
    const box = moveConfirm('shieldTower', { turn: 2, onYes: spy(), onNo: spy() });
    expect(box.kind).toBe('confirm');
    expect(box.title).toBe(`${MOVE_INFO.raiseShield.label}?`);
    expect(renderToStaticMarkup(box.body)).toContain(MOVE_INFO.raiseShield.hint);
    expect(box.choices.map((c) => c.label)).toEqual(['Yes', 'No']);
    expect(box.highlight).toBe(0);
  });

  it('Yes makes the move, No does not', () => {
    const onYes = spy();
    const onNo = spy();
    const box = moveConfirm('solarPanel', { turn: 1, onYes, onNo });
    box.onChoose('no');
    expect(onYes.calls).toEqual([]);
    expect(onNo.calls).toHaveLength(1);
    box.onChoose('yes');
    expect(onYes.calls).toEqual([['savePower']]);
  });

  it('is a new box on a new turn (the highlight starts again)', () => {
    const at = (turn) => moveConfirm('rover', { turn, onYes: spy(), onNo: spy() }).id;
    expect(at(1)).not.toBe(at(2));
  });
});

describe('roomDialog: Sola in the control room', () => {
  const handlers = () => ({ onWarn: spy(), close: spy() });

  it('radio desk: the four warnings and "Not now"; picking one sends it, no extra Yes / No', () => {
    const h = handlers();
    const box = roomDialog('radio', fakeMissionControlView, h);
    expect(box.kind).toBe('menu');
    expect(box.choices.map((c) => c.label)).toEqual([...Object.values(WARNING_INFO).map((w) => w.label), 'Not now']);
    box.onChoose('shelterNow');
    expect(h.onWarn.calls).toEqual([['shelterNow']]);
    box.onChoose('notNow');
    expect(h.close.calls).toHaveLength(1);
    expect(h.onWarn.calls).toHaveLength(1);
  });

  it('radio desk starts on the warning already sent this turn', () => {
    const box = roomDialog('radio', { ...fakeMissionControlView, warningThisTurn: 'savePower' }, handlers());
    expect(box.choices[box.highlight].id).toBe('savePower');
  });

  it('radio desk on Mars says the message arrives next turn', () => {
    expect(renderToStaticMarkup(roomDialog('radio', fakeMarsMissionControlView, handlers()).body)).toContain(MARS_DELAY_NOTE);
  });

  it('radio desk in a blackout only says no signal gets through, with OK', () => {
    const box = roomDialog('radio', fakeMarsBlackoutMissionControlView, handlers());
    expect(box.kind).toBe('info');
    expect(box.body.props.children).toBe(BLACKOUT_NOTE); // the text itself (HTML would escape "can't")
    expect(box.choices.map((c) => c.label)).toEqual(['OK']);
  });

  it('telescope and crew monitor are info boxes; OK closes them', () => {
    for (const place of ['telescope', 'monitor']) {
      const h = handlers();
      const box = roomDialog(place, fakeMissionControlView, h);
      expect(box.kind).toBe('info');
      box.onChoose('ok');
      expect(h.close.calls).toHaveLength(1);
    }
    expect(renderToStaticMarkup(roomDialog('telescope', fakeMissionControlView, handlers()).body)).toContain(
      fakeMissionControlView.stage.missionControlSees
    );
  });
});
