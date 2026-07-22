<template>
  <div class="data-backdrop" @mousedown.self="emit('close')">
    <section class="data-dialog" role="dialog" aria-modal="true" aria-labelledby="variable-data-title">
      <header class="data-header">
        <div>
          <h2 id="variable-data-title">Variable data</h2>
          <p>Bind columns to <code>^FN</code> fields and preview or export every record.</p>
        </div>
        <button class="data-icon-button" type="button" title="Close variable data" aria-label="Close variable data" @click="emit('close')">
          <IconClose aria-hidden="true" />
        </button>
      </header>

      <div class="data-toolbar">
        <div class="data-select-wrap">
          <select :value="activeDataset?.id ?? ''" aria-label="Active dataset" @change="selectDataset">
            <option value="">No dataset</option>
            <option v-for="dataset in modelValue.datasets" :key="dataset.id" :value="dataset.id">{{ dataset.name }}</option>
          </select>
          <IconChevronDown class="data-select-icon" aria-hidden="true" />
        </div>
        <button type="button" @click="addDataset">New dataset</button>
        <button type="button" @click="importInput?.click()">Import CSV / JSON</button>
        <button type="button" :disabled="!activeDataset" @click="exportCsv">Export CSV</button>
        <button class="data-primary" type="button" :disabled="!activeDataset?.records.length" @click="emit('batchPreview')">Batch PNGs</button>
        <input ref="importInput" class="sr-only" type="file" accept=".csv,.json,text/csv,application/json" @change="importFile" />
      </div>

      <div v-if="activeDataset" class="data-body">
        <aside class="data-sidebar">
          <label>
            Dataset name
            <input :value="activeDataset.name" @input="renameDataset" />
          </label>

          <div class="data-section-title">
            <strong>Bindings in source</strong>
            <span>{{ detectedBindings.length }}</span>
          </div>
          <ul v-if="detectedBindings.length" class="data-binding-list">
            <li v-for="binding in detectedBindings" :key="`${binding.span.start}-${binding.fieldNumber}`">
              <code>^FN{{ binding.fieldNumber }}</code>
              <span>{{ binding.prompt || columnForNumber(binding.fieldNumber)?.name || "Unnamed field" }}</span>
              <small v-if="!columnForNumber(binding.fieldNumber)">No column</small>
            </li>
          </ul>
          <p v-else class="data-empty-note">No <code>^FN</code> fields yet. Select a visual layer and choose a binding in Properties.</p>

          <button class="data-danger" type="button" @click="removeDataset">Delete dataset</button>
        </aside>

        <main class="data-table-wrap">
          <div class="data-table-actions">
            <span>{{ activeDataset.records.length }} record{{ activeDataset.records.length === 1 ? "" : "s" }} · {{ activeDataset.columns.length }} column{{ activeDataset.columns.length === 1 ? "" : "s" }}</span>
            <button type="button" @click="addColumn">Add column</button>
            <button type="button" @click="addRecord">Add record</button>
          </div>
          <div class="data-scroll">
            <table class="data-table">
              <thead>
                <tr>
                  <th class="data-record-column">Record</th>
                  <th v-for="column in activeDataset.columns" :key="column.id" class="data-column-header">
                    <input :value="column.name" :aria-label="`Column name for FN ${column.fieldNumber}`" @input="updateColumn(column.id, 'name', $event)" />
                    <label>
                      <span>^FN</span>
                      <input :value="column.fieldNumber" inputmode="numeric" :aria-label="`Field number for ${column.name}`" @change="updateColumn(column.id, 'fieldNumber', $event)" />
                    </label>
                    <button class="data-column-delete" type="button" :title="`Delete ${column.name}`" :aria-label="`Delete ${column.name}`" @click="removeColumn(column.id)">
                      <IconClose aria-hidden="true" />
                    </button>
                  </th>
                  <th class="data-row-action"></th>
                </tr>
              </thead>
              <tbody>
                <tr
                  v-for="(record, recordIndex) in activeDataset.records"
                  :key="record.id"
                  :class="{ active: record.id === activeDataset.activeRecordId }"
                  @click="activateRecord(record.id)"
                >
                  <th>
                    <span class="data-record-index">{{ recordIndex + 1 }}</span>
                    <input :value="record.name" :aria-label="`Name for record ${recordIndex + 1}`" @input="updateRecordName(record.id, $event)" />
                  </th>
                  <td v-for="column in activeDataset.columns" :key="column.id">
                    <textarea
                      :value="record.values[column.id] ?? ''"
                      rows="1"
                      :aria-label="`${column.name} for ${record.name}`"
                      @input="updateCell(record.id, column.id, $event)"
                      @focus="activateRecord(record.id)"
                    ></textarea>
                  </td>
                  <td class="data-row-action">
                    <button class="data-row-delete" type="button" :title="`Delete ${record.name}`" :aria-label="`Delete ${record.name}`" @click.stop="removeRecord(record.id)">
                      <IconClose aria-hidden="true" />
                    </button>
                  </td>
                </tr>
              </tbody>
            </table>
            <div v-if="!activeDataset.columns.length" class="data-empty-table">
              Add a column or import a CSV/JSON file to start binding variable fields.
            </div>
          </div>
        </main>
      </div>

      <div v-else class="data-welcome">
        <strong>Create or import a dataset</strong>
        <p>Each column gets a unique <code>^FN</code> number. Records can then drive live previews and batch PNG export.</p>
        <div><button type="button" @click="addDataset">New dataset</button><button type="button" @click="importInput?.click()">Import CSV / JSON</button></div>
      </div>
      <p v-if="message" class="data-message" role="status">{{ message }}</p>
    </section>
  </div>
