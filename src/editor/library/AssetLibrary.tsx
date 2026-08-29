import React, { useEffect, useRef, useState } from "react";
import { toolList } from "../../registries/toolRegistry";
import { propList } from "../../registries/propRegistry";
import { useCustomAssetsStore, assetKind } from "../state/customAssetsStore";
import { editorColors } from "../theme";

const sectionTitleStyle: React.CSSProperties = {
  fontSize: 11,
  textTransform: "uppercase",
  letterSpacing: 1,
  color: editorColors.textDim,
  margin: "12px 0 6px",
};

const inputStyle: React.CSSProperties = {
  width: "100%",
  padding: "8px 10px",
  borderRadius: 6,
  border: `1px solid ${editorColors.border}`,
  background: editorColors.panelElevated,
  color: editorColors.text,
  fontSize: 13,
  boxSizing: "border-box",
};

const UploadForm: React.FC = () => {
  const upload = useCustomAssetsStore((s) => s.upload);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [file, setFile] = useState<File | null>(null);
  const [label, setLabel] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | undefined>();

  async function handleUpload() {
    if (!file || !label.trim()) return;
    setBusy(true);
    setError(undefined);
    try {
      await upload(file, label.trim());
      setFile(null);
      setLabel("");
      if (fileInputRef.current) fileInputRef.current.value = "";
    } catch (err) {
      setError(String(err));
    } finally {
      setBusy(false);
    }
  }

  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        gap: 6,
        padding: 10,
        borderRadius: 8,
        border: `1px dashed ${editorColors.border}`,
        marginBottom: 8,
      }}
    >
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*,video/*"
        onChange={(e) => setFile(e.target.files?.[0] ?? null)}
        style={{ fontSize: 11, color: editorColors.textDim }}
      />
      <input
        style={inputStyle}
        value={label}
        onChange={(e) => setLabel(e.target.value)}
        placeholder="Name this asset (e.g. 'onboarding screen recording') — tells the JSON author what it is"
      />
      <button
        style={{
          ...inputStyle,
          cursor: file && label.trim() && !busy ? "pointer" : "not-allowed",
          opacity: file && label.trim() && !busy ? 1 : 0.5,
        }}
        disabled={!file || !label.trim() || busy}
        onClick={handleUpload}
      >
        {busy ? "Uploading…" : "Import asset"}
      </button>
      <div style={{ fontSize: 10, color: editorColors.textDim, lineHeight: 1.4 }}>
        Images and screen recordings (.mp4 / .mov / .webm). A clip is imported as a <b>recording</b> visual, a still as
        an <b>image</b>. Uploads go through the dev server in one request, so keep clips reasonably short.
      </div>
      {file && file.size > 40 * 1024 * 1024 ? (
        <div style={{ fontSize: 11, color: "#ff8a65" }}>
          {(file.size / (1024 * 1024)).toFixed(0)} MB — trim the clip first, this is large for a single upload.
        </div>
      ) : null}
      {error ? <div style={{ fontSize: 11, color: "#ff8a65" }}>{error}</div> : null}
    </div>
  );
};

export const AssetLibrary: React.FC = () => {
  const customAssets = useCustomAssetsStore((s) => s.assets);
  const loadCustomAssets = useCustomAssetsStore((s) => s.load);
  const removeCustomAsset = useCustomAssetsStore((s) => s.remove);

  useEffect(() => {
    loadCustomAssets();
  }, [loadCustomAssets]);

  return (
    <div>
      <div style={sectionTitleStyle}>Import</div>
      <UploadForm />

      <div style={sectionTitleStyle}>Custom ({customAssets.length})</div>
      {customAssets.length === 0 ? (
        <div style={{ fontSize: 11, color: editorColors.textDim, marginBottom: 8 }}>
          No imported assets yet — use the form above.
        </div>
      ) : (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 6, marginBottom: 8 }}>
          {customAssets.map((asset) => (
            <div key={asset.id} style={{ position: "relative" }}>
              {assetKind(asset) === "video" ? (
                <video
                  src={asset.src}
                  title={asset.label}
                  muted
                  playsInline
                  preload="metadata"
                  onMouseEnter={(e) => void e.currentTarget.play().catch(() => {})}
                  onMouseLeave={(e) => {
                    e.currentTarget.pause();
                    e.currentTarget.currentTime = 0;
                  }}
                  style={{
                    width: "100%",
                    aspectRatio: "1/1",
                    objectFit: "cover",
                    background: editorColors.panelElevated,
                    borderRadius: 6,
                  }}
                />
              ) : (
                <img
                  src={asset.src}
                  title={asset.label}
                  style={{
                    width: "100%",
                    aspectRatio: "1/1",
                    objectFit: "contain",
                    background: editorColors.panelElevated,
                    borderRadius: 6,
                    padding: 4,
                  }}
                />
              )}
              <button
                title={`Remove "${asset.label}"`}
                onClick={() => removeCustomAsset(asset.id)}
                style={{
                  position: "absolute",
                  top: 2,
                  right: 2,
                  width: 18,
                  height: 18,
                  lineHeight: "16px",
                  padding: 0,
                  borderRadius: 4,
                  border: `1px solid ${editorColors.border}`,
                  background: editorColors.panel,
                  color: editorColors.textDim,
                  fontSize: 10,
                  cursor: "pointer",
                }}
              >
                ✕
              </button>
              <div
                style={{
                  fontSize: 9,
                  color: editorColors.textDim,
                  textAlign: "center",
                  marginTop: 2,
                  overflow: "hidden",
                  textOverflow: "ellipsis",
                  whiteSpace: "nowrap",
                }}
              >
                {asset.label}
              </div>
            </div>
          ))}
        </div>
      )}

      <div style={sectionTitleStyle}>Logos ({toolList.length})</div>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 6 }}>
        {toolList.map((tool) => (
          <img
            key={tool.id}
            src={tool.src}
            title={tool.name}
            style={{ width: "100%", aspectRatio: "1/1", objectFit: "contain", background: editorColors.panelElevated, borderRadius: 6, padding: 4 }}
          />
        ))}
      </div>

      <div style={sectionTitleStyle}>Props ({propList.length})</div>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 6 }}>
        {propList.map((prop) => (
          <img
            key={prop.id}
            src={prop.src}
            title={prop.name}
            style={{ width: "100%", aspectRatio: "1/1", objectFit: "contain", background: editorColors.panelElevated, borderRadius: 6, padding: 4 }}
          />
        ))}
      </div>
    </div>
  );
};
