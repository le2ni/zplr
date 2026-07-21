// Generated from Zebra's current ZPL Programming Guide command pages.
// Keep this database declarative: Monaco providers consume it for command,
// signature, parameter-value, hover, validation, and documentation features.

export interface ZplParameterDefinition {
  key: string;
  name: string;
  documentation: string;
  choices: readonly string[];
  enumValues?: readonly string[];
  range?: { readonly min: number; readonly max: number };
  slot: number;
  component: number;
  syntaxStart?: number;
  syntaxEnd?: number;
  repeatable?: boolean;
  required?: boolean;
}

export interface ZplCommandSignature {
  syntax: string;
  snippet: string;
  label?: string;
  parameters: readonly ZplParameterDefinition[];
}

export interface ZplCommandDefinition {
  title: string;
  summary: string;
  reference: string;
  signatures: readonly ZplCommandSignature[];
}

export const zplCommandDefinitions = {
  "^A": {
    "title": "Scalable/Bitmapped Font",
    "summary": "The ^A command specifies the font to use in a text field.",
    "reference": "https://docs.zebra.com/us/en/printers/software/zpl-pg/c-zpl-zpl-commands/r-zpl-a.html",
    "signatures": [
      {
        "syntax": "^Afo,h,w",
        "snippet": "^A${1:A}${2:N},${3:30},${4:30}",
        "parameters": [
          {
            "key": "f",
            "name": "font name",
            "documentation": "font name. Values: A through Z , and 0 to 9 Any font in the printer (downloaded, EPROM, stored fonts, fonts A through Z and 0 to 9 ). Parameter f is required. If f is omitted it defaults to the last value of the ^CF command.",
            "choices": [
              "A",
              "B",
              "C",
              "D",
              "E",
              "F",
              "G",
              "H",
              "I",
              "J",
              "K",
              "L",
              "M",
              "N",
              "O",
              "P",
              "Q",
              "R",
              "S",
              "T",
              "U",
              "V",
              "W",
              "X",
              "Y",
              "Z",
              "0",
              "1",
              "2",
              "3",
              "4",
              "5",
              "6",
              "7",
              "8",
              "9"
            ],
            "range": {
              "min": 0.0,
              "max": 9.0
            },
            "slot": 0,
            "component": 0,
            "syntaxStart": 2,
            "syntaxEnd": 3
          },
          {
            "key": "o",
            "name": "field orientation",
            "documentation": "field orientation. Values: N = normal R = rotated 90 degrees (clockwise) I = inverted 180 degrees B = read from bottom up, 270 degrees Default: the last accepted ^FW value or the ^FW default",
            "choices": [
              "N",
              "R",
              "I",
              "B"
            ],
            "enumValues": [
              "N",
              "R",
              "I",
              "B"
            ],
            "slot": 0,
            "component": 1,
            "syntaxStart": 3,
            "syntaxEnd": 4
          },
          {
            "key": "h",
            "name": "Character Height (in dots)",
            "documentation": "Character Height (in dots). Scalable Values: 10 to 32000 Default: last accepted ^CF Bitmapped Values: multiples of height from 1 to 10 times the standard height, in increments of 1 Default: last accepted ^CF",
            "choices": [
              "30",
              "10",
              "32000"
            ],
            "range": {
              "min": 10.0,
              "max": 32000.0
            },
            "slot": 1,
            "component": 0,
            "syntaxStart": 5,
            "syntaxEnd": 6
          },
          {
            "key": "w",
            "name": "width (in dots)",
            "documentation": "width (in dots). Scalable Values: 10 to 32000 Default: last accepted ^CF Bitmapped Values: multiples of width from 1 to 10 times the standard width, in increments of 1 Default: last accepted ^CF",
            "choices": [
              "30"
            ],
            "range": {
              "min": 10.0,
              "max": 32000.0
            },
            "slot": 2,
            "component": 0,
            "syntaxStart": 7,
            "syntaxEnd": 8
          }
        ]
      }
    ]
  },
  "^A@": {
    "title": "Use Font Name to Call Font",
    "summary": "The ^A@ command uses the complete name of a font, rather than the character designation used in ^A .",
    "reference": "https://docs.zebra.com/us/en/printers/software/zpl-pg/c-zpl-zpl-commands/r-zpl-a1.html",
    "signatures": [
      {
        "syntax": "^A@o,h,w,d:f.x",
        "snippet": "^A@${1:N},${2:30},${3:30},${4:R}:${5:OBJECT}.${6:TTF}",
        "parameters": [
          {
            "key": "o",
            "name": "field orientation",
            "documentation": "field orientation. Values: N = normal R = rotates 90 degrees (clockwise) I = inverted 180 degrees B = read from bottom up, 270 degrees Default: N or the last ^FW value",
            "choices": [
              "N",
              "R",
              "I",
              "B"
            ],
            "enumValues": [
              "N",
              "R",
              "I",
              "B"
            ],
            "slot": 0,
            "component": 0,
            "syntaxStart": 3,
            "syntaxEnd": 4
          },
          {
            "key": "h",
            "name": "character height (in dots)",
            "documentation": "character height (in dots). Default: Specifies magnification by w (character width) or the last accepted ^CF value. Uses the base height if none is specified. Scalable - The value is the height in dots of the entire character block. Magnification factors are unnecessary, because characters are scaled. Bitmapped - The value is rounded to the nearest integer multiple of the font’s base height, then divided by the font’s base height to give a magnification nearest limit.",
            "choices": [
              "30"
            ],
            "slot": 1,
            "component": 0,
            "syntaxStart": 5,
            "syntaxEnd": 6
          },
          {
            "key": "w",
            "name": "width (in dots)",
            "documentation": "width (in dots). Default: Specifies magnification by h (height) or the last accepted ^CF value. Specifies the base width is used if none is specified. Scalable - The value is the width in dots of the entire character block. Magnification factors are unnecessary, because characters are scaled. Bitmapped - The value rounds to the nearest integer multiple of the font’s base width, then divided by the font’s base width to give a magnification nearest limit.",
            "choices": [
              "30"
            ],
            "slot": 2,
            "component": 0,
            "syntaxStart": 7,
            "syntaxEnd": 8
          },
          {
            "key": "d",
            "name": "drive location of font",
            "documentation": "drive location of font. Values: R: , E: , B: , and A: Default: R :",
            "choices": [
              "R"
            ],
            "slot": 3,
            "component": 0,
            "syntaxStart": 9,
            "syntaxEnd": 10
          },
          {
            "key": "f",
            "name": "font name",
            "documentation": "font name. Values: any valid font Default: if an invalid or no name is entered, the default set by ^CF is used If no font has been specified in ^CF , font A is used. The font named carries over on all subsequent ^A@ commands without a font name.",
            "choices": [
              "OBJECT"
            ],
            "slot": 3,
            "component": 1,
            "syntaxStart": 11,
            "syntaxEnd": 12
          },
          {
            "key": "x",
            "name": "extension .TTE is only supported in firmware version V60.14.x, V50.14.x, or later.",
            "documentation": "extension .TTE is only supported in firmware version V60.14.x, V50.14.x, or later. Values: .FNT = font .TTF = TrueType Font .TTE = TrueType Extension",
            "choices": [
              "TTF",
              "FNT",
              "TTE"
            ],
            "slot": 3,
            "component": 2,
            "syntaxStart": 13,
            "syntaxEnd": 14
          }
        ]
      }
    ]
  },
  "^B0": {
    "title": "Aztec Barcode Parameters",
    "summary": "The ^B0 command creates a two-dimensional matrix symbology made up of square modules arranged around a bulls-eye pattern at the center.",
    "reference": "https://docs.zebra.com/us/en/printers/software/zpl-pg/c-zpl-zpl-commands/r-zpl-b0.html",
    "signatures": [
      {
        "syntax": "^B0a,b,c,d,e,f,g",
        "snippet": "^B0${1:N},${2:1},${3:N},${4:0},${5:N},${6:1},${7:0}",
        "parameters": [
          {
            "key": "a",
            "name": "orientation",
            "documentation": "orientation. Values: N = normal R = rotated I = inverted 180 degrees B = read from bottom up, 270 degrees Default: current ^FW value",
            "choices": [
              "N",
              "R",
              "I",
              "B"
            ],
            "enumValues": [
              "N",
              "R",
              "I",
              "B"
            ],
            "slot": 0,
            "component": 0,
            "syntaxStart": 3,
            "syntaxEnd": 4
          },
          {
            "key": "b",
            "name": "magnification factor",
            "documentation": "magnification factor. Values: 1 to 10 Default: 1 on 150 dpi printers 2 on 200 dpi printers 3 on 300 dpi printers 6 on 600 dpi printers",
            "choices": [
              "1",
              "10"
            ],
            "range": {
              "min": 1.0,
              "max": 10.0
            },
            "slot": 1,
            "component": 0,
            "syntaxStart": 5,
            "syntaxEnd": 6
          },
          {
            "key": "c",
            "name": "extended channel interpretation code indicator",
            "documentation": "extended channel interpretation code indicator. Values: Y = if data contains ECICs N = if data does not contain ECICs Default: N",
            "choices": [
              "N",
              "Y"
            ],
            "slot": 2,
            "component": 0,
            "syntaxStart": 7,
            "syntaxEnd": 8
          },
          {
            "key": "d",
            "name": "error control and symbol size/type indicator",
            "documentation": "error control and symbol size/type indicator. Values: 0 = default error correction level 01 to 99 = error correction percentage (minimum) 101 to 104 = 1 to 4-layer compact symbol 201 to 232 = 1 to 32-layer full-range symbol 300 = a simple Aztec “Rune” Default: 0",
            "choices": [
              "0",
              "99",
              "104",
              "232",
              "300"
            ],
            "slot": 3,
            "component": 0,
            "syntaxStart": 9,
            "syntaxEnd": 10
          },
          {
            "key": "e",
            "name": "menu symbol indicator",
            "documentation": "menu symbol indicator. Values: Y = if this symbol is to be a menu (bar code reader initialization) symbol N = if it is not a menu symbol Default: N",
            "choices": [
              "N",
              "Y"
            ],
            "slot": 4,
            "component": 0,
            "syntaxStart": 11,
            "syntaxEnd": 12
          },
          {
            "key": "f",
            "name": "number of symbols for structured append",
            "documentation": "number of symbols for structured append. Values: 1 through 26 Default: 1",
            "choices": [
              "1",
              "26"
            ],
            "range": {
              "min": 1.0,
              "max": 26.0
            },
            "slot": 5,
            "component": 0,
            "syntaxStart": 13,
            "syntaxEnd": 14
          },
          {
            "key": "g",
            "name": "optional ID field for structured append",
            "documentation": "optional ID field for structured append. The ID field is a text string with a 24-character maximum Default: no ID",
            "choices": [
              "0"
            ],
            "slot": 6,
            "component": 0,
            "syntaxStart": 15,
            "syntaxEnd": 16
          }
        ]
      }
    ]
  },
  "^B1": {
    "title": "Code 11 Barcode",
    "summary": "The ^B1 command produces the Code 11 bar code , also known as USD-8 code.",
    "reference": "https://docs.zebra.com/us/en/printers/software/zpl-pg/c-zpl-zpl-commands/r-zpl-b1.html",
    "signatures": [
      {
        "syntax": "^B1o,e,h,f,g",
        "snippet": "^B1${1:N},${2:N},${3:100},${4:Y},${5:N}",
        "parameters": [
          {
            "key": "o",
            "name": "orientation",
            "documentation": "orientation. Values: N = normal R = rotated 90 degrees (clockwise) I = inverted 180 degrees B = read from bottom up, 270 degrees Default: current ^FW value",
            "choices": [
              "N",
              "R",
              "I",
              "B"
            ],
            "enumValues": [
              "N",
              "R",
              "I",
              "B"
            ],
            "slot": 0,
            "component": 0,
            "syntaxStart": 3,
            "syntaxEnd": 4
          },
          {
            "key": "e",
            "name": "check digit",
            "documentation": "check digit. Values: Y = 1 digit N = 2 digits Default: N",
            "choices": [
              "N",
              "Y"
            ],
            "enumValues": [
              "Y",
              "N"
            ],
            "slot": 1,
            "component": 0,
            "syntaxStart": 5,
            "syntaxEnd": 6
          },
          {
            "key": "h",
            "name": "barcode height (in dots)",
            "documentation": "barcode height (in dots). Values: 1 to 32000 Default: Value set by ^BY",
            "choices": [
              "100",
              "1",
              "32000"
            ],
            "range": {
              "min": 1.0,
              "max": 32000.0
            },
            "slot": 2,
            "component": 0,
            "syntaxStart": 7,
            "syntaxEnd": 8
          },
          {
            "key": "f",
            "name": "print interpretation line",
            "documentation": "print interpretation line. Values: Y = yes N = no Default: Y",
            "choices": [
              "Y",
              "N"
            ],
            "enumValues": [
              "Y",
              "N"
            ],
            "slot": 3,
            "component": 0,
            "syntaxStart": 9,
            "syntaxEnd": 10
          },
          {
            "key": "g",
            "name": "print interpretation line above code",
            "documentation": "print interpretation line above code. Values: Y = yes N = no Default: N",
            "choices": [
              "N",
              "Y"
            ],
            "enumValues": [
              "Y",
              "N"
            ],
            "slot": 4,
            "component": 0,
            "syntaxStart": 11,
            "syntaxEnd": 12
          }
        ]
      }
    ]
  },
  "^B2": {
    "title": "Interleaved 2 of 5 Bar Code",
    "summary": "The ^B2 command produces the Interleaved 2 of 5 bar code, a high-density, self-checking, continuous, numeric symbology.",
    "reference": "https://docs.zebra.com/us/en/printers/software/zpl-pg/c-zpl-zpl-commands/r-zpl-b2.html",
    "signatures": [
      {
        "syntax": "^B2o,h,f,g,e,j",
        "snippet": "^B2${1:N},${2:100},${3:Y},${4:N},${5:N},${6:N}",
        "parameters": [
          {
            "key": "o",
            "name": "orientation",
            "documentation": "orientation. Values: N = normal R = rotated 90 degrees (clockwise) I = inverted 180 degrees B = read from bottom up, 270 degrees Default: current ^FW value",
            "choices": [
              "N",
              "R",
              "I",
              "B"
            ],
            "enumValues": [
              "N",
              "R",
              "I",
              "B"
            ],
            "slot": 0,
            "component": 0,
            "syntaxStart": 3,
            "syntaxEnd": 4
          },
          {
            "key": "h",
            "name": "bar code height (in dots)",
            "documentation": "bar code height (in dots). Values: 1 to 32000 Default: value set by ^BY",
            "choices": [
              "100",
              "1",
              "32000"
            ],
            "range": {
              "min": 1.0,
              "max": 32000.0
            },
            "slot": 1,
            "component": 0,
            "syntaxStart": 5,
            "syntaxEnd": 6
          },
          {
            "key": "f",
            "name": "print interpretation line",
            "documentation": "print interpretation line. Values: Y = yes N = no Default: Y",
            "choices": [
              "Y",
              "N"
            ],
            "enumValues": [
              "Y",
              "N"
            ],
            "slot": 2,
            "component": 0,
            "syntaxStart": 7,
            "syntaxEnd": 8
          },
          {
            "key": "g",
            "name": "print interpretation line above code",
            "documentation": "print interpretation line above code. Values: Y = yes N = no Default: N",
            "choices": [
              "N",
              "Y"
            ],
            "enumValues": [
              "Y",
              "N"
            ],
            "slot": 3,
            "component": 0,
            "syntaxStart": 9,
            "syntaxEnd": 10
          },
          {
            "key": "e",
            "name": "calculate and print Mod 10 check digit",
            "documentation": "calculate and print Mod 10 check digit. Values: Y = yes N = no Default: N",
            "choices": [
              "N",
              "Y"
            ],
            "enumValues": [
              "Y",
              "N"
            ],
            "slot": 4,
            "component": 0,
            "syntaxStart": 11,
            "syntaxEnd": 12
          },
          {
            "key": "j",
            "name": "print check digit in interpretation line",
            "documentation": "Controls whether the Mod 10 check digit appears in the human-readable line. Values: Y or N. Default: N.",
            "choices": [
              "N",
              "Y"
            ],
            "enumValues": [
              "N",
              "Y"
            ],
            "slot": 5,
            "component": 0,
            "syntaxStart": 13,
            "syntaxEnd": 14
          }
        ]
      }
    ]
  },
  "^B3": {
    "title": "Code 39 Barcode",
    "summary": "The Code 39 barcode is the standard for many industries, including the US Department of Defense.",
    "reference": "https://docs.zebra.com/us/en/printers/software/zpl-pg/c-zpl-zpl-commands/r-zpl-b3.html",
    "signatures": [
      {
        "syntax": "^B3o,e,h,f,g",
        "snippet": "^B3${1:N},${2:N},${3:100},${4:Y},${5:N}",
        "parameters": [
          {
            "key": "o",
            "name": "orientation",
            "documentation": "orientation. Values: N = normal R = rotated 90 degrees (clockwise) I = inverted 180 degrees B = read from bottom up, 270 degrees Default: current ^FW value",
            "choices": [
              "N",
              "R",
              "I",
              "B"
            ],
            "enumValues": [
              "N",
              "R",
              "I",
              "B"
            ],
            "slot": 0,
            "component": 0,
            "syntaxStart": 3,
            "syntaxEnd": 4
          },
          {
            "key": "e",
            "name": "Mod-43 check digit",
            "documentation": "Mod-43 check digit. Values: Y = yes N = no Default: N",
            "choices": [
              "N",
              "Y"
            ],
            "enumValues": [
              "Y",
              "N"
            ],
            "slot": 1,
            "component": 0,
            "syntaxStart": 5,
            "syntaxEnd": 6
          },
          {
            "key": "h",
            "name": "bar code height (in dots)",
            "documentation": "bar code height (in dots). Values: 1 to 32000 Default: value set by ^BY",
            "choices": [
              "100",
              "1",
              "32000"
            ],
            "range": {
              "min": 1.0,
              "max": 32000.0
            },
            "slot": 2,
            "component": 0,
            "syntaxStart": 7,
            "syntaxEnd": 8
          },
          {
            "key": "f",
            "name": "print interpretation line",
            "documentation": "print interpretation line. Values: Y = yes N = no Default: Y",
            "choices": [
              "Y",
              "N"
            ],
            "enumValues": [
              "Y",
              "N"
            ],
            "slot": 3,
            "component": 0,
            "syntaxStart": 9,
            "syntaxEnd": 10
          },
          {
            "key": "g",
            "name": "print interpretation line above code",
            "documentation": "print interpretation line above code. Values: Y = yes N = no Default: N",
            "choices": [
              "N",
              "Y"
            ],
            "enumValues": [
              "Y",
              "N"
            ],
            "slot": 4,
            "component": 0,
            "syntaxStart": 11,
            "syntaxEnd": 12
          }
        ]
      }
    ]
  },
  "^B4": {
    "title": "Code 49 Barcode",
    "summary": "The ^B4 command creates a multi-row, continuous, variable-length symbology capable of encoding the full 128-character ASCII set.",
    "reference": "https://docs.zebra.com/us/en/printers/software/zpl-pg/c-zpl-zpl-commands/r-zpl-b4.html",
    "signatures": [
      {
        "syntax": "^B4o,h,f,m",
        "snippet": "^B4${1:N},${2:0},${3:N},${4:A}",
        "parameters": [
          {
            "key": "o",
            "name": "orientation",
            "documentation": "orientation. Values: N = normal R = rotated 90 degrees (clockwise) I = inverted 180 degrees B = read from bottom up, 270 degrees Default: current ^FW value",
            "choices": [
              "N",
              "R",
              "I",
              "B"
            ],
            "enumValues": [
              "N",
              "R",
              "I",
              "B"
            ],
            "slot": 0,
            "component": 0,
            "syntaxStart": 3,
            "syntaxEnd": 4
          },
          {
            "key": "h",
            "name": "height multiplier of individual rows",
            "documentation": "height multiplier of individual rows. Values: 1 to height of label Default: value set by ^BY This number multiplied by the module equals the height of the individual rows in dots. 1 is not a recommended value.",
            "choices": [
              "0"
            ],
            "slot": 1,
            "component": 0,
            "syntaxStart": 5,
            "syntaxEnd": 6
          },
          {
            "key": "f",
            "name": "print interpretation line",
            "documentation": "print interpretation line. Values: N = no line printed A = print interpretation line above code B = print interpretation line below code Default: N When the field data exceeds two rows, expect the interpretation line to extend beyond the right edge of the barcode symbol.",
            "choices": [
              "N",
              "A",
              "B"
            ],
            "enumValues": [
              "N",
              "A",
              "B"
            ],
            "slot": 2,
            "component": 0,
            "syntaxStart": 7,
            "syntaxEnd": 8
          },
          {
            "key": "m",
            "name": "starting mode",
            "documentation": "starting mode. Values: 0 = Regular Alphanumeric Mode 1 = Multiple Read Alphanumeric 2 = Regular Numeric Mode 3 = Group Alphanumeric Mode 4 = Regular Alphanumeric Shift 1 5 = Regular Alphanumeric Shift 2 A = Automatic Mode. The printer determines the starting mode by analyzing the field data. Default: A",
            "choices": [
              "A",
              "0",
              "1",
              "2",
              "3",
              "4",
              "5"
            ],
            "enumValues": [
              "0",
              "1",
              "2",
              "3",
              "4",
              "5",
              "A"
            ],
            "slot": 3,
            "component": 0,
            "syntaxStart": 9,
            "syntaxEnd": 10
          }
        ]
      }
    ]
  },
  "^B5": {
    "title": "Planet Code Barcode",
    "summary": "The ^B5 command is supported in all printers as a resident barcode.",
    "reference": "https://docs.zebra.com/us/en/printers/software/zpl-pg/c-zpl-zpl-commands/r-zpl-b5.html",
    "signatures": [
      {
        "syntax": "^B5o,h,f,g",
        "snippet": "^B5${1:N},${2:100},${3:N},${4:N}",
        "parameters": [
          {
            "key": "o",
            "name": "orientation code",
            "documentation": "orientation code. Values: N = normal R = rotated I = inverted 180 degrees B = read from bottom up, 270 degrees Default: current ^FW value",
            "choices": [
              "N",
              "R",
              "I",
              "B"
            ],
            "enumValues": [
              "N",
              "R",
              "I",
              "B"
            ],
            "slot": 0,
            "component": 0,
            "syntaxStart": 3,
            "syntaxEnd": 4
          },
          {
            "key": "h",
            "name": "barcode height (in dots)",
            "documentation": "barcode height (in dots). Values: 1 to 9999 Default: value set by ^BY",
            "choices": [
              "100",
              "1",
              "9999"
            ],
            "range": {
              "min": 1.0,
              "max": 9999.0
            },
            "slot": 1,
            "component": 0,
            "syntaxStart": 5,
            "syntaxEnd": 6
          },
          {
            "key": "f",
            "name": "interpretation line",
            "documentation": "interpretation line. Values: N = no Y = yes Default: N",
            "choices": [
              "N",
              "Y"
            ],
            "enumValues": [
              "N",
              "Y"
            ],
            "slot": 2,
            "component": 0,
            "syntaxStart": 7,
            "syntaxEnd": 8
          },
          {
            "key": "g",
            "name": "determines if the interpretation line is printed above the barcode",
            "documentation": "determines if the interpretation line is printed above the barcode. Values: N = no Y = yes Default: N",
            "choices": [
              "N",
              "Y"
            ],
            "enumValues": [
              "N",
              "Y"
            ],
            "slot": 3,
            "component": 0,
            "syntaxStart": 9,
            "syntaxEnd": 10
          }
        ]
      }
    ]
  },
  "^B7": {
    "title": "PDF417 Bar Code",
    "summary": "The ^B7 command produces the PDF417 barcode, a two-dimensional, multirow, continuous, stacked symbology.",
    "reference": "https://docs.zebra.com/us/en/printers/software/zpl-pg/c-zpl-zpl-commands/r-zpl-b7.html",
    "signatures": [
      {
        "syntax": "^B7o,h,s,c,r,t",
        "snippet": "^B7${1:N},${2:100},${3:0},${4:0},${5:0},${6:N}",
        "parameters": [
          {
            "key": "o",
            "name": "orientation",
            "documentation": "orientation. Values: N = normal R = rotated 90 degrees (clockwise) I = inverted 180 degrees B = read from the bottom up, 270 degrees Default: current ^FW value",
            "choices": [
              "N",
              "R",
              "I",
              "B"
            ],
            "enumValues": [
              "N",
              "R",
              "I",
              "B"
            ],
            "slot": 0,
            "component": 0,
            "syntaxStart": 3,
            "syntaxEnd": 4
          },
          {
            "key": "h",
            "name": "bar code height for individual rows (in dots)",
            "documentation": "bar code height for individual rows (in dots). Values: 1 to height of label Default: value set by ^BY This number multiplied by the module equals the height of the individual rows in dots. If this number is not specified, the overall barcode height, divided by the number of rows, equals the height of the individual rows in dots, where the overall barcode height is defined by the ^BY command. 1 is not a recommended value.",
            "choices": [
              "100",
              "0"
            ],
            "slot": 1,
            "component": 0,
            "syntaxStart": 5,
            "syntaxEnd": 6
          },
          {
            "key": "s",
            "name": "security level",
            "documentation": "security level. Values: 1 to 8 (error detection and correction) Default: 0 (error detection only) This determines the number of error detection and correction code words to be generated for the symbol. The default level provides only error detection without correction. Increasing the security level adds increasing levels of error correction and increases the symbol size.",
            "choices": [
              "0",
              "1",
              "8"
            ],
            "range": {
              "min": 1.0,
              "max": 8.0
            },
            "slot": 2,
            "component": 0,
            "syntaxStart": 7,
            "syntaxEnd": 8
          },
          {
            "key": "c",
            "name": "number of data columns to encode",
            "documentation": "number of data columns to encode. Values: 1 to 30 Default: 1:2 (row-to-column aspect ratio) You can specify the number of code-word columns giving control over the width of the symbol.",
            "choices": [
              "0",
              "1",
              "30"
            ],
            "range": {
              "min": 1.0,
              "max": 30.0
            },
            "slot": 3,
            "component": 0,
            "syntaxStart": 9,
            "syntaxEnd": 10
          },
          {
            "key": "r",
            "name": "number of rows to encode",
            "documentation": "number of rows to encode. Values: 3 to 90 Default: 1:2 (row-to-column aspect ratio) You can specify the number of symbol rows giving control over the height of the symbol. For example, with no row or column values entered, 72 code words would be encoded into a symbol of six columns and 12 rows. Depending on code words, the aspect ratio is not always exact.",
            "choices": [
              "0",
              "3",
              "90"
            ],
            "range": {
              "min": 3.0,
              "max": 90.0
            },
            "slot": 4,
            "component": 0,
            "syntaxStart": 11,
            "syntaxEnd": 12
          },
          {
            "key": "t",
            "name": "truncate right row indicators and stop pattern",
            "documentation": "truncate right row indicators and stop pattern. Values: N = no truncation Y = perform truncation Default: N",
            "choices": [
              "N",
              "Y"
            ],
            "enumValues": [
              "N",
              "Y"
            ],
            "slot": 5,
            "component": 0,
            "syntaxStart": 13,
            "syntaxEnd": 14
          }
        ]
      }
    ]
  },
  "^B8": {
    "title": "EAN-8 Barcode",
    "summary": "The ^B8 command is the shortened version of the EAN-13 barcode.",
    "reference": "https://docs.zebra.com/us/en/printers/software/zpl-pg/c-zpl-zpl-commands/r-zpl-b8.html",
    "signatures": [
      {
        "syntax": "^B8o,h,f,g",
        "snippet": "^B8${1:N},${2:100},${3:Y},${4:N}",
        "parameters": [
          {
            "key": "o",
            "name": "orientation",
            "documentation": "orientation. Values: N = normal R = rotated 90 degrees (clockwise) I = inverted 180 degrees B = read from the bottom up, 270 degrees Default: current ^FW value",
            "choices": [
              "N",
              "R",
              "I",
              "B"
            ],
            "enumValues": [
              "N",
              "R",
              "I",
              "B"
            ],
            "slot": 0,
            "component": 0,
            "syntaxStart": 3,
            "syntaxEnd": 4
          },
          {
            "key": "h",
            "name": "bar code height (in dots)",
            "documentation": "bar code height (in dots). Values: 1 to 32000 Default: value set by ^BY",
            "choices": [
              "100",
              "1",
              "32000"
            ],
            "range": {
              "min": 1.0,
              "max": 32000.0
            },
            "slot": 1,
            "component": 0,
            "syntaxStart": 5,
            "syntaxEnd": 6
          },
          {
            "key": "f",
            "name": "print interpretation line",
            "documentation": "print interpretation line. Values: N = no Y = yes Default: Y",
            "choices": [
              "Y",
              "N"
            ],
            "enumValues": [
              "N",
              "Y"
            ],
            "slot": 2,
            "component": 0,
            "syntaxStart": 7,
            "syntaxEnd": 8
          },
          {
            "key": "g",
            "name": "print interpretation line above code",
            "documentation": "print interpretation line above code. Values: N = no Y = yes Default: N",
            "choices": [
              "N",
              "Y"
            ],
            "enumValues": [
              "N",
              "Y"
            ],
            "slot": 3,
            "component": 0,
            "syntaxStart": 9,
            "syntaxEnd": 10
          }
        ]
      }
    ]
  },
  "^B9": {
    "title": "UPC-E Barcode",
    "summary": "The ^B9 command produces a variation of the UPC symbology used for the number system 0.",
    "reference": "https://docs.zebra.com/us/en/printers/software/zpl-pg/c-zpl-zpl-commands/r-zpl-b9.html",
    "signatures": [
      {
        "syntax": "^B9o,h,f,g,e",
        "snippet": "^B9${1:N},${2:100},${3:Y},${4:N},${5:Y}",
        "parameters": [
          {
            "key": "o",
            "name": "orientation",
            "documentation": "orientation. Values: N = normal R = rotated 90 degrees (clockwise) I = inverted 180 degrees B = read from the bottom up, 270 degrees Default: current ^FW value",
            "choices": [
              "N",
              "R",
              "I",
              "B"
            ],
            "enumValues": [
              "N",
              "R",
              "I",
              "B"
            ],
            "slot": 0,
            "component": 0,
            "syntaxStart": 3,
            "syntaxEnd": 4
          },
          {
            "key": "h",
            "name": "barcode height (in dots)",
            "documentation": "barcode height (in dots). Values: 1 to 32000 Default: value set by ^BY",
            "choices": [
              "100",
              "1",
              "32000"
            ],
            "range": {
              "min": 1.0,
              "max": 32000.0
            },
            "slot": 1,
            "component": 0,
            "syntaxStart": 5,
            "syntaxEnd": 6
          },
          {
            "key": "f",
            "name": "print interpretation line",
            "documentation": "print interpretation line. Values: N = no Y = yes Default: Y",
            "choices": [
              "Y",
              "N"
            ],
            "enumValues": [
              "N",
              "Y"
            ],
            "slot": 2,
            "component": 0,
            "syntaxStart": 7,
            "syntaxEnd": 8
          },
          {
            "key": "g",
            "name": "print interpretation line above code",
            "documentation": "print interpretation line above code. Values: N = no Y = yes Default: N",
            "choices": [
              "N",
              "Y"
            ],
            "enumValues": [
              "N",
              "Y"
            ],
            "slot": 3,
            "component": 0,
            "syntaxStart": 9,
            "syntaxEnd": 10
          },
          {
            "key": "e",
            "name": "print check digit",
            "documentation": "print check digit. Values: N = no Y = yes Default: Y",
            "choices": [
              "Y",
              "N"
            ],
            "enumValues": [
              "N",
              "Y"
            ],
            "slot": 4,
            "component": 0,
            "syntaxStart": 11,
            "syntaxEnd": 12
          }
        ]
      }
    ]
  },
  "^BA": {
    "title": "Code 93 Barcode",
    "summary": "The ^BA command creates a variable length, continuous symbology.",
    "reference": "https://docs.zebra.com/us/en/printers/software/zpl-pg/c-zpl-zpl-commands/r-zpl-ba.html",
    "signatures": [
      {
        "syntax": "^BAo,h,f,g,e",
        "snippet": "^BA${1:N},${2:100},${3:Y},${4:N},${5:N}",
        "parameters": [
          {
            "key": "o",
            "name": "orientation",
            "documentation": "orientation. Values: N = normal R = rotated 90 degrees (clockwise) I = inverted 180 degrees B = read from the bottom up, 270 degrees Default: current ^FW value",
            "choices": [
              "N",
              "R",
              "I",
              "B"
            ],
            "enumValues": [
              "N",
              "R",
              "I",
              "B"
            ],
            "slot": 0,
            "component": 0,
            "syntaxStart": 3,
            "syntaxEnd": 4
          },
          {
            "key": "h",
            "name": "bar code height (in dots)",
            "documentation": "bar code height (in dots). Values: 1 to 32000 Default: value set by ^BY",
            "choices": [
              "100",
              "1",
              "32000"
            ],
            "range": {
              "min": 1.0,
              "max": 32000.0
            },
            "slot": 1,
            "component": 0,
            "syntaxStart": 5,
            "syntaxEnd": 6
          },
          {
            "key": "f",
            "name": "print interpretation line",
            "documentation": "print interpretation line. Values: N = no Y = yes Default: Y",
            "choices": [
              "Y",
              "N"
            ],
            "enumValues": [
              "N",
              "Y"
            ],
            "slot": 2,
            "component": 0,
            "syntaxStart": 7,
            "syntaxEnd": 8
          },
          {
            "key": "g",
            "name": "print interpretation line above code",
            "documentation": "print interpretation line above code. Values: N = no Y = yes Default: N",
            "choices": [
              "N",
              "Y"
            ],
            "enumValues": [
              "N",
              "Y"
            ],
            "slot": 3,
            "component": 0,
            "syntaxStart": 9,
            "syntaxEnd": 10
          },
          {
            "key": "e",
            "name": "print check digit",
            "documentation": "print check digit. Values: N = no Y = yes Default: N",
            "choices": [
              "N",
              "Y"
            ],
            "enumValues": [
              "N",
              "Y"
            ],
            "slot": 4,
            "component": 0,
            "syntaxStart": 11,
            "syntaxEnd": 12
          }
        ]
      }
    ]
  },
  "^BB": {
    "title": "CODABLOCK Barcode",
    "summary": "The ^BB command produces a two-dimensional, multirow, stacked symbology.",
    "reference": "https://docs.zebra.com/us/en/printers/software/zpl-pg/c-zpl-zpl-commands/r-zpl-bb.html",
    "signatures": [
      {
        "syntax": "^BBo,h,s,c,r,m",
        "snippet": "^BB${1:N},${2:8},${3:Y},${4:2},${5:2},${6:F}",
        "parameters": [
          {
            "key": "o",
            "name": "orientation",
            "documentation": "orientation. Values: N = normal R = rotated 90 degrees (clockwise) I = inverted 180 degrees B = read from the bottom up, 270 degrees Default: N",
            "choices": [
              "N",
              "R",
              "I",
              "B"
            ],
            "enumValues": [
              "N",
              "R",
              "I",
              "B"
            ],
            "slot": 0,
            "component": 0,
            "syntaxStart": 3,
            "syntaxEnd": 4
          },
          {
            "key": "h",
            "name": "bar code height for individual rows (in dots)",
            "documentation": "bar code height for individual rows (in dots). Values: 2 to 32000 Default: 8 This number, multiplied by the module, equals the height of the individual row in dots.",
            "choices": [
              "8",
              "2",
              "32000"
            ],
            "range": {
              "min": 2.0,
              "max": 32000.0
            },
            "slot": 1,
            "component": 0,
            "syntaxStart": 5,
            "syntaxEnd": 6
          },
          {
            "key": "s",
            "name": "security level",
            "documentation": "security level. Values: N = no Y = yes Default: Y Security level determines whether symbol check-sums are generated and added to the symbol. Checksums are never generated for single-row symbols. This can be turned off only if the parameter m is set to A .",
            "choices": [
              "Y",
              "N"
            ],
            "enumValues": [
              "N",
              "Y"
            ],
            "slot": 2,
            "component": 0,
            "syntaxStart": 7,
            "syntaxEnd": 8
          },
          {
            "key": "c",
            "name": "number of characters per row (data columns)",
            "documentation": "number of characters per row (data columns). Values: 2 to 62 characters This is used to encode a CODABLOCK symbol. It gives you control over the width of the symbol.",
            "choices": [
              "2",
              "62"
            ],
            "slot": 3,
            "component": 0,
            "syntaxStart": 9,
            "syntaxEnd": 10
          },
          {
            "key": "r",
            "name": "number of rows to encode-",
            "documentation": "number of rows to encode-. Values: for CODABLOCK A: 1 to 22 for CODABLOCK E and F: 2 to 4 If values for c and r are not specified, a single row is produced. If a value for r is not specified, and c exceeds the maximum range, a single row equal to the field data length is produced. If a value for c is not specified, the number of characters per row is derived by dividing the field data by the value of r . If the s parameter is set to the default of Y, then the checksum characters that are included count as two data characters. For example, if c = 6, r is set to 3 and s is set to N, then up to 18 characters can be used (6 x 3). However, if s is set to Y, then only 16 characters can be used. If the data field contains primarily numeric data, fewer than the specified rows might be printed. If the field data contains several shift and code-switch characters, more than the specified number of rows might be printed.",
            "choices": [
              "2"
            ],
            "slot": 4,
            "component": 0,
            "syntaxStart": 11,
            "syntaxEnd": 12
          },
          {
            "key": "m",
            "name": "mode",
            "documentation": "mode. Values: A , E , F CODABLOCK A uses the Code 39 character set. CODABLOCK F uses the Code 128 character set. CODABLOCK E uses the Code 128 character set and automatically adds FNC1. Default: F",
            "choices": [
              "F"
            ],
            "slot": 5,
            "component": 0,
            "syntaxStart": 13,
            "syntaxEnd": 14
          }
        ]
      }
    ]
  },
  "^BC": {
    "title": "Code 128 Barcode (Subsets A, B, and C)",
    "summary": "The ^BC command creates the Code 128 barcode, a high-density, variable length, continuous, alphanumeric symbology.",
    "reference": "https://docs.zebra.com/us/en/printers/software/zpl-pg/c-zpl-zpl-commands/r-zpl-bc.html",
    "signatures": [
      {
        "syntax": "^BCo,h,f,g,e,m",
        "snippet": "^BC${1:N},${2:100},${3:Y},${4:N},${5:N},${6:N}",
        "parameters": [
          {
            "key": "o",
            "name": "orientation",
            "documentation": "orientation. Values: N = normal R = rotated 90 degrees (clockwise) I = inverted 180 degrees B = read from the bottom up, 270 degrees Default: current ^FW value",
            "choices": [
              "N",
              "R",
              "I",
              "B"
            ],
            "enumValues": [
              "N",
              "R",
              "I",
              "B"
            ],
            "slot": 0,
            "component": 0,
            "syntaxStart": 3,
            "syntaxEnd": 4
          },
          {
            "key": "h",
            "name": "barcode height (in dots)",
            "documentation": "barcode height (in dots). Values: 1 to 32000 Default: value set by ^BY",
            "choices": [
              "100",
              "1",
              "32000"
            ],
            "range": {
              "min": 1.0,
              "max": 32000.0
            },
            "slot": 1,
            "component": 0,
            "syntaxStart": 5,
            "syntaxEnd": 6
          },
          {
            "key": "f",
            "name": "print interpretation line",
            "documentation": "print interpretation line. Values: Y (yes) or N (no) Default: Y The interpretation line can be printed in any font by placing the font command before the barcode command.",
            "choices": [
              "Y",
              "N"
            ],
            "enumValues": [
              "Y",
              "N"
            ],
            "slot": 2,
            "component": 0,
            "syntaxStart": 7,
            "syntaxEnd": 8
          },
          {
            "key": "g",
            "name": "print interpretation line above code",
            "documentation": "print interpretation line above code. Values: Y (yes) or N (no) Default: N",
            "choices": [
              "N",
              "Y"
            ],
            "enumValues": [
              "Y",
              "N"
            ],
            "slot": 3,
            "component": 0,
            "syntaxStart": 9,
            "syntaxEnd": 10
          },
          {
            "key": "e",
            "name": "UCC check digit",
            "documentation": "UCC check digit. Values: Y (turns on) or N (turns off) Mod 103 check digit is always there. It cannot be turned on or off. Mod 10 and 103 appear together with e turned on. Default: N",
            "choices": [
              "N",
              "Y"
            ],
            "enumValues": [
              "Y",
              "N"
            ],
            "slot": 4,
            "component": 0,
            "syntaxStart": 11,
            "syntaxEnd": 12
          },
          {
            "key": "m",
            "name": "mode",
            "documentation": "mode. Values: N = no selected mode U = UCC Case Mode More than 19 digits in ^FD or ^SN are eliminated. Fewer than 19 digits in ^FD or ^SN add zeros to the right to bring the count to 19. This produces an invalid interpretation line. A = Automatic Mode This analyzes the data sent and automatically determines the best packing method. The full ASCII character set can be used in the ^FD statement — the printer determines when to shift subsets. A string of four or more numeric digits causes an automatic shift to Subset C. D = UCC/EAN Mode (x.11.x and newer firmware) This allows dealing with UCC/EAN with and without chained application identifiers. The code starts in the appropriate subset followed by FNC1 to indicate a UCC/EAN 128 barcode. The printer automatically strips out parentheses and spaces for encoding but prints them in the human-readable section. The printer automatically determines if a check digit is required, calculates it, and prints it. Automatically sizes the human readable. Default: N",
            "choices": [
              "N",
              "U",
              "A",
              "D"
            ],
            "enumValues": [
              "N",
              "U",
              "A",
              "D"
            ],
            "slot": 5,
            "component": 0,
            "syntaxStart": 13,
            "syntaxEnd": 14
          }
        ]
      }
    ]
  },
  "^BD": {
    "title": "UPS MaxiCode Bar Code",
    "summary": "The ^BD command creates a two-dimensional, optically read (not scanned) code.",
    "reference": "https://docs.zebra.com/us/en/printers/software/zpl-pg/c-zpl-zpl-commands/r-zpl-bd.html",
    "signatures": [
      {
        "syntax": "^BDm,n,t",
        "snippet": "^BD${1:2},${2:1},${3:1}",
        "parameters": [
          {
            "key": "m",
            "name": "mode",
            "documentation": "mode. Values: 2 = structured carrier message: numeric postal code (U.S.) 3 = structured carrier message: alphanumeric postal code (non-U.S.) 4 = standard symbol, secretary 5 = full EEC 6 = reader program, secretary Default: 2",
            "choices": [
              "2",
              "3",
              "4",
              "5",
              "6"
            ],
            "enumValues": [
              "2",
              "3",
              "4",
              "5",
              "6"
            ],
            "slot": 0,
            "component": 0,
            "syntaxStart": 3,
            "syntaxEnd": 4
          },
          {
            "key": "n",
            "name": "symbol number",
            "documentation": "symbol number. Values: 1 to 8 can be added in a structured document Default: 1",
            "choices": [
              "1",
              "8"
            ],
            "range": {
              "min": 1.0,
              "max": 8.0
            },
            "slot": 1,
            "component": 0,
            "syntaxStart": 5,
            "syntaxEnd": 6
          },
          {
            "key": "t",
            "name": "total number of symbols",
            "documentation": "total number of symbols. Values: 1 to 8 , representing the total number of symbols in this sequence Default: 1",
            "choices": [
              "1",
              "8"
            ],
            "range": {
              "min": 1.0,
              "max": 8.0
            },
            "slot": 2,
            "component": 0,
            "syntaxStart": 7,
            "syntaxEnd": 8
          }
        ]
      }
    ]
  },
  "^BE": {
    "title": "EAN-13 Barcode",
    "summary": "The ^BE command is similar to the UPC-A barcode.",
    "reference": "https://docs.zebra.com/us/en/printers/software/zpl-pg/c-zpl-zpl-commands/r-zpl-be.html",
    "signatures": [
      {
        "syntax": "^BEo,h,f,g",
        "snippet": "^BE${1:N},${2:100},${3:Y},${4:N}",
        "parameters": [
          {
            "key": "o",
            "name": "orientation",
            "documentation": "orientation. Value: N = normal R = rotated 90 degrees (clockwise) I = inverted 180 degrees B = read from the bottom up, 270 degrees Default: current ^FW value",
            "choices": [
              "N",
              "R",
              "I",
              "B"
            ],
            "enumValues": [
              "N",
              "R",
              "I",
              "B"
            ],
            "slot": 0,
            "component": 0,
            "syntaxStart": 3,
            "syntaxEnd": 4
          },
          {
            "key": "h",
            "name": "barcode height (in dots)",
            "documentation": "barcode height (in dots). Value: 1 to 32000 Default: value set by ^BY",
            "choices": [
              "100",
              "1",
              "32000"
            ],
            "range": {
              "min": 1.0,
              "max": 32000.0
            },
            "slot": 1,
            "component": 0,
            "syntaxStart": 5,
            "syntaxEnd": 6
          },
          {
            "key": "f",
            "name": "print interpretation line",
            "documentation": "print interpretation line. Value: N = no Y = yes Default: Y",
            "choices": [
              "Y",
              "N"
            ],
            "enumValues": [
              "N",
              "Y"
            ],
            "slot": 2,
            "component": 0,
            "syntaxStart": 7,
            "syntaxEnd": 8
          },
          {
            "key": "g",
            "name": "print interpretation line above code",
            "documentation": "print interpretation line above code. Values: N = no Y = yes Default: N",
            "choices": [
              "N",
              "Y"
            ],
            "enumValues": [
              "N",
              "Y"
            ],
            "slot": 3,
            "component": 0,
            "syntaxStart": 9,
            "syntaxEnd": 10
          }
        ]
      }
    ]
  },
  "^BF": {
    "title": "MicroPDF417 Barcode",
    "summary": "The ^BF command creates a two-dimensional, multi-row, continuous, stacked symbology identical to PDF417, except it replaces the 17-module-wide start and stop patterns and left/right row indicators with a unique set of 10-module-wide…",
    "reference": "https://docs.zebra.com/us/en/printers/software/zpl-pg/c-zpl-zpl-commands/r-zpl-bf.html",
    "signatures": [
      {
        "syntax": "^BFo,h,m",
        "snippet": "^BF${1:N},${2:100},${3:0}",
        "parameters": [
          {
            "key": "o",
            "name": "orientation",
            "documentation": "orientation. Values: N = normal R = rotated 90 degrees (clockwise) I = inverted 180 degrees B = read from the bottom up, 270 degrees Default: current ^FW value",
            "choices": [
              "N",
              "R",
              "I",
              "B"
            ],
            "enumValues": [
              "N",
              "R",
              "I",
              "B"
            ],
            "slot": 0,
            "component": 0,
            "syntaxStart": 3,
            "syntaxEnd": 4
          },
          {
            "key": "h",
            "name": "bar code height (in dots)",
            "documentation": "bar code height (in dots). Values: 1 to 9999 Default: value set by ^BY or 10 (if no ^BY value exists).",
            "choices": [
              "100",
              "10",
              "1",
              "9999"
            ],
            "range": {
              "min": 1.0,
              "max": 9999.0
            },
            "slot": 1,
            "component": 0,
            "syntaxStart": 5,
            "syntaxEnd": 6
          },
          {
            "key": "m",
            "name": "mode",
            "documentation": "mode. Values: 0 to 33 (see Table 1 ) Default: 0 (see Table 1 )",
            "choices": [
              "0",
              "33"
            ],
            "range": {
              "min": 0.0,
              "max": 33.0
            },
            "slot": 2,
            "component": 0,
            "syntaxStart": 7,
            "syntaxEnd": 8
          }
        ]
      }
    ]
  },
  "^BI": {
    "title": "Industrial 2 of 5 Bar Codes",
    "summary": "The ^BI command is a discrete, self-checking, continuous numeric symbology.",
    "reference": "https://docs.zebra.com/us/en/printers/software/zpl-pg/c-zpl-zpl-commands/r-zpl-bi.html",
    "signatures": [
      {
        "syntax": "^BIo,h,f,g",
        "snippet": "^BI${1:N},${2:100},${3:Y},${4:N}",
        "parameters": [
          {
            "key": "o",
            "name": "orientation",
            "documentation": "orientation. Values: N = normal R = rotated 90 degrees (clockwise) I = inverted 180 degrees B = read from the bottom up, 270 degrees Default: current ^FW value",
            "choices": [
              "N",
              "R",
              "I",
              "B"
            ],
            "enumValues": [
              "N",
              "R",
              "I",
              "B"
            ],
            "slot": 0,
            "component": 0,
            "syntaxStart": 3,
            "syntaxEnd": 4
          },
          {
            "key": "h",
            "name": "bar code height (in dots)",
            "documentation": "bar code height (in dots). Values: 1 to 32000 Default: value set by ^BY",
            "choices": [
              "100",
              "1",
              "32000"
            ],
            "range": {
              "min": 1.0,
              "max": 32000.0
            },
            "slot": 1,
            "component": 0,
            "syntaxStart": 5,
            "syntaxEnd": 6
          },
          {
            "key": "f",
            "name": "print interpretation line",
            "documentation": "print interpretation line. Values: N = no Y = yes Default: Y",
            "choices": [
              "Y",
              "N"
            ],
            "enumValues": [
              "N",
              "Y"
            ],
            "slot": 2,
            "component": 0,
            "syntaxStart": 7,
            "syntaxEnd": 8
          },
          {
            "key": "g",
            "name": "print interpretation line above code",
            "documentation": "print interpretation line above code. Values: N = no Y = yes Default: N",
            "choices": [
              "N",
              "Y"
            ],
            "enumValues": [
              "N",
              "Y"
            ],
            "slot": 3,
            "component": 0,
            "syntaxStart": 9,
            "syntaxEnd": 10
          }
        ]
      }
    ]
  },
  "^BJ": {
    "title": "Standard 2 of 5 Bar Code",
    "summary": "The ^BJ command is a discrete, self-checking, continuous numeric symbology.",
    "reference": "https://docs.zebra.com/us/en/printers/software/zpl-pg/c-zpl-zpl-commands/r-zpl-bj.html",
    "signatures": [
      {
        "syntax": "^BJo,h,f,g",
        "snippet": "^BJ${1:N},${2:100},${3:Y},${4:N}",
        "parameters": [
          {
            "key": "o",
            "name": "orientation",
            "documentation": "orientation. Values: N = normal R = rotated 90 degrees (clockwise) I = inverted 180 degrees B = read from the bottom up, 270 degrees Default: current ^FW value",
            "choices": [
              "N",
              "R",
              "I",
              "B"
            ],
            "enumValues": [
              "N",
              "R",
              "I",
              "B"
            ],
            "slot": 0,
            "component": 0,
            "syntaxStart": 3,
            "syntaxEnd": 4
          },
          {
            "key": "h",
            "name": "Barcode height (in dots)",
            "documentation": "Barcode height (in dots). Values: 1 to 32000 Default: value set by ^BY",
            "choices": [
              "100",
              "1",
              "32000"
            ],
            "range": {
              "min": 1.0,
              "max": 32000.0
            },
            "slot": 1,
            "component": 0,
            "syntaxStart": 5,
            "syntaxEnd": 6
          },
          {
            "key": "f",
            "name": "print interpretation line",
            "documentation": "print interpretation line. Values: N = no Y = yes Default: Y",
            "choices": [
              "Y",
              "N"
            ],
            "enumValues": [
              "N",
              "Y"
            ],
            "slot": 2,
            "component": 0,
            "syntaxStart": 7,
            "syntaxEnd": 8
          },
          {
            "key": "g",
            "name": "print interpretation line above code",
            "documentation": "print interpretation line above code. Values: N = no Y = yes Default: N",
            "choices": [
              "N",
              "Y"
            ],
            "enumValues": [
              "N",
              "Y"
            ],
            "slot": 3,
            "component": 0,
            "syntaxStart": 9,
            "syntaxEnd": 10
          }
        ]
      }
    ]
  },
  "^BK": {
    "title": "ANSI Codabar Bar Code",
    "summary": "The ANSI Codabar barcode is used in a variety of information processing applications such as libraries, the medical industry, and overnight package delivery companies.",
    "reference": "https://docs.zebra.com/us/en/printers/software/zpl-pg/c-zpl-zpl-commands/r-zpl-bk.html",
    "signatures": [
      {
        "syntax": "^BKo,e,h,f,g,k,l",
        "snippet": "^BK${1:N},${2:0},${3:100},${4:Y},${5:N},${6:A},${7:A}",
        "parameters": [
          {
            "key": "o",
            "name": "orientation",
            "documentation": "orientation. Values: N = normal R = rotated 90 degrees (clockwise) I = inverted 180 degrees B = read from the bottom up, 270 degrees Default: current ^FW value",
            "choices": [
              "N",
              "R",
              "I",
              "B"
            ],
            "enumValues": [
              "N",
              "R",
              "I",
              "B"
            ],
            "slot": 0,
            "component": 0,
            "syntaxStart": 3,
            "syntaxEnd": 4
          },
          {
            "key": "e",
            "name": "check digit",
            "documentation": "check digit. Fixed Value: N",
            "choices": [
              "0"
            ],
            "slot": 1,
            "component": 0,
            "syntaxStart": 5,
            "syntaxEnd": 6
          },
          {
            "key": "h",
            "name": "Barcode height (in dots)",
            "documentation": "Barcode height (in dots). Values: 1 to 32000 Default: value set by ^BY",
            "choices": [
              "100",
              "1",
              "32000"
            ],
            "range": {
              "min": 1.0,
              "max": 32000.0
            },
            "slot": 2,
            "component": 0,
            "syntaxStart": 7,
            "syntaxEnd": 8
          },
          {
            "key": "f",
            "name": "print interpretation line",
            "documentation": "print interpretation line. Values: N = no Y = yes Default: Y",
            "choices": [
              "Y",
              "N"
            ],
            "enumValues": [
              "N",
              "Y"
            ],
            "slot": 3,
            "component": 0,
            "syntaxStart": 9,
            "syntaxEnd": 10
          },
          {
            "key": "g",
            "name": "print interpretation line above code",
            "documentation": "print interpretation line above code. Values: Y = no Y = yes Default: N",
            "choices": [
              "N",
              "Y"
            ],
            "slot": 4,
            "component": 0,
            "syntaxStart": 11,
            "syntaxEnd": 12
          },
          {
            "key": "k",
            "name": "designates a start character",
            "documentation": "designates a start character. Values: A,B , C , D Default: A",
            "choices": [
              "A",
              "B",
              "C",
              "D"
            ],
            "enumValues": [
              "A",
              "B",
              "C",
              "D"
            ],
            "slot": 5,
            "component": 0,
            "syntaxStart": 13,
            "syntaxEnd": 14
          },
          {
            "key": "l",
            "name": "designates stop character",
            "documentation": "designates stop character. Values: A,B , C , D Default: A",
            "choices": [
              "A",
              "B",
              "C",
              "D"
            ],
            "enumValues": [
              "A",
              "B",
              "C",
              "D"
            ],
            "slot": 6,
            "component": 0,
            "syntaxStart": 15,
            "syntaxEnd": 16
          }
        ]
      }
    ]
  },
  "^BL": {
    "title": "LOGMARS Barcode",
    "summary": "The ^BL command is a special application of Code 39 used by the Department of Defense.",
    "reference": "https://docs.zebra.com/us/en/printers/software/zpl-pg/c-zpl-zpl-commands/r-zpl-bl.html",
    "signatures": [
      {
        "syntax": "^BLo,h,g",
        "snippet": "^BL${1:N},${2:100},${3:N}",
        "parameters": [
          {
            "key": "o",
            "name": "orientation",
            "documentation": "orientation. Values: N = normal R = rotated 90 degrees (clockwise) I = inverted 180 degrees B = read from the bottom up, 270 degrees Default: current ^FW value",
            "choices": [
              "N",
              "R",
              "I",
              "B"
            ],
            "enumValues": [
              "N",
              "R",
              "I",
              "B"
            ],
            "slot": 0,
            "component": 0,
            "syntaxStart": 3,
            "syntaxEnd": 4
          },
          {
            "key": "h",
            "name": "Barcode height (in dots)",
            "documentation": "Barcode height (in dots). Values: 1 to 32000 Default: value set by ^BY",
            "choices": [
              "100",
              "1",
              "32000"
            ],
            "range": {
              "min": 1.0,
              "max": 32000.0
            },
            "slot": 1,
            "component": 0,
            "syntaxStart": 5,
            "syntaxEnd": 6
          },
          {
            "key": "g",
            "name": "print interpretation line above code",
            "documentation": "print interpretation line above code. Values: N = no Y = yes Default: N",
            "choices": [
              "N",
              "Y"
            ],
            "enumValues": [
              "N",
              "Y"
            ],
            "slot": 2,
            "component": 0,
            "syntaxStart": 7,
            "syntaxEnd": 8
          }
        ]
      }
    ]
  },
  "^BM": {
    "title": "MSI Bar Code",
    "summary": "The ^BM command is a pulse-width modulated, continuous, non-self-checking symbology.",
    "reference": "https://docs.zebra.com/us/en/printers/software/zpl-pg/c-zpl-zpl-commands/r-zpl-bm.html",
    "signatures": [
      {
        "syntax": "^BMo,e,h,f,g,e2",
        "snippet": "^BM${1:N},${2:B},${3:100},${4:Y},${5:N},${6:N}",
        "parameters": [
          {
            "key": "o",
            "name": "orientation",
            "documentation": "orientation. Values: N = normal R = rotated 90 degrees (clockwise) I = inverted 180 degrees B = read from the bottom up, 270 degrees Default: current ^FW value",
            "choices": [
              "N",
              "R",
              "I",
              "B"
            ],
            "enumValues": [
              "N",
              "R",
              "I",
              "B"
            ],
            "slot": 0,
            "component": 0,
            "syntaxStart": 3,
            "syntaxEnd": 4
          },
          {
            "key": "e",
            "name": "check digit selection",
            "documentation": "check digit selection. Values: A = no check digits B = 1 Mod 10 C = 2 Mod 10 D = 1 Mod 11 and 1 Mod 10 Default: B",
            "choices": [
              "B",
              "A",
              "C",
              "D"
            ],
            "enumValues": [
              "A",
              "B",
              "C",
              "D"
            ],
            "slot": 1,
            "component": 0,
            "syntaxStart": 5,
            "syntaxEnd": 6
          },
          {
            "key": "h",
            "name": "Barcode height (in dots)",
            "documentation": "Barcode height (in dots). Values: 1 to 32000 Default: value set by ^BY",
            "choices": [
              "100",
              "1",
              "32000"
            ],
            "range": {
              "min": 1.0,
              "max": 32000.0
            },
            "slot": 2,
            "component": 0,
            "syntaxStart": 7,
            "syntaxEnd": 8
          },
          {
            "key": "f",
            "name": "print interpretation line",
            "documentation": "print interpretation line. Values: N = no Y = yes Default: Y",
            "choices": [
              "Y",
              "N"
            ],
            "enumValues": [
              "N",
              "Y"
            ],
            "slot": 3,
            "component": 0,
            "syntaxStart": 9,
            "syntaxEnd": 10
          },
          {
            "key": "g",
            "name": "print interpretation line above code",
            "documentation": "print interpretation line above code. Values: N = no Y = yes Default: N",
            "choices": [
              "N",
              "Y"
            ],
            "enumValues": [
              "N",
              "Y"
            ],
            "slot": 4,
            "component": 0,
            "syntaxStart": 11,
            "syntaxEnd": 12
          },
          {
            "key": "e2",
            "name": "inserts check digit into the interpretation line",
            "documentation": "inserts check digit into the interpretation line. Values: N = no Y = yes Default: N",
            "choices": [
              "N",
              "Y"
            ],
            "enumValues": [
              "N",
              "Y"
            ],
            "slot": 5,
            "component": 0,
            "syntaxStart": 13,
            "syntaxEnd": 15
          }
        ]
      }
    ]
  },
  "^BO": {
    "title": "Aztec Bar Code Parameters",
    "summary": "The ^BO command creates a two-dimensional matrix symbology made up of square modules arranged around a bulls-eye pattern at the center.",
    "reference": "https://docs.zebra.com/us/en/printers/software/zpl-pg/c-zpl-zpl-commands/r-zpl-bo.html",
    "signatures": [
      {
        "syntax": "^BOa,b,c,d,e,f,g",
        "snippet": "^BO${1:N},${2:1},${3:N},${4:0},${5:N},${6:1},${7:0}",
        "parameters": [
          {
            "key": "a",
            "name": "orientation",
            "documentation": "orientation. Values: N = normal R = rotated I = inverted 180 degrees B = read from the bottom up, 270 degrees Default: current ^FW value",
            "choices": [
              "N",
              "R",
              "I",
              "B"
            ],
            "enumValues": [
              "N",
              "R",
              "I",
              "B"
            ],
            "slot": 0,
            "component": 0,
            "syntaxStart": 3,
            "syntaxEnd": 4
          },
          {
            "key": "b",
            "name": "magnification factor",
            "documentation": "magnification factor. Values: 1 to 10 Default: 1 on 150 dpi printers 2 on 200 dpi printers 3 on 300 dpi printers 6 on 600 dpi printers",
            "choices": [
              "1",
              "10"
            ],
            "range": {
              "min": 1.0,
              "max": 10.0
            },
            "slot": 1,
            "component": 0,
            "syntaxStart": 5,
            "syntaxEnd": 6
          },
          {
            "key": "c",
            "name": "extended channel interpretation code indicator",
            "documentation": "extended channel interpretation code indicator. Values: Y = if data contains ECICs N = if data does not contain ECICs. Default: N",
            "choices": [
              "N",
              "Y"
            ],
            "slot": 2,
            "component": 0,
            "syntaxStart": 7,
            "syntaxEnd": 8
          },
          {
            "key": "d",
            "name": "error control and symbol size/type indicator",
            "documentation": "error control and symbol size/type indicator. Values: 0 = default error correction level 01 to 99 = error correction percentage (minimum) 101 to 104 = 1 to 4-layer compact symbol 201 to 232 = 1 to 32-layer full-range symbol 300 = a simple Aztec “Rune” Default: 0",
            "choices": [
              "0",
              "99",
              "104",
              "232",
              "300"
            ],
            "slot": 3,
            "component": 0,
            "syntaxStart": 9,
            "syntaxEnd": 10
          },
          {
            "key": "e",
            "name": "menu symbol indicator",
            "documentation": "menu symbol indicator. Values: Y = if this symbol is to be a menu (barcode reader initialization) symbol N = if it is not a menu symbol Default: N",
            "choices": [
              "N",
              "Y"
            ],
            "slot": 4,
            "component": 0,
            "syntaxStart": 11,
            "syntaxEnd": 12
          },
          {
            "key": "f",
            "name": "number of symbols for structured append",
            "documentation": "number of symbols for structured append. Values: 1 through 26 Default: 1",
            "choices": [
              "1",
              "26"
            ],
            "range": {
              "min": 1.0,
              "max": 26.0
            },
            "slot": 5,
            "component": 0,
            "syntaxStart": 13,
            "syntaxEnd": 14
          },
          {
            "key": "g",
            "name": "optional ID field for structured append",
            "documentation": "optional ID field for structured append. The ID field is a text string with a 24-character maximum Default: no ID",
            "choices": [
              "0"
            ],
            "slot": 6,
            "component": 0,
            "syntaxStart": 15,
            "syntaxEnd": 16
          }
        ]
      }
    ]
  },
  "^BP": {
    "title": "Plessey Barcode",
    "summary": "The ^BP command is a pulse-width modulated, continuous, non-self-checking symbology.",
    "reference": "https://docs.zebra.com/us/en/printers/software/zpl-pg/c-zpl-zpl-commands/r-zpl-bp.html",
    "signatures": [
      {
        "syntax": "^BPo,e,h,f,g",
        "snippet": "^BP${1:N},${2:N},${3:N},${4:Y},${5:N}",
        "parameters": [
          {
            "key": "o",
            "name": "orientation",
            "documentation": "orientation. Values: N = normal R = rotated 90 degrees (clockwise) I = inverted 180 degrees B = read from the bottom up, 270 degrees Default: current ^FW value",
            "choices": [
              "N",
              "R",
              "I",
              "B"
            ],
            "enumValues": [
              "N",
              "R",
              "I",
              "B"
            ],
            "slot": 0,
            "component": 0,
            "syntaxStart": 3,
            "syntaxEnd": 4
          },
          {
            "key": "e",
            "name": "print check digit",
            "documentation": "print check digit. Values: N = no Y = yes Default: N",
            "choices": [
              "N",
              "Y"
            ],
            "enumValues": [
              "N",
              "Y"
            ],
            "slot": 1,
            "component": 0,
            "syntaxStart": 5,
            "syntaxEnd": 6
          },
          {
            "key": "h",
            "name": "barcode height (in dots)",
            "documentation": "barcode height (in dots). Values: N = no Y = yes Default: N",
            "choices": [
              "N",
              "Y"
            ],
            "enumValues": [
              "N",
              "Y"
            ],
            "slot": 2,
            "component": 0,
            "syntaxStart": 7,
            "syntaxEnd": 8
          },
          {
            "key": "f",
            "name": "print interpretation line",
            "documentation": "print interpretation line. Values: N = no Y = yes Default: Y",
            "choices": [
              "Y",
              "N"
            ],
            "enumValues": [
              "N",
              "Y"
            ],
            "slot": 3,
            "component": 0,
            "syntaxStart": 9,
            "syntaxEnd": 10
          },
          {
            "key": "g",
            "name": "print interpretation line above code",
            "documentation": "print interpretation line above code. Values: N = no Y = yes Default: N",
            "choices": [
              "N",
              "Y"
            ],
            "enumValues": [
              "N",
              "Y"
            ],
            "slot": 4,
            "component": 0,
            "syntaxStart": 11,
            "syntaxEnd": 12
          }
        ]
      }
    ]
  },
  "^BQ": {
    "title": "QR Code Barcode",
    "summary": "The ^BQ command produces a matrix symbology consisting of an array of nominally square modules arranged in an overall square pattern.",
    "reference": "https://docs.zebra.com/us/en/printers/software/zpl-pg/c-zpl-zpl-commands/r-zpl-bq.html",
    "signatures": [
      {
        "syntax": "^BQa,b,c,d,e",
        "snippet": "^BQ${1:N},${2:2},${3:1},${4:Q},${5:7}",
        "parameters": [
          {
            "key": "a",
            "name": "field orientation",
            "documentation": "field orientation. Values: normal ( ^FW has no effect on rotation)",
            "choices": [
              "N",
              "R",
              "I",
              "B"
            ],
            "slot": 0,
            "component": 0,
            "syntaxStart": 3,
            "syntaxEnd": 4
          },
          {
            "key": "b",
            "name": "model",
            "documentation": "model. Values: 1 (original) and 2 (enhanced - recommended) Default: 2",
            "choices": [
              "2",
              "1"
            ],
            "enumValues": [
              "1",
              "2"
            ],
            "slot": 1,
            "component": 0,
            "syntaxStart": 5,
            "syntaxEnd": 6
          },
          {
            "key": "c",
            "name": "magnification factor",
            "documentation": "magnification factor. Values: 1 to 100 Default: 1 on 150 dpi printers 2 on 200 dpi printers 3 on 300 dpi printers 6 on 600 dpi printers",
            "choices": [
              "1",
              "100"
            ],
            "range": {
              "min": 1.0,
              "max": 100.0
            },
            "slot": 2,
            "component": 0,
            "syntaxStart": 7,
            "syntaxEnd": 8
          },
          {
            "key": "d",
            "name": "error correction",
            "documentation": "error correction. Values: H = ultra-high reliability level Q = high-reliability level M = standard level L = high-density level Default: Q = if empty M = invalid values",
            "choices": [
              "Q",
              "H",
              "M",
              "L"
            ],
            "enumValues": [
              "H",
              "Q",
              "M",
              "L"
            ],
            "slot": 3,
            "component": 0,
            "syntaxStart": 9,
            "syntaxEnd": 10
          },
          {
            "key": "e",
            "name": "mask value",
            "documentation": "mask value. Values: 0 - 7 Default: 7",
            "choices": [
              "7"
            ],
            "slot": 4,
            "component": 0,
            "syntaxStart": 11,
            "syntaxEnd": 12
          }
        ]
      }
    ]
  },
  "^BR": {
    "title": "GS1 Databar (formerly Reduced Space Symbology)",
    "summary": "The ^BR command is a barcode type for space-constrained identification from EAN International and the Uniform Code Council, Inc.",
    "reference": "https://docs.zebra.com/us/en/printers/software/zpl-pg/c-zpl-zpl-commands/r-zpl-br.html",
    "signatures": [
      {
        "syntax": "^BRa,b,c,d,e,f",
        "snippet": "^BR${1:R},${2:1},${3:2},${4:1},${5:25},${6:22}",
        "parameters": [
          {
            "key": "a",
            "name": "orientation",
            "documentation": "orientation. Values: N = Normal R = Rotated I = Inverted B = Bottom-up Default: R",
            "choices": [
              "R",
              "N",
              "I",
              "B"
            ],
            "enumValues": [
              "N",
              "R",
              "I",
              "B"
            ],
            "slot": 0,
            "component": 0,
            "syntaxStart": 3,
            "syntaxEnd": 4
          },
          {
            "key": "b",
            "name": "symbology type in the GS1 DataBar family",
            "documentation": "symbology type in the GS1 DataBar family. Values: 1 = GS1 DataBar Omnidirectional 2 = GS1 DataBar Truncated 3 = GS1 DataBar Stacked 4 = GS1 DataBar Stacked Omnidirectional 5 = GS1 DataBar Limited 6 = GS1 DataBar Expanded 7 = UPC-A 8 = UPC-E 9 = EAN-13 10 = EAN-8 11 = UCC/EAN-128 and CC-A/B 12 = UCC/EAN-128 and CC-C Default: 1",
            "choices": [
              "1",
              "2",
              "3",
              "4",
              "5",
              "6",
              "7",
              "8",
              "9",
              "10",
              "11",
              "12"
            ],
            "enumValues": [
              "1",
              "2",
              "3",
              "4",
              "5",
              "6",
              "7",
              "8",
              "9",
              "10",
              "11",
              "12"
            ],
            "slot": 1,
            "component": 0,
            "syntaxStart": 5,
            "syntaxEnd": 6
          },
          {
            "key": "c",
            "name": "magnification factor",
            "documentation": "magnification factor. Values: 1 to 10 Default: 24 dot = 6 , 12 dot is 3 , 8 dot and lower is 2 12 dot = 6 , > 8 dot is 3 , 8 dot and less is 2",
            "choices": [
              "2",
              "1",
              "10"
            ],
            "range": {
              "min": 1.0,
              "max": 10.0
            },
            "slot": 2,
            "component": 0,
            "syntaxStart": 7,
            "syntaxEnd": 8
          },
          {
            "key": "d",
            "name": "separator height",
            "documentation": "separator height. Values: 1 or 2 Default: 1",
            "choices": [
              "1",
              "2"
            ],
            "enumValues": [
              "1",
              "2"
            ],
            "slot": 3,
            "component": 0,
            "syntaxStart": 9,
            "syntaxEnd": 10
          },
          {
            "key": "e",
            "name": "Barcode height",
            "documentation": "Barcode height. The bar code height only affects the linear portion of the barcode. Only UCC/EAN and CC-A/B/C. Values: 1 to 32000 dots Default: 25",
            "choices": [
              "25",
              "1",
              "32000"
            ],
            "range": {
              "min": 1.0,
              "max": 32000.0
            },
            "slot": 4,
            "component": 0,
            "syntaxStart": 11,
            "syntaxEnd": 12
          },
          {
            "key": "f",
            "name": "the segment width (GS1 DataBar Expanded only)",
            "documentation": "the segment width (GS1 DataBar Expanded only). Values: 2 to 22 , even numbers only, in segments per line Default: 22",
            "choices": [
              "22",
              "2"
            ],
            "range": {
              "min": 2.0,
              "max": 22.0
            },
            "slot": 5,
            "component": 0,
            "syntaxStart": 13,
            "syntaxEnd": 14
          }
        ]
      }
    ]
  },
  "^BS": {
    "title": "UPC/EAN Extensions",
    "summary": "The ^BS command is the two-digit and five-digit add-on used primarily by publishers to create barcodes for ISBNs (International Standard Book Numbers).",
    "reference": "https://docs.zebra.com/us/en/printers/software/zpl-pg/c-zpl-zpl-commands/r-zpl-bs.html",
    "signatures": [
      {
        "syntax": "^BSo,h,f,g",
        "snippet": "^BS${1:N},${2:100},${3:Y},${4:Y}",
        "parameters": [
          {
            "key": "o",
            "name": "orientation",
            "documentation": "orientation. Values: N = normal R = rotated 90 degrees (clockwise) I = inverted 180 degrees B = read from the bottom up, 270 degrees Default: current ^FW value",
            "choices": [
              "N",
              "R",
              "I",
              "B"
            ],
            "enumValues": [
              "N",
              "R",
              "I",
              "B"
            ],
            "slot": 0,
            "component": 0,
            "syntaxStart": 3,
            "syntaxEnd": 4
          },
          {
            "key": "h",
            "name": "Barcode height (in dots)",
            "documentation": "Barcode height (in dots). Values: 1 to 32000 Default: value set by ^BY",
            "choices": [
              "100",
              "1",
              "32000"
            ],
            "range": {
              "min": 1.0,
              "max": 32000.0
            },
            "slot": 1,
            "component": 0,
            "syntaxStart": 5,
            "syntaxEnd": 6
          },
          {
            "key": "f",
            "name": "print interpretation line",
            "documentation": "print interpretation line. Values: N = no Y = yes Default: Y",
            "choices": [
              "Y",
              "N"
            ],
            "enumValues": [
              "N",
              "Y"
            ],
            "slot": 2,
            "component": 0,
            "syntaxStart": 7,
            "syntaxEnd": 8
          },
          {
            "key": "g",
            "name": "print interpretation line above code",
            "documentation": "print interpretation line above code. Values: N = no Y = yes Default: Y",
            "choices": [
              "Y",
              "N"
            ],
            "enumValues": [
              "N",
              "Y"
            ],
            "slot": 3,
            "component": 0,
            "syntaxStart": 9,
            "syntaxEnd": 10
          }
        ]
      }
    ]
  },
  "^BT": {
    "title": "TLC39 Barcode",
    "summary": "The ^BT bar code is the standard for the TCIF can tag telecommunications equipment.",
    "reference": "https://docs.zebra.com/us/en/printers/software/zpl-pg/c-zpl-zpl-commands/r-zpl-bt.html",
    "signatures": [
      {
        "syntax": "^BTo,w1,r1,h1,w2,h2",
        "snippet": "^BT${1:N},${2:1},${3:2},${4:1},${5:1},${6:1}",
        "parameters": [
          {
            "key": "o",
            "name": "orientation",
            "documentation": "orientation. Values: N = normal R = rotated I = inverted B = bottom up",
            "choices": [
              "N",
              "R",
              "I",
              "B"
            ],
            "enumValues": [
              "N",
              "R",
              "I",
              "B"
            ],
            "slot": 0,
            "component": 0,
            "syntaxStart": 3,
            "syntaxEnd": 4
          },
          {
            "key": "w1",
            "name": "width of the Code 39 bar code",
            "documentation": "width of the Code 39 bar code. Values: (in dots): 1 to 10 Default: (600 dpi printers): 4 Default: (200- and 300 dpi printer): 2",
            "choices": [
              "1",
              "10"
            ],
            "range": {
              "min": 1.0,
              "max": 10.0
            },
            "slot": 1,
            "component": 0,
            "syntaxStart": 5,
            "syntaxEnd": 7
          },
          {
            "key": "r1",
            "name": "wide to narrow bar width ratio the Code 39 bar code",
            "documentation": "wide to narrow bar width ratio the Code 39 bar code. Values: 2.0 to 3.0(increments of 0.1) Default: 2.0",
            "choices": [
              "2",
              "3.0",
              "2.0"
            ],
            "range": {
              "min": 2.0,
              "max": 3.0
            },
            "slot": 2,
            "component": 0,
            "syntaxStart": 8,
            "syntaxEnd": 10
          },
          {
            "key": "h1",
            "name": "height of the Code 39 bar code",
            "documentation": "height of the Code 39 bar code. Values: (in dots): 1 to 9999 Default: (600 dpi printer): 120 Default: (300 dpi printer): 60 Default: (200 dpi printer): 40",
            "choices": [
              "1",
              "9999"
            ],
            "range": {
              "min": 1.0,
              "max": 9999.0
            },
            "slot": 3,
            "component": 0,
            "syntaxStart": 11,
            "syntaxEnd": 13
          },
          {
            "key": "w2",
            "name": "narrow bar width of the MicroPDF417 bar code",
            "documentation": "narrow bar width of the MicroPDF417 bar code. Values: (in dots): 1 to 10 Default: (600 dpi printer): 4 Default: (200- and 300 dpi printers): 2",
            "choices": [
              "1",
              "10"
            ],
            "range": {
              "min": 1.0,
              "max": 10.0
            },
            "slot": 4,
            "component": 0,
            "syntaxStart": 14,
            "syntaxEnd": 16
          },
          {
            "key": "h2",
            "name": "row height of the MicroPDF417 bar code",
            "documentation": "row height of the MicroPDF417 bar code. Values: (in dots): 1 to 255 Default: (600 dpi printer): 8 Default: (200- and 300 dpi printers): 4",
            "choices": [
              "1",
              "255"
            ],
            "range": {
              "min": 1.0,
              "max": 255.0
            },
            "slot": 5,
            "component": 0,
            "syntaxStart": 17,
            "syntaxEnd": 19
          }
        ]
      }
    ]
  },
  "^BU": {
    "title": "UPC-A Barcode",
    "summary": "The ^BU command produces a fixed length, numeric symbology.",
    "reference": "https://docs.zebra.com/us/en/printers/software/zpl-pg/c-zpl-zpl-commands/r-zpl-bu.html",
    "signatures": [
      {
        "syntax": "^BUo,h,f,g,e",
        "snippet": "^BU${1:N},${2:100},${3:Y},${4:N},${5:Y}",
        "parameters": [
          {
            "key": "o",
            "name": "orientation",
            "documentation": "orientation. Values: N = normal R = rotated 90 degrees (clockwise) I = inverted 180 degrees B = read from the bottom up, 270 degrees Default: current ^FW value",
            "choices": [
              "N",
              "R",
              "I",
              "B"
            ],
            "enumValues": [
              "N",
              "R",
              "I",
              "B"
            ],
            "slot": 0,
            "component": 0,
            "syntaxStart": 3,
            "syntaxEnd": 4
          },
          {
            "key": "h",
            "name": "Barcode height (in dots)",
            "documentation": "Barcode height (in dots). Values: 1 to 9999 Default: value set by ^BY",
            "choices": [
              "100",
              "1",
              "9999"
            ],
            "range": {
              "min": 1.0,
              "max": 9999.0
            },
            "slot": 1,
            "component": 0,
            "syntaxStart": 5,
            "syntaxEnd": 6
          },
          {
            "key": "f",
            "name": "print interpretation line",
            "documentation": "print interpretation line. Values: N = no Y = yes Default: Y",
            "choices": [
              "Y",
              "N"
            ],
            "enumValues": [
              "N",
              "Y"
            ],
            "slot": 2,
            "component": 0,
            "syntaxStart": 7,
            "syntaxEnd": 8
          },
          {
            "key": "g",
            "name": "print interpretation line above code",
            "documentation": "print interpretation line above code. Values: N = no Y = yes Default: N",
            "choices": [
              "N",
              "Y"
            ],
            "enumValues": [
              "N",
              "Y"
            ],
            "slot": 3,
            "component": 0,
            "syntaxStart": 9,
            "syntaxEnd": 10
          },
          {
            "key": "e",
            "name": "print check digit",
            "documentation": "print check digit. Values: N = no Y = yes Default: Y",
            "choices": [
              "Y",
              "N"
            ],
            "enumValues": [
              "N",
              "Y"
            ],
            "slot": 4,
            "component": 0,
            "syntaxStart": 11,
            "syntaxEnd": 12
          }
        ]
      }
    ]
  },
  "^BX": {
    "title": "Data Matrix Barcode",
    "summary": "The ^BX command creates a two-dimensional matrix symbology made up of square modules arranged within a perimeter finder pattern.",
    "reference": "https://docs.zebra.com/us/en/printers/software/zpl-pg/c-zpl-zpl-commands/r-zpl-bx.html",
    "signatures": [
      {
        "syntax": "^BXo,h,s,c,r,f,g,a",
        "snippet": "^BX${1:N},${2:0},${3:0},${4:0},${5:0},${6:6},${7:_},${8:1}",
        "parameters": [
          {
            "key": "o",
            "name": "orientation",
            "documentation": "orientation. Values: N = normal R = rotated 90 degrees (clockwise) I = inverted 180 degrees B = read from the bottom up, 270 degrees Default: current ^FW value",
            "choices": [
              "N",
              "R",
              "I",
              "B"
            ],
            "enumValues": [
              "N",
              "R",
              "I",
              "B"
            ],
            "slot": 0,
            "component": 0,
            "syntaxStart": 3,
            "syntaxEnd": 4
          },
          {
            "key": "h",
            "name": "dimensional height of individual symbol elements",
            "documentation": "dimensional height of individual symbol elements. Values: 1 to the width of the label The individual elements are square — this parameter specifies both module and row height. If this parameter is zero (or not given), the h parameter (bar height) in ^BY is used as the approximate symbol height.",
            "choices": [
              "0"
            ],
            "slot": 1,
            "component": 0,
            "syntaxStart": 5,
            "syntaxEnd": 6
          },
          {
            "key": "s",
            "name": "quality level",
            "documentation": "quality level. Values: 0, 50, 80, 100, 140, 200 Default: 0 Quality refers to the amount of data that is added to the symbol for error correction. The AIM specification refers to it as the ECC value. ECC 50, ECC 80, ECC 100, and ECC 140 use convolution encoding; ECC 200 uses Reed-Solomon encoding. For new applications, ECC 200 is recommended. ECC 000-140 should be used only in closed applications where a single party controls both the production and reading of the symbols and is responsible for overall system performance.",
            "choices": [
              "0",
              "50",
              "80",
              "100",
              "140",
              "200"
            ],
            "enumValues": [
              "0",
              "50",
              "80",
              "100",
              "140",
              "200"
            ],
            "slot": 2,
            "component": 0,
            "syntaxStart": 7,
            "syntaxEnd": 8
          },
          {
            "key": "c",
            "name": "columns to encode",
            "documentation": "columns to encode. Values: 9 to 49 Odd values only for quality 0 to 140 (10 to 144); even values only for quality 200. Odd values only for quality 0 to 140 (10 to 144); even values only for quality 200. The number of rows and columns in the symbol is automatically determined. You might want to force the number of rows and columns to a larger value to achieve uniform symbol size. In the current implementation, quality 0 to 140 symbols are square, so the larger of the rows or columns supplied is used to force a symbol to that size. If you attempt to force the data into too small of a symbol, no symbol is printed. If a value greater than 49 is entered, the rows or columns value is set to zero, and the size is determined normally. If an even value is entered, it generates INVALID-P (invalid parameter). If a value is less than 9 but not 0, or if the data is too large for the forced size, no symbol prints; if ^CV is active, INVALID-L prints.",
            "choices": [
              "0",
              "9",
              "49"
            ],
            "range": {
              "min": 9.0,
              "max": 49.0
            },
            "slot": 3,
            "component": 0,
            "syntaxStart": 9,
            "syntaxEnd": 10
          },
          {
            "key": "r",
            "name": "rows to encode",
            "documentation": "rows to encode. Values: 9 to 49",
            "choices": [
              "0",
              "9",
              "49"
            ],
            "range": {
              "min": 9.0,
              "max": 49.0
            },
            "slot": 4,
            "component": 0,
            "syntaxStart": 11,
            "syntaxEnd": 12
          },
          {
            "key": "f",
            "name": "format ID (0 to 6) — not used with quality set at 200",
            "documentation": "format ID (0 to 6) — not used with quality set at 200. Values: 1 = field data is numeric + space (0..9,”) - No \\&’’ 2 = field data is uppercase alphanumeric + space (A..Z,’’) - No \\&’’ 3 = field data is uppercase alphanumeric + space, period, comma, dash, and slash (0..9,A..Z,“.-/”) 4 = field data is upper-case alphanumeric + space (0..9,A..Z,’’) - no \\&’’ 5 = field data is full 128 ASCII 7-bit set 6 = field data is full 256 ISO 8-bit set Default: 6",
            "choices": [
              "6",
              "1",
              "2",
              "3",
              "4",
              "5"
            ],
            "enumValues": [
              "1",
              "2",
              "3",
              "4",
              "5",
              "6"
            ],
            "slot": 5,
            "component": 0,
            "syntaxStart": 13,
            "syntaxEnd": 14
          },
          {
            "key": "g",
            "name": "escape sequence control character",
            "documentation": "escape sequence control character. Values: any character Default: ~ (tilde) This parameter is used only if quality 200 is specified. It is the escape character for embedding special control sequences within the field data. A value must always be specified when using the escape sequence control character. If no value is entered, the command is ignored. The g parameter will continue to be underscore ( _ ) for anyone with firmware version: V60.13.0.12, V60.13.0.12Z, V60.13.0.12B, V60.13.0.12ZB, or later.",
            "choices": [
              "_"
            ],
            "slot": 6,
            "component": 0,
            "syntaxStart": 15,
            "syntaxEnd": 16
          },
          {
            "key": "a",
            "name": "aspect ratio",
            "documentation": "aspect ratio. Values: 1 = square 2 = rectangular Default: 1",
            "choices": [
              "1",
              "2"
            ],
            "enumValues": [
              "1",
              "2"
            ],
            "slot": 7,
            "component": 0,
            "syntaxStart": 17,
            "syntaxEnd": 18
          }
        ]
      }
    ]
  },
  "^BY": {
    "title": "Bar Code Field Default",
    "summary": "The ^BY command is used to change the default values for the module width (in dots), the wide bar to narrow bar width ratio and the bar code height (in dots).",
    "reference": "https://docs.zebra.com/us/en/printers/software/zpl-pg/c-zpl-zpl-commands/r-zpl-by.html",
    "signatures": [
      {
        "syntax": "^BYw,r,h",
        "snippet": "^BY${1:2},${2:3},${3:10}",
        "parameters": [
          {
            "key": "w",
            "name": "module width (in dots)",
            "documentation": "module width (in dots). Values: 1 to 10 Initial Value at Power Up: 2",
            "choices": [
              "2",
              "1",
              "10"
            ],
            "range": {
              "min": 1.0,
              "max": 10.0
            },
            "slot": 0,
            "component": 0,
            "syntaxStart": 3,
            "syntaxEnd": 4
          },
          {
            "key": "r",
            "name": "wide bar to narrow bar width ratio",
            "documentation": "wide bar to narrow bar width ratio. Values: 2.0 to 3.0 , in 0.1 increments This parameter has no effect on fixed-ratio bar codes. Default: 3.0",
            "choices": [
              "3",
              "2.0",
              "3.0"
            ],
            "range": {
              "min": 2.0,
              "max": 3.0
            },
            "slot": 1,
            "component": 0,
            "syntaxStart": 5,
            "syntaxEnd": 6
          },
          {
            "key": "h",
            "name": "bar code height (in dots)",
            "documentation": "bar code height (in dots). Initial Value at Power Up: 10",
            "choices": [
              "10"
            ],
            "slot": 2,
            "component": 0,
            "syntaxStart": 7,
            "syntaxEnd": 8
          }
        ]
      }
    ]
  },
  "^BZ": {
    "title": "Postal Bar Code",
    "summary": "The POSTAL barcode is used to automate the handling of mail.",
    "reference": "https://docs.zebra.com/us/en/printers/software/zpl-pg/c-zpl-zpl-commands/r-zpl-bz.html",
    "signatures": [
      {
        "syntax": "^BZo,h,f,g,t",
        "snippet": "^BZ${1:N},${2:100},${3:N},${4:N},${5:0}",
        "parameters": [
          {
            "key": "o",
            "name": "orientation",
            "documentation": "orientation. Values: N = normal R = rotated 90 degrees (clockwise) I = inverted 180 degrees B = read from the bottom up, 270 degrees Default: current ^FW value",
            "choices": [
              "N",
              "R",
              "I",
              "B"
            ],
            "enumValues": [
              "N",
              "R",
              "I",
              "B"
            ],
            "slot": 0,
            "component": 0,
            "syntaxStart": 3,
            "syntaxEnd": 4
          },
          {
            "key": "h",
            "name": "Barcode height (in dots)",
            "documentation": "Barcode height (in dots). Values: 1 to 32000 Default: value set by ^BY",
            "choices": [
              "100",
              "1",
              "32000"
            ],
            "range": {
              "min": 1.0,
              "max": 32000.0
            },
            "slot": 1,
            "component": 0,
            "syntaxStart": 5,
            "syntaxEnd": 6
          },
          {
            "key": "f",
            "name": "print interpretation line",
            "documentation": "print interpretation line. Values: N = no Y = yes Default: N",
            "choices": [
              "N",
              "Y"
            ],
            "enumValues": [
              "N",
              "Y"
            ],
            "slot": 2,
            "component": 0,
            "syntaxStart": 7,
            "syntaxEnd": 8
          },
          {
            "key": "g",
            "name": "print interpretation line above code",
            "documentation": "print interpretation line above code. Values: N = no Y = yes Default: N",
            "choices": [
              "N",
              "Y"
            ],
            "enumValues": [
              "N",
              "Y"
            ],
            "slot": 3,
            "component": 0,
            "syntaxStart": 9,
            "syntaxEnd": 10
          },
          {
            "key": "t",
            "name": "Postal code type",
            "documentation": "Postal code type. Values: 0 = Postnet barcode 1 = Plant barcode 2 = Reserved 3 = USPS Intelligent Mail barcode Default: 0",
            "choices": [
              "0",
              "1",
              "2",
              "3"
            ],
            "enumValues": [
              "0",
              "1",
              "2",
              "3"
            ],
            "slot": 4,
            "component": 0,
            "syntaxStart": 11,
            "syntaxEnd": 12
          }
        ]
      }
    ]
  },
  "^CC": {
    "title": "Change Caret",
    "summary": "The ^CC command is used to change the format command prefix.",
    "reference": "https://docs.zebra.com/us/en/printers/software/zpl-pg/c-zpl-zpl-commands/r-zpl-cc-cc.html",
    "signatures": [
      {
        "syntax": "^CCx",
        "snippet": "^CC${1:_}",
        "parameters": [
          {
            "key": "x",
            "name": "caret character change",
            "documentation": "caret character change. Values: any ASCII character Default: a parameter is required. If a parameter is not entered, the next character received is the new prefix character.",
            "choices": [
              "_"
            ],
            "slot": 0,
            "component": 0,
            "syntaxStart": 3,
            "syntaxEnd": 4
          }
        ]
      }
    ]
  },
  "~CC": {
    "title": "Change Caret",
    "summary": "The ^CC command is used to change the format command prefix.",
    "reference": "https://docs.zebra.com/us/en/printers/software/zpl-pg/c-zpl-zpl-commands/r-zpl-cc-cc.html",
    "signatures": [
      {
        "syntax": "~CCx",
        "snippet": "~CC${1:_}",
        "parameters": [
          {
            "key": "x",
            "name": "caret character change",
            "documentation": "caret character change. Values: any ASCII character Default: a parameter is required. If a parameter is not entered, the next character received is the new prefix character.",
            "choices": [
              "_"
            ],
            "slot": 0,
            "component": 0,
            "syntaxStart": 3,
            "syntaxEnd": 4
          }
        ]
      }
    ]
  },
  "^CD": {
    "title": "Change Delimiter",
    "summary": "The ^CD and ~CD commands are used to change the delimiter character.",
    "reference": "https://docs.zebra.com/us/en/printers/software/zpl-pg/c-zpl-zpl-commands/r-zpl-cd-cd.html",
    "signatures": [
      {
        "syntax": "^CDa",
        "snippet": "^CD${1:_}",
        "parameters": [
          {
            "key": "a",
            "name": "delimiter character change",
            "documentation": "delimiter character change. Values: any ASCII character Default: a parameter is required. If a parameter is not entered, the next character received is the new prefix character.",
            "choices": [
              "_"
            ],
            "slot": 0,
            "component": 0,
            "syntaxStart": 3,
            "syntaxEnd": 4
          }
        ]
      }
    ]
  },
  "~CD": {
    "title": "Change Delimiter",
    "summary": "The ^CD and ~CD commands are used to change the delimiter character.",
    "reference": "https://docs.zebra.com/us/en/printers/software/zpl-pg/c-zpl-zpl-commands/r-zpl-cd-cd.html",
    "signatures": [
      {
        "syntax": "~CDa",
        "snippet": "~CD${1:_}",
        "parameters": [
          {
            "key": "a",
            "name": "delimiter character change",
            "documentation": "delimiter character change. Values: any ASCII character Default: a parameter is required. If a parameter is not entered, the next character received is the new prefix character.",
            "choices": [
              "_"
            ],
            "slot": 0,
            "component": 0,
            "syntaxStart": 3,
            "syntaxEnd": 4
          }
        ]
      }
    ]
  },
  "^CF": {
    "title": "Change the Alphanumeric Default Font",
    "summary": "The ^CF command sets the default font used in your printer.",
    "reference": "https://docs.zebra.com/us/en/printers/software/zpl-pg/c-zpl-zpl-commands/r-zpl-cf.html",
    "signatures": [
      {
        "syntax": "^CFf,h,w",
        "snippet": "^CF${1:A},${2:9},${3:5}",
        "parameters": [
          {
            "key": "f",
            "name": "specified default font",
            "documentation": "specified default font. Values: A through Z and 0 to 9 Initial Value at Power Up: A",
            "choices": [
              "A",
              "0",
              "9"
            ],
            "range": {
              "min": 0.0,
              "max": 9.0
            },
            "slot": 0,
            "component": 0,
            "syntaxStart": 3,
            "syntaxEnd": 4
          },
          {
            "key": "h",
            "name": "individual character height (in dots)",
            "documentation": "individual character height (in dots). Values: 0 to 32000 Initial Value at Power Up: 9",
            "choices": [
              "9",
              "0",
              "32000"
            ],
            "range": {
              "min": 0.0,
              "max": 32000.0
            },
            "slot": 1,
            "component": 0,
            "syntaxStart": 5,
            "syntaxEnd": 6
          },
          {
            "key": "w",
            "name": "individual character width (in dots)",
            "documentation": "individual character width (in dots). Values: 0 to 32000 Initial Value at Power Up: 5 or last permanent saved value",
            "choices": [
              "5",
              "0",
              "32000"
            ],
            "range": {
              "min": 0.0,
              "max": 32000.0
            },
            "slot": 2,
            "component": 0,
            "syntaxStart": 7,
            "syntaxEnd": 8
          }
        ]
      }
    ]
  },
  "^CI": {
    "title": "Change International Font/Encoding",
    "summary": "The ^CI command enables you to call up the international character set you want to use for printing.",
    "reference": "https://docs.zebra.com/us/en/printers/software/zpl-pg/c-zpl-zpl-commands/r-zpl-ci.html",
    "signatures": [
      {
        "syntax": "^CIa,s1,d1,s2,d2,...",
        "snippet": "^CI${1:0},${2:0},${3:0},${4:0},${5:0},${6:0}",
        "parameters": [
          {
            "key": "a",
            "name": "desired character set",
            "documentation": "Selects the international character set or encoding. Common values include 0 (Code Page 850 variants), 13 (Code Page 850), 27 (Code Page 1252), 28 (UTF-8), 29 (UTF-16 big-endian), 30 (UTF-16 little-endian), 31 (Code Page 1250), and 33 through 36 for additional Windows code pages. Selects the international character set or encoding. Common values include 0 (Code Page 850 variants), 13 (Code Page 850), 27 (Code Page 1252), 28 (UTF-8), 29 (UTF-16 big-endian), 30 (UTF-16 little-endian), 31 (Code Page 1250), and 33 through 36 for additional Windows code pages.",
            "choices": [
              "0",
              "1",
              "2",
              "3",
              "4",
              "5",
              "6",
              "7",
              "8",
              "9",
              "10",
              "11",
              "12",
              "13",
              "14",
              "15",
              "16",
              "17",
              "24",
              "26",
              "27",
              "28",
              "29",
              "30"
            ],
            "enumValues": [
              "0",
              "1",
              "2",
              "3",
              "4",
              "5",
              "6",
              "7",
              "8",
              "9",
              "10",
              "11",
              "12",
              "13",
              "14",
              "15",
              "16",
              "17",
              "24",
              "26",
              "27",
              "28",
              "29",
              "30",
              "31",
              "33",
              "34",
              "35",
              "36"
            ],
            "slot": 0,
            "component": 0,
            "syntaxStart": 3,
            "syntaxEnd": 4
          },
          {
            "key": "s1",
            "name": "source 1 (character output image)",
            "documentation": "source 1 (character output image). Values: decimals 0 to 255",
            "choices": [
              "0",
              "255"
            ],
            "range": {
              "min": 0.0,
              "max": 255.0
            },
            "slot": 1,
            "component": 0,
            "syntaxStart": 5,
            "syntaxEnd": 7
          },
          {
            "key": "d1",
            "name": "destination 1 (character input)",
            "documentation": "destination 1 (character input). Values: decimals 0 to 255",
            "choices": [
              "0",
              "255"
            ],
            "range": {
              "min": 0.0,
              "max": 255.0
            },
            "slot": 2,
            "component": 0,
            "syntaxStart": 8,
            "syntaxEnd": 10
          },
          {
            "key": "s2",
            "name": "source 2 (character output image)",
            "documentation": "source 2 (character output image). Values: decimals 0 to 255",
            "choices": [
              "0",
              "255"
            ],
            "range": {
              "min": 0.0,
              "max": 255.0
            },
            "slot": 3,
            "component": 0,
            "syntaxStart": 11,
            "syntaxEnd": 13
          },
          {
            "key": "d2",
            "name": "destination 2 (character input)",
            "documentation": "destination 2 (character input). Values: decimals 0 to 255",
            "choices": [
              "0",
              "255"
            ],
            "range": {
              "min": 0.0,
              "max": 255.0
            },
            "slot": 4,
            "component": 0,
            "syntaxStart": 14,
            "syntaxEnd": 16
          },
          {
            "key": "...",
            "name": "continuation of pattern",
            "documentation": "continuation of pattern. Up to 256 source and destination pairs can be entered in this command.",
            "choices": [
              "0"
            ],
            "repeatable": true,
            "slot": 5,
            "component": 0,
            "syntaxStart": 17,
            "syntaxEnd": 20
          }
        ]
      }
    ]
  },
  "^CM": {
    "title": "Change Memory Letter Designation",
    "summary": "The ^CM command allows you to reassign a letter designation to the printer’s memory devices.",
    "reference": "https://docs.zebra.com/us/en/printers/software/zpl-pg/c-zpl-zpl-commands/r-zpl-cm.html",
    "signatures": [
      {
        "syntax": "^CMa,b,c,d,e",
        "snippet": "^CM${1:B:},${2:E:},${3:R:},${4:A:},${5:M}",
        "parameters": [
          {
            "key": "a",
            "name": "memory alias for B:",
            "documentation": "memory alias for B:. Values: B: , E: , R: , A: , and NONE Default: B:",
            "choices": [
              "B:"
            ],
            "slot": 0,
            "component": 0,
            "syntaxStart": 3,
            "syntaxEnd": 4
          },
          {
            "key": "b",
            "name": "memory alias for E:",
            "documentation": "memory alias for E:. Values: B: , E: , R: , A: , and NONE Default: E:",
            "choices": [
              "E:"
            ],
            "slot": 1,
            "component": 0,
            "syntaxStart": 5,
            "syntaxEnd": 6
          },
          {
            "key": "c",
            "name": "memory alias for R:",
            "documentation": "memory alias for R:. Values: B: , E: , R: , A: , and NONE Default: R:",
            "choices": [
              "R:"
            ],
            "slot": 2,
            "component": 0,
            "syntaxStart": 7,
            "syntaxEnd": 8
          },
          {
            "key": "d",
            "name": "memory alias for A:",
            "documentation": "memory alias for A:. Values: B: , E: , R: , A: , and NONE Default: A:",
            "choices": [
              "A:"
            ],
            "slot": 3,
            "component": 0,
            "syntaxStart": 9,
            "syntaxEnd": 10
          },
          {
            "key": "e",
            "name": "multiple alias",
            "documentation": "multiple alias. Values: M , or no value Default: no value This parameter is supported on Xi4 and ZM400/ZM600 printers using firmware V53.17.7Z or later. This parameter is supported on G-Series printers using firmware versions v56.17.7Z and v61.17.7Z or later. This parameter is supported on printers using firmware V60.17.7Z or later.",
            "choices": [
              "M"
            ],
            "slot": 4,
            "component": 0,
            "syntaxStart": 11,
            "syntaxEnd": 12
          }
        ]
      }
    ]
  },
  "^CN": {
    "title": "Cut Now",
    "summary": "The ^CN causes the printer to cycle the media cutter.",
    "reference": "https://docs.zebra.com/us/en/printers/software/zpl-pg/c-zpl-zpl-commands/r-zpl-cn.html",
    "signatures": [
      {
        "syntax": "^CNa",
        "snippet": "^CN${1:0}",
        "parameters": [
          {
            "key": "a",
            "name": "Cut Mode Override",
            "documentation": "Cut Mode Override. Values: 0 = Use the “kiosk cut amount” setting from ^KV 1 = Ignore “kiosk cut amount” from ^KV and do a full cut Default: none The command is ignored if parameters are missing or invalid.",
            "choices": [
              "0",
              "1"
            ],
            "enumValues": [
              "0",
              "1"
            ],
            "slot": 0,
            "component": 0,
            "syntaxStart": 3,
            "syntaxEnd": 4
          }
        ]
      }
    ]
  },
  "^CO": {
    "title": "Cache On",
    "summary": "The ^CO command is used to change the size of the character cache.",
    "reference": "https://docs.zebra.com/us/en/printers/software/zpl-pg/c-zpl-zpl-commands/r-zpl-co.html",
    "signatures": [
      {
        "syntax": "^COa,b,c",
        "snippet": "^CO${1:Y},${2:40},${3:0}",
        "parameters": [
          {
            "key": "a",
            "name": "cache on",
            "documentation": "cache on. Values: N = no Y = yes Default: Y",
            "choices": [
              "Y",
              "N"
            ],
            "enumValues": [
              "N",
              "Y"
            ],
            "slot": 0,
            "component": 0,
            "syntaxStart": 3,
            "syntaxEnd": 4
          },
          {
            "key": "b",
            "name": "amount of additional memory to be added to cache (in K)",
            "documentation": "amount of additional memory to be added to cache (in K). Values: 1 to 9999 Default: 40",
            "choices": [
              "40",
              "1",
              "9999"
            ],
            "range": {
              "min": 1.0,
              "max": 9999.0
            },
            "slot": 1,
            "component": 0,
            "syntaxStart": 5,
            "syntaxEnd": 6
          },
          {
            "key": "c",
            "name": "cache type",
            "documentation": "cache type. Values: 0 = cache buffer (normal fonts) 1 = internal buffer (recommended for Asian fonts) Default: 0",
            "choices": [
              "0",
              "1"
            ],
            "enumValues": [
              "0",
              "1"
            ],
            "slot": 2,
            "component": 0,
            "syntaxStart": 7,
            "syntaxEnd": 8
          }
        ]
      }
    ]
  },
  "^CP": {
    "title": "Remove Label",
    "summary": "The ^CP command causes the printer to move a printed label out of the presenter area in one of several ways.",
    "reference": "https://docs.zebra.com/us/en/printers/software/zpl-pg/c-zpl-zpl-commands/r-zpl-cp.html",
    "signatures": [
      {
        "syntax": "^CPa",
        "snippet": "^CP${1:0}",
        "parameters": [
          {
            "key": "a",
            "name": "kiosk present mode",
            "documentation": "kiosk present mode. Values: 0 = Eject presented page 1 = Retracts presented page 2 = Takes the action defined by c parameter of ^KV command. Default: none The command is ignored if parameters are missing or invalid.",
            "choices": [
              "0",
              "1",
              "2"
            ],
            "enumValues": [
              "0",
              "1",
              "2"
            ],
            "slot": 0,
            "component": 0,
            "syntaxStart": 3,
            "syntaxEnd": 4
          }
        ]
      }
    ]
  },
  "^CT": {
    "title": "Change Tilde",
    "summary": "The ^CT and ~CT commands are used to change the control command prefix.",
    "reference": "https://docs.zebra.com/us/en/printers/software/zpl-pg/c-zpl-zpl-commands/r-zpl-ct-ct.html",
    "signatures": [
      {
        "syntax": "^CTa",
        "snippet": "^CT${1:_}",
        "parameters": [
          {
            "key": "a",
            "name": "change control command character",
            "documentation": "change control command character. Values: any ASCII character Default: a parameter is required. If a parameter is not entered, the next character received is the new control command character.",
            "choices": [
              "_"
            ],
            "slot": 0,
            "component": 0,
            "syntaxStart": 3,
            "syntaxEnd": 4
          }
        ]
      }
    ]
  },
  "~CT": {
    "title": "Change Tilde",
    "summary": "The ^CT and ~CT commands are used to change the control command prefix.",
    "reference": "https://docs.zebra.com/us/en/printers/software/zpl-pg/c-zpl-zpl-commands/r-zpl-ct-ct.html",
    "signatures": [
      {
        "syntax": "~CTa",
        "snippet": "~CT${1:_}",
        "parameters": [
          {
            "key": "a",
            "name": "change control command character",
            "documentation": "change control command character. Values: any ASCII character Default: a parameter is required. If a parameter is not entered, the next character received is the new control command character.",
            "choices": [
              "_"
            ],
            "slot": 0,
            "component": 0,
            "syntaxStart": 3,
            "syntaxEnd": 4
          }
        ]
      }
    ]
  },
  "^CV": {
    "title": "Code Validation",
    "summary": "The ^CV command acts as a switch to turn the code validation function on and off.",
    "reference": "https://docs.zebra.com/us/en/printers/software/zpl-pg/c-zpl-zpl-commands/r-zpl-cv.html",
    "signatures": [
      {
        "syntax": "^CVa",
        "snippet": "^CV${1:N}",
        "parameters": [
          {
            "key": "a",
            "name": "code validation",
            "documentation": "code validation. Values: N = no Y = yes Default: N",
            "choices": [
              "N",
              "Y"
            ],
            "enumValues": [
              "N",
              "Y"
            ],
            "slot": 0,
            "component": 0,
            "syntaxStart": 3,
            "syntaxEnd": 4
          }
        ]
      }
    ]
  },
  "^CW": {
    "title": "Font Identifier",
    "summary": "All built-in fonts are referenced using a one-character identifier.",
    "reference": "https://docs.zebra.com/us/en/printers/software/zpl-pg/c-zpl-zpl-commands/r-zpl-cw.html",
    "signatures": [
      {
        "syntax": "^CWa,d:o.x",
        "snippet": "^CW${1:0},${2:R}:${3:OBJECT}.${4:FNT}",
        "parameters": [
          {
            "key": "a",
            "name": "letter of existing font to be substituted, or new font to be added",
            "documentation": "letter of existing font to be substituted, or new font to be added. Values: A through Z and 0 to 9 Default: a one-character entry is required",
            "choices": [
              "0",
              "9"
            ],
            "range": {
              "min": 0.0,
              "max": 9.0
            },
            "slot": 0,
            "component": 0,
            "syntaxStart": 3,
            "syntaxEnd": 4
          },
          {
            "key": "d",
            "name": "device to store font in (optional)",
            "documentation": "device to store font in (optional). Values: R: , E: , B: , and A: Default: R:",
            "choices": [
              "R:"
            ],
            "slot": 1,
            "component": 0,
            "syntaxStart": 5,
            "syntaxEnd": 6
          },
          {
            "key": "o",
            "name": "name of the downloaded font to be substituted for the built-in, or as an additional font",
            "documentation": "name of the downloaded font to be substituted for the built-in, or as an additional font. Values: any name up to 8 characters Default: if a name is not specified, UNKNOWN is used",
            "choices": [
              "OBJECT"
            ],
            "slot": 1,
            "component": 1,
            "syntaxStart": 7,
            "syntaxEnd": 8
          },
          {
            "key": "x",
            "name": "extension .TTE is only supported in firmware version V60.14.x, V50.14.x, or later.",
            "documentation": "extension .TTE is only supported in firmware version V60.14.x, V50.14.x, or later. Values: .FNT = Font .TTF = TrueType Font .TTE = TrueType Extension",
            "choices": [
              "FNT",
              "GRF"
            ],
            "slot": 1,
            "component": 2,
            "syntaxStart": 9,
            "syntaxEnd": 10
          }
        ]
      }
    ]
  },
  "~DB": {
    "title": "Download Bitmap Font",
    "summary": "The ~DB command sets the printer to receive a downloaded bitmap font and defines native cell size, baseline, space size, and copyright.",
    "reference": "https://docs.zebra.com/us/en/printers/software/zpl-pg/c-zpl-zpl-commands/r-zpl-db.html",
    "signatures": [
      {
        "syntax": "~DBd:o.x,a,h,w,base,space,#char,©,data",
        "snippet": "~DB${1:R}:${2:FONT}.${3:FNT},${4:N},${5:24},${6:16},${7:20},${8:10},${9:1},${10:ZPLR},${11:data}",
        "parameters": [
          {
            "key": "d",
            "name": "drive to store font",
            "documentation": "drive to store font. Values: R: , E: , B: , and A: Default: R:",
            "choices": [
              "R:"
            ],
            "slot": 0,
            "component": 0,
            "syntaxStart": 3,
            "syntaxEnd": 4
          },
          {
            "key": "o",
            "name": "name of font",
            "documentation": "name of font. Values: 1 to 8 alphanumeric characters Default: if a name is not specified, UNKNOWN is used",
            "choices": [
              "FONT"
            ],
            "slot": 0,
            "component": 1,
            "syntaxStart": 5,
            "syntaxEnd": 6
          },
          {
            "key": "x",
            "name": "extension",
            "documentation": "extension. Format: .FNT",
            "choices": [
              "FNT"
            ],
            "slot": 0,
            "component": 2,
            "syntaxStart": 7,
            "syntaxEnd": 8
          },
          {
            "key": "a",
            "name": "orientation of native font",
            "documentation": "orientation of native font. Fixed Value: normal",
            "choices": [
              "N",
              "R",
              "I",
              "B"
            ],
            "slot": 1,
            "component": 0,
            "syntaxStart": 9,
            "syntaxEnd": 10
          },
          {
            "key": "h",
            "name": "maximum height of cell (in dots)",
            "documentation": "maximum height of cell (in dots). Values: 1 to 32000 Default: a value must be specified",
            "choices": [
              "24"
            ],
            "range": {
              "min": 1.0,
              "max": 32000.0
            },
            "slot": 2,
            "component": 0,
            "syntaxStart": 11,
            "syntaxEnd": 12
          },
          {
            "key": "w",
            "name": "maximum width of cell (in dots)",
            "documentation": "maximum width of cell (in dots). Values: 1 to 32000 Default: a value must be specified",
            "choices": [
              "16"
            ],
            "range": {
              "min": 1.0,
              "max": 32000.0
            },
            "slot": 3,
            "component": 0,
            "syntaxStart": 13,
            "syntaxEnd": 14
          },
          {
            "key": "base",
            "name": "dots from top of cell to character baseline",
            "documentation": "dots from top of cell to character baseline. Values: 1 to 32000 Default: a value must be specified",
            "choices": [
              "20"
            ],
            "range": {
              "min": 1.0,
              "max": 32000.0
            },
            "slot": 4,
            "component": 0,
            "syntaxStart": 15,
            "syntaxEnd": 19
          },
          {
            "key": "space",
            "name": "width of space or non-existent characters",
            "documentation": "width of space or non-existent characters. Values: 1 to 32000 Default: a value must be specified",
            "choices": [
              "10"
            ],
            "range": {
              "min": 1.0,
              "max": 32000.0
            },
            "slot": 5,
            "component": 0,
            "syntaxStart": 20,
            "syntaxEnd": 25
          },
          {
            "key": "#char",
            "name": "number of characters in font",
            "documentation": "number of characters in font. Values: 1 to 256 (must match the characters being downloaded) Default: a value must be specified",
            "choices": [
              "1"
            ],
            "slot": 6,
            "component": 0,
            "syntaxStart": 26,
            "syntaxEnd": 31
          },
          {
            "key": "©",
            "name": "copyright holder",
            "documentation": "copyright holder. Values: 1 to 63 alphanumeric characters Default: a value must be specified",
            "choices": [
              "ZPLR"
            ],
            "slot": 7,
            "component": 0,
            "syntaxStart": 32,
            "syntaxEnd": 33
          },
          {
            "key": "data",
            "name": "structured ASCII data that defines each character in the font",
            "documentation": "structured ASCII data that defines each character in the font. The # symbol signifies character code parameters, which are separated with periods. The character code is from 1 to 4 characters to allow for large international character sets to be downloaded to the printer. The data structure is: #xxxx.h.w.x.y.i.data #xxxx = character code h = bitmap height (in dot rows) w = bitmap width (in dot rows) x = x-offset (in dots) y = y-offset (in dots) i = typesetting motion displacement (width, including inter character gap of a particular character in the font) data = hexadecimal bitmap description",
            "choices": [
              "data"
            ],
            "slot": 8,
            "component": 0,
            "syntaxStart": 34,
            "syntaxEnd": 38
          }
        ]
      }
    ]
  },
  "~DE": {
    "title": "Download Encoding",
    "summary": "The ~DE command is used to download character encoding translation tables to a printer.",
    "reference": "https://docs.zebra.com/us/en/printers/software/zpl-pg/c-zpl-zpl-commands/r-zpl-de.html",
    "signatures": [
      {
        "syntax": "~DEd:o.x,s,data",
        "snippet": "~DE${1:R}:${2:OBJECT}.${3:DAT},${4:0},${5:text}",
        "parameters": [
          {
            "key": "d",
            "name": "location of table",
            "documentation": "location of table. Values: R: , E: , B: , and A: Default: R:",
            "choices": [
              "R:"
            ],
            "slot": 0,
            "component": 0,
            "syntaxStart": 3,
            "syntaxEnd": 4
          },
          {
            "key": "o",
            "name": "name of table",
            "documentation": "name of table. Values: any valid name, up to 8 characters Default: if a name is not specified, UNKNOWN is used",
            "choices": [
              "OBJECT"
            ],
            "slot": 0,
            "component": 1,
            "syntaxStart": 5,
            "syntaxEnd": 6
          },
          {
            "key": "x",
            "name": "extension",
            "documentation": "extension. Format: .DAT",
            "choices": [
              "DAT",
              "GRF"
            ],
            "slot": 0,
            "component": 2,
            "syntaxStart": 7,
            "syntaxEnd": 8
          },
          {
            "key": "s",
            "name": "table size",
            "documentation": "table size. Values: the number of memory bytes required to hold the Zebra downloadable format of the font Default: if an incorrect value or no value is entered, the command is ignored",
            "choices": [
              "0"
            ],
            "slot": 1,
            "component": 0,
            "syntaxStart": 9,
            "syntaxEnd": 10
          },
          {
            "key": "data",
            "name": "data string",
            "documentation": "data string. Values: a string of ASCII hexadecimal values Default: if no data is entered, the command is ignored",
            "choices": [
              "text",
              "data"
            ],
            "slot": 2,
            "component": 0,
            "syntaxStart": 11,
            "syntaxEnd": 15
          }
        ]
      }
    ]
  },
  "^DF": {
    "title": "Download Format",
    "summary": "The ^DF command saves ZPL II format commands as text strings to be later merged using ^XF with variable data.",
    "reference": "https://docs.zebra.com/us/en/printers/software/zpl-pg/c-zpl-zpl-commands/r-zpl-df.html",
    "signatures": [
      {
        "syntax": "^DFd:o.x",
        "snippet": "^DF${1:R}:${2:OBJECT}.${3:ZPL}",
        "parameters": [
          {
            "key": "d",
            "name": "device to store the image",
            "documentation": "device to store the image. Values: R: , E: , B: , and A: Default: R:",
            "choices": [
              "R:"
            ],
            "slot": 0,
            "component": 0,
            "syntaxStart": 3,
            "syntaxEnd": 4
          },
          {
            "key": "o",
            "name": "image name",
            "documentation": "image name. Values: 1 to 16 alphanumeric characters with a file type of 1 to 3 alphanumeric characters separated by a \".\" Default: if a name is not specified, UNKNOWN is used.",
            "choices": [
              "OBJECT",
              "1",
              "16"
            ],
            "slot": 0,
            "component": 1,
            "syntaxStart": 5,
            "syntaxEnd": 6
          },
          {
            "key": "x",
            "name": "extension",
            "documentation": "extension. Format: .ZPL",
            "choices": [
              "ZPL",
              "GRF"
            ],
            "slot": 0,
            "component": 2,
            "syntaxStart": 7,
            "syntaxEnd": 8
          }
        ]
      }
    ]
  },
  "~DG": {
    "title": "Download Graphics",
    "summary": "The ~DG command downloads an ASCII Hex representation of a graphic image.",
    "reference": "https://docs.zebra.com/us/en/printers/software/zpl-pg/c-zpl-zpl-commands/r-zpl-dg.html",
    "signatures": [
      {
        "syntax": "~DGd:o.x,t,w,data",
        "snippet": "~DG${1:R}:${2:OBJECT}.${3:GRF},${4:0},${5:0},${6:text}",
        "parameters": [
          {
            "key": "d",
            "name": "device to store the image",
            "documentation": "device to store the image. Values: R: , E: , B: , and A: Default: R:",
            "choices": [
              "R:"
            ],
            "slot": 0,
            "component": 0,
            "syntaxStart": 3,
            "syntaxEnd": 4
          },
          {
            "key": "o",
            "name": "image name",
            "documentation": "image name. Values: 1 to 8 alphanumeric characters Default: if a name is not specified, UNKNOWN is used",
            "choices": [
              "OBJECT",
              "1",
              "8"
            ],
            "slot": 0,
            "component": 1,
            "syntaxStart": 5,
            "syntaxEnd": 6
          },
          {
            "key": "x",
            "name": "extension",
            "documentation": "extension. Format: .GRF",
            "choices": [
              "GRF"
            ],
            "slot": 0,
            "component": 2,
            "syntaxStart": 7,
            "syntaxEnd": 8
          },
          {
            "key": "t",
            "name": "total number of bytes in the graphic",
            "documentation": "total number of bytes in the graphic. See the formula in the examples below.",
            "choices": [
              "0"
            ],
            "slot": 1,
            "component": 0,
            "syntaxStart": 9,
            "syntaxEnd": 10
          },
          {
            "key": "w",
            "name": "number of bytes per row",
            "documentation": "number of bytes per row. See the formula in the examples below.",
            "choices": [
              "0"
            ],
            "slot": 2,
            "component": 0,
            "syntaxStart": 11,
            "syntaxEnd": 12
          },
          {
            "key": "data",
            "name": "ASCII hexadecimal string defining image",
            "documentation": "ASCII hexadecimal string defining image. The data string defines the image and is an ASCII hexadecimal representation of the image. Each character represents a horizontal nibble of four dots.",
            "choices": [
              "text"
            ],
            "slot": 3,
            "component": 0,
            "syntaxStart": 13,
            "syntaxEnd": 17
          }
        ]
      }
    ]
  },
  "~DN": {
    "title": "Abort Download Graphic",
    "summary": "After decoding and printing the number of bytes in parameter t of the ~DG command, the printer returns to normal Print Mode.",
    "reference": "https://docs.zebra.com/us/en/printers/software/zpl-pg/c-zpl-zpl-commands/r-zpl-dn.html",
    "signatures": [
      {
        "syntax": "~DN",
        "snippet": "~DN",
        "parameters": []
      }
    ]
  },
  "~DS": {
    "title": "Download Intellifont (Scalable Font)",
    "summary": "The ~DS command is used to set the printer to receive a downloadable scalable font and defines the size of the font in bytes.",
    "reference": "https://docs.zebra.com/us/en/printers/software/zpl-pg/c-zpl-zpl-commands/r-zpl-ds.html",
    "signatures": [
      {
        "syntax": "~DSd:o.x,s,data",
        "snippet": "~DS${1:R}:${2:OBJECT}.${3:FNT},${4:0},${5:text}",
        "parameters": [
          {
            "key": "d",
            "name": "device to store image",
            "documentation": "device to store image. Values: R: , E: , B: , and A: Default: R:",
            "choices": [
              "R:"
            ],
            "slot": 0,
            "component": 0,
            "syntaxStart": 3,
            "syntaxEnd": 4
          },
          {
            "key": "o",
            "name": "image name",
            "documentation": "image name. Values: 1 to 8 alphanumeric characters Default: if a name is not specified, UNKNOWN is used",
            "choices": [
              "OBJECT",
              "1",
              "8"
            ],
            "slot": 0,
            "component": 1,
            "syntaxStart": 5,
            "syntaxEnd": 6
          },
          {
            "key": "x",
            "name": "extension",
            "documentation": "extension. Fixed Value: .FNT",
            "choices": [
              "FNT",
              "GRF"
            ],
            "slot": 0,
            "component": 2,
            "syntaxStart": 7,
            "syntaxEnd": 8
          },
          {
            "key": "s",
            "name": "size of font in bytes",
            "documentation": "size of font in bytes. Fixed Value: this number is generated by ZTools and should not be changed",
            "choices": [
              "0"
            ],
            "slot": 1,
            "component": 0,
            "syntaxStart": 9,
            "syntaxEnd": 10
          },
          {
            "key": "data",
            "name": "ASCII hexadecimal string that defines font",
            "documentation": "ASCII hexadecimal string that defines font. Fixed Value: this number is generated by ZTools and should not be changed",
            "choices": [
              "text",
              "OBJECT"
            ],
            "slot": 2,
            "component": 0,
            "syntaxStart": 11,
            "syntaxEnd": 15
          }
        ]
      }
    ]
  },
  "~DT": {
    "title": "Download Bounded TrueType Font",
    "summary": "The ~DT command in ZPL (Zebra Programming Language) is used to download a TrueType font to a printer.",
    "reference": "https://docs.zebra.com/us/en/printers/software/zpl-pg/c-zpl-zpl-commands/r-zpl-dt.html",
    "signatures": [
      {
        "syntax": "~DTd:o.x,s,data",
        "snippet": "~DT${1:R}:${2:OBJECT}.${3:DAT},${4:0},${5:text}",
        "parameters": [
          {
            "key": "d",
            "name": "font location",
            "documentation": "font location. Values: R: , E: , B: , and A: Default: R:",
            "choices": [
              "R:"
            ],
            "slot": 0,
            "component": 0,
            "syntaxStart": 3,
            "syntaxEnd": 4
          },
          {
            "key": "o",
            "name": "font name",
            "documentation": "font name. Values: any valid TrueType name, up to 8 characters Default: if a name is not specified, UNKNOWN is used",
            "choices": [
              "OBJECT"
            ],
            "slot": 0,
            "component": 1,
            "syntaxStart": 5,
            "syntaxEnd": 6
          },
          {
            "key": "x",
            "name": "extension",
            "documentation": "extension. Fixed Value: .DAT",
            "choices": [
              "DAT",
              "GRF"
            ],
            "slot": 0,
            "component": 2,
            "syntaxStart": 7,
            "syntaxEnd": 8
          },
          {
            "key": "s",
            "name": "font size",
            "documentation": "font size. Values: the number of memory bytes required to hold the Zebra-downloadable format of the font Default: if an incorrect value or no value is entered, the command is ignored",
            "choices": [
              "0"
            ],
            "slot": 1,
            "component": 0,
            "syntaxStart": 9,
            "syntaxEnd": 10
          },
          {
            "key": "data",
            "name": "data string",
            "documentation": "data string. Values: a string of ASCII hexadecimal values (two hexadecimal digits/byte). The total number of two-digit values must match parameter s . Default: if no data is entered, the command is ignored",
            "choices": [
              "text",
              "data"
            ],
            "slot": 2,
            "component": 0,
            "syntaxStart": 11,
            "syntaxEnd": 15
          }
        ]
      }
    ]
  },
  "~DU": {
    "title": "Download Unbounded TrueType Font",
    "summary": "Some international fonts, such as Asian fonts, have more than 256 printable characters.",
    "reference": "https://docs.zebra.com/us/en/printers/software/zpl-pg/c-zpl-zpl-commands/r-zpl-du.html",
    "signatures": [
      {
        "syntax": "~DUd:o.x,s,data",
        "snippet": "~DU${1:R}:${2:OBJECT}.${3:FNT},${4:0},${5:text}",
        "parameters": [
          {
            "key": "d",
            "name": "font location",
            "documentation": "font location. Values: R: , E: , B: , and A: Default: R:",
            "choices": [
              "R:"
            ],
            "slot": 0,
            "component": 0,
            "syntaxStart": 3,
            "syntaxEnd": 4
          },
          {
            "key": "o",
            "name": "font name",
            "documentation": "font name. Values: 1 to 8 alphanumeric characters Default: if a name is not specified, UNKNOWN is used",
            "choices": [
              "OBJECT",
              "1",
              "8"
            ],
            "slot": 0,
            "component": 1,
            "syntaxStart": 5,
            "syntaxEnd": 6
          },
          {
            "key": "x",
            "name": "extension",
            "documentation": "extension. Format: .FNT",
            "choices": [
              "FNT",
              "GRF"
            ],
            "slot": 0,
            "component": 2,
            "syntaxStart": 7,
            "syntaxEnd": 8
          },
          {
            "key": "s",
            "name": "font size",
            "documentation": "font size. Values: the number of memory bytes required to hold the Zebra-downloadable format of the font Default: if no data is entered, the command is ignored",
            "choices": [
              "0"
            ],
            "slot": 1,
            "component": 0,
            "syntaxStart": 9,
            "syntaxEnd": 10
          },
          {
            "key": "data",
            "name": "data string",
            "documentation": "data string. Values: a string of ASCII hexadecimal values (two hexadecimal digits/byte). The total number of two-digit values must match parameter s . Default: if no data is entered, the command is ignored",
            "choices": [
              "text",
              "data"
            ],
            "slot": 2,
            "component": 0,
            "syntaxStart": 11,
            "syntaxEnd": 15
          }
        ]
      }
    ]
  },
  "~DY": {
    "title": "Download Objects",
    "summary": "The ~DY command downloads to the printer graphic objects or fonts in any supported format.",
    "reference": "https://docs.zebra.com/us/en/printers/software/zpl-pg/c-zpl-zpl-commands/r-zpl-dy.html",
    "signatures": [
      {
        "syntax": "~DYd:f,b,x,t,w,data",
        "snippet": "~DY${1:R}:${2:OBJECT},${3:A},${4:B},${5:0},${6:0},${7:data}",
        "parameters": [
          {
            "key": "d",
            "name": "file location .NRD and .PAC files reside on E: in firmware versions V60.15.x, V50.15.x, or later.",
            "documentation": "file location .NRD and .PAC files reside on E: in firmware versions V60.15.x, V50.15.x, or later. Values: R: , E: , B: , and A: Default: R:",
            "choices": [
              "R:"
            ],
            "slot": 0,
            "component": 0,
            "syntaxStart": 3,
            "syntaxEnd": 4
          },
          {
            "key": "f",
            "name": "file name",
            "documentation": "file name. Values: 1 to 8 alphanumeric characters Default: if a name is not specified, UNKNOWN is used",
            "choices": [
              "OBJECT",
              "1",
              "8"
            ],
            "slot": 0,
            "component": 1,
            "syntaxStart": 5,
            "syntaxEnd": 6
          },
          {
            "key": "b",
            "name": "download data format",
            "documentation": "download data format. Values: A = uncompressed (ZB64, ASCII) B = uncompressed ( .TTE , .TTF , binary) C = AR-compressed (used only by Zebra’s BAR-ONE® v5) P = portable network graphic ( .PNG ) - ZB64 encoded Default: a value must be specified",
            "choices": [
              "A",
              "B",
              "C",
              "P"
            ],
            "enumValues": [
              "A",
              "B",
              "C",
              "P"
            ],
            "slot": 1,
            "component": 0,
            "syntaxStart": 7,
            "syntaxEnd": 8
          },
          {
            "key": "x",
            "name": "stored-file extension",
            "documentation": "stored-file extension. Values: B = bitmap E = TrueType Extension ( .TTE ) G = raw bitmap ( .GRF ) P = store as compressed ( .PNG ) T = TrueType ( .TTF ) or OpenType ( .OTF ) X = Paintbrush ( .PCX ) NRD = Non Readable File ( .NRD ) PAC = Protected Access Credential ( .PAC ) C = User defined menu file (WML) F = User defined webpage file (HTM) H = Printer feedback file (GET) Default: a value other than the accepted values defaults to .GRF",
            "choices": [
              "B",
              "E",
              "G",
              "P",
              "T",
              "X",
              "NRD",
              "PAC",
              "C",
              "F",
              "H",
              "TTE"
            ],
            "enumValues": [
              "B",
              "E",
              "G",
              "P",
              "T",
              "X",
              "NRD",
              "PAC",
              "C",
              "F",
              "H"
            ],
            "slot": 2,
            "component": 0,
            "syntaxStart": 9,
            "syntaxEnd": 10
          },
          {
            "key": "t",
            "name": "total bytes in file",
            "documentation": "total bytes in file. Values: .BMP This parameter refers to the actual size of the file, not the amount of disk space. .GRF images: the size after decompression into memory This parameter refers to the actual size of the file, not the amount of disk space. .PCX This parameter refers to the actual size of the file, not the amount of disk space. .PNG images: This parameter refers to the actual size of the file, not the amount of disk space. .TTF This parameter refers to the actual size of the file, not the amount of disk space. .TTE This parameter refers to the actual size of the file, not the amount of disk space.",
            "choices": [
              "0"
            ],
            "slot": 3,
            "component": 0,
            "syntaxStart": 11,
            "syntaxEnd": 12
          },
          {
            "key": "w",
            "name": "bytes per row",
            "documentation": "bytes per row. Values: .GRF images: number of bytes per row .PNG images: value ignored .TTF images: value ignored .TTE images: value ignored .NRD images: value ignored .PAC images: value ignored",
            "choices": [
              "0"
            ],
            "slot": 4,
            "component": 0,
            "syntaxStart": 13,
            "syntaxEnd": 14
          },
          {
            "key": "data",
            "name": "data",
            "documentation": "data. ASCII hexadecimal encoding, ZB64, or binary data, depending on b . A, P = ASCII hexadecimal or ZB64 B, C = binary When binary data is sent, all control prefixes and flow control characters are ignored until the total number of bytes needed for the graphic format is received.",
            "choices": [
              "data"
            ],
            "slot": 5,
            "component": 0,
            "syntaxStart": 15,
            "syntaxEnd": 19
          }
        ]
      }
    ]
  },
  "~EG": {
    "title": "Erase Download Graphics",
    "summary": "The ~EG command erases downloaded graphics; the current guide directs users to ^ID for object selection.",
    "reference": "https://docs.zebra.com/us/en/printers/software/zpl-pg/c-zpl-zpl-commands/r-zpl-eg.html",
    "signatures": [
      {
        "syntax": "~EG",
        "snippet": "~EG",
        "parameters": []
      }
    ]
  },
  "^FB": {
    "title": "Field Block",
    "summary": "The ^FB command allows you to print text into a defined block type format.",
    "reference": "https://docs.zebra.com/us/en/printers/software/zpl-pg/c-zpl-zpl-commands/r-zpl-fb.html",
    "signatures": [
      {
        "syntax": "^FBa,b,c,d,e",
        "snippet": "^FB${1:0},${2:1},${3:0},${4:L},${5:0}",
        "parameters": [
          {
            "key": "a",
            "name": "width of text block line (in dots)",
            "documentation": "width of text block line (in dots). Values: 0 to the width of the label Default: 0 If the value is less than the font width or not specified, the text does not print.",
            "choices": [
              "0"
            ],
            "slot": 0,
            "component": 0,
            "syntaxStart": 3,
            "syntaxEnd": 4
          },
          {
            "key": "b",
            "name": "maximum number of lines in the text block",
            "documentation": "maximum number of lines in the text block. Values: 1 to 9999 Default: 1 Text exceeding the maximum number of lines overwrites the last line. Changing the font size automatically increases or decreases the size of the block.",
            "choices": [
              "1",
              "9999"
            ],
            "range": {
              "min": 1.0,
              "max": 9999.0
            },
            "slot": 1,
            "component": 0,
            "syntaxStart": 5,
            "syntaxEnd": 6
          },
          {
            "key": "c",
            "name": "add or delete space between lines (in dots)",
            "documentation": "add or delete space between lines (in dots). Values: -9999 to 9999 Default: 0 Numbers are considered to be positive unless preceded by a minus sign. Positive values add space; negative values delete space.",
            "choices": [
              "0",
              "9999"
            ],
            "range": {
              "min": -9999.0,
              "max": 9999.0
            },
            "slot": 2,
            "component": 0,
            "syntaxStart": 7,
            "syntaxEnd": 8
          },
          {
            "key": "d",
            "name": "text justification",
            "documentation": "text justification. Values: L = left C = center R = right J = justified Default: L If J is used, the last line is left-justified.",
            "choices": [
              "L",
              "C",
              "R",
              "J"
            ],
            "enumValues": [
              "L",
              "C",
              "R",
              "J"
            ],
            "slot": 3,
            "component": 0,
            "syntaxStart": 9,
            "syntaxEnd": 10
          },
          {
            "key": "e",
            "name": "hanging indent (in dots) of the second and remaining lines",
            "documentation": "hanging indent (in dots) of the second and remaining lines. Values: 0 to 9999 Default: 0",
            "choices": [
              "0",
              "9999"
            ],
            "range": {
              "min": 0.0,
              "max": 9999.0
            },
            "slot": 4,
            "component": 0,
            "syntaxStart": 11,
            "syntaxEnd": 12
          }
        ]
      }
    ]
  },
  "^FC": {
    "title": "Field Clock",
    "summary": "The ^FC command is used to set the clock indicators (delimiters) and the clock mode for use with the Real-Time Clock hardware.",
    "reference": "https://docs.zebra.com/us/en/printers/software/zpl-pg/c-zpl-zpl-commands/r-zpl-fc.html",
    "signatures": [
      {
        "syntax": "^FCa,b,c",
        "snippet": "^FC${1:%},${2:_},${3:_}",
        "parameters": [
          {
            "key": "a",
            "name": "primary clock indicator character",
            "documentation": "primary clock indicator character. Values: any ASCII character Default: %",
            "choices": [
              "%"
            ],
            "slot": 0,
            "component": 0,
            "syntaxStart": 3,
            "syntaxEnd": 4
          },
          {
            "key": "b",
            "name": "secondary clock indicator character",
            "documentation": "secondary clock indicator character. Values: any ASCII character Default: none—this value cannot be the same as a or c",
            "choices": [
              "_"
            ],
            "slot": 1,
            "component": 0,
            "syntaxStart": 5,
            "syntaxEnd": 6
          },
          {
            "key": "c",
            "name": "third clock indicator character",
            "documentation": "third clock indicator character. Values: any ASCII character Default: none—this value cannot be the same as a or b",
            "choices": [
              "_"
            ],
            "slot": 2,
            "component": 0,
            "syntaxStart": 7,
            "syntaxEnd": 8
          }
        ]
      }
    ]
  },
  "^FD": {
    "title": "Field Data",
    "summary": "The ^FD command defines the data string for a field.",
    "reference": "https://docs.zebra.com/us/en/printers/software/zpl-pg/c-zpl-zpl-commands/r-zpl-fd.html",
    "signatures": [
      {
        "syntax": "^FDa",
        "snippet": "^FD${1:0000}",
        "parameters": [
          {
            "key": "a",
            "name": "data to be printed (all printers), or a password to be written to a RFID tag (rfid printers)",
            "documentation": "data to be printed (all printers), or a password to be written to a RFID tag (rfid printers). Values: any data string up to 3072 bytes Default: none—a string of characters must be entered",
            "choices": [
              "0000",
              "data"
            ],
            "slot": 0,
            "component": 0,
            "syntaxStart": 3,
            "syntaxEnd": 4
          }
        ]
      }
    ]
  },
  "^FE": {
    "title": "Field Concatenation",
    "summary": "The ^FE command allows field data concatenation and substring extraction by referencing ^FN fields.",
    "reference": "https://docs.zebra.com/us/en/printers/software/zpl-pg/c-zpl-zpl-commands/r-zpl-fe.html",
    "signatures": [
      {
        "syntax": "^FEa",
        "snippet": "^FE${1:#}",
        "parameters": [
          {
            "key": "a",
            "name": "field concatenation character",
            "documentation": "Delimiter used inside the following ^FD field to insert complete or partial ^FN values. Any character except the active command prefixes. Default: #.",
            "choices": [
              "#",
              "%",
              "|"
            ],
            "slot": 0,
            "component": 0,
            "syntaxStart": 3,
            "syntaxEnd": 4
          }
        ]
      }
    ]
  },
  "^FH": {
    "title": "Field Hexadecimal Indicator",
    "summary": "The ^FH command allows you to enter the hexadecimal value for any character directly into the ^FD statement.",
    "reference": "https://docs.zebra.com/us/en/printers/software/zpl-pg/c-zpl-zpl-commands/r-zpl-fh.html",
    "signatures": [
      {
        "syntax": "^FHa",
        "snippet": "^FH${1:_}",
        "parameters": [
          {
            "key": "a",
            "name": "hexadecimal indicator",
            "documentation": "hexadecimal indicator. Values: any character except current format and control prefix (^ and ~ by default) Default: _ (underscore)",
            "choices": [
              "_"
            ],
            "slot": 0,
            "component": 0,
            "syntaxStart": 3,
            "syntaxEnd": 4
          }
        ]
      }
    ]
  },
  "^FL": {
    "title": "Font Linking",
    "summary": "The ^FL command provides the ability to link any TrueType font, including private character fonts, to associated fonts.",
    "reference": "https://docs.zebra.com/us/en/printers/software/zpl-pg/c-zpl-zpl-commands/r-zpl-fl.html",
    "signatures": [
      {
        "syntax": "^FL<ext>,<base>,<link>",
        "snippet": "^FL${1:E:SWISS721.TTF},${2:*.TTF},${3:1}",
        "parameters": [
          {
            "key": "<ext>",
            "name": "extension font file",
            "documentation": "extension font file. This is the fully-qualified filename of the extension. This file name does not accept wildcards. The supported extensions for this parameter are: .TTF and .TTE . The format for this parameter is the memory device followed by the font name with the extension, as follows: E:SWISS721.TTF",
            "choices": [
              "E:SWISS721.TTF",
              "R:EXTENSION.TTE"
            ],
            "slot": 0,
            "component": 0,
            "syntaxStart": 3,
            "syntaxEnd": 8
          },
          {
            "key": "<base>",
            "name": "base font file",
            "documentation": "base font file. This is the filename of the base font(s). The base font can be any of the following types: .FNT .TTF or .TTE From these font types, you can only link to a .TTF or TTE . The name of the base font can be expressed as a wild card; doing so will define multiple base fonts. The result will be that all base font files so defined will be linked to the file defined in the <ext> parameter. The filename does not have to match a file that is currently defined on the printer. A specification of *.TTF results in all * .TTF font files loaded on the printer currently or in the future to be linked with the specified <ext> font extension.",
            "choices": [
              "*.TTF",
              "R:BASE.FNT"
            ],
            "slot": 1,
            "component": 0,
            "syntaxStart": 9,
            "syntaxEnd": 15
          },
          {
            "key": "<link>",
            "name": "link operation",
            "documentation": "link operation. This is an indicator that determines if the extension is to be linked with the base, or unlinked from the base, as follows: Values: 0 = <ext> is to be unlinked (disassociated) from the file(s) specified in <base> 1 = <ext> is to be linked (associated) with the file(s) specified by <base> Default: must be an accepted value or it is ignored",
            "choices": [
              "1",
              "0"
            ],
            "enumValues": [
              "1",
              "0"
            ],
            "slot": 2,
            "component": 0,
            "syntaxStart": 16,
            "syntaxEnd": 22
          }
        ]
      }
    ]
  },
  "^FM": {
    "title": "Multiple Field Origin Locations",
    "summary": "The ^FM command allows you to control the placement of bar code symbols.",
    "reference": "https://docs.zebra.com/us/en/printers/software/zpl-pg/c-zpl-zpl-commands/r-zpl-fm.html",
    "signatures": [
      {
        "syntax": "^FMx1,y1,x2,y2,...",
        "snippet": "^FM${1:0},${2:0},${3:0},${4:0},${5:0}",
        "parameters": [
          {
            "key": "x1",
            "name": "x-axis location of first symbol (in dots)",
            "documentation": "x-axis location of first symbol (in dots). Values: 0 to 32000 e = exclude this bar code from printing Default: a value must be specified a value must be specified",
            "choices": [
              "0",
              "e",
              "32000"
            ],
            "range": {
              "min": 0.0,
              "max": 32000.0
            },
            "slot": 0,
            "component": 0,
            "syntaxStart": 3,
            "syntaxEnd": 5
          },
          {
            "key": "y1",
            "name": "y-axis location of first symbol (in dots)",
            "documentation": "y-axis location of first symbol (in dots). Values: 0 to 32000 e = exclude this bar code from printing Default: a value must be specified",
            "choices": [
              "0",
              "e",
              "32000"
            ],
            "range": {
              "min": 0.0,
              "max": 32000.0
            },
            "slot": 1,
            "component": 0,
            "syntaxStart": 6,
            "syntaxEnd": 8
          },
          {
            "key": "x2",
            "name": "x-axis location of second symbol (in dots)",
            "documentation": "x-axis location of second symbol (in dots). Values: 0 to 32000 e = exclude this bar code from printing Default: a value must be specified",
            "choices": [
              "0",
              "e",
              "32000"
            ],
            "range": {
              "min": 0.0,
              "max": 32000.0
            },
            "slot": 2,
            "component": 0,
            "syntaxStart": 9,
            "syntaxEnd": 11
          },
          {
            "key": "y2",
            "name": "y-axis location of second symbol (in dots)",
            "documentation": "y-axis location of second symbol (in dots). Values: 0 to 32000 e = exclude this bar code from printing Default: a value must be specified",
            "choices": [
              "0",
              "e",
              "32000"
            ],
            "range": {
              "min": 0.0,
              "max": 32000.0
            },
            "slot": 3,
            "component": 0,
            "syntaxStart": 12,
            "syntaxEnd": 14
          },
          {
            "key": "...",
            "name": "continuation of X,Y pairs",
            "documentation": "continuation of X,Y pairs. Maximum number of pairs: 60",
            "choices": [
              "0"
            ],
            "repeatable": true,
            "slot": 4,
            "component": 0,
            "syntaxStart": 15,
            "syntaxEnd": 18
          }
        ]
      }
    ]
  },
  "^FN": {
    "title": "Field Number",
    "summary": "The ^FN command numbers the data fields.",
    "reference": "https://docs.zebra.com/us/en/printers/software/zpl-pg/c-zpl-zpl-commands/r-zpl-fn.html",
    "signatures": [
      {
        "syntax": "^FN#\"a\"",
        "snippet": "^FN${1:0}\"${2:Name}\"",
        "parameters": [
          {
            "key": "#",
            "name": "number to be assigned to the field",
            "documentation": "number to be assigned to the field. Values: 0 to 9999 Default: 0",
            "choices": [
              "0",
              "9999"
            ],
            "range": {
              "min": 0.0,
              "max": 9999.0
            },
            "slot": 0,
            "component": 0,
            "syntaxStart": 3,
            "syntaxEnd": 4
          },
          {
            "key": "a",
            "name": "prompt text",
            "documentation": "prompt text. Values: 255 alphanumeric characters maximum (a-z,A-Z,1-9 and space) Default: optional parameter",
            "choices": [
              "Name"
            ],
            "slot": 0,
            "component": 1,
            "syntaxStart": 5,
            "syntaxEnd": 6
          }
        ]
      }
    ]
  },
  "^FO": {
    "title": "Field Origin",
    "summary": "The ^FO command sets a field origin, relative to the label home ( ^LH ) position.",
    "reference": "https://docs.zebra.com/us/en/printers/software/zpl-pg/c-zpl-zpl-commands/r-zpl-fo.html",
    "signatures": [
      {
        "syntax": "^FOx,y,z",
        "snippet": "^FO${1:40},${2:40},${3:0}",
        "parameters": [
          {
            "key": "x",
            "name": "x-axis location (in dots)",
            "documentation": "x-axis location (in dots). Values: 0 to 32000 Default: 0",
            "choices": [
              "40",
              "0",
              "32000"
            ],
            "range": {
              "min": 0.0,
              "max": 32000.0
            },
            "slot": 0,
            "component": 0,
            "syntaxStart": 3,
            "syntaxEnd": 4
          },
          {
            "key": "y",
            "name": "y-axis location (in dots)",
            "documentation": "y-axis location (in dots). Values: 0 to 32000 Default: 0",
            "choices": [
              "40",
              "0",
              "32000"
            ],
            "range": {
              "min": 0.0,
              "max": 32000.0
            },
            "slot": 1,
            "component": 0,
            "syntaxStart": 5,
            "syntaxEnd": 6
          },
          {
            "key": "z",
            "name": "justification",
            "documentation": "justification. Values: 0 = left justification 1 = right justification 2 = auto justification (script dependent) Default: last accepted ^FW value or ^FW default",
            "choices": [
              "0",
              "1",
              "2"
            ],
            "enumValues": [
              "0",
              "1",
              "2"
            ],
            "slot": 2,
            "component": 0,
            "syntaxStart": 7,
            "syntaxEnd": 8
          }
        ]
      }
    ]
  },
  "^FP": {
    "title": "Field Parameter",
    "summary": "The ^FP command allows vertical and reverse formatting of the font field, commonly used for printing Asian fonts.",
    "reference": "https://docs.zebra.com/us/en/printers/software/zpl-pg/c-zpl-zpl-commands/r-zpl-fp.html",
    "signatures": [
      {
        "syntax": "^FPd,g",
        "snippet": "^FP${1:H},${2:0}",
        "parameters": [
          {
            "key": "d",
            "name": "direction",
            "documentation": "direction. Values: H = horizontal printing (left to right) V = vertical printing (top to bottom) R = reverse printing (right to left) Default: H",
            "choices": [
              "H",
              "V",
              "R"
            ],
            "enumValues": [
              "H",
              "V",
              "R"
            ],
            "slot": 0,
            "component": 0,
            "syntaxStart": 3,
            "syntaxEnd": 4
          },
          {
            "key": "g",
            "name": "additional inter-character gap (in dots)",
            "documentation": "additional inter-character gap (in dots). Values: 0 to 9999 Default: 0 if no value is entered",
            "choices": [
              "0",
              "9999"
            ],
            "range": {
              "min": 0.0,
              "max": 9999.0
            },
            "slot": 1,
            "component": 0,
            "syntaxStart": 5,
            "syntaxEnd": 6
          }
        ]
      }
    ]
  },
  "^FR": {
    "title": "Field Reverse Print",
    "summary": "The ^FR command allows a field to appear as white over black or black over white.",
    "reference": "https://docs.zebra.com/us/en/printers/software/zpl-pg/c-zpl-zpl-commands/r-zpl-fr.html",
    "signatures": [
      {
        "syntax": "^FR",
        "snippet": "^FR",
        "parameters": []
      }
    ]
  },
  "^FS": {
    "title": "Field Separator",
    "summary": "The ^FS command denotes the end of the field definition.",
    "reference": "https://docs.zebra.com/us/en/printers/software/zpl-pg/c-zpl-zpl-commands/r-zpl-fs.html",
    "signatures": [
      {
        "syntax": "^FS",
        "snippet": "^FS",
        "parameters": []
      }
    ]
  },
  "^FT": {
    "title": "Field Typeset",
    "summary": "The ^FT command sets the field position, relative to the home position of the label designated by the ^LH command.",
    "reference": "https://docs.zebra.com/us/en/printers/software/zpl-pg/c-zpl-zpl-commands/r-zpl-ft.html",
    "signatures": [
      {
        "syntax": "^FTx,y,z",
        "snippet": "^FT${1:0},${2:0},${3:0}",
        "parameters": [
          {
            "key": "x",
            "name": "x-axis location (in dots)",
            "documentation": "x-axis location (in dots). Values: 0 to 32000 Default: position after the last formatted text field",
            "choices": [
              "0",
              "32000"
            ],
            "range": {
              "min": 0.0,
              "max": 32000.0
            },
            "slot": 0,
            "component": 0,
            "syntaxStart": 3,
            "syntaxEnd": 4
          },
          {
            "key": "y",
            "name": "y-axis location (in dots)",
            "documentation": "y-axis location (in dots). Values: 0 to 32000 Default: position after the last formatted text field",
            "choices": [
              "0",
              "32000"
            ],
            "range": {
              "min": 0.0,
              "max": 32000.0
            },
            "slot": 1,
            "component": 0,
            "syntaxStart": 5,
            "syntaxEnd": 6
          },
          {
            "key": "z",
            "name": "justification",
            "documentation": "justification. Values: 0 = left justification 1 = right justification 2 = auto justification (script dependent) Default: last accepted ^FW value or ^FW default The auto-justification option may cause unexpected results if variable fields or bidirectional text are used with ^FT . For best results with bidirectional text and/or variable fields, use either the left or right justification options.",
            "choices": [
              "0",
              "1",
              "2"
            ],
            "enumValues": [
              "0",
              "1",
              "2"
            ],
            "slot": 2,
            "component": 0,
            "syntaxStart": 7,
            "syntaxEnd": 8
          }
        ]
      }
    ]
  },
  "^FV": {
    "title": "Field Variable",
    "summary": "^FV replaces the ^FD (field data) command in a label format when the field is variable.",
    "reference": "https://docs.zebra.com/us/en/printers/software/zpl-pg/c-zpl-zpl-commands/r-zpl-fv.html",
    "signatures": [
      {
        "syntax": "^FVa",
        "snippet": "^FV${1:text}",
        "parameters": [
          {
            "key": "a",
            "name": "variable field data to be printed",
            "documentation": "variable field data to be printed. Values: 0 to 3072 byte string Default: if no data is entered, the command is ignored",
            "choices": [
              "text",
              "0",
              "3072"
            ],
            "range": {
              "min": 0.0,
              "max": 3072.0
            },
            "slot": 0,
            "component": 0,
            "syntaxStart": 3,
            "syntaxEnd": 4
          }
        ]
      }
    ]
  },
  "^FW": {
    "title": "Field Orientation",
    "summary": "The ^FW command sets the default orientation for all command fields that have an orientation (rotation) parameter (and in x.14 sets the default justification for all commands with a justification parameter).",
    "reference": "https://docs.zebra.com/us/en/printers/software/zpl-pg/c-zpl-zpl-commands/r-zpl-fw.html",
    "signatures": [
      {
        "syntax": "^FWr,z",
        "snippet": "^FW${1:N},${2:0}",
        "parameters": [
          {
            "key": "r",
            "name": "rotate field",
            "documentation": "rotate field. Values: N = normal R = rotated 90 degrees I = inverted 180 degrees B = bottom-up 270 degrees, read from the bottom up Initial Value at Power Up: N",
            "choices": [
              "N",
              "R",
              "I",
              "B"
            ],
            "enumValues": [
              "N",
              "R",
              "I",
              "B"
            ],
            "slot": 0,
            "component": 0,
            "syntaxStart": 3,
            "syntaxEnd": 4
          },
          {
            "key": "z",
            "name": "justification",
            "documentation": "justification. Values: 0 = left justification 1 = right justification 2 = auto justification (script dependent) Default: auto for ^TB and left for all other commands",
            "choices": [
              "0",
              "1",
              "2"
            ],
            "enumValues": [
              "0",
              "1",
              "2"
            ],
            "slot": 1,
            "component": 0,
            "syntaxStart": 5,
            "syntaxEnd": 6
          }
        ]
      }
    ]
  },
  "^FX": {
    "title": "Comment",
    "summary": "The ^FX command is useful when you want to add non-printing informational comments or statements within a label format.",
    "reference": "https://docs.zebra.com/us/en/printers/software/zpl-pg/c-zpl-zpl-commands/r-zpl-fx.html",
    "signatures": [
      {
        "syntax": "^FXc",
        "snippet": "^FX${1:text}",
        "parameters": [
          {
            "key": "c",
            "name": "non-printing comment",
            "documentation": "non-printing comment. Creates a non-printable comment.",
            "choices": [
              "text"
            ],
            "slot": 0,
            "component": 0,
            "syntaxStart": 3,
            "syntaxEnd": 4
          }
        ]
      }
    ]
  },
  "^GB": {
    "title": "Graphic Box",
    "summary": "The ^GB command is used to draw boxes and lines as part of a label format.",
    "reference": "https://docs.zebra.com/us/en/printers/software/zpl-pg/c-zpl-zpl-commands/r-zpl-gb.html",
    "signatures": [
      {
        "syntax": "^GBw,h,t,c,r",
        "snippet": "^GB${1:0},${2:0},${3:1},${4:B},${5:0}",
        "parameters": [
          {
            "key": "w",
            "name": "box width (in dots)",
            "documentation": "box width (in dots). Values: value of t to 32000 Default: value used for thickness (t) or 1",
            "choices": [
              "0"
            ],
            "slot": 0,
            "component": 0,
            "syntaxStart": 3,
            "syntaxEnd": 4
          },
          {
            "key": "h",
            "name": "box height (in dots)",
            "documentation": "box height (in dots). Values: value of t to 32000 Default: value used for thickness (t) or 1",
            "choices": [
              "0"
            ],
            "slot": 1,
            "component": 0,
            "syntaxStart": 5,
            "syntaxEnd": 6
          },
          {
            "key": "t",
            "name": "border thickness (in dots)",
            "documentation": "border thickness (in dots). Values: 1 to 32000 Default: 1",
            "choices": [
              "1",
              "32000"
            ],
            "range": {
              "min": 1.0,
              "max": 32000.0
            },
            "slot": 2,
            "component": 0,
            "syntaxStart": 7,
            "syntaxEnd": 8
          },
          {
            "key": "c",
            "name": "line color",
            "documentation": "line color. Values: B = black W = white Default: B",
            "choices": [
              "B",
              "W"
            ],
            "enumValues": [
              "B",
              "W"
            ],
            "slot": 3,
            "component": 0,
            "syntaxStart": 9,
            "syntaxEnd": 10
          },
          {
            "key": "r",
            "name": "degree of corner-rounding",
            "documentation": "degree of corner-rounding. Values: 0 (no rounding) to 8 (heaviest rounding) Default: 0",
            "choices": [
              "0",
              "8"
            ],
            "range": {
              "min": 0.0,
              "max": 8.0
            },
            "slot": 4,
            "component": 0,
            "syntaxStart": 11,
            "syntaxEnd": 12
          }
        ]
      }
    ]
  },
  "^GC": {
    "title": "Graphic Circle",
    "summary": "The ^GC command produces a circle on the printed label.",
    "reference": "https://docs.zebra.com/us/en/printers/software/zpl-pg/c-zpl-zpl-commands/r-zpl-gc.html",
    "signatures": [
      {
        "syntax": "^GCd,t, c",
        "snippet": "^GC${1:3},${2:1}, ${3:B}",
        "parameters": [
          {
            "key": "d",
            "name": "circle diameter (in dots)",
            "documentation": "circle diameter (in dots). Values: 3 to 4095 (larger values are replaced with 4095) Default: 3",
            "choices": [
              "3",
              "4095"
            ],
            "range": {
              "min": 3.0,
              "max": 4095.0
            },
            "slot": 0,
            "component": 0,
            "syntaxStart": 3,
            "syntaxEnd": 4
          },
          {
            "key": "t",
            "name": "border thickness (in dots)",
            "documentation": "border thickness (in dots). Values: 2 to 4095 Default: 1",
            "choices": [
              "1",
              "2",
              "4095"
            ],
            "range": {
              "min": 2.0,
              "max": 4095.0
            },
            "slot": 1,
            "component": 0,
            "syntaxStart": 5,
            "syntaxEnd": 6
          },
          {
            "key": "c",
            "name": "line color",
            "documentation": "line color. Values: B = black W = white Default: B",
            "choices": [
              "B",
              "W"
            ],
            "enumValues": [
              "B",
              "W"
            ],
            "slot": 2,
            "component": 0,
            "syntaxStart": 8,
            "syntaxEnd": 9
          }
        ]
      }
    ]
  },
  "^GD": {
    "title": "Graphic Diagonal Line",
    "summary": "The ^GD command produces a straight diagonal line on a label.",
    "reference": "https://docs.zebra.com/us/en/printers/software/zpl-pg/c-zpl-zpl-commands/r-zpl-gd.html",
    "signatures": [
      {
        "syntax": "^GDw,h,t,c,o",
        "snippet": "^GD${1:3},${2:3},${3:1},${4:B},${5:R}",
        "parameters": [
          {
            "key": "w",
            "name": "box width (in dots)",
            "documentation": "box width (in dots). Values: 3 to 32000 Default: value of t (thickness) or 3",
            "choices": [
              "3",
              "32000"
            ],
            "range": {
              "min": 3.0,
              "max": 32000.0
            },
            "slot": 0,
            "component": 0,
            "syntaxStart": 3,
            "syntaxEnd": 4
          },
          {
            "key": "h",
            "name": "box height (in dots)",
            "documentation": "box height (in dots). Values: 3 to 32000 Default: value of t (thickness) or 3",
            "choices": [
              "3",
              "32000"
            ],
            "range": {
              "min": 3.0,
              "max": 32000.0
            },
            "slot": 1,
            "component": 0,
            "syntaxStart": 5,
            "syntaxEnd": 6
          },
          {
            "key": "t",
            "name": "border thickness (in dots)",
            "documentation": "border thickness (in dots). Values: 1 to 32000 Default: 1",
            "choices": [
              "1",
              "32000"
            ],
            "range": {
              "min": 1.0,
              "max": 32000.0
            },
            "slot": 2,
            "component": 0,
            "syntaxStart": 7,
            "syntaxEnd": 8
          },
          {
            "key": "c",
            "name": "line color",
            "documentation": "line color. Values: B = black W = white Default: B",
            "choices": [
              "B",
              "W"
            ],
            "enumValues": [
              "B",
              "W"
            ],
            "slot": 3,
            "component": 0,
            "syntaxStart": 9,
            "syntaxEnd": 10
          },
          {
            "key": "o",
            "name": "orientation (direction of the diagonal)",
            "documentation": "orientation (direction of the diagonal). Values: R (or /) = right-leaning diagonal (or \\) = left-leaning diagonal Default: R",
            "choices": [
              "R"
            ],
            "slot": 4,
            "component": 0,
            "syntaxStart": 11,
            "syntaxEnd": 12
          }
        ]
      }
    ]
  },
  "^GE": {
    "title": "Graphic Ellipse",
    "summary": "The ^GE command produces an ellipse in the label format.",
    "reference": "https://docs.zebra.com/us/en/printers/software/zpl-pg/c-zpl-zpl-commands/r-zpl-ge.html",
    "signatures": [
      {
        "syntax": "^GEw,h,t,c",
        "snippet": "^GE${1:4095},${2:3},${3:1},${4:B}",
        "parameters": [
          {
            "key": "w",
            "name": "ellipse width (in dots)",
            "documentation": "ellipse width (in dots). Values: 3 to 4095 (larger values are replaced with 4095) Default: the value used for thickness ( t ) or 1",
            "choices": [
              "4095",
              "3"
            ],
            "range": {
              "min": 3.0,
              "max": 4095.0
            },
            "slot": 0,
            "component": 0,
            "syntaxStart": 3,
            "syntaxEnd": 4
          },
          {
            "key": "h",
            "name": "ellipse height (in dots)",
            "documentation": "ellipse height (in dots). Values: 3 to 4095 Default: the value used for thickness ( t ) or 1",
            "choices": [
              "3",
              "4095"
            ],
            "range": {
              "min": 3.0,
              "max": 4095.0
            },
            "slot": 1,
            "component": 0,
            "syntaxStart": 5,
            "syntaxEnd": 6
          },
          {
            "key": "t",
            "name": "border thickness (in dots)",
            "documentation": "border thickness (in dots). Values: 2 to 4095 Default: 1",
            "choices": [
              "1",
              "2",
              "4095"
            ],
            "range": {
              "min": 2.0,
              "max": 4095.0
            },
            "slot": 2,
            "component": 0,
            "syntaxStart": 7,
            "syntaxEnd": 8
          },
          {
            "key": "c",
            "name": "line color",
            "documentation": "line color. Values: B = black W = white Default: B",
            "choices": [
              "B",
              "W"
            ],
            "enumValues": [
              "B",
              "W"
            ],
            "slot": 3,
            "component": 0,
            "syntaxStart": 9,
            "syntaxEnd": 10
          }
        ]
      }
    ]
  },
  "^GF": {
    "title": "Graphic Field",
    "summary": "The ^GF command allows you to download graphic field data directly into the printer’s bitmap storage area.",
    "reference": "https://docs.zebra.com/us/en/printers/software/zpl-pg/c-zpl-zpl-commands/r-zpl-gf.html",
    "signatures": [
      {
        "syntax": "^GFa,b,c,d,data",
        "snippet": "^GF${1:A},${2:0},${3:1},${4:0},${5:data}",
        "parameters": [
          {
            "key": "a",
            "name": "compression type",
            "documentation": "compression type. Values: A = ASCII hexadecimal (follows the format for other download commands) B = binary (data sent after the c parameter is strictly binary) C = compressed binary (data sent after the c parameter is in compressed binary format. The data is compressed on the host side using Zebra’s compression algorithm. The data is then decompressed and placed directly into the bitmap.) Default: A",
            "choices": [
              "A",
              "B",
              "C"
            ],
            "slot": 0,
            "component": 0,
            "syntaxStart": 3,
            "syntaxEnd": 4
          },
          {
            "key": "b",
            "name": "binary byte count",
            "documentation": "binary byte count. Values: 1 to 99999 This is the total number of bytes to be transmitted for the total image or the total number of bytes that follow parameter d . For ASCII download, the parameter should match parameter c . Out-of-range values are set to the nearest limit. Default: command is ignored if a value is not specified",
            "choices": [
              "0",
              "1",
              "99999"
            ],
            "range": {
              "min": 1.0,
              "max": 99999.0
            },
            "slot": 1,
            "component": 0,
            "syntaxStart": 5,
            "syntaxEnd": 6
          },
          {
            "key": "c",
            "name": "graphic field count",
            "documentation": "graphic field count. Values: 1 to 99999 This is the total number of bytes comprising the graphic format (width x height), which is sent as parameter d . Count divided by bytes per row gives the number of lines in the image. This number represents the size of the image, not necessarily the size of the data stream (see d ). Default: command is ignored if a value is not specified",
            "choices": [
              "1",
              "99999"
            ],
            "range": {
              "min": 1.0,
              "max": 99999.0
            },
            "slot": 2,
            "component": 0,
            "syntaxStart": 7,
            "syntaxEnd": 8
          },
          {
            "key": "d",
            "name": "bytes per row",
            "documentation": "bytes per row. Values: 1 to 99999 This is the number of bytes in the downloaded data that comprise one row of the image. Default: command is ignored if a value is not specified",
            "choices": [
              "0",
              "1",
              "99999"
            ],
            "range": {
              "min": 1.0,
              "max": 99999.0
            },
            "slot": 3,
            "component": 0,
            "syntaxStart": 9,
            "syntaxEnd": 10
          },
          {
            "key": "data",
            "name": "data",
            "documentation": "data. Values: ASCII hexadecimal data: 00 to FF A string of ASCII hexadecimal numbers, two digits per image byte. CR and LF can be inserted as needed for readability. The number of two-digit number pairs must match the above count. Any numbers sent after count is satisfied are ignored. A comma in the data pads the current line with 00 (white space), minimizing the data sent. ~DN or any caret or tilde character prematurely aborts the download. Binary data: Strictly binary data is sent from the host. All control prefixes are ignored until the total number of bytes needed for the graphic format is sent.",
            "choices": [
              "data",
              "00"
            ],
            "slot": 4,
            "component": 0,
            "syntaxStart": 11,
            "syntaxEnd": 15
          }
        ]
      }
    ]
  },
  "^GS": {
    "title": "Graphic Symbol",
    "summary": "The ^GS command enables you to generate the registered trademark, copyright symbol, and other symbols.",
    "reference": "https://docs.zebra.com/us/en/printers/software/zpl-pg/c-zpl-zpl-commands/r-zpl-gs.html",
    "signatures": [
      {
        "syntax": "^GSo,h,w",
        "snippet": "^GS${1:N},${2:30},${3:30}",
        "parameters": [
          {
            "key": "o",
            "name": "field orientation",
            "documentation": "field orientation. Values: N = normal R = rotate 90 degrees clockwise I = inverted 180 degrees B = bottom-up, 270 degrees Default: N or last ^FW value",
            "choices": [
              "N",
              "R",
              "I",
              "B"
            ],
            "enumValues": [
              "N",
              "R",
              "I",
              "B"
            ],
            "slot": 0,
            "component": 0,
            "syntaxStart": 3,
            "syntaxEnd": 4
          },
          {
            "key": "h",
            "name": "character height proportional to width (in dots)",
            "documentation": "character height proportional to width (in dots). Values: 0 to 32000 Default: last ^CF value",
            "choices": [
              "30",
              "0",
              "32000"
            ],
            "range": {
              "min": 0.0,
              "max": 32000.0
            },
            "slot": 1,
            "component": 0,
            "syntaxStart": 5,
            "syntaxEnd": 6
          },
          {
            "key": "w",
            "name": "character width proportional to height (in dots)",
            "documentation": "character width proportional to height (in dots). Values: 0 to 32000 Default: last ^CF value",
            "choices": [
              "30",
              "0",
              "32000"
            ],
            "range": {
              "min": 0.0,
              "max": 32000.0
            },
            "slot": 2,
            "component": 0,
            "syntaxStart": 7,
            "syntaxEnd": 8
          }
        ]
      }
    ]
  },
  "~HB": {
    "title": "Battery Status",
    "summary": "When the ~HB command is sent to the printer, a data string is sent back to the host.",
    "reference": "https://docs.zebra.com/us/en/printers/software/zpl-pg/c-zpl-zpl-commands/r-zpl-hb.html",
    "signatures": [
      {
        "syntax": "~HB",
        "snippet": "~HB",
        "parameters": []
      }
    ]
  },
  "~HD": {
    "title": "Head Diagnostic",
    "summary": "The ~HD command echoes printer status information that includes the power supply and head temperature using the terminal emulator.",
    "reference": "https://docs.zebra.com/us/en/printers/software/zpl-pg/c-zpl-zpl-commands/r-zpl-hd.html",
    "signatures": [
      {
        "syntax": "~HD",
        "snippet": "~HD",
        "parameters": []
      }
    ]
  },
  "^HF": {
    "title": "Host Format",
    "summary": "The ^HF command sends stored formats to the host.",
    "reference": "https://docs.zebra.com/us/en/printers/software/zpl-pg/c-zpl-zpl-commands/r-zpl-hf.html",
    "signatures": [
      {
        "syntax": "^HFd,o,x",
        "snippet": "^HF${1:R:},${2:OBJECT},${3:ZPL}",
        "parameters": [
          {
            "key": "d",
            "name": "device to recall image",
            "documentation": "device to recall image. Values: R: , E: , B: , and A: Default: R:",
            "choices": [
              "R:"
            ],
            "slot": 0,
            "component": 0,
            "syntaxStart": 3,
            "syntaxEnd": 4
          },
          {
            "key": "o",
            "name": "image name",
            "documentation": "image name. Values: 1 to 8 alphanumeric characters Default: if a name is not specified, UNKNOWN is used",
            "choices": [
              "OBJECT",
              "1",
              "8"
            ],
            "slot": 1,
            "component": 0,
            "syntaxStart": 5,
            "syntaxEnd": 6
          },
          {
            "key": "x",
            "name": "extension",
            "documentation": "extension. Fixed Value: .ZPL",
            "choices": [
              "ZPL",
              "GRF"
            ],
            "slot": 2,
            "component": 0,
            "syntaxStart": 7,
            "syntaxEnd": 8
          }
        ]
      }
    ]
  },
  "^HG": {
    "title": "Host Graphic",
    "summary": "The ^HG command is used to upload graphics to the host.",
    "reference": "https://docs.zebra.com/us/en/printers/software/zpl-pg/c-zpl-zpl-commands/r-zpl-hg.html",
    "signatures": [
      {
        "syntax": "^HGd:o.x",
        "snippet": "^HG${1:R}:${2:IMAGE}.${3:GRF}",
        "parameters": [
          {
            "key": "d",
            "name": "object device",
            "documentation": "Storage device containing the graphic. Values: R:, E:, B:, or A:. Default: search priority.",
            "choices": [
              "R",
              "E",
              "B",
              "A"
            ],
            "slot": 0,
            "component": 0,
            "syntaxStart": 3,
            "syntaxEnd": 4
          },
          {
            "key": "o",
            "name": "object name",
            "documentation": "Graphic object name. Use a valid stored-object name; UNKNOWN is used when omitted.",
            "choices": [
              "IMAGE"
            ],
            "slot": 0,
            "component": 1,
            "syntaxStart": 5,
            "syntaxEnd": 6
          },
          {
            "key": "x",
            "name": "extension",
            "documentation": "Graphic object extension. Fixed value: GRF.",
            "choices": [
              "GRF"
            ],
            "slot": 0,
            "component": 2,
            "syntaxStart": 7,
            "syntaxEnd": 8
          }
        ]
      }
    ]
  },
  "^HH": {
    "title": "Configuration Label Return",
    "summary": "The ^HH command echoes printer configuration back to the host using a terminal emulator.",
    "reference": "https://docs.zebra.com/us/en/printers/software/zpl-pg/c-zpl-zpl-commands/r-zpl-hh.html",
    "signatures": [
      {
        "syntax": "^HH",
        "snippet": "^HH",
        "parameters": []
      }
    ]
  },
  "~HI": {
    "title": "Host Identification",
    "summary": "The ~HI command is designed to be sent from the host to the Zebra printer to retrieve information.",
    "reference": "https://docs.zebra.com/us/en/printers/software/zpl-pg/c-zpl-zpl-commands/r-zpl-hi.html",
    "signatures": [
      {
        "syntax": "~HI",
        "snippet": "~HI",
        "parameters": []
      }
    ]
  },
  "~HM": {
    "title": "Host RAM Status",
    "summary": "Sending ~HM to the printer immediately returns a memory status message to the host.",
    "reference": "https://docs.zebra.com/us/en/printers/software/zpl-pg/c-zpl-zpl-commands/r-zpl-hm.html",
    "signatures": [
      {
        "syntax": "~HM",
        "snippet": "~HM",
        "parameters": []
      }
    ]
  },
  "~HQ": {
    "title": "Host Query",
    "summary": "The ~HQ command group causes the printer to send information back to the host.",
    "reference": "https://docs.zebra.com/us/en/printers/software/zpl-pg/c-zpl-zpl-commands/r-zpl-hq.html",
    "signatures": [
      {
        "syntax": "~HQquery-type",
        "snippet": "~HQ${1:ES}",
        "parameters": [
          {
            "key": "query-type",
            "name": "query type",
            "documentation": "query type. For detailed examples of these parameters, see ~HQ Examples . Values: ES = requests the printer’s status - see Table 1 and Table 2 HA = hardware address of the internal wired print server JT = requests a summary of the printer’s printhead test results MA = maintenance alert settings MI = maintenance information OD = odometer PH = printhead life history PP = printer’s Plug and Play string SN = printer’s serial number UI = USB product ID and BDC release version Default: must be an accepted value or the command is ignored",
            "choices": [
              "ES",
              "HA",
              "JT",
              "MA",
              "MI",
              "OD",
              "PH",
              "PP",
              "SN",
              "UI"
            ],
            "enumValues": [
              "ES",
              "HA",
              "JT",
              "MA",
              "MI",
              "OD",
              "PH",
              "PP",
              "SN",
              "UI"
            ],
            "slot": 0,
            "component": 0,
            "syntaxStart": 3,
            "syntaxEnd": 13
          }
        ]
      }
    ]
  },
  "~HS": {
    "title": "Host Status Return",
    "summary": "When the host sends ~HS to the printer, the printer sends three data strings back.",
    "reference": "https://docs.zebra.com/us/en/printers/software/zpl-pg/c-zpl-zpl-commands/r-zpl-hs.html",
    "signatures": [
      {
        "syntax": "~HS",
        "snippet": "~HS",
        "parameters": []
      }
    ]
  },
  "^HT": {
    "title": "Host Linked Fonts List",
    "summary": "The ^HT command receives the complete list of font links over a communication port.",
    "reference": "https://docs.zebra.com/us/en/printers/software/zpl-pg/c-zpl-zpl-commands/r-zpl-ht.html",
    "signatures": [
      {
        "syntax": "^HT",
        "snippet": "^HT",
        "parameters": []
      }
    ]
  },
  "~HU": {
    "title": "Return ZebraNet Alert Configuration",
    "summary": "This command returns the table of configured ZebraNet Alert settings to the host.",
    "reference": "https://docs.zebra.com/us/en/printers/software/zpl-pg/c-zpl-zpl-commands/r-zpl-hu.html",
    "signatures": [
      {
        "syntax": "~HU",
        "snippet": "~HU",
        "parameters": []
      }
    ]
  },
  "^HV": {
    "title": "Host Verification",
    "summary": "Use this command to return data from specified fields, along with an optional ASCII header, to the host computer.",
    "reference": "https://docs.zebra.com/us/en/printers/software/zpl-pg/c-zpl-zpl-commands/r-zpl-hv.html",
    "signatures": [
      {
        "syntax": "^HV#,n,h,t,a",
        "snippet": "^HV${1:0},${2:64},${3:data},${4:0},${5:F}",
        "parameters": [
          {
            "key": "#",
            "name": "field number specified with another command",
            "documentation": "field number specified with another command. The value assigned to this parameter should be the same as the one used in another command. Values: 0 to 9999 Default: 0",
            "choices": [
              "0",
              "9999"
            ],
            "range": {
              "min": 0.0,
              "max": 9999.0
            },
            "slot": 0,
            "component": 0,
            "syntaxStart": 3,
            "syntaxEnd": 4
          },
          {
            "key": "n",
            "name": "number of bytes to be returned",
            "documentation": "number of bytes to be returned. Values: 1 to 256 Default: 64",
            "choices": [
              "64",
              "1",
              "256"
            ],
            "range": {
              "min": 1.0,
              "max": 256.0
            },
            "slot": 1,
            "component": 0,
            "syntaxStart": 5,
            "syntaxEnd": 6
          },
          {
            "key": "h",
            "name": "header to be returned with the data",
            "documentation": "header to be returned with the data. Delimiter characters terminate the string. This field is Field Hex ( ^FH ) capable. Values: 0 to 3072 bytes Default: no header",
            "choices": [
              "data",
              "0",
              "3072"
            ],
            "range": {
              "min": 0.0,
              "max": 3072.0
            },
            "slot": 2,
            "component": 0,
            "syntaxStart": 7,
            "syntaxEnd": 8
          },
          {
            "key": "t",
            "name": "termination",
            "documentation": "termination. This field is Field Hex ( ^FH ) capable. Values: 0 to 3072 characters",
            "choices": [
              "0",
              "3072"
            ],
            "slot": 3,
            "component": 0,
            "syntaxStart": 9,
            "syntaxEnd": 10
          },
          {
            "key": "a",
            "name": "command applies to",
            "documentation": "command applies to. When ^PQ is greater than 1 or if a void label occurs, send one response for a label format or one for every label printed. Values: F = Format L = Label Default: F",
            "choices": [
              "F",
              "L"
            ],
            "enumValues": [
              "F",
              "L"
            ],
            "slot": 4,
            "component": 0,
            "syntaxStart": 11,
            "syntaxEnd": 12
          }
        ]
      }
    ]
  },
  "^HW": {
    "title": "Host Directory List",
    "summary": "^HW is used to transmit a directory listing of objects in a specific memory area (storage device) back to the host device.",
    "reference": "https://docs.zebra.com/us/en/printers/software/zpl-pg/c-zpl-zpl-commands/r-zpl-hw.html",
    "signatures": [
      {
        "syntax": "^HWd:o.x,f",
        "snippet": "^HW${1:R}:${2:*}.${3:*},${4:c}",
        "parameters": [
          {
            "key": "d",
            "name": "location to retrieve object listing",
            "documentation": "location to retrieve object listing. Values: R: , E: , B: , A: and Z: Default: R:",
            "choices": [
              "R:"
            ],
            "slot": 0,
            "component": 0,
            "syntaxStart": 3,
            "syntaxEnd": 4
          },
          {
            "key": "o",
            "name": "object name",
            "documentation": "object name. Values: 1 to 8 alphanumeric characters Default: asterisk ( * ). A question mark ( ? ) can also be used.",
            "choices": [
              "*"
            ],
            "slot": 0,
            "component": 1,
            "syntaxStart": 5,
            "syntaxEnd": 6
          },
          {
            "key": "x",
            "name": "extension",
            "documentation": "extension. Values: any extension conforming to Zebra conventions Default: asterisk ( * ). A question mark ( ? ) can also be used.",
            "choices": [
              "*"
            ],
            "slot": 0,
            "component": 2,
            "syntaxStart": 7,
            "syntaxEnd": 8
          },
          {
            "key": "f",
            "name": "format",
            "documentation": "format. Values: c = column format d = default format Default: d",
            "choices": [
              "c",
              "d"
            ],
            "enumValues": [
              "c",
              "d"
            ],
            "slot": 1,
            "component": 0,
            "syntaxStart": 9,
            "syntaxEnd": 10
          }
        ]
      }
    ]
  },
  "^HY": {
    "title": "Upload Graphics",
    "summary": "The ^HY command is an extension of the ^HG command.",
    "reference": "https://docs.zebra.com/us/en/printers/software/zpl-pg/c-zpl-zpl-commands/r-zpl-hy.html",
    "signatures": [
      {
        "syntax": "^HYd:o.x",
        "snippet": "^HY${1:R}:${2:OBJECT}.${3:G}",
        "parameters": [
          {
            "key": "d",
            "name": "location of object",
            "documentation": "location of object. Values: R: , E: , B: , and A: Default: search priority",
            "choices": [
              "R",
              "E",
              "B",
              "A"
            ],
            "slot": 0,
            "component": 0,
            "syntaxStart": 3,
            "syntaxEnd": 4
          },
          {
            "key": "o",
            "name": "object name",
            "documentation": "object name. Values: 1 to 8 alphanumeric characters Default: an object name must be specified",
            "choices": [
              "OBJECT",
              "1",
              "8"
            ],
            "slot": 0,
            "component": 1,
            "syntaxStart": 5,
            "syntaxEnd": 6
          },
          {
            "key": "x",
            "name": "extension",
            "documentation": "extension. Values: G = .GRF (raw bitmap format) P = .PNG (compressed bitmap format) Default: format of stored storage",
            "choices": [
              "G",
              "P",
              "GRF"
            ],
            "enumValues": [
              "G",
              "P"
            ],
            "slot": 0,
            "component": 2,
            "syntaxStart": 7,
            "syntaxEnd": 8
          }
        ]
      }
    ]
  },
  "^HZ": {
    "title": "Display Description Information",
    "summary": "The ^HZ command is used for returning printer description information in XML format.",
    "reference": "https://docs.zebra.com/us/en/printers/software/zpl-pg/c-zpl-zpl-commands/r-zpl-hz.html",
    "signatures": [
      {
        "syntax": "^HZb",
        "snippet": "^HZ${1:a}",
        "parameters": [
          {
            "key": "b",
            "name": "display description to return",
            "documentation": "display description to return. Values: a = display all information f = display printer format setting information l = display object directory listing information o = display individual object data information r = display printer status information Default: if the value is missing or invalid, the command is ignored",
            "choices": [
              "a",
              "f",
              "l",
              "o",
              "r"
            ],
            "enumValues": [
              "a",
              "f",
              "l",
              "o",
              "r"
            ],
            "slot": 0,
            "component": 0,
            "syntaxStart": 3,
            "syntaxEnd": 4
          }
        ]
      }
    ]
  },
  "^ID": {
    "title": "Object Delete",
    "summary": "The ^ID command deletes objects, graphics, fonts, and stored formats from storage areas.",
    "reference": "https://docs.zebra.com/us/en/printers/software/zpl-pg/c-zpl-zpl-commands/r-zpl-id.html",
    "signatures": [
      {
        "syntax": "^IDd:o.x",
        "snippet": "^ID${1:R}:${2:OBJECT}.${3:GRF}",
        "parameters": [
          {
            "key": "d",
            "name": "location of stored object",
            "documentation": "location of stored object. Values: R: , E: , B: , and A: Default: R:",
            "choices": [
              "R:"
            ],
            "slot": 0,
            "component": 0,
            "syntaxStart": 3,
            "syntaxEnd": 4
          },
          {
            "key": "o",
            "name": "object name",
            "documentation": "object name. Values: any 1 to 8 character name Default: if a name is not specified, UNKNOWN is used",
            "choices": [
              "OBJECT",
              "1",
              "8"
            ],
            "slot": 0,
            "component": 1,
            "syntaxStart": 5,
            "syntaxEnd": 6
          },
          {
            "key": "x",
            "name": "extension",
            "documentation": "extension. Values: any extension conforming to Zebra conventions Default: .GRF",
            "choices": [
              "GRF"
            ],
            "slot": 0,
            "component": 2,
            "syntaxStart": 7,
            "syntaxEnd": 8
          }
        ]
      }
    ]
  },
  "^IL": {
    "title": "Image Load",
    "summary": "The ^IL command is used at the beginning of a label format to load a stored image of a format and merge it with additional data.",
    "reference": "https://docs.zebra.com/us/en/printers/software/zpl-pg/c-zpl-zpl-commands/r-zpl-il.html",
    "signatures": [
      {
        "syntax": "^ILd:o.x",
        "snippet": "^IL${1:R}:${2:OBJECT}.${3:GRF}",
        "parameters": [
          {
            "key": "d",
            "name": "location of the stored object",
            "documentation": "location of the stored object. Values: R: , E: , B: , and A: Default: R:",
            "choices": [
              "R:"
            ],
            "slot": 0,
            "component": 0,
            "syntaxStart": 3,
            "syntaxEnd": 4
          },
          {
            "key": "o",
            "name": "object name",
            "documentation": "object name. Values: 1 to 8 alphanumeric characters Default: if a name is not specified, UNKNOWN is used",
            "choices": [
              "OBJECT",
              "1",
              "8"
            ],
            "slot": 0,
            "component": 1,
            "syntaxStart": 5,
            "syntaxEnd": 6
          },
          {
            "key": "x",
            "name": "extension",
            "documentation": "extension. Fixed Value: .GRF , .PNG",
            "choices": [
              "GRF",
              "PNG"
            ],
            "enumValues": [
              "GRF",
              "PNG"
            ],
            "slot": 0,
            "component": 2,
            "syntaxStart": 7,
            "syntaxEnd": 8
          }
        ]
      }
    ]
  },
  "^IM": {
    "title": "Image Move",
    "summary": "The ^IM command performs a direct move of an image from storage area into the bitmap.",
    "reference": "https://docs.zebra.com/us/en/printers/software/zpl-pg/c-zpl-zpl-commands/r-zpl-im.html",
    "signatures": [
      {
        "syntax": "^IMd:o.x",
        "snippet": "^IM${1:R}:${2:OBJECT}.${3:GRF}",
        "parameters": [
          {
            "key": "d",
            "name": "location of stored object",
            "documentation": "location of stored object. Values: R: , E: , B: , and A: Default: search priority",
            "choices": [
              "R",
              "E",
              "B",
              "A"
            ],
            "slot": 0,
            "component": 0,
            "syntaxStart": 3,
            "syntaxEnd": 4
          },
          {
            "key": "o",
            "name": "object name",
            "documentation": "object name. Values: 1 to 8 alphanumeric characters Default: if a name is not specified, UNKNOWN is used",
            "choices": [
              "OBJECT",
              "1",
              "8"
            ],
            "slot": 0,
            "component": 1,
            "syntaxStart": 5,
            "syntaxEnd": 6
          },
          {
            "key": "x",
            "name": "extension",
            "documentation": "extension. Fixed Value: .GRF , .PNG",
            "choices": [
              "GRF",
              "PNG"
            ],
            "enumValues": [
              "GRF",
              "PNG"
            ],
            "slot": 0,
            "component": 2,
            "syntaxStart": 7,
            "syntaxEnd": 8
          }
        ]
      }
    ]
  },
  "^IS": {
    "title": "Image Save",
    "summary": "The ^IS command is used within a label format to save that format as a graphic image rather than as a ZPL II script.",
    "reference": "https://docs.zebra.com/us/en/printers/software/zpl-pg/c-zpl-zpl-commands/r-zpl-is.html",
    "signatures": [
      {
        "syntax": "^ISd:o.x,p",
        "snippet": "^IS${1:R}:${2:OBJECT}.${3:GRF},${4:Y}",
        "parameters": [
          {
            "key": "d",
            "name": "location of the stored object",
            "documentation": "location of the stored object. Values: R: , E: , B: , and A: Default: R:",
            "choices": [
              "R:"
            ],
            "slot": 0,
            "component": 0,
            "syntaxStart": 3,
            "syntaxEnd": 4
          },
          {
            "key": "o",
            "name": "object name",
            "documentation": "object name. Values: 1 to 8 alphanumeric characters Default: if a name is not specified, UNKNOWN is used",
            "choices": [
              "OBJECT",
              "1",
              "8"
            ],
            "slot": 0,
            "component": 1,
            "syntaxStart": 5,
            "syntaxEnd": 6
          },
          {
            "key": "x",
            "name": "extension",
            "documentation": "extension. Values: .GRF or .PNG Default: .GRF",
            "choices": [
              "GRF",
              "PNG"
            ],
            "enumValues": [
              "GRF",
              "PNG"
            ],
            "slot": 0,
            "component": 2,
            "syntaxStart": 7,
            "syntaxEnd": 8
          },
          {
            "key": "p",
            "name": "print image after storing",
            "documentation": "print image after storing. Values: N = no Y = yes Default: Y",
            "choices": [
              "Y",
              "N"
            ],
            "enumValues": [
              "N",
              "Y"
            ],
            "slot": 1,
            "component": 0,
            "syntaxStart": 9,
            "syntaxEnd": 10
          }
        ]
      }
    ]
  },
  "~JA": {
    "title": "Cancel All",
    "summary": "The ~JA command cancels all format commands in the buffer.",
    "reference": "https://docs.zebra.com/us/en/printers/software/zpl-pg/c-zpl-zpl-commands/r-zpl-ja.html",
    "signatures": [
      {
        "syntax": "~JA",
        "snippet": "~JA",
        "parameters": []
      }
    ]
  },
  "^JB": {
    "title": "Initialize Flash Memory",
    "summary": "The ^JB command is used to initialize various types of Flash memory available in the Zebra printers.",
    "reference": "https://docs.zebra.com/us/en/printers/software/zpl-pg/c-zpl-zpl-commands/r-zpl-jb-init-flash.html",
    "signatures": [
      {
        "syntax": "^JBa",
        "snippet": "^JB${1:A}",
        "parameters": [
          {
            "key": "a",
            "name": "device to initialize",
            "documentation": "device to initialize. Values: A = Option Flash memory B = Flash card (PCMCIA) E = internal Flash memory Default: a device must be specified",
            "choices": [
              "A",
              "B",
              "E"
            ],
            "enumValues": [
              "A",
              "B",
              "E"
            ],
            "required": true,
            "slot": 0,
            "component": 0,
            "syntaxStart": 3,
            "syntaxEnd": 4
          }
        ]
      }
    ]
  },
  "~JB": {
    "title": "Reset Optional Memory",
    "summary": "The ~JB command reinitializes optional B: memory after its battery is replaced, or intentionally clears a writable memory card.",
    "reference": "https://docs.zebra.com/us/en/printers/software/zpl-pg/c-zpl-zpl-commands/r-zpl-jb.html",
    "signatures": [
      {
        "syntax": "~JB",
        "snippet": "~JB",
        "parameters": []
      }
    ]
  },
  "~JC": {
    "title": "Set Media Sensor Calibration",
    "summary": "The ~JC command is used to force a label length measurement and adjust the media and ribbon sensor values.",
    "reference": "https://docs.zebra.com/us/en/printers/software/zpl-pg/c-zpl-zpl-commands/r-zpl-jc.html",
    "signatures": [
      {
        "syntax": "~JC",
        "snippet": "~JC",
        "parameters": []
      }
    ]
  },
  "~JD": {
    "title": "Enable Communications Diagnostics",
    "summary": "The ~JD command initiates Diagnostic Mode, which produces an ASCII printout (using current label length and full width of printer) of all characters received by the printer.",
    "reference": "https://docs.zebra.com/us/en/printers/software/zpl-pg/c-zpl-zpl-commands/r-zpl-jd.html",
    "signatures": [
      {
        "syntax": "~JD",
        "snippet": "~JD",
        "parameters": []
      }
    ]
  },
  "~JE": {
    "title": "Disable Diagnostics",
    "summary": "The ~JE command cancels Diagnostic Mode and returns the printer to normal label printing.",
    "reference": "https://docs.zebra.com/us/en/printers/software/zpl-pg/c-zpl-zpl-commands/r-zpl-je.html",
    "signatures": [
      {
        "syntax": "~JE",
        "snippet": "~JE",
        "parameters": []
      }
    ]
  },
  "~JF": {
    "title": "Set Battery Condition",
    "summary": "The ~JF command controls whether supported battery-powered printers pause when a critical low-voltage condition is detected.",
    "reference": "https://docs.zebra.com/us/en/printers/software/zpl-pg/c-zpl-zpl-commands/r-zpl-jf.html",
    "signatures": [
      {
        "syntax": "~JFp",
        "snippet": "~JF${1:Y}",
        "parameters": [
          {
            "key": "p",
            "name": "pause on low voltage",
            "documentation": "pause on low voltage. Values: Y (pause on low voltage) or N (do not pause) N is suggested when the printer is powered by the Car Battery Adapter. Default: Y",
            "choices": [
              "Y",
              "N"
            ],
            "enumValues": [
              "Y",
              "N"
            ],
            "slot": 0,
            "component": 0,
            "syntaxStart": 3,
            "syntaxEnd": 4
          }
        ]
      }
    ]
  },
  "~JG": {
    "title": "Graphing Sensor Calibration",
    "summary": "The ~JG command prints a graph (media sensor profile) of the sensor values.",
    "reference": "https://docs.zebra.com/us/en/printers/software/zpl-pg/c-zpl-zpl-commands/r-zpl-jg.html",
    "signatures": [
      {
        "syntax": "~JG",
        "snippet": "~JG",
        "parameters": []
      }
    ]
  },
  "^JH": {
    "title": "Early Warning Settings",
    "summary": "The ^JH command configures the early warning messages that appear on the LCD.",
    "reference": "https://docs.zebra.com/us/en/printers/software/zpl-pg/c-zpl-zpl-commands/r-zpl-jh.html",
    "signatures": [
      {
        "syntax": "^JHa,b,c,d,e,f,g,h,i,j",
        "snippet": "^JH${1:D},${2:900},${3:N},${4:1},${5:N},${6:D},${7:1},${8:N},${9:1000000},${10:N}",
        "parameters": [
          {
            "key": "a",
            "name": "early warning media or supplies warning",
            "documentation": "early warning media or supplies warning. This parameter is for XiIIIPlus, Xi4, RXi4, PAX3, and PAX4 printers only. Values: E = enable D = disable Default: D",
            "choices": [
              "D",
              "E"
            ],
            "enumValues": [
              "E",
              "D"
            ],
            "slot": 0,
            "component": 0,
            "syntaxStart": 3,
            "syntaxEnd": 4
          },
          {
            "key": "b",
            "name": "labels per roll",
            "documentation": "labels per roll. This parameter is for XiIIIPlus, PAX3, and PAX4 printers only. Values: 100 to 9999 Default: 900",
            "choices": [
              "900",
              "100",
              "9999"
            ],
            "range": {
              "min": 100.0,
              "max": 9999.0
            },
            "slot": 1,
            "component": 0,
            "syntaxStart": 5,
            "syntaxEnd": 6
          },
          {
            "key": "c",
            "name": "media replaced",
            "documentation": "media replaced. This parameter is for XiIIIPlus, PAX3, and PAX4 printers only. Values: Y = yes N = no Default: N",
            "choices": [
              "N",
              "Y"
            ],
            "enumValues": [
              "Y",
              "N"
            ],
            "slot": 2,
            "component": 0,
            "syntaxStart": 7,
            "syntaxEnd": 8
          },
          {
            "key": "d",
            "name": "ribbon length",
            "documentation": "ribbon length. This parameter is for XiIIIPlus, PAX3, PAX4, and ZE500 printers only. Values: XiIIIPlus series printers: N = 0M 0 = 100M 1 = 150M 2 = 200M 3 = 250M 4 = 300M 5 = 350M 6 = 400M 7 = 450M PAX series printers: N = 0M 0 = 100M 1 = 150M 2 = 200M 3 = 250M 4 = 300M 5 = 350M 6 = 400M 7 = 450M 10 = 600M 11 = 650M 12 = 700M 13 = 750M 14 = 800M 15 = 850M 16 = 900M ZE500 series printers: N = 0M 0 = 100M 1 = 150M 2 = 200M 3 = 250M 4 = 300M 5 = 350M 6 = 400M 7 = 450M 10 = 600M Default: 1 - for 96XiIIIPlus 7 - for all other printers",
            "choices": [
              "1",
              "N",
              "0",
              "2",
              "3",
              "4",
              "5",
              "6",
              "7",
              "10",
              "11",
              "12",
              "13",
              "14",
              "15",
              "16"
            ],
            "enumValues": [
              "N",
              "0",
              "1",
              "2",
              "3",
              "4",
              "5",
              "6",
              "7",
              "10",
              "11",
              "12",
              "13",
              "14",
              "15",
              "16"
            ],
            "slot": 3,
            "component": 0,
            "syntaxStart": 9,
            "syntaxEnd": 10
          },
          {
            "key": "e",
            "name": "ribbon replaced",
            "documentation": "ribbon replaced. This parameter is for Xi III Plus , PAX 3, and PAX 4 printers only. Values: Y = yes N = no Default: N",
            "choices": [
              "N",
              "Y"
            ],
            "enumValues": [
              "Y",
              "N"
            ],
            "slot": 4,
            "component": 0,
            "syntaxStart": 11,
            "syntaxEnd": 12
          },
          {
            "key": "f",
            "name": "early warning maintenance",
            "documentation": "early warning maintenance. This parameter is for Xi4, RXi4, PAX 4, ZM400, ZM600, RZ400, RZ600, and S4M printers only. Values: E = enabled D = disabled Default: D On G-Series printers, this parameter must be enabled for the ^MA driven system to work.",
            "choices": [
              "D",
              "E"
            ],
            "enumValues": [
              "E",
              "D"
            ],
            "slot": 5,
            "component": 0,
            "syntaxStart": 13,
            "syntaxEnd": 14
          },
          {
            "key": "g",
            "name": "head cleaning interval",
            "documentation": "head cleaning interval. Accepted value exceptions: accepted values for Xi III printer are 100M through 450M; accepted values for 600 dpi Xi III printers are 100M through 150M; accepted values for PAX 4 series printers are up to 900M by increments of 50M; accepted values for ZM400/ZM600, RZ400/RZ600, and S4M printers are 0M through 450M. Values: 0 = 100M 1 = 150M 2 = 200M 3 = 250M 4 = 300M 5 = 350M 6 = 400M 7 = 450M 8 = 500M 9 = 550M 10= 600M 11 = 650M 12 = 700M 13 = 750M 14 = 800M 15 = 850M 16 = 900M Default: 1 - for 96XiIIIPlus 7 - for all other printers",
            "choices": [
              "1",
              "0",
              "2",
              "3",
              "4",
              "5",
              "6",
              "7",
              "8",
              "9",
              "10",
              "11",
              "12",
              "13",
              "14",
              "15",
              "16"
            ],
            "enumValues": [
              "0",
              "1",
              "2",
              "3",
              "4",
              "5",
              "6",
              "7",
              "8",
              "9",
              "10",
              "11",
              "12",
              "13",
              "14",
              "15",
              "16"
            ],
            "slot": 6,
            "component": 0,
            "syntaxStart": 15,
            "syntaxEnd": 16
          },
          {
            "key": "h",
            "name": "head clean",
            "documentation": "head clean. Values: N = No Y = Yes Default: N",
            "choices": [
              "N",
              "Y"
            ],
            "enumValues": [
              "N",
              "Y"
            ],
            "slot": 7,
            "component": 0,
            "syntaxStart": 17,
            "syntaxEnd": 18
          },
          {
            "key": "i",
            "name": "head life threshold",
            "documentation": "head life threshold. Values: 0 - 0 in or off100-3500000 in Default: 1000000",
            "choices": [
              "1000000"
            ],
            "slot": 8,
            "component": 0,
            "syntaxStart": 19,
            "syntaxEnd": 20
          },
          {
            "key": "j",
            "name": "head replaced",
            "documentation": "head replaced. Values: N = no Y = yes Default: N",
            "choices": [
              "N",
              "Y"
            ],
            "enumValues": [
              "N",
              "Y"
            ],
            "slot": 9,
            "component": 0,
            "syntaxStart": 21,
            "syntaxEnd": 22
          }
        ]
      }
    ]
  },
  "^JI": {
    "title": "Start ZBI (Zebra BASIC Interpreter)",
    "summary": "^JI works much like the ~JI command.",
    "reference": "https://docs.zebra.com/us/en/printers/software/zpl-pg/c-zpl-zpl-commands/r-zpl-ji-zbi.html",
    "signatures": [
      {
        "syntax": "^JId:o.x,b,c,d",
        "snippet": "^JI${1:R}:${2:OBJECT}.${3:BAS},${4:Y},${5:Y},${6:50K}",
        "parameters": [
          {
            "key": "d",
            "name": "location of program to run after initialization",
            "documentation": "location of program to run after initialization. Values: R: , E: , B: , and A: Default: location must be specified",
            "choices": [
              "R",
              "E",
              "B",
              "A"
            ],
            "slot": 0,
            "component": 0,
            "syntaxStart": 3,
            "syntaxEnd": 4
          },
          {
            "key": "o",
            "name": "name of program to run after initialization",
            "documentation": "name of program to run after initialization. Values: any valid program name Default: name must be specified",
            "choices": [
              "OBJECT"
            ],
            "slot": 0,
            "component": 1,
            "syntaxStart": 5,
            "syntaxEnd": 6
          },
          {
            "key": "x",
            "name": "extension of program to run after initialization",
            "documentation": "extension of program to run after initialization. Fixed Value: .BAS , .BAE .BAE is only supported in firmware version V60.16.0Z or later",
            "choices": [
              "BAS",
              "GRF"
            ],
            "slot": 0,
            "component": 2,
            "syntaxStart": 7,
            "syntaxEnd": 8
          },
          {
            "key": "b",
            "name": "console control",
            "documentation": "console control. Values: Y = console on N = console off Default: Y",
            "choices": [
              "Y",
              "N"
            ],
            "enumValues": [
              "Y",
              "N"
            ],
            "slot": 1,
            "component": 0,
            "syntaxStart": 9,
            "syntaxEnd": 10
          },
          {
            "key": "c",
            "name": "echoing control",
            "documentation": "echoing control. Values: Y = echo on N = echo off Default: Y",
            "choices": [
              "Y",
              "N"
            ],
            "enumValues": [
              "Y",
              "N"
            ],
            "slot": 2,
            "component": 0,
            "syntaxStart": 11,
            "syntaxEnd": 12
          },
          {
            "key": "d",
            "name": "memory allocation for ZBI *",
            "documentation": "memory allocation for ZBI *. Values: 20K to 1024K Default: 50K",
            "choices": [
              "50K"
            ],
            "slot": 3,
            "component": 0,
            "syntaxStart": 13,
            "syntaxEnd": 14
          }
        ]
      }
    ]
  },
  "~JI": {
    "title": "Start ZBI (Zebra BASIC Interpreter)",
    "summary": "~JI works much like the ^JI command.",
    "reference": "https://docs.zebra.com/us/en/printers/software/zpl-pg/c-zpl-zpl-commands/r-zpl-ji.html",
    "signatures": [
      {
        "syntax": "~JI",
        "snippet": "~JI",
        "parameters": []
      }
    ]
  },
  "^JJ": {
    "title": "Set Auxiliary Port",
    "summary": "The ^JJ command allows you to control an online verifier or applicator device.",
    "reference": "https://docs.zebra.com/us/en/printers/software/zpl-pg/c-zpl-zpl-commands/r-zpl-jj.html",
    "signatures": [
      {
        "syntax": "^JJa,b,c,d,e,f",
        "snippet": "^JJ${1:0},${2:0},${3:0},${4:e},${5:e},${6:e}",
        "parameters": [
          {
            "key": "a",
            "name": "operational mode for auxiliary port",
            "documentation": "operational mode for auxiliary port. Values: 0 = off 1 = reprint on error—the printer stops on a label with a verification error. When PAUSE is pressed, the label reprints (if ^JZ is set to reprint). If a bar code is near the upper edge of a label, the label feeds out far enough for the bar code to be verified and then backfeeds to allow the next label to be printed and verified. 2 = maximum throughput—the printer stops when a verification error is detected. The printer starts printing the next label while the verifier is still checking the previous label. This mode provides maximum throughput, but does not allow the printer to stop immediately on a label with a verification error. Default: 0",
            "choices": [
              "0",
              "1",
              "2"
            ],
            "enumValues": [
              "0",
              "1"
            ],
            "slot": 0,
            "component": 0,
            "syntaxStart": 3,
            "syntaxEnd": 4
          },
          {
            "key": "b",
            "name": "application mode",
            "documentation": "application mode. Values: 0 = off 1 = End Print signal normally high, and low only when the printer is moving the label forward. 2 = End Print signal normally low, and high only when the printer is moving the label forward. 3 = End Print signal normally high, and low for 20 ms when a label has been printed and positioned. 4 = End Print signal normally low, and high for 20 ms when a label has been printed and positioned. Default: 0 The Set/Get/Do command device.applicator.end_print controls the same setting as the b parameter.",
            "choices": [
              "0",
              "1",
              "2",
              "3",
              "4"
            ],
            "enumValues": [
              "0",
              "1",
              "2",
              "3"
            ],
            "slot": 1,
            "component": 0,
            "syntaxStart": 5,
            "syntaxEnd": 6
          },
          {
            "key": "c",
            "name": "application mode start signal print",
            "documentation": "application mode start signal print. Values: p = Pulse Mode - Start Print signal must be de-asserted before it can be asserted for the next label. l = Level Mode - Start Print signal does not need to be de-asserted to print the next label. As long as the Start Print signal is low and a label is formatted, a label prints. Default: 0",
            "choices": [
              "0",
              "p",
              "l"
            ],
            "slot": 2,
            "component": 0,
            "syntaxStart": 7,
            "syntaxEnd": 8
          },
          {
            "key": "d",
            "name": "application label error mode",
            "documentation": "application label error mode. Values: e = error mode—the printer asserts the Service Required signal (svce_req - pin 10) on the application port, enters into Pause Mode, and displays an error message on the LCD. f = Feed Mode—a blank label prints when the web is not found where expected to sync the printer to the media. Default: f",
            "choices": [
              "e",
              "f"
            ],
            "enumValues": [
              "e",
              "f"
            ],
            "slot": 3,
            "component": 0,
            "syntaxStart": 9,
            "syntaxEnd": 10
          },
          {
            "key": "e",
            "name": "reprint mode",
            "documentation": "reprint mode. Values: e = enabled—the last label reprints after the signal is asserted. If a label is canceled, the label to be reprinted is also canceled. This mode consumes more memory because the last printed label is not released until it reprints. d = disabled—printer ignores the Reprint signal. Default: d",
            "choices": [
              "e",
              "d"
            ],
            "slot": 4,
            "component": 0,
            "syntaxStart": 11,
            "syntaxEnd": 12
          },
          {
            "key": "f",
            "name": "ribbon low mode",
            "documentation": "ribbon low mode. Values: e = enabled - printer warning issued when ribbon low. d = disabled - printer warning not issued when ribbon low. Default: e",
            "choices": [
              "e",
              "d"
            ],
            "enumValues": [
              "e",
              "d"
            ],
            "slot": 5,
            "component": 0,
            "syntaxStart": 13,
            "syntaxEnd": 14
          }
        ]
      }
    ]
  },
  "~JL": {
    "title": "Set Label Length",
    "summary": "The ~JL command is used to set the label length.",
    "reference": "https://docs.zebra.com/us/en/printers/software/zpl-pg/c-zpl-zpl-commands/r-zpl-jl.html",
    "signatures": [
      {
        "syntax": "~JL",
        "snippet": "~JL",
        "parameters": []
      }
    ]
  },
  "^JM": {
    "title": "Set Dots per Millimeter",
    "summary": "The ^JM command lowers the density of the print—24 dots/mm becomes 12, 12 dots/mm becomes 6, 8 dots/mm becomes 4, and 6 dots/mm becomes 3.",
    "reference": "https://docs.zebra.com/us/en/printers/software/zpl-pg/c-zpl-zpl-commands/r-zpl-jm.html",
    "signatures": [
      {
        "syntax": "^JMn",
        "snippet": "^JM${1:A}",
        "parameters": [
          {
            "key": "n",
            "name": "set dots per millimeter",
            "documentation": "set dots per millimeter. Values: A = 24 dots/mm, 12 dots/mm, 8 dots/mm, or 6 dots/mm B = 12 dots/mm, 6 dots/mm, 4 dots/mm, or 3 dots/mm Default: A",
            "choices": [
              "A",
              "B"
            ],
            "enumValues": [
              "A",
              "B"
            ],
            "slot": 0,
            "component": 0,
            "syntaxStart": 3,
            "syntaxEnd": 4
          }
        ]
      }
    ]
  },
  "~JN": {
    "title": "Head Test Fatal",
    "summary": "The ~JN command turns on the head test option.",
    "reference": "https://docs.zebra.com/us/en/printers/software/zpl-pg/c-zpl-zpl-commands/r-zpl-jn.html",
    "signatures": [
      {
        "syntax": "~JN",
        "snippet": "~JN",
        "parameters": []
      }
    ]
  },
  "~JO": {
    "title": "Head Test Non-Fatal",
    "summary": "The ~JO command configures the printer to run the head test with error reporting enabled.",
    "reference": "https://docs.zebra.com/us/en/printers/software/zpl-pg/c-zpl-zpl-commands/r-zpl-jo.html",
    "signatures": [
      {
        "syntax": "~JO",
        "snippet": "~JO",
        "parameters": []
      }
    ]
  },
  "~JP": {
    "title": "Pause and Cancel Format",
    "summary": "The ~JP command clears the format currently being processed and places the printer into Pause Mode.",
    "reference": "https://docs.zebra.com/us/en/printers/software/zpl-pg/c-zpl-zpl-commands/r-zpl-jp.html",
    "signatures": [
      {
        "syntax": "~JP",
        "snippet": "~JP",
        "parameters": []
      }
    ]
  },
  "~JQ": {
    "title": "Terminate Zebra BASIC Interpreter",
    "summary": "The ~JQ command is used when Zebra BASIC Interpreter is active.",
    "reference": "https://docs.zebra.com/us/en/printers/software/zpl-pg/c-zpl-zpl-commands/r-zpl-jq.html",
    "signatures": [
      {
        "syntax": "~JQ",
        "snippet": "~JQ",
        "parameters": []
      }
    ]
  },
  "~JR": {
    "title": "Power On Reset",
    "summary": "The ~JR command resets all of the printer’s internal software, performs a power-on self-test (POST), clears the buffer and DRAM, and resets communication parameters and default values.",
    "reference": "https://docs.zebra.com/us/en/printers/software/zpl-pg/c-zpl-zpl-commands/r-zpl-jr.html",
    "signatures": [
      {
        "syntax": "~JR",
        "snippet": "~JR",
        "parameters": []
      }
    ]
  },
  "^JS": {
    "title": "Sensor Select",
    "summary": "The ^JS command specifies which sensor to use.",
    "reference": "https://docs.zebra.com/us/en/printers/software/zpl-pg/c-zpl-zpl-commands/r-zpl-js.html",
    "signatures": [
      {
        "syntax": "^JSa",
        "snippet": "^JS${1:Z}",
        "parameters": [
          {
            "key": "a",
            "name": "sensor selection",
            "documentation": "sensor selection. Values: A = auto select R = reflective sensor T = transmissive sensor Default: Z series = A S4M = R",
            "choices": [
              "Z",
              "A",
              "R",
              "T",
              "series",
              "S4M"
            ],
            "enumValues": [
              "Z",
              "A",
              "R",
              "T"
            ],
            "slot": 0,
            "component": 0,
            "syntaxStart": 3,
            "syntaxEnd": 4
          }
        ]
      }
    ]
  },
  "~JS": {
    "title": "Change Backfeed Sequence",
    "summary": "The ~JS command is used to control the backfeed sequence.",
    "reference": "https://docs.zebra.com/us/en/printers/software/zpl-pg/c-zpl-zpl-commands/r-zpl-js-change-backfeed.html",
    "signatures": [
      {
        "syntax": "~JSb",
        "snippet": "~JS${1:N}",
        "parameters": [
          {
            "key": "b",
            "name": "backfeed order in relation to printing",
            "documentation": "backfeed order in relation to printing. A —100 percent backfeed after printing and cutting B —0 percent backfeed after printing and cutting, and 100 percent before printing the next label N —normal — 90 percent backfeed after label is printed O —off — turn backfeed off completely 10 to 90 —percentage value The value entered must be a multiple of 10. Values not divisible by 10 are rounded to the nearest acceptable value. For example, ~JS55 is accepted as 60 percent backfeed. Default: N",
            "choices": [
              "N"
            ],
            "slot": 0,
            "component": 0,
            "syntaxStart": 3,
            "syntaxEnd": 4
          }
        ]
      }
    ]
  },
  "^JT": {
    "title": "Head Test Interval",
    "summary": "The ^JT command allows you to change the printhead test interval from every 100 labels to any desired interval.",
    "reference": "https://docs.zebra.com/us/en/printers/software/zpl-pg/c-zpl-zpl-commands/r-zpl-jt.html",
    "signatures": [
      {
        "syntax": "^JT####,a,b,c",
        "snippet": "^JT${1:0000},${2:N},${3:0},${4:9999}",
        "parameters": [
          {
            "key": "####",
            "name": "four-digit number of labels printed between head tests",
            "documentation": "four-digit number of labels printed between head tests. Values: 0000 to 9999 If a value greater than 9999 is entered, it is ignored. Default: 0000 (off)",
            "choices": [
              "0000",
              "9999"
            ],
            "range": {
              "min": 0.0,
              "max": 9999.0
            },
            "slot": 0,
            "component": 0,
            "syntaxStart": 3,
            "syntaxEnd": 7
          },
          {
            "key": "a",
            "name": "manually select range of elements to test",
            "documentation": "manually select range of elements to test. Values: N = no Y = yes Initial Value at Power Up: N",
            "choices": [
              "N",
              "Y"
            ],
            "enumValues": [
              "N",
              "Y"
            ],
            "slot": 1,
            "component": 0,
            "syntaxStart": 8,
            "syntaxEnd": 9
          },
          {
            "key": "b",
            "name": "first element to check when parameter a is Y",
            "documentation": "first element to check when parameter a is Y. Values: 0 to 9999 Initial Value at Power Up: 0",
            "choices": [
              "0",
              "9999"
            ],
            "range": {
              "min": 0.0,
              "max": 9999.0
            },
            "slot": 2,
            "component": 0,
            "syntaxStart": 10,
            "syntaxEnd": 11
          },
          {
            "key": "c",
            "name": "last element to check when parameter a is Y",
            "documentation": "last element to check when parameter a is Y. Values: 0 to 9999 Initial Value at Power Up: 9999",
            "choices": [
              "9999",
              "0"
            ],
            "range": {
              "min": 0.0,
              "max": 9999.0
            },
            "slot": 3,
            "component": 0,
            "syntaxStart": 12,
            "syntaxEnd": 13
          }
        ]
      }
    ]
  },
  "^JU": {
    "title": "Configuration Update",
    "summary": "The ^JU command sets the active configuration for the printer.",
    "reference": "https://docs.zebra.com/us/en/printers/software/zpl-pg/c-zpl-zpl-commands/r-zpl-ju.html",
    "signatures": [
      {
        "syntax": "^JUa",
        "snippet": "^JU${1:A}",
        "parameters": [
          {
            "key": "a",
            "name": "active configuration",
            "documentation": "active configuration. Values: A = reload factory settings and factory network settings. F = reload factory settings. N = reload factory network settings. These values are lost at power-off if not saved with ^JUS . R = recall the last saved settings. S = save current settings. These values are used at power-on. Default: a value must be specified",
            "choices": [
              "A",
              "F",
              "N",
              "R",
              "S"
            ],
            "enumValues": [
              "A",
              "F",
              "N"
            ],
            "slot": 0,
            "component": 0,
            "syntaxStart": 3,
            "syntaxEnd": 4
          }
        ]
      }
    ]
  },
  "^JW": {
    "title": "Set Ribbon Tension",
    "summary": "^JW sets the ribbon tension for the printer it is sent to.",
    "reference": "https://docs.zebra.com/us/en/printers/software/zpl-pg/c-zpl-zpl-commands/r-zpl-jw.html",
    "signatures": [
      {
        "syntax": "^JWt",
        "snippet": "^JW${1:L}",
        "parameters": [
          {
            "key": "t",
            "name": "tension",
            "documentation": "tension. Values: L = low M = medium H = high Default: a value must be specified",
            "choices": [
              "L",
              "M",
              "H"
            ],
            "enumValues": [
              "L",
              "M",
              "H"
            ],
            "slot": 0,
            "component": 0,
            "syntaxStart": 3,
            "syntaxEnd": 4
          }
        ]
      }
    ]
  },
  "~JX": {
    "title": "Cancel Current Partially Input Format",
    "summary": "The ~JX command cancels a format currently being sent to the printer.",
    "reference": "https://docs.zebra.com/us/en/printers/software/zpl-pg/c-zpl-zpl-commands/r-zpl-jx.html",
    "signatures": [
      {
        "syntax": "~JX",
        "snippet": "~JX",
        "parameters": []
      }
    ]
  },
  "^JZ": {
    "title": "Reprint After Error",
    "summary": "The ^JZ command reprints a partially printed label caused by a Ribbon Out, Media Out, or Head Open error condition.",
    "reference": "https://docs.zebra.com/us/en/printers/software/zpl-pg/c-zpl-zpl-commands/r-zpl-jz.html",
    "signatures": [
      {
        "syntax": "^JZa",
        "snippet": "^JZ${1:Y}",
        "parameters": [
          {
            "key": "a",
            "name": "reprint after error",
            "documentation": "reprint after error. Values: N = no Y = yes Initial Value at Power Up: Y",
            "choices": [
              "Y",
              "N"
            ],
            "enumValues": [
              "N",
              "Y"
            ],
            "slot": 0,
            "component": 0,
            "syntaxStart": 3,
            "syntaxEnd": 4
          }
        ]
      }
    ]
  },
  "~KB": {
    "title": "Kill Battery (Battery Discharge Mode)",
    "summary": "The ~KB command places the printer in battery discharge mode.",
    "reference": "https://docs.zebra.com/us/en/printers/software/zpl-pg/c-zpl-zpl-commands/r-zpl-kb.html",
    "signatures": [
      {
        "syntax": "~KB",
        "snippet": "~KB",
        "parameters": []
      }
    ]
  },
  "^KD": {
    "title": "Select Date and Time Format (for Real Time Clock)",
    "summary": "The ^KD command selects the format that the Real-Time Clock’s date and time information presents as on a configuration label.",
    "reference": "https://docs.zebra.com/us/en/printers/software/zpl-pg/c-zpl-zpl-commands/r-zpl-kd.html",
    "signatures": [
      {
        "syntax": "^KDa",
        "snippet": "^KD${1:0}",
        "parameters": [
          {
            "key": "a",
            "name": "value of date and time format",
            "documentation": "value of date and time format. Values: 0 = normal, displays Version Number of firmware 1 = MM/DD/YY (24-hour clock) 2 = MM/DD/YY (12-hour clock) 3 = DD/MM/YY (24-hour clock) 4 = DD/MM/YY (12-hour clock) Default: 0",
            "choices": [
              "0",
              "1",
              "2",
              "3",
              "4"
            ],
            "enumValues": [
              "0",
              "1",
              "2",
              "3",
              "4"
            ],
            "slot": 0,
            "component": 0,
            "syntaxStart": 3,
            "syntaxEnd": 4
          }
        ]
      }
    ]
  },
  "^KL": {
    "title": "Define Language",
    "summary": "The ^KL command selects the language displayed on the control panel.",
    "reference": "https://docs.zebra.com/us/en/printers/software/zpl-pg/c-zpl-zpl-commands/r-zpl-kl.html",
    "signatures": [
      {
        "syntax": "^KLa",
        "snippet": "^KL${1:1}",
        "parameters": [
          {
            "key": "a",
            "name": "language",
            "documentation": "language. Values: 1 = English 2 = Spanish 3 = French 4 = German 5 = Italian 6 = Norwegian 7 = Portuguese 8 = Swedish 9 = Danish 10 = Spanish2 11 = Dutch 12 = Finnish 13 = Japanese 14 = Korean* 15 = Simplified Chinese * 16 = Traditional Chinese * 17 = Russian * 18 = Polish * 19 = Czech * 20 = Romanian * Default: 1",
            "choices": [
              "1",
              "2",
              "3",
              "4",
              "5",
              "6",
              "7",
              "8",
              "9",
              "10",
              "11",
              "12",
              "13",
              "14",
              "15",
              "16",
              "17",
              "18",
              "19",
              "20"
            ],
            "enumValues": [
              "1",
              "2",
              "3",
              "4",
              "5",
              "6",
              "7",
              "8",
              "9",
              "10",
              "11",
              "12",
              "13",
              "14",
              "15",
              "16",
              "17",
              "18",
              "19",
              "20"
            ],
            "slot": 0,
            "component": 0,
            "syntaxStart": 3,
            "syntaxEnd": 4
          }
        ]
      }
    ]
  },
  "^KN": {
    "title": "Define Printer Name",
    "summary": "The printer’s network name and description can be set using the ^KN command.",
    "reference": "https://docs.zebra.com/us/en/printers/software/zpl-pg/c-zpl-zpl-commands/r-zpl-kn.html",
    "signatures": [
      {
        "syntax": "^KNa,b",
        "snippet": "^KN${1:OBJECT},${2:text}",
        "parameters": [
          {
            "key": "a",
            "name": "printer name",
            "documentation": "printer name. Values: up to 16 alphanumeric characters Default: If no printer name is specified in a printer with a MAC address, the printer name will default to \"ZBRxxx,\" where xxx is the last three octets of the MAC address converted into ASCII text. For printers without a MAC address, if a value is not entered, the current stored value is erased. If more than 16 characters are entered, only the first 16 are used.",
            "choices": [
              "OBJECT"
            ],
            "slot": 0,
            "component": 0,
            "syntaxStart": 3,
            "syntaxEnd": 4
          },
          {
            "key": "b",
            "name": "printer description",
            "documentation": "printer description. Values: up to 35 alphanumeric characters Default: if a value is not entered, the current stored value is erased If more than 35 characters are entered, only the first 35 are used. The value of this parameter will be displayed on the printer’s web page in parentheses.",
            "choices": [
              "text"
            ],
            "slot": 1,
            "component": 0,
            "syntaxStart": 5,
            "syntaxEnd": 6
          }
        ]
      }
    ]
  },
  "^KP": {
    "title": "Define Password",
    "summary": "The ^KP command is used to define the password that must be entered to access the control panel switches and LCD Setup Mode.",
    "reference": "https://docs.zebra.com/us/en/printers/software/zpl-pg/c-zpl-zpl-commands/r-zpl-kp.html",
    "signatures": [
      {
        "syntax": "^KPa,b",
        "snippet": "^KP${1:0000},${2:3}",
        "parameters": [
          {
            "key": "a",
            "name": "mandatory four-digit password",
            "documentation": "mandatory four-digit password. Values: 0000 to 9999 (four digits) Default: For printers purchased in the EMEA region after August 1, 2025: The default value is empty and must be set before it can be used on the printer. For all other printers: 1234",
            "choices": [
              "0000",
              "9999"
            ],
            "slot": 0,
            "component": 0,
            "syntaxStart": 3,
            "syntaxEnd": 4
          },
          {
            "key": "b",
            "name": "password level (applicable to the S4M printer only)",
            "documentation": "password level (applicable to the S4M printer only). Values: 1, 2, 3, 4 Default: 3",
            "choices": [
              "3",
              "1",
              "2",
              "4"
            ],
            "enumValues": [
              "1",
              "2",
              "3",
              "4"
            ],
            "slot": 1,
            "component": 0,
            "syntaxStart": 5,
            "syntaxEnd": 6
          }
        ]
      }
    ]
  },
  "^KV": {
    "title": "Kiosk Values",
    "summary": "The ^KV command sets several parameters that affect the printers operation when ^MM is set to K - Kiosk mode",
    "reference": "https://docs.zebra.com/us/en/printers/software/zpl-pg/c-zpl-zpl-commands/r-zpl-kv.html",
    "signatures": [
      {
        "syntax": "^KVa,b,c,d,e",
        "snippet": "^KV${1:0},${2:9},${3:0},${4:0},${5:400}",
        "parameters": [
          {
            "key": "a",
            "name": "kiosk cut amount",
            "documentation": "kiosk cut amount. Values: 0 = normal cut 10-60 = partial cut, value = mm of media left uncut Default: 0 This parameter is ignored if it is missing or invalid. The current value of the parameter remains unchanged.",
            "choices": [
              "0",
              "10-60"
            ],
            "enumValues": [
              "0",
              "10-60"
            ],
            "slot": 0,
            "component": 0,
            "syntaxStart": 3,
            "syntaxEnd": 4
          },
          {
            "key": "b",
            "name": "kiosk cut margin",
            "documentation": "kiosk cut margin. Values: 2 - 9 = mm of distance Default: 9 = mm of distance This parameter is ignored if it is missing or invalid. The current value of the parameter remains unchanged.",
            "choices": [
              "9"
            ],
            "slot": 1,
            "component": 0,
            "syntaxStart": 5,
            "syntaxEnd": 6
          },
          {
            "key": "c",
            "name": "kiosk present type",
            "documentation": "kiosk present type. Values: 0 = Eject page when new page is printed 1 = Retract page when new page is printed 2 = Do nothing when new page is printed Default: 0 This parameter is ignored if it is missing or invalid. The current value of the parameter remains unchanged.",
            "choices": [
              "0",
              "1",
              "2"
            ],
            "enumValues": [
              "0",
              "1",
              "2"
            ],
            "slot": 2,
            "component": 0,
            "syntaxStart": 7,
            "syntaxEnd": 8
          },
          {
            "key": "d",
            "name": "kiosk present timeout",
            "documentation": "kiosk present timeout. Values: 0-300 = If label is not taken, retract label when timeout expires. Timeout is in seconds. Zero (0) indicates that there is no timeout. The label will stay presented until removed manually or a new label is printed. Default: 0 This parameter is ignored if it is missing or invalid. The current value of the parameter remains unchanged.",
            "choices": [
              "0",
              "0-300"
            ],
            "slot": 3,
            "component": 0,
            "syntaxStart": 9,
            "syntaxEnd": 10
          },
          {
            "key": "e",
            "name": "presenter loop length",
            "documentation": "presenter loop length. Values: 0 = paper is fed straight through the presenter 3-1023 = loop length in mm. Default: 400 400= gives a loop of approximately 400mm This parameter is ignored if it is missing or invalid. The current value of the parameter remains unchanged. . If this is greater than loop_length_max (see SGD media.present.loop_length_max) then it will be set equal to loop_length_max.",
            "choices": [
              "400",
              "0",
              "3-1023"
            ],
            "enumValues": [
              "400",
              "0",
              "3-1023"
            ],
            "slot": 4,
            "component": 0,
            "syntaxStart": 11,
            "syntaxEnd": 12
          }
        ]
      }
    ]
  },
  "^LF": {
    "title": "List Font Links",
    "summary": "The ^LF command prints out a list of the linked fonts.",
    "reference": "https://docs.zebra.com/us/en/printers/software/zpl-pg/c-zpl-zpl-commands/r-zpl-lf.html",
    "signatures": [
      {
        "syntax": "^LF",
        "snippet": "^LF",
        "parameters": []
      }
    ]
  },
  "^LH": {
    "title": "Label Home",
    "summary": "The ^LH command sets the label home position.",
    "reference": "https://docs.zebra.com/us/en/printers/software/zpl-pg/c-zpl-zpl-commands/r-zpl-lh.html",
    "signatures": [
      {
        "syntax": "^LHx,y",
        "snippet": "^LH${1:0},${2:0}",
        "parameters": [
          {
            "key": "x",
            "name": "x-axis position (in dots)",
            "documentation": "x-axis position (in dots). Values: 0 to 32000 Initial Value at Power Up: 0 or last permanently saved value",
            "choices": [
              "0",
              "32000"
            ],
            "range": {
              "min": 0.0,
              "max": 32000.0
            },
            "slot": 0,
            "component": 0,
            "syntaxStart": 3,
            "syntaxEnd": 4
          },
          {
            "key": "y",
            "name": "y-axis position (in dots)",
            "documentation": "y-axis position (in dots). Values: 0 to 32000 Initial Value at Power Up: 0 or last permanently saved value",
            "choices": [
              "0",
              "32000"
            ],
            "range": {
              "min": 0.0,
              "max": 32000.0
            },
            "slot": 1,
            "component": 0,
            "syntaxStart": 5,
            "syntaxEnd": 6
          }
        ]
      }
    ]
  },
  "^LL": {
    "title": "Label Length",
    "summary": "The ^LL command defines the length of the label.",
    "reference": "https://docs.zebra.com/us/en/printers/software/zpl-pg/c-zpl-zpl-commands/r-zpl-ll.html",
    "signatures": [
      {
        "syntax": "^LLy.x",
        "snippet": "^LL${1:1218}.${2:N}",
        "parameters": [
          {
            "key": "y",
            "name": "label length",
            "documentation": "label length. Defines the label length. Values: 1 to 32000 , not to exceed the maximum label size. While the printer accepts any value for this parameter, the amount of memory installed determines the maximum length of the label. Default: typically set through the LCD (if applicable), or to the maximum label length capability of the printer.",
            "choices": [
              "1218",
              "LCD",
              "1",
              "32000"
            ],
            "range": {
              "min": 1.0,
              "max": 32000.0
            },
            "slot": 0,
            "component": 0,
            "syntaxStart": 3,
            "syntaxEnd": 4
          },
          {
            "key": "x",
            "name": "apply to all media",
            "documentation": "apply to all media. Specifies whether the label length applies to all media, including Gap and Mark. Values: N or Y , n or y is also accepted. N means that the ^LL length applies only to continuous media. Y means that the ^LL length applies to all media, including Gap and Mark. Default: N . If no value is present, the current setting is left unchanged.",
            "choices": [
              "N"
            ],
            "slot": 0,
            "component": 1,
            "syntaxStart": 5,
            "syntaxEnd": 6
          }
        ]
      }
    ]
  },
  "^LR": {
    "title": "Label Reverse Print",
    "summary": "The ^LR command reverses the printing of all fields in the label format.",
    "reference": "https://docs.zebra.com/us/en/printers/software/zpl-pg/c-zpl-zpl-commands/r-zpl-lr.html",
    "signatures": [
      {
        "syntax": "^LRa",
        "snippet": "^LR${1:N}",
        "parameters": [
          {
            "key": "a",
            "name": "reverse print all fields",
            "documentation": "reverse print all fields. Values: N = no Y = yes N or last permanently saved value",
            "choices": [
              "N",
              "Y"
            ],
            "enumValues": [
              "N",
              "Y"
            ],
            "slot": 0,
            "component": 0,
            "syntaxStart": 3,
            "syntaxEnd": 4
          }
        ]
      }
    ]
  },
  "^LS": {
    "title": "Label Shift",
    "summary": "The ^LS command allows for compatibility with Z-130 printer formats that are set for less than full label width.",
    "reference": "https://docs.zebra.com/us/en/printers/software/zpl-pg/c-zpl-zpl-commands/r-zpl-ls.html",
    "signatures": [
      {
        "syntax": "^LSa",
        "snippet": "^LS${1:0}",
        "parameters": [
          {
            "key": "a",
            "name": "shift left value (in dots)",
            "documentation": "shift left value (in dots). Values: -9999 to 9999 Initial Value at Power Up: 0",
            "choices": [
              "0",
              "9999"
            ],
            "range": {
              "min": -9999.0,
              "max": 9999.0
            },
            "slot": 0,
            "component": 0,
            "syntaxStart": 3,
            "syntaxEnd": 4
          }
        ]
      }
    ]
  },
  "^LT": {
    "title": "Label Top",
    "summary": "The ^LT command moves the entire label format a maximum of 120 dot rows up or down from its current position, in relation to the top edge of the label.",
    "reference": "https://docs.zebra.com/us/en/printers/software/zpl-pg/c-zpl-zpl-commands/r-zpl-lt.html",
    "signatures": [
      {
        "syntax": "^LTx",
        "snippet": "^LT${1:0}",
        "parameters": [
          {
            "key": "x",
            "name": "label top (in dot rows)",
            "documentation": "label top (in dot rows). Values: HC100: 0 to 120 XiIIIPlus 600dpi: -240 to 240 All other Zebra printers: -120 to 120 Default: a value must be specified or the command is ignored",
            "choices": [
              "0",
              "120"
            ],
            "range": {
              "min": 0.0,
              "max": 120.0
            },
            "slot": 0,
            "component": 0,
            "syntaxStart": 3,
            "syntaxEnd": 4
          }
        ]
      }
    ]
  },
  "^MA": {
    "title": "Set Maintenance Alerts",
    "summary": "The ^MA command controls how the printer issues printed maintenance alerts.",
    "reference": "https://docs.zebra.com/us/en/printers/software/zpl-pg/c-zpl-zpl-commands/r-zpl-ma.html",
    "signatures": [
      {
        "syntax": "^MAtype,print,printlabel_threshold,frequency,units",
        "snippet": "^MA${1:R},${2:N},${3:R},${4:0},${5:I}",
        "parameters": [
          {
            "key": "type",
            "name": "type of alert",
            "documentation": "type of alert. Values: R = head replacement C = head cleaning Default: This parameter must be specified as R or C for print , printlabel_threshold , and frequency to be saved. However, units will always be set.",
            "choices": [
              "R",
              "C"
            ],
            "enumValues": [
              "R",
              "C"
            ],
            "slot": 0,
            "component": 0,
            "syntaxStart": 3,
            "syntaxEnd": 7
          },
          {
            "key": "print",
            "name": "determines if the alert prints a label",
            "documentation": "determines if the alert prints a label. Values: Y = print a label N = do not print a label Default: N",
            "choices": [
              "N",
              "Y"
            ],
            "enumValues": [
              "Y",
              "N"
            ],
            "slot": 1,
            "component": 0,
            "syntaxStart": 8,
            "syntaxEnd": 13
          },
          {
            "key": "printlabel_threshold",
            "name": "the distance where the first alert occurs",
            "documentation": "the distance where the first alert occurs. Values: R = head replacement (unit of measurement for head is km with a range of 0 to 150 km) C = clean head with a range of 100 to 2000 meters. 0 = off (when set to 0, the selected alert is disabled; otherwise, it is enabled. Default: R = 50 km (1,968,500 inches) and C = 0 (off).",
            "choices": [
              "R",
              "C",
              "0"
            ],
            "slot": 2,
            "component": 0,
            "syntaxStart": 14,
            "syntaxEnd": 34
          },
          {
            "key": "frequency",
            "name": "distance before reissuing the alert",
            "documentation": "distance before reissuing the alert. The unit of measurement is in meters. The range is 0 to 2000. The range for G-Series printers is 0 or 5 to 2000 meters. When set to 0 , the alert label is only printed on power-up or when the printer is reset. Default: 0 (print on power-up).",
            "choices": [
              "0"
            ],
            "slot": 3,
            "component": 0,
            "syntaxStart": 35,
            "syntaxEnd": 44
          },
          {
            "key": "units",
            "name": "odometer and printhead maintenance commands",
            "documentation": "odometer and printhead maintenance commands. The units parameter reports units of the odometer and printhead maintenance commands, as follows: ~HQOD,~HQPH,~WQOD , ~WQPH . Values: C = centimeters (displays as: cm ) I = inches (displays as: \" ) M = meters (displays as: M ) Default: I",
            "choices": [
              "I",
              "C",
              "M"
            ],
            "enumValues": [
              "C",
              "I",
              "M"
            ],
            "slot": 4,
            "component": 0,
            "syntaxStart": 45,
            "syntaxEnd": 50
          }
        ]
      }
    ]
  },
  "^MC": {
    "title": "Map Clear",
    "summary": "In normal operation, the bitmap is cleared after the format has been printed.",
    "reference": "https://docs.zebra.com/us/en/printers/software/zpl-pg/c-zpl-zpl-commands/r-zpl-mc.html",
    "signatures": [
      {
        "syntax": "^MCa",
        "snippet": "^MC${1:Y}",
        "parameters": [
          {
            "key": "a",
            "name": "map clear",
            "documentation": "map clear. Values: Y (clear bitmap) or N (do not clear bitmap) Initial Value at Power Up: Y",
            "choices": [
              "Y",
              "N"
            ],
            "enumValues": [
              "Y",
              "N"
            ],
            "slot": 0,
            "component": 0,
            "syntaxStart": 3,
            "syntaxEnd": 4
          }
        ]
      }
    ]
  },
  "^MD": {
    "title": "Media Darkness",
    "summary": "The ^MD command adjusts the darkness relative to the current darkness setting.",
    "reference": "https://docs.zebra.com/us/en/printers/software/zpl-pg/c-zpl-zpl-commands/r-zpl-md.html",
    "signatures": [
      {
        "syntax": "^MDa",
        "snippet": "^MD${1:0}",
        "parameters": [
          {
            "key": "a",
            "name": "media darkness level",
            "documentation": "media darkness level. Values: -30 to 30 , depending on current value Initial Value at Power Up: 0 If no value is entered, this command is ignored.",
            "choices": [
              "0",
              "30"
            ],
            "range": {
              "min": -30.0,
              "max": 30.0
            },
            "slot": 0,
            "component": 0,
            "syntaxStart": 3,
            "syntaxEnd": 4
          }
        ]
      }
    ]
  },
  "^MF": {
    "title": "Media Feed",
    "summary": "The ^MF command dictates what happens to the media at power-up and at head-close after the error clears.",
    "reference": "https://docs.zebra.com/us/en/printers/software/zpl-pg/c-zpl-zpl-commands/r-zpl-mf.html",
    "signatures": [
      {
        "syntax": "^MFp,h",
        "snippet": "^MF${1:C},${2:C}",
        "parameters": [
          {
            "key": "p",
            "name": "feed action at power-up",
            "documentation": "feed action at power-up. Values: F = feed to the first web after sensor C = (see ~JC definition) L = (see ~JL definition) N = no media feed S = short calibration 1 Default: C",
            "choices": [
              "C",
              "F",
              "L",
              "N",
              "S"
            ],
            "enumValues": [
              "F",
              "C",
              "L",
              "N",
              "S"
            ],
            "slot": 0,
            "component": 0,
            "syntaxStart": 3,
            "syntaxEnd": 4
          },
          {
            "key": "h",
            "name": "feed action after closing printhead",
            "documentation": "feed action after closing printhead. Values: F = feed to the first web after sensor C = (see ~JC definition) L = (see ~JL definition) N = no media feed S = short calibration 1 Default: C",
            "choices": [
              "C",
              "F",
              "L",
              "N",
              "S"
            ],
            "enumValues": [
              "F",
              "C",
              "L",
              "N",
              "S"
            ],
            "slot": 1,
            "component": 0,
            "syntaxStart": 5,
            "syntaxEnd": 6
          }
        ]
      }
    ]
  },
  "^MI": {
    "title": "Set Maintenance Information Message",
    "summary": "The ^MI command controls the content of maintenance alert messages, which are reminders printed by the printer to instruct the operator to clean or replace the printhead.",
    "reference": "https://docs.zebra.com/us/en/printers/software/zpl-pg/c-zpl-zpl-commands/r-zpl-mi.html",
    "signatures": [
      {
        "syntax": "^MItype,message",
        "snippet": "^MI${1:R},${2:HEAD}",
        "parameters": [
          {
            "key": "type",
            "name": "identifies the type of alert",
            "documentation": "identifies the type of alert. Values: R = head replacement C = head cleaning Default: R",
            "choices": [
              "R",
              "C"
            ],
            "enumValues": [
              "R",
              "C"
            ],
            "slot": 0,
            "component": 0,
            "syntaxStart": 3,
            "syntaxEnd": 7
          },
          {
            "key": "message",
            "name": "message that prints on the label when a maintenance alert occurs",
            "documentation": "message that prints on the label when a maintenance alert occurs. The maximum length of each message is 63 characters. All characters following the comma and preceding the next tilde ( ~ ) or carat (^ ) define the message string. Commas (,) are not allowed in the message. Default: HEAD CLEANING = please clean printhead HEAD REPLACEMENT = please replace printhead",
            "choices": [
              "HEAD",
              "CLEANING",
              "REPLACEMENT"
            ],
            "slot": 1,
            "component": 0,
            "syntaxStart": 8,
            "syntaxEnd": 15
          }
        ]
      }
    ]
  },
  "^ML": {
    "title": "Maximum Label Length",
    "summary": "The ^ML command lets you adjust the maximum label length.",
    "reference": "https://docs.zebra.com/us/en/printers/software/zpl-pg/c-zpl-zpl-commands/r-zpl-ml.html",
    "signatures": [
      {
        "syntax": "^MLa",
        "snippet": "^ML${1:1218}",
        "parameters": [
          {
            "key": "a",
            "name": "maximum label length (in dot rows)",
            "documentation": "maximum label length (in dot rows). Values: the dpi of the printer multiplied by two, up to the maximum length of label Default: last permanently saved value",
            "choices": [
              "1218",
              "0"
            ],
            "slot": 0,
            "component": 0,
            "syntaxStart": 3,
            "syntaxEnd": 4
          }
        ]
      }
    ]
  },
  "^MM": {
    "title": "Print Mode",
    "summary": "The ^MM command determines the action the printer takes after a label or group of labels has printed.",
    "reference": "https://docs.zebra.com/us/en/printers/software/zpl-pg/c-zpl-zpl-commands/r-zpl-mm.html",
    "signatures": [
      {
        "syntax": "^MMa,b",
        "snippet": "^MM${1:T},${2:N}",
        "parameters": [
          {
            "key": "a",
            "name": "desired mode",
            "documentation": "desired mode. Values: T = Tear-off a P = Peel-off (not available on S -300) a R = Rewind (depends on printer model) A = Applicator (depends on printer model) a C = Cutter (depends on printer model) D = Delayed cutter a F = RFID a L = Reserved a, b U = Reserved a, b K = Kiosk c Default: The values available for parameter a depend on the printer being used and whether it supports the option. For RFID printers: A = R110PAX4 print engines F = other RFID printers",
            "choices": [
              "T",
              "P",
              "R",
              "A",
              "C",
              "D",
              "F",
              "L",
              "U",
              "K"
            ],
            "enumValues": [
              "T",
              "P",
              "R",
              "A",
              "C",
              "D",
              "F",
              "L",
              "U",
              "K"
            ],
            "slot": 0,
            "component": 0,
            "syntaxStart": 3,
            "syntaxEnd": 4
          },
          {
            "key": "b",
            "name": "prepeel select",
            "documentation": "prepeel select. Values: N = no Y = yes Default: N The command is ignored if parameters are missing or invalid. The current value of the command remains unchanged. This option is not supported by Link-OS printers.",
            "choices": [
              "N",
              "Y"
            ],
            "enumValues": [
              "N",
              "Y"
            ],
            "slot": 1,
            "component": 0,
            "syntaxStart": 5,
            "syntaxEnd": 6
          }
        ]
      }
    ]
  },
  "^MN": {
    "title": "Media Tracking",
    "summary": "This command specifies the media type being used and the black mark offset in dots.",
    "reference": "https://docs.zebra.com/us/en/printers/software/zpl-pg/c-zpl-zpl-commands/r-zpl-mn.html",
    "signatures": [
      {
        "syntax": "^MNa,b",
        "snippet": "^MN${1:N},${2:0}",
        "parameters": [
          {
            "key": "a",
            "name": "media being used",
            "documentation": "media being used. Values: N = continuous media Y = non-continuous media web sensing 1, 2 W = non-continuous media web sensing ,1, 2 M = non-continuous media mark sensing A = auto-detects the type of media during calibration 1, 3 V = continuous media, variable length 4 Default: a value must be entered or the command is ignored",
            "choices": [
              "N",
              "Y",
              "W",
              "M",
              "A",
              "V"
            ],
            "enumValues": [
              "N",
              "Y",
              "W",
              "M",
              "A",
              "V"
            ],
            "slot": 0,
            "component": 0,
            "syntaxStart": 3,
            "syntaxEnd": 4
          },
          {
            "key": "b",
            "name": "black mark offset in dots",
            "documentation": "black mark offset in dots. This sets the expected location of the media mark relative to the point of separation between documents. If set to 0, the media mark is expected to be found at the point of separation. (i.e., the perforation, cut point, etc.)All values are listed in dots. This parameter is ignored unless the a parameter is set to M . If this parameter is missing, the default value is used. Values: -80 to 283 for direct-thermal only printers -240 to 566 for 600 dpi printers -75 to 283 for KR403 printers -120 to 283 for all other printers Default: 0",
            "choices": [
              "0",
              "80",
              "283"
            ],
            "range": {
              "min": -80.0,
              "max": 283.0
            },
            "slot": 1,
            "component": 0,
            "syntaxStart": 5,
            "syntaxEnd": 6
          }
        ]
      }
    ]
  },
  "^MP": {
    "title": "Mode Protection",
    "summary": "The ^MP command is used to disable the various mode functions on the control panel.",
    "reference": "https://docs.zebra.com/us/en/printers/software/zpl-pg/c-zpl-zpl-commands/r-zpl-mp.html",
    "signatures": [
      {
        "syntax": "^MPa",
        "snippet": "^MP${1:D}",
        "parameters": [
          {
            "key": "a",
            "name": "mode to protect",
            "documentation": "mode to protect. Values: D = disable Darkness Mode P = disable Position Mode C = disable Calibration Mode E = enable all modes S = disable all mode saves (modes can be adjusted but values are not saved) W = disable Pause F = disable Feed X = disable Cancel M = disable menu changes Default: a value must be entered or the command is ignored",
            "choices": [
              "D",
              "P",
              "C",
              "E",
              "S",
              "W",
              "F",
              "X",
              "M"
            ],
            "enumValues": [
              "D",
              "P",
              "C",
              "E",
              "S",
              "W",
              "F",
              "X",
              "M"
            ],
            "slot": 0,
            "component": 0,
            "syntaxStart": 3,
            "syntaxEnd": 4
          }
        ]
      }
    ]
  },
  "^MT": {
    "title": "Media Type",
    "summary": "The ^MT command selects the type of media being used in the printer.",
    "reference": "https://docs.zebra.com/us/en/printers/software/zpl-pg/c-zpl-zpl-commands/r-zpl-mt.html",
    "signatures": [
      {
        "syntax": "^MTa",
        "snippet": "^MT${1:T}",
        "parameters": [
          {
            "key": "a",
            "name": "media type used",
            "documentation": "media type used. Values: T = thermal transfer media D = direct thermal media Default: a value must be entered or the command is ignored",
            "choices": [
              "T",
              "D"
            ],
            "enumValues": [
              "T",
              "D"
            ],
            "slot": 0,
            "component": 0,
            "syntaxStart": 3,
            "syntaxEnd": 4
          }
        ]
      }
    ]
  },
  "^MU": {
    "title": "Set Units of Measurement",
    "summary": "The ^MU command sets the units of measurement the printer uses.",
    "reference": "https://docs.zebra.com/us/en/printers/software/zpl-pg/c-zpl-zpl-commands/r-zpl-mu.html",
    "signatures": [
      {
        "syntax": "^MUa,b,c",
        "snippet": "^MU${1:D},${2:150},${3:300}",
        "parameters": [
          {
            "key": "a",
            "name": "units",
            "documentation": "units. Values: D = dots I = inches M = millimeters Default: D",
            "choices": [
              "D",
              "I",
              "M"
            ],
            "enumValues": [
              "D",
              "I",
              "M"
            ],
            "slot": 0,
            "component": 0,
            "syntaxStart": 3,
            "syntaxEnd": 4
          },
          {
            "key": "b",
            "name": "format base in dots per inch",
            "documentation": "format base in dots per inch. Values: 150 , 200 , 300 Default: a value must be entered or the command is ignored",
            "choices": [
              "150",
              "200",
              "300"
            ],
            "enumValues": [
              "150",
              "200",
              "300"
            ],
            "slot": 1,
            "component": 0,
            "syntaxStart": 5,
            "syntaxEnd": 6
          },
          {
            "key": "c",
            "name": "desired dots-per-inch conversion",
            "documentation": "desired dots-per-inch conversion. Values: 300 , 600 Default: a value must be entered or the command is ignored",
            "choices": [
              "300",
              "600"
            ],
            "enumValues": [
              "300",
              "600"
            ],
            "slot": 2,
            "component": 0,
            "syntaxStart": 7,
            "syntaxEnd": 8
          }
        ]
      }
    ]
  },
  "^MW": {
    "title": "Modify Head Cold Warning",
    "summary": "The ^MW command allows you to set the head cold warning indicator based on the operating environment.",
    "reference": "https://docs.zebra.com/us/en/printers/software/zpl-pg/c-zpl-zpl-commands/r-zpl-mw.html",
    "signatures": [
      {
        "syntax": "^MWa",
        "snippet": "^MW${1:Y}",
        "parameters": [
          {
            "key": "a",
            "name": "enable head cold warning",
            "documentation": "enable head cold warning. Values: Y = enable head cold warning N = disable head cold warning",
            "choices": [
              "Y",
              "N"
            ],
            "enumValues": [
              "Y",
              "N"
            ],
            "slot": 0,
            "component": 0,
            "syntaxStart": 3,
            "syntaxEnd": 4
          }
        ]
      }
    ]
  },
  "^PA": {
    "title": "Advanced Text Properties",
    "summary": "The ^PA command is used to configure advanced text layout features.",
    "reference": "https://docs.zebra.com/us/en/printers/software/zpl-pg/c-zpl-zpl-commands/r-zpl-pa.html",
    "signatures": [
      {
        "syntax": "^PAa,b,c,d",
        "snippet": "^PA${1:0},${2:0},${3:0},${4:0}",
        "parameters": [
          {
            "key": "a",
            "name": "default glyph",
            "documentation": "default glyph. This determines whether the default glyph is a space character or the default glyph of the base font, which is typically a hollow box. Values: 0 = off (space as default glyph) 1 = on (default glyph of font is used, often a hollow box, but depends on the font.) Default: 0",
            "choices": [
              "0",
              "1"
            ],
            "slot": 0,
            "component": 0,
            "syntaxStart": 3,
            "syntaxEnd": 4
          },
          {
            "key": "b",
            "name": "bidirectional text layout",
            "documentation": "bidirectional text layout. This determines whether the bidirectional text layout is turned on or off. Values: 0 = off 1 = on Default: 0",
            "choices": [
              "0",
              "1"
            ],
            "enumValues": [
              "0",
              "1"
            ],
            "slot": 1,
            "component": 0,
            "syntaxStart": 5,
            "syntaxEnd": 6
          },
          {
            "key": "c",
            "name": "character shaping",
            "documentation": "character shaping. This determines whether character shaping is turned on or off. Values: 0 = off 1 = on Default: 0",
            "choices": [
              "0",
              "1"
            ],
            "enumValues": [
              "0",
              "1"
            ],
            "slot": 2,
            "component": 0,
            "syntaxStart": 7,
            "syntaxEnd": 8
          },
          {
            "key": "d",
            "name": "OpenType table support",
            "documentation": "OpenType table support. This determines whether the OpenType support is turned on or off. Values: 0 = off 1 = on Default: 0",
            "choices": [
              "0",
              "1"
            ],
            "enumValues": [
              "0",
              "1"
            ],
            "slot": 3,
            "component": 0,
            "syntaxStart": 9,
            "syntaxEnd": 10
          }
        ]
      }
    ]
  },
  "^PF": {
    "title": "Slew Given Number of Dot Rows",
    "summary": "The ^PF command causes the printer to slew labels (move labels at a high speed without printing) a specified number of dot rows from the bottom of the label.",
    "reference": "https://docs.zebra.com/us/en/printers/software/zpl-pg/c-zpl-zpl-commands/r-zpl-pf.html",
    "signatures": [
      {
        "syntax": "^PF#",
        "snippet": "^PF${1:0}",
        "parameters": [
          {
            "key": "#",
            "name": "number of dots rows to slew",
            "documentation": "number of dots rows to slew. Values: 0 to 32000 Default: a value must be entered or the command is ignored.",
            "choices": [
              "0",
              "32000"
            ],
            "range": {
              "min": 0.0,
              "max": 32000.0
            },
            "slot": 0,
            "component": 0,
            "syntaxStart": 3,
            "syntaxEnd": 4
          }
        ]
      }
    ]
  },
  "^PH": {
    "title": "Slew to Home Position",
    "summary": "The ~PH command feeds one label after the format currently being printed is done or when the printer is placed in pause.",
    "reference": "https://docs.zebra.com/us/en/printers/software/zpl-pg/c-zpl-zpl-commands/r-zpl-ph-ph.html",
    "signatures": [
      {
        "syntax": "^PH",
        "snippet": "^PH",
        "parameters": []
      }
    ]
  },
  "~PH": {
    "title": "Slew to Home Position",
    "summary": "The ~PH command feeds one label after the format currently being printed is done or when the printer is placed in pause.",
    "reference": "https://docs.zebra.com/us/en/printers/software/zpl-pg/c-zpl-zpl-commands/r-zpl-ph-ph.html",
    "signatures": [
      {
        "syntax": "~PH",
        "snippet": "~PH",
        "parameters": []
      }
    ]
  },
  "~PL": {
    "title": "Present Length Addition",
    "summary": "The ~PL command adds an additional amount to how far the paper is ejected during a present cycle.",
    "reference": "https://docs.zebra.com/us/en/printers/software/zpl-pg/c-zpl-zpl-commands/r-zpl-pl.html",
    "signatures": [
      {
        "syntax": "~PLa",
        "snippet": "~PL${1:000}",
        "parameters": [
          {
            "key": "a",
            "name": "additional eject length",
            "documentation": "additional eject length. Values: 000-255 = additional mm of media to eject Default: 000 The command is ignored if parameters are missing or invalid.",
            "choices": [
              "000",
              "000-255"
            ],
            "slot": 0,
            "component": 0,
            "syntaxStart": 3,
            "syntaxEnd": 4
          }
        ]
      }
    ]
  },
  "^PM": {
    "title": "Printing Mirror Image of Label",
    "summary": "The ^PM command prints the entire printable area of the label as a mirror image.",
    "reference": "https://docs.zebra.com/us/en/printers/software/zpl-pg/c-zpl-zpl-commands/r-zpl-pm-printing-mirror.html",
    "signatures": [
      {
        "syntax": "^PMa",
        "snippet": "^PM${1:N}",
        "parameters": [
          {
            "key": "a",
            "name": "print mirror image of entire label",
            "documentation": "print mirror image of entire label. Values: N = no Y = yes Default: N",
            "choices": [
              "N",
              "Y"
            ],
            "enumValues": [
              "N",
              "Y"
            ],
            "slot": 0,
            "component": 0,
            "syntaxStart": 3,
            "syntaxEnd": 4
          }
        ]
      }
    ]
  },
  "~PM": {
    "title": "Decommissioning Mode",
    "summary": "This command places the printer into the Decommissioning Mode.",
    "reference": "https://docs.zebra.com/us/en/printers/software/zpl-pg/c-zpl-zpl-commands/r-zpl-pm.html",
    "signatures": [
      {
        "syntax": "~PMa,b",
        "snippet": "~PM${1:0},${2:0}",
        "parameters": [
          {
            "key": "a",
            "name": "printer’s serial number",
            "documentation": "printer’s serial number. Alphanumeric string. Mandatory parameter.",
            "choices": [
              "0"
            ],
            "required": true,
            "slot": 0,
            "component": 0,
            "syntaxStart": 3,
            "syntaxEnd": 4
          },
          {
            "key": "b",
            "name": "number of times for the flash wipe-out to occur",
            "documentation": "number of times for the flash wipe-out to occur. Optional parameter. Minimum Value = 0 Maximum Value =3 Default Value = 0",
            "choices": [
              "0"
            ],
            "slot": 1,
            "component": 0,
            "syntaxStart": 5,
            "syntaxEnd": 6
          }
        ]
      }
    ]
  },
  "^PN": {
    "title": "Present Now",
    "summary": "The ^PN command causes the printer to run a Presenter cycle.",
    "reference": "https://docs.zebra.com/us/en/printers/software/zpl-pg/c-zpl-zpl-commands/r-zpl-pn.html",
    "signatures": [
      {
        "syntax": "^PNa",
        "snippet": "^PN${1:0}",
        "parameters": [
          {
            "key": "a",
            "name": "media eject length",
            "documentation": "media eject length. Values: 0-255 = additional mm of media to eject Default: none The command is ignored if parameters are missing or invalid.",
            "choices": [
              "0"
            ],
            "slot": 0,
            "component": 0,
            "syntaxStart": 3,
            "syntaxEnd": 4
          }
        ]
      }
    ]
  },
  "^PO": {
    "title": "Print Orientation",
    "summary": "The ^PO command inverts the label format 180 degrees.",
    "reference": "https://docs.zebra.com/us/en/printers/software/zpl-pg/c-zpl-zpl-commands/r-zpl-po.html",
    "signatures": [
      {
        "syntax": "^POa",
        "snippet": "^PO${1:N}",
        "parameters": [
          {
            "key": "a",
            "name": "invert the label 180 degrees",
            "documentation": "invert the label 180 degrees. Values: N = normal I = invert Default: N",
            "choices": [
              "N",
              "I"
            ],
            "enumValues": [
              "N",
              "I"
            ],
            "slot": 0,
            "component": 0,
            "syntaxStart": 3,
            "syntaxEnd": 4
          }
        ]
      }
    ]
  },
  "^PP": {
    "title": "Programmable Pause",
    "summary": "The ~PP command stops printing after the current label is complete (if one is printing) and places the printer in Pause Mode.",
    "reference": "https://docs.zebra.com/us/en/printers/software/zpl-pg/c-zpl-zpl-commands/r-zpl-pp-pp.html",
    "signatures": [
      {
        "syntax": "^PP",
        "snippet": "^PP",
        "parameters": []
      }
    ]
  },
  "~PP": {
    "title": "Programmable Pause",
    "summary": "The ~PP command stops printing after the current label is complete (if one is printing) and places the printer in Pause Mode.",
    "reference": "https://docs.zebra.com/us/en/printers/software/zpl-pg/c-zpl-zpl-commands/r-zpl-pp-pp.html",
    "signatures": [
      {
        "syntax": "~PP",
        "snippet": "~PP",
        "parameters": []
      }
    ]
  },
  "^PQ": {
    "title": "Print Quantity",
    "summary": "The ^PQ command gives control over several printing operations.",
    "reference": "https://docs.zebra.com/us/en/printers/software/zpl-pg/c-zpl-zpl-commands/r-zpl-pq.html",
    "signatures": [
      {
        "syntax": "^PQq,p,r,o,e",
        "snippet": "^PQ${1:1},${2:0},${3:1},${4:N},${5:Y}",
        "parameters": [
          {
            "key": "q",
            "name": "total quantity of labels to print",
            "documentation": "total quantity of labels to print. Values: 1 to 99,999,999 Default: 1",
            "choices": [
              "1",
              "99999999"
            ],
            "range": {
              "min": 1.0,
              "max": 99999999.0
            },
            "slot": 0,
            "component": 0,
            "syntaxStart": 3,
            "syntaxEnd": 4
          },
          {
            "key": "p",
            "name": "pause and cut value (labels between pauses)",
            "documentation": "pause and cut value (labels between pauses). Values: 1 to 99,999,999 Default: 0 (no pause)",
            "choices": [
              "0",
              "1",
              "99999999"
            ],
            "range": {
              "min": 1.0,
              "max": 99999999.0
            },
            "slot": 1,
            "component": 0,
            "syntaxStart": 5,
            "syntaxEnd": 6
          },
          {
            "key": "r",
            "name": "replicates of each serial number",
            "documentation": "replicates of each serial number. Values: 0 to 99,999,999 replicates Default: : 0 (no replicates)",
            "choices": [
              "1",
              "0",
              "99999999"
            ],
            "range": {
              "min": 0.0,
              "max": 99999999.0
            },
            "slot": 2,
            "component": 0,
            "syntaxStart": 7,
            "syntaxEnd": 8
          },
          {
            "key": "o",
            "name": "override pause count",
            "documentation": "override pause count. Values: N = no Y = yes Default: N",
            "choices": [
              "N",
              "Y"
            ],
            "enumValues": [
              "N",
              "Y"
            ],
            "slot": 3,
            "component": 0,
            "syntaxStart": 9,
            "syntaxEnd": 10
          },
          {
            "key": "e",
            "name": "cut on error label (RFID void is an error label)",
            "documentation": "cut on error label (RFID void is an error label). Values: N = no - if a cutter is installed, a cut will be made after a voided RIFD label ONLY if a cut would be made after the non-voided label and this was the last retry. Y = yes - if a cutter is installed, a cut will be made after ANY voided RFID label. Default: Y",
            "choices": [
              "Y",
              "N"
            ],
            "slot": 4,
            "component": 0,
            "syntaxStart": 11,
            "syntaxEnd": 12
          }
        ]
      }
    ]
  },
  "~PR": {
    "title": "Applicator Reprint",
    "summary": "If the ~PR command is enabled, the last label printed reprints, similar to the applicator asserting the Reprint signal on the applicator port.",
    "reference": "https://docs.zebra.com/us/en/printers/software/zpl-pg/c-zpl-zpl-commands/r-zpl-pr-applicator-reprint.html",
    "signatures": [
      {
        "syntax": "~PR",
        "snippet": "~PR",
        "parameters": []
      }
    ]
  },
  "^PR": {
    "title": "Print Rate",
    "summary": "The ^PR command determines the media and slew speed (feeding a blank label) during printing.",
    "reference": "https://docs.zebra.com/us/en/printers/software/zpl-pg/c-zpl-zpl-commands/r-zpl-pr-print-rate.html",
    "signatures": [
      {
        "syntax": "^PRp,s,b",
        "snippet": "^PR${1:A},${2:D},${3:A}",
        "parameters": [
          {
            "key": "p",
            "name": "print speed",
            "documentation": "print speed. Values: 1 = 25.4 mm/sec. (1 inch/sec.) 1 A or 2 = 50.8 mm/sec. (2 inches/sec.) B or 3 = 76.2 mm/sec. (3 inches/sec.) C or 4 = 101.6 mm/sec. (4 inches/sec.) 5 = 127 mm/sec.(5 inches/sec.) D or 6 = 152.4 mm/sec. (6 inches/sec.) 7 = 177.8 mm/sec. (7 inches/sec.) E or 8 = 203.2 mm/sec. (8 inches/sec.) 9 = 220.5 mm/sec. 9 inches/sec.) 10 = 245 mm/sec.(10 inches/sec.) 11 = 269.5 mm/sec.(11 inches/sec.) 12 = 304.8 mm/sec. 12 inches/sec.) 13 = 13 in/sec 2 14 = 14 in/sec 2 Default: A",
            "choices": [
              "A",
              "B",
              "C",
              "D",
              "E",
              "1",
              "2",
              "3",
              "4",
              "5",
              "6",
              "7",
              "8",
              "9",
              "10",
              "11",
              "12",
              "13",
              "14"
            ],
            "enumValues": [
              "A",
              "B",
              "C",
              "D",
              "E",
              "1",
              "2",
              "3",
              "4",
              "5",
              "6",
              "7",
              "8",
              "9",
              "10",
              "11",
              "12",
              "13",
              "14"
            ],
            "slot": 0,
            "component": 0,
            "syntaxStart": 3,
            "syntaxEnd": 4
          },
          {
            "key": "s",
            "name": "slew speed",
            "documentation": "slew speed. Values: A or 2 = 50.8 mm/sec. (2 inches/sec.) B or 3 = 76.2 mm/sec. (3 inches/sec.) C or 4 = 101.6 mm/sec. (4 inches/sec.) 5 = 127 mm/sec. 5 inches/sec.) D or 6 = 152.4 mm/sec. (6 inches/sec.) 7 = 177.8 mm/sec. (7 inches/sec.) E or 8 = 203.2 mm/sec. (8 inches/sec.) 9 = 220.5 mm/sec. (9 inches/sec.) 10 = 245 mm/sec. (10 inches/sec.) 11 = 269.5 mm/sec. 11 inches/sec.) 12 = 304.8 mm/sec. 12 inches/sec.) 13 = 13 in/sec 2 14 = 14 in/sec 2 Default: D",
            "choices": [
              "D",
              "A",
              "B",
              "C",
              "E",
              "2",
              "3",
              "4",
              "5",
              "6",
              "7",
              "8",
              "9",
              "10",
              "11",
              "12",
              "13",
              "14"
            ],
            "enumValues": [
              "A",
              "B",
              "C",
              "D",
              "E",
              "2",
              "3",
              "4",
              "5",
              "6",
              "7",
              "8",
              "9",
              "10",
              "11",
              "12",
              "13",
              "14"
            ],
            "slot": 1,
            "component": 0,
            "syntaxStart": 5,
            "syntaxEnd": 6
          },
          {
            "key": "b",
            "name": "backfeed speed",
            "documentation": "backfeed speed. Values: A or 2 = 50.8 mm/sec. (2 inches/sec.) B or 3 = 76.2 mm/sec. (3 inches/sec.) C or 4 = 101.6 mm/sec. (4 inches/sec.) 5 = 127 mm/sec.(5 inches/sec.) D or 6 = 152.4 mm/sec. (6 inches/sec.) 7 = 177.8 mm/sec. (7 inches/sec.) E or 8 = 203.2 mm/sec. (8 inches/sec.) 9 = 220.5 mm/sec. 9 inches/sec.) 10 = 245 mm/sec. 10 inches/sec.) 11 = 269.5 mm/sec. 11 inches/sec.) 12 = 304.8 mm/sec. 12 inches/sec.) 13 = 13 in/sec14 = 14 in/sec 2 Default: A",
            "choices": [
              "A",
              "B",
              "C",
              "D",
              "E",
              "2",
              "3",
              "4",
              "5",
              "6",
              "7",
              "8",
              "9",
              "10",
              "11",
              "12",
              "13",
              "14"
            ],
            "enumValues": [
              "A",
              "B",
              "C",
              "D",
              "E",
              "2",
              "3",
              "4",
              "5",
              "6",
              "7",
              "8",
              "9",
              "10",
              "11",
              "12",
              "13",
              "14"
            ],
            "slot": 2,
            "component": 0,
            "syntaxStart": 7,
            "syntaxEnd": 8
          }
        ]
      }
    ]
  },
  "~PS": {
    "title": "Print Start",
    "summary": "The ~PS command causes a printer in Pause Mode to resume printing.",
    "reference": "https://docs.zebra.com/us/en/printers/software/zpl-pg/c-zpl-zpl-commands/r-zpl-ps.html",
    "signatures": [
      {
        "syntax": "~PS",
        "snippet": "~PS",
        "parameters": []
      }
    ]
  },
  "^PW": {
    "title": "Print Width",
    "summary": "The ^PW command allows you to set the print width.",
    "reference": "https://docs.zebra.com/us/en/printers/software/zpl-pg/c-zpl-zpl-commands/r-zpl-pw.html",
    "signatures": [
      {
        "syntax": "^PWa",
        "snippet": "^PW${1:812}",
        "parameters": [
          {
            "key": "a",
            "name": "label width (in dots)",
            "documentation": "label width (in dots). Values: 2 , to the width of the label If the value exceeds the width of the label, the width is set to the label’s maximum size. Default: last permanently saved value",
            "choices": [
              "812",
              "0"
            ],
            "slot": 0,
            "component": 0,
            "syntaxStart": 3,
            "syntaxEnd": 4
          }
        ]
      }
    ]
  },
  "~RO": {
    "title": "Reset Advanced Counters",
    "summary": "The ~RO command resets the advanced counters used by the printer to monitor label generation in inches, centimeters, and number of labels.",
    "reference": "https://docs.zebra.com/us/en/printers/software/zpl-pg/c-zpl-zpl-commands/r-zpl-ro.html",
    "signatures": [
      {
        "syntax": "~ROc",
        "snippet": "~RO${1:1}",
        "parameters": [
          {
            "key": "c",
            "name": "counter number",
            "documentation": "counter number. Values: 1 = reset counter 1 2 = reset counter 2 3 = reset valid RFID label counter 4 = reset voided RFID label counter C = reset head cleaned counter 1 R = reset head replaced counter and head cleaned counter 1 Default: a value must be specified or the command is ignored",
            "choices": [
              "1",
              "2",
              "3",
              "4",
              "C",
              "R"
            ],
            "enumValues": [
              "1",
              "2",
              "3",
              "4",
              "C",
              "R"
            ],
            "slot": 0,
            "component": 0,
            "syntaxStart": 3,
            "syntaxEnd": 4
          }
        ]
      }
    ]
  },
  "^SC": {
    "title": "Set Serial Communications",
    "summary": "The ^SC command allows you to change the serial communications parameters you are using.",
    "reference": "https://docs.zebra.com/us/en/printers/software/zpl-pg/c-zpl-zpl-commands/r-zpl-sc.html",
    "signatures": [
      {
        "syntax": "^SCa,b,c,d,e,f",
        "snippet": "^SC${1:0},${2:7},${3:N},${4:1},${5:X},${6:A}",
        "parameters": [
          {
            "key": "a",
            "name": "baud rate",
            "documentation": "baud rate. Values: 110 1 ; 300 ; 600 ; 1200 ; 2400 ; 4800 ; 9600 ; 14400 ; 19200 ; 28800 ; 38400 ; or 57600; 115200 Default: must be specified or the parameter is ignored",
            "choices": [
              "0"
            ],
            "slot": 0,
            "component": 0,
            "syntaxStart": 3,
            "syntaxEnd": 4
          },
          {
            "key": "b",
            "name": "word length (in data bits)",
            "documentation": "word length (in data bits). Values: 7 or 8 Default: must be specified",
            "choices": [
              "7",
              "8"
            ],
            "enumValues": [
              "7",
              "8"
            ],
            "slot": 1,
            "component": 0,
            "syntaxStart": 5,
            "syntaxEnd": 6
          },
          {
            "key": "c",
            "name": "parity",
            "documentation": "parity. Values: N (none), E (even), or O (odd) Default: must be specified",
            "choices": [
              "N",
              "E",
              "O"
            ],
            "enumValues": [
              "N",
              "E",
              "O"
            ],
            "slot": 2,
            "component": 0,
            "syntaxStart": 7,
            "syntaxEnd": 8
          },
          {
            "key": "d",
            "name": "stop bits",
            "documentation": "stop bits. Values: 1 or 2 Default: must be specified",
            "choices": [
              "1",
              "2"
            ],
            "enumValues": [
              "1",
              "2"
            ],
            "slot": 3,
            "component": 0,
            "syntaxStart": 9,
            "syntaxEnd": 10
          },
          {
            "key": "e",
            "name": "protocol mode",
            "documentation": "protocol mode. Values: X = XON/XOFF D = DTR/DSR R = RTS M = DTR/DSR XON/XOFF 2 Default: must be specified",
            "choices": [
              "X",
              "D",
              "R",
              "M"
            ],
            "enumValues": [
              "X",
              "D",
              "R",
              "M"
            ],
            "slot": 4,
            "component": 0,
            "syntaxStart": 11,
            "syntaxEnd": 12
          },
          {
            "key": "f",
            "name": "Zebra protocol",
            "documentation": "Zebra protocol. Values: A = ACK/NAK N = none Z = Zebra Default: must be specified",
            "choices": [
              "A",
              "N",
              "Z"
            ],
            "enumValues": [
              "A",
              "N",
              "Z"
            ],
            "slot": 5,
            "component": 0,
            "syntaxStart": 13,
            "syntaxEnd": 14
          }
        ]
      }
    ]
  },
  "~SD": {
    "title": "Set Darkness",
    "summary": "The ~SD command allows you to set the darkness of printing.",
    "reference": "https://docs.zebra.com/us/en/printers/software/zpl-pg/c-zpl-zpl-commands/r-zpl-sd.html",
    "signatures": [
      {
        "syntax": "~SD##",
        "snippet": "~SD${1:00}",
        "parameters": [
          {
            "key": "##",
            "name": "desired darkness setting (two-digit number)",
            "documentation": "desired darkness setting (two-digit number). Values: 00 to 30 Default: last permanently saved value",
            "choices": [
              "00",
              "30"
            ],
            "range": {
              "min": 0.0,
              "max": 30.0
            },
            "slot": 0,
            "component": 0,
            "syntaxStart": 3,
            "syntaxEnd": 5
          }
        ]
      }
    ]
  },
  "^SE": {
    "title": "Select Encoding Table",
    "summary": "The ^SE command is used to select the desired ZPL or ZPL II encoding table.",
    "reference": "https://docs.zebra.com/us/en/printers/software/zpl-pg/c-zpl-zpl-commands/r-zpl-se.html",
    "signatures": [
      {
        "syntax": "^SEd:o.x",
        "snippet": "^SE${1:R}:${2:1}.${3:DAT}",
        "parameters": [
          {
            "key": "d",
            "name": "location of encoding table",
            "documentation": "location of encoding table. Values: R: , E: , B: , and A: Default: R:",
            "choices": [
              "R:"
            ],
            "slot": 0,
            "component": 0,
            "syntaxStart": 3,
            "syntaxEnd": 4
          },
          {
            "key": "o",
            "name": "name of encoding table",
            "documentation": "name of encoding table. Values: 1 to 8 alphanumeric characters Default: a value must be specified.",
            "choices": [
              "1",
              "8"
            ],
            "slot": 0,
            "component": 1,
            "syntaxStart": 5,
            "syntaxEnd": 6
          },
          {
            "key": "x",
            "name": "extension",
            "documentation": "extension. Fixed Value: .DAT",
            "choices": [
              "DAT",
              "GRF"
            ],
            "slot": 0,
            "component": 2,
            "syntaxStart": 7,
            "syntaxEnd": 8
          }
        ]
      }
    ]
  },
  "^SF": {
    "title": "Serialization Field (with a Standard ^FD String)",
    "summary": "The ^SF command allows you to serialize a standard ^FD string.",
    "reference": "https://docs.zebra.com/us/en/printers/software/zpl-pg/c-zpl-zpl-commands/r-zpl-sf.html",
    "signatures": [
      {
        "syntax": "^SFa,b",
        "snippet": "^SF${1:text},${2:text}",
        "parameters": [
          {
            "key": "a",
            "name": "mask string",
            "documentation": "mask string. The mask string sets the serialization scheme. The length of the string mask defines the number of characters (or in firmware version x.14 and later, combining semantic clusters) in the current ^FD string to be serialized. The mask is aligned to the characters (or in firmware version x.14 and later, combining semantic clusters) in the ^FD string starting with the right-most (or in firmware x.14 and later, last) in the backing store position. Mask String placeholders: D or d - Decimal numeric 0-9 H or h - Hexadecimal 0-9 plus a-f or A-F O or o - Octal 0-7 A or a - Alphabetic A-Z or a-z N or n - Alphanumeric 0-9 plus A-Z or a-z % - Ignore character or skip",
            "choices": [
              "text"
            ],
            "slot": 0,
            "component": 0,
            "syntaxStart": 3,
            "syntaxEnd": 4
          },
          {
            "key": "b",
            "name": "increment string",
            "documentation": "increment string. The increment string is the value to be added to the field on each label. The default value is equivalent to a decimal value of one. The string is composed of any characters (or in firmware version x.14 and later, combining semantic clusters) defined in the serial string. Invalid characters (or in firmware version x.14 and later, combining semantic clusters) are assumed to be equal to a value of zero in that characters (or in firmware version x.14 and later, combining semantic clusters) position. The increment value for alphabetic strings starts with ‘ A ’ or ‘ a ’ as the zero placeholder. This means to increment an alphabetic character (or in firmware version x.14 and later, combining semantic cluster) by one, a value of ‘ B ’ or ‘ b ’ must be in the increment string.",
            "choices": [
              "text"
            ],
            "slot": 1,
            "component": 0,
            "syntaxStart": 5,
            "syntaxEnd": 6
          }
        ]
      }
    ]
  },
  "^SI": {
    "title": "Set Sensor Intensity",
    "summary": "The ^SI command is used to change the values for the media sensors, which are also set during the media calibration process.",
    "reference": "https://docs.zebra.com/us/en/printers/software/zpl-pg/c-zpl-zpl-commands/r-zpl-si.html",
    "signatures": [
      {
        "syntax": "^SIa,b",
        "snippet": "^SI${1:1},${2:0}",
        "parameters": [
          {
            "key": "a",
            "name": "indicates the setting to modify",
            "documentation": "indicates the setting to modify. Values: 1 = transmissive sensor brightness setting 2 = transmissive sensor baseline setting Default: must be an accepted value or the entire command is ignored",
            "choices": [
              "1",
              "2"
            ],
            "enumValues": [
              "1",
              "2"
            ],
            "slot": 0,
            "component": 0,
            "syntaxStart": 3,
            "syntaxEnd": 4
          },
          {
            "key": "b",
            "name": "the value to use for the sensor being configured",
            "documentation": "the value to use for the sensor being configured. The ranges for this parameter are the same for the accepted values in parameter a . Values: 0 to 196 Default: must be an accepted value or the entire command is ignored",
            "choices": [
              "0",
              "196"
            ],
            "range": {
              "min": 0.0,
              "max": 196.0
            },
            "slot": 1,
            "component": 0,
            "syntaxStart": 5,
            "syntaxEnd": 6
          }
        ]
      }
    ]
  },
  "^SL": {
    "title": "Set Mode and Language (for Real-Time Clock)",
    "summary": "The ^SL command is used to specify the Real-Time Clock’s mode of operation and language for printing information.",
    "reference": "https://docs.zebra.com/us/en/printers/software/zpl-pg/c-zpl-zpl-commands/r-zpl-sl.html",
    "signatures": [
      {
        "syntax": "^SLa,b",
        "snippet": "^SL${1:S},${2:1}",
        "parameters": [
          {
            "key": "a",
            "name": "mode",
            "documentation": "mode. Values: S = Start Time Mode. This is the time that is read from the Real-Time Clock when label formatting begins (when ^XA is received). The first label has the same time placed on it as the last label. T = Time Now Mode. This is the time that is read from the Real-Time Clock when the label to be printed is placed in print queue. Time Now is similar to a serialized time or date field. Numeric Value = With the Enhanced Real Time Clock (V60.13.0.10 or later) a time accuracy tolerance can be specified. Range = 1 to 999 seconds, 0 = one second tolerance SL30,1 = Accuracy tolerance of 30 seconds and use English. Default: S",
            "choices": [
              "S",
              "T",
              "Range",
              "0",
              "1",
              "999"
            ],
            "range": {
              "min": 1.0,
              "max": 999.0
            },
            "slot": 0,
            "component": 0,
            "syntaxStart": 3,
            "syntaxEnd": 4
          },
          {
            "key": "b",
            "name": "language Value 13 is only supported in firmware versions V60.14.x, V50.14.x, or later.",
            "documentation": "language Value 13 is only supported in firmware versions V60.14.x, V50.14.x, or later. Values: 1 = English 2 = Spanish 3 = French 4 = German 5 = Italian 6 = Norwegian 7 = Portuguese 8 = Swedish 9 = Danish 10 = Spanish 2 11 = Dutch 12 = Finnish1 3 = Japanese 14 = Korean 15 = Simplified Chinese 16 = Traditional Chinese 17 = Russian 18 = Polish Default: the language selected with ^KL or the control panel",
            "choices": [
              "1",
              "2",
              "3",
              "4",
              "5",
              "6",
              "7",
              "8",
              "9",
              "10",
              "11",
              "12",
              "14",
              "15",
              "16",
              "17",
              "18"
            ],
            "enumValues": [
              "1",
              "2",
              "3",
              "4",
              "5",
              "6",
              "7",
              "8",
              "9",
              "10",
              "11",
              "12",
              "14",
              "15",
              "16",
              "17",
              "18"
            ],
            "slot": 1,
            "component": 0,
            "syntaxStart": 5,
            "syntaxEnd": 6
          }
        ]
      }
    ]
  },
  "^SN": {
    "title": "Serialization Data",
    "summary": "The ^SN command allows the printer to index data fields by a selected increment or decrement value, making the data fields increase or decrease by a specified value each time a label…",
    "reference": "https://docs.zebra.com/us/en/printers/software/zpl-pg/c-zpl-zpl-commands/r-zpl-sn.html",
    "signatures": [
      {
        "syntax": "^SNv,n,z",
        "snippet": "^SN${1:1},${2:1},${3:N}",
        "parameters": [
          {
            "key": "v",
            "name": "starting value",
            "documentation": "starting value. Values: 12-digits maximum for the portion to be indexed Default: 1",
            "choices": [
              "1"
            ],
            "slot": 0,
            "component": 0,
            "syntaxStart": 3,
            "syntaxEnd": 4
          },
          {
            "key": "n",
            "name": "increment or decrement value",
            "documentation": "increment or decrement value. Values: 12-digit maximum Default: 1 To indicate a decrement value, precede the value with a minus (-) sign.",
            "choices": [
              "1"
            ],
            "slot": 1,
            "component": 0,
            "syntaxStart": 5,
            "syntaxEnd": 6
          },
          {
            "key": "z",
            "name": "add leading zeros (if needed)",
            "documentation": "add leading zeros (if needed). Values: N = no Y = yes Default: N",
            "choices": [
              "N",
              "Y"
            ],
            "enumValues": [
              "N",
              "Y"
            ],
            "slot": 2,
            "component": 0,
            "syntaxStart": 7,
            "syntaxEnd": 8
          }
        ]
      }
    ]
  },
  "^SO": {
    "title": "Set Offset (for Real-Time Clock)",
    "summary": "The ^SO command is used to set the secondary and the tertiary offset from the primary Real-Time Clock.",
    "reference": "https://docs.zebra.com/us/en/printers/software/zpl-pg/c-zpl-zpl-commands/r-zpl-so.html",
    "signatures": [
      {
        "syntax": "^SOa,b,c,d,e,f,g",
        "snippet": "^SO${1:2},${2:0},${3:0},${4:0},${5:0},${6:0},${7:0}",
        "parameters": [
          {
            "key": "a",
            "name": "clock set",
            "documentation": "clock set. Values: 2 = secondary 3 = third Default: value must be specified",
            "choices": [
              "2",
              "3"
            ],
            "enumValues": [
              "2",
              "3"
            ],
            "slot": 0,
            "component": 0,
            "syntaxStart": 3,
            "syntaxEnd": 4
          },
          {
            "key": "b",
            "name": "months offset",
            "documentation": "months offset. Values: -32000 to 32000 Default: 0",
            "choices": [
              "0",
              "32000"
            ],
            "range": {
              "min": -32000.0,
              "max": 32000.0
            },
            "slot": 1,
            "component": 0,
            "syntaxStart": 5,
            "syntaxEnd": 6
          },
          {
            "key": "c",
            "name": "days offset",
            "documentation": "days offset. Values: -32000 to 32000 Default: 0",
            "choices": [
              "0",
              "32000"
            ],
            "range": {
              "min": -32000.0,
              "max": 32000.0
            },
            "slot": 2,
            "component": 0,
            "syntaxStart": 7,
            "syntaxEnd": 8
          },
          {
            "key": "d",
            "name": "years offset",
            "documentation": "years offset. Values: -32000 to 32000 Default: 0",
            "choices": [
              "0",
              "32000"
            ],
            "range": {
              "min": -32000.0,
              "max": 32000.0
            },
            "slot": 3,
            "component": 0,
            "syntaxStart": 9,
            "syntaxEnd": 10
          },
          {
            "key": "e",
            "name": "hours offset",
            "documentation": "hours offset. Values: -32000 to 32000 Default: 0",
            "choices": [
              "0",
              "32000"
            ],
            "range": {
              "min": -32000.0,
              "max": 32000.0
            },
            "slot": 4,
            "component": 0,
            "syntaxStart": 11,
            "syntaxEnd": 12
          },
          {
            "key": "f",
            "name": "minutes offset",
            "documentation": "minutes offset. Values: -32000 to 32000 Default: 0",
            "choices": [
              "0",
              "32000"
            ],
            "range": {
              "min": -32000.0,
              "max": 32000.0
            },
            "slot": 5,
            "component": 0,
            "syntaxStart": 13,
            "syntaxEnd": 14
          },
          {
            "key": "g",
            "name": "seconds offset",
            "documentation": "seconds offset. Values: -32000 to 32000 Default: 0",
            "choices": [
              "0",
              "32000"
            ],
            "range": {
              "min": -32000.0,
              "max": 32000.0
            },
            "slot": 6,
            "component": 0,
            "syntaxStart": 15,
            "syntaxEnd": 16
          }
        ]
      }
    ]
  },
  "^SP": {
    "title": "Start Print",
    "summary": "The ^SP command allows a label to start printing at a specified point before the entire label has been completely formatted.",
    "reference": "https://docs.zebra.com/us/en/printers/software/zpl-pg/c-zpl-zpl-commands/r-zpl-sp.html",
    "signatures": [
      {
        "syntax": "^SPa",
        "snippet": "^SP${1:0}",
        "parameters": [
          {
            "key": "a",
            "name": "dot row to start printing",
            "documentation": "dot row to start printing. Values: 0 to 32000 Default: 0",
            "choices": [
              "0",
              "32000"
            ],
            "range": {
              "min": 0.0,
              "max": 32000.0
            },
            "slot": 0,
            "component": 0,
            "syntaxStart": 3,
            "syntaxEnd": 4
          }
        ]
      }
    ]
  },
  "^SQ": {
    "title": "Halt ZebraNet Alert",
    "summary": "The ^SQ command is used to stop the ZebraNet Alert option.",
    "reference": "https://docs.zebra.com/us/en/printers/software/zpl-pg/c-zpl-zpl-commands/r-zpl-sq.html",
    "signatures": [
      {
        "syntax": "^SQa,b,c",
        "snippet": "^SQ${1:A},${2:A},${3:Y}",
        "parameters": [
          {
            "key": "a",
            "name": "condition type",
            "documentation": "condition type. Values: A = paper out B = ribbon out C = printhead over-temp D = printhead under-temp E = head open F = power supply over-temp G = ribbon-in warning (Direct Thermal Mode) H = rewind full I = cut error J = printer paused K = PQ job completed L = label ready M = head element out N = ZBI (Zebra BASIC Interpreter) runtime error O = ZBI (Zebra BASIC Interpreter) forced error Q = clean printhead R = media low S = ribbon low T = replace head U = battery low V = RFID error (in RFID printers only) W = all errors (in RFID printers only) * = all errors (in non-RFID printers)",
            "choices": [
              "A",
              "B",
              "C",
              "D",
              "E",
              "F",
              "G",
              "H",
              "I",
              "J",
              "K",
              "L",
              "M",
              "N",
              "O",
              "Q",
              "R",
              "S",
              "T",
              "U",
              "V",
              "W",
              "ZBI"
            ],
            "enumValues": [
              "A",
              "B",
              "C",
              "D",
              "E",
              "F",
              "G",
              "H",
              "I",
              "J",
              "K",
              "L",
              "M",
              "N",
              "O",
              "Q",
              "R",
              "S",
              "T",
              "U",
              "V",
              "W",
              "ZBI"
            ],
            "slot": 0,
            "component": 0,
            "syntaxStart": 3,
            "syntaxEnd": 4
          },
          {
            "key": "b",
            "name": "destination",
            "documentation": "destination. Values: A = serial port B = parallel port C = e-mail address D = TCP/IP E = UDP/IP F = SNMP trap * = wild card to stop alerts for all destinations",
            "choices": [
              "A",
              "B",
              "C",
              "D",
              "E",
              "F"
            ],
            "enumValues": [
              "A",
              "B",
              "C",
              "D",
              "E",
              "F"
            ],
            "slot": 1,
            "component": 0,
            "syntaxStart": 5,
            "syntaxEnd": 6
          },
          {
            "key": "c",
            "name": "halt messages",
            "documentation": "halt messages. Values: Y = halt messages N = start messages Default: Y",
            "choices": [
              "Y",
              "N"
            ],
            "enumValues": [
              "Y",
              "N"
            ],
            "slot": 2,
            "component": 0,
            "syntaxStart": 7,
            "syntaxEnd": 8
          }
        ]
      }
    ]
  },
  "^SR": {
    "title": "Set Printhead Resistance",
    "summary": "The ^SR command allows you to set the printhead resistance.",
    "reference": "https://docs.zebra.com/us/en/printers/software/zpl-pg/c-zpl-zpl-commands/r-zpl-sr.html",
    "signatures": [
      {
        "syntax": "^SR####",
        "snippet": "^SR${1:0488}",
        "parameters": [
          {
            "key": "####",
            "name": "resistance value (four-digit numeric value)",
            "documentation": "resistance value (four-digit numeric value). Values: 0488 to 1175 Default: last permanently saved value",
            "choices": [
              "0488",
              "1175"
            ],
            "range": {
              "min": 488.0,
              "max": 1175.0
            },
            "slot": 0,
            "component": 0,
            "syntaxStart": 3,
            "syntaxEnd": 7
          }
        ]
      }
    ]
  },
  "^SS": {
    "title": "Set Media Sensors",
    "summary": "The ^SS command is used to change the values for media, web, ribbon, and label length set during the media calibration process.",
    "reference": "https://docs.zebra.com/us/en/printers/software/zpl-pg/c-zpl-zpl-commands/r-zpl-ss.html",
    "signatures": [
      {
        "syntax": "^SSw,m,r,l,m2,r2,a,b,c",
        "snippet": "^SS${1:000},${2:000},${3:000},${4:1218},${5:000},${6:000},${7:000},${8:000},${9:000}",
        "parameters": [
          {
            "key": "w",
            "name": "web (3-digit value)",
            "documentation": "web (3-digit value). Values: 000 to 100 Default: the value is shown on the media sensor profile or configuration label",
            "choices": [
              "000",
              "100"
            ],
            "range": {
              "min": 0.0,
              "max": 100.0
            },
            "slot": 0,
            "component": 0,
            "syntaxStart": 3,
            "syntaxEnd": 4
          },
          {
            "key": "m",
            "name": "media (3-digit value)",
            "documentation": "media (3-digit value). Values: 000 to 100 Default: the value shown on the media sensor profile or configuration label",
            "choices": [
              "000",
              "100"
            ],
            "range": {
              "min": 0.0,
              "max": 100.0
            },
            "slot": 1,
            "component": 0,
            "syntaxStart": 5,
            "syntaxEnd": 6
          },
          {
            "key": "r",
            "name": "ribbon (3-digit value)",
            "documentation": "ribbon (3-digit value). Values: 000 to 100 Default: the value is shown on the media sensor profile or configuration label",
            "choices": [
              "000",
              "100"
            ],
            "range": {
              "min": 0.0,
              "max": 100.0
            },
            "slot": 2,
            "component": 0,
            "syntaxStart": 7,
            "syntaxEnd": 8
          },
          {
            "key": "l",
            "name": "label length (in dots, four-digit value)",
            "documentation": "label length (in dots, four-digit value). Values: 0001 to 32000 Default: value calculated in the calibration process",
            "choices": [
              "1218",
              "0001",
              "32000"
            ],
            "range": {
              "min": 1.0,
              "max": 32000.0
            },
            "slot": 3,
            "component": 0,
            "syntaxStart": 9,
            "syntaxEnd": 10
          },
          {
            "key": "m2",
            "name": "intensity of media LED (3-digit value)",
            "documentation": "intensity of media LED (3-digit value). Values: 000 to 255 Default: value calculated in the calibration process",
            "choices": [
              "000",
              "255"
            ],
            "range": {
              "min": 0.0,
              "max": 255.0
            },
            "slot": 4,
            "component": 0,
            "syntaxStart": 11,
            "syntaxEnd": 13
          },
          {
            "key": "r2",
            "name": "intensity of ribbon LED (3-digit value)",
            "documentation": "intensity of ribbon LED (3-digit value). Values: 000 to 255 Default: value calculated in the calibration process",
            "choices": [
              "000",
              "255"
            ],
            "range": {
              "min": 0.0,
              "max": 255.0
            },
            "slot": 5,
            "component": 0,
            "syntaxStart": 14,
            "syntaxEnd": 16
          },
          {
            "key": "a",
            "name": "mark sensing (3-digit value)",
            "documentation": "mark sensing (3-digit value). Values: 000 to 100 Default: value calculated in the calibration process",
            "choices": [
              "000",
              "100"
            ],
            "range": {
              "min": 0.0,
              "max": 100.0
            },
            "slot": 6,
            "component": 0,
            "syntaxStart": 17,
            "syntaxEnd": 18
          },
          {
            "key": "b",
            "name": "mark media sensing (3-digit value)",
            "documentation": "mark media sensing (3-digit value). Values: 000 to 100 Default: value calculated in the calibration process",
            "choices": [
              "000",
              "100"
            ],
            "range": {
              "min": 0.0,
              "max": 100.0
            },
            "slot": 7,
            "component": 0,
            "syntaxStart": 19,
            "syntaxEnd": 20
          },
          {
            "key": "c",
            "name": "mark LED sensing (3-digit value)",
            "documentation": "mark LED sensing (3-digit value). Values: 000 to 255 Default: value calculated in the calibration process",
            "choices": [
              "000",
              "255"
            ],
            "range": {
              "min": 0.0,
              "max": 255.0
            },
            "slot": 8,
            "component": 0,
            "syntaxStart": 21,
            "syntaxEnd": 22
          }
        ]
      }
    ]
  },
  "^ST": {
    "title": "Set Date and Time (for Real-Time Clock)",
    "summary": "The ^ST command sets the date and time of the Real-Time Clock.",
    "reference": "https://docs.zebra.com/us/en/printers/software/zpl-pg/c-zpl-zpl-commands/r-zpl-st.html",
    "signatures": [
      {
        "syntax": "^STa,b,c,d,e,f,g",
        "snippet": "^ST${1:01},${2:01},${3:1998},${4:00},${5:00},${6:00},${7:M}",
        "parameters": [
          {
            "key": "a",
            "name": "month",
            "documentation": "month. Values: 01 to 12 Default: current month",
            "choices": [
              "01",
              "12"
            ],
            "range": {
              "min": 1.0,
              "max": 12.0
            },
            "slot": 0,
            "component": 0,
            "syntaxStart": 3,
            "syntaxEnd": 4
          },
          {
            "key": "b",
            "name": "day",
            "documentation": "day. Values: 01 to 31 Default: current day",
            "choices": [
              "01",
              "31"
            ],
            "range": {
              "min": 1.0,
              "max": 31.0
            },
            "slot": 1,
            "component": 0,
            "syntaxStart": 5,
            "syntaxEnd": 6
          },
          {
            "key": "c",
            "name": "year",
            "documentation": "year. Values: 1998 to 2097 Default: current year",
            "choices": [
              "1998",
              "2097"
            ],
            "range": {
              "min": 1998.0,
              "max": 2097.0
            },
            "slot": 2,
            "component": 0,
            "syntaxStart": 7,
            "syntaxEnd": 8
          },
          {
            "key": "d",
            "name": "hour",
            "documentation": "hour. Values: 00 to 23 Default: current hour",
            "choices": [
              "00",
              "23"
            ],
            "range": {
              "min": 0.0,
              "max": 23.0
            },
            "slot": 3,
            "component": 0,
            "syntaxStart": 9,
            "syntaxEnd": 10
          },
          {
            "key": "e",
            "name": "minute",
            "documentation": "minute. Values: 00 to 59 Default: current minute",
            "choices": [
              "00",
              "59"
            ],
            "range": {
              "min": 0.0,
              "max": 59.0
            },
            "slot": 4,
            "component": 0,
            "syntaxStart": 11,
            "syntaxEnd": 12
          },
          {
            "key": "f",
            "name": "second",
            "documentation": "second. Values: 00 to 59 Default: current second",
            "choices": [
              "00",
              "59"
            ],
            "range": {
              "min": 0.0,
              "max": 59.0
            },
            "slot": 5,
            "component": 0,
            "syntaxStart": 13,
            "syntaxEnd": 14
          },
          {
            "key": "g",
            "name": "format",
            "documentation": "format. Values: A = a.m. P = p.m. M = 24-hour military Default: M",
            "choices": [
              "M",
              "A",
              "P"
            ],
            "enumValues": [
              "A",
              "P",
              "M"
            ],
            "slot": 6,
            "component": 0,
            "syntaxStart": 15,
            "syntaxEnd": 16
          }
        ]
      }
    ]
  },
  "^SX": {
    "title": "Set ZebraNet Alert",
    "summary": "The ^SX command is used to configure the ZebraNet Alert System.",
    "reference": "https://docs.zebra.com/us/en/printers/software/zpl-pg/c-zpl-zpl-commands/r-zpl-sx.html",
    "signatures": [
      {
        "syntax": "^SXa,b,c,d,e,f",
        "snippet": "^SX${1:A},${2:A},${3:N},${4:N},${5:0},${6:0}",
        "parameters": [
          {
            "key": "a",
            "name": "condition type",
            "documentation": "condition type. Values: A = paper out B = ribbon out C = printhead over-temp D = printhead under-temp E = head open F = power supply over-temp G = ribbon-in warning (Direct Thermal Mode) H = rewind full I = cut error J = printer paused K = PQ job completed L = label ready M = head element out N = ZBI (Zebra BASIC Interpreter) runtime error O = ZBI (Zebra BASIC Interpreter) forced error P = power on Q = clean printhead R = media low S = ribbon low T = replace head U = battery low V = RFID error (in RFID printers only) * = all errors Default: if the parameter is missing or invalid, the command is ignored",
            "choices": [
              "A",
              "B",
              "C",
              "D",
              "E",
              "F",
              "G",
              "H",
              "I",
              "J",
              "K",
              "L",
              "M",
              "N",
              "O",
              "P",
              "Q",
              "R",
              "S",
              "T",
              "U",
              "V",
              "ZBI"
            ],
            "enumValues": [
              "A",
              "B",
              "C",
              "D",
              "E",
              "F",
              "G",
              "H",
              "I",
              "J",
              "K",
              "L",
              "M",
              "N",
              "O",
              "P",
              "Q",
              "R",
              "S",
              "T",
              "U",
              "V",
              "ZBI"
            ],
            "slot": 0,
            "component": 0,
            "syntaxStart": 3,
            "syntaxEnd": 4
          },
          {
            "key": "b",
            "name": "destination for route alert",
            "documentation": "destination for route alert. Values: A = serial port B* = parallel port C = e-mail address D = TCP/IP E = UDP/IP F = SNMP trap Default: If this parameter is missing or invalid, the command is ignored. * Requires bidirectional communication.",
            "choices": [
              "A",
              "C",
              "D",
              "E",
              "F"
            ],
            "enumValues": [
              "A",
              "C",
              "D",
              "E",
              "F"
            ],
            "slot": 1,
            "component": 0,
            "syntaxStart": 5,
            "syntaxEnd": 6
          },
          {
            "key": "c",
            "name": "enable condition set alert to this destination",
            "documentation": "enable condition set alert to this destination. Values: N = no Y = yes Values: Y or previously configured value",
            "choices": [
              "N",
              "Y"
            ],
            "enumValues": [
              "N",
              "Y"
            ],
            "slot": 2,
            "component": 0,
            "syntaxStart": 7,
            "syntaxEnd": 8
          },
          {
            "key": "d",
            "name": "enable condition clear alert to this destination",
            "documentation": "enable condition clear alert to this destination. Values: N = no Y = yes Values: N or previously configured value Parameters e and f are sub-options based on destination. If the sub-options are missing or invalid, these parameters are ignored.",
            "choices": [
              "N",
              "Y"
            ],
            "enumValues": [
              "N",
              "Y"
            ],
            "slot": 3,
            "component": 0,
            "syntaxStart": 9,
            "syntaxEnd": 10
          },
          {
            "key": "e",
            "name": "destination setting",
            "documentation": "destination setting. Values: Internet e-mail address (e.g. user@company.com) IP address (for example, 10.1.2.123) SNMP trap IP or IPX addresses",
            "choices": [
              "0"
            ],
            "slot": 4,
            "component": 0,
            "syntaxStart": 11,
            "syntaxEnd": 12
          },
          {
            "key": "f",
            "name": "port number",
            "documentation": "port number. Values: TCP port # ( 0 to 65535 ) UPD port # ( 0 to 65535 )",
            "choices": [
              "0",
              "65535"
            ],
            "range": {
              "min": 0.0,
              "max": 65535.0
            },
            "slot": 5,
            "component": 0,
            "syntaxStart": 13,
            "syntaxEnd": 14
          }
        ]
      }
    ]
  },
  "^SZ": {
    "title": "Set ZPL Mode",
    "summary": "The ^SZ command is used to select the programming language used by the printer.",
    "reference": "https://docs.zebra.com/us/en/printers/software/zpl-pg/c-zpl-zpl-commands/r-zpl-sz.html",
    "signatures": [
      {
        "syntax": "^SZa",
        "snippet": "^SZ${1:2}",
        "parameters": [
          {
            "key": "a",
            "name": "ZPL version",
            "documentation": "ZPL version. Values: 1 = ZPL 2 = ZPL II Default: 2",
            "choices": [
              "2",
              "1"
            ],
            "enumValues": [
              "1",
              "2"
            ],
            "slot": 0,
            "component": 0,
            "syntaxStart": 3,
            "syntaxEnd": 4
          }
        ]
      }
    ]
  },
  "~TA": {
    "title": "Tear-off Adjust Position",
    "summary": "The ~TA command lets you adjust the rest position of the media after a label is printed, which changes the position at which the label is torn or cut.",
    "reference": "https://docs.zebra.com/us/en/printers/software/zpl-pg/c-zpl-zpl-commands/r-zpl-ta.html",
    "signatures": [
      {
        "syntax": "~TA###",
        "snippet": "~TA${1:0}",
        "parameters": [
          {
            "key": "###",
            "name": "change in media rest position (3-digit value in dot rows must be used.)",
            "documentation": "change in media rest position (3-digit value in dot rows must be used.). Values: -120 to 120 0 to 120 (on the HC100) Default: last permanent value saved",
            "choices": [
              "0",
              "120"
            ],
            "range": {
              "min": -120.0,
              "max": 120.0
            },
            "slot": 0,
            "component": 0,
            "syntaxStart": 3,
            "syntaxEnd": 6
          }
        ]
      }
    ]
  },
  "^TB": {
    "title": "Text Blocks",
    "summary": "The ^TB command prints a text block with defined width and height.",
    "reference": "https://docs.zebra.com/us/en/printers/software/zpl-pg/c-zpl-zpl-commands/r-zpl-tb.html",
    "signatures": [
      {
        "syntax": "^TBa,b,c",
        "snippet": "^TB${1:N},${2:1},${3:1}",
        "parameters": [
          {
            "key": "a",
            "name": "block rotation",
            "documentation": "block rotation. Values: N = normal R = rotate 90 degrees clockwise I = invert 180 degrees B = read from bottom up-270 degrees Default: whatever was specified by the last ^A (which has the default of ^FW )",
            "choices": [
              "N",
              "R",
              "I",
              "B"
            ],
            "enumValues": [
              "N",
              "R",
              "I",
              "B"
            ],
            "slot": 0,
            "component": 0,
            "syntaxStart": 3,
            "syntaxEnd": 4
          },
          {
            "key": "b",
            "name": "block width in dots",
            "documentation": "block width in dots. Values: 1 to the width of the label in dots Default: 1 dot",
            "choices": [
              "1"
            ],
            "slot": 1,
            "component": 0,
            "syntaxStart": 5,
            "syntaxEnd": 6
          },
          {
            "key": "c",
            "name": "block height in dots",
            "documentation": "block height in dots. Values: 1 to the length of the label in dots Default: 1 dot",
            "choices": [
              "1"
            ],
            "slot": 2,
            "component": 0,
            "syntaxStart": 7,
            "syntaxEnd": 8
          }
        ]
      }
    ]
  },
  "^TO": {
    "title": "Transfer Object",
    "summary": "The ^TO command is used to copy an object or group of objects from one storage device to another.",
    "reference": "https://docs.zebra.com/us/en/printers/software/zpl-pg/c-zpl-zpl-commands/r-zpl-to.html",
    "signatures": [
      {
        "syntax": "^TOs:o.x,d:o.x",
        "snippet": "^TO${1:R}:${2:OBJECT}.${3:GRF},${4:R}:${5:OBJECT}.${6:GRF}",
        "parameters": [
          {
            "key": "s",
            "name": "source device of stored object",
            "documentation": "source device of stored object. Values: R: , E: , B: , and A: Default: if a drive is not specified, all objects are transferred to the drive set in parameter s",
            "choices": [
              "R",
              "E",
              "B",
              "A"
            ],
            "slot": 0,
            "component": 0,
            "syntaxStart": 3,
            "syntaxEnd": 4
          },
          {
            "key": "o",
            "name": "stored object name",
            "documentation": "stored object name. Values: any existing object conforming to Zebra conventions Default: if a name is not specified, * is used — all objects are selected",
            "choices": [
              "OBJECT"
            ],
            "slot": 0,
            "component": 1,
            "syntaxStart": 5,
            "syntaxEnd": 6
          },
          {
            "key": "x",
            "name": "extension",
            "documentation": "extension. Values: any extension conforming to Zebra conventions Default: if an extension is not specified, * is used — all extensions are selected",
            "choices": [
              "GRF"
            ],
            "slot": 0,
            "component": 2,
            "syntaxStart": 7,
            "syntaxEnd": 8
          },
          {
            "key": "d",
            "name": "destination device of the stored object",
            "documentation": "destination device of the stored object. Values: R: , E: , B: , and A: Default: a destination must be specified",
            "choices": [
              "R",
              "E",
              "B",
              "A"
            ],
            "slot": 1,
            "component": 0,
            "syntaxStart": 9,
            "syntaxEnd": 10
          },
          {
            "key": "o",
            "name": "name of the object at destination",
            "documentation": "name of the object at destination. Values: up to 8 alphanumeric characters Default: if a name is not specified, the name of the existing object is used",
            "choices": [
              "OBJECT"
            ],
            "slot": 1,
            "component": 1,
            "syntaxStart": 11,
            "syntaxEnd": 12
          },
          {
            "key": "x",
            "name": "extension",
            "documentation": "extension. Values: any extension conforming to Zebra conventions Default: if an extension is not specified, the extension of the existing object is used",
            "choices": [
              "GRF"
            ],
            "slot": 1,
            "component": 2,
            "syntaxStart": 13,
            "syntaxEnd": 14
          }
        ]
      }
    ]
  },
  "~WC": {
    "title": "Print Configuration Label",
    "summary": "The ~WC command is used to generate a printer configuration label.",
    "reference": "https://docs.zebra.com/us/en/printers/software/zpl-pg/c-zpl-zpl-commands/r-zpl-wc.html",
    "signatures": [
      {
        "syntax": "~WC",
        "snippet": "~WC",
        "parameters": []
      }
    ]
  },
  "^WD": {
    "title": "Print Directory Label",
    "summary": "The ^WD command is used to print a label listing bar codes, objects stored in DRAM, or fonts.",
    "reference": "https://docs.zebra.com/us/en/printers/software/zpl-pg/c-zpl-zpl-commands/r-zpl-wd.html",
    "signatures": [
      {
        "syntax": "^WDd:o.x",
        "snippet": "^WD${1:R}:${2:*}.${3:*}",
        "parameters": [
          {
            "key": "d",
            "name": "source device — optional",
            "documentation": "source device — optional. Values: R: , E: , B: , A: and Z: Default: R:",
            "choices": [
              "R:"
            ],
            "slot": 0,
            "component": 0,
            "syntaxStart": 3,
            "syntaxEnd": 4
          },
          {
            "key": "o",
            "name": "object name — optional",
            "documentation": "object name — optional. Values: 1 to 8 alphanumeric characters Default: * The use of a ? (question mark) is also allowed.",
            "choices": [
              "*",
              "1",
              "8"
            ],
            "slot": 0,
            "component": 1,
            "syntaxStart": 5,
            "syntaxEnd": 6
          },
          {
            "key": "x",
            "name": "extension (optional)",
            "documentation": "extension (optional). Values: any extension conforming to Zebra conventions .FNT = font .BAR = bar code .ZPL = stored ZPL format .GRF = GRF graphic .CO = memory cache .DAT = font encoding .BAS = ZBI encrypted program .BAE = ZBI encrypted program .STO = data storage .PNG = PNG graphic * = all objects. TTF = TrueType Font .TTE = True Type Extension Default: * The use of a ? (question mark) is also allowed.",
            "choices": [
              "*",
              "TTF"
            ],
            "slot": 0,
            "component": 2,
            "syntaxStart": 7,
            "syntaxEnd": 8
          }
        ]
      }
    ]
  },
  "~WQ": {
    "title": "Write Query",
    "summary": "The ~WQ command triggers the printer to print a label with odometer, maintenance or alert, and printhead history information.",
    "reference": "https://docs.zebra.com/us/en/printers/software/zpl-pg/c-zpl-zpl-commands/r-zpl-wq.html",
    "signatures": [
      {
        "syntax": "~WQquery-type",
        "snippet": "~WQ${1:ES}",
        "parameters": [
          {
            "key": "query-type",
            "name": "query type",
            "documentation": "query type. For detailed examples of these parameters, see ~WQ Examples . Values: ES = requests the printer’s status. For details see, Table 1 and Table 2 . HA = hardware address of the internal wired print server JT = requests a summary of the printer’s printhead test results MA = maintenance alert settings MI = maintenance information OD = odometer PH = printhead life history PP = printer’s Plug and Play string SN = printer’s serial number UI = printer’s USB product ID and BCD release version Default: must be an accepted value or the command is ignored",
            "choices": [
              "ES",
              "HA",
              "JT",
              "MA",
              "MI",
              "OD",
              "PH",
              "PP",
              "SN",
              "UI"
            ],
            "slot": 0,
            "component": 0,
            "syntaxStart": 3,
            "syntaxEnd": 13
          }
        ]
      }
    ]
  },
  "^XA": {
    "title": "Start Format",
    "summary": "The ^XA command is used at the beginning of ZPL II code.",
    "reference": "https://docs.zebra.com/us/en/printers/software/zpl-pg/c-zpl-zpl-commands/r-zpl-xa.html",
    "signatures": [
      {
        "syntax": "^XA",
        "snippet": "^XA",
        "parameters": []
      }
    ]
  },
  "^XB": {
    "title": "Suppress Backfeed",
    "summary": "The ^XB command suppresses forward feed of media to tear-off position depending on the current printer mode.",
    "reference": "https://docs.zebra.com/us/en/printers/software/zpl-pg/c-zpl-zpl-commands/r-zpl-xb.html",
    "signatures": [
      {
        "syntax": "^XB",
        "snippet": "^XB",
        "parameters": []
      }
    ]
  },
  "^XF": {
    "title": "Recall Format",
    "summary": "The ^XF command recalls a stored format to be merged with variable data.",
    "reference": "https://docs.zebra.com/us/en/printers/software/zpl-pg/c-zpl-zpl-commands/r-zpl-xf.html",
    "signatures": [
      {
        "syntax": "^XFd:o.x",
        "snippet": "^XF${1:R}:${2:1}.${3:ZPL}",
        "parameters": [
          {
            "key": "d",
            "name": "source device of stored image",
            "documentation": "source device of stored image. Values: R: , E: , B: , and A: Default: search priority ( R: , E: , B: , and A: )",
            "choices": [
              "R",
              "E",
              "B",
              "A"
            ],
            "slot": 0,
            "component": 0,
            "syntaxStart": 3,
            "syntaxEnd": 4
          },
          {
            "key": "o",
            "name": "name of stored image",
            "documentation": "name of stored image. Values: 1 to 8 alphanumeric characters Default: if a name is not specified, UNKNOWN is used",
            "choices": [
              "1",
              "8"
            ],
            "slot": 0,
            "component": 1,
            "syntaxStart": 5,
            "syntaxEnd": 6
          },
          {
            "key": "x",
            "name": "extension l",
            "documentation": "extension l. Fixed Value: .ZPL",
            "choices": [
              "ZPL",
              "GRF"
            ],
            "slot": 0,
            "component": 2,
            "syntaxStart": 7,
            "syntaxEnd": 8
          }
        ]
      }
    ]
  },
  "^XG": {
    "title": "Recall Graphic",
    "summary": "The ^XG command is used to recall one or more graphic images for printing.",
    "reference": "https://docs.zebra.com/us/en/printers/software/zpl-pg/c-zpl-zpl-commands/r-zpl-xg.html",
    "signatures": [
      {
        "syntax": "^XGd:o.x,mx,my",
        "snippet": "^XG${1:R}:${2:1}.${3:GRF},${4:1},${5:1}",
        "parameters": [
          {
            "key": "d",
            "name": "source device of stored image",
            "documentation": "source device of stored image. Values: R: , E: , B: , and A: Default: search priority ( R: , E: , B: , and A: )",
            "choices": [
              "R",
              "E",
              "B",
              "A"
            ],
            "slot": 0,
            "component": 0,
            "syntaxStart": 3,
            "syntaxEnd": 4
          },
          {
            "key": "o",
            "name": "name of stored image",
            "documentation": "name of stored image. Values: 1 to 8 alphanumeric characters Default: if a name is not specified, UNKNOWN is used",
            "choices": [
              "1",
              "8"
            ],
            "slot": 0,
            "component": 1,
            "syntaxStart": 5,
            "syntaxEnd": 6
          },
          {
            "key": "x",
            "name": "extension l",
            "documentation": "extension l. Fixed Value: .GRF",
            "choices": [
              "GRF"
            ],
            "slot": 0,
            "component": 2,
            "syntaxStart": 7,
            "syntaxEnd": 8
          },
          {
            "key": "mx",
            "name": "magnification factor on the x-axis",
            "documentation": "magnification factor on the x-axis. Values: 1 to 10 Default: 1",
            "choices": [
              "1",
              "10"
            ],
            "range": {
              "min": 1.0,
              "max": 10.0
            },
            "slot": 1,
            "component": 0,
            "syntaxStart": 9,
            "syntaxEnd": 11
          },
          {
            "key": "my",
            "name": "magnification factor on the y-axis",
            "documentation": "magnification factor on the y-axis. Values: 1 to 10 Default: 1",
            "choices": [
              "1",
              "10"
            ],
            "range": {
              "min": 1.0,
              "max": 10.0
            },
            "slot": 2,
            "component": 0,
            "syntaxStart": 12,
            "syntaxEnd": 14
          }
        ]
      }
    ]
  },
  "^XS": {
    "title": "Set Dynamic Media Calibration",
    "summary": "The ^XS command controls whether dynamic media calibration is performed to compensate for variations in label length, position, transmissivity, and/or reflectance after a printer is powered-up or the printer has been opened…",
    "reference": "https://docs.zebra.com/us/en/printers/software/zpl-pg/c-zpl-zpl-commands/r-zpl-xs.html",
    "signatures": [
      {
        "syntax": "^XSlength,threshold,gain",
        "snippet": "^XS${1:Y},${2:Y},${3:Y}",
        "parameters": [
          {
            "key": "length",
            "name": "dynamic length calibration",
            "documentation": "dynamic length calibration. Values: Y = enable N = disable Default: Y",
            "choices": [
              "Y",
              "N"
            ],
            "enumValues": [
              "Y",
              "N"
            ],
            "slot": 0,
            "component": 0,
            "syntaxStart": 3,
            "syntaxEnd": 9
          },
          {
            "key": "threshold",
            "name": "dynamic threshold calibration",
            "documentation": "dynamic threshold calibration. Values: Y = enable N = disable Default: Y",
            "choices": [
              "Y",
              "N"
            ],
            "enumValues": [
              "Y",
              "N"
            ],
            "slot": 1,
            "component": 0,
            "syntaxStart": 10,
            "syntaxEnd": 19
          },
          {
            "key": "gain",
            "name": "dynamic gain calibration (to be in a future implementation)",
            "documentation": "dynamic gain calibration (to be in a future implementation). Values: Y = enable N = disable Default: Y",
            "choices": [
              "Y",
              "N"
            ],
            "enumValues": [
              "Y",
              "N"
            ],
            "slot": 2,
            "component": 0,
            "syntaxStart": 20,
            "syntaxEnd": 24
          }
        ]
      }
    ]
  },
  "^XZ": {
    "title": "End Format",
    "summary": "The ^XZ command is the ending (closing) bracket.",
    "reference": "https://docs.zebra.com/us/en/printers/software/zpl-pg/c-zpl-zpl-commands/r-zpl-xz.html",
    "signatures": [
      {
        "syntax": "^XZ",
        "snippet": "^XZ",
        "parameters": []
      }
    ]
  },
  "^ZZ": {
    "title": "Printer Sleep",
    "summary": "The ^ZZ command places the printer in an idle or shutdown mode.",
    "reference": "https://docs.zebra.com/us/en/printers/software/zpl-pg/c-zpl-zpl-commands/r-zpl-zz.html",
    "signatures": [
      {
        "syntax": "^ZZt,b",
        "snippet": "^ZZ${1:0},${2:N}",
        "parameters": [
          {
            "key": "t",
            "name": "number of second (idle time) prior to shutdown",
            "documentation": "number of second (idle time) prior to shutdown. Values: 0 to 999999 - setting 0 disables automatic shutdown Default: last permanently saved value or 0",
            "choices": [
              "0",
              "999999"
            ],
            "range": {
              "min": 0.0,
              "max": 999999.0
            },
            "slot": 0,
            "component": 0,
            "syntaxStart": 3,
            "syntaxEnd": 4
          },
          {
            "key": "b",
            "name": "label status at shutdown",
            "documentation": "label status at shutdown. Values: Y = indicates to shutdown when labels are still queued N = indicates all labels must be printed before shutting down Default: N",
            "choices": [
              "N",
              "Y"
            ],
            "enumValues": [
              "Y",
              "N"
            ],
            "slot": 1,
            "component": 0,
            "syntaxStart": 5,
            "syntaxEnd": 6
          }
        ]
      }
    ]
  },
  "^KC": {
    "title": "Set Client Identifier (Option 61)",
    "summary": "The ^KC command allows the print server to have its own client identifier (CID).",
    "reference": "https://docs.zebra.com/us/en/printers/software/zpl-pg/c-zpl-wireless-zpl-wireless-commands/r-zpl-wireless-kc.html",
    "signatures": [
      {
        "syntax": "^KCa,b,c,d",
        "snippet": "^KC${1:0},${2:1},${3:_},${4:0}",
        "parameters": [
          {
            "key": "a",
            "name": "enable or disable",
            "documentation": "enable or disable. Values: 0 = disable (default) 1 = enabled, use MAC address 2 = enabled, ASCII value 3 = enabled, HEX value Default: 0",
            "choices": [
              "0",
              "1",
              "2",
              "3"
            ],
            "slot": 0,
            "component": 0,
            "syntaxStart": 3,
            "syntaxEnd": 4
          },
          {
            "key": "b",
            "name": "device",
            "documentation": "device. Values: 0 = all devices 1 = wireless 2 = external wired 3 = internal wired Default: 1",
            "choices": [
              "1",
              "0",
              "2",
              "3"
            ],
            "enumValues": [
              "0",
              "1",
              "2",
              "3"
            ],
            "slot": 1,
            "component": 0,
            "syntaxStart": 5,
            "syntaxEnd": 6
          },
          {
            "key": "c",
            "name": "prefix (optional)",
            "documentation": "prefix (optional). Values: 11 ASCII characters or 22 hexadecimal values. The prefix can be cleared by defaulting the network settings on the printer.",
            "choices": [
              "_"
            ],
            "slot": 2,
            "component": 0,
            "syntaxStart": 7,
            "syntaxEnd": 8
          },
          {
            "key": "d",
            "name": "identifier",
            "documentation": "identifier. Values: 60 ASCII characters or 120 hexadecimal values. Minimum field length is 2 bytes. The suffix can be cleared by defaulting the network settings on the printer.",
            "choices": [
              "0"
            ],
            "slot": 3,
            "component": 0,
            "syntaxStart": 9,
            "syntaxEnd": 10
          }
        ]
      }
    ]
  },
  "^NB": {
    "title": "Search for Wired Print Server during Network Boot",
    "summary": "Use this command to tell the printer whether to search for a wired print server at bootup.",
    "reference": "https://docs.zebra.com/us/en/printers/software/zpl-pg/c-zpl-wireless-zpl-wireless-commands/r-zpl-wireless-nb.html",
    "signatures": [
      {
        "syntax": "^NBa",
        "snippet": "^NB${1:S}",
        "parameters": [
          {
            "key": "a",
            "name": "check for wired print server at boot time",
            "documentation": "check for wired print server at boot time. Values: C = check S = skip check Default: S",
            "choices": [
              "S",
              "C"
            ],
            "enumValues": [
              "C",
              "S"
            ],
            "slot": 0,
            "component": 0,
            "syntaxStart": 3,
            "syntaxEnd": 4
          }
        ]
      }
    ]
  },
  "^NC": {
    "title": "Select the Primary Network Device",
    "summary": "The ^NC command selects the wired or wireless print server as the primary network device.",
    "reference": "https://docs.zebra.com/us/en/printers/software/zpl-pg/c-zpl-wireless-zpl-wireless-commands/r-zpl-nc-primary-network-device.html",
    "signatures": [
      {
        "syntax": "^NCa",
        "snippet": "^NC${1:1}",
        "parameters": [
          {
            "key": "a",
            "name": "primary network device",
            "documentation": "primary network device. Values: 1 = wired primary 2 = wireless primary Default: 1 must be an accepted value or it is ignored",
            "choices": [
              "1",
              "2"
            ],
            "enumValues": [
              "1",
              "2"
            ],
            "slot": 0,
            "component": 0,
            "syntaxStart": 3,
            "syntaxEnd": 4
          }
        ]
      }
    ]
  },
  "~NC": {
    "title": "Network Connect",
    "summary": "The ~NC command is used to connect a particular printer to a network by calling up the printer’s network ID number.",
    "reference": "https://docs.zebra.com/us/en/printers/software/zpl-pg/c-zpl-wireless-zpl-wireless-commands/r-zpl-nc-network-connect.html",
    "signatures": [
      {
        "syntax": "~NC###",
        "snippet": "~NC${1:000}",
        "parameters": [
          {
            "key": "###",
            "name": "network ID number assigned (must be a three-digit entry)",
            "documentation": "network ID number assigned (must be a three-digit entry). Values: 001 to 999 Default: 000 (none)",
            "choices": [
              "000",
              "001",
              "999"
            ],
            "range": {
              "min": 1.0,
              "max": 999.0
            },
            "slot": 0,
            "component": 0,
            "syntaxStart": 3,
            "syntaxEnd": 6
          }
        ]
      }
    ]
  },
  "^ND": {
    "title": "Change Network Settings",
    "summary": "The ^ND command changes the network settings on supported printers.",
    "reference": "https://docs.zebra.com/us/en/printers/software/zpl-pg/c-zpl-wireless-zpl-wireless-commands/r-zpl-nd.html",
    "signatures": [
      {
        "syntax": "^NDa,b,c,d,e,f,g,h,i,j",
        "snippet": "^ND${1:1},${2:A},${3:0},${4:0},${5:0},${6:0},${7:Y},${8:300},${9:0},${10:9100}",
        "parameters": [
          {
            "key": "a",
            "name": "the device that is being modified",
            "documentation": "the device that is being modified. Values: 1 = external wired 2 = internal wired 3 = wireless",
            "choices": [
              "1",
              "2",
              "3"
            ],
            "enumValues": [
              "1",
              "2",
              "3"
            ],
            "slot": 0,
            "component": 0,
            "syntaxStart": 3,
            "syntaxEnd": 4
          },
          {
            "key": "b",
            "name": "IP resolution",
            "documentation": "IP resolution. Values: A = All B = BOOTP C = DHCP and BOOTP D = DHCP G = Gleaning only (Not recommended when the Wireless Print Server or Wireless Plus Print Server is installed.) R = RARP P = Permanent Default: A",
            "choices": [
              "A",
              "B",
              "C",
              "D",
              "G",
              "R",
              "P"
            ],
            "enumValues": [
              "A",
              "B",
              "C",
              "D",
              "G",
              "R",
              "P"
            ],
            "slot": 1,
            "component": 0,
            "syntaxStart": 5,
            "syntaxEnd": 6
          },
          {
            "key": "c",
            "name": "IP address",
            "documentation": "IP address. Values: Any properly formatted IP address in the xxx.xxx.xxx.xxx format.",
            "choices": [
              "0"
            ],
            "slot": 2,
            "component": 0,
            "syntaxStart": 7,
            "syntaxEnd": 8
          },
          {
            "key": "d",
            "name": "subnet mask",
            "documentation": "subnet mask. Values: Any properly formatted subnet mask in the xxx.xxx.xxx.xxx format.",
            "choices": [
              "0"
            ],
            "slot": 3,
            "component": 0,
            "syntaxStart": 9,
            "syntaxEnd": 10
          },
          {
            "key": "e",
            "name": "default gateway",
            "documentation": "default gateway. Values: Any properly formatted gateway in the xxx.xxx.xxx.xxx format.",
            "choices": [
              "0"
            ],
            "slot": 4,
            "component": 0,
            "syntaxStart": 11,
            "syntaxEnd": 12
          },
          {
            "key": "f",
            "name": "WINS server address",
            "documentation": "WINS server address. Values: Any properly formatted WINS server in the xxx.xxx.xxx.xxx format.",
            "choices": [
              "0"
            ],
            "slot": 5,
            "component": 0,
            "syntaxStart": 13,
            "syntaxEnd": 14
          },
          {
            "key": "g",
            "name": "connection timeout checking",
            "documentation": "connection timeout checking. Values: Y = yes N = no Default: Y",
            "choices": [
              "Y",
              "N"
            ],
            "enumValues": [
              "Y",
              "N"
            ],
            "slot": 6,
            "component": 0,
            "syntaxStart": 15,
            "syntaxEnd": 16
          },
          {
            "key": "h",
            "name": "timeout value",
            "documentation": "timeout value. Time, in seconds, before the connection times out. Values: 0 through 9999 Default: 300",
            "choices": [
              "300",
              "0",
              "9999"
            ],
            "range": {
              "min": 0.0,
              "max": 9999.0
            },
            "slot": 7,
            "component": 0,
            "syntaxStart": 17,
            "syntaxEnd": 18
          },
          {
            "key": "i",
            "name": "ARP broadcast interval",
            "documentation": "ARP broadcast interval. Time, in minutes, that the broadcast is sent to update the device’s ARP cache. Values: 0 through 30 Default: 0 (no ARP sent)",
            "choices": [
              "0",
              "30"
            ],
            "range": {
              "min": 0.0,
              "max": 30.0
            },
            "slot": 8,
            "component": 0,
            "syntaxStart": 19,
            "syntaxEnd": 20
          },
          {
            "key": "j",
            "name": "base raw port number",
            "documentation": "base raw port number. The port number that the printer should use for its RAW data. Values: 1 through 65535 Default: 9100",
            "choices": [
              "9100",
              "1",
              "65535"
            ],
            "range": {
              "min": 1.0,
              "max": 65535.0
            },
            "slot": 9,
            "component": 0,
            "syntaxStart": 21,
            "syntaxEnd": 22
          }
        ]
      }
    ]
  },
  "^NI": {
    "title": "Network ID Number",
    "summary": "The ^NI command is used to assign a network ID number to the printer.",
    "reference": "https://docs.zebra.com/us/en/printers/software/zpl-pg/c-zpl-wireless-zpl-wireless-commands/r-zpl-ni.html",
    "signatures": [
      {
        "syntax": "^NI###",
        "snippet": "^NI${1:000}",
        "parameters": [
          {
            "key": "###",
            "name": "network ID number assigned (must be a three-digit entry)",
            "documentation": "network ID number assigned (must be a three-digit entry). Values: 001 to 999 Default: 000 (none)",
            "choices": [
              "000",
              "001",
              "999"
            ],
            "range": {
              "min": 1.0,
              "max": 999.0
            },
            "slot": 0,
            "component": 0,
            "syntaxStart": 3,
            "syntaxEnd": 6
          }
        ]
      }
    ]
  },
  "^NN": {
    "title": "Set SNMP",
    "summary": "Use this command to set the Simple Network Management Protocol (SNMP) parameters.",
    "reference": "https://docs.zebra.com/us/en/printers/software/zpl-pg/c-zpl-wireless-zpl-wireless-commands/r-zpl-wireless-nn.html",
    "signatures": [
      {
        "syntax": "^NNa,b,c,d,e,f",
        "snippet": "^NN${1:OBJECT},${2:0},${3:0},${4:OBJECT},${5:OBJECT},${6:OBJECT}",
        "parameters": [
          {
            "key": "a",
            "name": "system name",
            "documentation": "system name. Same as printer name. Values: Up to 17 alphanumeric characters",
            "choices": [
              "OBJECT"
            ],
            "slot": 0,
            "component": 0,
            "syntaxStart": 3,
            "syntaxEnd": 4
          },
          {
            "key": "b",
            "name": "system contact",
            "documentation": "system contact. Any contact information as desired (such as a name or phrase) Values: Up to 50 alphanumeric characters",
            "choices": [
              "0"
            ],
            "slot": 1,
            "component": 0,
            "syntaxStart": 5,
            "syntaxEnd": 6
          },
          {
            "key": "c",
            "name": "system location",
            "documentation": "system location. The printer’s model information. Values: Up to 50 alphanumeric characters",
            "choices": [
              "0"
            ],
            "slot": 2,
            "component": 0,
            "syntaxStart": 7,
            "syntaxEnd": 8
          },
          {
            "key": "d",
            "name": "get community name",
            "documentation": "get community name. Values: Up to 19 alphanumeric characters Default: public",
            "choices": [
              "OBJECT"
            ],
            "slot": 3,
            "component": 0,
            "syntaxStart": 9,
            "syntaxEnd": 10
          },
          {
            "key": "e",
            "name": "set community name",
            "documentation": "set community name. Values: Up to 19 alphanumeric characters Default: public",
            "choices": [
              "OBJECT"
            ],
            "slot": 4,
            "component": 0,
            "syntaxStart": 11,
            "syntaxEnd": 12
          },
          {
            "key": "f",
            "name": "trap community name",
            "documentation": "trap community name. Values: Up to 20 alphanumeric characters Default: public",
            "choices": [
              "OBJECT"
            ],
            "slot": 5,
            "component": 0,
            "syntaxStart": 13,
            "syntaxEnd": 14
          }
        ]
      }
    ]
  },
  "^NP": {
    "title": "Set Primary/Secondary Device",
    "summary": "Use this command to specify whether to use the printer’s or the print server’s LAN/WLAN settings at boot time.",
    "reference": "https://docs.zebra.com/us/en/printers/software/zpl-pg/c-zpl-wireless-zpl-wireless-commands/r-zpl-wireless-np.html",
    "signatures": [
      {
        "syntax": "^NPa",
        "snippet": "^NP${1:P}",
        "parameters": [
          {
            "key": "a",
            "name": "device to use as primary",
            "documentation": "device to use as primary. Values: P = printer M = MPS/Printserver Default: P",
            "choices": [
              "P",
              "M"
            ],
            "enumValues": [
              "P",
              "M"
            ],
            "slot": 0,
            "component": 0,
            "syntaxStart": 3,
            "syntaxEnd": 4
          }
        ]
      }
    ]
  },
  "~NR": {
    "title": "Set All Network Printers Transparent",
    "summary": "The ~NR command sets all printers in the network to be transparent, regardless of ID or current mode.",
    "reference": "https://docs.zebra.com/us/en/printers/software/zpl-pg/c-zpl-wireless-zpl-wireless-commands/r-zpl-nr.html",
    "signatures": [
      {
        "syntax": "~NR",
        "snippet": "~NR",
        "parameters": []
      }
    ]
  },
  "^NS": {
    "title": "Change Wired Networking Settings",
    "summary": "Use this command to change the wired print server network settings.",
    "reference": "https://docs.zebra.com/us/en/printers/software/zpl-pg/c-zpl-wireless-zpl-wireless-commands/r-zpl-ns.html",
    "signatures": [
      {
        "syntax": "^NSa,b,c,d,e,f,g,h,i",
        "snippet": "^NS${1:A},${2:0},${3:0},${4:0},${5:0},${6:Y},${7:300},${8:0},${9:9100}",
        "parameters": [
          {
            "key": "a",
            "name": "IP resolution",
            "documentation": "IP resolution. Values: A = ALL B = BOOTP C = DHCP AND BOOTP D = DHCP G = GLEANING ONLY R = RARP P = PERMANENT Default: A Use of GLEANING ONLY is not recommended when the Wireless Print Server or Wireless Plus Print Server is installed",
            "choices": [
              "A",
              "B",
              "C",
              "D",
              "G",
              "R",
              "P"
            ],
            "enumValues": [
              "A",
              "B",
              "C",
              "D",
              "G",
              "R",
              "P"
            ],
            "slot": 0,
            "component": 0,
            "syntaxStart": 3,
            "syntaxEnd": 4
          },
          {
            "key": "b",
            "name": "IP address",
            "documentation": "IP address. Values: Any properly formatted IP address in the xxx.xxx.xxx.xxx format.",
            "choices": [
              "0"
            ],
            "slot": 1,
            "component": 0,
            "syntaxStart": 5,
            "syntaxEnd": 6
          },
          {
            "key": "c",
            "name": "subnet mask",
            "documentation": "subnet mask. Values: Any properly formatted subnet mask in the xxx.xxx.xxx.xxx format.",
            "choices": [
              "0"
            ],
            "slot": 2,
            "component": 0,
            "syntaxStart": 7,
            "syntaxEnd": 8
          },
          {
            "key": "d",
            "name": "default gateway",
            "documentation": "default gateway. Values: Any properly formatted gateway in the xxx.xxx.xxx.xxx format.",
            "choices": [
              "0"
            ],
            "slot": 3,
            "component": 0,
            "syntaxStart": 9,
            "syntaxEnd": 10
          },
          {
            "key": "e",
            "name": "WINS server address",
            "documentation": "WINS server address. Values: Any properly formatted WINS server in the xxx.xxx.xxx.xxx format.",
            "choices": [
              "0"
            ],
            "slot": 4,
            "component": 0,
            "syntaxStart": 11,
            "syntaxEnd": 12
          },
          {
            "key": "f",
            "name": "connection timeout checking",
            "documentation": "connection timeout checking. Values: Y = Yes N = No Default: Y",
            "choices": [
              "Y",
              "N"
            ],
            "enumValues": [
              "Y",
              "N"
            ],
            "slot": 5,
            "component": 0,
            "syntaxStart": 13,
            "syntaxEnd": 14
          },
          {
            "key": "g",
            "name": "timeout value",
            "documentation": "timeout value. Time, in seconds, before the connection times out. Values: 0 through 9999 Default: 300",
            "choices": [
              "300",
              "0",
              "9999"
            ],
            "range": {
              "min": 0.0,
              "max": 9999.0
            },
            "slot": 6,
            "component": 0,
            "syntaxStart": 15,
            "syntaxEnd": 16
          },
          {
            "key": "h",
            "name": "ARP broadcast interval",
            "documentation": "ARP broadcast interval. Time, in minutes, that the broadcast is sent to update the device’s ARP cache. Values: 0 through 30 Default: 0 (no ARP sent)",
            "choices": [
              "0",
              "30"
            ],
            "range": {
              "min": 0.0,
              "max": 30.0
            },
            "slot": 7,
            "component": 0,
            "syntaxStart": 17,
            "syntaxEnd": 18
          },
          {
            "key": "i",
            "name": "base raw port number",
            "documentation": "base raw port number. The port number that the printer should use for its RAW data. Values: 1 through 65535 Default: 9100",
            "choices": [
              "9100",
              "1",
              "65535"
            ],
            "range": {
              "min": 1.0,
              "max": 65535.0
            },
            "slot": 8,
            "component": 0,
            "syntaxStart": 19,
            "syntaxEnd": 20
          }
        ]
      }
    ]
  },
  "^NT": {
    "title": "Set SMTP",
    "summary": "Use this command to set the Simple Mail Transfer Protocol (SMTP) parameters.",
    "reference": "https://docs.zebra.com/us/en/printers/software/zpl-pg/c-zpl-wireless-zpl-wireless-commands/r-zpl-wireless-nt.html",
    "signatures": [
      {
        "syntax": "^NTa,b",
        "snippet": "^NT${1:0},${2:0}",
        "parameters": [
          {
            "key": "a",
            "name": "SMTP server address",
            "documentation": "SMTP server address. Values: Any properly formatted server address in the xxx.xxx.xxx.xxx format",
            "choices": [
              "0"
            ],
            "slot": 0,
            "component": 0,
            "syntaxStart": 3,
            "syntaxEnd": 4
          },
          {
            "key": "b",
            "name": "print server domain",
            "documentation": "print server domain. Values: Any properly formatted print server domain name. A domain name is one or more labels separated by a period (“dot”), and a label consists of letters, numbers, and hyphens. An example of a domain name is zebra.com",
            "choices": [
              "0"
            ],
            "slot": 1,
            "component": 0,
            "syntaxStart": 5,
            "syntaxEnd": 6
          }
        ]
      }
    ]
  },
  "~NT": {
    "title": "Set Currently Connected Printer Transparent",
    "summary": "The ~NT command sets the currently connected network printer to be transparent.",
    "reference": "https://docs.zebra.com/us/en/printers/software/zpl-pg/c-zpl-wireless-zpl-wireless-commands/r-zpl-nt.html",
    "signatures": [
      {
        "syntax": "~NT",
        "snippet": "~NT",
        "parameters": []
      }
    ]
  },
  "^NW": {
    "title": "Set Web Authentication Timeout Value",
    "summary": "Use this command to set the timeout value for the printer home page.",
    "reference": "https://docs.zebra.com/us/en/printers/software/zpl-pg/c-zpl-wireless-zpl-wireless-commands/r-zpl-wireless-nw.html",
    "signatures": [
      {
        "syntax": "^NWa",
        "snippet": "^NW${1:5}",
        "parameters": [
          {
            "key": "a",
            "name": "timeout value",
            "documentation": "timeout value. The timeout value in minutes for an IP address to be authenticated to the printer web pages. Values: 0 (no secure pages can be accessed without entering the printer password) to 255 minutes Default: 5",
            "choices": [
              "5",
              "0"
            ],
            "range": {
              "min": 0.0,
              "max": 255.0
            },
            "slot": 0,
            "component": 0,
            "syntaxStart": 3,
            "syntaxEnd": 4
          }
        ]
      }
    ]
  },
  "^WA": {
    "title": "Set Antenna Parameters",
    "summary": "Use this command to set the values for the receive and transmit antenna.",
    "reference": "https://docs.zebra.com/us/en/printers/software/zpl-pg/c-zpl-wireless-zpl-wireless-commands/r-zpl-wireless-wa.html",
    "signatures": [
      {
        "syntax": "^WAa,b",
        "snippet": "^WA${1:D},${2:D}",
        "parameters": [
          {
            "key": "a",
            "name": "receive antenna",
            "documentation": "receive antenna. Values: D = diversity L = left R = right Default: D",
            "choices": [
              "D",
              "L",
              "R"
            ],
            "enumValues": [
              "D",
              "L",
              "R"
            ],
            "slot": 0,
            "component": 0,
            "syntaxStart": 3,
            "syntaxEnd": 4
          },
          {
            "key": "b",
            "name": "transmit antenna",
            "documentation": "transmit antenna. Values: D = diversity L = left R = right Default: D",
            "choices": [
              "D",
              "L",
              "R"
            ],
            "enumValues": [
              "D",
              "L",
              "R"
            ],
            "slot": 1,
            "component": 0,
            "syntaxStart": 5,
            "syntaxEnd": 6
          }
        ]
      }
    ]
  },
  "^WE": {
    "title": "Set WEP Mode",
    "summary": "Use this command to command enable Wired Equivalent Privacy (WEP) mode and set WEP values.",
    "reference": "https://docs.zebra.com/us/en/printers/software/zpl-pg/c-zpl-wireless-zpl-wireless-commands/r-zpl-wireless-we.html",
    "signatures": [
      {
        "syntax": "^WEa,b,c,d,e,f,g,h",
        "snippet": "^WE${1:OFF},${2:1},${3:O},${4:H},e,f,g,h",
        "parameters": [
          {
            "key": "a",
            "name": "encryption mode",
            "documentation": "encryption mode. Values: OFF 40 = 40-bit encryption 128 = 128-bit encryption Default: OFF",
            "choices": [
              "OFF",
              "40",
              "128"
            ],
            "enumValues": [
              "OFF",
              "40",
              "128"
            ],
            "slot": 0,
            "component": 0,
            "syntaxStart": 3,
            "syntaxEnd": 4
          },
          {
            "key": "b",
            "name": "encryption index",
            "documentation": "encryption index. Tells the printer which encryption key to use. Values: 1 = Key 1 2 = Key 2 3 = Key 3 4 = Key 4 Default: 1",
            "choices": [
              "1",
              "2",
              "3",
              "4"
            ],
            "enumValues": [
              "1",
              "2",
              "3",
              "4"
            ],
            "slot": 1,
            "component": 0,
            "syntaxStart": 5,
            "syntaxEnd": 6
          },
          {
            "key": "c",
            "name": "authentication type",
            "documentation": "authentication type. Values: O (Open System), S (Shared Key) O = Open System S = Shared Key Default: O If you enable Shared Key authentication with Encryption Mode set to OFF , this value resets to O (Open).",
            "choices": [
              "O",
              "S"
            ],
            "enumValues": [
              "O",
              "S"
            ],
            "slot": 2,
            "component": 0,
            "syntaxStart": 7,
            "syntaxEnd": 8
          },
          {
            "key": "d",
            "name": "encryption key storage",
            "documentation": "encryption key storage. Values: H (Hex key storage), S (string key storage) H = Hex key storage S = String key storage Default: H",
            "choices": [
              "H",
              "S"
            ],
            "enumValues": [
              "H",
              "S"
            ],
            "slot": 3,
            "component": 0,
            "syntaxStart": 9,
            "syntaxEnd": 10
          },
          {
            "key": "e,_f,_g,_h",
            "name": "encryption keys 1 through 4",
            "documentation": "encryption keys 1 through 4. Values: The actual value for the encryption key The encryption mode affects what can be entered for the encryption keys: For 40-bit, encryption keys can be set to any 5 hex pairs or any 10 alphanumeric characters. For 128-bit, encryption keys can be set to any 13 hex pairs or any 26 alphanumeric characters. When using hex storage, do not add a leading 0x on the WEP key.",
            "choices": [
              "KEY",
              "0"
            ],
            "slot": 8,
            "component": 0
          }
        ]
      }
    ]
  },
  "^WL": {
    "title": "Set LEAP Parameters",
    "summary": "Use this command to enable Cisco ® Lightweight Extensible Authentication Protocol (LEAP) mode and set parameters.",
    "reference": "https://docs.zebra.com/us/en/printers/software/zpl-pg/c-zpl-wireless-zpl-wireless-commands/r-zpl-wireless-wl-set-leap.html",
    "signatures": [
      {
        "syntax": "^WLa,b,c",
        "snippet": "^WL${1:OFF},${2:user},${3:password}",
        "parameters": [
          {
            "key": "a",
            "name": "mode",
            "documentation": "mode. Values: OFF, ON Default: OFF",
            "choices": [
              "OFF",
              "ON"
            ],
            "enumValues": [
              "OFF",
              "ON"
            ],
            "slot": 0,
            "component": 0,
            "syntaxStart": 3,
            "syntaxEnd": 4
          },
          {
            "key": "b",
            "name": "user name",
            "documentation": "user name. Values: Any 1 to 32 alphanumeric including special characters Default: user",
            "choices": [
              "user"
            ],
            "slot": 1,
            "component": 0,
            "syntaxStart": 5,
            "syntaxEnd": 6
          },
          {
            "key": "c",
            "name": "password",
            "documentation": "password. Values: Any 1 to 32 alphanumeric including special characters Default: password",
            "choices": [
              "password"
            ],
            "slot": 2,
            "component": 0,
            "syntaxStart": 7,
            "syntaxEnd": 8
          }
        ]
      }
    ]
  },
  "~WL": {
    "title": "Print Network Configuration Label",
    "summary": "Generates a network configuration label (Network Configuration Label).",
    "reference": "https://docs.zebra.com/us/en/printers/software/zpl-pg/c-zpl-wireless-zpl-wireless-commands/r-zpl-wireless-wl-print-network.html",
    "signatures": [
      {
        "syntax": "~WL",
        "snippet": "~WL",
        "parameters": []
      }
    ]
  },
  "^WP": {
    "title": "Set Wireless Password",
    "summary": "Use this command to set the four-digit wireless password (not the same as the general printer password).",
    "reference": "https://docs.zebra.com/us/en/printers/software/zpl-pg/c-zpl-wireless-zpl-wireless-commands/r-zpl-wireless-wp.html",
    "signatures": [
      {
        "syntax": "^WPa,b",
        "snippet": "^WP${1:0000},${2:0000}",
        "parameters": [
          {
            "key": "a",
            "name": "old wireless password",
            "documentation": "old wireless password. Values: 0000 through 9999 Default: 0000",
            "choices": [
              "0000",
              "9999"
            ],
            "range": {
              "min": 0.0,
              "max": 9999.0
            },
            "slot": 0,
            "component": 0,
            "syntaxStart": 3,
            "syntaxEnd": 4
          },
          {
            "key": "b",
            "name": "new wireless password",
            "documentation": "new wireless password. Values: 0000 through 9999 Default: 0000",
            "choices": [
              "0000",
              "9999"
            ],
            "range": {
              "min": 0.0,
              "max": 9999.0
            },
            "slot": 1,
            "component": 0,
            "syntaxStart": 5,
            "syntaxEnd": 6
          }
        ]
      }
    ]
  },
  "^WR": {
    "title": "Set Transmit Rate",
    "summary": "Use this command to change the transmission rate for 802.11b wireless print servers.",
    "reference": "https://docs.zebra.com/us/en/printers/software/zpl-pg/c-zpl-wireless-zpl-wireless-commands/r-zpl-wireless-wr-set-transmit.html",
    "signatures": [
      {
        "syntax": "^WRa,b,c,d,e",
        "snippet": "^WR${1:N},${2:N},${3:N},${4:N},${5:0}",
        "parameters": [
          {
            "key": "a",
            "name": "rate 1",
            "documentation": "rate 1. Sets the 1 Mb/s transmit rate.Y (On), N (Off)",
            "choices": [
              "N"
            ],
            "slot": 0,
            "component": 0,
            "syntaxStart": 3,
            "syntaxEnd": 4
          },
          {
            "key": "b",
            "name": "rate 2",
            "documentation": "rate 2. Sets the 2 Mb/s transmit rate.Y (On), N (Off)",
            "choices": [
              "N"
            ],
            "slot": 1,
            "component": 0,
            "syntaxStart": 5,
            "syntaxEnd": 6
          },
          {
            "key": "c",
            "name": "rate 5.5",
            "documentation": "rate 5.5. Sets the 5.5 Mb/s transmit rate.Y (On), N (Off)",
            "choices": [
              "N"
            ],
            "slot": 2,
            "component": 0,
            "syntaxStart": 7,
            "syntaxEnd": 8
          },
          {
            "key": "d",
            "name": "rate 11",
            "documentation": "rate 11. Sets the 11 Mb/s transmit rate.Y (On), N (Off)",
            "choices": [
              "N"
            ],
            "slot": 3,
            "component": 0,
            "syntaxStart": 9,
            "syntaxEnd": 10
          },
          {
            "key": "e",
            "name": "transmit power",
            "documentation": "transmit power. 1, 5, 20, 30, 50, 100",
            "choices": [
              "0"
            ],
            "slot": 4,
            "component": 0,
            "syntaxStart": 11,
            "syntaxEnd": 12
          }
        ]
      }
    ]
  },
  "~WR": {
    "title": "Reset Wireless Radio Card and Print Server",
    "summary": "Use this command to reinitialize the wireless radio card and the print server (wired or wireless) when the Wireless or Wireless Plus print server is running.",
    "reference": "https://docs.zebra.com/us/en/printers/software/zpl-pg/c-zpl-wireless-zpl-wireless-commands/r-zpl-wireless-wr-reset-wireless.html",
    "signatures": [
      {
        "syntax": "~WR",
        "snippet": "~WR",
        "parameters": []
      }
    ]
  },
  "^WS": {
    "title": "Set Wireless Radio Card Values",
    "summary": "Use this command to set the wireless radio card values for ESSID, Operating Mode, and Card Preamble.",
    "reference": "https://docs.zebra.com/us/en/printers/software/zpl-pg/c-zpl-wireless-zpl-wireless-commands/r-zpl-wireless-ws.html",
    "signatures": [
      {
        "syntax": "^WSe,o,p,h,i,j,k",
        "snippet": "^WS${1:125},${2:I},${3:L},${4:1},${5:15},${6:0x7FF},${7:0}",
        "parameters": [
          {
            "key": "e",
            "name": "ESSID value",
            "documentation": "ESSID value. Values: Any value up to 32 characters, including all ASCII and Extended ASCII characters, including the space character. When this parameter is left blank, the ESSID is not changed. Default: 125",
            "choices": [
              "125"
            ],
            "slot": 0,
            "component": 0,
            "syntaxStart": 3,
            "syntaxEnd": 4
          },
          {
            "key": "o",
            "name": "operating mode",
            "documentation": "operating mode. Values: I (Infrastructure), A (Adhoc) Default: I",
            "choices": [
              "I",
              "A"
            ],
            "enumValues": [
              "I",
              "A"
            ],
            "slot": 1,
            "component": 0,
            "syntaxStart": 5,
            "syntaxEnd": 6
          },
          {
            "key": "p",
            "name": "wireless radio card preamble",
            "documentation": "wireless radio card preamble. Values: L = long S = short Default: L",
            "choices": [
              "L",
              "S"
            ],
            "enumValues": [
              "L",
              "S"
            ],
            "slot": 2,
            "component": 0,
            "syntaxStart": 7,
            "syntaxEnd": 8
          },
          {
            "key": "h",
            "name": "wireless pulse",
            "documentation": "wireless pulse. Adds a pulse to the network traffic generated by the printer. This pulse is necessary with some network configurations to keep the printer online. Values: 0 = disabled 1 = enabled Default: 1",
            "choices": [
              "1",
              "0"
            ],
            "enumValues": [
              "0",
              "1"
            ],
            "slot": 3,
            "component": 0,
            "syntaxStart": 9,
            "syntaxEnd": 10
          },
          {
            "key": "i",
            "name": "wireless pulse interval",
            "documentation": "wireless pulse interval. Sets the interval at which the wireless pulse is sent when the wireless pulse feature is enabled. Values: 5 to 300 seconds Default: 15",
            "choices": [
              "15",
              "5",
              "300"
            ],
            "range": {
              "min": 5.0,
              "max": 300.0
            },
            "slot": 4,
            "component": 0,
            "syntaxStart": 11,
            "syntaxEnd": 12
          },
          {
            "key": "j",
            "name": "channel mask",
            "documentation": "channel mask. For commonly used channel masks, see Table 13 on page 424 . Values: 4 Hexadecimal digits preceded by “0x” (0x0000 to 0xFFFF) Default: 0x7FF",
            "choices": [
              "0x7FF",
              "x0000",
              "0"
            ],
            "slot": 5,
            "component": 0,
            "syntaxStart": 13,
            "syntaxEnd": 14
          },
          {
            "key": "k",
            "name": "international mode",
            "documentation": "international mode. In international mode, the printer uses the channel set by the access point. Values: 0 (Disabled), 1 (Enabled) Default: 0",
            "choices": [
              "0",
              "1"
            ],
            "enumValues": [
              "0",
              "1"
            ],
            "slot": 6,
            "component": 0,
            "syntaxStart": 15,
            "syntaxEnd": 16
          }
        ]
      }
    ]
  },
  "^WX": {
    "title": "Configure Wireless Securities",
    "summary": "Use this command to configure the wireless security settings for your printer.",
    "reference": "https://docs.zebra.com/us/en/printers/software/zpl-pg/c-zpl-wireless-zpl-wireless-commands/r-zpl-wireless-wx.html",
    "signatures": [
      {
        "syntax": "^WXa,b,c,d,e,f,g,h,i,j,k,l,m,n",
        "snippet": "^WX${1:01},${2:1},${3:O},${4:S},${5:KEY},${6:KEY},${7:KEY},${8:KEY},${9:user},${10:0000},${11:0000},${12:kerberos},${13:krbtgt},${14:0}",
        "parameters": [
          {
            "key": "a",
            "name": "security type",
            "documentation": "security type. Enter the two-digit code for the security type that your WLAN uses. For which supporting parameters (b through n) to use with the different security types, see Supporting Parameters for Differnt Security Types on page 429 . Configuring the printer for WPA also allows the printer to be used in WPA2 environments. Values: 01 to 15 01 - No wireless security is active 02 = WEP 40-bit 03 = WEP 128-bit 04 = EAP-TLS 05 = EAP-TTLS 06 = EAP-FAST 07 = PEAP 08 = LEAP 09 = WPA PSK (R6x15.x, R53.15.x, ZSPx, and later.) 10 = WPA EAP-TLS 11 = WPA EAP-TTLS 12 = WPA EAP-FAST 13 = WPA PEAP 14 = WPA LEAP 15 = Kerberos Default: 01",
            "choices": [
              "01",
              "02",
              "03",
              "04",
              "05",
              "06",
              "07",
              "08",
              "09",
              "10",
              "11",
              "12",
              "13",
              "14",
              "15",
              "PSK"
            ],
            "range": {
              "min": 1.0,
              "max": 15.0
            },
            "slot": 0,
            "component": 0,
            "syntaxStart": 3,
            "syntaxEnd": 4
          },
          {
            "key": "b",
            "name": "WEP encryption index*",
            "documentation": "WEP encryption index*. Specifies which encryption key to use for WEP encryption. A value must be specified if using WEP 40-bit or WEP 128-bit. Values: 1, 2, 3, 4 Default: 1",
            "choices": [
              "1",
              "2",
              "3",
              "4"
            ],
            "enumValues": [
              "1",
              "2",
              "3",
              "4"
            ],
            "slot": 1,
            "component": 0,
            "syntaxStart": 5,
            "syntaxEnd": 6
          },
          {
            "key": "c",
            "name": "WEP authentication type*",
            "documentation": "WEP authentication type*. Enables the WEP key authentication type. A value must be specified if using WEP 40-bit or WEP 128-bit. Values: O or S O = open system S = shared key Default: O",
            "choices": [
              "O",
              "S"
            ],
            "enumValues": [
              "O",
              "S"
            ],
            "slot": 2,
            "component": 0,
            "syntaxStart": 7,
            "syntaxEnd": 8
          },
          {
            "key": "d",
            "name": "WEP key type*",
            "documentation": "WEP key type*. Specifies the format of the WEP key. A value must be specified if using WEP 40‑bit or WEP 128-bit. Values: H or S H = hex key storage S = string key storage Default: S",
            "choices": [
              "S",
              "H"
            ],
            "enumValues": [
              "H",
              "S"
            ],
            "slot": 3,
            "component": 0,
            "syntaxStart": 9,
            "syntaxEnd": 10
          },
          {
            "key": "e",
            "name": "encryption key 1",
            "documentation": "encryption key 1. Specifies the actual values of any WEP encryption keys to be used. A value must be specified for at least one WEP encryption key if you specify 40-bit or 128-bit WEP encryption for the security type. Be careful to include the exact number of commas required for this command when setting encryption keys (parameters e through h ). A missing or extra comma will cause the keys to be stored in the wrong slots and can prevent the printer from joining the wireless network. The encryption mode affects what can be entered for the encryption keys: For 40-bit, encryption keys can be set to any 5 hex pairs or any 10 alphanumeric characters. For 128-bit, encryption keys can be set to any 13 hex pairs or any 26 alphanumeric characters. When using hex storage, do not add a leading 0x on the WEP key. Values: The actual value for the encryption key Default: None",
            "choices": [
              "KEY",
              "0"
            ],
            "slot": 4,
            "component": 0,
            "syntaxStart": 11,
            "syntaxEnd": 12
          },
          {
            "key": "f",
            "name": "encryption key 2",
            "documentation": "encryption key 2. Specifies the actual values of any WEP encryption keys to be used. A value must be specified for at least one WEP encryption key if you specify 40-bit or 128-bit WEP encryption for the security type. Be careful to include the exact number of commas required for this command when setting encryption keys (parameters e through h ). A missing or extra comma will cause the keys to be stored in the wrong slots and can prevent the printer from joining the wireless network. The encryption mode affects what can be entered for the encryption keys: For 40-bit, encryption keys can be set to any 5 hex pairs or any 10 alphanumeric characters. For 128-bit, encryption keys can be set to any 13 hex pairs or any 26 alphanumeric characters. When using hex storage, do not add a leading 0x on the WEP key. Values: The actual value for the encryption key Default: None",
            "choices": [
              "KEY",
              "0"
            ],
            "slot": 5,
            "component": 0,
            "syntaxStart": 13,
            "syntaxEnd": 14
          },
          {
            "key": "g",
            "name": "encryption key 3",
            "documentation": "encryption key 3. Specifies the actual values of any WEP encryption keys to be used. A value must be specified for at least one WEP encryption key if you specify 40-bit or 128-bit WEP encryption for the security type. Be careful to include the exact number of commas required for this command when setting encryption keys (parameters e through h ). A missing or extra comma will cause the keys to be stored in the wrong slots and can prevent the printer from joining the wireless network. The encryption mode affects what can be entered for the encryption keys: For 40-bit, encryption keys can be set to any 5 hex pairs or any 10 alphanumeric characters. For 128-bit, encryption keys can be set to any 13 hex pairs or any 26 alphanumeric characters. When using hex storage, do not add a leading 0x on the WEP key. Values: The actual value for the encryption key Default: None",
            "choices": [
              "KEY",
              "0"
            ],
            "slot": 6,
            "component": 0,
            "syntaxStart": 15,
            "syntaxEnd": 16
          },
          {
            "key": "h",
            "name": "encryption key 4",
            "documentation": "encryption key 4. Specifies the actual values of any WEP encryption keys to be used. A value must be specified for at least one WEP encryption key if you specify 40-bit or 128-bit WEP encryption for the security type. Be careful to include the exact number of commas required for this command when setting encryption keys (parameters e through h ). A missing or extra comma will cause the keys to be stored in the wrong slots and can prevent the printer from joining the wireless network. The encryption mode affects what can be entered for the encryption keys: For 40-bit, encryption keys can be set to any 5 hex pairs or any 10 alphanumeric characters. For 128-bit, encryption keys can be set to any 13 hex pairs or any 26 alphanumeric characters. When using hex storage, do not add a leading 0x on the WEP key. Values: The actual value for the encryption key Default: None",
            "choices": [
              "KEY",
              "0"
            ],
            "slot": 7,
            "component": 0,
            "syntaxStart": 17,
            "syntaxEnd": 18
          },
          {
            "key": "i",
            "name": "user ID*",
            "documentation": "user ID*. Specifies a user ID for security types that require one. A value must be specified if using the following security types: EAP-TTLS LEAP WPA LEAP PEAP WPA PEAP WPA EAP-TTLS Kerberos Values: The actual value for the user ID. Default: user",
            "choices": [
              "user",
              "text"
            ],
            "slot": 8,
            "component": 0,
            "syntaxStart": 19,
            "syntaxEnd": 20
          },
          {
            "key": "j",
            "name": "password*",
            "documentation": "password*. Specifies a password for security types that require one. A value must be specified if using the following security types: EAP-TTLS LEAP WPA LEAP PEAP WPA PEAP WPA EAP-TTLS Kerberos Values: The actual value for the password. Default: password",
            "choices": [
              "0000"
            ],
            "slot": 9,
            "component": 0,
            "syntaxStart": 21,
            "syntaxEnd": 22
          },
          {
            "key": "k",
            "name": "optional private key password*",
            "documentation": "optional private key password*. Specifies an optional private key password for security types that require one. A value must be specified if using the following security types: EAP-TLS EAP-FAST WPA EAP-TLS WPA EAP-FAST Values: The actual value for the optional private key. Default: None",
            "choices": [
              "0000"
            ],
            "slot": 10,
            "component": 0,
            "syntaxStart": 23,
            "syntaxEnd": 24
          },
          {
            "key": "l",
            "name": "realm*",
            "documentation": "realm*. Specifies the realm for security types that require it. A value must be specified if using Kerberos. Values: The actual value for the realm. Default: kerberos",
            "choices": [
              "kerberos",
              "0"
            ],
            "slot": 11,
            "component": 0,
            "syntaxStart": 25,
            "syntaxEnd": 26
          },
          {
            "key": "m",
            "name": "Key Distribution Center (KDC)*",
            "documentation": "Key Distribution Center (KDC)*. Specifies the KDC for security types that require it. A value must be specified if using Kerberos. Values: The actual value for the KDC. Default: krbtgt\"",
            "choices": [
              "krbtgt",
              "0"
            ],
            "slot": 12,
            "component": 0,
            "syntaxStart": 27,
            "syntaxEnd": 28
          },
          {
            "key": "n",
            "name": "Pre-Shared Key (PSK) value*",
            "documentation": "Pre-Shared Key (PSK) value*. Enter the PSK value. This value is calculated and must be the same for each device on the WLAN. Use ZebraNet Bridge to generate the PSK value. A value must be specified if using WPA PSK. Do not enter a pass phrase for this field in this command. To use a pass phrase, use the ZebraNet Bridge Enterprise Wireless Setup Wizard. Values: a minimum of 64 hexadecimal digits Default: None",
            "choices": [
              "0"
            ],
            "slot": 13,
            "component": 0,
            "syntaxStart": 29,
            "syntaxEnd": 30
          }
        ]
      }
    ]
  },
  "^HL": {
    "title": "Return RFID Data Log to Host",
    "summary": "The printer can log RFID data and store it in the printer’s RAM.",
    "reference": "https://docs.zebra.com/us/en/printers/software/zpl-pg/c-zpl-rfid-zpl-rfid-commands/r-zpl-rfid-hl-hl.html",
    "signatures": [
      {
        "syntax": "^HL",
        "snippet": "^HL",
        "parameters": []
      }
    ]
  },
  "~HL": {
    "title": "Return RFID Data Log to Host",
    "summary": "The printer can log RFID data and store it in the printer’s RAM.",
    "reference": "https://docs.zebra.com/us/en/printers/software/zpl-pg/c-zpl-rfid-zpl-rfid-commands/r-zpl-rfid-hl-hl.html",
    "signatures": [
      {
        "syntax": "~HL",
        "snippet": "~HL",
        "parameters": []
      }
    ]
  },
  "^HR": {
    "title": "Calibrate RFID Tag Position",
    "summary": "Use this command to initiate tag calibration for RFID media.",
    "reference": "https://docs.zebra.com/us/en/printers/software/zpl-pg/c-zpl-rfid-zpl-rfid-commands/r-zpl-rfid-hr.html",
    "signatures": [
      {
        "syntax": "^HRa,b,c,d,e,f,g,h,i",
        "snippet": "^HR${1:text},${2:text},${3:0},${4:0},${5:A},${6:0},${7:0},${8:A1},${9:A1}",
        "parameters": [
          {
            "key": "a",
            "name": "start string",
            "documentation": "start string. This parameter specifies the user text to appear before the results table. Values: any string less than 65 characters Default: start",
            "choices": [
              "text"
            ],
            "slot": 0,
            "component": 0,
            "syntaxStart": 3,
            "syntaxEnd": 4
          },
          {
            "key": "b",
            "name": "end string",
            "documentation": "end string. This parameter specifies the user text to appear after the results table. Values: any string less than 65 characters Default: end",
            "choices": [
              "text"
            ],
            "slot": 1,
            "component": 0,
            "syntaxStart": 5,
            "syntaxEnd": 6
          },
          {
            "key": "c",
            "name": "start position",
            "documentation": "start position. This parameter specifies the start position of the calibration range. All numeric values are in millimeters. Forward or backward designations assume that the label's initial position is with the leading edge at the print line. Values: Forward: F0 to Fxxx (where xxx is the label length in millimeters or 999 , whichever is less). The printer feeds the label forward for the specified distance and then begins tag calibration. Backward: B0 to B30 The printer backfeeds the label for the specified distance and then begins tag calibration. To account for the backfeed, allow empty media liner to extend out of the front of the printer when using a backward programming position. For printers that do not use backfeed during RFID calibration, the media is moved forward until it is in the same relative position for the following label. Default: For ZT400 Series and ZT600 Series printers with RFID option: B30 For R110Xi4, ZD500R, ZQ511/ZQ521, and ZQ630 printers with RFID option: B20 For all other supported printers: F0 —The printer moves the media to the start position relative to the leading edge of the label and then performs the RFID tag calibration.",
            "choices": [
              "0"
            ],
            "slot": 2,
            "component": 0,
            "syntaxStart": 7,
            "syntaxEnd": 8
          },
          {
            "key": "d",
            "name": "end position",
            "documentation": "end position. This parameter specifies the end position of the calibration range (last program position to check). All numeric values are in millimeters. Forward or backward designations assume that the label's initial position is with the leading edge at the print line. Values: Forward: F0 to Fxxx (where xxx is the label length in millimeters or 999, whichever is less). The printer performs tag calibration until it reaches the specified end position and then ends the process. Backward: B0 to B30 The printer performs tag calibration until it reaches the specified end position and then ends the process. Valid only with a backward start position that is greater than the end position. Automatic: A The printer automatically ends the tag calibration process after successfully reading and encoding a consecutive range of 5 mm on the label. The printer also ensures that no other tags can be programmed at the programming position with the calibration-determined power levels. Default: For R110Xi4 and all Link-OS RFID printers: A For all other supported printers: Label length as shown on the printer configuration label",
            "choices": [
              "0",
              "B0",
              "B30"
            ],
            "slot": 3,
            "component": 0,
            "syntaxStart": 9,
            "syntaxEnd": 10
          },
          {
            "key": "e",
            "name": "antenna and read/write power level detection",
            "documentation": "antenna and read/write power level detection. This parameter specifies whether to select the antenna and read/write power levels automatically or manually. This parameter is not valid on all RFID printers. The ZD500R, ZQ511/ZQ521, and ZQ630 printers have only one antenna, so this parameter applies only to the read/write power level settings. Values: A = Automatic. The printer automatically scans through the antennas and read/write power during calibration. M = Manual. The printer uses the current antenna and read/write power level settings. Default: A",
            "choices": [
              "A",
              "M"
            ],
            "enumValues": [
              "A",
              "M"
            ],
            "slot": 4,
            "component": 0,
            "syntaxStart": 11,
            "syntaxEnd": 12
          },
          {
            "key": "f",
            "name": "start of read/write power range",
            "documentation": "start of read/write power range. This parameter specifies the start of the read/write power range. Values: 0 to 30 Default: 0",
            "choices": [
              "0",
              "30"
            ],
            "range": {
              "min": 0.0,
              "max": 30.0
            },
            "slot": 5,
            "component": 0,
            "syntaxStart": 13,
            "syntaxEnd": 14
          },
          {
            "key": "g",
            "name": "end of read/write power range",
            "documentation": "end of read/write power range. This parameter specifies the end of the read/write power range, up to the maximum power value (based on regional compliance requirements). Values: 0 to 30 Default: maximum power",
            "choices": [
              "0",
              "30"
            ],
            "range": {
              "min": 0.0,
              "max": 30.0
            },
            "slot": 6,
            "component": 0,
            "syntaxStart": 15,
            "syntaxEnd": 16
          },
          {
            "key": "h",
            "name": "start of antenna range",
            "documentation": "start of antenna range. This parameter specifies the start of the antenna range. The antenna arrays vary based on printer models. Models that have only one antenna always use A1 . Values: ZT1xx/ZT2xx: A1 to B4 ZE5xx: A1 to B7 ZT4xx/ZT5xx/ZT6xx: A1 to E4 All other Link-OS printers: A1 Default: A1",
            "choices": [
              "A1",
              "B4"
            ],
            "slot": 7,
            "component": 0,
            "syntaxStart": 17,
            "syntaxEnd": 18
          },
          {
            "key": "i",
            "name": "end of antenna range",
            "documentation": "end of antenna range. This parameter specifies the end of the antenna range for printers that have an antenna array. The antenna arrays vary based on printer models. Values: ZT1xx/ZT2xx: A1 to B4 ZE5xx: A1 to B7 ZT4xx/ZT5xx/ZT6xx: A1 to E4 All other Link-OS printers: A1 Default: printer model dependent",
            "choices": [
              "A1",
              "B4"
            ],
            "slot": 8,
            "component": 0,
            "syntaxStart": 19,
            "syntaxEnd": 20
          }
        ]
      }
    ]
  },
  "^RB": {
    "title": "Define EPC Data Structure",
    "summary": "Use this command to define the structure of EPC data, which can be read from or written to an RFID tag.",
    "reference": "https://docs.zebra.com/us/en/printers/software/zpl-pg/c-zpl-rfid-zpl-rfid-commands/r-zpl-rfid-rb.html",
    "signatures": [
      {
        "syntax": "^RBn,p0,p1,p2, ..., p15",
        "snippet": "^RB${1:96},${2:1},${3:1},${4:1}, ..., ${5:1}",
        "parameters": [
          {
            "key": "n",
            "name": "total bit size of the partitions",
            "documentation": "total bit size of the partitions. Specify the number of bits to include in the partitions. Values: 1 to n , where n is the bit size of the tag. Default: 96",
            "choices": [
              "96"
            ],
            "slot": 0,
            "component": 0,
            "syntaxStart": 3,
            "syntaxEnd": 4
          },
          {
            "key": "p0",
            "name": "partition 0 size",
            "documentation": "partition 0 size. Specify the number of bits to include in the individual partitions. The partition sizes must add up to the bit size specified for the previous parameter. The largest individual partition size is 64 bits. Values: 1 to 64 Default: 1",
            "choices": [
              "1",
              "64"
            ],
            "range": {
              "min": 1.0,
              "max": 64.0
            },
            "slot": 1,
            "component": 0,
            "syntaxStart": 5,
            "syntaxEnd": 7
          },
          {
            "key": "p1",
            "name": "partition 1 size",
            "documentation": "partition 1 size. Specify the number of bits to include in the individual partitions. The partition sizes must add up to the bit size specified for the previous parameter. The largest individual partition size is 64 bits. Values: 1 to 64 Default: 1",
            "choices": [
              "1",
              "64"
            ],
            "range": {
              "min": 1.0,
              "max": 64.0
            },
            "slot": 2,
            "component": 0,
            "syntaxStart": 8,
            "syntaxEnd": 10
          },
          {
            "key": "p2",
            "name": "partition 2 size",
            "documentation": "partition 2 size. Specify the number of bits to include in the individual partitions. The partition sizes must add up to the bit size specified for the previous parameter. The largest individual partition size is 64 bits. Values: 1 to 64 Default: 1",
            "choices": [
              "1",
              "64"
            ],
            "range": {
              "min": 1.0,
              "max": 64.0
            },
            "slot": 3,
            "component": 0,
            "syntaxStart": 11,
            "syntaxEnd": 13
          },
          {
            "key": "p15",
            "name": "partition 15 size",
            "documentation": "partition 15 size. Specify the number of bits to include in the individual partitions. The partition sizes must add up to the bit size specified for the previous parameter. The largest individual partition size is 64 bits. Values: 1 to 64 Default: 1",
            "choices": [
              "1",
              "64"
            ],
            "range": {
              "min": 1.0,
              "max": 64.0
            },
            "repeatable": true,
            "slot": 5,
            "component": 0,
            "syntaxStart": 20,
            "syntaxEnd": 23
          },
          {
            "key": "p3",
            "name": "partition 3 size",
            "documentation": "partition 3 size. Specify the number of bits to include in the individual partitions. The partition sizes must add up to the bit size specified for the previous parameter. The largest individual partition size is 64 bits. Values: 1 to 64 Default: 1",
            "choices": [
              "1",
              "64"
            ],
            "range": {
              "min": 1.0,
              "max": 64.0
            },
            "repeatable": true,
            "slot": 6,
            "component": 0
          },
          {
            "key": "p4",
            "name": "partition 4 size",
            "documentation": "partition 4 size. Specify the number of bits to include in the individual partitions. The partition sizes must add up to the bit size specified for the previous parameter. The largest individual partition size is 64 bits. Values: 1 to 64 Default: 1",
            "choices": [
              "1",
              "64"
            ],
            "range": {
              "min": 1.0,
              "max": 64.0
            },
            "repeatable": true,
            "slot": 7,
            "component": 0
          },
          {
            "key": "p5",
            "name": "partition 5 size",
            "documentation": "partition 5 size. Specify the number of bits to include in the individual partitions. The partition sizes must add up to the bit size specified for the previous parameter. The largest individual partition size is 64 bits. Values: 1 to 64 Default: 1",
            "choices": [
              "1",
              "64"
            ],
            "range": {
              "min": 1.0,
              "max": 64.0
            },
            "repeatable": true,
            "slot": 8,
            "component": 0
          },
          {
            "key": "p6",
            "name": "partition 6 size",
            "documentation": "partition 6 size. Specify the number of bits to include in the individual partitions. The partition sizes must add up to the bit size specified for the previous parameter. The largest individual partition size is 64 bits. Values: 1 to 64 Default: 1",
            "choices": [
              "1",
              "64"
            ],
            "range": {
              "min": 1.0,
              "max": 64.0
            },
            "repeatable": true,
            "slot": 9,
            "component": 0
          },
          {
            "key": "p7",
            "name": "partition 7 size",
            "documentation": "partition 7 size. Specify the number of bits to include in the individual partitions. The partition sizes must add up to the bit size specified for the previous parameter. The largest individual partition size is 64 bits. Values: 1 to 64 Default: 1",
            "choices": [
              "1",
              "64"
            ],
            "range": {
              "min": 1.0,
              "max": 64.0
            },
            "repeatable": true,
            "slot": 10,
            "component": 0
          },
          {
            "key": "p8",
            "name": "partition 8 size",
            "documentation": "partition 8 size. Specify the number of bits to include in the individual partitions. The partition sizes must add up to the bit size specified for the previous parameter. The largest individual partition size is 64 bits. Values: 1 to 64 Default: 1",
            "choices": [
              "1",
              "64"
            ],
            "range": {
              "min": 1.0,
              "max": 64.0
            },
            "repeatable": true,
            "slot": 11,
            "component": 0
          },
          {
            "key": "p9",
            "name": "partition 9 size",
            "documentation": "partition 9 size. Specify the number of bits to include in the individual partitions. The partition sizes must add up to the bit size specified for the previous parameter. The largest individual partition size is 64 bits. Values: 1 to 64 Default: 1",
            "choices": [
              "1",
              "64"
            ],
            "range": {
              "min": 1.0,
              "max": 64.0
            },
            "repeatable": true,
            "slot": 12,
            "component": 0
          },
          {
            "key": "p10",
            "name": "partition 10 size",
            "documentation": "partition 10 size. Specify the number of bits to include in the individual partitions. The partition sizes must add up to the bit size specified for the previous parameter. The largest individual partition size is 64 bits. Values: 1 to 64 Default: 1",
            "choices": [
              "1",
              "64"
            ],
            "range": {
              "min": 1.0,
              "max": 64.0
            },
            "repeatable": true,
            "slot": 13,
            "component": 0
          },
          {
            "key": "p11",
            "name": "partition 11 size",
            "documentation": "partition 11 size. Specify the number of bits to include in the individual partitions. The partition sizes must add up to the bit size specified for the previous parameter. The largest individual partition size is 64 bits. Values: 1 to 64 Default: 1",
            "choices": [
              "1",
              "64"
            ],
            "range": {
              "min": 1.0,
              "max": 64.0
            },
            "repeatable": true,
            "slot": 14,
            "component": 0
          },
          {
            "key": "p12",
            "name": "partition 12 size",
            "documentation": "partition 12 size. Specify the number of bits to include in the individual partitions. The partition sizes must add up to the bit size specified for the previous parameter. The largest individual partition size is 64 bits. Values: 1 to 64 Default: 1",
            "choices": [
              "1",
              "64"
            ],
            "range": {
              "min": 1.0,
              "max": 64.0
            },
            "repeatable": true,
            "slot": 15,
            "component": 0
          },
          {
            "key": "p13",
            "name": "partition 13 size",
            "documentation": "partition 13 size. Specify the number of bits to include in the individual partitions. The partition sizes must add up to the bit size specified for the previous parameter. The largest individual partition size is 64 bits. Values: 1 to 64 Default: 1",
            "choices": [
              "1",
              "64"
            ],
            "range": {
              "min": 1.0,
              "max": 64.0
            },
            "repeatable": true,
            "slot": 16,
            "component": 0
          },
          {
            "key": "p14",
            "name": "partition 14 size",
            "documentation": "partition 14 size. Specify the number of bits to include in the individual partitions. The partition sizes must add up to the bit size specified for the previous parameter. The largest individual partition size is 64 bits. Values: 1 to 64 Default: 1",
            "choices": [
              "1",
              "64"
            ],
            "range": {
              "min": 1.0,
              "max": 64.0
            },
            "repeatable": true,
            "slot": 17,
            "component": 0
          }
        ]
      }
    ]
  },
  "^RF": {
    "title": "Read or Write RFID Format",
    "summary": "Use this command to read or write to (encode) an RFID tag or to specify the access password.",
    "reference": "https://docs.zebra.com/us/en/printers/software/zpl-pg/c-zpl-rfid-zpl-rfid-commands/r-zpl-rfid-rf.html",
    "signatures": [
      {
        "syntax": "^RFo,f,b,n,m",
        "snippet": "^RF${1:W},${2:H},${3:0},${4:1},${5:E}",
        "parameters": [
          {
            "key": "o",
            "name": "operation",
            "documentation": "operation. Specifies the action to be performed. Values: W = write to (encode) the tag L = write with LOCK (if supported by tag type; Gen 2 tag type does not use this locking function) R = read the tag P = read password (Gen 2 tag type only. Not supported on all Gen 2 printers, including the ZD500R printer.) S = specify the access password Default: W",
            "choices": [
              "W",
              "L",
              "LOCK",
              "R",
              "P",
              "S"
            ],
            "enumValues": [
              "W",
              "L",
              "LOCK"
            ],
            "slot": 0,
            "component": 0,
            "syntaxStart": 3,
            "syntaxEnd": 4
          },
          {
            "key": "f",
            "name": "format",
            "documentation": "format. Values: A = ASCII H = Hexadecimal E = EPC (ensure proper setup with the ^RB command) Default: H",
            "choices": [
              "H",
              "A",
              "E",
              "EPC"
            ],
            "enumValues": [
              "A",
              "H",
              "E",
              "EPC"
            ],
            "slot": 1,
            "component": 0,
            "syntaxStart": 5,
            "syntaxEnd": 6
          },
          {
            "key": "b",
            "name": "password or starting block number",
            "documentation": "password or starting block number. For Gen 2 tag type only: What you specify for this parameter depends on what you enter for other parameters. When the Gen 2 memory bank parameter is set to E (EPC 96‑bit) or A (EPC and Auto adjust PC bits), W and R values are always set to 2. If the Operation parameter value is... W Values: P , which indicates that an access password, a kill password, or both follow in a ^FD command. Each password must be 8 hex characters. If the password is omitted, it is not written. An access password is used in subsequent lock commands in the format. 0 to n, which specifies the 16-bit starting block number, where n is the maximum number of blocks for the bank specified in the memory bank parameter. Default: 0 R Values: 0 to n, which specifies the 16-bit starting block number, where n is the maximum number of blocks for the bank specified in the memory bank parameter. Default: 0 S This parameter must be P and must be followed by the access password in a ^FD command. For tag types other than Gen 2: Specifies the starting block number. Values: 0 to n, where n is the maximum number of blocks for the tag. Default: 0",
            "choices": [
              "0",
              "E",
              "A"
            ],
            "slot": 2,
            "component": 0,
            "syntaxStart": 7,
            "syntaxEnd": 8
          },
          {
            "key": "n",
            "name": "number of bytes to read or write",
            "documentation": "number of bytes to read or write. Specifies the number of bytes to read or write. For high-frequency (HF) printers: Values: 1 to n, where n is the maximum number of bytes for the tag. Default: 1 For Gen 2 tag type only: When E or A is specified for the memory bank parameter, this value is not required. Values: 1 to n, where n is the maximum number of bytes for the tag. Default: 1 For all other printers and tag types: This parameter applies only when the starting block number is 1. Values: 1 to n, where n is the maximum number of bytes for the tag. For UCODE EPC 1.19, n is 32. Default: 1",
            "choices": [
              "1"
            ],
            "slot": 3,
            "component": 0,
            "syntaxStart": 9,
            "syntaxEnd": 10
          },
          {
            "key": "m",
            "name": "Gen 2 memory bank",
            "documentation": "Gen 2 memory bank. This parameter applies to Gen 2 tags only. Specifies the Gen 2 memory bank. For more information about Gen 2 memory, refer to the RFID Programming Guide for your printer. E = EPC 96-bit (When writing data, this parameter performs the operation on Gen 2 bit address 20 h and accesses 12 bytes of the EPC memory bank. When reading data, this parameter reads the amount of data specified in the PC bits on the tag.) A = EPC and Auto adjust PC bits (When writing data, this parameter performs the operation on Gen 2 bit address 20 h of the EPC memory bank and accesses the number of bytes specified in the ^FD . The PC bits will be updated to match the amount of data written to the tag. When reading data, this parameter reads the amount of data specified in the PC bits on the tag. This value is supported only by the ZD500R printer and ZT400 Series and ZT600_Series RFID printers. 0 = Reserved 1 = EPC 2 = TID (Tag ID) 3 = User Default: E",
            "choices": [
              "E",
              "A",
              "0",
              "1",
              "2",
              "3",
              "TID"
            ],
            "slot": 4,
            "component": 0,
            "syntaxStart": 11,
            "syntaxEnd": 12
          }
        ]
      }
    ]
  },
  "^RL": {
    "title": "Lock/Unlock RFID Tag Memory",
    "summary": "Use this command to lock/unlock RFID tag memory.",
    "reference": "https://docs.zebra.com/us/en/printers/software/zpl-pg/c-zpl-rfid-zpl-rfid-commands/r-zpl-rfid-rl.html",
    "signatures": [
      {
        "syntax": "^RLP",
        "snippet": "^RLP",
        "parameters": [],
        "label": "Permanently lock all tag memory"
      },
      {
        "syntax": "^RLB,s,n",
        "snippet": "^RLB,${1:0},${2:1}",
        "parameters": [
          {
            "key": "s",
            "name": "starting user-memory section",
            "documentation": "First user-memory section to permanently lock.",
            "choices": [
              "0"
            ],
            "slot": 1,
            "component": 0,
            "syntaxStart": 5,
            "syntaxEnd": 6
          },
          {
            "key": "n",
            "name": "number of user-memory sections",
            "documentation": "Number of consecutive user-memory sections to permanently lock.",
            "choices": [
              "1"
            ],
            "slot": 2,
            "component": 0,
            "syntaxStart": 7,
            "syntaxEnd": 8
          }
        ],
        "label": "Permanently lock user-memory sections"
      },
      {
        "syntax": "^RLM,k,a,e,u",
        "snippet": "^RLM,${1:U},${2:U},${3:U},${4:U}",
        "parameters": [
          {
            "key": "k",
            "name": "kill-password lock action",
            "documentation": "Kill-password lock action. Values: U, L, O, or P.",
            "choices": [
              "U",
              "L",
              "O",
              "P"
            ],
            "enumValues": [
              "U",
              "L",
              "O",
              "P"
            ],
            "slot": 1,
            "component": 0,
            "syntaxStart": 5,
            "syntaxEnd": 6
          },
          {
            "key": "a",
            "name": "access-password lock action",
            "documentation": "Access-password lock action. Values: U, L, O, or P.",
            "choices": [
              "U",
              "L",
              "O",
              "P"
            ],
            "enumValues": [
              "U",
              "L",
              "O",
              "P"
            ],
            "slot": 2,
            "component": 0,
            "syntaxStart": 7,
            "syntaxEnd": 8
          },
          {
            "key": "e",
            "name": "EPC-memory lock action",
            "documentation": "EPC-memory lock action. Values: U, L, O, or P.",
            "choices": [
              "U",
              "L",
              "O",
              "P"
            ],
            "enumValues": [
              "U",
              "L",
              "O",
              "P"
            ],
            "slot": 3,
            "component": 0,
            "syntaxStart": 9,
            "syntaxEnd": 10
          },
          {
            "key": "u",
            "name": "user-memory lock action",
            "documentation": "User-memory lock action. Values: U, L, O, or P.",
            "choices": [
              "U",
              "L",
              "O",
              "P"
            ],
            "enumValues": [
              "U",
              "L",
              "O",
              "P"
            ],
            "slot": 4,
            "component": 0,
            "syntaxStart": 11,
            "syntaxEnd": 12
          }
        ],
        "label": "Lock or unlock RFID memory banks"
      }
    ]
  },
  "^RS": {
    "title": "Set Up RFID Parameters",
    "summary": "Use this command to set up RFID parameters including tag type; programming position; and error handling, such as setting the number of labels that will be attempted if an error occurs.",
    "reference": "https://docs.zebra.com/us/en/printers/software/zpl-pg/c-zpl-rfid-zpl-rfid-commands/r-zpl-rfid-rs.html",
    "signatures": [
      {
        "syntax": "^RSt,p,v,n,e,a,c,s",
        "snippet": "^RS${1:8},${2:0},${3:0},${4:3},${5:N},${6:S},${7:0},${8:0}",
        "parameters": [
          {
            "key": "t",
            "name": "tag type",
            "documentation": "tag type. Values: 8 = EPC Class 1, Generation 2 (Gen 2) Default: 8 —Gen 2 is the only tag type supported by current RFID printers. For tag types supported by older printers, refer to the original RFID Programming Guide.",
            "choices": [
              "8",
              "2"
            ],
            "enumValues": [
              "8",
              "2"
            ],
            "slot": 0,
            "component": 0,
            "syntaxStart": 3,
            "syntaxEnd": 4
          },
          {
            "key": "p",
            "name": "read/write position of the tag (programming position)",
            "documentation": "read/write position of the tag (programming position). This parameter sets the read/write position of the tag. If a label format specifies a value for the programming position, this value will be used for the programming position for all labels until a new position is specified or until the tag calibration procedure is run. For Link-OS printers: Values: F0 to Fxxx (where xxx is the label length in millimeters or 999 , whichever is less) The printer prints the first part of a label until it reaches the specified distance and then begins programming. After programming, the printer prints the remainder of the label. B0 to B30 The printer backfeeds the label for the specified distance and then begins programming. To account for the backfeed, allow empty media liner to extend out of the front of the printer when using a backward programming position. up = move to the next value down = move to the previous value Default: F0 (which moves the leading edge of the label to the print line) For older RFID printers: Values: Absolute Mode (all firmware versions): xxxx = 0 to label length (in dot rows). Move the media to the specified position xxxx on the label, measured in dot rows from the label top, before encoding. Set to 0 (no movement) if the tag is already in the effective area without moving the media. Relative Mode (firmware versions V53.17.6 and later): F0 to Fxxx (where xxx is the label length in millimeters or 999 , whichever is less). The printer prints the first part of a label until it reaches the specified distance and then begins programming. After programming, the printer prints the remainder of the label. B0 to B30 (Does not apply to the RP4T printer.) The printer backfeeds the label for the specified distance and then begins programming. To account for the backfeed, allow empty media liner to extend out of the front of the printer when using a backward programming position. Default: For the R2844-Z and RPAX: 0 (no movement) For printers using V53.17.6, V74.19.6Z, and later: F0 (which moves the leading edge of the label to the print line) All others: label length minus 1 mm (1/16 in.)",
            "choices": [
              "0",
              "up",
              "down",
              "xxxx",
              "F0",
              "B30",
              "B0"
            ],
            "slot": 1,
            "component": 0,
            "syntaxStart": 5,
            "syntaxEnd": 6
          },
          {
            "key": "v",
            "name": "length of void printout",
            "documentation": "length of void printout. Sets the length of the void printout in vertical (Y axis) dot rows. Values: 0 to label length Default: label length",
            "choices": [
              "0"
            ],
            "slot": 2,
            "component": 0,
            "syntaxStart": 7,
            "syntaxEnd": 8
          },
          {
            "key": "n",
            "name": "number of labels to try encoding",
            "documentation": "number of labels to try encoding. The number of labels that will be attempted in case of read/encode failure. Values: 1 to 10 Default: 3",
            "choices": [
              "3",
              "1",
              "10"
            ],
            "range": {
              "min": 1.0,
              "max": 10.0
            },
            "slot": 3,
            "component": 0,
            "syntaxStart": 9,
            "syntaxEnd": 10
          },
          {
            "key": "e",
            "name": "error handling",
            "documentation": "error handling. If an error persists after the specified number of labels are tried, perform this error handling action. Values: N = No action (printer drops the label format causing the error and moves to the next queued label) P = Place printer in Pause mode (label format stays in the queue until the user cancels) E = Place printer in Error mode (label format stays in the queue until the user cancels) Defaults: N You can set the printer to send an error message to the host for each failure. To enable or disable this unsolicited error message, refer to the ^SX and ^SQ ZPL commands. Use V for the condition type for an RFID error.",
            "choices": [
              "N",
              "P",
              "E"
            ],
            "enumValues": [
              "N",
              "P",
              "E"
            ],
            "slot": 4,
            "component": 0,
            "syntaxStart": 11,
            "syntaxEnd": 12
          },
          {
            "key": "a",
            "name": "signals on applicator",
            "documentation": "signals on applicator. This parameter applies only to older RFID printers that have an applicator board. This parameter does not apply to the R2844-Z or to Link-OS printers. For the R4Mplus, this parameter applies only to printers with firmware version SP994X (R4Mplus European version). Single Signal Mode In this mode, one start print signal starts printing. Then, at the program position (parameter p), the printer automatically stops and encodes the tag. Printing continues, and a single end print signal signifies the completion of the label. Double Signal Mode With RFID, when there is a non-zero program position, the label is logically split into two parts. The first part is printed, the tag encodes, and then the second part prints. If this parameter is set to “D,” then the label is split into two and requires both portions of the label to be controlled by the applicator. This means that a start print signal triggers the first portion of the label, and then when the printer reaches the RFID program position (and the motor stops), an end print signal is provided. In this mode, a second start print signal is required to print the rest of the label. When the label is complete, a final end print signal is provided. If parameter p is zero, then single signal mode is used (parameter ignored). If p is F0 (or B0) with backfeed-after, then single signal mode is used (parameter ignored). Values: S = single signal D = double signal (For the R110PAX4, Double mode will work only if the read/write position is changed from the default of zero.) Default: S",
            "choices": [
              "S",
              "D"
            ],
            "enumValues": [
              "S",
              "D"
            ],
            "slot": 5,
            "component": 0,
            "syntaxStart": 13,
            "syntaxEnd": 14
          },
          {
            "key": "c",
            "name": "reserved",
            "documentation": "reserved. Not applicable.",
            "choices": [
              "0"
            ],
            "slot": 6,
            "component": 0,
            "syntaxStart": 15,
            "syntaxEnd": 16
          },
          {
            "key": "s",
            "name": "void print speed",
            "documentation": "void print speed. This parameter is not supported on all printer models. If a label is voided, the speed at which “VOID” will be printed across the label. Values: any valid print speed Default: the printer’s maximum print speed",
            "choices": [
              "0"
            ],
            "slot": 7,
            "component": 0,
            "syntaxStart": 17,
            "syntaxEnd": 18
          }
        ]
      }
    ]
  },
  "^RU": {
    "title": "Read Unique RFID Chip Serialization",
    "summary": "Use this command to read the TID (Tag ID) data from the current chip and format a unique 38‑bit serial number, which will be placed in the lower (least significant) 38 bits…",
    "reference": "https://docs.zebra.com/us/en/printers/software/zpl-pg/c-zpl-rfid-zpl-rfid-commands/r-zpl-rfid-ru.html",
    "signatures": [
      {
        "syntax": "^RUa,b",
        "snippet": "^RU${1:100},${2:#}",
        "parameters": [
          {
            "key": "a",
            "name": "prefix",
            "documentation": "prefix. Specifies the prefix in ASCII Binary Values: Only ASCII characters 1 and 0 are accepted. Maximum of 38 characters. The number of bits in the value specifies the length of the prefix. The prefix is placed as the left-most (most significant) bits in the unique serial number. If nothing is specified, the default value will be used. Default: The MCS prefix is determined by the MDID in the TID of the chip read: 100 = EM Micro Impinj = 101 Alien = 110 NXP = 111",
            "choices": [
              "100",
              "Impinj",
              "Alien",
              "NXP"
            ],
            "slot": 0,
            "component": 0,
            "syntaxStart": 3,
            "syntaxEnd": 4
          },
          {
            "key": "b",
            "name": "special character",
            "documentation": "special character. Special character for serial number inclusion. Values: Any ASCII character other than the current Command character, Control character, Delimiter character, or any of the Real-Time Clock (RTC) characters. Default: #",
            "choices": [
              "#"
            ],
            "slot": 1,
            "component": 0,
            "syntaxStart": 5,
            "syntaxEnd": 6
          }
        ]
      }
    ]
  },
  "^RW": {
    "title": "Set RF Power Levels for Read and Write",
    "summary": "Use this command to set the RFID read and write power levels if the desired levels are not achieved through RFID tag calibration.",
    "reference": "https://docs.zebra.com/us/en/printers/software/zpl-pg/c-zpl-rfid-zpl-rfid-commands/r-zpl-rfid-rw.html",
    "signatures": [
      {
        "syntax": "^RWr,w,a",
        "snippet": "^RW${1:L},${2:L},${3:A4}",
        "parameters": [
          {
            "key": "r",
            "name": "read power",
            "documentation": "read power. This parameter sets the power level to match the desired output as calibrated in the factory. R53.16.3, V53.17.5, and later: Values: 0 to 30 Default: 16 R60.16.4, R62.16.4, R63.16.4, SP994Q, SP999G, SP1027G, SP1056F, SP1082G, and later: Values: 0 to 30 , H (high), M (medium), L (low) Default: L R65.X and older versions of other firmware: Values: H = high M = medium L = low Default: L",
            "choices": [
              "L",
              "H",
              "M",
              "0",
              "30"
            ],
            "range": {
              "min": 0.0,
              "max": 30.0
            },
            "slot": 0,
            "component": 0,
            "syntaxStart": 3,
            "syntaxEnd": 4
          },
          {
            "key": "w",
            "name": "write power",
            "documentation": "write power. This parameter is ignored on the R110Xi HF printer (firmware version R65.X) because read and write powers cannot be specified separately. The printer uses the value that you specified for read power for both the read and write power settings. This parameter sets the power level to match the desired output as calibrated in the factory. R53.16.3, V53.17.5, and later: Values: 0 to 30 Default: 16 R60.16.4, R62.16.4, R63.16.4, SP994Q, SP999G, SP1027G, SP1056F, SP1082G, and later: Values: 0 to 30 , H (high), M (medium), L (low) Default: L Older versions of firmware: Values: H = high M = medium L = low Default: L",
            "choices": [
              "L",
              "H",
              "M",
              "0",
              "30"
            ],
            "range": {
              "min": 0.0,
              "max": 30.0
            },
            "slot": 1,
            "component": 0,
            "syntaxStart": 5,
            "syntaxEnd": 6
          },
          {
            "key": "a",
            "name": "RFID antenna element selection",
            "documentation": "RFID antenna element selection. ZD500R, ZQ511/ZQ521, and ZQ630: This printer only has one antenna element, so the value used is always A1 . ZT400 and ZT600: This parameter specifies the RFID antenna to be used for RFID operation. E1 , E2 , E3 , E4 D1 , D2 , D3 , D4 C1 , C2 , C3 , C4 B1 , B2 , B3 , B4 A1 , A2 , A3 , A4 A4 (Continued on next page) RFID antenna element selection. (Continued from previous page) R110Xi4 (V53.17.5 and later): This parameter specifies the RFID antenna to be used for RFID operation. Values: A1, A2, A3, A4, B1, B2, B3, B4, C1, C2, C3, C4, D2, D3, D4, E2, E3, E4, F2, F3, F4 (combinations D1, E1, and F1 are invalid) Default: A4 R110Xi HF (R65.X): This parameter selects the antenna port that provides the best results for reading and writing. Values: 1 = antenna port 1 2 = antenna port 2 Default: 1",
            "choices": [
              "A4",
              "1",
              "2",
              "F4",
              "HF"
            ],
            "slot": 2,
            "component": 0,
            "syntaxStart": 7,
            "syntaxEnd": 8
          }
        ]
      }
    ]
  }
} as const satisfies Readonly<Record<string, ZplCommandDefinition>>;

export const zplLanguageCoverage = Object.freeze({
  commands: Object.keys(zplCommandDefinitions).length,
  signatures: Object.values(zplCommandDefinitions).reduce((total, command) => total + command.signatures.length, 0),
  parameters: Object.values(zplCommandDefinitions).reduce(
    (total, command) => total + command.signatures.reduce((sum, signature) => sum + signature.parameters.length, 0),
    0,
  ),
});
