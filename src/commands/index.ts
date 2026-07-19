import { BarcodeFieldDefault } from "./BarcodeFieldDefault";
import { BarcodeFieldCode128 } from "./BarcodeFieldCode128";
import { BarcodeFieldCode39 } from "./BarcodeFieldCode39";
import { BarcodeFieldQRCode } from "./BarcodeFieldQRCode";
import { ChangeAlphaDefaultFont } from "./ChangeAlphaDefaultFont";
import { ChangeInternationalFont } from "./ChangeInternationalFont";
import { Comment } from "./Comment";
import { FieldBlock } from "./FieldBlock";
import { FieldData } from "./FieldData";
import { FieldOrigin } from "./FieldOrigin";
import { FieldReversePrint } from "./FieldReversePrint";
import { FieldSeparator } from "./FieldSeparator";
import { GraphicBox } from "./GraphicBox";
import { GraphicCircle } from "./GraphicCircle";
import { LabelReversePrint } from "./LabelReversePrint";
import { ScalableBitmappedFont } from "./ScalableBitmappedFont";

export const AllCommands = [
  BarcodeFieldCode128,
  BarcodeFieldDefault,
  BarcodeFieldQRCode,
  BarcodeFieldCode39,
  FieldReversePrint,
  FieldSeparator,
  FieldOrigin,
  FieldData,
  ChangeAlphaDefaultFont,
  ChangeInternationalFont,
  Comment,
  GraphicBox,
  GraphicCircle,
  FieldBlock,
  LabelReversePrint,
  ScalableBitmappedFont,
];
export type Commands = (typeof AllCommands)[number]["command"];
export type Command = InstanceType<(typeof AllCommands)[number]>;

export const CommandMap = AllCommands.reduce((map, command) => {
  map[command.command] = command;
  return map;
}, {} as Record<Commands, (typeof AllCommands)[number]>);