</template>

<script setup lang="ts">
import { computed, ref } from "vue";
import { IconChevronDown, IconClose } from "@iconify-prerendered/vue-mdi";
import {
  activeVariableDataset,
  createVariableDataset,
  createVariableId,
  createVariableRecord,
  importVariableDataset,
  normalizeVariableData,
  variableDatasetToCsv,
  type DocumentVariableData,
  type VariableColumn,
  type ZplFieldBinding,
} from "../variableData";

const props = defineProps<{
  modelValue: DocumentVariableData;
  detectedBindings: readonly ZplFieldBinding[];
}>();

const emit = defineEmits<{
  "update:modelValue": [value: DocumentVariableData];
  close: [];
  batchPreview: [];
}>();

const importInput = ref<HTMLInputElement | null>(null);
const message = ref("");
const activeDataset = computed(() => activeVariableDataset(props.modelValue));

function cloneData(): DocumentVariableData {
  return normalizeVariableData(JSON.parse(JSON.stringify(props.modelValue)) as unknown);
}

function update(mutator: (data: DocumentVariableData) => void): void {
  const next = cloneData();
  mutator(next);
  emit("update:modelValue", normalizeVariableData(next));
}

function withDataset(data: DocumentVariableData, mutate: (dataset: NonNullable<ReturnType<typeof activeVariableDataset>>) => void): void {
  const dataset = activeVariableDataset(data);
  if (dataset) mutate(dataset);
}

function selectDataset(event: Event): void {
  const id = (event.currentTarget as HTMLSelectElement).value;
  update((data) => { data.activeDatasetId = id || undefined; });
}

function addDataset(): void {
  update((data) => {
    const dataset = createVariableDataset(`Dataset ${data.datasets.length + 1}`, ["Field 1"]);
    data.datasets.push(dataset);
    data.activeDatasetId = dataset.id;
  });
}

function removeDataset(): void {
  const current = activeDataset.value;
  if (!current || !window.confirm(`Delete dataset “${current.name}”?`)) return;
  update((data) => {
    data.datasets = data.datasets.filter(({ id }) => id !== current.id);
    data.activeDatasetId = data.datasets[0]?.id;
  });
}

function renameDataset(event: Event): void {
  const name = (event.currentTarget as HTMLInputElement).value;
  update((data) => withDataset(data, (dataset) => { dataset.name = name; }));
}

function addColumn(): void {
  update((data) => withDataset(data, (dataset) => {
    const used = new Set(dataset.columns.map(({ fieldNumber }) => fieldNumber));
    let number = 1;
    while (used.has(String(number))) number += 1;
    const column: VariableColumn = {
      id: createVariableId("column"),
      name: `Field ${dataset.columns.length + 1}`,
      fieldNumber: String(number),
    };
    dataset.columns.push(column);
    for (const record of dataset.records) record.values[column.id] = "";
  }));
}

