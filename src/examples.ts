/**
 * Example usage of the ZPLr library
 * This file demonstrates how to use the library in Node.js
 */

import { parse, render, parseAndRender } from "./index.node";

async function example1() {
  console.log("Example 1: Using parse() and render() separately");

  const zpl = "^XA^FO100,100^FDHello World^FS^XZ";

  // Parse ZPL
  const labels = parse(zpl);
  console.log(`Parsed ${labels.length} label(s)`);
  console.log(`First label has ${labels[0].length} commands`);

  // Render first label
  const canvas = await render(labels[0], 400, 600);

  // Save to file (skia-canvas specific feature)
  await canvas.toFile("example1.png");
  console.log("Saved to example1.png\n");
}

async function example2() {
  console.log("Example 2: Using parseAndRender() convenience function");

  const zpl = "^XA^FO50,50^FDFirst Label^FS^XZ^XA^FO50,50^FDSecond Label^FS^XZ";

  // Parse and render in one call
  const canvases = await parseAndRender(zpl, 400, 600);

  console.log(`Rendered ${canvases.length} label(s)`);

  // Save each canvas
  for (let i = 0; i < canvases.length; i++) {
    await canvases[i].toFile(`example2-label${i + 1}.png`);
    console.log(`Saved label ${i + 1} to example2-label${i + 1}.png`);
  }
  console.log();
}

async function example3() {
  console.log("Example 3: Rendering with custom dimensions");

  const zpl = "^XA^FO100,200^GB200,100,5^FS^FO150,230^FDBox^FS^XZ";

  // Parse
  const labels = parse(zpl);

  // Render with custom dimensions
  const canvas = await render(labels[0], 400, 600);

  await canvas.toFile("example3.png");
  console.log("Saved to example3.png\n");
}

// Run examples
async function main() {
  console.log("=== ZPLr Library Examples ===\n");

  try {
    await example1();
    await example2();
    await example3();

    console.log("All examples completed successfully!");
  } catch (error) {
    console.error("Error running examples:", error);
    process.exit(1);
  }
}

main();
