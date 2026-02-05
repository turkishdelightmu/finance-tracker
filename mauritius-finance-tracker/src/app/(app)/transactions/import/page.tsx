"use client";

import { useState } from "react";
import Papa from "papaparse";

const fields = [
  "date",
  "description",
  "merchant",
  "amount",
  "currency",
  "account",
  "paymentMethod",
  "category",
];

export default function ImportPage() {
  const [columns, setColumns] = useState<string[]>([]);
  const [rows, setRows] = useState<Record<string, string>[]>([]);
  const [previewRows, setPreviewRows] = useState<Record<string, string>[]>([]);
  const [mapping, setMapping] = useState<Record<string, string>>({});
  const [status, setStatus] = useState<string | null>(null);
  const [errors, setErrors] = useState<string | null>(null);
  const [importErrors, setImportErrors] = useState<string[]>([]);
  const [dryRun, setDryRun] = useState(true);

  function handleFile(file: File) {
    Papa.parse<Record<string, string>>(file, {
      header: true,
      skipEmptyLines: true,
      complete: (results) => {
        setColumns(results.meta.fields || []);
        setRows(results.data);
        setPreviewRows(results.data.slice(0, 20));
      },
    });
  }

  async function handleImport() {
    setStatus(null);
    setErrors(null);
    setImportErrors([]);
    if (!mapping.date || !mapping.description || !mapping.amount) {
      setErrors("Please map at least date, description, and amount.");
      return;
    }
    const token = document
      .querySelector('meta[name="csrf-token"]')
      ?.getAttribute("content");

    const response = await fetch("/api/transactions/import", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...(token ? { "x-csrf-token": token } : {}),
      },
      body: JSON.stringify({ mapping, rows, dryRun }),
    });
    const data = await response.json().catch(() => ({}));
    if (!response.ok) {
      setStatus("Import failed.");
      if (data.errors) {
        setImportErrors(
          data.errors.slice(0, 5).map((err: any) => `Row ${err.row}: ${err.message}`),
        );
      }
      return;
    }
    if (dryRun) {
      if (data.errors && data.errors.length > 0) {
        setImportErrors(
          data.errors.slice(0, 5).map((err: any) => `Row ${err.row}: ${err.message}`),
        );
        setStatus("Dry run completed with issues.");
      } else {
        setStatus(`Dry run OK. ${data.count} rows ready to import.`);
      }
    } else {
      setStatus("Import complete. You can return to transactions.");
    }
  }

  return (
    <div className="space-y-6 pb-20">
      <div>
        <h2 className="text-2xl font-semibold">Import CSV</h2>
        <p className="text-sm text-slate-500">
          Upload your CSV and map the columns to our fields.
        </p>
      </div>

      <input
        type="file"
        accept=".csv"
        onChange={(event) => {
          const file = event.target.files?.[0];
          if (file) handleFile(file);
        }}
      />

      {columns.length > 0 && (
        <section className="rounded-3xl bg-white/90 border border-slate-200 p-5 space-y-3">
          <h3 className="text-lg font-semibold">Column mapping</h3>
          <p className="text-xs text-slate-500">
            {rows.length} rows detected. Only the first 20 are shown in preview.
          </p>
          <div className="grid gap-3 md:grid-cols-2">
            {fields.map((field) => (
              <label key={field} className="text-sm">
                {field}
                <select
                  className="mt-2 w-full rounded-xl border border-slate-200 px-3 py-2"
                  value={mapping[field] || ""}
                  onChange={(event) =>
                    setMapping((prev) => ({ ...prev, [field]: event.target.value }))
                  }
                >
                  <option value="">Skip</option>
                  {columns.map((col) => (
                    <option key={col} value={col}>
                      {col}
                    </option>
                  ))}
                </select>
              </label>
            ))}
          </div>
          <button
            onClick={handleImport}
            className="rounded-xl bg-slate-900 text-white px-4 py-2 text-sm"
          >
            {dryRun ? "Run dry import" : "Import rows"}
          </button>
          <label className="flex items-center gap-2 text-xs text-slate-500">
            <input
              type="checkbox"
              checked={dryRun}
              onChange={(event) => setDryRun(event.target.checked)}
            />
            Dry run (validate only)
          </label>
          {errors && <p className="text-sm text-rose-600">{errors}</p>}
          {importErrors.length > 0 && (
            <div className="text-xs text-rose-600 space-y-1">
              {importErrors.map((line) => (
                <div key={line}>{line}</div>
              ))}
            </div>
          )}
          {status && <p className="text-sm text-slate-500">{status}</p>}
        </section>
      )}

      {previewRows.length > 0 && (
        <section className="rounded-3xl bg-white/90 border border-slate-200 p-5">
          <h3 className="text-lg font-semibold">Preview</h3>
          <div className="mt-3 space-y-2">
            {previewRows.map((row, index) => (
              <pre
                key={index}
                className="text-xs bg-slate-900/90 text-slate-100 p-3 rounded-xl overflow-x-auto"
              >
                {JSON.stringify(row, null, 2)}
              </pre>
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