function updateColumn(id: string, key: "name" | "fieldNumber", event: Event): void {
  const value = (event.currentTarget as HTMLInputElement).value;
  update((data) => withDataset(data, (dataset) => {
    const column = dataset.columns.find((candidate) => candidate.id === id);
    if (column) column[key] = value;
  }));
}

function removeColumn(id: string): void {
  update((data) => withDataset(data, (dataset) => {
    dataset.columns = dataset.columns.filter((column) => column.id !== id);
    for (const record of dataset.records) delete record.values[id];
  }));
}

function addRecord(): void {
  update((data) => withDataset(data, (dataset) => {
    const record = createVariableRecord(dataset.columns, `Record ${dataset.records.length + 1}`);
    dataset.records.push(record);
    dataset.activeRecordId = record.id;
  }));
}

function activateRecord(id: string): void {
  if (activeDataset.value?.activeRecordId === id) return;
  update((data) => withDataset(data, (dataset) => { dataset.activeRecordId = id; }));
}

function updateRecordName(id: string, event: Event): void {
  const value = (event.currentTarget as HTMLInputElement).value;
  update((data) => withDataset(data, (dataset) => {
    const record = dataset.records.find((candidate) => candidate.id === id);
    if (record) record.name = value;
  }));
}

function updateCell(recordId: string, columnId: string, event: Event): void {
  const value = (event.currentTarget as HTMLTextAreaElement).value;
  update((data) => withDataset(data, (dataset) => {
    const record = dataset.records.find(({ id }) => id === recordId);
    if (record) record.values[columnId] = value;
  }));
}

function removeRecord(id: string): void {
  update((data) => withDataset(data, (dataset) => {
    dataset.records = dataset.records.filter((record) => record.id !== id);
    if (!dataset.records.length) dataset.records.push(createVariableRecord(dataset.columns, "Record 1"));
    if (!dataset.records.some((record) => record.id === dataset.activeRecordId)) dataset.activeRecordId = dataset.records[0]!.id;
  }));
}

function columnForNumber(fieldNumber: string): VariableColumn | undefined {
  return activeDataset.value?.columns.find((column) => column.fieldNumber.replace(/^0+(?=\d)/, "") === fieldNumber);
}

async function importFile(event: Event): Promise<void> {
  const input = event.currentTarget as HTMLInputElement;
  const file = input.files?.[0];
  input.value = "";
  if (!file) return;
  try {
    const format = file.name.toLowerCase().endsWith(".json") ? "json" : "csv";
    const name = file.name.replace(/\.(?:csv|json)$/i, "") || "Imported data";
    const dataset = importVariableDataset(await file.text(), format, name);
    update((data) => {
      data.datasets.push(dataset);
      data.activeDatasetId = dataset.id;
    });
    message.value = `Imported ${dataset.records.length} records from ${file.name}.`;
  } catch (error) {
    message.value = error instanceof Error ? error.message : "The data file could not be imported.";
  }
}

