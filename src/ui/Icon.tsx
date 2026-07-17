// Material Symbols (outlined, weight 400), inlined at build time so they
// color via currentColor and ship inside the bundle — no icon font, no CDN.
import brush from "@material-symbols/svg-400/outlined/brush.svg?raw";
import inkEraser from "@material-symbols/svg-400/outlined/ink_eraser.svg?raw";
import formatColorFill from "@material-symbols/svg-400/outlined/format_color_fill.svg?raw";
import colorize from "@material-symbols/svg-400/outlined/colorize.svg?raw";
import exposure from "@material-symbols/svg-400/outlined/exposure.svg?raw";
import undo from "@material-symbols/svg-400/outlined/undo.svg?raw";
import redo from "@material-symbols/svg-400/outlined/redo.svg?raw";
import add from "@material-symbols/svg-400/outlined/add.svg?raw";
import arrowUpward from "@material-symbols/svg-400/outlined/arrow_upward.svg?raw";
import arrowDownward from "@material-symbols/svg-400/outlined/arrow_downward.svg?raw";
import contentCopy from "@material-symbols/svg-400/outlined/content_copy.svg?raw";
import del from "@material-symbols/svg-400/outlined/delete.svg?raw";
import upload from "@material-symbols/svg-400/outlined/upload.svg?raw";
import download from "@material-symbols/svg-400/outlined/download.svg?raw";
import noteAdd from "@material-symbols/svg-400/outlined/note_add.svg?raw";

const ICONS = {
  brush,
  ink_eraser: inkEraser,
  format_color_fill: formatColorFill,
  colorize,
  exposure,
  undo,
  redo,
  add,
  arrow_upward: arrowUpward,
  arrow_downward: arrowDownward,
  content_copy: contentCopy,
  delete: del,
  upload,
  download,
  note_add: noteAdd,
} as const;

export type IconName = keyof typeof ICONS;

export function Icon({ name }: { name: IconName }) {
  return <span class="icon" dangerouslySetInnerHTML={{ __html: ICONS[name] }} />;
}
