import './scenes.css';

// Every scene is drawn on a small grid, then stretched to fit the screen.
export const SCENE_WIDTH = 80;
export const SCENE_HEIGHT = 32;

// The window a pixel scene sits in: a thick pixel border, the drawing, and
// optional words on top.
//
// Props:
//   label     words for screen readers, saying what the picture shows
//   children  the SVG shapes of the drawing
//   overlay   optional: HTML shown on top of the drawing (titles, tags)
export default function SceneFrame({ label, className = '', children, overlay }) {
  return (
    <div className={`scene pixel-box ${className}`.trim()}>
      <svg
        className="scene__art"
        viewBox={`0 0 ${SCENE_WIDTH} ${SCENE_HEIGHT}`}
        shapeRendering="crispEdges"
        role="img"
        aria-label={label}
        focusable="false"
      >
        {children}
      </svg>
      {overlay && <div className="scene__overlay">{overlay}</div>}
    </div>
  );
}
