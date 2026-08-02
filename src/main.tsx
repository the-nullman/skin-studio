import { render } from "preact";
import * as skinDocument from "./core/document";
import * as compositor from "./core/compositor";
import { App } from "./app";
import "./style.css";

// Dev-only handle so browser-driven checks can read exact texture state
// instead of inferring it from rendered pixels. Stripped from production
// builds by the `import.meta.env.DEV` guard.
if (import.meta.env.DEV) {
  (globalThis as unknown as { __skin: unknown }).__skin = { skinDocument, compositor };
}

render(<App />, document.getElementById("app")!);
