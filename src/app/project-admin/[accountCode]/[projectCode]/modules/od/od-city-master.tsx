"use client";

import { CheckCircle2, CircleAlert, Download, FileSpreadsheet, MapPin, Upload } from "lucide-react";
import { useState, type FormEvent } from "react";
import { formatApiError } from "@/lib/api";
import { odConfigService, type OdCityUploadResult } from "@/lib/api/od-config-service";
import styles from "./od-configuration.module.css";

const maxFileBytes = 2 * 1024 * 1024;

export function OdCityMaster({ projectId, cityMasterCount, canEdit }: {
  projectId: string;
  cityMasterCount?: number;
  canEdit: boolean;
}) {
  const [file, setFile] = useState<File>();
  const [updatedCount, setUpdatedCount] = useState<number>();
  const [uploading, setUploading] = useState(false);
  const [downloading, setDownloading] = useState(false);
  const [result, setResult] = useState<OdCityUploadResult>();
  const [error, setError] = useState("");
  const count = updatedCount ?? cityMasterCount;

  function selectFile(candidate?: File) {
    setError("");
    setResult(undefined);
    if (candidate && (!/\.xlsx$/i.test(candidate.name) || candidate.size > maxFileBytes)) {
      setFile(undefined);
      setError("Choose an Excel (.xlsx) file up to 2 MB.");
      return;
    }
    setFile(candidate);
  }

  async function downloadTemplate() {
    setError("");
    setDownloading(true);
    try {
      const blob = await odConfigService.downloadCityTemplate(projectId);
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = "OD_City_Master_Template.xlsx";
      document.body.appendChild(link);
      link.click();
      link.remove();
      URL.revokeObjectURL(url);
    } catch (reason) {
      setError(formatApiError(reason, "Could not download the City Master template."));
    } finally {
      setDownloading(false);
    }
  }

  async function upload(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!canEdit || !file || uploading) return;
    setError("");
    setResult(undefined);
    setUploading(true);
    try {
      const report = await odConfigService.uploadCities(projectId, file);
      setResult(report);
      if (report.invalidRows === 0) {
        setUpdatedCount(report.cityMasterCount);
        setFile(undefined);
      }
    } catch (reason) {
      setError(formatApiError(reason, "Could not upload cities."));
    } finally {
      setUploading(false);
    }
  }

  return (
    <div className={styles.cityWorkspace}>
      <section className={styles.card} aria-labelledby="od-city-master-title">
        <div className={styles.cardHeader}>
          <div>
            <h2 id="od-city-master-title">City Master</h2>
            <p>Manage the cities employees can select when applying for OD.</p>
          </div>
        </div>
        <div className={styles.editorBody}>
          {count !== undefined && (
            <div className={styles.cityCount}>
              <span className={styles.smallIcon}><MapPin size={18} aria-hidden /></span>
              <div><strong>{count.toLocaleString()}</strong><p>{count === 1 ? "City" : "Cities"} available in the mobile OD picker</p></div>
            </div>
          )}
          {canEdit && <p className={styles.cityHelp}>Use one city per row under the <strong>City</strong> header. The upload skips names that already exist.</p>}
        </div>
      </section>
      {canEdit && (
        <form className={styles.card} onSubmit={upload} aria-labelledby="od-city-upload-title">
          <div className={styles.cardHeader}>
            <h2 id="od-city-upload-title">Upload cities</h2>
            <button type="button" className={styles.secondaryButton} disabled={downloading} onClick={() => void downloadTemplate()}>
              <Download size={16} aria-hidden /> {downloading ? "Downloading…" : "Download template"}
            </button>
          </div>
          <div className={styles.editorBody}>
            <label
              className={styles.dropzone}
              data-disabled={uploading}
              onDragOver={(event) => event.preventDefault()}
              onDrop={(event) => {
                event.preventDefault();
                if (!uploading) selectFile(event.dataTransfer.files[0]);
              }}
            >
              <input
                className={styles.srOnly}
                type="file"
                aria-label="Choose City Master Excel file"
                accept=".xlsx,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
                disabled={uploading}
                onChange={(event) => {
                  selectFile(event.target.files?.[0]);
                  event.target.value = "";
                }}
              />
              <span className={styles.smallIcon}><FileSpreadsheet size={22} aria-hidden /></span>
              <strong>{file ? file.name : "Choose an Excel file or drop it here"}</strong>
              <span>{file ? "Click to choose a different file" : "Excel (.xlsx) up to 2 MB"}</span>
            </label>
            {error && <div className={styles.notice} data-kind="error" role="alert"><CircleAlert size={17} aria-hidden /> {error}</div>}
            {result && (result.invalidRows ? (
              <div className={styles.notice} data-kind="error" role="alert">
                <CircleAlert size={17} aria-hidden />
                <div>
                  <strong>Fix {result.invalidRows} {result.invalidRows === 1 ? "row" : "rows"} and upload again.</strong>
                  <ul className={styles.rowErrors}>
                    {result.errors.map(({ row, message }) => <li key={row}>Row {row} · {message}</li>)}
                  </ul>
                  {result.invalidRows > result.errors.length && <p>Showing the first {result.errors.length} errors.</p>}
                </div>
              </div>
            ) : (
              <div className={styles.notice} data-kind="success" role="status"><CheckCircle2 size={17} aria-hidden /> {result.added} added and {result.skipped} duplicates skipped.</div>
            ))}
          </div>
          <div className={styles.cardFooter}>
            <button type="submit" className={styles.primaryButton} disabled={!file || uploading}>
              <Upload size={16} aria-hidden /> {uploading ? "Uploading…" : "Upload cities"}
            </button>
          </div>
        </form>
      )}
    </div>
  );
}