function exportCsv(): void {
  const dataset = activeDataset.value;
  if (!dataset) return;
  const blob = new Blob([variableDatasetToCsv(dataset)], { type: "text/csv;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = `${dataset.name.replace(/[^a-z0-9_-]+/gi, "-") || "dataset"}.csv`;
  link.click();
  URL.revokeObjectURL(url);
}
</script>

<style scoped>
.data-backdrop { position: fixed; inset: 0; z-index: 70; display: flex; align-items: center; justify-content: center; background: rgb(24 24 27 / 0.32); padding: 1rem; backdrop-filter: blur(2px); }
.data-dialog { position: relative; display: flex; width: min(76rem, 100%); height: min(44rem, calc(100dvh - 2rem)); flex-direction: column; overflow: hidden; border: 1px solid rgb(228 228 231); border-radius: 0.85rem; background: white; box-shadow: 0 28px 70px rgb(24 24 27 / 0.28); }
.data-header { display: flex; min-height: 4rem; flex: 0 0 auto; align-items: center; border-bottom: 1px solid rgb(228 228 231); padding: 0.7rem 1rem; }
.data-header h2 { font-size: 0.9rem; font-weight: 700; }
.data-header p { margin-top: 0.15rem; color: rgb(113 113 122); font-size: 0.65rem; }
.data-icon-button { display: inline-flex; width: 2rem; height: 2rem; margin-left: auto; align-items: center; justify-content: center; border-radius: 0.45rem; color: rgb(113 113 122); line-height: 0; }
.data-icon-button svg { width: 1rem; height: 1rem; }
.data-icon-button:hover { background: rgb(244 244 245); color: rgb(24 24 27); }
.data-toolbar { display: flex; min-height: 3.2rem; flex: 0 0 auto; align-items: center; gap: 0.45rem; border-bottom: 1px solid rgb(228 228 231); background: rgb(250 250 250); padding: 0.55rem 0.75rem; }
.data-select-wrap { position: relative; min-width: 12rem; }
.data-select-wrap select { width: 100%; appearance: none; padding-right: 2rem; }
.data-select-icon { position: absolute; top: 50%; right: 0.55rem; width: 0.9rem; height: 0.9rem; transform: translateY(-50%); pointer-events: none; color: rgb(82 82 91); }
.data-toolbar button, .data-toolbar select, .data-welcome button { min-height: 2rem; border: 1px solid rgb(212 212 216); border-radius: 0.45rem; background: white; padding-inline: 0.65rem; font-size: 0.68rem; font-weight: 600; }
.data-toolbar .data-primary { margin-left: auto; border-color: rgb(24 24 27); background: rgb(24 24 27); color: white; }
.data-toolbar button:disabled { cursor: not-allowed; opacity: 0.4; }
.data-body { display: flex; min-height: 0; flex: 1; }
.data-sidebar { width: 15rem; flex: 0 0 auto; overflow-y: auto; border-right: 1px solid rgb(228 228 231); padding: 0.8rem; }
.data-sidebar > label { display: block; color: rgb(82 82 91); font-size: 0.62rem; font-weight: 700; }
.data-sidebar input { width: 100%; height: 2rem; margin-top: 0.3rem; border: 1px solid rgb(212 212 216); border-radius: 0.4rem; padding-inline: 0.5rem; font-size: 0.7rem; }
.data-section-title { display: flex; align-items: center; justify-content: space-between; margin-top: 1.2rem; border-top: 1px solid rgb(228 228 231); padding-top: 0.8rem; color: rgb(113 113 122); font-size: 0.6rem; text-transform: uppercase; }
.data-binding-list { margin-top: 0.4rem; }
.data-binding-list li { display: grid; grid-template-columns: auto minmax(0, 1fr); gap: 0.15rem 0.4rem; border-bottom: 1px solid rgb(244 244 245); padding: 0.45rem 0; font-size: 0.65rem; }
.data-binding-list code { color: rgb(37 99 235); font-weight: 700; }
.data-binding-list span { overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.data-binding-list small { grid-column: 2; color: rgb(220 38 38); font-size: 0.55rem; }
.data-empty-note { margin-top: 0.5rem; color: rgb(113 113 122); font-size: 0.62rem; line-height: 1rem; }
.data-danger { margin-top: 1.5rem; color: rgb(190 18 60); font-size: 0.65rem; font-weight: 600; }
.data-table-wrap { display: flex; min-width: 0; flex: 1; flex-direction: column; }
.data-table-actions { display: flex; min-height: 2.8rem; flex: 0 0 auto; align-items: center; gap: 0.4rem; border-bottom: 1px solid rgb(228 228 231); padding: 0.45rem 0.7rem; color: rgb(113 113 122); font-size: 0.62rem; }
.data-table-actions button { margin-left: auto; border: 1px solid rgb(212 212 216); border-radius: 0.4rem; padding: 0.35rem 0.55rem; color: rgb(82 82 91); font-weight: 600; }
.data-table-actions button + button { margin-left: 0; }
.data-scroll { min-height: 0; flex: 1; overflow: auto; }
.data-table { min-width: 100%; border-collapse: separate; border-spacing: 0; font-size: 0.65rem; }
.data-table th, .data-table td { min-width: 10rem; border-right: 1px solid rgb(228 228 231); border-bottom: 1px solid rgb(228 228 231); padding: 0.3rem; vertical-align: top; }
.data-table thead { position: sticky; top: 0; z-index: 2; background: rgb(250 250 250); }
.data-table thead th { height: 4.4rem; color: rgb(82 82 91); text-align: left; }
.data-column-header { position: relative; padding-right: 2rem !important; }
.data-table thead .data-column-header > input { width: 100%; font-weight: 700; }
.data-table thead th > label { display: flex; align-items: center; gap: 0.2rem; margin-top: 0.35rem; color: rgb(113 113 122); font-family: ui-monospace, monospace; font-size: 0.58rem; }
.data-table thead th > label input { width: 3.5rem; }
.data-column-delete { position: absolute; top: 0.35rem; right: 0.35rem; display: inline-flex; width: 1.4rem; height: 1.4rem; align-items: center; justify-content: center; border-radius: 0.3rem; color: rgb(161 161 170); line-height: 0; }
.data-column-delete:hover { background: rgb(228 228 231 / 0.7); color: rgb(82 82 91); }
.data-column-delete svg, .data-row-delete svg { width: 0.85rem; height: 0.85rem; }
.data-table input, .data-table textarea { border: 1px solid transparent; border-radius: 0.3rem; background: transparent; padding: 0.25rem; outline: none; }
.data-table input:focus, .data-table textarea:focus { border-color: rgb(59 130 246); background: white; box-shadow: 0 0 0 2px rgb(59 130 246 / 0.1); }
.data-table textarea { width: 100%; min-height: 2.2rem; resize: vertical; line-height: 1rem; }
.data-table tbody tr.active { background: rgb(239 246 255); }
.data-table tbody th { position: sticky; left: 0; z-index: 1; min-width: 11rem; background: white; text-align: left; }
.data-table tbody tr.active th { background: rgb(239 246 255); }
.data-record-column { left: 0; z-index: 3; min-width: 11rem !important; }
.data-record-index { display: inline-flex; width: 1.3rem; height: 1.3rem; align-items: center; justify-content: center; border-radius: 9999px; background: rgb(244 244 245); color: rgb(113 113 122); font-size: 0.55rem; }
.data-table tbody th input { width: calc(100% - 1.6rem); font-weight: 600; }
.data-row-action { min-width: 2.5rem !important; width: 2.5rem; padding: 0 !important; vertical-align: middle !important; text-align: center; }
.data-row-delete { display: inline-flex; width: 100%; min-height: 2.5rem; align-items: center; justify-content: center; color: rgb(190 18 60); line-height: 0; }
.data-row-delete:hover { background: rgb(244 244 245); }
.data-empty-table, .data-welcome { display: flex; min-height: 16rem; flex-direction: column; align-items: center; justify-content: center; color: rgb(113 113 122); font-size: 0.72rem; text-align: center; }
.data-welcome { flex: 1; padding: 2rem; }
.data-welcome strong { color: rgb(39 39 42); font-size: 0.9rem; }
.data-welcome p { max-width: 30rem; margin-top: 0.5rem; line-height: 1.2rem; }
.data-welcome div { display: flex; gap: 0.5rem; margin-top: 1rem; }
.data-message { position: absolute; bottom: 1.7rem; left: 50%; z-index: 5; transform: translateX(-50%); border-radius: 9999px; background: rgb(24 24 27); padding: 0.45rem 0.8rem; color: white; font-size: 0.65rem; box-shadow: 0 4px 14px rgb(0 0 0 / 0.2); }
@media (prefers-color-scheme: dark) {
  .data-dialog, .data-table tbody th { border-color: rgb(255 255 255 / 0.1); background: rgb(9 9 11); }
  .data-header, .data-toolbar, .data-sidebar, .data-table-actions, .data-table th, .data-table td { border-color: rgb(255 255 255 / 0.1); }
  .data-toolbar, .data-table thead { background: rgb(24 24 27); }
  .data-toolbar button, .data-toolbar select, .data-welcome button, .data-sidebar input { border-color: rgb(255 255 255 / 0.12); background: rgb(24 24 27); color: rgb(228 228 231); }
  .data-select-icon { color: rgb(212 212 216); }
  .data-column-delete:hover, .data-row-delete:hover { background: rgb(255 255 255 / 0.08); color: white; }
  .data-toolbar .data-primary { border-color: white; background: white; color: rgb(9 9 11); }
  .data-table input:focus, .data-table textarea:focus { background: rgb(24 24 27); color: white; }
  .data-table tbody tr.active, .data-table tbody tr.active th { background: rgb(59 130 246 / 0.12); }
  .data-welcome strong { color: white; }
}
</style>
