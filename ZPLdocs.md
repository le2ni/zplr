# ZPL

## Implementation Status

The source of truth is the exported `commandCapabilities` registry in `src/core/capabilities.ts`. Unknown and unsupported commands are retained by `parseDocument` and produce diagnostics; they are not silently discarded.

| Command | Name | Status | Limitations |
| :--- | :--- | :--- | :--- |
| `^A` | Scalable/Bitmapped Font | Supported | Fonts are cross-platform approximations. |
| `^A@` | Font by Name | Unsupported | — |
| `^B3` | Code 39 Barcode | Supported | Core 2006-guide parameters and Mod-43. |
| `^B4` | Code 49 Barcode | Unsupported | No bundled encoder. |
| `^BC` | Code 128 Barcode | Partial | Modes N and A supported; U and D diagnosed. |
| `^BQ` | QR Code Barcode | Partial | Model 2 normal mode supported; Model 1, mixed/divided input, and Kanji input diagnosed. |
| `^BY` | Barcode Field Default | Supported | — |
| `^CC`, `~CC` | Change Caret | Supported | — |
| `^CD`, `~CD` | Change Delimiter | Supported | — |
| `^CF` | Change Default Font | Supported | Fonts are cross-platform approximations. |
| `^CI` | Change International Font/Encoding | Unsupported | Remapping and later `^CI28` are not implemented. |
| `^CT`, `~CT` | Change Tilde | Supported | — |
| `^FB` | Field Block | Supported | — |
| `^FD` | Field Data | Supported | — |
| `^FH` | Field Hexadecimal Indicator | Supported | — |
| `^FO` | Field Origin | Supported | — |
| `^FR` | Field Reverse Print | Supported | — |
| `^FS` | Field Separator | Supported | SI control-character alternative is supported. |
| `^FW` | Field Orientation | Supported | — |
| `^FX` | Comment | Supported | — |
| `^GB` | Graphic Box | Supported | — |
| `^GC` | Graphic Circle | Supported | — |
| `^LH` | Label Home | Supported | — |
| `^LR` | Label Reverse Print | Supported | — |
| `^XA`, `^XZ` | Format Boundaries | Supported | STX and ETX alternatives are supported. |

Commands not listed above are currently unsupported by the semantic renderer.

## Label Structure & Formatting

### `^XA` - Start Format

The opening bracket for every ZPL instruction set. It initializes the printer buffer to receive a new label format.

- **Format:** `^XA`
- **Parameters:** None.

### `^XZ` - End Format

The closing bracket for a ZPL instruction set. It signals the printer that the label definition is complete and triggers the printing process.

- **Format:** `^XZ`
- **Parameters:** None.

### `^FO` - Field Origin

Sets the upper-left corner of the field area relative to the Label Home (`^LH`) position.

- **Format:** `^FOx,y`
- **Parameters:**
  - `x`: X-axis location (in dots).
  - `y`: Y-axis location (in dots).

### `^FT` - Field Typeset

Sets the field position relative to the baseline of the font. Unlike `^FO` (which sets the top-left corner), `^FT` sets the reference point where the text rests.

- **Format:** `^FTx,y`
- **Parameters:**
  - `x`: X-axis location (in dots).
  - `y`: Y-axis location (in dots).

### `^FS` - Field Separator

Denotes the end of a specific field definition (like a text field, barcode, or graphic). Every field definition must end with this command.

- **Format:** `^FS`
- **Parameters:** None.

### `^LH` - Label Home

Sets the label home position (0,0 coordinates). By default, this is the upper-left corner of the label. This command moves the entire logical format.

- **Format:** `^LHx,y`
- **Parameters:**
  - `x`: X-axis position (in dots).
  - `y`: Y-axis position (in dots).

### `^LL` - Label Length

Defines the length of the label (Y-axis). This is essential when using continuous media to tell the printer where to stop printing or cut.

- **Format:** `^LLy`
- **Parameters:**
  - `y`: Y-axis position (in dots).

### `^PW` - Print Width

Sets the print width of the label. Used to manage the printable area across the width of the printhead.

- **Format:** `^PWa`
- **Parameters:**
  - `a`: Label width (in dots).

### `^LS` - Label Shift

Shifts all field positions to the left. Useful for adjusting the margin on X-axis without changing every `^FO` command.

- **Format:** `^LSa`
- **Parameters:**
  - `a`: Shift left value (in dots). Negative values shift right.

