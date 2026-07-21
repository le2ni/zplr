import { renderZpl } from "./index.node";

async function main(): Promise<void> {
  const result = await renderZpl(
    "^XA^PW400^LL240^FO20,20^A0N,32,20^FDZPLr 0.3^FS" +
      "^FO20,80^BQN,2,4,Q,7^FDQA,HELLO-ZPL^FS^XZ"
  );

  for (const [index, label] of result.labels.entries()) {
    await label.canvas.toFile(`example-${index + 1}.png`);
  }

  for (const diagnostic of result.diagnostics) {
    console.log(diagnostic.severity, diagnostic.code, diagnostic.message);
  }
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
