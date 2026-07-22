# Code and WYSIWYG editor

Open `/editor` in the local web app to edit ZPL source and the rendered label in one synchronized workspace. Source remains authoritative: every visual action produces an undoable source edit, and source edits immediately rerender the designer.

## Visual layout

- Click a layer, Shift-click additional layers, or drag a marquee to select several fields.
- Drag or use the arrow keys to move the selection. Arrow keys move by the configured snap amount; Shift uses a larger step.
- Use **Arrange** to align or distribute selected layers. Object edges, centers, the label, and manual guides can act as snap targets.
- Drag from a ruler to add a guide. Double-click a guide, or use its context action, to remove it.
- Locking prevents source-changing visual operations. Hiding affects only the designer and is stored as editor metadata in the ZPL.
- Resizeable fields expose resize cursors at their edges and corners instead of persistent handles. Double-click text to edit its field data directly on the label.

Layers and Properties share the right panel. Deselecting a field returns to Layers. Selecting a rendered field or source command scrolls and temporarily selects the corresponding source span.

## Variable data

Open **Data** to create a dataset or import CSV/JSON. Columns bind to numbered `^FN` fields; prompts such as `^FN1"Customer"` become column labels where possible.

The record navigator switches the live preview without changing the ZPL. Editing bound text on the label updates the active record. Export can produce CSV or a ZIP of rendered PNGs for up to 500 records.

## Images and fonts

Open **Assets** to manage printer resources.

- PNG, JPEG, WebP, GIF, BMP, or SVG images can be resized and converted with threshold, Bayer, or Floyd–Steinberg dithering. Insert them as compressed `~DG` + `^XG` resources or inline `^GFA` data.
- TrueType/OpenType imports are validated before being encoded as `~DY`; `^CW` registers a one-character font identifier. Select a text field to apply that font while retaining its orientation and dimensions.
- Rename updates definitions and references atomically. Deleting removes the definition but intentionally leaves uses visible through missing-resource diagnostics.

Original imported files are stored in IndexedDB and included in workspace archives so they can be recovered or edited later.

## Files and portability

`Cmd/Ctrl+S` downloads the active ZPL file. `Cmd/Ctrl+Shift+S` downloads a `.zip` workspace containing all open labels, datasets, guides, resource metadata, and original assets. Open or drop that archive to restore the workspace.

Workspace import rejects unsupported manifests and enforces limits of 100 labels, 64 MB expanded data, 32 MB per entry, and 8 MB per ZPL source.

## Shortcuts

| Action | Shortcut |
| --- | --- |
| Show editor help | `?` |
| New / open / save label | `Cmd/Ctrl+N`, `Cmd/Ctrl+O`, `Cmd/Ctrl+S` |
| Save workspace | `Cmd/Ctrl+Shift+S` |
| Select all visual layers | `Cmd/Ctrl+A` while the designer is focused |
| Copy / paste / duplicate layers | `Cmd/Ctrl+C`, `Cmd/Ctrl+V`, `Cmd/Ctrl+D` |
| Delete selected layers | `Backspace` or `Delete` |
| Move selected layers | Arrow keys |
| Undo / redo visual changes | `Cmd/Ctrl+Z`, `Cmd/Ctrl+Shift+Z` |
| Render now | `Cmd/Ctrl+Enter` |
| Command palette | `Cmd/Ctrl+P` |
| Format source | `Cmd/Ctrl+Shift+F` |
| Deselect / close dialogs | `Escape` |