### `^LT` - Label Top

Moves the entire label format up or down relative to the top edge of the media. Used for fine-tuning vertical registration.

- **Format:** `^LTx`
- **Parameters:**
  - `x`: Label top shift (in dot rows). Positive moves down, negative moves up.

### `^LR` - Label Reverse Print

Reverses the printing of all fields in the label format (white on black).

- **Format:** `^LRa`
- **Parameters:**
  - `a`: Reverse print all fields. `Y` (Yes) or `N` (No).

### `^PO` - Print Orientation

Inverts the entire label format 180 degrees.

- **Format:** `^POa`
- **Parameters:**
  - `a`: Invert label. `N` (Normal) or `I` (Invert).

### `^FW` - Field Orientation

Sets the default orientation (rotation) for all subsequent command fields.

- **Format:** `^FWr`
- **Parameters:**
  - `r`: Rotation. `N` (Normal), `R` (90°), `I` (180°), `B` (270°).

---

## Data & Text Handling

### `^FD` - Field Data

Defines the actual data string to be printed in a field (text, barcode content, etc.).

- **Format:** `^FDa`
- **Parameters:**
  - `a`: Data to be printed.

### `^FV` - Field Variable

Similar to `^FD`, but specifically designed for use in templates. `^FV` fields are cleared from memory after printing, whereas `^FD` fields persist.

- **Format:** `^FVa`
- **Parameters:**
  - `a`: Variable field data.

### `^FH` - Field Hexadecimal Indicator

Allows the entry of hexadecimal characters directly into the `^FD` string. Useful for printing special characters not available on a standard keyboard.

- **Format:** `^FHa`
- **Parameters:**
  - `a`: Hexadecimal indicator character (Default is `_`). Example: `_0D` for carriage return.

### `^A` - Scalable/Bitmapped Font

Specifies the font to use for the current text field.

- **Format:** `^Afo,h,w`
- **Parameters:**
  - `f`: Font name (A-Z, 0-9).
  - `o`: Orientation (N, R, I, B).
  - `h`: Character height (in dots).
  - `w`: Character width (in dots).

### `^CF` - Change Alphanumeric Default Font

Sets the default font and size for the label. All subsequent text fields will use this font unless overridden by `^A`.

- **Format:** `^CFf,h,w`
- **Parameters:**
  - `f`: Specified default font (A-Z, 0-9).
  - `h`: Individual character height.
  - `w`: Individual character width.

### `^FB` - Field Block

Formats text into a block. It handles word wrapping, alignment (justification), and line spacing automatically.

- **Format:** `^FBa,b,c,d,e`
- **Parameters:**
  - `a`: Width of text block (in dots).
  - `b`: Maximum number of lines.
  - `c`: Add/delete space between lines.
  - `d`: Text justification (`L`eft, `C`enter, `R`ight, `J`ustified).
  - `e`: Hanging indent.

### `^CI` - Change International Font

Changes the character set encoding (mapping) on a Zebra printer. ZPLr retains this command and emits an unsupported-command diagnostic; it does not apply character-set remapping in the `zpl-ii-2006` profile.

- **Format:** `^CIa`
- **Parameters:**
  - `a`: Character set number. Later extensions such as `28` are outside the bundled 2006 profile.

### `^SF` - Serialization Field

Serializes a standard `^FD` string. Used for incrementing or decrementing numbers or characters on sequential labels.

- **Format:** `^SFa,b`
- **Parameters:**
  - `a`: Mask string (e.g., `dd` for decimal, `aa` for alpha).
  - `b`: Increment string (value to add).

### `^SN` - Serialization Data

An older, alternative command to `^SF` and `^FD` combined. It indexes data fields by a selected value.

- **Format:** `^SNv,n,z`
- **Parameters:**
  - `v`: Starting value.
  - `n`: Increment/decrement value (use `-` for decrement).
  - `z`: Add leading zeros (`Y` or `N`).

---

## Bar Codes

### `^BC` - Code 128

Creates a Code 128 barcode. ZPLr supports mode `N`, including subset invocation codes, and automatic mode `A`. Modes `U` and `D` are retained and diagnosed as unsupported.

