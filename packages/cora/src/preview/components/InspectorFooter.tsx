interface InspectorFooterProps {
  canAct: boolean;
  onDuplicate(): void;
  onDelete(): void;
}

export function InspectorFooter({ canAct, onDuplicate, onDelete }: InspectorFooterProps) {
  return (
    <footer className={canAct ? "inspector-footer" : "inspector-footer hidden"}>
      <button type="button" className="preview-btn" disabled={!canAct} onClick={onDuplicate}>
        Duplicate
      </button>
      <button type="button" className="preview-btn preview-btn-danger" disabled={!canAct} onClick={onDelete}>
        Delete
      </button>
    </footer>
  );
}
