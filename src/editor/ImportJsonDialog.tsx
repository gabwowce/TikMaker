import { Button, FileButton, Modal, Textarea } from "@mantine/core";
import { useState } from "react";

type ImportJsonDialogProps = {
  title: string;
  onImport: (text: string) => string | null;
  onClose: () => void;
};

export function ImportJsonDialog({
  title,
  onImport,
  onClose,
}: ImportJsonDialogProps) {
  const [text, setText] = useState("");
  const [error, setError] = useState<string | null>(null);

  function submit(raw: string) {
    if (!raw.trim()) {
      setError("JSON is required.");
      return;
    }
    const failure = onImport(raw.trim());
    if (failure) setError(failure);
    else onClose();
  }

  async function importFile(file: File | null) {
    if (!file) return;
    try {
      submit(await file.text());
    } catch {
      setError("Could not read the file.");
    }
  }

  return (
    <Modal
      opened
      onClose={onClose}
      title={title}
      size="lg"
      centered
      className="editor-ui"
    >
      <Textarea
        aria-label="Project JSON"
        data-autofocus
        rows={12}
        value={text}
        error={error}
        spellCheck={false}
        onChange={(event) => {
          setText(event.currentTarget.value);
          setError(null);
        }}
        onKeyDown={(event) => {
          if (event.key === "Enter" && (event.ctrlKey || event.metaKey))
            submit(text);
        }}
      />
      <div className="mt-3 flex gap-2">
        <FileButton accept="application/json,.json" onChange={importFile}>
          {(props) => (
            <Button {...props} variant="default">
              From file
            </Button>
          )}
        </FileButton>
        <div className="flex-1" />
        <Button variant="default" onClick={onClose}>
          Cancel
        </Button>
        <Button onClick={() => submit(text)}>Import</Button>
      </div>
    </Modal>
  );
}