- **Format:** `^BCo,h,f,g,e,m`
- **Parameters:**
  - `o`: Orientation.
  - `h`: Barcode height.
  - `f`: Print interpretation line (`Y`/`N`).
  - `g`: Print interpretation line above code (`Y`/`N`).
  - `e`: UCC check digit (`Y`/`N`).
  - `m`: Mode (`N`=No mode, `U`=UCC Case, `A`=Automatic, `D`=UCC/EAN).

### `^B3` - Code 39

Creates a standard Code 39 barcode.

- **Format:** `^B3o,e,h,f,g`
- **Parameters:**
  - `o`: Orientation.
  - `e`: Mod-43 check digit (`Y`/`N`).
  - `h`: Barcode height.
  - `f`: Print interpretation line (`Y`/`N`).
  - `g`: Print interpretation line above code (`Y`/`N`).

### `^BQ` - QR Code

Creates a QR Code (2D matrix). ZPLr supports Model 2 normal-mode automatic input and manual `N`, `A`, and `B` input. Model 1, mixed/divided input, and manual Kanji input are retained and diagnosed as unsupported. The `^FD` prefix selects error correction and input mode (for example, `^FDQA,data`).

- **Format:** `^BQa,b,c,d,e`
- **Parameters:**
  - `a`: Orientation (Always Normal).
  - `b`: Model (1 or 2).
  - `c`: Magnification factor (1-10).
  - `d`: Error correction level (`H`, `Q`, `M`, `L`).
  - `e`: Mask value (1-7; default 7).

### `^BX` - Data Matrix

Creates a Data Matrix 2D barcode.

- **Format:** `^BXo,h,s,c,r,f,g`
- **Parameters:**
  - `o`: Orientation.
  - `h`: Dimensional height (element size).
  - `s`: Quality level (e.g., 200).
  - `c`: Columns to encode.
  - `r`: Rows to encode.

### `^B7` - PDF417

Creates a PDF417 2D barcode.

- **Format:** `^B7o,h,s,c,r,t`
- **Parameters:**
  - `o`: Orientation.
  - `h`: Bar height.
  - `s`: Security level (0-8).
  - `c`: Number of data columns.
  - `r`: Number of rows.
  - `t`: Truncate (`Y`/`N`).

### `^BE` - EAN-13

Creates a standard EAN-13 retail barcode.

- **Format:** `^BEo,h,f,g`
- **Parameters:**
  - `o`: Orientation.
  - `h`: Bar height.
  - `f`: Print interpretation line.
  - `g`: Print interpretation line above.

### `^BU` - UPC-A

Creates a standard UPC-A retail barcode.

- **Format:** `^BUo,h,f,g,e`
- **Parameters:**
  - `o`: Orientation.
  - `h`: Bar height.
  - `f`: Print interpretation line.
  - `g`: Print interpretation line above.
  - `e`: Print check digit (`Y`/`N`).

### `^BY` - Bar Code Field Default

Sets default parameters for barcodes. This affects all subsequent barcodes in the format unless overridden.

- **Format:** `^BYw,r,h`
- **Parameters:**
  - `w`: Module width (in dots).
  - `r`: Wide bar to narrow bar ratio.
  - `h`: Barcode height (in dots).

---

## Graphics & Drawing

### `^GB` - Graphic Box

Draws boxes and lines. Used to create borders, forms, and separators.

- **Format:** `^GBw,h,t,c,r`
- **Parameters:**
  - `w`: Box width (dots).
  - `h`: Box height (dots).
  - `t`: Border thickness (dots).
  - `c`: Line color (`B`=Black, `W`=White).
  - `r`: Degree of corner rounding (0-8).

### `^GC` - Graphic Circle

Draws a circle on the label.

- **Format:** `^GCd,t,c`
- **Parameters:**
  - `d`: Circle diameter (dots).
  - `t`: Border thickness.
  - `c`: Line color.

### `~DG` - Download Graphics

Downloads an ASCII Hex representation of a graphic image to the printer's memory.

- **Format:** `~DGd:o.x,t,w,data`
- **Parameters:**
  - `d`: Device (R, E, B, A).
  - `o`: Image name.
  - `x`: Extension (GRF).
  - `t`: Total number of bytes.
  - `w`: Number of bytes per row.
  - `data`: The ASCII hex string.

### `^XG` - Recall Graphic

Recalls a stored graphic image for printing on the label.

- **Format:** `^XGd:o.x,mx,my`
- **Parameters:**
  - `d`: Device.
  - `o`: Image name.
  - `x`: Extension.
  - `mx`: Magnification factor X.
  - `my`: Magnification factor Y.

### `^GF` - Graphic Field

Downloads graphic data directly into the bitmap storage area for immediate printing (does not save to memory like `~DG`).

- **Format:** `^GFa,b,c,d,data`
- **Parameters:**
  - `a`: Compression type (`A`=ASCII Hex, `B`=Binary).
  - `b`: Binary byte count.
  - `c`: Graphic field count.
  - `d`: Bytes per row.
  - `data`: The graphic data.

---

## Printer Configuration & Control

### `^MD` - Media Darkness

Adjusts the darkness relative to the current darkness setting saved in the printer configuration.

- **Format:** `^MDa`
- **Parameters:**
  - `a`: Darkness level value (-30 to 30).

### `^PR` - Print Rate

Determines the print speed, slew speed (feeding blank areas), and backfeed speed.

- **Format:** `^PRp,s,b`
- **Parameters:**
  - `p`: Print speed (e.g., 2, 4, 6 inches per sec).
  - `s`: Slew speed.
  - `b`: Backfeed speed.

### `^MM` - Print Mode

Determines the action the printer takes after a label is printed.

- **Format:** `^MMa,b`
- **Parameters:**
  - `a`: Mode. `T` (Tear-off), `P` (Peel-off), `C` (Cutter), `R` (Rewind).
  - `b`: Pre-peel select (`Y`/`N`).

### `^MT` - Media Type

Selects the type of media being used.

- **Format:** `^MTa`
- **Parameters:**
  - `a`: Type. `T` (Thermal Transfer - requires ribbon), `D` (Direct Thermal).

### `^MN` - Media Tracking

Tells the printer what type of media tracking to use (how it detects the gap between labels).

- **Format:** `^MNa`
- **Parameters:**
  - `a`: Type. `N` (Continuous), `Y` (Web sensing), `M` (Mark sensing).

### `^PQ` - Print Quantity

Controls the number of labels to print, pause behavior, and serial number replication.

- **Format:** `^PQq,p,r,o`
- **Parameters:**
  - `q`: Total quantity of labels to print.
  - `p`: Pause count (pause after X labels).
  - `r`: Replicates of each serial number.
  - `o`: Override pause (`Y`/`N`).

### `~TA` - Tear-off Adjust

Adjusts the rest position of the media after printing.

- **Format:** `~TA###`
- **Parameters:**
  - `###`: 3-digit value (e.g., 010, -10) in dots.

### `~JC` - Set Media Sensor Calibration

Forces the printer to run a media sensor calibration to detect label length and gap settings.

- **Format:** `~JC`
- **Parameters:** None.

### `~JA` - Cancel All

Immediate command. Cancels all format commands in the buffer and stops printing immediately.

- **Format:** `~JA`
- **Parameters:** None.

---

## Templates & File Management

### `^DF` - Download Format

Saves the ZPL format instructions as a template in the printer's memory to be recalled later.

- **Format:** `^DFd:o.x`
- **Parameters:**
  - `d`: Device (R: RAM, E: Flash).
  - `o`: Object name.
  - `x`: Extension (.ZPL).

### `^XF` - Recall Format

Recalls a stored template (`^DF`) to be populated with variable data.

- **Format:** `^XFd:o.x`
- **Parameters:**
  - `d`: Device.
  - `o`: Object name.
  - `x`: Extension.

### `^FN` - Field Number

Assigns a number to a data field. Used in templates (`^DF`) to act as a placeholder for variable data passed during the Recall (`^XF`) process.

- **Format:** `^FN#`
- **Parameters:**
  - `#`: Field number (0-9999).

### `^ID` - Object Delete

Deletes objects (graphics, fonts, formats) from the printer's storage.

- **Format:** `^IDd:o.x`
- **Parameters:**
  - `d`: Device.
  - `o`: Object name (supports wildcards `*`).
  - `x`: Extension.

### `^HW` - Host Directory List

Transmits a directory listing of objects in a specific memory area back to the host.

- **Format:** `^HWd:o.x`
- **Parameters:**
  - `d`: Device location (R:, E:, etc.).
  - `o`: Object name (supports `*`).
  - `x`: Extension.

### `^FX` - Comment

Adds non-printing comments to the ZPL code. Useful for documenting the code for human readers. The printer ignores everything after `^FX` until the next caret command.

- **Format:** `^FXc`
- **Parameters:**
  - `c`: Comment text.
